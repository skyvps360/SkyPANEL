import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ThreadChannel,
    EmbedBuilder
} from 'discord.js';
import {storage} from '../storage';
import {discordBotCore} from './discord-bot-core';
import {discordTicketService} from './discord-ticket-service';
import {discordVerificationService} from './discord-verification-service';
import {discordBackupCommands} from './discord-backup-commands';

/**
 * Service for handling Discord commands
 */
export class DiscordCommandHandler {
    private static instance: DiscordCommandHandler;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordCommandHandler
     * @returns The DiscordCommandHandler instance
     */
    public static getInstance(): DiscordCommandHandler {
        if (!DiscordCommandHandler.instance) {
            DiscordCommandHandler.instance = new DiscordCommandHandler();
        }
        return DiscordCommandHandler.instance;
    }

    /**
     * Ensure the interaction is in a thread and get the ticket ID
     * @param interaction The command interaction
     * @returns The ticket ID or null if not in a thread
     */
    public async ensureThreadIsReady(interaction: ChatInputCommandInteraction): Promise<number | null> {
        try {
            // Check if the command is used in a thread
            if (!interaction.channel?.isThread()) {
                await interaction.reply({
                    content: 'This command can only be used in ticket threads.',
                    ephemeral: true
                });
                return null;
            }

            // Get the ticket ID from the thread
            const thread = interaction.channel as ThreadChannel;
            const ticketId = discordTicketService.getTicketIdFromThread(thread);

            if (!ticketId) {
                await interaction.reply({
                    content: 'This thread is not associated with a ticket.',
                    ephemeral: true
                });
                return null;
            }

            return ticketId;
        } catch (error: any) {
            console.error('Error ensuring thread is ready:', error.message);
            await interaction.reply({
                content: 'An error occurred while processing this command.',
                ephemeral: true
            });
            return null;
        }
    }

    /**
     * Handle a command interaction
     * @param interaction The command interaction
     */
    public async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const commandName = interaction.commandName;

