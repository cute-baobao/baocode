import { findSupportedChatModel } from "@baocode/shared";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import z from "zod";
import { MODE, ROLE ,MESSAGE_STATUS} from "@baocode/database/enums";
import { messageTable, sessionTable, type Message } from "@baocode/database";
import { db } from "@baocode/database/client";
import { desc, eq } from "drizzle-orm";

const createSessionSchema = z.object({
  title: z.string(),
  cwd: z.string().nullable(),
  initialMessage: z
    .object({
      role: z.enum(ROLE),
      content: z.string(),
      mode: z.enum(MODE),
      model: z
        .string()
        .refine((id) => !!findSupportedChatModel(id), "Unsupported model"),
    })
    .optional(),
});

const createSessionValidator = zValidator(
  "json",
  createSessionSchema,
  (result, c) => {
    if (!result.success) {
      return c.json({ error: "Invalid request body" }, 400);
    }
  },
);

const app = new Hono()
  .get("/", async (c) => {
    const result = await db
      .select({
        id: sessionTable.id,
        title: sessionTable.title,
        createdAt: sessionTable.createdAt,
      })
      .from(sessionTable)
      .orderBy(desc(sessionTable.createdAt));
    return c.json(result);
  })
  .get("/:id", async (c) => {
    const { id } = c.req.param();
    const session = await db.query.sessionTable.findFirst({
      where: eq(sessionTable.id, Number(id)),
      with: {
        messages: {
          orderBy: (messages, { asc }) => asc(messages.createdAt),
        },
      },
    });
    if (!session) {
      throw new HTTPException(404, { message: "Session not found" });
    }
    return c.json(session);
  })
  .post("/", createSessionValidator, async (c) => {
    const body = c.req.valid("json");
    const { initialMessage, ...data } = body;
    const result = await db.transaction(async (tx) => {
      const [session] = await tx.insert(sessionTable)
        .values({
          ...data,
          createdAt: new Date().toISOString(),
        })
        .returning();

      if(initialMessage && session) {
        const [message] = await tx.insert(messageTable).values({
          sessionId: session.id,
          role: initialMessage.role,
          content: initialMessage.content,
          mode: initialMessage.mode,
          model: initialMessage.model,
          status: MESSAGE_STATUS.COMPLETED,
          createdAt: new Date().toISOString(),
        }).returning();
        return { ...session, messages: [message] };
      }
      return { ...session, messages: [] as Message[]  };
    })
    return c.json(result, 201);
  });

export default app;
