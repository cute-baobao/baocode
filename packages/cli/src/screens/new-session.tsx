import { useLocation, useNavigate } from "react-router";
import { useTheme } from "../providers/theme";
import { useEffect } from "react";
import { SessionShell } from "../components/session-shell";
import { BotMessage, UserMessage, ErrorMessage } from "../components/messages";

export function NewSession() {
  const navitgate = useNavigate();
  const location = useLocation();
  const { colors } = useTheme();

  const state = location.state as { message: string } | null;

  useEffect(() => {
    if (!state?.message) {
      navitgate("/", { replace: true });
    }
  }, [state, navitgate]);

  return (
    <SessionShell onSubmit={() => {}} inputDisabled loading></SessionShell>
  );
}
