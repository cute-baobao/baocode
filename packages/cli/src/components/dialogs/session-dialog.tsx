import type { InferResponseType } from "hono/client";
import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../../lib/api-client";
import { useDialog } from "../../providers/dialog";
import { useNavigate } from "react-router";
import { useToast } from "../../providers/toast";
import { getErrorMessage } from "../../lib/http-error";
import { TextAttributes } from "@opentui/core";
import { DialogSearchList } from "../dialog-search-list";
import { useTheme } from "../../providers/theme";
import { format } from "date-fns";

type Session = InferResponseType<
  (typeof apiClient.sessions)["$get"],
  200
>[number];

export const SessionsDialogContent = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const { close } = useDialog();
  const navigate = useNavigate();
  const { show } = useToast();
  const { colors } = useTheme();

  useEffect(() => {
    let ignored = false;
    const fetchSessions = async () => {
      try {
        const res = await apiClient.sessions.$get();
        if (!res.ok) {
          throw new Error(await getErrorMessage(res));
        }
        const data = await res.json();
        if (!ignored) {
          setSessions(data);
          setLoading(false);
        }
      } catch (error) {
        show({
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch sessions. Please try again.",
          variant: "error",
        });
        close();
      }
    };
    fetchSessions();
    return () => {
      ignored = true;
    };
  }, [close, show]);

  const handleSelect = useCallback(
    (session: Session) => {
      close();
      navigate(`/sessions/${session.id}`);
    },
    [close, navigate],
  );

  if (loading) {
    return (
      <box flexDirection="column">
        <text attributes={TextAttributes.DIM}>Loading sessions...</text>
      </box>
    );
  }

  return (
    <DialogSearchList
      items={sessions}
      onSelect={handleSelect}
      placeholder="Search sessions..."
      filterFn={(s, query) =>
        s.title.toLowerCase().includes(query.toLowerCase())
      }
      renderItem={(s, isSelected) => (
        <>
          
        </>
      )}
      getKey={(s) => s.id.toString()}
      emptyText="No matching sessions"
    />
  );
};
