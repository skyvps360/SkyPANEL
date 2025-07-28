import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} from 'discord.js';
import {betterStackService} from '../betterstack-service';
import {getMaintenanceStatus} from '../middleware';
import {discordBotCore} from './discord-bot-core';
import {storage} from '../storage';

/**
 * Service for handling Discord status commands and status monitoring
 */
export class DiscordStatusService {
    private static instance: DiscordStatusService;
    private activeStatusTimers: Map<string, NodeJS.Timeout> = new Map();

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

    private static getStatusEmoji(status: string): string {
        switch (status) {
            case 'operational': return '🟢';
            case 'degraded': return '🟡';
            case 'outage': return '🔴';
            case 'maintenance': return '🟠';
            default: return '⚪';
        }
    }

    private async buildStatusPayload(currentPage: number = 0, companyName: string): Promise<{ embeds: EmbedBuilder[], components: ActionRowBuilder<ButtonBuilder>[] }> {
        const [maintenanceStatus, serviceStatus] = await Promise.all([
            getMaintenanceStatus(),
            betterStackService.getServiceStatusForApi()
        ]);

        let overallStatus: 'operational' | 'degraded' | 'outage' | 'maintenance' = 'operational';
        let statusMessage = 'All Systems Operational';
        let statusColor = 0x00ff00; // Green

        if (maintenanceStatus.enabled) {
            overallStatus = 'maintenance';
            statusMessage = `System Maintenance: ${maintenanceStatus.message}`;
            statusColor = 0xffa500; // Orange
        } else if (serviceStatus.overall === 'outage') {
            overallStatus = 'outage';
            statusMessage = 'Service Disruption Detected';
            statusColor = 0xff0000; // Red
        } else if (serviceStatus.overall === 'degraded') {
            overallStatus = 'degraded';
            statusMessage = 'Some Systems Experiencing Issues';
            statusColor = 0xffff00; // Yellow
        }

        const statusEmbed = new EmbedBuilder()
            .setTitle(`🖥️ ${companyName} Platform Status`)
            .setDescription(statusMessage)
            .setColor(statusColor)
            .setTimestamp()
            .setFooter({ text: 'Status updated • Auto-refreshes every 1 minute' });

        statusEmbed.addFields({
            name: '📊 Overall Status',
            value: `${DiscordStatusService.getStatusEmoji(overallStatus)} **${overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}**`,
            inline: true
        });

        if (maintenanceStatus.enabled) {
            statusEmbed.addFields({
                name: '🔧 Maintenance Mode',
                value: maintenanceStatus.message,
                inline: false
            });

            if (maintenanceStatus.estimatedCompletion) {
                statusEmbed.addFields({
                    name: '⏰ Estimated Completion',
                    value: maintenanceStatus.estimatedCompletion,
                    inline: true
                });
            }
        }

        const servicesPerPage = 6;
        const totalPages = Math.ceil(serviceStatus.services.length / servicesPerPage);

        const createServicesEmbed = (page: number): EmbedBuilder => {
            const startIndex = page * servicesPerPage;
            const endIndex = Math.min(startIndex + servicesPerPage, serviceStatus.services.length);
            const pageServices = serviceStatus.services.slice(startIndex, endIndex);

            const servicesEmbed = new EmbedBuilder()
                .setTitle('🔧 Service Status Details')
                .setColor(statusColor)
                .setTimestamp();

            if (totalPages > 1) {
                servicesEmbed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
            }

            pageServices.forEach(service => {
                const uptimeText = `${service.uptimePercentage.toFixed(2)}% uptime`;
                servicesEmbed.addFields({
                    name: `${DiscordStatusService.getStatusEmoji(service.status)} ${service.name}`,
                    value: `**${service.status.charAt(0).toUpperCase() + service.status.slice(1)}**\n${uptimeText}`,
                    inline: true
                });
            });

            return servicesEmbed;
        };

        const servicesEmbed = createServicesEmbed(currentPage);

        const components: ActionRowBuilder<ButtonBuilder>[] = [];
        if (totalPages > 1) {
            const paginationRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('status:prev')
                    .setLabel('◀️ Previous')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage === 0),
                new ButtonBuilder()
                    .setCustomId('status:next')
                    .setLabel('Next ▶️')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(currentPage >= totalPages - 1)
            );
            components.push(paginationRow);
        }



        return { embeds: [statusEmbed, servicesEmbed], components };
    }

    private async autoRefreshStatus(messageId: string, channelId: string, companyName: string): Promise<void> {
        try {
            const channel = await discordBotCore.client.channels.fetch(channelId);
            if (!channel?.isTextBased()) {
                throw new Error('Channel not found or not text-based.');
            }

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) {
                throw new Error('Message not found.');
            }

            let currentPage = 0;
            if (message.embeds[1]?.footer?.text) {
                const match = message.embeds[1].footer.text.match(/Page (\d+) of (\d+)/);
                if (match) {
                    currentPage = parseInt(match[1]) - 1;
                }
            }

            const { embeds, components } = await this.buildStatusPayload(currentPage, companyName);

            await message.edit({ embeds, components });
        } catch (error) {
            console.error(`Error auto-refreshing status for message ${messageId}:`, error);
            if (this.activeStatusTimers.has(messageId)) {
                clearInterval(this.activeStatusTimers.get(messageId)!);
                this.activeStatusTimers.delete(messageId);
            }
        }
    }

    public async handleStatusButton(interaction: ButtonInteraction): Promise<void> {
        try {
            await interaction.deferUpdate();

            const parts = interaction.customId.split(':');
            const action = parts[1];

            let currentPage = 0;
            if (interaction.message.embeds[1]?.footer?.text) {
                const match = interaction.message.embeds[1].footer.text.match(/Page (\d+) of (\d+)/);
                if (match) {
                    currentPage = parseInt(match[1]) - 1;
                }
            }

            if (action === 'next') {
                currentPage++;
            } else if (action === 'prev') {
                currentPage--;
            }

            const companyNameMatch = interaction.message.embeds[0]?.title?.match(/🖥️ (.*) Platform Status/);
            const companyName = companyNameMatch ? companyNameMatch[1] : 'SkyVPS360';

            const { embeds, components } = await this.buildStatusPayload(currentPage, companyName);

            await interaction.editReply({
                embeds,
                components
            });
        } catch (error: any) {
            console.error('Error handling status button:', error);
            try {
                await interaction.followUp({
                    content: '❌ Sorry, I encountered an error while updating the status. Please try again.',
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error replying to status button:', replyError);
            }
        }
    }

    /**
     * Handle the status command
     * @param interaction The command interaction
     */
    public async handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Check if interaction has already been acknowledged
            if (!interaction.deferred && !interaction.replied) {
                await interaction.deferReply();
            }

            // Get company name from database
            const companySetting = await storage.getSetting('company_name');
            const companyName = companySetting?.value || 'SkyVPS360';

            // Fetch status data from APIs
            const [maintenanceStatus, serviceStatus] = await Promise.all([
                getMaintenanceStatus(),
                betterStackService.getServiceStatusForApi()
            ]);

            // Determine overall status
            let overallStatus: 'operational' | 'degraded' | 'outage' | 'maintenance' = 'operational';
            let statusMessage = 'All Systems Operational';
            let statusColor = 0x00ff00; // Green

            if (maintenanceStatus.enabled) {
                overallStatus = 'maintenance';
                statusMessage = `System Maintenance: ${maintenanceStatus.message}`;
                statusColor = 0xffa500; // Orange
            } else if (serviceStatus.overall === 'outage') {
                overallStatus = 'outage';
                statusMessage = 'Service Disruption Detected';
                statusColor = 0xff0000; // Red
            } else if (serviceStatus.overall === 'degraded') {
                overallStatus = 'degraded';
                statusMessage = 'Some Systems Experiencing Issues';
                statusColor = 0xffff00; // Yellow
            }

            // Get status emoji
            const getStatusEmoji = (status: string): string => {
                switch (status) {
                    case 'operational': return '🟢';
                    case 'degraded': return '🟡';
                    case 'outage': return '🔴';
                    case 'maintenance': return '🟠';
                    default: return '⚪';
                }
            };

            // Create main status embed
            const statusEmbed = new EmbedBuilder()
                .setTitle(`🖥️ ${companyName} Platform Status`)
                .setDescription(statusMessage)
                .setColor(statusColor)
                .setTimestamp()
                .setFooter({ text: 'Status updated • Auto-refreshes every 1 minute' });

            // Add overall status field
            statusEmbed.addFields({
                name: '📊 Overall Status',
                value: `${getStatusEmoji(overallStatus)} **${overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}**`,
                inline: true
            });

            // Add maintenance info if enabled
            if (maintenanceStatus.enabled) {
                statusEmbed.addFields({
                    name: '🔧 Maintenance Mode',
                    value: maintenanceStatus.message,
                    inline: false
                });

                if (maintenanceStatus.estimatedCompletion) {
                    statusEmbed.addFields({
                        name: '⏰ Estimated Completion',
                        value: maintenanceStatus.estimatedCompletion,
                        inline: true
                    });
                }
            }

            // Create services embed with pagination support
            const servicesPerPage = 6;
            const totalPages = Math.ceil(serviceStatus.services.length / servicesPerPage);
            let currentPage = 0;

            const createServicesEmbed = (page: number): EmbedBuilder => {
                const startIndex = page * servicesPerPage;
                const endIndex = Math.min(startIndex + servicesPerPage, serviceStatus.services.length);
                const pageServices = serviceStatus.services.slice(startIndex, endIndex);

                const servicesEmbed = new EmbedBuilder()
                    .setTitle('🔧 Service Status Details')
                    .setColor(statusColor)
                    .setTimestamp();

                if (totalPages > 1) {
                    servicesEmbed.setFooter({ text: `Page ${page + 1} of ${totalPages}` });
                }

                // Add service status fields
                pageServices.forEach(service => {
                    const uptimeText = `${service.uptimePercentage.toFixed(2)}% uptime`;
                    servicesEmbed.addFields({
                        name: `${getStatusEmoji(service.status)} ${service.name}`,
                        value: `**${service.status.charAt(0).toUpperCase() + service.status.slice(1)}**\n${uptimeText}`,
                        inline: true
                    });
                });

                return servicesEmbed;
            };

            const servicesEmbed = createServicesEmbed(currentPage);

            // Create pagination buttons if needed
            const components: ActionRowBuilder<ButtonBuilder>[] = [];
            if (totalPages > 1) {
                const paginationRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('status:prev')
                            .setLabel('◀️ Previous')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === 0),
                        new ButtonBuilder()
                            .setCustomId('status:next')
                            .setLabel('Next ▶️')
                            .setStyle(ButtonStyle.Secondary)
                            .setDisabled(currentPage === totalPages - 1)
                    );
                components.push(paginationRow);
            }


            // Send the response
            const reply = interaction.deferred 
                ? await interaction.editReply({
                    embeds: [statusEmbed, servicesEmbed],
                    components
                })
                : await interaction.reply({
                    embeds: [statusEmbed, servicesEmbed],
                    components,
                    fetchReply: true
                });

            // Set up auto-refresh timer for 1 minute
            const refreshInterval = 60 * 1000; // 1 minute in milliseconds

            // Store the refresh function so we can call it periodically
            const refreshStatusEmbed = async () => {
                try {
                    // Check if message still exists and can be edited
                    const message = await interaction.channel?.messages.fetch(reply.id).catch(() => null);
                    if (!message) {
                        return; // Message was deleted or not found
                    }

                    // Get fresh company name from database
                    const refreshedCompanySetting = await storage.getSetting('company_name');
                    const refreshedCompanyName = refreshedCompanySetting?.value || 'SkyVPS360';

                    // Fetch updated status data
                    const [refreshedMaintenanceStatus, refreshedServiceStatus] = await Promise.all([
                        getMaintenanceStatus(),
                        betterStackService.getServiceStatusForApi()
                    ]);

                    // Update overall status
                    let refreshedOverallStatus: 'operational' | 'degraded' | 'outage' | 'maintenance' = 'operational';
                    let refreshedStatusMessage = 'All Systems Operational';
                    let refreshedStatusColor = 0x00ff00; // Green

                    if (refreshedMaintenanceStatus.enabled) {
                        refreshedOverallStatus = 'maintenance';
                        refreshedStatusMessage = `System Maintenance: ${refreshedMaintenanceStatus.message}`;
                        refreshedStatusColor = 0xffa500; // Orange
                    } else if (refreshedServiceStatus.overall === 'outage') {
                        refreshedOverallStatus = 'outage';
                        refreshedStatusMessage = 'Service Disruption Detected';
                        refreshedStatusColor = 0xff0000; // Red
                    } else if (refreshedServiceStatus.overall === 'degraded') {
                        refreshedOverallStatus = 'degraded';
                        refreshedStatusMessage = 'Some Systems Experiencing Issues';
                        refreshedStatusColor = 0xffff00; // Yellow
                    }

                    // Create updated status embed
                    const updatedStatusEmbed = new EmbedBuilder()
                        .setTitle(`🖥️ ${refreshedCompanyName} Platform Status`)
                        .setDescription(refreshedStatusMessage)
                        .setColor(refreshedStatusColor)
                        .setTimestamp()
                        .setFooter({ text: 'Status auto-updated • Refreshes every 1 minute' });

                    // Add overall status field
                    updatedStatusEmbed.addFields({
                        name: '📊 Overall Status',
                        value: `${getStatusEmoji(refreshedOverallStatus)} **${refreshedOverallStatus.charAt(0).toUpperCase() + refreshedOverallStatus.slice(1)}**`,
                        inline: true
                    });

                    // Add maintenance info if enabled
                    if (refreshedMaintenanceStatus.enabled) {
                        updatedStatusEmbed.addFields({
                            name: '🔧 Maintenance Mode',
                            value: refreshedMaintenanceStatus.message,
                            inline: false
                        });

                        if (refreshedMaintenanceStatus.estimatedCompletion) {
                            updatedStatusEmbed.addFields({
                                name: '⏰ Estimated Completion',
                                value: refreshedMaintenanceStatus.estimatedCompletion,
                                inline: true
                            });
                        }
                    }

                    // Create updated services embed
                    const updatedServicesEmbed = createServicesEmbed(0); // Reset to first page on auto-refresh
                    updatedServicesEmbed.setColor(refreshedStatusColor);

                    // Update the message
                    await message.edit({
                        embeds: [updatedStatusEmbed, updatedServicesEmbed],
                        components // Keep the same components for buttons
                    });

                } catch (refreshError) {
                    // Log error but don't throw - we don't want to crash the bot on auto-refresh errors
                    console.error('Error during status auto-refresh:', refreshError);
                }
            };

            // Set up the refresh timer to run forever
            const timer = setInterval(() => {
                refreshStatusEmbed();
            }, refreshInterval);

            // Track the timer so we can clean it up later
            this.activeStatusTimers.set(reply.id, timer);

        } catch (error: any) {
            console.error('Error handling status command:', error);
            try {
                const errorMessage = '❌ Sorry, I encountered an error while fetching the platform status. Please try again later.';

                if (interaction.deferred) {
                    await interaction.editReply({ content: errorMessage });
                } else if (!interaction.replied) {
                    await interaction.reply({ content: errorMessage, ephemeral: true });
                }
            } catch (replyError) {
                console.error('Error replying to status command:', replyError);
            }
        }
    }

    // Note: getStatusEmoji method removed as we're using inline functions in the command handlers

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
