import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import sessions from "./routes/session";
import chat from "./routes/chat";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const app = new Hono();

app.onError((error, ctx) => {
  if (error instanceof HTTPException) {
    return ctx.json(
      {
        error: error.message || "Request failed",
      },
      error.status,
    );
  }

  console.error("Unhandled server error:", error);
  return ctx.json(
    {
      error: "Internal Server Error",
    },
    500,
  );
});

const routes = app.route("/sessions", sessions).route("/chat", chat);

export type AppType = typeof routes;

export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255,
};
