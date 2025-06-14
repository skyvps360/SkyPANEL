/**
 * @fileoverview Discord AI conversation schema definitions
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, z } from "./common-imports";

// Discord AI Conversations - stores persistent conversation history for Discord users
export const discordAIConversations = pgTable("discord_ai_conversations", {
    id: serial("id").primaryKey(),
    discordUserId: text("discord_user_id").notNull(), // Discord user ID (string format)
    discordUsername: text("discord_username").notNull(), // Discord username for context
    role: text("role").notNull(), // 'user' or 'model' (AI)
    message: text("message").notNull(), // The actual message content
    messageType: text("message_type").notNull().default("text"), // text, system, error
    metadata: json("metadata").default({}), // Additional data like prompt length, model used, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordAIConversationSchema = createInsertSchema(discordAIConversations).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordAIConversation = z.infer<typeof insertDiscordAIConversationSchema>;
export type DiscordAIConversation = typeof discordAIConversations.$inferSelect;

// Discord AI User Settings - per-user preferences and limits
export const discordAIUserSettings = pgTable("discord_ai_user_settings", {
    id: serial("id").primaryKey(),
    discordUserId: text("discord_user_id").notNull().unique(), // Discord user ID
    discordUsername: text("discord_username").notNull(), // Discord username
    maxConversationHistory: integer("max_conversation_history").default(50), // Max messages to keep
    isEnabled: boolean("is_enabled").default(true), // Can use AI features
    lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
    totalMessagesCount: integer("total_messages_count").default(0), // Total messages sent by user
    metadata: json("metadata").default({}), // Additional settings like preferred model, etc.
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiscordAIUserSettingsSchema = createInsertSchema(discordAIUserSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDiscordAIUserSettings = z.infer<typeof insertDiscordAIUserSettingsSchema>;
export type DiscordAIUserSettings = typeof discordAIUserSettings.$inferSelect;
