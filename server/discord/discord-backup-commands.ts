/**
 * @fileoverview Discord Backup Commands Handler
 * @author SkyPANEL Development Team
 * @created 2025-01-21
 * @modified 2025-01-21
 * @version 1.0.0
 */

import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    PermissionFlagsBits,
    ComponentType,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder
} from 'discord.js';
import { discordBackupService } from './discord-backup-service';
import { discordBackupScheduler } from './discord-backup-scheduler';
import { DiscordEmbedUtils } from './discord-embed-utils';

/**
 * Handler for Discord backup-related commands
 */
export class DiscordBackupCommands {
    private static instance: DiscordBackupCommands;

    private constructor() {}

    /**
     * Get the singleton instance of DiscordBackupCommands
     * @returns The DiscordBackupCommands instance
     */
    public static getInstance(): DiscordBackupCommands {
        if (!DiscordBackupCommands.instance) {
            DiscordBackupCommands.instance = new DiscordBackupCommands();
        }
        return DiscordBackupCommands.instance;
    }

    /**
     * Handle backup command interactions
     * @param interaction The command interaction
     */
    public async handleBackupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const subcommand = interaction.options.getSubcommand();
            const guildId = interaction.guildId;

            if (!guildId) {
                await interaction.reply({
                    content: '❌ This command can only be used in a server.',
                    ephemeral: true
                });
                return;
            }

            // Check permissions
            const hasPermission = await discordBackupService.hasBackupPermission(
                guildId,
                interaction.user.id
            );

            if (!hasPermission) {
                await interaction.reply({
                    content: '❌ You do not have permission to manage server backups.',
                    ephemeral: true
                });
                return;
            }

