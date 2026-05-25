import { useNavigate } from "react-router";
import { Header } from "../components/header";
import { InputBar } from "../components/input-bar";
import { useCallback } from "react";

export function Home() {
  const navigate = useNavigate();

  const handleSubmit = useCallback(
    (text: string) => {
      navigate("/sessions/new", { state: { message: text } });
    },
    [navigate],
  );

  return (
    <box
      alignItems="center"
      justifyContent="center"
      width="100%"
      height="100%"
      flexGrow={1}
      gap={2}
      position="relative"
    >
      <Header />
      <box width={"100%"} maxWidth={78} paddingX={2}>
        <InputBar onSubmit={handleSubmit} />
      </box>
    </box>
  );
}
