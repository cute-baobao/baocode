import type { Mode } from "@baocode/database/enums";
import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextType } from "../../providers/toast";
import type { SupportedChatModelId } from "@baocode/shared";

export type CommandContext = {
  exit: () => void;
  toast: ToastContextType;
  dialog: DialogContextValue;
  navigate: (path: string) => void;
  mode: Mode;
  setMode: (mode: Mode) => void;
  setModel: (model: SupportedChatModelId) => void;
};

export type Command = {
  name: string;
  description: string;
  value: string;
  action?: (context: CommandContext) => void | Promise<void>;
};
