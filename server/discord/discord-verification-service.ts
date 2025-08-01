import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    TextChannel,
    GuildMember,
    PermissionFlagsBits,
    BaseGuildTextChannel,
    Events
} from 'discord.js';
import { storage } from '../storage';
import { discordBotCore } from './discord-bot-core';

/**
 * Service for handling Discord verification operations
 */
export class DiscordVerificationService {
    private static instance: DiscordVerificationService;

    private constructor() { }

    /**
     * Get the singleton instance of DiscordVerificationService
     * @returns The DiscordVerificationService instance
     */
    public static getInstance(): DiscordVerificationService {
        if (!DiscordVerificationService.instance) {
            DiscordVerificationService.instance = new DiscordVerificationService();
        }
        return DiscordVerificationService.instance;
    }

    /**
     * Get verification commands for registration
     * @returns The verification commands
     */
    public getVerificationCommands(): any[] {
        return [
            new SlashCommandBuilder()
                .setName('verify-setup')
                .setDescription('Setup Discord verification system (admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
                .addRoleOption(option =>
                    option
                        .setName('verified_role')
                        .setDescription('Role to assign upon verification')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('unverified_role')
                        .setDescription('Role to assign to new users (auto-assigned)')
                        .setRequired(true)
                )
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel to post verification message')
                        .setRequired(false)
                )
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable/disable verification system')
                        .setRequired(false)
                ),
            new SlashCommandBuilder()
                .setName('verify-reset')
                .setDescription('Reset verification settings (admin only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        ];
    }

    /**
     * Handle verification setup command
     * @param interaction The command interaction
     */
    public async handleVerifySetupCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Check if user has admin permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
                return;
            }

            // Get command options
            const verifiedRole = interaction.options.getRole('verified_role', true);
            const unverifiedRole = interaction.options.getRole('unverified_role', true);
            const channel = interaction.options.getChannel('channel', false);
            const enabled = interaction.options.getBoolean('enabled', false) ?? true;

