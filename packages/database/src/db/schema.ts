import { relations } from "drizzle-orm/relations";
import { index, int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Role, Mode, MessageStatus } from "../enums";

export const sessionTable = sqliteTable("sessions", {
  id: int("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  cwd: text("cwd"),
  createdAt: text("created_at").notNull(),
});

export const messageTable = sqliteTable(
  "messages",
  {
    id: int("id").primaryKey({ autoIncrement: true }),
    sessionId: int("session_id")
      .references(() => sessionTable.id, { onDelete: "cascade" })
      .notNull(),
    role: text("role").$type<Role>().notNull(),
    status: text("status").$type<MessageStatus>().notNull(),
    content: text("content").notNull(),
    parts: text("parts"),
    mode: text("mode").$type<Mode>().notNull(),
    createdAt: text("created_at").notNull(),
    duration: int("duration"),
    model: text("model").notNull(),
  },
  (t) => [index("session_id_idx").on(t.sessionId)],
);

export const sessionRelation = relations(sessionTable, ({ many }) => ({
  messages: many(messageTable),
}));

export const messageRelation = relations(messageTable, ({ one }) => ({
  session: one(sessionTable, {
    fields: [messageTable.sessionId],
    references: [sessionTable.id],
  }),
}));

export type Session = typeof sessionTable.$inferSelect;
export type Message = typeof messageTable.$inferSelect;