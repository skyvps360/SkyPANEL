import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    StringSelectMenuInteraction
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';
import {discordModerationService} from './discord-moderation-service';


/**
 * Service for handling Discord help commands
 */
export class DiscordHelpService {
    private static instance: DiscordHelpService;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordHelpService
     * @returns The DiscordHelpService instance
     */
    public static getInstance(): DiscordHelpService {
        if (!DiscordHelpService.instance) {
            DiscordHelpService.instance = new DiscordHelpService();
        }
        return DiscordHelpService.instance;
    }

    /**
     * Handle the help command
     * @param interaction The command interaction
     */
    public async handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Get the category from the command options
            const category = interaction.options.getString('category');

            if (category) {
                // Show help for a specific category
                await this.handleCategoryHelp(interaction, category);
            } else {
                // Show general help
                await this.handleGeneralHelp(interaction);
            }
        } catch (error: any) {
            console.error('Error handling help command:', error.message);
            await interaction.reply({
                content: `Failed to show help: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Handle general help
     * @param interaction The command interaction
     */
    private async handleGeneralHelp(interaction: ChatInputCommandInteraction): Promise<void> {
        // Create the help embed
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('SkyPANEL Discord Bot Help')
            .setDescription('Welcome to the SkyPANEL Discord Bot! Here are the available command categories:')
            .addFields(
                {name: '🎫 Tickets', value: 'Commands for managing support tickets', inline: true},
                {name: '🛡️ Moderation', value: 'Commands for server moderation', inline: true},
                {name: '✅ Verification', value: 'Commands for Discord verification system', inline: true},
                {name: '📊 Status', value: 'Commands for checking system status', inline: true},
                {name: '🤖 AI', value: 'Commands for interacting with AI', inline: true},
                {name: '💾 Backup', value: 'Commands for Discord server backup management', inline: true},
                {name: '❓ Help', value: 'Commands for getting help', inline: true}
            )
            .setFooter({text: 'Use the dropdown menu below to view commands for each category'});

        // Create the category dropdown menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Select a category to view commands')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Tickets')
                    .setDescription('Commands for managing support tickets')
                    .setValue('tickets')
                    .setEmoji('🎫'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderation')
                    .setDescription('Commands for server moderation')
                    .setValue('moderation')
                    .setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Verification')
                    .setDescription('Commands for Discord verification system')
                    .setValue('verification')
                    .setEmoji('✅'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Status')
                    .setDescription('Commands for checking system status')
                    .setValue('status')
                    .setEmoji('📊'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('AI')
                    .setDescription('Commands for interacting with AI')
                    .setValue('ai')
                    .setEmoji('🤖'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Backup')
                    .setDescription('Commands for Discord server backup management')
                    .setValue('backup')
                    .setEmoji('💾'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Help')
                    .setDescription('Commands for getting help')
                    .setValue('help')
                    .setEmoji('❓')
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        // Reply with the help message
        await interaction.reply({
            embeds: [embed],
            components: [row]
        });
    }

    /**
     * Handle category help
     * @param interaction The command interaction
     * @param category The category to show help for
     */
    private async handleCategoryHelp(interaction: ChatInputCommandInteraction, category: string): Promise<void> {
        // Update the help message with the selected category
        await this.updateHelpMessage(interaction, category);
    }

    /**
     * Handle help button
     * @param interaction The button interaction
     */
    public async handleHelpButton(interaction: ButtonInteraction): Promise<void> {
        try {
            // Get the category from the button ID
            const parts = interaction.customId.split(':');
            const category = parts[1];

            // Update the help message with the selected category
            await this.updateHelpMessage(interaction, category);
        } catch (error: any) {
            console.error('Error handling help button:', error.message);

            // Reply with an error message
            try {
                await interaction.reply({
                    content: `Failed to show help: ${error.message}`,
                    ephemeral: true
                });
            } catch {
                await interaction.followUp({
                    content: `Failed to show help: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Handle help select menu
     * @param interaction The select menu interaction
     */
    public async handleHelpSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        try {
            // Get the category from the select menu
            const category = interaction.values[0];

            // Update the help message with the selected category
            await this.updateHelpMessage(interaction, category);
        } catch (error: any) {
            console.error('Error handling help select menu:', error.message);

            // Reply with an error message
            try {
                await interaction.reply({
                    content: `Failed to show help: ${error.message}`,
                    ephemeral: true
                });
            } catch {
                await interaction.followUp({
                    content: `Failed to show help: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Update the help message with the selected category
     * @param interaction The interaction
     * @param category The category to show help for
     */
    private async updateHelpMessage(
        interaction: ChatInputCommandInteraction | ButtonInteraction | StringSelectMenuInteraction,
        category: string
    ): Promise<void> {
        // Create the embed based on the category
        let embed: EmbedBuilder;

        switch (category.toLowerCase()) {
            case 'tickets':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🎫 Ticket Commands')
                    .setDescription('Commands for managing support tickets')
                    .addFields(
                        {name: '/ticket close', value: 'Close a ticket', inline: true},
                        {name: '/ticket reopen', value: 'Reopen a closed ticket', inline: true},
                        {name: '/ticket info', value: 'Get information about a ticket', inline: true},
                        {name: '/ticket assign', value: 'Assign a ticket to a user', inline: true}
                    );
                break;

            case 'moderation':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🛡️ Moderation Commands')
                    .setDescription('Commands for server moderation')
                    .addFields(
                        {name: '/kick', value: 'Kick a user from the server', inline: true},
                        {name: '/ban', value: 'Ban a user from the server', inline: true},
                        {name: '/unban', value: 'Unban a user from the server', inline: true},
                        {name: '/timeout', value: 'Timeout a user', inline: true},
                        {name: '/untimeout', value: 'Remove timeout from a user', inline: true},
                        {name: '/clear', value: 'Clear messages from a channel', inline: true},
                        {name: '/warn', value: 'Warn a user', inline: true},
                        {name: '/userinfo', value: 'Get information about a user', inline: true},
                        {name: '/serverinfo', value: 'Get information about the server', inline: true}
                    );
                break;

            case 'verification':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('✅ Verification Commands')
                    .setDescription('Commands for Discord verification system (Admin only)')
                    .addFields(
                        {name: '/verify-setup', value: 'Setup Discord verification system with role and channel', inline: true},
                        {name: '/verify-reset', value: 'Reset verification settings for this server', inline: true}
                    );
                break;

            case 'status':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('📊 Status Commands')
                    .setDescription('Commands for checking system status')
                    .addFields(
                        {name: '/status', value: 'Check the status of the system', inline: true}
                    );
                break;

            case 'ai':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🤖 AI Commands')
                    .setDescription('Commands for interacting with AI')
                    .addFields(
                        {name: '/ask', value: 'Ask a question to the AI', inline: true},
                        {
                            name: 'Direct Messages',
                            value: 'You can also chat with the AI by sending direct messages to the bot',
                            inline: false
                        }
                    );
                break;

            case 'backup':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('💾 Backup Commands')
                    .setDescription('Commands for Discord server backup management')
                    .addFields(
                        {name: '/backup create', value: 'Create a manual backup of the Discord server', inline: true},
                        {name: '/backup list', value: 'List all available backups for this server', inline: true},
                        {name: '/backup delete', value: 'Delete a specific backup', inline: true},
                        {name: '/backup info', value: 'Get detailed information about a backup', inline: true},
                        {name: '/backup settings', value: 'Configure backup settings for this server', inline: true},
                        {name: '/backup schedule', value: 'Schedule automatic backups with cron expressions', inline: true},
                        {name: '/backup unschedule', value: 'Cancel a scheduled backup job', inline: true},
                        {name: '/backup schedules', value: 'List all scheduled backup jobs', inline: true}
                    );
                break;

            case 'help':
                embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('❓ Help Commands')
                    .setDescription('Commands for getting help')
                    .addFields(
                        {name: '/help', value: 'Show this help message', inline: true},
                        {name: '/help [category]', value: 'Show help for a specific category', inline: true}
                    );
                break;

            default:
                embed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ Invalid Category')
                    .setDescription(`Category "${category}" not found. Please select a valid category.`);
        }

        // Add a footer
        embed.setFooter({text: 'Use the dropdown menu below to view commands for other categories'});

        // Create the category dropdown menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help:category')
            .setPlaceholder('Select a category to view commands')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Tickets')
                    .setDescription('Commands for managing support tickets')
                    .setValue('tickets')
                    .setEmoji('🎫'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderation')
                    .setDescription('Commands for server moderation')
                    .setValue('moderation')
                    .setEmoji('🛡️'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Verification')
                    .setDescription('Commands for Discord verification system')
                    .setValue('verification')
                    .setEmoji('✅'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Status')
                    .setDescription('Commands for checking system status')
                    .setValue('status')
                    .setEmoji('📊'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('AI')
                    .setDescription('Commands for interacting with AI')
                    .setValue('ai')
                    .setEmoji('🤖'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Backup')
                    .setDescription('Commands for Discord server backup management')
                    .setValue('backup')
                    .setEmoji('💾'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Help')
                    .setDescription('Commands for getting help')
                    .setValue('help')
                    .setEmoji('❓')
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(selectMenu);

        // Update or reply with the help message
        if (interaction instanceof StringSelectMenuInteraction) {
            await interaction.update({
                embeds: [embed],
                components: [row]
            });
        } else if (interaction instanceof ButtonInteraction) {
            await interaction.update({
                embeds: [embed],
                components: [row]
            });
        } else {
            await interaction.reply({
                embeds: [embed],
                components: [row]
            });
        }
    }

    /**
     * Get the help command for registration
     * @returns The help command
     */
    public getHelpCommand(): any {
        return new SlashCommandBuilder()
            .setName('help')
            .setDescription('Get help with bot commands')
            .addStringOption(option =>
                option
                    .setName('category')
                    .setDescription('The category to get help for')
                    .setRequired(false)
                    .addChoices(
                        {name: 'Tickets', value: 'tickets'},
                        {name: 'Moderation', value: 'moderation'},
                        {name: 'Verification', value: 'verification'},
                        {name: 'Status', value: 'status'},
                        {name: 'AI', value: 'ai'},
                        {name: 'Backup', value: 'backup'},
                        {name: 'Help', value: 'help'}
                    )
            );
    }
}

// Export the singleton instance
export const discordHelpService = DiscordHelpService.getInstance();