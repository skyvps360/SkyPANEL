import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ThreadChannel
} from 'discord.js';
import {storage} from '../storage';
import {discordBotCore} from './discord-bot-core';
import {discordTicketService} from './discord-ticket-service';

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
        await interaction.reply({
            content: `Ticket #${ticketId} has been closed${reason ? ` with reason: ${reason}` : ''}.`,
            ephemeral: true
        });
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
        await interaction.reply({
            content: `Ticket #${ticketId} has been reopened.`,
            ephemeral: true
        });
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

        // Format the ticket information
        const ticketInfo = [
            `**Ticket #${ticket.id}**`,
            `**Subject:** ${ticket.subject}`,
            `**Status:** ${ticket.status}`,
            `**Created By:** ${user ? user.name : 'Unknown'}`,
            `**Created At:** ${new Date(ticket.createdAt).toLocaleString()}`,
            `**Updated At:** ${new Date(ticket.updatedAt).toLocaleString()}`
        ].join('\n');

        // Reply with the ticket information
        await interaction.reply({
            content: ticketInfo,
            ephemeral: true
        });
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

        // Get the admin user from the database
        const adminUser = await storage.getUserByDiscordId(userId);
        if (!adminUser) {
            await interaction.reply({
                content: 'The specified user is not registered in the system.',
                ephemeral: true
            });
            return;
        }

        // Update the ticket in the database
        await storage.updateTicket(ticketId, {assignedToUserId: adminUser.id});

        // Reply to the command
        await interaction.reply({
            content: `Ticket #${ticketId} has been assigned to ${adminUser.name}.`,
            ephemeral: false // Make this visible to everyone in the thread
        });
    }

    /**
     * Get the ticket commands for registration
     * @returns The ticket commands
     */
    public getTicketCommands(): any[] {
        return [
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
    }
}

// Export the singleton instance
export const discordCommandHandler = DiscordCommandHandler.getInstance();