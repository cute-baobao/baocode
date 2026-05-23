import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextType } from "../../providers/toast";

export type CommandContext = {
  exit: () => void;
  toast: ToastContextType;
  dialog: DialogContextValue;
};

export type Command = {
  name: string;
  description: string;
  value: string;
  action?: (context: CommandContext) => void | Promise<void>;
};
