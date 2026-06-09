import { useCallback } from "react";
import { useDialog } from "../../providers/dialog";
import { DialogSearchList } from "../dialog-search-list";
import { MODE, type Mode } from "@baocode/database/enums";

const AVAILABLE_MODES = [MODE.BUILD, MODE.PLAN];

function getModeLabel(mode: Mode) {
  switch (mode) {
    case MODE.BUILD:
      return "Build Mode";
    case MODE.PLAN:
      return "Plan Mode";
    default:
      return mode;
  }
}

type AgentsDialogContentProps = {
  currentMode: Mode;
  onSelectMode: (mode: Mode) => void;
};

export const AgentsDialogContent = ({
  currentMode,
  onSelectMode,
}: AgentsDialogContentProps) => {
  const dialog = useDialog();

  const handleSelect = useCallback(
    (mode: Mode) => {
      onSelectMode(mode);
      dialog.close();
    },
    [onSelectMode, dialog],
  );

  return (
    <DialogSearchList
      items={AVAILABLE_MODES}
      onSelect={handleSelect}
      filterFn={(mode, q) =>
        getModeLabel(mode).toLowerCase().includes(q.toLowerCase())
      }
      renderItem={(mode, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {mode === currentMode ? " • " : "   "}
          {getModeLabel(mode)}
        </text>
      )}
      getKey={(mode) => mode}
      placeholder="Search agents..."
      emptyText="No matching agents"
    />
  );
};
