import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Todos table schema for Discord bot todo system
 * Stores user tasks with completion status and timestamps
 */
export const todos = pgTable("todos", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(), // Discord user ID
  task: text("task").notNull(),
  isCompleted: boolean("is_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertTodoSchema = createInsertSchema(todos, {
  task: z.string().min(1, "Task cannot be empty").max(500, "Task too long"),
  userId: z.string().min(1, "User ID is required"),
});

export const selectTodoSchema = createSelectSchema(todos);

export const updateTodoSchema = insertTodoSchema.partial().omit({ userId: true });

// TypeScript types
export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
export type UpdateTodo = z.infer<typeof updateTodoSchema>;