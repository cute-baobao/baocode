import {
  MESSAGE_STATUS,
  ROLE,
  type Mode,
  type Role,
} from "@baocode/database/enums";
import z from "zod";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";
import { zValidator } from "@hono/zod-validator";
import { streamSSE } from "hono/streaming";
import { streamText as aiStreamText, type ModelMessage } from "ai";
import type { ChatStreamEvent } from "@baocode/shared";
import { db } from "@baocode/database/client";
import { messageTable, sessionTable } from "@baocode/database";
import { Hono } from "hono";
import { eq } from "drizzle-orm";

const submitSchema = z.object({
  content: z.string(),
  mode: z.enum(["BUILD", "PLAN"]),
  model: z.string().refine(isSupportedChatModel, "Unsupported model"),
});

const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

const activeResumeSessionIds = new Set<number>();

function buildConversationHistory(
  messages: {
    role: Role;
    content: string;
    status?: MESSAGE_STATUS;
  }[],
): ModelMessage[] {
  const result: ModelMessage[] = [];
  for (const m of messages) {
    if (m.role === ROLE.ERROR) continue;
    if (m.role === ROLE.ASSISTANT && m.content.length === 0) continue;
    if (m.role === ROLE.USER) {
      result.push({ role: "user", content: m.content });
    } else {
      result.push({ role: "assistant", content: m.content });
    }
  }
  return result;
}

function getResumeableUserMessage(
  messages: {
    role: Role;
    model: string;
    mode: Mode;
  }[],
) {
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== ROLE.USER) {
    return null;
  }
  return lastMessage;
}

type StreamParams = {
  sessionId: number;
  model: string;
  history: ModelMessage[];
  mode: Mode;
  abortController: AbortController;
};

async function streamAIResponse(
  stream: Parameters<Parameters<typeof streamSSE>[1]>[0],
  params: StreamParams,
) {
  const { sessionId, model, history, mode, abortController } = params;
  const startTime = Date.now();
  const resolveModel = resolveChatModel(model);
  let fullText = "";

  const presistInterruptedMessage = async () => {
    if (fullText.length === 0) return;

    const elapsedMs = Date.now() - startTime;

    await db.insert(messageTable).values({
      sessionId,
      role: ROLE.ASSISTANT,
      content: fullText,
      mode,
      model,
      status: MESSAGE_STATUS.INTERRUPTED,
      createdAt: new Date().toISOString(),
      duration: Math.round(elapsedMs / 1000),
    });
  };

  try {
    const result = aiStreamText({
      model: resolveModel.model,
      messages: history,
      abortSignal: abortController.signal,
    });

    for await (const part of result.fullStream) {
      if (stream.aborted) return;

      if (part.type === "text-delta") {
        fullText += part.text;
        console.log("Delta:", part.text);
        const event: ChatStreamEvent = { type: "text-delta", text: part.text };
        await stream.writeSSE({
          event: "text-delta",
          data: JSON.stringify(event),
        });
      }

      if (part.type === "error") {
        throw part.error;
      }
    }

    if (stream.aborted || abortController.signal.aborted) {
      await presistInterruptedMessage();
      return;
    }

    const elapsedMs = Date.now() - startTime;
    const [assistantMessage] = await db
      .insert(messageTable)
      .values({
        sessionId,
        role: ROLE.ASSISTANT,
        content: fullText,
        mode,
        model,
        status: MESSAGE_STATUS.COMPLETED,
        createdAt: new Date().toISOString(),
        duration: Math.round(elapsedMs / 1000),
      })
      .returning();

    const doneEvent: ChatStreamEvent = {
      type: "done",
      messageId: assistantMessage!.id,
      durationMs: elapsedMs,
    };
    await stream.writeSSE({
      event: "done",
      data: JSON.stringify(doneEvent),
    });
  } catch (err) {
    if (abortController.signal.aborted) {
      await presistInterruptedMessage();
      return;
    }

    const message = err instanceof Error ? err.message : String(err);

    await db.insert(messageTable).values({
      sessionId,
      role: ROLE.ERROR,
      content: message,
      mode,
      model,
      status: MESSAGE_STATUS.COMPLETED,
      createdAt: new Date().toISOString(),
    });

    const errorEvent: ChatStreamEvent = { type: "error", message };
    await stream.writeSSE({
      event: "error",
      data: JSON.stringify(errorEvent),
    });
  }
}

const app = new Hono()
  .post("/:sessionId/resume", async (c) => {
    const sessionId = c.req.param("sessionId");

    const session = await db.query.sessionTable.findFirst({
      where: eq(sessionTable.id, Number(sessionId)),
      with: {
        messages: {
          orderBy: (m, { asc }) => asc(m.createdAt),
        },
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const lastMessage = getResumeableUserMessage(session.messages);

    if (!lastMessage) {
      return c.json(
        { error: "Session has no pending user message to resume" },
        409,
      );
    }

    if (activeResumeSessionIds.has(session.id)) {
      return c.json(
        { error: "Session is already being resumed in another connection" },
        409,
      );
    }

    if (!isSupportedChatModel(lastMessage.model)) {
      return c.json({ error: "Session uses an unsupported model" }, 409);
    }

    activeResumeSessionIds.add(session.id);

    const history = buildConversationHistory(session.messages.slice(-10));
    const abortController = new AbortController();
    try {
      return streamSSE(
        c,
        async (stream) => {
          stream.onAbort(() => {
            abortController.abort();
          });
          try {
            await streamAIResponse(stream, {
              sessionId: session.id,
              model: lastMessage.model,
              history,
              mode: lastMessage.mode,
              abortController,
            });
          } finally {
            activeResumeSessionIds.delete(session.id);
          }
        },
        async (err, stream) => {
          activeResumeSessionIds.delete(session.id);
          const message = err instanceof Error ? err.message : String(err);
          const errorEvent: ChatStreamEvent = { type: "error", message };
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify(errorEvent),
          });
        },
      );
    } catch (err) {
      activeResumeSessionIds.delete(session.id);
      throw err;
    }
  })
  .post("/:sessionId", submitValidator, async (c) => {
    const { sessionId } = c.req.param();
    const body = c.req.valid("json");
    const { content, model, mode } = body;

    const session = await db.query.sessionTable.findFirst({
      where: eq(sessionTable.id, Number(sessionId)),
      with: {
        messages: {
          orderBy: (m, { asc }) => asc(m.createdAt),
        },
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    await db.insert(messageTable).values({
      sessionId: session.id,
      role: ROLE.USER,
      content,
      mode,
      model,
      status: MESSAGE_STATUS.COMPLETED,
      createdAt: new Date().toISOString(),
    });

    const history = buildConversationHistory([
      ...session.messages.slice(-10),
      { role: ROLE.USER, content, status: MESSAGE_STATUS.COMPLETED },
    ]);

    const abortController = new AbortController();

    return streamSSE(
      c,
      async (stream) => {
        stream.onAbort(() => {
          abortController.abort();
        });
        await streamAIResponse(stream, {
          sessionId: session.id,
          model,
          history,
          mode,
          abortController,
        });
      },
      async (err, stream) => {
        const message = err instanceof Error ? err.message : String(err);
        const errorEVent: ChatStreamEvent = { type: "error", message };
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify(errorEVent),
        });
      },
    );
  });

export default app;