            // Handle ticket-related commands
            if (commandName === 'ticket') {
                const subcommand = interaction.options.getSubcommand();

                if (subcommand === 'close') {
                    await this.handleTicketCloseCommand(interaction);
                } else if (subcommand === 'reopen') {
                    await this.handleTicketReopenCommand(interaction);
                } else if (subcommand === 'info') {
                    await this.handleTicketInfoCommand(interaction);
                } else if (subcommand === 'assign') {
                    await this.handleTicketAssignCommand(interaction);
                }
            }
            // Handle verification commands
            else if (commandName === 'verify-setup') {
                await discordVerificationService.handleVerifySetupCommand(interaction);
            } else if (commandName === 'verify-reset') {
                await discordVerificationService.handleVerifyResetCommand(interaction);
            }
            // Handle backup commands
            else if (commandName === 'backup') {
                await discordBackupCommands.handleBackupCommand(interaction);
            }
        } catch (error: any) {
            console.error('Error handling command:', error.message);

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
     * Handle the ticket close command
     * @param interaction The command interaction
     */
    private async handleTicketCloseCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const ticketId = await this.ensureThreadIsReady(interaction);
        if (!ticketId) return;

        // Get the reason from the command options
        const reason = interaction.options.getString('reason');

        // Update the ticket status in the database
        await storage.updateTicket(ticketId, {status: 'closed'});

        // Update the thread status in Discord
        await discordTicketService.updateThreadStatus(ticketId, 'closed', interaction.user.username);

        // Reply to the command
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Closed')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Ticket ID', value: `${ticketId}`, inline: true },
                { name: 'Closed By', value: interaction.user.username, inline: true },
                ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : [])
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle the ticket reopen command
     * @param interaction The command interaction
     */
    private async handleTicketReopenCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const ticketId = await this.ensureThreadIsReady(interaction);
        if (!ticketId) return;

        // Update the ticket status in the database
        await storage.updateTicket(ticketId, {status: 'open'});

        // Update the thread status in Discord
        await discordTicketService.updateThreadStatus(ticketId, 'open', interaction.user.username);

        // Reply to the command
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Reopened')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Ticket ID', value: `${ticketId}`, inline: true },
                { name: 'Reopened By', value: interaction.user.username, inline: true }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle the ticket info command
     * @param interaction The command interaction
     */
    private async handleTicketInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const ticketId = await this.ensureThreadIsReady(interaction);
        if (!ticketId) return;

        // Get the ticket from the database
        const ticket = await storage.getTicket(ticketId);
        if (!ticket) {
            await interaction.reply({
                content: `Ticket #${ticketId} not found in the database.`,
                ephemeral: true
            });
            return;
        }

        // Get the user who created the ticket
        const user = await storage.getUser(ticket.userId);

        // Reply with the ticket information
        const embed = new EmbedBuilder()
            .setTitle(`🎫 Ticket #${ticket.id} Information`)
            .setColor(0x0099ff)
            .addFields(
                { name: 'Subject', value: ticket.subject || 'N/A', inline: true },
                { name: 'Status', value: ticket.status, inline: true },
                { name: 'Created By', value: user ? (user.fullName || user.username) : 'Unknown', inline: true },
                { name: 'Created At', value: ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A', inline: true },
                { name: 'Updated At', value: ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : 'N/A', inline: true }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle the ticket assign command
     * @param interaction The command interaction
     */
    private async handleTicketAssignCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const ticketId = await this.ensureThreadIsReady(interaction);
        if (!ticketId) return;

        // Get the user to assign from the command options
        const userId = interaction.options.getString('user');
        if (!userId) {
            await interaction.reply({
                content: 'You must specify a user to assign the ticket to.',
                ephemeral: true
            });
            return;
        }

        // Get the Discord client from the bot core
        const client = discordBotCore.getClient();
        if (!client) {
            await interaction.reply({
                content: 'Discord bot is not initialized.',
                ephemeral: true
            });
            return;
        }

        // Get the Discord user
        const discordUser = await client.users.fetch(userId);
        if (!discordUser) {
            await interaction.reply({
                content: 'The specified user could not be found.',
                ephemeral: true
            });
            return;
        }

        // Since we don't have a direct method to get user by Discord ID,
        // we'll need to find another way to assign the ticket
        // For now, we'll just use a placeholder approach
        const adminUser = {
            id: 0, // Placeholder ID
            username: discordUser.username,
            fullName: discordUser.username
        };

        // Update the ticket in the database
        // Since we don't have the proper property, we'll use a placeholder approach
        // TODO: Fix this when the proper property is available
        await storage.updateTicket(ticketId, {status: 'assigned'});

        // Reply to the command
        const embed = new EmbedBuilder()
            .setTitle('🎫 Ticket Assigned')
            .setColor(0x00ff00)
            .addFields(
                { name: 'Ticket ID', value: `${ticketId}`, inline: true },
                { name: 'Assigned To', value: adminUser.fullName || adminUser.username, inline: true },
                { name: 'Assigned By', value: interaction.user.username, inline: true }
            )
            .setTimestamp();
        await interaction.reply({ embeds: [embed], ephemeral: false });
    }

    /**
     * Get the ticket commands for registration
     * @returns The ticket commands
     */
    public getTicketCommands(): any[] {
        // Get ticket commands
        const ticketCommands = [
            new SlashCommandBuilder()
                .setName('ticket')
                .setDescription('Manage tickets')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('close')
                        .setDescription('Close a ticket')
                        .addStringOption(option =>
                            option
                                .setName('reason')
                                .setDescription('Reason for closing the ticket')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('reopen')
                        .setDescription('Reopen a closed ticket')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('info')
                        .setDescription('Get information about a ticket')
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('assign')
                        .setDescription('Assign a ticket to a user')
                        .addStringOption(option =>
                            option
                                .setName('user')
                                .setDescription('The user to assign the ticket to')
                                .setRequired(true)
                        )
                )
        ];

        // Get verification commands from the verification service
        const verificationCommands = discordVerificationService.getVerificationCommands();

        // Get backup commands from the backup service
        const backupCommands = discordBackupCommands.getBackupCommands();

        // Return all commands
        return [...ticketCommands, ...verificationCommands, ...backupCommands];
    }
}

// Export the singleton instance
export const discordCommandHandler = DiscordCommandHandler.getInstance();