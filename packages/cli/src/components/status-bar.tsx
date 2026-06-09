import { TextAttributes } from "@opentui/core";
import { useTheme } from "../providers/theme";
import { usePromptConfig } from "../providers/prompt-config";
import { MODE } from "@baocode/database/enums";

export function StatusBar() {
  const { colors } = useTheme();
  const { mode, model } = usePromptConfig();

  return (
    <box flexDirection="row" gap={1}>
      <text fg={mode === MODE.BUILD ? colors.primary : colors.planMode}>
        {mode === MODE.BUILD ? "Build" : "Plan"}
      </text>
      <text attributes={TextAttributes.DIM} fg={colors.dimSeparator}>
        ›
      </text>
      <text>{model}</text>
    </box>
  );
}
