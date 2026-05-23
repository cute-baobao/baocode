import type { KeyBinding, TextareaRenderable } from "@opentui/core";
import { EmptyBorder } from "./border";
import { StatusBar } from "./status-bar";
import { CommandMenu } from "./command-menu";
import { useCallback, useEffect, useRef } from "react";
import { useRenderer } from "@opentui/react";
import { useCommandMenu } from "./command-menu/use-command-menu";
import type { Command } from "./command-menu/types";
import { useToast } from "../providers/toast";
import { LayerName, useKeyboardLayer } from "../providers/keyboard-layer";
import { useDialog } from "../providers/dialog";
import { useTheme } from "../providers/theme";

type Props = {
  onSubmit: (value: string) => void;
  disabled?: boolean;
};

export const TEXTAREA_KEY_BINDINGS: KeyBinding[] = [
  { name: "return", action: "submit" },
  { name: "enter", action: "submit" },
  { name: "return", shift: true, action: "newline" },
  { name: "enter", shift: true, action: "newline" },
];

export function InputBar({ onSubmit, disabled }: Props) {
  const textareaRef = useRef<TextareaRenderable>(null);
  const onSubmitRef = useRef<() => void>(() => {});
  const renderer = useRenderer();
  const toast = useToast();
  const {
    showCommandMenu,
    commandQuery,
    selectedIndex,
    scrollRef,
    handleContentChange,
    resolveCommand,
    setSelectedIndex,
  } = useCommandMenu();
  const { isTopLayer, setResponder } = useKeyboardLayer();
  const dialog = useDialog();
  const { colors } = useTheme();

  const handleTextareaContentChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    handleContentChange(textarea.plainText);
  }, []);

  const handleSubmit = useCallback(() => {
    if (disabled) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const text = textarea.plainText.trim();
    if (text.length === 0) return;

    onSubmit(text);
    textarea.setText("");
  }, [disabled, onSubmit]);

  const handleCommand = useCallback(
    (command: Command | undefined) => {
      const textarea = textareaRef.current;
      if (!textarea || !command) return;

      textarea.setText("");
      if (command.action) {
        command.action({
          exit: () => {
            renderer.destroy();
          },
          toast,
          dialog,
        });
      } else {
        textarea.insertText(command.value + " ");
      }
    },
    [renderer, toast, dialog],
  );

  const handleExecuteCommand = useCallback(() => {
    const command = resolveCommand(selectedIndex);
    handleCommand(command);
  }, []);

  onSubmitRef.current = () => {
    if (disabled) return;

    if (showCommandMenu) {
      const command = resolveCommand(selectedIndex);
      handleCommand(command);
      return;
    }

    handleSubmit();
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.onSubmit = () => {
      onSubmitRef.current();
    };
  }, []);

  useEffect(() => {
    setResponder(LayerName.Base, () => {
      if (disabled) return false;

      const textarea = textareaRef.current;
      if (textarea && textarea.plainText.length > 0) {
        textarea.setText("");
        return true;
      }
      return false;
    });

    return () => setResponder(LayerName.Base, null);
  }, [disabled]);

  return (
    <box width={"100%"} alignItems="center">
      <box
        border={["left"]}
        borderColor={colors.primary}
        customBorderChars={{
          ...EmptyBorder,
          vertical: "┃",
          bottomLeft: "╹",
        }}
        width={"100%"}
      >
        <box
          position="relative"
          justifyContent="center"
          paddingX={2}
          paddingY={1}
          backgroundColor={colors.surface}
          width={"100%"}
          gap={1}
        >
          {showCommandMenu && (
            <box
              position="absolute"
              bottom={"100%"}
              left={0}
              width={"100%"}
              backgroundColor={colors.surface}
              zIndex={10}
            >
              <CommandMenu
                query={commandQuery}
                selectedIndex={selectedIndex}
                scrollRef={scrollRef}
                onSelect={setSelectedIndex}
                onExecute={handleExecuteCommand}
              />
            </box>
          )}
          <textarea
            ref={textareaRef}
            focused={
              !disabled &&
              (isTopLayer(LayerName.Base) || isTopLayer(LayerName.Command))
            }
            onContentChange={handleTextareaContentChange}
            placeholder="Type a message..."
            keyBindings={TEXTAREA_KEY_BINDINGS}
          />
          <StatusBar />
        </box>
      </box>
    </box>
  );
}
