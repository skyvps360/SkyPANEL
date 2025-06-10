import {pgTable, text, serial, integer, timestamp, json, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// Email Logs
export const emailLogs = pgTable("email_logs", {
    id: serial("id").primaryKey(),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name"),
    subject: text("subject").notNull(),
    type: text("type").notNull(), // password_reset, email_verification, maintenance_notification, etc.
    status: text("status").notNull().default("sent"), // sent, failed, etc.
    messageId: text("message_id"), // The ID returned by the email provider
    errorMessage: text("error_message"), // If the email failed, this will contain the error message
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    userId: integer("user_id").references(() => users.id, {onDelete: 'set null'}), // Optional, if the email was sent to a user
    metadata: json("metadata").default({}), // Additional data about the email, like tokens, message, etc.
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
    id: true,
    sentAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;