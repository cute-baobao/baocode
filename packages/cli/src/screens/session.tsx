import { useLocation, useNavigate, useParams } from "react-router";
import { SessionShell } from "../components/session-shell";
import type { InferResponseType } from "hono/client";
import { apiClient } from "../lib/api-client";
import z from "zod";
import {
  DEFAULT_CHAT_MODEL_ID,
  MessageRole,
  type SupportedChatModel,
  type SupportedChatModelId,
} from "@baocode/shared";
import { BotMessage, ErrorMessage, UserMessage } from "../components/messages";
import { useToast } from "../providers/toast";
import { useEffect, useMemo, useState } from "react";
import { getErrorMessage } from "../lib/http-error";
import { useChat, type Message } from "../hooks/use-chat";
import { MESSAGE_STATUS, ROLE } from "@baocode/database/enums";
import prettyMs from "pretty-ms";
import { useKeyboard } from "@opentui/react";
import { LayerName, useKeyboardLayer } from "../providers/keyboard-layer";

type SessionData = InferResponseType<
  (typeof apiClient.sessions)[":id"]["$get"],
  200
>;

const sessionLocationSchema = z.object({
  session: z.custom<SessionData>(
    (data) => data != null && typeof data === "object" && "id" in data,
  ),
});

function ChatMessage({ msg }: { msg: Message }) {
  if (msg.role === ROLE.USER) {
    return <UserMessage message={msg.content} />;
  }

  if (msg.role === ROLE.ERROR) {
    return <ErrorMessage message={msg.content} />;
  }

  return (
    <BotMessage
      parts={msg.parts}
      mode={msg.mode}
      model={msg.model}
      streaming={false}
      duration={msg.duration}
      interrupted={msg.interrupted}
    />
  );
}

function mapDbMessage(dbMessages: SessionData["messages"]): Message[] {
  return dbMessages.map((msg) => {
    if (msg.role === ROLE.ERROR) {
      return { id: msg.id.toString(), role: ROLE.ERROR, content: msg.content };
    }

    if (msg.role === ROLE.USER) {
      return {
        id: msg.id.toString(),
        role: ROLE.USER,
        content: msg.content,
        model: msg.model as SupportedChatModelId,
        mode: msg.mode,
      };
    }

    return {
      id: msg.id.toString(),
      role: msg.role,
      content: msg.content,
      model: msg.model as SupportedChatModelId,
      mode: msg.mode,
      parts: [{ type: "text", text: msg.content }],
      ...(msg.duration !== null ? { duration: prettyMs(msg.duration) } : {}),
      interrupted: msg.status === MESSAGE_STATUS.INTERRUPTED,
    };
  });
}

function SessionChat({ session }: { session: SessionData }) {
  const [initialMessages] = useState<Message[]>(() =>
    mapDbMessage(session.messages),
  );
  const { messages, streaming, abort, submit, interrupt } = useChat(
    String(session.id),
    initialMessages,
  );
  const { isTopLayer } = useKeyboardLayer();

  useEffect(() => {
    return () => abort();
  }, [abort]);

  useKeyboard((key) => {
    if (
      key.name === "escape" &&
      isTopLayer(LayerName.Base) &&
      streaming.status === "streaming"
    ) {
      key.preventDefault();
      interrupt();
    }
  });

  return (
    <SessionShell
      onSubmit={(text) =>
        submit({
          userText: text,
          mode: "BUILD",
          model: DEFAULT_CHAT_MODEL_ID,
        })
      }
      interruptible={streaming.status === "streaming"}
      loading={streaming.status === "streaming"}
    >
      {messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} />
      ))}
      {streaming.status === "streaming" && streaming.parts.length > 0 && (
        <BotMessage
          parts={streaming.parts}
          mode={streaming.mode}
          model={streaming.model}
          streaming
        />
      )}
    </SessionShell>
  );
}

export function Session() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  const prefetched = useMemo(() => {
    const parsed = sessionLocationSchema.safeParse(location.state);
    return parsed.success ? parsed.data.session : null;
  }, [location.state]);

  const [session, setSession] = useState<SessionData | null>(prefetched);

  useEffect(() => {
    if (prefetched) return; // Already have data from location state, no need to fetch

    setSession(null); // Clear session data to show loading state
    let timer: NodeJS.Timeout | null = null;

    if (!id) return;
    let ignore = false;
    const fetchSession = async () => {
      try {
        const res = await apiClient.sessions[":id"].$get({ param: { id } });
        if (ignore) return;
        if (!res.ok) throw new Error(await getErrorMessage(res));
        setSession(await res.json());
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to load session",
        });
        timer = setTimeout(() => {
          navigate("/", { replace: true });
        }, 3000);
      }
    };
    fetchSession();
    return () => {
      ignore = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [id, toast]);

  if (!session) {
    return <SessionShell onSubmit={() => {}} inputDisabled loading />;
  }

  return <SessionChat session={session} key={session.id} />;
}
