import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import {betterStackService} from '../betterstack-service';
import {getMaintenanceStatus} from '../middleware';
import {discordBotCore} from './discord-bot-core';

/**
 * Service for handling Discord status commands and status monitoring
 */
export class DiscordStatusService {
    private static instance: DiscordStatusService;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordStatusService
     * @returns The DiscordStatusService instance
     */
    public static getInstance(): DiscordStatusService {
        if (!DiscordStatusService.instance) {
            DiscordStatusService.instance = new DiscordStatusService();
        }
        return DiscordStatusService.instance;
    }

    /**
     * Handle the status button interaction
     * @param interaction The button interaction
     */
    public async handleStatusButton(interaction: ButtonInteraction): Promise<void> {
        try {
            // Get the action from the button ID
            const parts = interaction.customId.split(':');
            const action = parts[1];

            if (action === 'refresh') {
                // Refresh the status
                await interaction.deferUpdate();

                // Get the maintenance status
                const maintenanceStatus = await getMaintenanceStatus();

                // Get the BetterStack services
                const services = await betterStackService.getMonitors();

                // Create the status embed
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('System Status')
                    .setDescription('Current status of all services')
                    .addFields(
                        {name: 'Maintenance Mode', value: maintenanceStatus ? '🔧 Enabled' : '✅ Disabled', inline: true}
                    )
                    .setTimestamp();

                // Add service statuses
                for (const service of services) {
                    embed.addFields({
                        name: service.name,
                        value: this.getStatusEmoji(service.status) + ' ' + service.status,
                        inline: true
                    });
                }

                // Create the refresh button
                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('status:refresh')
                            .setLabel('Refresh Status')
                            .setStyle(ButtonStyle.Primary)
                    );

                // Update the message
                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }
        } catch (error: any) {
            console.error('Error handling status button:', error.message);

            // Reply with an error message if possible
            try {
                await interaction.reply({
                    content: 'An error occurred while processing this button.',
                    ephemeral: true
                });
            } catch {
                // If already replied, try to follow up
                try {
                    await interaction.followUp({
                        content: 'An error occurred while processing this button.',
                        ephemeral: true
                    });
                } catch {
                    console.error('Could not send error message to user');
                }
            }
        }
    }

    /**
     * Handle the status command
     * @param interaction The command interaction
     */
    public async handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Defer the reply as this might take some time
            await interaction.deferReply();

            // Get the maintenance status
            const maintenanceStatus = await getMaintenanceStatus();

            // Get the BetterStack services
            const services = await betterStackService.getMonitors();

            // Create the status embed
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('System Status')
                .setDescription('Current status of all services')
                .addFields(
                    {name: 'Maintenance Mode', value: maintenanceStatus ? '🔧 Enabled' : '✅ Disabled', inline: true}
                )
                .setTimestamp();

            // Add service statuses
            for (const service of services) {
                embed.addFields({
                    name: service.name,
                    value: this.getStatusEmoji(service.status) + ' ' + service.status,
                    inline: true
                });
            }

            // Create the refresh button
            const row = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('status:refresh')
                        .setLabel('Refresh Status')
                        .setStyle(ButtonStyle.Primary)
                );

            // Reply with the status
            await interaction.editReply({
                embeds: [embed],
                components: [row]
            });
        } catch (error: any) {
            console.error('Error handling status command:', error.message);

            // Reply with an error message
            if (interaction.deferred) {
                await interaction.editReply('An error occurred while fetching the status.');
            } else {
                await interaction.reply({
                    content: 'An error occurred while fetching the status.',
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Get the emoji for a status
     * @param status The status
     * @returns The emoji
     */
    private getStatusEmoji(status: string): string {
        switch (status.toLowerCase()) {
            case 'up':
                return '✅';
            case 'down':
                return '❌';
            case 'degraded':
                return '⚠️';
            case 'maintenance':
                return '🔧';
            default:
                return '❓';
        }
    }

    /**
     * Get the status command for registration
     * @returns The status command
     */
    public getStatusCommand(): any {
        return new SlashCommandBuilder()
            .setName('status')
            .setDescription('Check the status of the system');
    }
}

// Export the singleton instance
export const discordStatusService = DiscordStatusService.getInstance();