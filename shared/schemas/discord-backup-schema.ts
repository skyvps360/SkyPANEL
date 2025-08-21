/**
 * @fileoverview Discord server backup schema definitions
 * @author SkyPANEL Development Team
 * @created 2025-01-21
 * @modified 2025-01-21
 * @version 1.0.0
 */

import { pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, z } from "./common-imports";

// Discord Server Backups - main backup records
export const discordServerBackups = pgTable("discord_server_backups", {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(), // Discord guild/server ID
    guildName: text("guild_name").notNull(), // Guild name at time of backup
    backupName: text("backup_name").notNull(), // User-defined backup name
    backupType: text("backup_type").notNull().default("manual"), // manual, scheduled, automatic
    status: text("status").notNull().default("in_progress"), // in_progress, completed, failed, partial
    totalSize: integer("total_size").default(0), // Total backup size in bytes
    messageCount: integer("message_count").default(0), // Total messages backed up
    channelCount: integer("channel_count").default(0), // Total channels backed up
    roleCount: integer("role_count").default(0), // Total roles backed up
    memberCount: integer("member_count").default(0), // Total members at backup time
    createdBy: text("created_by").notNull(), // Discord user ID who created backup
    errorLog: text("error_log"), // Error messages if backup failed
    metadata: json("metadata").default({}), // Additional backup metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"), // When backup was completed
});

export const insertDiscordServerBackupSchema = createInsertSchema(discordServerBackups).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordServerBackup = z.infer<typeof insertDiscordServerBackupSchema>;
export type DiscordServerBackup = typeof discordServerBackups.$inferSelect;

