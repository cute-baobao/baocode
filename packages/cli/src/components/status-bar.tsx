import { TextAttributes } from "@opentui/core";

export function StatusBar() {
  return (
    <box flexDirection="row" gap={1}>
      <text fg="cyan">Build</text>
      <text attributes={TextAttributes.DIM}>›</text>
      <text>model name</text>
    </box>
  );
}
