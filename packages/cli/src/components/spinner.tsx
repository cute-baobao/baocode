import { MODE, type Mode } from "@baocode/database/enums";
import { useTheme } from "../providers/theme";
import "opentui-spinner/react";

type SpinnerProps = {
  mode?: Mode;
};

export function Spinner({ mode }: SpinnerProps) {
  const { colors } = useTheme();

  return (
    <spinner
      name="aesthetic"
      color={mode === MODE.PLAN ? colors.planMode : colors.primary}
    />
  );
}
