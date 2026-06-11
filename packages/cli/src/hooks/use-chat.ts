import { ROLE, type Mode, type Role } from "@baocode/database/enums";
import {
  chatStreamEventSchema,
  type SupportedChatModelId,
} from "@baocode/shared";
import type { ClientResponse } from "hono/client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/http-error";
import { EventSourceParserStream } from "eventsource-parser/stream";
import prettyMs from "pretty-ms";
import { apiClient } from "../lib/api-client";

export type ClientToolCallPart = {
  type: "tool-call";
  id: string;
  name: string;
  args: Record<string, unknown>;
  result?: string;
  status: "calling" | "done";
};

export type ClientMessagePart =
  | { type: "text"; text: string }
  | {
      type: "reasoning";
      text: string;
    }
  | ClientToolCallPart;

export type Message =
  | {
      id: string;
      role: ROLE.USER;
      content: string;
      mode: Mode;
      model: SupportedChatModelId;
    }
  | {
      id: string;
      role: ROLE.ASSISTANT;
      content: string;
      mode: Mode;
      model: SupportedChatModelId;
      parts: ClientMessagePart[];
      duration?: string;
      interrupted?: boolean;
    }
  | {
      id: string;
      role: ROLE.ERROR;
      content: string;
    };

type StreamingState =
  | { status: "idle" }
  | {
      status: "streaming";
      parts: ClientMessagePart[];
      mode: Mode;
      model: SupportedChatModelId;
    };

type ActiveStream = {
  requestId: string;
  contoller: AbortController;
  mode: Mode;
  model: SupportedChatModelId;
  parts: ClientMessagePart[];
  interruptedCaptured: boolean;
};

type SubmitParams = {
  userText: string;
  mode: Mode;
  model: SupportedChatModelId;
};

type RunStreamParams = {
  mode: Mode;
  model: SupportedChatModelId;
  request: (controller: AbortController) => Promise<ClientResponse<unknown>>;
};

