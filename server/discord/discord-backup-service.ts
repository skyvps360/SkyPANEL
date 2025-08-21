/**
 * @fileoverview Discord Server Backup Service
 * @author SkyPANEL Development Team
 * @created 2025-01-21
 * @modified 2025-01-21
 * @version 1.0.0
 */

import {
    Guild,
    GuildChannel,
    Role,
    TextChannel,
    VoiceChannel,
    CategoryChannel,
    ThreadChannel,
    Message,
    Collection,
    PermissionOverwrites,
    ChatInputCommandInteraction,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    ChannelType
} from 'discord.js';
import { db } from '../db';
import {
    discordServerBackups,
    discordGuildSettingsBackup,
    discordRolesBackup,
    discordChannelsBackup,
    discordMessagesBackup,
    discordBackupSettings,
    discordBackupJobs,
    InsertDiscordServerBackup,
    InsertDiscordGuildSettingsBackup,
    InsertDiscordRolesBackup,
    InsertDiscordChannelsBackup,
    InsertDiscordMessagesBackup,
    InsertDiscordBackupSettings,
    InsertDiscordBackupJob,
    DiscordServerBackup,
    DiscordBackupSettings
} from '../../shared/schemas/discord-backup-schema';
import { eq, and, desc, gte, lte, count } from 'drizzle-orm';
import { discordBotCore } from './discord-bot-core';
import { DiscordEmbedUtils } from './discord-embed-utils';
import { storage } from '../storage';
import { discordBackupCommands } from './discord-backup-commands';

/**
 * Comprehensive Discord server backup service
 * Handles creation, management, and restoration of Discord server backups
 */
export class DiscordBackupService {
    private static instance: DiscordBackupService;
    private readonly RATE_LIMIT_DELAY = 1000; // 1 second between API calls
    private readonly MAX_MESSAGES_PER_CHANNEL = 10000; // Limit messages per channel
    private readonly BACKUP_TIMEOUT = 3600000; // 1 hour timeout for backups

    private constructor() {}

    /**
     * Get the singleton instance of DiscordBackupService
     * @returns The DiscordBackupService instance
     */
    public static getInstance(): DiscordBackupService {
        if (!DiscordBackupService.instance) {
            DiscordBackupService.instance = new DiscordBackupService();
        }
        return DiscordBackupService.instance;
    }

