import { replace, useLocation, useNavigate } from "react-router";
import { useTheme } from "../providers/theme";
import { useEffect, useMemo, useRef } from "react";
import { SessionShell } from "../components/session-shell";
import { BotMessage, UserMessage, ErrorMessage } from "../components/messages";
import { z } from "zod";
import { useToast } from "../providers/toast";
import { apiClient } from "../lib/api-client";
import { DEFAULT_CHAT_MODEL_ID } from "@baocode/shared";
import { getErrorMessage } from "../lib/http-error";
import { MODE, ROLE } from "@baocode/database/enums";

const newSessionStateSchema = z.object({
  message: z.string().trim().min(1),
});

export function NewSession() {
  const navigate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();
  const toast = useToast();
  const hasStartedRef = useRef(false);

  const state = useMemo(() => {
    const parsed = newSessionStateSchema.safeParse(location.state);
    return parsed.success ? parsed.data : null;
  }, [location.state]);

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  useEffect(() => {
    if (!state || hasStartedRef.current) return;

    hasStartedRef.current = true;

    let ignore = false;
    const createSession = async () => {
      try {
        const res = await apiClient.sessions.$post({
          json: {
            title: state.message.slice(0, 100),
            cwd: process.cwd(),
            initialMessage: {
              role: ROLE.USER,
              content: state.message,
              mode: MODE.BUILD,
              model: DEFAULT_CHAT_MODEL_ID,
            },
          },
        });

        if (ignore) return;
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const session = await res.json();
        (navigate(`/sessions/${session.id}`),
          { replace: true, state: { session } });
      } catch (error) {
        if (ignore) return;
        toast.show({
          variant: "error",
          message:
            error instanceof Error ? error.message : "Failed to create session",
        });
      }
    };
    createSession();

    return () => {
      ignore = true;
    };
  }, []);

  if(!state) return null

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading>
      <UserMessage message={state.message} />
    </SessionShell>
  );
}
