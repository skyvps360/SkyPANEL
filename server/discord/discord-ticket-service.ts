import {
    ThreadChannel,
    TextChannel,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
    Message
} from 'discord.js';
import {storage} from '../storage';
import {InsertTicketMessage, InsertDiscordTicketThread} from '../../shared/schema';
import {discordBotCore} from './discord-bot-core';

/**
 * Service for managing ticket-related Discord functionality
 */
export class DiscordTicketService {
    private static instance: DiscordTicketService;
    private ticketThreads: Map<number, string> = new Map(); // Maps ticketId to threadId

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordTicketService
     * @returns The DiscordTicketService instance
     */
    public static getInstance(): DiscordTicketService {
        if (!DiscordTicketService.instance) {
            DiscordTicketService.instance = new DiscordTicketService();
        }
        return DiscordTicketService.instance;
    }

    /**
     * Load existing ticket threads from the database
     * This helps reconnect to existing threads after bot restart
     */
    public async loadExistingTicketThreads(): Promise<void> {
        try {
            this.ticketThreads.clear();

            const tickets = await storage.getAllTickets();
            for (const ticket of tickets) {
                const threadMapping = await storage.getDiscordTicketThread(ticket.id);
                if (threadMapping?.threadId) {
                    this.ticketThreads.set(ticket.id, threadMapping.threadId);
                }
            }

            console.log(`Loaded ${this.ticketThreads.size} existing ticket threads`);
        } catch (error: any) {
            console.error('Error loading existing ticket threads:', error.message);
        }
    }

    /**
     * Get the ticket ID associated with a thread
     * @param thread The Discord thread channel
     * @returns The ticket ID or null if not found
     */
    public getTicketIdFromThread(thread: ThreadChannel): number | null {
        // Look through the map for a matching thread ID
        const entries = Array.from(this.ticketThreads.entries());
        for (const [ticketId, threadId] of entries) {
            if (threadId === thread.id) {
                return ticketId;
            }
        }
        return null;
    }

    /**
     * Process a message from Discord and add it to the ticket
     * @param ticketId The ticket ID
     * @param username The Discord username
     * @param content The message content
     * @param message The original Discord message object for reactions
     */
    public async processDiscordMessageToTicket(
        ticketId: number,
        username: string,
        content: string,
        message?: Message
    ): Promise<void> {
        try {
            const ticket = await storage.getTicket(ticketId);
            if (!ticket) {
                console.error(`Cannot process Discord message: Ticket #${ticketId} not found`);

                // Add ❌ reaction if message exists
                if (message) {
                    try {
                        await message.react('❌');
                    } catch (reactError) {
                        console.error('Error adding failure reaction:', reactError);
                    }
                }
                return;
            }

            // Check if ticket is closed
            if (ticket.status.toLowerCase() === 'closed') {
                console.log(`Ticket #${ticketId} is closed, not processing message`);

                // Add ❌ reaction if message exists
                if (message) {
                    try {
                        await message.react('❌');
                        await message.reply('⚠️ This ticket is closed. Reopen it first to continue the conversation.');
                    } catch (reactError) {
                        console.error('Error adding reaction to closed ticket message:', reactError);
                    }
                }
                return;
            }

            // Find admin user to attribute the message to (use the first admin we find)
            const adminUsers = await storage.getAdminUsers();
            if (adminUsers.length === 0) {
                console.error('Cannot process Discord message: No admin users found');

                // Add ❌ reaction if message exists
                if (message) {
                    try {
                        await message.react('❌');
                    } catch (reactError) {
                        console.error('Error adding failure reaction:', reactError);
                    }
                }
                return;
            }

            const adminUser = adminUsers[0];

            // Create the ticket message from Discord
            const ticketMessage: InsertTicketMessage = {
                ticketId,
                userId: adminUser.id,
                message: `**Discord Reply from ${username}**: ${content}`
            };

            await storage.createTicketMessage(ticketMessage);
            console.log(`Added Discord message to ticket #${ticketId} from ${username}`);

            // Add ✅ reaction to indicate success
            if (message) {
                try {
                    await message.react('✅');
                } catch (reactError) {
                    console.error('Error adding success reaction:', reactError);
                }
            }
        } catch (error: any) {
            console.error(`Error processing Discord message for ticket #${ticketId}:`, error.message);

            // Add ❌ reaction to indicate failure
            if (message) {
                try {
                    await message.react('❌');
                } catch (reactError) {
                    console.error('Error adding failure reaction:', reactError);
                }
            }
        }
    }

