/**
 * @fileoverview Discord verification schema definitions
 * @author SkyPANEL Development Team
 * @created 2025-07-27
 * @modified 2025-07-27
 * @version 1.0.0
 */

import { pgTable, text, serial, boolean, timestamp, createInsertSchema, z } from "./common-imports";

// Discord Verification Settings - configuration for the verification system
export const discordVerificationSettings = pgTable("discord_verification_settings", {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull().unique(), // Discord guild/server ID
    roleId: text("role_id").notNull(), // Role to assign upon verification
    channelId: text("channel_id"), // Channel where verification message is posted
    messageId: text("message_id"), // Message ID of the verification message
    isEnabled: boolean("is_enabled").default(false), // Whether verification is enabled
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiscordVerificationSettingsSchema = createInsertSchema(discordVerificationSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDiscordVerificationSettings = z.infer<typeof insertDiscordVerificationSettingsSchema>;
export type DiscordVerificationSettings = typeof discordVerificationSettings.$inferSelect;

// Discord Verified Users - tracks users who have been verified
export const discordVerifiedUsers = pgTable("discord_verified_users", {
    id: serial("id").primaryKey(),
    discordUserId: text("discord_user_id").notNull().unique(), // Discord user ID
    discordUsername: text("discord_username").notNull(), // Discord username at time of verification
    verifiedAt: timestamp("verified_at").defaultNow().notNull(),
    guildId: text("guild_id").notNull(), // Guild where user was verified
});

export const insertDiscordVerifiedUserSchema = createInsertSchema(discordVerifiedUsers).omit({
    id: true,
    verifiedAt: true,
});

export type InsertDiscordVerifiedUser = z.infer<typeof insertDiscordVerifiedUserSchema>;
export type DiscordVerifiedUser = typeof discordVerifiedUsers.$inferSelect;
