import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

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

export default {
  port: 3000,
  fetch: app.fetch,
  idleTimeout: 255
};