    /**
     * Create a thread for a new ticket
     * @param ticketId The ticket ID
     * @param subject The ticket subject
     * @param message The initial ticket message
     * @param userName The user's name
     * @returns Success status and thread ID if created
     */
    public async createThreadForTicket(
        ticketId: number,
        subject: string,
        message: string,
        userName: string
    ): Promise<{ success: boolean; threadId?: string }> {
        try {
            if (!await discordBotCore.isEnabled() || !discordBotCore.isReady()) {
                console.log('Discord bot disabled or not ready, skipping thread creation');
                return {success: false};
            }

            // Check if thread already exists for this ticket
            if (this.ticketThreads.has(ticketId)) {
                console.log(`Thread already exists for ticket #${ticketId}`);
                return {success: true, threadId: this.ticketThreads.get(ticketId)};
            }

            const discordChannelId = await discordBotCore.getChannelId();
            const guildId = await discordBotCore.getGuildId();
            const client = discordBotCore.getClient();

            if (!discordChannelId || !guildId || !client) {
                console.log('Discord channel ID, guild ID, or client not configured');
                return {success: false};
            }

            // Get the guild and channel
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return {success: false};
            }

            const channel = await guild.channels.fetch(discordChannelId) as TextChannel;
            if (!channel || !channel.isTextBased()) {
                console.error(`Text channel with ID ${discordChannelId} not found in guild ${guildId}`);
                return {success: false};
            }

            // Create the thread for the ticket
            const threadName = `Ticket #${ticketId}: ${subject}`;
            const thread = await channel.threads.create({
                name: threadName,
                autoArchiveDuration: 60 * 24, // 1 day in minutes
                reason: `Support ticket #${ticketId}`
            });

            // Save the thread ID
            this.ticketThreads.set(ticketId, thread.id);

            // Channel ID to save with thread
            const channelId = channel.id;

            // Create or update Discord thread mapping
            const threadData: InsertDiscordTicketThread = {
                ticketId,
                threadId: thread.id,
                channelId
            };

            // Check if mapping already exists
            const existingMapping = await storage.getDiscordTicketThread(ticketId);
            if (existingMapping) {
                await storage.updateDiscordTicketThread(ticketId, {threadId: thread.id, channelId});
            } else {
                await storage.createDiscordTicketThread(threadData);
            }

            // Create ticket management buttons (only close, no delete)
            const ticketButtons = new ActionRowBuilder<ButtonBuilder>()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`close:${ticketId}`)
                        .setLabel('Close Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

            // Parse the message to extract VPS information and main message
            const messageLines = message.split('\n');
            let vpsInfo = '';
            let mainMessage = message;

            // Look for VPS information in the message
            const vpsLineIndex = messageLines.findIndex(line => line.includes('VPS Information:'));
            if (vpsLineIndex !== -1) {
                // Extract VPS information section
                const vpsLines = [];
                for (let i = vpsLineIndex; i < messageLines.length; i++) {
                    const line = messageLines[i];
                    if (line.includes(':')) {
                        vpsLines.push(line);
                    }
                }

                if (vpsLines.length > 0) {
                    vpsInfo = vpsLines.join('\n');
                    // Remove VPS info from main message
                    mainMessage = messageLines.slice(0, vpsLineIndex).join('\n');
                }
            }

            // Create the initial message embed
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`Ticket #${ticketId}: ${subject}`)
                .setDescription(mainMessage)
                .addFields(
                    {name: 'Status', value: 'Open', inline: true},
                    {name: 'Created By', value: userName, inline: true}
                )
                .setTimestamp();

            // Add VPS information if available
            if (vpsInfo) {
                embed.addFields({name: 'VPS Information', value: vpsInfo});
            }

            // Send the initial message with the embed and buttons
            await thread.send({embeds: [embed], components: [ticketButtons]});

            // Send a notification that the ticket has been created
            await thread.send(`<@&${process.env.DISCORD_ROLE_ID || ''}> A new support ticket has been created.`);