export function useChat(sessionId: string, initialMessages: Message[]) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState<StreamingState>({
    status: "idle",
  });
  const activeStreamRef = useRef<ActiveStream | null>(null);

  const updateMessage = useCallback(
    (updater: (prev: Message[]) => Message[]) => {
      setMessages((prev) => updater(prev));
    },
    [],
  );

  const isActiveRqueset = useCallback((requestId: string) => {
    return activeStreamRef.current?.requestId === requestId;
  }, []);

  const emitParts = useCallback(
    (requestId: string, parts: ClientMessagePart[]) => {
      if (!isActiveRqueset(requestId)) return;

      const snapshot = [...parts];
      const activeStream = activeStreamRef.current;
      if (!activeStream) return;

      activeStream.parts = snapshot;
      setStreaming({
        status: "streaming",
        parts: snapshot,
        mode: activeStream.mode,
        model: activeStream.model,
      });
    },
    [isActiveRqueset],
  );

  const captureInterruptedMessage = useCallback(
    (activeStream: ActiveStream) => {
      if (activeStream.interruptedCaptured || activeStream.parts.length === 0)
        return;

      activeStream.interruptedCaptured = true;
      const parts = [...activeStream.parts];
      const fullText = parts
        .filter((p) => p.type === "text")
        .map((p) => p.text)
        .join("");
      updateMessage((prev) => [
        ...prev,
        {
          id: activeStream.requestId,
          role: ROLE.ASSISTANT,
          content: fullText,
          mode: activeStream.mode,
          model: activeStream.model,
          parts,
          interrupted: true,
        },
      ]);
    },
    [updateMessage],
  );

  const clearStream = useCallback(
    (requestId: string) => {
      if (!isActiveRqueset(requestId)) return;
      activeStreamRef.current = null;
      setStreaming({ status: "idle" });
    },
    [isActiveRqueset],
  );

  const handleStream = useCallback(
    async (response: ClientResponse<unknown>, activeStream: ActiveStream) => {
      if (!isActiveRqueset(activeStream.requestId)) return;

      if (!response.ok) {
        const message = await getErrorMessage(response);
        updateMessage((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: ROLE.ERROR,
            content: message,
          },
        ]);
        return;
      }

      const parts: ClientMessagePart[] = [];

      const stream = response
        .body!.pipeThrough(new TextDecoderStream())
        .pipeThrough(new EventSourceParserStream());

      for await (const { data } of stream) {
        if (!isActiveRqueset(activeStream.requestId)) return;

        let event;

        try {
          event = chatStreamEventSchema.parse(JSON.parse(data));
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          updateMessage((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: ROLE.ERROR,
              content: message,
            },
          ]);
          break;
        }

        switch (event.type) {
          case "reasoning-delta": {
            const last = parts[parts.length - 1];
            if (last && last.type === "reasoning") {
              last.text += event.text;
            } else {
              parts.push({ type: "reasoning", text: event.text });
            }
            emitParts(activeStream.requestId, parts);
            break;
          }
          case "tool-call": {
            parts.push({
              type: "tool-call",
              id: event.toolCallId,
              name: event.toolName,
              args: event.args,
              status: "calling",
            });
            emitParts(activeStream.requestId, parts);
            break;
          }
          case "tool-result": {
            const tc = parts.find(
              (p): p is ClientToolCallPart =>
                p.type === "tool-call" && p.id === event.toolCallId,
            );
            if (tc) {
              tc.result = event.result;
              tc.status = "done";
            }
            emitParts(activeStream.requestId, parts);
            break;
          }
          case "text-delta":
            const last = parts[parts.length - 1];
            if (last && last.type === "text") {
              last.text += event.text;
            } else {
              parts.push({ type: "text", text: event.text });
            }
            emitParts(activeStream.requestId, parts);
            break;
          case "done":
            if (!isActiveRqueset(activeStream.requestId)) return;

            const fullText = parts
              .filter((p) => p.type === "text")
              .map((p) => p.text)
              .join("");
            updateMessage((prev) => [
              ...prev,
              {
                id: activeStream.requestId,
                role: ROLE.ASSISTANT,
                content: fullText,
                mode: activeStream.mode,
                model: activeStream.model,
                duration: prettyMs(event.durationMs),
                parts: [...parts],
              },
            ]);
            break;
          case "error":
            updateMessage((prev) => [
              ...prev,
              {
                id: crypto.randomUUID(),
                role: ROLE.ERROR,
                content: event.message,
              },
            ]);
            break;
        }
      }
    },
    [updateMessage, isActiveRqueset, emitParts],
  );

  const runStream = useCallback(
    async (params: RunStreamParams) => {
      const { mode, model, request } = params;
      const controller = new AbortController();
      const activeStream: ActiveStream = {
        requestId: crypto.randomUUID(),
        contoller: controller,
        mode,
        model,
        parts: [],
        interruptedCaptured: false,
      };

      activeStreamRef.current = activeStream;
      setStreaming({
        status: "streaming",
        parts: [],
        mode,
        model,
      });

      try {
        const response = await request(controller);
        await handleStream(response, activeStream);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was aborted, do nothing
          return;
        }
        if (!isActiveRqueset(activeStream.requestId)) return;
        const message = error instanceof Error ? error.message : String(error);
        updateMessage((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: ROLE.ERROR,
            content: message,
          },
        ]);
      } finally {
        clearStream(activeStream.requestId);
      }
    },
    [clearStream, handleStream, isActiveRqueset, updateMessage],
  );

  const stopActiveStream = useCallback(
    (capturePartial: boolean) => {
      const activeStream = activeStreamRef.current;
      if (!activeStream) return;

      if (capturePartial) {
        captureInterruptedMessage(activeStream);
      }
      activeStreamRef.current = null;
      setStreaming({ status: "idle" });
      activeStream.contoller.abort();
    },
    [captureInterruptedMessage],
  );

  const resume = useCallback(
    async (params: Omit<SubmitParams, "userText">) => {
      const { mode, model } = params;
      await runStream({
        mode,
        model,
        request: async (controller) => {
          return apiClient.chat[":sessionId"].resume.$post(
            {
              param: { sessionId },
            },
            {
              init: { signal: controller.signal },
            },
          );
        },
      });
    },
    [runStream, sessionId],
  );

  const hasAutoResumeRef = useRef(false);

  useEffect(() => {
    if (hasAutoResumeRef.current) return;
    const last = initialMessages[initialMessages.length - 1];
    if (!last || last.role !== ROLE.USER) return;

    hasAutoResumeRef.current = true;
    void resume({
      mode: last.mode,
      model: last.model,
    });
  }, [initialMessages, resume]);

  const submit = useCallback(
    async (params: SubmitParams) => {
      stopActiveStream(true);
      const { userText, mode, model } = params;
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: ROLE.USER,
        content: userText,
        mode,
        model,
      };

      updateMessage((prev) => [...prev, userMessage]);

      await runStream({
        mode,
        model,
        request: async (controller) => {
          return apiClient.chat[":sessionId"].$post(
            {
              param: { sessionId },
              json: { content: userText, mode, model },
            },
            {
              init: { signal: controller.signal },
            },
          );
        },
      });
    },
    [runStream, sessionId, updateMessage, stopActiveStream],
  );

  const abort = useCallback(() => {
    stopActiveStream(false);
  }, [stopActiveStream]);

  const interrupt = useCallback(() => {
    stopActiveStream(true);
  }, [stopActiveStream]);

  return {
    messages,
    streaming,
    submit,
    abort,
    interrupt,
  };
}
