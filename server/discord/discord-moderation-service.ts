import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    GuildMember,
    PermissionFlagsBits,
    User,
    TextChannel,
    ColorResolvable,
    ChannelType
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';
import {DiscordEmbedUtils} from './discord-embed-utils';

/**
 * Service for handling Discord moderation commands
 */
export class DiscordModerationService {
    private static instance: DiscordModerationService;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordModerationService
     * @returns The DiscordModerationService instance
     */
    public static getInstance(): DiscordModerationService {
        if (!DiscordModerationService.instance) {
            DiscordModerationService.instance = new DiscordModerationService();
        }
        return DiscordModerationService.instance;
    }

    /**
     * Check if a command is a moderation command
     * @param commandName The command name
     * @returns True if the command is a moderation command
     */
    public isModerationCommand(commandName: string): boolean {
        const moderationCommands = [
            'kick', 'ban', 'unban', 'timeout', 'untimeout', 'clear', 'warn',
            'userinfo', 'serverinfo', 'embeder'
        ];
        return moderationCommands.includes(commandName);
    }

    /**
     * Handle a moderation command
     * @param interaction The command interaction
     */
    public async handleModerationCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const commandName = interaction.commandName;

            // Check if the user has the required permissions
            const member = interaction.member as GuildMember;
            if (!member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
                await interaction.reply({
                    content: 'You do not have permission to use moderation commands.',
                    ephemeral: true
                });
                return;
            }

