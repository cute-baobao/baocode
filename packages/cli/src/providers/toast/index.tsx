import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_TOAST_DURATION,
  type ToastOptions,
  type ToastVariant,
} from "./types";
import { useTerminalDimensions } from "@opentui/react";
import { SplitBorderChars } from "../../components/border";
import { useTheme } from "../theme";

export type ToastContextType = {
  show: (options: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return value;
}

type ToastProviderProps = {
  children: React.ReactNode;
};

export function ToastProvider({ children }: ToastProviderProps) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const timeoutHandleRef = useRef<NodeJS.Timeout | null>(null);

  const clearCurrentTimeout = useCallback(() => {
    if (timeoutHandleRef.current) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }
  }, []);

  const show = useCallback(
    (options: ToastOptions) => {
      const duration = options.duration ?? DEFAULT_TOAST_DURATION;
      clearCurrentTimeout();
      setCurrentToast({
        variant: options.variant || "info",
        ...options,
        duration,
      });
      timeoutHandleRef.current = setTimeout(() => {
        setCurrentToast(null);
        clearCurrentTimeout();
      }, duration).unref();
    },
    [clearCurrentTimeout],
  );

  const value: ToastContextType = {
    show,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast currentToast={currentToast} />
    </ToastContext.Provider>
  );
}

type ToastProps = {
  currentToast: ToastOptions | null;
};

function Toast({ currentToast }: ToastProps) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();

  if (!currentToast) return null;

  const maxToastWidth = Math.max(1, Math.min(60, width - 6));
  const contentWidth = currentToast.message
    .split(/\r?\n/)
    .reduce((max, line) => Math.max(max, Array.from(line).length), 0);
  const textWidth = Math.max(1, Math.min(contentWidth, maxToastWidth - 4));
  const toastWidth = Math.max(1, textWidth + 4);

  const variantColors: Record<ToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };

  const borderColor = currentToast.variant
    ? variantColors[currentToast.variant]
    : variantColors.info;

  return (
    <box
      position="absolute"
      justifyContent="center"
      alignItems="flex-start"
      top={2}
      right={2}
      width={toastWidth}
      maxWidth={maxToastWidth}
      paddingLeft={2}
      paddingRight={2}
      paddingTop={1}
      paddingBottom={1}
      backgroundColor={colors.surface}
      border={["left", "right"]}
      borderColor={borderColor}
      customBorderChars={SplitBorderChars}
    >
      <text fg="#E1E1E1" wrapMode="word" width={textWidth}>
        {currentToast.message}
      </text>
    </box>
  );
}
0;
