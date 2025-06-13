import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// Discord Todos
export const discordTodos = pgTable("discord_todos", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    discordUserId: text("discord_user_id").notNull(), // Discord user ID for mapping
    discordUsername: text("discord_username").notNull(), // Discord username for display
    task: text("task").notNull(),
    description: text("description"), // Optional detailed description
    priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
    category: text("category").default("general"), // For grouping todos
    dueDate: timestamp("due_date"), // Optional due date
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at"), // When the todo was completed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiscordTodoSchema = createInsertSchema(discordTodos).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
});

export const updateDiscordTodoSchema = createInsertSchema(discordTodos).omit({
    id: true,
    userId: true,
    discordUserId: true,
    createdAt: true,
    updatedAt: true,
}).partial();

export type InsertDiscordTodo = z.infer<typeof insertDiscordTodoSchema>;
export type UpdateDiscordTodo = z.infer<typeof updateDiscordTodoSchema>;
export type DiscordTodo = typeof discordTodos.$inferSelect;