            switch (subcommand) {
                case 'create':
                    await this.handleCreateBackup(interaction);
                    break;
                case 'list':
                    await this.handleListBackups(interaction);
                    break;
                case 'delete':
                    await this.handleDeleteBackup(interaction);
                    break;
                case 'settings':
                    await this.handleBackupSettings(interaction);
                    break;
                case 'info':
                    await this.handleBackupInfo(interaction);
                    break;
                case 'schedule':
                    await this.handleScheduleBackup(interaction);
                    break;
                case 'unschedule':
                    await this.handleUnscheduleBackup(interaction);
                    break;
                case 'schedules':
                    await this.handleListSchedules(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown backup command.',
                        ephemeral: true
                    });
            }
        } catch (error: any) {
            console.error('Error handling backup command:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing the backup command.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle create backup command
     * @param interaction The command interaction
     */
    private async handleCreateBackup(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const backupName = interaction.options.getString('name') || `Backup ${new Date().toISOString().split('T')[0]}`;
        const includeMessages = interaction.options.getBoolean('include-messages') ?? true;

        // Check if backup system is enabled
        const settings = await discordBackupService.getBackupSettings(guildId);
        if (!settings?.isEnabled) {
            await interaction.reply({
                content: '❌ Backup system is not enabled for this server. Use `/backup settings` to configure it first.',
                ephemeral: true
            });
            return;
        }

        await interaction.deferReply();

        try {
            // Update settings if include-messages was specified
            if (includeMessages !== settings.includeMessages) {
                await discordBackupService.saveBackupSettings(guildId, {
                    includeMessages
                });
            }

            const result = await discordBackupService.createServerBackup(
                guildId,
                backupName,
                interaction.user.id,
                'manual'
            );

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Backup Created Successfully')
                    .setDescription(`Server backup "${backupName}" has been created.`)
                    .addFields(
                        { name: 'Backup ID', value: result.backupId!.toString(), inline: true },
                        { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Type', value: 'Manual', inline: true }
                    )
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Backup Failed')
                    .setDescription(`Failed to create backup: ${result.error}`)
                    .setColor(0xff0000)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            }
        } catch (error: any) {
            console.error('Error creating backup:', error);
            const embed = new EmbedBuilder()
                .setTitle('❌ Backup Error')
                .setDescription('An unexpected error occurred while creating the backup.')
                .setColor(0xff0000)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }

    /**
     * Handle list backups command
     * @param interaction The command interaction
     */
    private async handleListBackups(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const page = Math.max(1, interaction.options.getInteger('page') || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        try {
            const backups = await discordBackupService.getGuildBackups(guildId, limit + offset);
            const pageBackups = backups.slice(offset, offset + limit);

            if (pageBackups.length === 0) {
                await interaction.reply({
                    content: page === 1 ? '📋 No backups found for this server.' : '📋 No more backups found.',
                    ephemeral: true
                });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📋 Server Backups')
                .setDescription(`Showing page ${page} of server backups`)
                .setColor(0x0099ff)
                .setTimestamp();

            for (const backup of pageBackups) {
                const statusEmoji = {
                    'completed': '✅',
                    'in_progress': '⏳',
                    'failed': '❌'
                }[backup.status] || '❓';

                const createdAt = new Date(backup.createdAt).toLocaleString();
                const completedAt = backup.completedAt ? new Date(backup.completedAt).toLocaleString() : 'N/A';

                embed.addFields({
                    name: `${statusEmoji} ${backup.backupName}`,
                    value: [
                        `**ID:** ${backup.id}`,
                        `**Status:** ${backup.status}`,
                        `**Type:** ${backup.backupType}`,
                        `**Created:** ${createdAt}`,
                        `**Completed:** ${completedAt}`,
                        `**Roles:** ${backup.roleCount || 0} | **Channels:** ${backup.channelCount || 0} | **Messages:** ${backup.messageCount || 0}`
                    ].join('\n'),
                    inline: false
                });
            }

            // Add navigation buttons if there are more pages
            const components = [];
            if (backups.length > limit) {
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`backup_list_${Math.max(1, page - 1)}`)
                            .setLabel('Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(page === 1),
                        new ButtonBuilder()
                            .setCustomId(`backup_list_${page + 1}`)
                            .setLabel('Next')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(backups.length <= offset + limit)
                    );
                components.push(row);
            }

            await interaction.reply({
                embeds: [embed],
                components,
                ephemeral: true
            });
        } catch (error: any) {
            console.error('Error listing backups:', error);
            await interaction.reply({
                content: '❌ An error occurred while retrieving backups.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle delete backup command
     * @param interaction The command interaction
     */
    private async handleDeleteBackup(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const backupId = interaction.options.getInteger('backup-id', true);

        try {
            const backups = await discordBackupService.getGuildBackups(guildId, 100);
            const backup = backups.find(b => b.id === backupId);

            if (!backup) {
                await interaction.reply({
                    content: '❌ Backup not found or you do not have permission to delete it.',
                    ephemeral: true
                });
                return;
            }

            // Confirmation embed
            const embed = new EmbedBuilder()
                .setTitle('⚠️ Confirm Backup Deletion')
                .setDescription(`Are you sure you want to delete the backup "${backup.backupName}"?`)
                .addFields(
                    { name: 'Backup ID', value: backup.id.toString(), inline: true },
                    { name: 'Created', value: new Date(backup.createdAt).toLocaleString(), inline: true },
                    { name: 'Status', value: backup.status, inline: true }
                )
                .setColor(0xff9900)
                .setFooter({ text: 'This action cannot be undone!' });

            const confirmButton = new ButtonBuilder()
                .setCustomId(`backup_delete_confirm_${backupId}`)
                .setLabel('Delete Backup')
                .setStyle(ButtonStyle.Danger);

            const cancelButton = new ButtonBuilder()
                .setCustomId('backup_delete_cancel')
                .setLabel('Cancel')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(confirmButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });
        } catch (error: any) {
            console.error('Error preparing backup deletion:', error);
            await interaction.reply({
                content: '❌ An error occurred while preparing backup deletion.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle backup settings command
     * @param interaction The command interaction
     */
    private async handleBackupSettings(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const action = interaction.options.getString('action');

        try {
            const currentSettings = await discordBackupService.getBackupSettings(guildId);

            if (action === 'view' || !action) {
                // Show current settings
                const embed = new EmbedBuilder()
                    .setTitle('⚙️ Backup Settings')
                    .setColor(0x0099ff)
                    .setTimestamp();

                if (currentSettings) {
                    embed.addFields(
                        { name: 'Status', value: currentSettings.isEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Include Messages', value: currentSettings.includeMessages ? '✅ Yes' : '❌ No', inline: true },
                        { name: 'Message History Days', value: (currentSettings.messageHistoryDays || 30).toString(), inline: true },
                        { name: 'Max Backup Count', value: (currentSettings.maxBackupCount || 10).toString(), inline: true },
                        { name: 'Auto Backup Enabled', value: currentSettings.autoBackupEnabled ? '✅ Yes' : '❌ No', inline: true },
                        { name: 'Auto Backup Interval', value: `${currentSettings.autoBackupInterval || 24} hours`, inline: true }
                    );
                } else {
                    embed.setDescription('❌ Backup system is not configured for this server.');
                }

                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else if (action === 'enable') {
                await discordBackupService.saveBackupSettings(guildId, {
                    isEnabled: true,
                    includeMessages: true,
                    messageHistoryDays: 30,
                    maxBackupCount: 10,
                    autoBackupEnabled: false,
                    autoBackupInterval: 24
                });

                await interaction.reply({
                    content: '✅ Backup system has been enabled with default settings.',
                    ephemeral: true
                });
            } else if (action === 'disable') {
                await discordBackupService.saveBackupSettings(guildId, {
                    isEnabled: false
                });

                await interaction.reply({
                    content: '❌ Backup system has been disabled.',
                    ephemeral: true
                });
            }
        } catch (error: any) {
            console.error('Error handling backup settings:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing backup settings.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle backup info command
     * @param interaction The command interaction
     */
    private async handleBackupInfo(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const backupId = interaction.options.getInteger('backup-id', true);

        try {
            const backups = await discordBackupService.getGuildBackups(guildId, 100);
            const backup = backups.find(b => b.id === backupId);

            if (!backup) {
                await interaction.reply({
                    content: '❌ Backup not found.',
                    ephemeral: true
                });
                return;
            }

            const statusEmoji = {
                'completed': '✅',
                'in_progress': '⏳',
                'failed': '❌'
            }[backup.status] || '❓';

            const embed = new EmbedBuilder()
                .setTitle(`${statusEmoji} Backup Information`)
                .setDescription(`Details for backup "${backup.backupName}"`)
                .addFields(
                    { name: 'Backup ID', value: backup.id.toString(), inline: true },
                    { name: 'Status', value: backup.status, inline: true },
                    { name: 'Type', value: backup.backupType, inline: true },
                    { name: 'Guild Name', value: backup.guildName, inline: true },
                    { name: 'Member Count', value: backup.memberCount?.toString() || 'N/A', inline: true },
                    { name: 'Created By', value: `<@${backup.createdBy}>`, inline: true },
                    { name: 'Created At', value: new Date(backup.createdAt).toLocaleString(), inline: true },
                    { name: 'Completed At', value: backup.completedAt ? new Date(backup.completedAt).toLocaleString() : 'N/A', inline: true },
                    { name: 'File Size', value: backup.backupSize ? `${(backup.backupSize / 1024 / 1024).toFixed(2)} MB` : 'N/A', inline: true }
                )
                .setColor(backup.status === 'completed' ? 0x00ff00 : backup.status === 'failed' ? 0xff0000 : 0xffaa00)
                .setTimestamp();

            if (backup.status === 'completed') {
                embed.addFields(
                    { name: 'Roles Backed Up', value: (backup.roleCount || 0).toString(), inline: true },
                    { name: 'Channels Backed Up', value: (backup.channelCount || 0).toString(), inline: true },
                    { name: 'Messages Backed Up', value: (backup.messageCount || 0).toString(), inline: true }
                );
            }

            if (backup.status === 'failed' && backup.errorLog) {
                embed.addFields({
                    name: 'Error Details',
                    value: backup.errorLog.substring(0, 1000) + (backup.errorLog.length > 1000 ? '...' : ''),
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (error: any) {
            console.error('Error getting backup info:', error);
            await interaction.reply({
                content: '❌ An error occurred while retrieving backup information.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle schedule backup command
     * @param interaction The command interaction
     */
    private async handleScheduleBackup(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const cronExpression = interaction.options.getString('cron', true);
        const backupName = interaction.options.getString('name') || 'Scheduled-Backup';
        const includeMessages = interaction.options.getBoolean('include-messages') ?? false;

        await interaction.deferReply();

        try {
            const result = await discordBackupScheduler.scheduleBackupJob(
                guildId,
                cronExpression,
                backupName,
                interaction.user.id,
                includeMessages
            );

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Backup Scheduled Successfully')
                    .setDescription(`Backup job has been scheduled with ID: ${result.jobId}`)
                    .addFields(
                        { name: 'Schedule', value: `\`${cronExpression}\``, inline: true },
                        { name: 'Backup Name', value: backupName, inline: true },
                        { name: 'Include Messages', value: includeMessages ? 'Yes' : 'No', inline: true },
                        { name: 'Created By', value: `<@${interaction.user.id}>`, inline: true }
                    )
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    content: `❌ Failed to schedule backup: ${result.error}`
                });
            }
        } catch (error: any) {
            console.error('Error scheduling backup:', error);
            await interaction.editReply({
                content: '❌ An error occurred while scheduling the backup.'
            });
        }
    }

    /**
     * Handle unschedule backup command
     * @param interaction The command interaction
     */
    private async handleUnscheduleBackup(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;
        const jobId = interaction.options.getInteger('job-id', true);

        await interaction.deferReply();

        try {
            const success = await discordBackupScheduler.cancelBackupJob(jobId, guildId);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Backup Unscheduled Successfully')
                    .setDescription(`Scheduled backup job ${jobId} has been cancelled.`)
                    .setColor(0x00ff00)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                await interaction.editReply({
                    content: '❌ Failed to cancel scheduled backup. Job may not exist or already be cancelled.'
                });
            }
        } catch (error: any) {
            console.error('Error unscheduling backup:', error);
            await interaction.editReply({
                content: '❌ An error occurred while cancelling the scheduled backup.'
            });
        }
    }

    /**
     * Handle list schedules command
     * @param interaction The command interaction
     */
    private async handleListSchedules(interaction: ChatInputCommandInteraction): Promise<void> {
        const guildId = interaction.guildId!;

        await interaction.deferReply();

        try {
            const jobs = await discordBackupScheduler.getScheduledJobs(guildId);

            if (jobs.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('📅 Scheduled Backups')
                    .setDescription('No scheduled backups found for this server.')
                    .setColor(0x0099ff)
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('📅 Scheduled Backups')
                .setDescription(`Found ${jobs.length} scheduled backup job(s)`)
                .setColor(0x0099ff)
                .setTimestamp();

            for (const job of jobs.slice(0, 10)) { // Limit to 10 jobs to avoid embed limits
                const nextRun = job.nextRun ? `<t:${Math.floor(job.nextRun.getTime() / 1000)}:R>` : 'Unknown';
                const lastRun = job.lastRun ? `<t:${Math.floor(job.lastRun.getTime() / 1000)}:R>` : 'Never';
                
                embed.addFields({
                    name: `Job ${job.id}: ${job.backupName}`,
                    value: `**Schedule:** \`${job.cronExpression}\`\n**Next Run:** ${nextRun}\n**Last Run:** ${lastRun}\n**Messages:** ${job.includeMessages ? 'Yes' : 'No'}`,
                    inline: false
                });
            }

            if (jobs.length > 10) {
                embed.setFooter({ text: `Showing first 10 of ${jobs.length} scheduled jobs` });
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
            console.error('Error listing scheduled backups:', error);
            await interaction.editReply({
                content: '❌ An error occurred while retrieving scheduled backups.'
            });
        }
    }

    /**
     * Get backup commands for registration
     * @returns Array of backup commands
     */
    public getBackupCommands(): any[] {
        return [
            new SlashCommandBuilder()
                .setName('backup')
                .setDescription('Manage server backups')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('create')
                        .setDescription('Create a new server backup')
                        .addStringOption(option =>
                            option
                                .setName('name')
                                .setDescription('Name for the backup')
                                .setRequired(false)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('include-messages')
                                .setDescription('Include message history in backup')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all server backups')
                        .addIntegerOption(option =>
                            option
                                .setName('page')
                                .setDescription('Page number to view')
                                .setMinValue(1)
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a server backup')
                        .addIntegerOption(option =>
                            option
                                .setName('backup-id')
                                .setDescription('ID of the backup to delete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('Get detailed information about a backup')
                        .addIntegerOption(option =>
                            option
                                .setName('backup-id')
                                .setDescription('ID of the backup to view')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('settings')
                        .setDescription('Manage backup settings')
                        .addStringOption(option =>
                            option
                                .setName('action')
                                .setDescription('Action to perform')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'View Settings', value: 'view' },
                                    { name: 'Enable Backups', value: 'enable' },
                                    { name: 'Disable Backups', value: 'disable' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('schedule')
                        .setDescription('Schedule automatic backups')
                        .addStringOption(option =>
                            option
                                .setName('cron')
                                .setDescription('Cron expression (e.g., "0 2 * * *" for daily at 2 AM)')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('name')
                                .setDescription('Name template for scheduled backups')
                                .setRequired(false)
                        )
                        .addBooleanOption(option =>
                            option
                                .setName('include-messages')
                                .setDescription('Include message history in scheduled backups')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('unschedule')
                        .setDescription('Cancel a scheduled backup job')
                        .addIntegerOption(option =>
                            option
                                .setName('job-id')
                                .setDescription('ID of the scheduled job to cancel')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('schedules')
                        .setDescription('List all scheduled backup jobs')
                )
        ];
    }
}

export const discordBackupCommands = DiscordBackupCommands.getInstance();