            console.log(`Created Discord thread for ticket #${ticketId}`);
            return {success: true, threadId: thread.id};
        } catch (error: any) {
            console.error(`Error creating Discord thread for ticket #${ticketId}:`, error.message);
            return {success: false};
        }
    }

    /**
     * Send a reply to a ticket thread
     * @param ticketId The ticket ID
     * @param message The message content
     * @param userName The user's name
     * @param isAdmin Whether the message is from an admin
     * @returns Success status
     */
    public async sendReplyToThread(
        ticketId: number,
        message: string,
        userName: string,
        isAdmin: boolean
    ): Promise<boolean> {
        try {
            if (!await discordBotCore.isEnabled() || !discordBotCore.isReady()) {
                console.log('Discord bot disabled or not ready, skipping reply');
                return false;
            }

            // Check if thread exists for this ticket
            const threadId = this.ticketThreads.get(ticketId);
            if (!threadId) {
                console.log(`No thread found for ticket #${ticketId}`);
                return false;
            }

            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return false;
            }

            // Get the guild and thread
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return false;
            }

            const thread = await guild.channels.fetch(threadId) as ThreadChannel;
            if (!thread || !thread.isThread()) {
                console.error(`Thread with ID ${threadId} not found in guild ${guildId}`);
                return false;
            }

            // Create the reply embed
            const embed = new EmbedBuilder()
                .setColor(isAdmin ? 0x00FF00 : 0x0099FF)
                .setDescription(message)
                .setAuthor({
                    name: `${userName} ${isAdmin ? '(Staff)' : '(User)'}`,
                    iconURL: isAdmin ?
                        'https://cdn-icons-png.flaticon.com/512/1077/1077114.png' :
                        'https://cdn-icons-png.flaticon.com/512/1077/1077063.png'
                })
                .setTimestamp();

            // Send the reply
            await thread.send({embeds: [embed]});

            console.log(`Sent reply to Discord thread for ticket #${ticketId}`);
            return true;
        } catch (error: any) {
            console.error(`Error sending reply to Discord thread for ticket #${ticketId}:`, error.message);
            return false;
        }
    }

    /**
     * Update the status of a ticket thread
     * @param ticketId The ticket ID
     * @param status The new status
     * @param userName The user's name who changed the status
     * @returns Success status
     */
    public async updateThreadStatus(
        ticketId: number,
        status: string,
        userName: string
    ): Promise<boolean> {
        try {
            if (!await discordBotCore.isEnabled() || !discordBotCore.isReady()) {
                console.log('Discord bot disabled or not ready, skipping status update');
                return false;
            }

            // Check if thread exists for this ticket
            const threadId = this.ticketThreads.get(ticketId);
            if (!threadId) {
                console.log(`No thread found for ticket #${ticketId}`);
                return false;
            }

            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return false;
            }

            // Get the guild and thread
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return false;
            }

            const thread = await guild.channels.fetch(threadId) as ThreadChannel;
            if (!thread || !thread.isThread()) {
                console.error(`Thread with ID ${threadId} not found in guild ${guildId}`);
                return false;
            }

            // Create the status update embed
            const embed = new EmbedBuilder()
                .setColor(status.toLowerCase() === 'closed' ? 0xFF0000 : 0x00FF00)
                .setDescription(`Ticket status changed to: **${status}**`)
                .setAuthor({
                    name: `${userName}`,
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'
                })
                .setTimestamp();

            // Send the status update
            await thread.send({embeds: [embed]});

            // If closing, add a reopen button
            if (status.toLowerCase() === 'closed') {
                const reopenButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`reopen:${ticketId}`)
                            .setLabel('Reopen Ticket')
                            .setStyle(ButtonStyle.Success)
                    );

                await thread.send({
                    content: 'This ticket has been closed. You can reopen it using the button below.',
                    components: [reopenButton]
                });
            }
            // If reopening, add a close button
            else if (status.toLowerCase() === 'open') {
                const closeButton = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`close:${ticketId}`)
                            .setLabel('Close Ticket')
                            .setStyle(ButtonStyle.Primary)
                    );

                await thread.send({
                    content: 'This ticket has been reopened.',
                    components: [closeButton]
                });
            }

            console.log(`Updated status of Discord thread for ticket #${ticketId} to ${status}`);
            return true;
        } catch (error: any) {
            console.error(`Error updating status of Discord thread for ticket #${ticketId}:`, error.message);
            return false;
        }
    }

    /**
     * Handle ticket deletion
     * @param ticketId The ticket ID
     * @param adminName The admin's name who deleted the ticket
     * @returns Success status
     */
    public async handleTicketDeletion(
        ticketId: number,
        adminName: string
    ): Promise<boolean> {
        try {
            if (!await discordBotCore.isEnabled() || !discordBotCore.isReady()) {
                console.log('Discord bot disabled or not ready, skipping ticket deletion handling');
                return false;
            }

            // Check if thread exists for this ticket
            const threadId = this.ticketThreads.get(ticketId);
            if (!threadId) {
                console.log(`No thread found for ticket #${ticketId}`);
                return false;
            }

            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return false;
            }

            // Get the guild and thread
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return false;
            }

            const thread = await guild.channels.fetch(threadId) as ThreadChannel;
            if (!thread || !thread.isThread()) {
                console.error(`Thread with ID ${threadId} not found in guild ${guildId}`);
                return false;
            }

            // Create the deletion notification embed
            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('Ticket Deleted')
                .setDescription(`Ticket #${ticketId} has been deleted from the system.`)
                .setAuthor({
                    name: `${adminName}`,
                    iconURL: 'https://cdn-icons-png.flaticon.com/512/1077/1077114.png'
                })
                .setTimestamp();

            // Send the deletion notification
            await thread.send({embeds: [embed]});

            // Remove the thread from our map
            this.ticketThreads.delete(ticketId);

            // Archive the thread
            await thread.setArchived(true);

            console.log(`Handled deletion of ticket #${ticketId} in Discord thread`);
            return true;
        } catch (error: any) {
            console.error(`Error handling deletion of ticket #${ticketId}:`, error.message);
            return false;
        }
    }
}

// Export the singleton instance
export const discordTicketService = DiscordTicketService.getInstance();