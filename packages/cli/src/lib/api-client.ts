import { hc } from "hono/client";
import type { AppType } from "@baocode/server";

export const apiClient = hc<AppType>(
    process.env?.API_BASE_URL || "http://localhost:3000",
)