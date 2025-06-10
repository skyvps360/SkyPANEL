import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// Notifications
export const notifications = pgTable("notifications", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(), // 'info', 'warning', 'error', 'success'
    read: boolean("read").notNull().default(false),
    link: text("link"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
    id: true,
    createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;