// Discord Guild Settings Backup - server configuration
export const discordGuildSettingsBackup = pgTable("discord_guild_settings_backup", {
    id: serial("id").primaryKey(),
    backupId: integer("backup_id").notNull().references(() => discordServerBackups.id, { onDelete: "cascade" }),
    guildId: text("guild_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    bannerUrl: text("banner_url"),
    splashUrl: text("splash_url"),
    ownerId: text("owner_id").notNull(),
    region: text("region"),
    afkChannelId: text("afk_channel_id"),
    afkTimeout: integer("afk_timeout"),
    systemChannelId: text("system_channel_id"),
    rulesChannelId: text("rules_channel_id"),
    publicUpdatesChannelId: text("public_updates_channel_id"),
    verificationLevel: integer("verification_level"),
    defaultMessageNotifications: integer("default_message_notifications"),
    explicitContentFilter: integer("explicit_content_filter"),
    mfaLevel: integer("mfa_level"),
    premiumTier: integer("premium_tier"),
    premiumSubscriptionCount: integer("premium_subscription_count"),
    preferredLocale: text("preferred_locale"),
    features: json("features").default([]), // Array of guild features
    vanityUrlCode: text("vanity_url_code"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordGuildSettingsBackupSchema = createInsertSchema(discordGuildSettingsBackup).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordGuildSettingsBackup = z.infer<typeof insertDiscordGuildSettingsBackupSchema>;
export type DiscordGuildSettingsBackup = typeof discordGuildSettingsBackup.$inferSelect;

// Discord Roles Backup - role configuration and permissions
export const discordRolesBackup = pgTable("discord_roles_backup", {
    id: serial("id").primaryKey(),
    backupId: integer("backup_id").notNull().references(() => discordServerBackups.id, { onDelete: "cascade" }),
    roleId: text("role_id").notNull(), // Original Discord role ID
    name: text("name").notNull(),
    color: integer("color").default(0), // Role color as integer
    hoist: boolean("hoist").default(false), // Display separately in sidebar
    position: integer("position").notNull(), // Role hierarchy position
    permissions: text("permissions").notNull(), // Permissions bitfield as string
    managed: boolean("managed").default(false), // Managed by integration
    mentionable: boolean("mentionable").default(false), // Can be mentioned
    iconUrl: text("icon_url"), // Role icon URL
    unicodeEmoji: text("unicode_emoji"), // Unicode emoji for role
    tags: json("tags").default({}), // Role tags (bot, integration, etc.)
    memberCount: integer("member_count").default(0), // Number of members with this role
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordRolesBackupSchema = createInsertSchema(discordRolesBackup).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordRolesBackup = z.infer<typeof insertDiscordRolesBackupSchema>;
export type DiscordRolesBackup = typeof discordRolesBackup.$inferSelect;

// Discord Channels Backup - channel structure and settings
export const discordChannelsBackup = pgTable("discord_channels_backup", {
    id: serial("id").primaryKey(),
    backupId: integer("backup_id").notNull().references(() => discordServerBackups.id, { onDelete: "cascade" }),
    channelId: text("channel_id").notNull(), // Original Discord channel ID
    name: text("name").notNull(),
    type: integer("type").notNull(), // Channel type (text, voice, category, etc.)
    position: integer("position").notNull(), // Channel position in list
    parentId: text("parent_id"), // Parent category ID
    topic: text("topic"), // Channel topic/description
    nsfw: boolean("nsfw").default(false), // NSFW channel flag
    bitrate: integer("bitrate"), // Voice channel bitrate
    userLimit: integer("user_limit"), // Voice channel user limit
    rateLimitPerUser: integer("rate_limit_per_user"), // Slowmode seconds
    rtcRegion: text("rtc_region"), // Voice region
    videoQualityMode: integer("video_quality_mode"), // Video quality mode
    defaultAutoArchiveDuration: integer("default_auto_archive_duration"), // Thread auto-archive duration
    permissions: json("permissions").default([]), // Channel permission overwrites
    messageCount: integer("message_count").default(0), // Number of messages in channel
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordChannelsBackupSchema = createInsertSchema(discordChannelsBackup).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordChannelsBackup = z.infer<typeof insertDiscordChannelsBackupSchema>;
export type DiscordChannelsBackup = typeof discordChannelsBackup.$inferSelect;

// Discord Messages Backup - message content and metadata
export const discordMessagesBackup = pgTable("discord_messages_backup", {
    id: serial("id").primaryKey(),
    backupId: integer("backup_id").notNull().references(() => discordServerBackups.id, { onDelete: "cascade" }),
    channelBackupId: integer("channel_backup_id").notNull().references(() => discordChannelsBackup.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(), // Original Discord message ID
    authorId: text("author_id").notNull(), // Message author Discord ID
    authorUsername: text("author_username").notNull(), // Author username at time of backup
    authorDisplayName: text("author_display_name"), // Author display name
    authorAvatar: text("author_avatar"), // Author avatar URL
    content: text("content"), // Message text content
    embeds: json("embeds").default([]), // Message embeds
    attachments: json("attachments").default([]), // Message attachments
    reactions: json("reactions").default([]), // Message reactions
    mentions: json("mentions").default([]), // User mentions
    mentionRoles: json("mention_roles").default([]), // Role mentions
    mentionChannels: json("mention_channels").default([]), // Channel mentions
    pinned: boolean("pinned").default(false), // Message pinned status
    tts: boolean("tts").default(false), // Text-to-speech flag
    messageType: integer("message_type").default(0), // Discord message type
    flags: integer("flags").default(0), // Message flags
    referencedMessageId: text("referenced_message_id"), // Reply reference
    threadId: text("thread_id"), // Thread ID if message is in thread
    editedAt: timestamp("edited_at"), // When message was last edited
    originalCreatedAt: timestamp("original_created_at").notNull(), // Original Discord timestamp
    createdAt: timestamp("created_at").defaultNow().notNull(), // Backup timestamp
});

export const insertDiscordMessagesBackupSchema = createInsertSchema(discordMessagesBackup).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordMessagesBackup = z.infer<typeof insertDiscordMessagesBackupSchema>;
export type DiscordMessagesBackup = typeof discordMessagesBackup.$inferSelect;

// Discord Backup Settings - configuration for backup system
export const discordBackupSettings = pgTable("discord_backup_settings", {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull().unique(), // Discord guild/server ID
    isEnabled: boolean("is_enabled").default(false), // Backup system enabled
    autoBackupEnabled: boolean("auto_backup_enabled").default(false), // Automatic backups
    autoBackupInterval: integer("auto_backup_interval").default(24), // Hours between auto backups
    maxBackupCount: integer("max_backup_count").default(10), // Max backups to keep
    includeMessages: boolean("include_messages").default(true), // Include message history
    messageHistoryDays: integer("message_history_days").default(30), // Days of message history
    includeAttachments: boolean("include_attachments").default(false), // Include file attachments
    maxAttachmentSize: integer("max_attachment_size").default(8388608), // Max attachment size (8MB)
    allowedRoles: json("allowed_roles").default([]), // Roles that can create backups
    excludedChannels: json("excluded_channels").default([]), // Channels to exclude from backup
    notificationChannelId: text("notification_channel_id"), // Channel for backup notifications
    lastAutoBackup: timestamp("last_auto_backup"), // Last automatic backup time
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDiscordBackupSettingsSchema = createInsertSchema(discordBackupSettings).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDiscordBackupSettings = z.infer<typeof insertDiscordBackupSettingsSchema>;
export type DiscordBackupSettings = typeof discordBackupSettings.$inferSelect;

// Discord Backup Jobs - for tracking scheduled/automated backups
export const discordBackupJobs = pgTable("discord_backup_jobs", {
    id: serial("id").primaryKey(),
    guildId: text("guild_id").notNull(),
    jobType: text("job_type").notNull(), // scheduled, manual, automatic
    status: text("status").notNull().default("pending"), // pending, running, completed, failed
    scheduledFor: timestamp("scheduled_for").notNull(), // When job should run
    startedAt: timestamp("started_at"), // When job actually started
    completedAt: timestamp("completed_at"), // When job finished
    backupId: integer("backup_id").references(() => discordServerBackups.id), // Resulting backup ID
    errorMessage: text("error_message"), // Error if job failed
    progress: integer("progress").default(0), // Job progress percentage
    currentStep: text("current_step"), // Current backup step
    metadata: json("metadata").default({}), // Job-specific metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiscordBackupJobSchema = createInsertSchema(discordBackupJobs).omit({
    id: true,
    createdAt: true,
});

export type InsertDiscordBackupJob = z.infer<typeof insertDiscordBackupJobSchema>;
export type DiscordBackupJob = typeof discordBackupJobs.$inferSelect;