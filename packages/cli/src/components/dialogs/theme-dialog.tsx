import { useCallback, useEffect, useRef } from "react";
import { useDialog } from "../../providers/dialog";
import { useTheme } from "../../providers/theme";
import { THEMES, type Theme } from "../../theme";
import { DialogSearchList } from "../dialog-search-list";

export const ThemeDialogContent = () => {
  const dialog = useDialog();
  const { setTheme, currentTheme } = useTheme();
  const confirmedRef = useRef(false);
  const orignalThemeRef = useRef(currentTheme);

  useEffect(() => {
    // When the dialog is opened, we store the original theme. If the user confirms the theme change, we set confirmedRef to true. If the user cancels or closes the dialog without confirming, we revert to the original theme.
    return () => {
      if (!confirmedRef.current) {
        setTheme(orignalThemeRef.current);
      }
    };
  }, [setTheme]);

  const handleSelect = useCallback(
    (theme: Theme) => {
      confirmedRef.current = true;
      setTheme(theme);
      dialog.close();
    },
    [setTheme, dialog],
  );

  const handleHighlight = useCallback(
    (theme: Theme) => {
      setTheme(theme);
    },
    [setTheme],
  );

  return (
    <DialogSearchList
      items={THEMES}
      onHighlight={handleHighlight}
      onSelect={handleSelect}
      filterFn={(t, q) => t.name.toLowerCase().includes(q.toLowerCase())}
      renderItem={(theme, isSelected) => (
        <text selectable={false} fg={isSelected ? "black" : "white"}>
          {theme.name === orignalThemeRef.current.name
            ? `\u0020\u2022\u0020`
            : "\u0020\u2020\u0020"}
          {theme.name}
        </text>
      )}
      getKey={(theme) => theme.name}
      placeholder="Search themes..."
      emptyText="No matching themes"
    />
  );
};