    /**
     * Create a comprehensive backup of a Discord server
     * @param guildId Discord guild ID
     * @param backupName User-defined backup name
     * @param createdBy Discord user ID who created the backup
     * @param backupType Type of backup (manual, scheduled, automatic)
     * @returns Backup creation result
     */
    public async createServerBackup(
        guildId: string,
        backupName: string,
        createdBy: string,
        backupType: 'manual' | 'scheduled' | 'automatic' = 'manual'
    ): Promise<{ success: boolean; backupId?: number; error?: string }> {
        const client = discordBotCore.getClient();
        if (!client) {
            return { success: false, error: 'Discord bot not initialized' };
        }

        try {
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                return { success: false, error: 'Guild not found' };
            }

            // Check backup settings
            const settings = await this.getBackupSettings(guildId);
            if (!settings?.isEnabled) {
                return { success: false, error: 'Backup system is disabled for this server' };
            }

            // Create initial backup record
            const [backup] = await db.insert(discordServerBackups).values({
                guildId,
                guildName: guild.name,
                backupName,
                backupType,
                status: 'in_progress',
                createdBy,
                memberCount: guild.memberCount
            }).returning();

            console.log(`Starting backup for guild ${guild.name} (ID: ${guildId})`);

            try {
                // Backup guild settings
                await this.backupGuildSettings(backup.id, guild);
                console.log('✅ Guild settings backed up');

                // Backup roles
                const roleCount = await this.backupRoles(backup.id, guild);
                console.log(`✅ ${roleCount} roles backed up`);

                // Backup channels
                const channelCount = await this.backupChannels(backup.id, guild, settings);
                console.log(`✅ ${channelCount} channels backed up`);

                // Backup messages (if enabled)
                let messageCount = 0;
                if (settings.includeMessages) {
                    messageCount = await this.backupMessages(backup.id, guild, settings);
                    console.log(`✅ ${messageCount} messages backed up`);
                }

                // Update backup as completed
                await db.update(discordServerBackups)
                    .set({
                        status: 'completed',
                        roleCount,
                        channelCount,
                        messageCount,
                        completedAt: new Date()
                    })
                    .where(eq(discordServerBackups.id, backup.id));

                console.log(`✅ Backup completed for guild ${guild.name}`);
                return { success: true, backupId: backup.id };

            } catch (error: any) {
                // Mark backup as failed
                await db.update(discordServerBackups)
                    .set({
                        status: 'failed',
                        errorLog: error.message,
                        completedAt: new Date()
                    })
                    .where(eq(discordServerBackups.id, backup.id));

                throw error;
            }

        } catch (error: any) {
            console.error('Error creating server backup:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Backup guild settings and configuration
     * @param backupId Backup record ID
     * @param guild Discord guild object
     */
    private async backupGuildSettings(backupId: number, guild: Guild): Promise<void> {
        const guildData: InsertDiscordGuildSettingsBackup = {
            backupId,
            guildId: guild.id,
            name: guild.name,
            description: guild.description,
            iconUrl: guild.iconURL(),
            bannerUrl: guild.bannerURL(),
            splashUrl: guild.splashURL(),
            ownerId: guild.ownerId,
            region: guild.preferredLocale,
            afkChannelId: guild.afkChannelId,
            afkTimeout: guild.afkTimeout,
            systemChannelId: guild.systemChannelId,
            rulesChannelId: guild.rulesChannelId,
            publicUpdatesChannelId: guild.publicUpdatesChannelId,
            verificationLevel: guild.verificationLevel,
            defaultMessageNotifications: guild.defaultMessageNotifications,
            explicitContentFilter: guild.explicitContentFilter,
            mfaLevel: guild.mfaLevel,
            premiumTier: guild.premiumTier,
            premiumSubscriptionCount: guild.premiumSubscriptionCount || 0,
            preferredLocale: guild.preferredLocale,
            features: guild.features,
            vanityUrlCode: guild.vanityURLCode
        };

        await db.insert(discordGuildSettingsBackup).values(guildData);
    }

    /**
     * Backup all roles in the guild
     * @param backupId Backup record ID
     * @param guild Discord guild object
     * @returns Number of roles backed up
     */
    private async backupRoles(backupId: number, guild: Guild): Promise<number> {
        const roles = await guild.roles.fetch();
        const roleData: InsertDiscordRolesBackup[] = [];

        for (const [roleId, role] of roles) {
            // Skip @everyone role as it's automatically created
            if (role.name === '@everyone') continue;

            const memberCount = role.members.size;

            roleData.push({
                backupId,
                roleId: role.id,
                name: role.name,
                color: role.color,
                hoist: role.hoist,
                position: role.position,
                permissions: role.permissions.bitfield.toString(),
                managed: role.managed,
                mentionable: role.mentionable,
                iconUrl: role.iconURL(),
                unicodeEmoji: role.unicodeEmoji,
                tags: role.tags ? {
                    botId: role.tags.botId,
                    integrationId: role.tags.integrationId,
                    premiumSubscriberRole: role.tags.premiumSubscriberRole,
                    subscriptionListingId: role.tags.subscriptionListingId,
                    availableForPurchase: role.tags.availableForPurchase,
                    guildConnections: role.tags.guildConnections
                } : {},
                memberCount
            });

            // Rate limiting
            await this.sleep(100);
        }

        if (roleData.length > 0) {
            await db.insert(discordRolesBackup).values(roleData);
        }

        return roleData.length;
    }

    /**
     * Backup all channels in the guild
     * @param backupId Backup record ID
     * @param guild Discord guild object
     * @param settings Backup settings
     * @returns Number of channels backed up
     */
    private async backupChannels(
        backupId: number,
        guild: Guild,
        settings: DiscordBackupSettings
    ): Promise<number> {
        const channels = await guild.channels.fetch();
        const channelData: InsertDiscordChannelsBackup[] = [];
        const excludedChannels = settings.excludedChannels as string[] || [];

        for (const [channelId, channel] of channels) {
            if (!channel || excludedChannels.includes(channelId)) continue;

            // Get permission overwrites
            const permissions = channel.permissionOverwrites.cache.map(overwrite => ({
                id: overwrite.id,
                type: overwrite.type,
                allow: overwrite.allow.bitfield.toString(),
                deny: overwrite.deny.bitfield.toString()
            }));

            const channelBackup: InsertDiscordChannelsBackup = {
                backupId,
                channelId: channel.id,
                name: channel.name,
                type: channel.type,
                position: channel.position,
                parentId: channel.parentId,
                permissions
            };

            // Add channel-specific properties
            if (channel.isTextBased()) {
                const textChannel = channel as TextChannel;
                channelBackup.topic = textChannel.topic;
                channelBackup.nsfw = textChannel.nsfw;
                channelBackup.rateLimitPerUser = textChannel.rateLimitPerUser;
                channelBackup.defaultAutoArchiveDuration = textChannel.defaultAutoArchiveDuration;
            }

            if (channel.type === ChannelType.GuildVoice) {
                const voiceChannel = channel as VoiceChannel;
                channelBackup.bitrate = voiceChannel.bitrate;
                channelBackup.userLimit = voiceChannel.userLimit;
                channelBackup.rtcRegion = voiceChannel.rtcRegion;
                channelBackup.videoQualityMode = voiceChannel.videoQualityMode;
            }

            channelData.push(channelBackup);

            // Rate limiting
            await this.sleep(100);
        }

        if (channelData.length > 0) {
            await db.insert(discordChannelsBackup).values(channelData);
        }

        return channelData.length;
    }

    /**
     * Backup messages from all text channels
     * @param backupId Backup record ID
     * @param guild Discord guild object
     * @param settings Backup settings
     * @returns Number of messages backed up
     */
    private async backupMessages(
        backupId: number,
        guild: Guild,
        settings: DiscordBackupSettings
    ): Promise<number> {
        const channels = await guild.channels.fetch();
        let totalMessages = 0;
        const excludedChannels = settings.excludedChannels as string[] || [];
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (settings.messageHistoryDays || 30));

        // Get channel backup IDs for reference
        const channelBackups = await db.select()
            .from(discordChannelsBackup)
            .where(eq(discordChannelsBackup.backupId, backupId));

        const channelBackupMap = new Map(
            channelBackups.map(cb => [cb.channelId, cb.id])
        );

        for (const [channelId, channel] of channels) {
            if (!channel || !channel.isTextBased() || excludedChannels.includes(channelId)) {
                continue;
            }

            const channelBackupId = channelBackupMap.get(channelId);
            if (!channelBackupId) continue;

            try {
                const textChannel = channel as TextChannel;
                let lastMessageId: string | undefined;
                let channelMessageCount = 0;
                const maxMessages = Math.min(this.MAX_MESSAGES_PER_CHANNEL, 1000); // Limit per batch

                console.log(`Backing up messages from #${textChannel.name}`);

                while (channelMessageCount < maxMessages) {
                    const messages = await textChannel.messages.fetch({
                        limit: 100,
                        before: lastMessageId
                    });

                    if (messages.size === 0) break;

                    const messageData: InsertDiscordMessagesBackup[] = [];

                    for (const [messageId, message] of messages) {
                        // Skip messages older than cutoff date
                        if (message.createdAt < cutoffDate) {
                            break;
                        }

                        const messageBackup: InsertDiscordMessagesBackup = {
                            backupId,
                            channelBackupId,
                            messageId: message.id,
                            authorId: message.author.id,
                            authorUsername: message.author.username,
                            authorDisplayName: message.author.displayName,
                            authorAvatar: message.author.avatarURL(),
                            content: message.content,
                            embeds: message.embeds.map(embed => embed.toJSON()),
                            attachments: message.attachments.map(attachment => ({
                                id: attachment.id,
                                name: attachment.name,
                                url: attachment.url,
                                proxyUrl: attachment.proxyURL,
                                size: attachment.size,
                                contentType: attachment.contentType
                            })),
                            reactions: message.reactions.cache.map(reaction => ({
                                emoji: reaction.emoji.name || reaction.emoji.id,
                                count: reaction.count,
                                users: reaction.users.cache.map(user => user.id)
                            })),
                            mentions: message.mentions.users.map(user => ({
                                id: user.id,
                                username: user.username
                            })),
                            mentionRoles: message.mentions.roles.map(role => role.id),
                            mentionChannels: message.mentions.channels.map(channel => channel.id),
                            pinned: message.pinned,
                            tts: message.tts,
                            messageType: message.type,
                            flags: message.flags.bitfield,
                            referencedMessageId: message.reference?.messageId,
                            threadId: message.thread?.id,
                            editedAt: message.editedAt,
                            originalCreatedAt: message.createdAt
                        };

                        messageData.push(messageBackup);
                        lastMessageId = messageId;
                    }

                    if (messageData.length > 0) {
                        await db.insert(discordMessagesBackup).values(messageData);
                        channelMessageCount += messageData.length;
                        totalMessages += messageData.length;
                    }

                    // Rate limiting - respect Discord API limits
                    await this.sleep(this.RATE_LIMIT_DELAY);

                    // Break if we've hit the cutoff date
                    if (messages.last()?.createdAt && messages.last()!.createdAt < cutoffDate) {
                        break;
                    }
                }

                // Update channel message count
                await db.update(discordChannelsBackup)
                    .set({ messageCount: channelMessageCount })
                    .where(eq(discordChannelsBackup.id, channelBackupId));

                console.log(`✅ Backed up ${channelMessageCount} messages from #${textChannel.name}`);

            } catch (error: any) {
                console.error(`Error backing up messages from channel ${channelId}:`, error.message);
                // Continue with other channels
            }
        }

        return totalMessages;
    }

    /**
     * Get backup settings for a guild
     * @param guildId Discord guild ID
     * @returns Backup settings or null if not configured
     */
    public async getBackupSettings(guildId: string): Promise<DiscordBackupSettings | null> {
        const [settings] = await db.select()
            .from(discordBackupSettings)
            .where(eq(discordBackupSettings.guildId, guildId))
            .limit(1);

        return settings || null;
    }

    /**
     * Create or update backup settings for a guild
     * @param guildId Discord guild ID
     * @param settings Backup settings to save
     * @returns Success status
     */
    public async saveBackupSettings(
        guildId: string,
        settings: Partial<InsertDiscordBackupSettings>
    ): Promise<boolean> {
        try {
            const existingSettings = await this.getBackupSettings(guildId);

            if (existingSettings) {
                await db.update(discordBackupSettings)
                    .set({ ...settings, updatedAt: new Date() })
                    .where(eq(discordBackupSettings.guildId, guildId));
            } else {
                await db.insert(discordBackupSettings)
                    .values({ guildId, ...settings } as InsertDiscordBackupSettings);
            }

            return true;
        } catch (error: any) {
            console.error('Error saving backup settings:', error);
            return false;
        }
    }

    /**
     * Get all backups for a guild
     * @param guildId Discord guild ID
     * @param limit Maximum number of backups to return
     * @returns Array of backup records
     */
    public async getGuildBackups(
        guildId: string,
        limit: number = 10
    ): Promise<DiscordServerBackup[]> {
        return await db.select()
            .from(discordServerBackups)
            .where(eq(discordServerBackups.guildId, guildId))
            .orderBy(desc(discordServerBackups.createdAt))
            .limit(limit);
    }

    /**
     * Delete a backup and all associated data
     * @param backupId Backup ID to delete
     * @param guildId Guild ID for verification
     * @returns Success status
     */
    public async deleteBackup(backupId: number, guildId: string): Promise<boolean> {
        try {
            const [backup] = await db.select()
                .from(discordServerBackups)
                .where(and(
                    eq(discordServerBackups.id, backupId),
                    eq(discordServerBackups.guildId, guildId)
                ))
                .limit(1);

            if (!backup) {
                return false;
            }

            // Delete backup (cascade will handle related records)
            await db.delete(discordServerBackups)
                .where(eq(discordServerBackups.id, backupId));

            console.log(`Deleted backup ${backupId} for guild ${guildId}`);
            return true;
        } catch (error: any) {
            console.error('Error deleting backup:', error);
            return false;
        }
    }

    /**
     * Check if user has permission to manage backups
     * @param guildId Discord guild ID
     * @param userId Discord user ID
     * @returns True if user has permission
     */
    public async hasBackupPermission(guildId: string, userId: string): Promise<boolean> {
        const client = discordBotCore.getClient();
        if (!client) return false;

        try {
            const guild = await client.guilds.fetch(guildId);
            const member = await guild.members.fetch(userId);

            // Check if user has administrator permission
            if (member.permissions.has(PermissionFlagsBits.Administrator)) {
                return true;
            }

            // Check backup settings for allowed roles
            const settings = await this.getBackupSettings(guildId);
            if (settings?.allowedRoles) {
                const allowedRoles = settings.allowedRoles as string[];
                return member.roles.cache.some(role => allowedRoles.includes(role.id));
            }

            return false;
        } catch (error: any) {
            console.error('Error checking backup permission:', error);
            return false;
        }
    }

    /**
     * Utility function to add delay for rate limiting
     * @param ms Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clean up old backups based on settings
     * @param guildId Discord guild ID
     */
    public async cleanupOldBackups(guildId: string): Promise<void> {
        try {
            const settings = await this.getBackupSettings(guildId);
            if (!settings?.maxBackupCount) return;

            const backups = await this.getGuildBackups(guildId, 1000);
            if (backups.length <= settings.maxBackupCount) return;

            // Delete oldest backups beyond the limit
            const backupsToDelete = backups.slice(settings.maxBackupCount);
            for (const backup of backupsToDelete) {
                await this.deleteBackup(backup.id, guildId);
            }

            console.log(`Cleaned up ${backupsToDelete.length} old backups for guild ${guildId}`);
        } catch (error: any) {
            console.error('Error cleaning up old backups:', error);
        }
    }

    /**
     * Get backup commands for Discord slash command registration
     * @returns Array of backup commands
     */
    public getBackupCommands() {
        return discordBackupCommands.getBackupCommands();
    }
}

export const discordBackupService = DiscordBackupService.getInstance();