            // Handle the appropriate command
            switch (commandName) {
                case 'kick':
                    await this.handleKickCommand(interaction);
                    break;
                case 'ban':
                    await this.handleBanCommand(interaction);
                    break;
                case 'unban':
                    await this.handleUnbanCommand(interaction);
                    break;
                case 'timeout':
                    await this.handleTimeoutCommand(interaction);
                    break;
                case 'untimeout':
                    await this.handleUntimeoutCommand(interaction);
                    break;
                case 'clear':
                    await this.handleClearCommand(interaction);
                    break;
                case 'warn':
                    await this.handleWarnCommand(interaction);
                    break;
                case 'userinfo':
                    await this.handleUserInfoCommand(interaction);
                    break;
                case 'serverinfo':
                    await this.handleServerInfoCommand(interaction);
                    break;
                case 'embeder':
                    await this.handleEmbederCommand(interaction);
                    break;
                default:
                    await interaction.reply({
                        content: `Unknown moderation command: ${commandName}`,
                        ephemeral: true
                    });
            }
        } catch (error: any) {
            console.error('Error handling moderation command:', error.message);

            // Reply with an error message if the interaction hasn't been replied to yet
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: 'An error occurred while processing this command.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Handle the kick command
     * @param interaction The command interaction
     */
    private async handleKickCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to kick
        const user = interaction.options.getUser('user');
        if (!user) {
            await interaction.reply({
                content: 'You must specify a user to kick.',
                ephemeral: true
            });
            return;
        }

        // Get the reason for the kick
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Get the guild member
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                await interaction.reply({
                    content: 'User not found in this server.',
                    ephemeral: true
                });
                return;
            }

            // Check if the bot can kick the user
            if (!member.kickable) {
                await interaction.reply({
                    content: 'I do not have permission to kick this user.',
                    ephemeral: true
                });
                return;
            }

            // Kick the user
            await member.kick(reason);

            // Reply with success message
            const embed = DiscordEmbedUtils.createModerationEmbed('Kick', user, interaction.user, reason);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error kicking user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Kick Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the ban command
     * @param interaction The command interaction
     */
    private async handleBanCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to ban
        const user = interaction.options.getUser('user');
        if (!user) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid User', 'You must specify a user to ban.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Get the reason for the ban
        const reason = interaction.options.getString('reason') || 'No reason provided';

        // Get the number of days of messages to delete
        const deleteMessageDays = interaction.options.getInteger('delete-days') || 0;

        try {
            // Ban the user
            await interaction.guild?.members.ban(user, {
                reason,
                deleteMessageDays
            });

            // Reply with success message
            const durationDesc = deleteMessageDays ? `${deleteMessageDays} days` : undefined;
            const embed = DiscordEmbedUtils.createModerationEmbed('Ban', user, interaction.user, reason, durationDesc);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error banning user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Ban Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the unban command
     * @param interaction The command interaction
     */
    private async handleUnbanCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user ID to unban
        const userId = interaction.options.getString('user-id');
        if (!userId) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid User ID', 'You must specify a user ID to unban.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        try {
            // Unban the user
            await interaction.guild?.members.unban(userId);

            // Reply with success message
            const embed = DiscordEmbedUtils.createSuccessEmbed('User Unbanned', `Successfully unbanned user with ID ${userId}`);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error unbanning user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Unban Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the timeout command
     * @param interaction The command interaction
     */
    private async handleTimeoutCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to timeout
        const user = interaction.options.getUser('user');
        if (!user) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid User', 'You must specify a user to timeout.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Get the duration of the timeout in minutes
        const durationMinutes = interaction.options.getInteger('duration') || 60;

        // Get the reason for the timeout
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Get the guild member
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('User Not Found', 'User not found in this server.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Check if the bot can timeout the user
            if (!member.moderatable) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('No Permission', 'I do not have permission to timeout this user.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Calculate the timeout duration in milliseconds
            const timeoutDuration = durationMinutes * 60 * 1000;

            // Timeout the user
            await member.timeout(timeoutDuration, reason);

            // Reply with success message
            const duration = `${durationMinutes} minutes`;
            const embed = DiscordEmbedUtils.createModerationEmbed('Timeout', user, interaction.user, reason, duration);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error timing out user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Timeout Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the untimeout command
     * @param interaction The command interaction
     */
    private async handleUntimeoutCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to remove timeout from
        const user = interaction.options.getUser('user');
        if (!user) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid User', 'You must specify a user to remove timeout from.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        try {
            // Get the guild member
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('User Not Found', 'User not found in this server.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Check if the bot can modify the user
            if (!member.moderatable) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('No Permission', 'I do not have permission to remove timeout from this user.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Remove the timeout
            await member.timeout(null);

            // Reply with success message
            const embed = DiscordEmbedUtils.createModerationEmbed('Remove Timeout', user, interaction.user);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error removing timeout from user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Remove Timeout Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the clear command
     * @param interaction The command interaction
     */
    private async handleClearCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the number of messages to delete
        const amount = interaction.options.getInteger('amount');
        if (!amount || amount < 1 || amount > 100) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid Amount', 'You must specify a number between 1 and 100.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Get the user to filter messages by (optional)
        const user = interaction.options.getUser('user');

        try {
            // Defer the reply as this might take some time
            await interaction.deferReply({ ephemeral: true });

            // Get the channel
            const channel = interaction.channel;
            if (!channel || channel.type !== ChannelType.GuildText) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid Channel', 'You must run this command in a text channel.');
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }
            const textChannel = channel as TextChannel;

            // Fetch messages
            const messages = await textChannel.messages.fetch({ limit: 100 });

            // Filter messages if a user is specified
            let messagesToDelete = Array.from(messages.values());
            if (user) {
                messagesToDelete = messagesToDelete.filter(msg => msg.author.id === user.id);
            }

            // Limit to the requested amount
            messagesToDelete = messagesToDelete.slice(0, amount);

            // Check if there are any messages to delete
            if (messagesToDelete.length === 0) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('No Messages Found', 'No messages found to delete.');
                await interaction.editReply({ embeds: [errorEmbed] });
                return;
            }

            // Delete the messages
            if (messagesToDelete.length === 1) {
                // Delete a single message
                await messagesToDelete[0].delete();
            } else {
                // Bulk delete messages (only works for messages less than 14 days old)
                const bulkDeleteMessages = messagesToDelete.filter(msg => {
                    const messageAge = Date.now() - msg.createdTimestamp;
                    return messageAge < 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
                });

                if (bulkDeleteMessages.length > 0) {
                    await textChannel.bulkDelete(bulkDeleteMessages);
                }

                // Delete older messages individually
                const olderMessages = messagesToDelete.filter(msg => {
                    const messageAge = Date.now() - msg.createdTimestamp;
                    return messageAge >= 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
                });

                for (const msg of olderMessages) {
                    try {
                        await msg.delete();
                    } catch (error) {
                        console.error('Error deleting older message:', error);
                    }
                }
            }

            // Reply with success message
            const embed = DiscordEmbedUtils.createSuccessEmbed('Messages Deleted', `Successfully deleted ${messagesToDelete.length} messages.`);
            await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
            console.error('Error clearing messages:', error.message);
            if (interaction.deferred) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Clear Failed', error.message);
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Clear Failed', error.message);
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }

    /**
     * Handle the warn command
     * @param interaction The command interaction
     */
    private async handleWarnCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to warn
        const user = interaction.options.getUser('user');
        if (!user) {
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid User', 'You must specify a user to warn.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Get the reason for the warning
        const reason = interaction.options.getString('reason') || 'No reason provided';

        try {
            // Get the guild member
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('User Not Found', 'User not found in this server.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Send a warning message to the user
            try {
                await user.send(`You have been warned in ${interaction.guild?.name} for: ${reason}`);
            } catch (dmError) {
                console.error('Could not send DM to user:', dmError);
            }

            // Reply with success message
            const embed = DiscordEmbedUtils.createModerationEmbed('Warn', user, interaction.user, reason);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error warning user:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Warn Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the userinfo command
     * @param interaction The command interaction
     */
    private async handleUserInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        // Get the user to show info for
        const user = interaction.options.getUser('user') || interaction.user;

        try {
            // Get the guild member
            const member = await interaction.guild?.members.fetch(user.id);
            if (!member) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('User Not Found', 'User not found in this server.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Format the user information
            const roles = member.roles.cache
                .filter(role => role.id !== interaction.guild?.id) // Filter out @everyone role
                .map(role => role.name)
                .join(', ') || 'None';

            const userInfo = [
                `**User Information for ${user.tag}**`,
                `**ID:** ${user.id}`,
                `**Nickname:** ${member.nickname || 'None'}`,
                `**Joined Server:** ${member.joinedAt?.toLocaleString() || 'Unknown'}`,
                `**Account Created:** ${user.createdAt.toLocaleString()}`,
                `**Roles:** ${roles}`
            ].join('\n');

            // Reply with the user information and avatar
            const embed = DiscordEmbedUtils.createInfoEmbed(`User Information for ${user.tag}`, userInfo)
                .setThumbnail(user.displayAvatarURL());
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error getting user info:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Get User Info Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the serverinfo command
     * @param interaction The command interaction
     */
    private async handleServerInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const guild = interaction.guild;
            if (!guild) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Not in a Server', 'This command can only be used in a server.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            // Fetch more guild data
            await guild.fetch();

            // Count members by status
            const totalMembers = guild.memberCount;

            // Count channels by type
            const textChannels = guild.channels.cache.filter(c => c.type === 0).size; // ChannelType.GuildText = 0
            const voiceChannels = guild.channels.cache.filter(c => c.type === 2).size; // ChannelType.GuildVoice = 2
            const categoryChannels = guild.channels.cache.filter(c => c.type === 4).size; // ChannelType.GuildCategory = 4

            // Format the server information
            const serverInfo = [
                `**Server Information for ${guild.name}**`,
                `**ID:** ${guild.id}`,
                `**Owner:** <@${guild.ownerId}>`,
                `**Created:** ${guild.createdAt.toLocaleString()}`,
                `**Members:** ${totalMembers}`,
                `**Channels:** ${guild.channels.cache.size} (${textChannels} text, ${voiceChannels} voice, ${categoryChannels} categories)`,
                `**Roles:** ${guild.roles.cache.size}`,
                `**Boost Level:** ${guild.premiumTier}`
            ].join('\n');

            // Reply with the server information and icon
            const embed = DiscordEmbedUtils.createInfoEmbed(`Server Information for ${guild?.name}`, serverInfo)
                .setThumbnail(guild.iconURL() ?? null);
            await interaction.reply({ embeds: [embed], ephemeral: false });
        } catch (error: any) {
            console.error('Error getting server info:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Server Info Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Handle the embeder command
     * @param interaction The command interaction
     */
    private async handleEmbederCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const channel = interaction.options.getChannel('channel');
        const title = interaction.options.getString('title')!;
        const description = interaction.options.getString('description')!;
        const colorString = interaction.options.getString('color');
        let color: ColorResolvable = DiscordEmbedUtils.COLORS.PRIMARY;
        if (colorString && /^#?[0-9A-Fa-f]{6}$/.test(colorString)) {
            color = parseInt(colorString.replace('#',''), 16) as ColorResolvable;
        }
        try {
            if (!channel || channel.type !== ChannelType.GuildText) {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Invalid Channel', 'Please specify a valid text channel.');
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }
            const textChannel = channel as TextChannel;
            const embed = DiscordEmbedUtils.createBaseEmbed(color)
                .setTitle(title)
                .setDescription(description);
            await textChannel.send({ embeds: [embed] });
            const successEmbed = DiscordEmbedUtils.createSuccessEmbed('Embed Posted', `Embed posted to ${textChannel.toString()}`);
            await interaction.reply({ embeds: [successEmbed], ephemeral: true });
        } catch (error: any) {
            console.error('Error executing embeder command:', error.message);
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed('Embed Failed', error.message);
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    }

    /**
     * Get the moderation commands for registration
     * @returns The moderation commands
     */
    public getModerationCommands(): any[] {
        return [
            new SlashCommandBuilder()
                .setName('kick')
                .setDescription('Kick a user from the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to kick')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for kicking the user')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('ban')
                .setDescription('Ban a user from the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to ban')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for banning the user')
                        .setRequired(false)
                )
                .addIntegerOption(option =>
                    option
                        .setName('delete-days')
                        .setDescription('Number of days of messages to delete (0-7)')
                        .setMinValue(0)
                        .setMaxValue(7)
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('unban')
                .setDescription('Unban a user from the server')
                .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
                .addStringOption(option =>
                    option
                        .setName('user-id')
                        .setDescription('The ID of the user to unban')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('timeout')
                .setDescription('Timeout a user')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to timeout')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('duration')
                        .setDescription('Duration of the timeout in minutes')
                        .setMinValue(1)
                        .setMaxValue(40320) // 28 days in minutes
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the timeout')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('untimeout')
                .setDescription('Remove timeout from a user')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to remove timeout from')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('clear')
                .setDescription('Clear messages from a channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
                .addIntegerOption(option =>
                    option
                        .setName('amount')
                        .setDescription('Number of messages to delete (1-100)')
                        .setMinValue(1)
                        .setMaxValue(100)
                        .setRequired(true)
                )
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('Only delete messages from this user')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('warn')
                .setDescription('Warn a user')
                .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to warn')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('reason')
                        .setDescription('Reason for the warning')
                        .setRequired(true)
                ),

            new SlashCommandBuilder()
                .setName('userinfo')
                .setDescription('Get information about a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to get information about')
                        .setRequired(false)
                ),

            new SlashCommandBuilder()
                .setName('serverinfo')
                .setDescription('Get information about the server'),
            new SlashCommandBuilder()
                .setName('embeder')
                .setDescription('Post a custom embed to a specific channel')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Target channel for the embed')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('title')
                        .setDescription('Title of the embed')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('description')
                        .setDescription('Description of the embed')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('color')
                        .setDescription('Hex color code for the embed (e.g. #FF0000)')
                        .setRequired(false)
                )
        ];
    }
}

// Export the singleton instance
export const discordModerationService = DiscordModerationService.getInstance();