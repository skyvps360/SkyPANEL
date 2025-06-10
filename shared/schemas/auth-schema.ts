import {pgTable, text, serial, integer, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    usedAt: timestamp("used_at"),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
    id: true,
    createdAt: true,
    usedAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Email Verification Tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    usedAt: timestamp("used_at"),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
    id: true,
    createdAt: true,
    usedAt: true,
});

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;