            // Get guild ID
            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.reply({
                    content: 'This command can only be used in a server.',
                    ephemeral: true
                });
                return;
            }

            // Save verification settings
            const settings = {
                guildId,
                verifiedRoleId: verifiedRole.id,
                unverifiedRoleId: unverifiedRole.id,
                channelId: channel?.id ?? null,
                isEnabled: enabled
            };

            await storage.saveDiscordVerificationSettings(settings);

            // Create verification message
            const targetChannel = channel ?? interaction.channel;
            if (!targetChannel || !(targetChannel instanceof BaseGuildTextChannel)) {
                await interaction.reply({
                    content: 'Invalid channel for verification message.',
                    ephemeral: true
                });
                return;
            }

            // Create verification embed
            const embed = new EmbedBuilder()
                .setTitle('✅ Discord Verification')
                .setDescription('Click the button below to verify your account and gain access to the server.')
                .setColor(0x00ff00)
                .setTimestamp();

            // Create verification button
            const button = new ButtonBuilder()
                .setCustomId('verify_user')
                .setLabel('Verify Account')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

            // Send verification message
            const message = await targetChannel.send({
                embeds: [embed],
                components: [row]
            });

            // Update settings with message ID
            await storage.updateDiscordVerificationMessageId(guildId, message.id);

            // Reply to command
            await interaction.reply({
                content: `Verification system configured successfully! ${enabled ? 'Enabled' : 'Disabled'}.\n\n**Roles:**\n• Verified: ${verifiedRole.name}\n• Unverified: ${unverifiedRole.name}\n\nNew users will automatically receive the unverified role and need to verify to access the server.`,
                ephemeral: true
            });

        } catch (error: any) {
            console.error('Error handling verify setup command:', error.message);
            await interaction.reply({
                content: 'An error occurred while setting up verification.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle verification reset command
     * @param interaction The command interaction
     */
    public async handleVerifyResetCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Check if user has admin permissions
            if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
                await interaction.reply({
                    content: 'You do not have permission to use this command.',
                    ephemeral: true
                });
                return;
            }

            // Get guild ID
            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.reply({
                    content: 'This command can only be used in a server.',
                    ephemeral: true
                });
                return;
            }

            // Reset verification settings
            await storage.resetDiscordVerificationSettings(guildId);

            await interaction.reply({
                content: 'Verification settings have been reset.',
                ephemeral: true
            });
        } catch (error: any) {
            console.error('Error handling verify reset command:', error.message);
            await interaction.reply({
                content: 'An error occurred while resetting verification settings.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle new member join event
     * @param member The guild member that joined
     */
    public async handleNewMemberJoin(member: GuildMember): Promise<void> {
        try {
            const guildId = member.guild.id;
            
            // Get verification settings
            const settings = await storage.getDiscordVerificationSettings(guildId);
            if (!settings || !settings.isEnabled) {
                console.log(`Verification not enabled for guild ${guildId}`);
                return;
            }

            // Check if user is already verified
            const isAlreadyVerified = await storage.isDiscordUserVerified(member.user.id, guildId);
            if (isAlreadyVerified) {
                console.log(`User ${member.user.username} is already verified, skipping unverified role assignment`);
                return;
            }

            // Assign unverified role
            try {
                const unverifiedRole = await member.guild.roles.fetch(settings.unverifiedRoleId);
                if (!unverifiedRole) {
                    console.error(`Unverified role not found for guild ${guildId}`);
                    return;
                }

                await member.roles.add(unverifiedRole);
                console.log(`Assigned unverified role to ${member.user.username} in guild ${guildId}`);
            } catch (roleError: any) {
                console.error('Error assigning unverified role:', roleError.message);
            }

        } catch (error: any) {
            console.error('Error handling new member join:', error.message);
        }
    }

    /**
     * Handle verification button interaction
     * @param interaction The button interaction
     */
    public async handleVerificationButton(interaction: any): Promise<void> {
        try {
            // Defer the interaction
            await interaction.deferReply({ ephemeral: true });

            // Get guild ID
            const guildId = interaction.guildId;
            if (!guildId) {
                await interaction.editReply({
                    content: 'Verification can only be done in a server.'
                });
                return;
            }

            // Get user
            const user = interaction.user;
            if (!user) {
                await interaction.editReply({
                    content: 'Could not identify user.'
                });
                return;
            }

            // Check if user is already verified
            const isAlreadyVerified = await storage.isDiscordUserVerified(user.id, guildId);
            if (isAlreadyVerified) {
                await interaction.editReply({
                    content: 'You are already verified!'
                });
                return;
            }

            // Get verification settings
            const settings = await storage.getDiscordVerificationSettings(guildId);
            if (!settings || !settings.isEnabled) {
                await interaction.editReply({
                    content: 'Verification is not enabled on this server.'
                });
                return;
            }

            // Get guild member
            const member = interaction.member as GuildMember;
            if (!member) {
                await interaction.editReply({
                    content: 'Could not find your membership in this server.'
                });
                return;
            }

            // Remove unverified role and assign verified role
            try {
                // Remove unverified role if it exists
                if (settings.unverifiedRoleId) {
                    const unverifiedRole = await interaction.guild?.roles.fetch(settings.unverifiedRoleId);
                    if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                        await member.roles.remove(unverifiedRole);
                    }
                }

                // Assign verified role
                const verifiedRole = await interaction.guild?.roles.fetch(settings.verifiedRoleId);
                if (!verifiedRole) {
                    await interaction.editReply({
                        content: 'Verification role not found. Please contact an administrator.'
                    });
                    return;
                }

                await member.roles.add(verifiedRole);
            } catch (roleError: any) {
                console.error('Error managing roles:', roleError.message);
                await interaction.editReply({
                    content: 'Failed to assign verification role. Please contact an administrator.'
                });
                return;
            }

            // Save verified user
            await storage.saveDiscordVerifiedUser({
                discordUserId: user.id,
                discordUsername: user.username,
                guildId
            });

            // Send success message
            await interaction.editReply({
                content: '✅ You have been successfully verified! You now have access to all channels.'
            });

        } catch (error: any) {
            console.error('Error handling verification button:', error.message);
            try {
                await interaction.editReply({
                    content: 'An error occurred during verification. Please try again.'
                });
            } catch (editError) {
                console.error('Failed to edit reply:', editError);
            }
        }
    }

}

// Export the singleton instance
export const discordVerificationService = DiscordVerificationService.getInstance();
