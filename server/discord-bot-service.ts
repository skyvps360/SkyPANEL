import {
  Client,
  Events,
  GatewayIntentBits,
  TextChannel,
  ThreadChannel,
  SlashCommandBuilder,
  REST,
  Routes,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ButtonInteraction,
  ApplicationCommandType,
  Interaction,
  GuildMember,
  User,
  PermissionFlagsBits,
  ChannelType,
  Message,
  Partials,
  MessageFlags
} from 'discord.js';
import { storage } from './storage';
import { InsertTicketMessage, InsertDiscordTicketThread } from '../shared/schema';
import { betterStackService } from './betterstack-service';
import { getMaintenanceStatus } from './middleware';

/**
 * Service for managing Discord bot operations
 * Handles two-way communication between Discord threads and ticket system
 */
export class DiscordBotService {
  private static instance: DiscordBotService;
  private client: Client | null = null;
  private ready: boolean = false;
  private ticketThreads: Map<number, string> = new Map(); // Maps ticketId to threadId
  private commandsRegistered: boolean = false;
  private userConversations: Map<string, Array<{role: string, parts: Array<{text: string}>}>> = new Map();

  private constructor() {}

  /**
   * Get the singleton instance of DiscordBotService
   * @returns The DiscordBotService instance
   */
  public static getInstance(): DiscordBotService {
    if (!DiscordBotService.instance) {
      DiscordBotService.instance = new DiscordBotService();
    }
    return DiscordBotService.instance;
  }

  /**
   * Check if Discord bot is enabled
   * @returns True if bot is enabled in settings
   */
  public async isEnabled(): Promise<boolean> {
    const setting = await storage.getSetting('discord_bot_enabled');
    return setting?.value === 'true';
  }

  /**
   * Initialize the Discord bot with settings from the database
   */
  public async initialize(): Promise<boolean> {
    if (!await this.isEnabled()) {
      console.log('Discord bot disabled, skipping initialization');
      return false;
    }

    try {
      const botToken = await this.getBotToken();

      if (!botToken) {
        console.log('Discord bot token not configured, skipping initialization');
        return false;
      }

      // Close existing client if it exists
      if (this.client) {
        this.client.destroy();
        this.client = null;
        this.ready = false;
      }

      // Create a new client with necessary intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages, // Add intent for direct messages
          GatewayIntentBits.DirectMessageReactions, // Add intent for DM reactions
          GatewayIntentBits.DirectMessageTyping, // Add intent for DM typing
          GatewayIntentBits.GuildMembers, // Required for fetching guild members
          GatewayIntentBits.GuildModeration, // Required for moderation actions (bans, kicks, timeouts)
        ],
        partials: [
          Partials.Channel, // Required for DMs
          Partials.Message, // Required for DM messages
        ]
      });

      // Set up event handlers
      this.client.once(Events.ClientReady, async (readyClient) => {
        console.log(`Discord bot ready! Logged in as ${readyClient.user.tag}`);
        this.ready = true;
        await this.loadExistingTicketThreads();
        await this.registerCommands();
      });

      // Handle slash commands and button interactions
      this.client.on(Events.InteractionCreate, async (interaction) => {
        if (interaction.isChatInputCommand()) {
          // Handle status command (can be used anywhere)
          if (interaction.commandName === 'status') {
            await this.handleStatusCommand(interaction);
          }
          // Handle help command (can be used anywhere)
          else if (interaction.commandName === 'help') {
            await this.handleHelpCommand(interaction);
          }
          // Check if it's an AI command
          else if (interaction.commandName === 'ask') {
            await this.handleAICommand(interaction);
          }
          // Check if it's a moderation command
          else if (this.isModerationCommand(interaction.commandName)) {
            await this.handleModerationCommand(interaction);
          }
          // Handle ticket commands (require thread context)
          else {
            await this.handleCommand(interaction);
          }
        } else if (interaction.isButton()) {
          await this.handleButton(interaction);
        }
      });

      // Handle messages in threads
      this.client.on(Events.MessageCreate, async (message) => {
        // Debug logging for all messages
        console.log(`Received message in channel type: ${message.channel.type}, from: ${message.author.username}, bot: ${message.author.bot}`);

        // Handle direct messages to bot
        if (message.channel.type === 1) { // ChannelType.DM = 1
          console.log(`Processing DM from ${message.author.username}: ${message.content}`);
          await this.handleDirectMessage(message);
          return;
        }

        // Only process messages from threads in the configured channel
        if (!message.channel.isThread() || message.author.bot) {
          return;
        }

        // Find the ticket ID associated with this thread
        const ticketId = this.getTicketIdFromThread(message.channel as ThreadChannel);

        if (ticketId) {
          // Process the message and add it to the ticket
          // Pass the message object so we can add reactions
          await this.processDiscordMessageToTicket(ticketId, message.author.username, message.content, message);
        }
      });

      // Login with the bot token
      await this.client.login(botToken);
      return true;
    } catch (error: any) {
      console.error('Error initializing Discord bot:', error.message);
      return false;
    }
  }

  /**
   * Load existing ticket threads from the database
   * This helps reconnect to existing threads after bot restart
   */
  private async loadExistingTicketThreads(): Promise<void> {
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
  private getTicketIdFromThread(thread: ThreadChannel): number | null {
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
  private async processDiscordMessageToTicket(
    ticketId: number,
    username: string,
    content: string,
    message?: any
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
      if (!await this.isEnabled() || !this.client || !this.ready) {
        console.log('Discord bot disabled or not ready, skipping thread creation');
        return { success: false };
      }

      // Check if thread already exists for this ticket
      if (this.ticketThreads.has(ticketId)) {
        console.log(`Thread already exists for ticket #${ticketId}`);
        return { success: true, threadId: this.ticketThreads.get(ticketId) };
      }

      const discordChannelId = await this.getChannelId();
      const guildId = await this.getGuildId();

      if (!discordChannelId || !guildId) {
        console.log('Discord channel ID or guild ID not configured');
        return { success: false };
      }

      // Get the guild and channel
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        console.error(`Guild with ID ${guildId} not found`);
        return { success: false };
      }

      const channel = await guild.channels.fetch(discordChannelId) as TextChannel;
      if (!channel || !channel.isTextBased()) {
        console.error(`Text channel with ID ${discordChannelId} not found in guild ${guildId}`);
        return { success: false };
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
        await storage.updateDiscordTicketThread(ticketId, { threadId: thread.id, channelId });
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
      let mainMessage = '';
      let vpsInfo: any = {};
      let departmentInfo = '';

      // Find where the additional info starts (usually after a double newline)
      const additionalInfoIndex = messageLines.findIndex(line => line.startsWith('Department:'));

      if (additionalInfoIndex !== -1) {
        // Extract main message (everything before additional info)
        mainMessage = messageLines.slice(0, additionalInfoIndex).join('\n').trim();

        // Parse additional info
        for (let i = additionalInfoIndex; i < messageLines.length; i++) {
          const line = messageLines[i].trim();
          if (line.startsWith('Department:')) {
            departmentInfo = line.replace('Department:', '').trim();
          } else if (line.startsWith('VPS:')) {
            // More flexible parsing for VPS line: "VPS: ServerName (hostname, ip)"
            const vpsMatch = line.match(/VPS:\s*(.+?)\s*\((.+?),\s*(.+?)\)/);
            if (vpsMatch) {
              vpsInfo.name = vpsMatch[1].trim();
              vpsInfo.hostname = vpsMatch[2].trim();
              vpsInfo.ip = vpsMatch[3].trim();
            } else {
              // Fallback: try to extract just the server name if format doesn't match
              const nameMatch = line.match(/VPS:\s*(.+)/);
              if (nameMatch) {
                vpsInfo.name = nameMatch[1].trim();
              }
            }
          } else if (line.startsWith('OS:')) {
            vpsInfo.os = line.replace('OS:', '').trim();
          } else if (line.startsWith('Status:')) {
            vpsInfo.status = line.replace('Status:', '').trim();
          }
        }
      } else {
        mainMessage = message;
      }

      // Debug logging to help troubleshoot IP extraction
      console.log('Discord bot parsing debug:', {
        messageLines: messageLines.slice(0, 10), // First 10 lines for debugging
        vpsInfo,
        departmentInfo
      });

      // If we have VPS info but missing IP, try to fetch it from the ticket's VPS ID
      if (vpsInfo.name && (!vpsInfo.ip || vpsInfo.ip === 'undefined')) {
        try {
          // Get the ticket to find the VPS ID
          const ticket = await storage.getTicket(ticketId);
          if (ticket && ticket.vpsId) {
            console.log(`Fetching detailed VPS info for Discord embed, VPS ID: ${ticket.vpsId}`);

            // Import VirtFusionApi dynamically to avoid circular dependencies
            const { VirtFusionApi } = await import('./virtfusion-api');
            const virtFusionApi = new VirtFusionApi();

            // Get detailed server information
            const serverResponse = await virtFusionApi.getServer(ticket.vpsId, false);
            if (serverResponse && serverResponse.data) {
              const server = serverResponse.data;

              // Extract IP information from network interfaces
              let primaryIp = 'No IP available';
              if (server.network && server.network.interfaces && Array.isArray(server.network.interfaces)) {
                for (const iface of server.network.interfaces) {
                  // Look for IPv4 addresses first
                  if (iface.ipv4 && Array.isArray(iface.ipv4) && iface.ipv4.length > 0) {
                    const enabledIp = iface.ipv4.find((ip: any) => ip.enabled === true);
                    if (enabledIp && enabledIp.address) {
                      primaryIp = enabledIp.address;
                      break;
                    } else if (iface.ipv4[0].address) {
                      primaryIp = iface.ipv4[0].address;
                      break;
                    }
                  }
                }

                // If no IPv4, try IPv6
                if (primaryIp === 'No IP available') {
                  for (const iface of server.network.interfaces) {
                    if (iface.ipv6 && Array.isArray(iface.ipv6) && iface.ipv6.length > 0) {
                      const enabledIpv6 = iface.ipv6.find((ip: any) => ip.enabled === true);
                      if (enabledIpv6) {
                        if (enabledIpv6.address) {
                          primaryIp = enabledIpv6.address;
                          break;
                        } else if (enabledIpv6.subnet) {
                          primaryIp = `${enabledIpv6.subnet}/${enabledIpv6.cidr}`;
                          break;
                        }
                      }
                    }
                  }
                }
              }

              // Update VPS info with the correct IP and other details
              vpsInfo.ip = primaryIp;
              vpsInfo.hostname = server.hostname || vpsInfo.hostname || 'Unknown';
              vpsInfo.os = server.os?.name || vpsInfo.os || 'Unknown';
              console.log(`Updated VPS info for Discord embed - IP: ${primaryIp}`);
            }
          }
        } catch (error) {
          console.error('Error fetching VPS details for Discord embed:', error);
          // Continue with the original parsed data
        }
      }

      // Create the embed
      const embed = new EmbedBuilder()
        .setTitle(`🎫 New Support Ticket from ${userName}`)
        .setColor(0x00FFFF) // Cyan color
        .setDescription(`**Subject:** ${subject}`)
        .addFields(
          {
            name: '📝 Message',
            value: mainMessage || '(No message provided)',
            inline: false
          },
          {
            name: '🏢 Department',
            value: departmentInfo || 'Unknown',
            inline: true
          }
        )
        .setTimestamp()
        .setFooter({ text: 'Reply to this thread to respond to the ticket' });

      // Add VPS information if available
      if (vpsInfo.name) {
        embed.addFields(
          {
            name: '🖥️ VPS Server',
            value: vpsInfo.name,
            inline: true
          },
          {
            name: '🌐 Hostname',
            value: vpsInfo.hostname || 'Unknown',
            inline: true
          },
          {
            name: '📡 IP Address',
            value: vpsInfo.ip && vpsInfo.ip !== 'undefined' ? vpsInfo.ip : 'No IP available',
            inline: true
          },
          {
            name: '💿 Operating System',
            value: vpsInfo.os || 'Unknown',
            inline: true
          }
        );
      }

      // Post the initial message to the thread with embed and close button
      const sentMessage = await thread.send({
        embeds: [embed],
        components: [ticketButtons]
      });

      // Pin the message with the buttons so it's always easy to find
      try {
        await sentMessage.pin('Pinned ticket management controls');
        console.log(`Pinned management buttons message for ticket #${ticketId}`);
      } catch (error) {
        console.error(`Error pinning message for ticket #${ticketId}:`, error);
        // Continue even if pinning fails
      }

      console.log(`Created Discord thread for ticket #${ticketId}: ${thread.id}`);
      return { success: true, threadId: thread.id };
    } catch (error: any) {
      console.error(`Error creating Discord thread for ticket #${ticketId}:`, error.message);
      return { success: false };
    }
  }

  /**
   * Send a reply to a ticket thread
   * @param ticketId The ticket ID
   * @param message The reply message
   * @param userName The name of the user who replied
   * @param isAdmin Whether the reply is from an admin
   * @returns Success status
   */
  public async sendReplyToThread(
    ticketId: number,
    message: string,
    userName: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled() || !this.client || !this.ready) {
        console.log('Discord bot disabled or not ready, skipping thread reply');
        return false;
      }

      // Get the thread ID for this ticket
      const threadId = this.ticketThreads.get(ticketId);
      if (!threadId) {
        // Thread doesn't exist yet, create it
        const ticket = await storage.getTicket(ticketId);
        if (!ticket) {
          console.error(`Ticket #${ticketId} not found`);
          return false;
        }

        // Get first message to use as initial content
        const messages = await storage.getTicketMessages(ticketId);
        if (messages.length === 0) {
          console.error(`No messages found for ticket #${ticketId}`);
          return false;
        }

        const firstMessage = messages[0];
        const user = await storage.getUser(firstMessage.userId);

        // Create the thread first
        const result = await this.createThreadForTicket(
          ticketId,
          ticket.subject,
          firstMessage.message,
          user?.fullName || `User #${user?.id || 'unknown'}`
        );

        if (!result.success || !result.threadId) {
          console.error(`Failed to create thread for ticket #${ticketId}`);
          return false;
        }
      }

      // Now we should have a thread ID
      const actualThreadId = this.ticketThreads.get(ticketId);
      if (!actualThreadId) {
        console.error(`Thread ID still not found for ticket #${ticketId}`);
        return false;
      }

      const guildId = await this.getGuildId();
      if (!guildId) {
        console.error('Discord guild ID not configured');
        return false;
      }

      // Get the guild and thread
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        console.error(`Guild with ID ${guildId} not found`);
        return false;
      }

      try {
        const thread = await guild.channels.fetch(actualThreadId) as ThreadChannel;
        if (!thread || !thread.isThread()) {
          console.error(`Thread with ID ${actualThreadId} not found in guild ${guildId}`);
          return false;
        }

        // Create an embed for the reply
        const replyEmbed = new EmbedBuilder()
          .setTitle(isAdmin ? '👨‍💼 Staff Reply' : '💬 Customer Reply')
          .setColor(isAdmin ? 0x7289DA : 0xFFAA00) // Blue for staff, amber for customer
          .setDescription(message)
          .setAuthor({ name: userName })
          .setTimestamp();

        // Send the reply as an embed
        await thread.send({ embeds: [replyEmbed] });

        console.log(`Sent reply to Discord thread for ticket #${ticketId}`);
        return true;
      } catch (error) {
        console.error(`Error fetching thread ${actualThreadId}:`, error);

        // Thread might have been deleted, remove from our tracking
        this.ticketThreads.delete(ticketId);
        await storage.deleteDiscordTicketThread(ticketId);
        return false;
      }
    } catch (error: any) {
      console.error(`Error sending reply to Discord thread for ticket #${ticketId}:`, error.message);
      return false;
    }
  }

  /**
   * Handle ticket status change in Discord thread
   * @param ticketId The ticket ID
   * @param status The new status
   * @param userName The user who changed the status
   * @returns Success status
   */
  public async updateThreadStatus(
    ticketId: number,
    status: string,
    userName: string
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled() || !this.client || !this.ready) {
        console.log('Discord bot disabled or not ready, skipping thread status update');
        return false;
      }

      // Get the thread ID for this ticket
      const threadId = this.ticketThreads.get(ticketId);
      if (!threadId) {
        console.log(`No thread found for ticket #${ticketId}`);
        return false;
      }

      const guildId = await this.getGuildId();
      if (!guildId) {
        console.error('Discord guild ID not configured');
        return false;
      }

      // Get the guild and thread
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        console.error(`Guild with ID ${guildId} not found`);
        return false;
      }

      try {
        const thread = await guild.channels.fetch(threadId) as ThreadChannel;
        if (!thread || !thread.isThread()) {
          console.error(`Thread with ID ${threadId} not found in guild ${guildId}`);
          return false;
        }

        // Update the thread
        if (status.toLowerCase() === 'closed') {
          // Create reopen button
          const reopenButton = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`reopen:${ticketId}`)
                .setLabel('Reopen Ticket')
                .setStyle(ButtonStyle.Success)
            );

          // Create embed for ticket closure
          const closedEmbed = new EmbedBuilder()
            .setTitle('🔒 Ticket Closed')
            .setColor(0x808080) // Gray color
            .setDescription('This support ticket has been closed. The thread will be archived.')
            .setAuthor({ name: userName })
            .setTimestamp();

          // Send a message with reopen button and archive the thread
          await thread.send({
            embeds: [closedEmbed],
            components: [reopenButton]
          });
          await thread.setArchived(true);
        } else {
          // Create ticket management buttons (only close, no delete)
          const ticketButtons = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`close:${ticketId}`)
                .setLabel('Close Ticket')
                .setStyle(ButtonStyle.Primary)
            );

          // Create embed for ticket reopening
          const reopenedEmbed = new EmbedBuilder()
            .setTitle('🔓 Ticket Reopened')
            .setColor(0x00FF00) // Green color
            .setDescription('This support ticket has been reopened.')
            .setAuthor({ name: userName })
            .setTimestamp();

          // Send a message and unarchive if needed
          await thread.send({
            embeds: [reopenedEmbed],
            components: [ticketButtons]
          });

          if (thread.archived) {
            await thread.setArchived(false);
          }
        }

        console.log(`Updated Discord thread status for ticket #${ticketId} to ${status}`);
        return true;
      } catch (error) {
        console.error(`Error updating thread ${threadId}:`, error);
        return false;
      }
    } catch (error: any) {
      console.error(`Error updating Discord thread status for ticket #${ticketId}:`, error.message);
      return false;
    }
  }

  /**
   * Handle ticket deletion
   * @param ticketId The ticket ID
   * @param adminName The admin who deleted the ticket
   * @returns Success status
   */
  public async handleTicketDeletion(
    ticketId: number,
    adminName: string
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled() || !this.client || !this.ready) {
        console.log('Discord bot disabled or not ready, skipping thread deletion');
        return false;
      }

      // Get the thread ID for this ticket
      const threadId = this.ticketThreads.get(ticketId);
      if (!threadId) {
        console.log(`No thread found for ticket #${ticketId}`);
        return true; // Still consider this a success as there's nothing to delete
      }

      const guildId = await this.getGuildId();
      if (!guildId) {
        console.error('Discord guild ID not configured');
        return false;
      }

      // Get the guild and thread
      const guild = await this.client.guilds.fetch(guildId);
      if (!guild) {
        console.error(`Guild with ID ${guildId} not found`);
        return false;
      }

      try {
        const thread = await guild.channels.fetch(threadId) as ThreadChannel;
        if (!thread || !thread.isThread()) {
          console.error(`Thread with ID ${threadId} not found in guild ${guildId}`);
          // Remove from our tracking and consider success
          this.ticketThreads.delete(ticketId);
          await storage.deleteDiscordTicketThread(ticketId);
          return true;
        }

        // Create embed for ticket deletion
        const deletedEmbed = new EmbedBuilder()
          .setTitle('🗑️ Ticket Deleted')
          .setColor(0xFF0000) // Red color
          .setDescription('This support ticket has been permanently deleted. The thread will be archived.')
          .setAuthor({ name: adminName })
          .setTimestamp();

        // Send a message that the ticket was deleted
        await thread.send({ embeds: [deletedEmbed] });
        await thread.setArchived(true);

        // Remove from our tracking
        this.ticketThreads.delete(ticketId);
        await storage.deleteDiscordTicketThread(ticketId);

        console.log(`Handled Discord thread for deleted ticket #${ticketId}`);
        return true;
      } catch (error) {
        console.error(`Error handling thread ${threadId} for deleted ticket:`, error);

        // Still remove from our tracking
        this.ticketThreads.delete(ticketId);
        await storage.deleteDiscordTicketThread(ticketId);
        return false;
      }
    } catch (error: any) {
      console.error(`Error handling Discord thread for deleted ticket #${ticketId}:`, error.message);
      return false;
    }
  }

  /**
   * Register slash commands with Discord
   */
  private async registerCommands(): Promise<void> {
    if (this.commandsRegistered || !this.client) {
      return;
    }

    try {
      const botToken = await this.getBotToken();
      const guildId = await this.getGuildId();

      if (!botToken || !guildId) {
        console.log('Discord bot token or guild ID not configured, skipping command registration');
        return;
      }

      // Define commands
      const commands = [
        // Get AI chat commands
        ...this.getAIChatCommands(),

        new SlashCommandBuilder()
          .setName('ticket')
          .setDescription('Manage the current ticket')
          .addSubcommand(subcommand =>
            subcommand
              .setName('close')
              .setDescription('Close the ticket')
          )
          .addSubcommand(subcommand =>
            subcommand
              .setName('reopen')
              .setDescription('Reopen the ticket')
          ),

        new SlashCommandBuilder()
          .setName('status')
          .setDescription('Check the current platform status and service health'),

        new SlashCommandBuilder()
          .setName('help')
          .setDescription('Show all available bot commands and their usage')
          .addStringOption(option =>
            option
              .setName('category')
              .setDescription('Show commands for a specific category')
              .setRequired(false)
              .addChoices(
                { name: 'General', value: 'general' },
                { name: 'Moderation', value: 'moderation' },
                { name: 'AI Assistant', value: 'ai' },
                { name: 'Tickets', value: 'tickets' }
              )
          ),

        // Get moderation commands
        ...this.getModerationCommands(),
      ];

      // Register commands for the specific guild (faster than global registration)
      const rest = new REST().setToken(botToken);

      console.log(`Started refreshing ${commands.length} application commands for guild ${guildId}`);

      await rest.put(
        Routes.applicationGuildCommands(
          this.client.user?.id || 'unknown',
          guildId
        ),
        { body: commands }
      );

      console.log(`Successfully registered ${commands.length} application commands for guild ${guildId}`);
      this.commandsRegistered = true;
    } catch (error: any) {
      console.error('Error registering Discord commands:', error.message);
    }
  }

  /**
   * Handle slash command interactions
   * @param interaction The command interaction
   */
  /**
   * Generic method to ensure a thread is ready for any interaction
   * @param interaction The Discord interaction (command or button)
   * @returns true if the thread is ready, false if there was an issue
   */
  private async ensureThreadIsReady(interaction: ButtonInteraction | ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.channel?.isThread()) {
      return true; // Not in a thread, so no preparation needed
    }

    const thread = interaction.channel as ThreadChannel;
    if (thread.archived) {
      try {
        // Try to unarchive the thread first
        await thread.setArchived(false);
        console.log(`Unarchived thread ${thread.id} to process interaction`);
        return true;
      } catch (archiveError: any) {
        console.log(`Error unarchiving thread: ${archiveError.message}`);
        // Try to respond with error, but don't throw if it fails
        try {
          await interaction.reply({
            content: 'Cannot process this action: The thread is archived. Please try again in a few moments.',
            ephemeral: true
          });
        } catch (replyError: any) {
          console.log('Could not reply to interaction in archived thread');
        }
        return false;
      }
    }

    return true; // Thread is ready
  }

  /**
   * Handle slash commands from Discord
   * @param interaction The command interaction to process
   */
  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Handle ticket commands (these require being in a thread)
      if (interaction.commandName === 'ticket') {
        if (!interaction.channel?.isThread()) {
          await interaction.reply({
            content: 'Ticket commands can only be used in ticket threads.',
            ephemeral: true
          });
          return;
        }

        // Ensure thread is ready for interaction
        if (!await this.ensureThreadIsReady(interaction)) {
          return; // Exit if thread isn't ready
        }

        const thread = interaction.channel as ThreadChannel;
        const ticketId = this.getTicketIdFromThread(thread);

        if (!ticketId) {
          await interaction.reply({
            content: 'This thread is not linked to a ticket.',
            ephemeral: true
          });
          return;
        }

        // Get admin users
        const commandAdminUsers = await storage.getAdminUsers();
        if (commandAdminUsers.length === 0) {
          await interaction.reply({
            content: 'Cannot process command: No admin users found',
            ephemeral: true
          });
          return;
        }

        const commandAdminUser = commandAdminUsers[0]; // Use first admin for attributing actions

        // Verify ticket exists
        const ticket = await storage.getTicket(ticketId);
        if (!ticket) {
          await interaction.reply({
            content: `Ticket #${ticketId} not found or has been deleted.`,
            ephemeral: true
          });
          return;
        }

        const subcommand = interaction.options.getSubcommand(false);
        // Handle ticket subcommands
        if (subcommand === 'close') {
          // Only allow closing tickets that are not already closed
          if (ticket.status.toLowerCase() === 'closed') {
            await interaction.reply({
              content: `Ticket #${ticketId} is already closed.`,
              ephemeral: true
            });
            return;
          }

          // Update ticket status in database
          await storage.updateTicket(ticketId, { status: 'closed' });

          // Add message to the ticket
          const ticketMessage: InsertTicketMessage = {
            ticketId,
            userId: commandAdminUser.id,
            message: `**Ticket Closed via Discord by ${interaction.user.username}**`
          };
          await storage.createTicketMessage(ticketMessage);

          // Send confirmation message to the thread
          await thread.send(`Ticket #${ticketId} has been closed by ${interaction.user.username}.`);
          await thread.setArchived(true);

          await interaction.reply({
            content: `Successfully closed ticket #${ticketId}.`,
            ephemeral: true
          });
        }
        else if (subcommand === 'reopen') {
          // Only allow reopening tickets that are closed
          if (ticket.status.toLowerCase() !== 'closed') {
            await interaction.reply({
              content: `Ticket #${ticketId} is already open.`,
              ephemeral: true
            });
            return;
          }

          // Update ticket status in database
          await storage.updateTicket(ticketId, { status: 'open' });

          // Add message to the ticket
          const ticketMessage: InsertTicketMessage = {
            ticketId,
            userId: commandAdminUser.id,
            message: `**Ticket Reopened via Discord by ${interaction.user.username}**`
          };
          await storage.createTicketMessage(ticketMessage);

          // Send confirmation message and unarchive the thread
          await thread.setArchived(false);
          await thread.send(`Ticket #${ticketId} has been reopened by ${interaction.user.username}.`);

          await interaction.reply({
            content: `Successfully reopened ticket #${ticketId}.`,
            ephemeral: true
          });
        }
      }
      else if (commandName === 'ask') {
        // Handle AI chat command
        const question = interaction.options.getString('question', true);

        // Defer the reply since AI response might take time
        await interaction.deferReply();

        // Get the gemini service
        const geminiService = await import('./gemini-service').then(m => m.GeminiService.getInstance());

        if (!geminiService.isReady()) {
          await interaction.editReply("Sorry, the AI assistant is not available right now. Please try again later.");
          return;
        }

        // Track this user's conversation (simplified, just for the current question)
        const username = interaction.user.username;

        // Generate a response from the AI
        const aiResponse = await geminiService.generateChatResponse(
          question,
          username,
          [] // No conversation history for slash commands for simplicity
        );

        if (!aiResponse.success) {
          await interaction.editReply(`Sorry, I couldn't process your question: ${aiResponse.response}`);
          return;
        }

        // Reply with the AI's response
        await interaction.editReply({
          content: aiResponse.response
        });
      }
    } catch (error: any) {
      // Get a safe thread ID reference
      const threadId = interaction.channel?.isThread() ? (interaction.channel as ThreadChannel).id : 'unknown';
      console.error(`Error handling Discord command for thread #${threadId}:`, error.message);

      // Special handling for common Discord API errors
      if (error.code === 10062) { // Unknown interaction error
        console.log('Unknown interaction error: The interaction response time expired');
        return; // Just return without trying to reply to avoid unhandled promise rejection
      }

      try {
        await interaction.reply({
          content: `An error occurred while processing your command: ${error.message}`,
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError: any) {
        // If we can't reply to the interaction (e.g., it's already timed out), log it and continue
        console.log(`Could not reply to interaction due to: ${replyError.message}`);
      }
    }
  }



  /**
   * Handle button interactions from Discord
   * @param interaction The button interaction to process
   */
  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    try {
      // Handle status command buttons (these don't need thread context)
      if (interaction.customId.startsWith('status_')) {
        await this.handleStatusButton(interaction);
        return;
      }

      // Handle help command buttons (these don't need thread context)
      if (interaction.customId.startsWith('help_')) {
        await this.handleHelpButton(interaction);
        return;
      }

      // Ensure thread is ready for interaction (for ticket-related buttons)
      if (!await this.ensureThreadIsReady(interaction)) {
        return; // Exit if thread isn't ready
      }

      // Extract the button ID and action
      const [action, ticketIdStr] = interaction.customId.split(':');
      const ticketId = parseInt(ticketIdStr);

      if (isNaN(ticketId)) {
        await interaction.reply({
          content: 'Invalid ticket ID in button.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      // Get admin user for attributing actions
      const buttonAdminUsers = await storage.getAdminUsers();
      if (buttonAdminUsers.length === 0) {
        await interaction.reply({
          content: 'Cannot process button: No admin users found',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const buttonAdminUser = buttonAdminUsers[0];

      // Verify ticket exists
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        await interaction.reply({
          content: `Ticket #${ticketId} not found or has been deleted.`,
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (action === 'close') {
        // Handle close ticket button
        if (ticket.status.toLowerCase() === 'closed') {
          await interaction.reply({
            content: `Ticket #${ticketId} is already closed.`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Update ticket status in database
        await storage.updateTicket(ticketId, { status: 'closed' });

        // Add message to the ticket
        const ticketMessage: InsertTicketMessage = {
          ticketId,
          userId: buttonAdminUser.id,
          message: `**Ticket Closed via Discord by ${interaction.user.username}**`
        };
        await storage.createTicketMessage(ticketMessage);

        // Archive the thread if we're in one
        if (interaction.channel?.isThread()) {
          const thread = interaction.channel as ThreadChannel;
          await thread.send(`Ticket #${ticketId} has been closed by ${interaction.user.username}.`);
          await thread.setArchived(true);
        }

        await interaction.reply({
          content: `Successfully closed ticket #${ticketId}.`,
          flags: MessageFlags.Ephemeral
        });
      }
      else if (action === 'reopen') {
        // Handle reopen ticket button
        if (ticket.status.toLowerCase() !== 'closed') {
          await interaction.reply({
            content: `Ticket #${ticketId} is already open.`,
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        // Update ticket status in database
        await storage.updateTicket(ticketId, { status: 'open' });

        // Add message to the ticket
        const ticketMessage: InsertTicketMessage = {
          ticketId,
          userId: buttonAdminUser.id,
          message: `**Ticket Reopened via Discord by ${interaction.user.username}**`
        };
        await storage.createTicketMessage(ticketMessage);

        // Unarchive the thread if we're in one
        if (interaction.channel?.isThread()) {
          const thread = interaction.channel as ThreadChannel;
          await thread.setArchived(false);
          await thread.send(`Ticket #${ticketId} has been reopened by ${interaction.user.username}.`);
        }

        await interaction.reply({
          content: `Successfully reopened ticket #${ticketId}.`,
          flags: MessageFlags.Ephemeral
        });
      }
      // Delete ticket functionality has been removed as requested
    } catch (error: any) {
      console.error('Error handling Discord button interaction:', error.message);

      // Special handling for common Discord API errors
      if (error.code === 10062) { // Unknown interaction error
        console.log('Unknown interaction error: The interaction response time expired');
        return; // Just return without trying to reply to avoid unhandled promise rejection
      }

      try {
        await interaction.reply({
          content: `An error occurred while processing your action: ${error.message}`,
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError: any) {
        // If we can't reply to the interaction (e.g., it's already timed out), log it and continue
        console.log(`Could not reply to interaction due to: ${replyError.message}`);
      }
    }
  }

  /**
   * Send a message that might be longer than Discord's 2000 character limit
   * @param message The Discord message object or interaction to reply to
   * @param content The content to send
   * @param isInteraction Whether this is for a slash command interaction
   * @returns Promise that resolves when all messages are sent
   */
  private async sendLongMessage(message: any, content: string, isInteraction: boolean = false): Promise<void> {
    const MAX_LENGTH = 1990; // Slightly less than 2000 to be safe

    // If content is shorter than the limit, send it as a single message
    if (content.length <= MAX_LENGTH) {
      if (isInteraction) {
        await message.editReply(content);
      } else {
        await message.reply(content);
      }
      return;
    }

    // Split the content into chunks
    const chunks: string[] = [];
    let currentChunk = '';

    // Try to split on paragraphs, sentences, or words to make natural breaks
    const paragraphs = content.split('\n\n');

    for (const paragraph of paragraphs) {
      // If this paragraph alone is too long, we need to split it further
      if (paragraph.length > MAX_LENGTH) {
        // Split on sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);

        for (const sentence of sentences) {
          // If this sentence alone is too long, we need to split it
          if (sentence.length > MAX_LENGTH) {
            // Split on words
            let words = sentence.split(' ');
            let tempChunk = '';

            for (const word of words) {
              if ((tempChunk + ' ' + word).length > MAX_LENGTH) {
                chunks.push(tempChunk);
                tempChunk = word;
              } else {
                tempChunk += (tempChunk ? ' ' : '') + word;
              }
            }

            if (tempChunk) {
              // Add any remaining part
              if ((currentChunk + '\n\n' + tempChunk).length <= MAX_LENGTH) {
                currentChunk += (currentChunk ? '\n\n' : '') + tempChunk;
              } else {
                if (currentChunk) chunks.push(currentChunk);
                currentChunk = tempChunk;
              }
            }
          } else {
            // This sentence fits
            if ((currentChunk + (currentChunk ? ' ' : '') + sentence).length <= MAX_LENGTH) {
              currentChunk += (currentChunk ? ' ' : '') + sentence;
            } else {
              chunks.push(currentChunk);
              currentChunk = sentence;
            }
          }
        }
      } else {
        // This paragraph fits
        if ((currentChunk + '\n\n' + paragraph).length <= MAX_LENGTH) {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        } else {
          chunks.push(currentChunk);
          currentChunk = paragraph;
        }
      }
    }

    // Add the last chunk if there's anything left
    if (currentChunk) {
      chunks.push(currentChunk);
    }

    // Send the first chunk as a reply
    if (chunks.length > 0) {
      const firstChunk = chunks[0] + (chunks.length > 1 ? "\n\n*(continued in next message...)*" : "");

      if (isInteraction) {
        await message.editReply(firstChunk);
      } else {
        await message.reply(firstChunk);
      }
    }

    // Send the rest as follow-ups
    for (let i = 1; i < chunks.length; i++) {
      const isLastChunk = i === chunks.length - 1;
      const chunk = chunks[i] + (!isLastChunk ? "\n\n*(continued in next message...)*" : "");

      if (isInteraction) {
        await message.followUp({
          content: chunk
          // Note: No flags needed here as we want follow-ups to be visible to everyone
        });
      } else {
        // For regular messages, we send a follow-up to the channel
        await message.channel.send(chunk);
      }

      // Add a small delay between messages to avoid rate limits
      if (!isLastChunk) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  /**
   * Get the Discord bot token
   * @returns The bot token or empty string if not set
   */
  private async getBotToken(): Promise<string> {
    const setting = await storage.getSetting('discord_bot_token');
    return setting?.value || '';
  }

  /**
   * Get the Discord guild ID
   * @returns The guild ID or empty string if not set
   */
  private async getGuildId(): Promise<string> {
    const setting = await storage.getSetting('discord_guild_id');
    return setting?.value || '';
  }

  /**
   * Get the Discord channel ID
   * @returns The channel ID or empty string if not set
   */
  private async getChannelId(): Promise<string> {
    const setting = await storage.getSetting('discord_channel_id');
    return setting?.value || '';
  }

  /**
   * Search Discord server members by username
   * @param query Search query (username)
   * @param limit Maximum number of results to return
   * @returns Array of Discord user objects
   */
  public async searchDiscordUsers(query: string, limit: number = 10): Promise<any[]> {
    console.log(`Discord bot search request: query="${query}", limit=${limit}`);

    if (!this.client || !this.ready) {
      console.error('Discord bot is not ready for search');
      return [];
    }

    try {
      const guildId = await this.getGuildId();
      console.log(`Discord guild ID: ${guildId}`);

      if (!guildId) {
        console.error('Discord guild ID not configured');
        return [];
      }

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error(`Discord guild not found with ID: ${guildId}`);
        return [];
      }

      console.log(`Found guild: ${guild.name}, member count: ${guild.memberCount}`);

      // Fetch all members if not cached
      console.log('Fetching guild members...');
      await guild.members.fetch();
      console.log(`Cached members count: ${guild.members.cache.size}`);

      // Search members by username (case-insensitive)
      const searchResults = guild.members.cache
        .filter(member => {
          const username = member.user.username.toLowerCase();
          const globalName = member.user.globalName?.toLowerCase() || '';
          const displayName = member.displayName.toLowerCase();
          const queryLower = query.toLowerCase();

          return username.includes(queryLower) ||
                 globalName.includes(queryLower) ||
                 displayName.includes(queryLower);
        })
        .first(limit)
        .map(member => ({
          id: member.user.id,
          username: member.user.username,
          globalName: member.user.globalName,
          displayName: member.displayName,
          avatar: member.user.displayAvatarURL({ size: 128 }),
          bot: member.user.bot
        }));

      console.log(`Search results for "${query}": ${searchResults.length} members found`);
      return searchResults;
    } catch (error) {
      console.error('Error searching Discord users:', error);
      return [];
    }
  }

  /**
   * Get Discord user information by user ID
   * @param userId Discord user ID
   * @returns Discord user object or null
   */
  public async getDiscordUser(userId: string): Promise<any | null> {
    console.log(`Discord bot get user request: userId="${userId}"`);

    if (!this.client || !this.ready) {
      console.error('Discord bot is not ready for user fetch');
      return null;
    }

    try {
      const guildId = await this.getGuildId();
      console.log(`Discord guild ID: ${guildId}`);

      if (!guildId) {
        console.error('Discord guild ID not configured');
        return null;
      }

      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) {
        console.error(`Discord guild not found with ID: ${guildId}`);
        return null;
      }

      console.log(`Fetching member with ID: ${userId} from guild: ${guild.name}`);
      const member = await guild.members.fetch(userId);
      if (!member) {
        console.log(`Member not found with ID: ${userId}`);
        return null;
      }

      const userInfo = {
        id: member.user.id,
        username: member.user.username,
        globalName: member.user.globalName,
        displayName: member.displayName,
        avatar: member.user.displayAvatarURL({ size: 128 }),
        bot: member.user.bot
      };

      console.log(`Successfully fetched user: ${userInfo.username}`);
      return userInfo;
    } catch (error) {
      console.error(`Error getting Discord user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Handle direct messages to the bot
   * @param message The message object from Discord
   */
  private async handleDirectMessage(message: any): Promise<void> {
    // Skip messages from the bot itself
    if (message.author.bot) return;

    try {
      // Show typing indicator
      await message.channel.sendTyping();

      const userId = message.author.id;
      const username = message.author.username;
      const question = message.content;

      // Get properly formatted conversation history
      const conversation = this.getFormattedConversation(userId);

      // Add the user's question to the conversation with proper formatting for Gemini API
      conversation.push({role: "user", parts: [{text: question}]});

      // Get the gemini service and rate limiter
      const geminiService = await import('./gemini-service').then(m => m.geminiService);
      const rateLimiter = await import('./gemini-rate-limiter').then(m => m.geminiRateLimiter);

      if (!geminiService.isReady()) {
        await message.reply("Sorry, the AI assistant is not available right now. Please try again later or create a support ticket.");
        return;
      }

      // Check rate limiting for Discord user
      const rateCheck = rateLimiter.checkDiscordUserAllowed(userId);
      if (!rateCheck.allowed) {
        await message.reply(rateCheck.message || "You've reached the rate limit. Please try again later.");
        return;
      }

      // Track this request for rate limiting
      rateLimiter.trackUsageForDiscordUser(userId);

      // Generate a response from the AI
      const aiResponse = await geminiService.generateChatResponse(
        question,
        username,
        conversation
      );

      if (!aiResponse.success) {
        await message.reply(`Sorry, I couldn't process your question: ${aiResponse.response}`);
        return;
      }

      // Add the AI's response to the conversation history with proper Gemini API formatting
      conversation.push({role: "model", parts: [{text: aiResponse.response}]});

      // Update the conversation history
      this.userConversations.set(userId, conversation);

      // Send the response, handling long messages
      await this.sendLongMessage(message, aiResponse.response);

    } catch (error: any) {
      console.error('Error handling direct message:', error);
      try {
        await message.reply(`Sorry, I encountered an error: ${error.message}. Please try again later or create a support ticket for assistance.`);
      } catch (replyError) {
        console.error('Error replying to message:', replyError);
      }
    }
  }

  /**
   * Get a properly formatted conversation history for a user
   * @param userId The Discord user ID
   * @returns Properly formatted conversation history for Gemini API
   */
  private getFormattedConversation(userId: string): Array<{role: string, parts: Array<{text: string}>}> {
    // Get existing conversation or create a new one
    const conversation = this.userConversations.get(userId) || [];

    // Limit conversation history to last 10 messages for context
    return conversation.length > 10 ?
      conversation.slice(conversation.length - 10) :
      [...conversation];
  }

  /**
   * Get the AI chat commands for the bot
   * @returns Array of SlashCommandBuilder objects for AI functionality
   */
  private getAIChatCommands(): any[] {
    return [
      new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Ask the AI assistant a question about our services')
        .addStringOption(option =>
          option
            .setName('question')
            .setDescription('What would you like to know?')
            .setRequired(true)
        )
        .toJSON()
    ];
  }

  /**
   * Get the moderation commands for the bot
   * @returns Array of SlashCommandBuilder objects for moderation functionality
   */
  private getModerationCommands(): any[] {
    return [
      // Kick command
      new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to kick')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the kick')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .toJSON(),

      // Ban command
      new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to ban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the ban')
            .setRequired(false)
        )
        .addIntegerOption(option =>
          option
            .setName('delete_days')
            .setDescription('Number of days of messages to delete (0-7)')
            .setMinValue(0)
            .setMaxValue(7)
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON(),

      // Unban command
      new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from the server')
        .addStringOption(option =>
          option
            .setName('user_id')
            .setDescription('The user ID to unban')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the unban')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .toJSON(),

      // Timeout command
      new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to timeout')
            .setRequired(true)
        )
        .addIntegerOption(option =>
          option
            .setName('duration')
            .setDescription('Duration in minutes (1-40320)')
            .setMinValue(1)
            .setMaxValue(40320) // 28 days max
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for the timeout')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

      // Remove timeout command
      new SlashCommandBuilder()
        .setName('untimeout')
        .setDescription('Remove timeout from a member')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to remove timeout from')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('reason')
            .setDescription('Reason for removing timeout')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

      // Clear messages command
      new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clear messages from the channel')
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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .toJSON(),

      // Warn command
      new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a member')
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
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

      // User info command
      new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Get information about a user')
        .addUserOption(option =>
          option
            .setName('user')
            .setDescription('The user to get info about')
            .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),

      // Server info command
      new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Get information about the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .toJSON(),
    ];
  }

  /**
   * Check if a command is a moderation command
   * @param commandName The command name to check
   * @returns True if it's a moderation command
   */
  private isModerationCommand(commandName: string): boolean {
    const moderationCommands = ['kick', 'ban', 'unban', 'timeout', 'untimeout', 'clear', 'warn', 'userinfo', 'serverinfo'];
    return moderationCommands.includes(commandName);
  }

  /**
   * Check if a user has permission to use moderation commands
   * @param interaction The Discord command interaction
   * @returns True if user has permission
   */
  private async hasModeratorPermission(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (!interaction.guild || !interaction.member) {
      return false;
    }

    const member = interaction.member as GuildMember;

    // Check if user has the required Discord permissions
    const requiredPermissions = {
      'kick': PermissionFlagsBits.KickMembers,
      'ban': PermissionFlagsBits.BanMembers,
      'unban': PermissionFlagsBits.BanMembers,
      'timeout': PermissionFlagsBits.ModerateMembers,
      'untimeout': PermissionFlagsBits.ModerateMembers,
      'clear': PermissionFlagsBits.ManageMessages,
      'warn': PermissionFlagsBits.ModerateMembers,
      'userinfo': PermissionFlagsBits.ModerateMembers,
      'serverinfo': PermissionFlagsBits.ModerateMembers,
    };

    const requiredPermission = requiredPermissions[interaction.commandName as keyof typeof requiredPermissions];
    if (requiredPermission && !member.permissions.has(requiredPermission)) {
      return false;
    }

    // Check if user is in allowed roles/users from SkyPANEL settings
    const allowedRoleIds = await this.getAllowedRoleIds();
    const allowedUserIds = await this.getAllowedUserIds();

    // Check if user has any of the allowed roles
    if (allowedRoleIds.length > 0) {
      const hasAllowedRole = member.roles.cache.some(role => allowedRoleIds.includes(role.id));
      if (hasAllowedRole) {
        return true;
      }
    }

    // Check if user is in allowed users list
    if (allowedUserIds.length > 0 && allowedUserIds.includes(interaction.user.id)) {
      return true;
    }

    // If no specific roles/users are configured, fall back to Discord permissions
    return allowedRoleIds.length === 0 && allowedUserIds.length === 0;
  }

  /**
   * Get allowed role IDs from settings
   * @returns Array of allowed role IDs
   */
  private async getAllowedRoleIds(): Promise<string[]> {
    const setting = await storage.getSetting('discord_allowed_role_ids');
    if (!setting?.value) return [];
    return setting.value.split(',').map(id => id.trim()).filter(id => id.length > 0);
  }

  /**
   * Get allowed user IDs from settings
   * @returns Array of allowed user IDs
   */
  private async getAllowedUserIds(): Promise<string[]> {
    const setting = await storage.getSetting('discord_allowed_user_ids');
    if (!setting?.value) return [];
    return setting.value.split(',').map(id => id.trim()).filter(id => id.length > 0);
  }

  /**
   * Handle moderation commands
   * @param interaction The Discord command interaction
   */
  private async handleModerationCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Check if user has permission to use moderation commands
      if (!await this.hasModeratorPermission(interaction)) {
        await interaction.reply({
          content: '❌ You do not have permission to use moderation commands.',
          ephemeral: true
        });
        return;
      }

      // Handle different moderation commands
      switch (interaction.commandName) {
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
        default:
          await interaction.reply({
            content: '❌ Unknown moderation command.',
            ephemeral: true
          });
      }
    } catch (error: any) {
      console.error('Error handling moderation command:', error);

      const errorMessage = error.code === 50013
        ? '❌ I don\'t have permission to perform this action. Please check my role permissions.'
        : `❌ An error occurred: ${error.message}`;

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        console.error('Failed to send error message:', replyError);
      }
    }
  }

  /**
   * Handle AI-related slash commands
   * @param interaction The Discord command interaction
   */
  private async handleAICommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Defer the reply to give us time to generate a response
      await interaction.deferReply({ ephemeral: false });

      const userId = interaction.user.id;
      const username = interaction.user.username;
      const question = interaction.options.getString('question')!;

      if (!question || question.trim() === '') {
        await interaction.editReply("Please provide a question to ask the AI assistant.");
        return;
      }

      // Get properly formatted conversation history
      const conversation = this.getFormattedConversation(userId);

      // Add the user's question to the conversation with proper formatting for Gemini API
      conversation.push({role: "user", parts: [{text: question}]});

      // Get the gemini service and rate limiter
      const geminiService = await import('./gemini-service').then(m => m.geminiService);
      const rateLimiter = await import('./gemini-rate-limiter').then(m => m.geminiRateLimiter);

      if (!geminiService.isReady()) {
        await interaction.editReply("Sorry, the AI assistant is not available right now. Please try again later or create a support ticket.");
        return;
      }

      // Check rate limiting for Discord user
      const rateCheck = rateLimiter.checkDiscordUserAllowed(userId);
      if (!rateCheck.allowed) {
        await interaction.editReply(rateCheck.message || "You've reached the rate limit. Please try again later.");
        return;
      }

      // Track this request for rate limiting
      rateLimiter.trackUsageForDiscordUser(userId);

      // Generate a response from the AI
      const aiResponse = await geminiService.generateChatResponse(
        question,
        username,
        conversation
      );

      if (!aiResponse.success) {
        await interaction.editReply(`Sorry, I couldn't process your question: ${aiResponse.response}`);
        return;
      }

      // Add the AI's response to the conversation history with proper Gemini API formatting
      conversation.push({role: "model", parts: [{text: aiResponse.response}]});

      // Update the conversation history
      this.userConversations.set(userId, conversation);

      // Send the response, handling long messages
      await this.sendLongMessage(interaction, aiResponse.response, true);

    } catch (error: any) {
      console.error('Error handling AI command:', error);
      try {
        await interaction.editReply(`Sorry, I encountered an error: ${error.message}. Please try again later or create a support ticket for assistance.`);
      } catch (replyError) {
        console.error('Error replying to interaction:', replyError);
      }
    }
  }

  /**
   * Handle status command button interactions
   * @param interaction The Discord button interaction
   */
  private async handleStatusButton(interaction: ButtonInteraction): Promise<void> {
    try {
      await interaction.deferUpdate();

      const buttonAction = interaction.customId.replace('status_', '');

      if (buttonAction === 'refresh') {
        // Refresh the status data
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

        // Create updated embeds
        const statusEmbed = new EmbedBuilder()
          .setTitle('🖥️ SkyPANEL Platform Status')
          .setDescription(statusMessage)
          .setColor(statusColor)
          .setTimestamp()
          .setFooter({ text: 'Status updated' });

        statusEmbed.addFields({
          name: '📊 Overall Status',
          value: `${getStatusEmoji(overallStatus)} **${overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}**`,
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

        // Create services embed (first page)
        const servicesEmbed = new EmbedBuilder()
          .setTitle('🔧 Service Status Details')
          .setColor(statusColor)
          .setTimestamp();

        const servicesPerPage = 6;
        const pageServices = serviceStatus.services.slice(0, servicesPerPage);

        pageServices.forEach(service => {
          const uptimeText = `${service.uptimePercentage.toFixed(2)}% uptime`;
          servicesEmbed.addFields({
            name: `${getStatusEmoji(service.status)} ${service.name}`,
            value: `**${service.status.charAt(0).toUpperCase() + service.status.slice(1)}**\n${uptimeText}`,
            inline: true
          });
        });

        // Update the message
        await interaction.editReply({
          embeds: [statusEmbed, servicesEmbed]
        });
      }
      // Note: Pagination buttons (prev/next) would need more complex state management
      // For now, we'll just handle refresh

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
   * Handle the /status command
   * @param interaction The Discord slash command interaction
   */
  private async handleStatusCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Check if interaction has already been acknowledged
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply();
      }

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
        .setTitle('🖥️ SkyPANEL Platform Status')
        .setDescription(statusMessage)
        .setColor(statusColor)
        .setTimestamp()
        .setFooter({ text: 'Status updated' });

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
              .setCustomId('status_prev')
              .setLabel('◀️ Previous')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === 0),
            new ButtonBuilder()
              .setCustomId('status_next')
              .setLabel('Next ▶️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(currentPage === totalPages - 1)
          );
        components.push(paginationRow);
      }

      // Add refresh button
      const actionRow = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('status_refresh')
            .setLabel('🔄 Refresh')
            .setStyle(ButtonStyle.Primary)
        );
      components.push(actionRow);

      // Send the response
      if (interaction.deferred) {
        await interaction.editReply({
          embeds: [statusEmbed, servicesEmbed],
          components
        });
      } else {
        await interaction.reply({
          embeds: [statusEmbed, servicesEmbed],
          components
        });
      }

      // Store pagination state for this interaction
      if (totalPages > 1) {
        // We'll handle pagination in the button handler
        setTimeout(() => {
          // Clean up pagination state after 5 minutes
        }, 5 * 60 * 1000);
      }

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

  /**
   * Handle kick command
   * @param interaction The Discord command interaction
   */
  private async handleKickCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.kickable) {
        await interaction.reply({ content: '❌ I cannot kick this user. They may have higher permissions than me.', ephemeral: true });
        return;
      }

      if (member.id === interaction.user.id) {
        await interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
        return;
      }

      await member.kick(reason);

      const embed = new EmbedBuilder()
        .setColor(0xFF6B35)
        .setTitle('🦶 Member Kicked')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to kick user: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle ban command
   * @param interaction The Discord command interaction
   */
  private async handleBanCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') || 0;

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (member && !member.bannable) {
        await interaction.reply({ content: '❌ I cannot ban this user. They may have higher permissions than me.', ephemeral: true });
        return;
      }

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
        return;
      }

      await interaction.guild.members.ban(targetUser, { reason, deleteMessageDays: deleteDays });

      const embed = new EmbedBuilder()
        .setColor(0xDC143C)
        .setTitle('🔨 Member Banned')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false },
          { name: 'Messages Deleted', value: `${deleteDays} days`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to ban user: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle unban command
   * @param interaction The Discord command interaction
   */
  private async handleUnbanCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const userId = interaction.options.getString('user_id', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const bannedUser = await interaction.guild.bans.fetch(userId).catch(() => null);

      if (!bannedUser) {
        await interaction.reply({ content: '❌ This user is not banned.', ephemeral: true });
        return;
      }

      await interaction.guild.members.unban(userId, reason);

      const embed = new EmbedBuilder()
        .setColor(0x32CD32)
        .setTitle('🔓 Member Unbanned')
        .addFields(
          { name: 'User', value: `${bannedUser.user.tag} (${bannedUser.user.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to unban user: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle timeout command
   * @param interaction The Discord command interaction
   */
  private async handleTimeoutCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const duration = interaction.options.getInteger('duration', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.moderatable) {
        await interaction.reply({ content: '❌ I cannot timeout this user. They may have higher permissions than me.', ephemeral: true });
        return;
      }

      if (member.id === interaction.user.id) {
        await interaction.reply({ content: '❌ You cannot timeout yourself.', ephemeral: true });
        return;
      }

      const timeoutUntil = new Date(Date.now() + duration * 60 * 1000);
      await member.timeout(duration * 60 * 1000, reason);

      const embed = new EmbedBuilder()
        .setColor(0xFFA500)
        .setTitle('⏰ Member Timed Out')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Duration', value: `${duration} minutes`, inline: true },
          { name: 'Until', value: `<t:${Math.floor(timeoutUntil.getTime() / 1000)}:F>`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to timeout user: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle untimeout command
   * @param interaction The Discord command interaction
   */
  private async handleUntimeoutCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.isCommunicationDisabled()) {
        await interaction.reply({ content: '❌ This user is not timed out.', ephemeral: true });
        return;
      }

      await member.timeout(null, reason);

      const embed = new EmbedBuilder()
        .setColor(0x32CD32)
        .setTitle('✅ Timeout Removed')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to remove timeout: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle clear command
   * @param interaction The Discord command interaction
   */
  private async handleClearCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const amount = interaction.options.getInteger('amount', true);
    const targetUser = interaction.options.getUser('user');

    if (!interaction.guild || !interaction.channel) {
      await interaction.reply({ content: '❌ This command can only be used in a server channel.', ephemeral: true });
      return;
    }

    try {
      await interaction.deferReply({ ephemeral: true });

      const channel = interaction.channel;
      if (channel.type !== ChannelType.GuildText) {
        await interaction.editReply({ content: '❌ This command can only be used in text channels.' });
        return;
      }

      // Fetch messages (Discord limit is 100, so we can't fetch more than that)
      const fetchLimit = Math.min(amount, 100);
      const messages = await channel.messages.fetch({ limit: fetchLimit });

      let messagesToDelete = Array.from(messages.values());

      // Filter by user if specified
      if (targetUser) {
        messagesToDelete = messagesToDelete.filter(msg => msg.author.id === targetUser.id);
      }

      // Remove the command message from deletion list (if it's in the fetched messages)
      messagesToDelete = messagesToDelete.filter(msg => msg.id !== interaction.id);

      // If we need to delete more messages than we fetched, limit to what we have
      if (messagesToDelete.length > amount) {
        messagesToDelete = messagesToDelete.slice(0, amount);
      }

      // Discord only allows bulk delete for messages younger than 14 days
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const recentMessages = messagesToDelete.filter(msg => msg.createdTimestamp > twoWeeksAgo);
      const oldMessages = messagesToDelete.filter(msg => msg.createdTimestamp <= twoWeeksAgo);

      let deletedCount = 0;

      // Bulk delete recent messages
      if (recentMessages.length > 0) {
        if (recentMessages.length === 1) {
          await recentMessages[0].delete();
          deletedCount = 1;
        } else {
          const deleted = await channel.bulkDelete(recentMessages, true);
          deletedCount += deleted.size;
        }
      }

      // Delete old messages individually
      for (const message of oldMessages) {
        try {
          await message.delete();
          deletedCount++;
        } catch (error) {
          // Skip messages that can't be deleted
        }
      }

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('🧹 Messages Cleared')
        .addFields(
          { name: 'Messages Deleted', value: deletedCount.toString(), inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true }
        );

      if (targetUser) {
        embed.addFields({ name: 'Target User', value: `${targetUser.tag}`, inline: true });
      }

      embed.setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.editReply({ content: `❌ Failed to clear messages: ${error.message}` });
    }
  }

  /**
   * Handle warn command
   * @param interaction The Discord command interaction
   */
  private async handleWarnCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason', true);

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (member.id === interaction.user.id) {
        await interaction.reply({ content: '❌ You cannot warn yourself.', ephemeral: true });
        return;
      }

      // Try to send a DM to the user
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(0xFFFF00)
          .setTitle('⚠️ Warning Received')
          .addFields(
            { name: 'Server', value: interaction.guild.name, inline: true },
            { name: 'Moderator', value: interaction.user.tag, inline: true },
            { name: 'Reason', value: reason, inline: false }
          )
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        // User has DMs disabled or blocked the bot
      }

      const embed = new EmbedBuilder()
        .setColor(0xFFFF00)
        .setTitle('⚠️ Member Warned')
        .addFields(
          { name: 'User', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
          { name: 'Moderator', value: `${interaction.user.tag}`, inline: true },
          { name: 'Reason', value: reason, inline: false }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to warn user: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle userinfo command
   * @param interaction The Discord command interaction
   */
  private async handleUserInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const targetUser = interaction.options.getUser('user') || interaction.user;

    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('👤 User Information')
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'Username', value: targetUser.tag, inline: true },
          { name: 'ID', value: targetUser.id, inline: true },
          { name: 'Nickname', value: member.nickname || 'None', inline: true },
          { name: 'Account Created', value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Joined Server', value: `<t:${Math.floor(member.joinedTimestamp! / 1000)}:F>`, inline: true },
          { name: 'Roles', value: member.roles.cache.filter(role => role.name !== '@everyone').map(role => role.toString()).join(', ') || 'None', inline: false }
        )
        .setTimestamp();

      if (member.isCommunicationDisabled()) {
        embed.addFields({
          name: 'Timeout',
          value: `Until <t:${Math.floor(member.communicationDisabledUntil!.getTime() / 1000)}:F>`,
          inline: true
        });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({ content: `❌ Failed to get user info: ${error.message}`, ephemeral: true });
    }
  }

  /**
   * Handle serverinfo command
   * @param interaction The Discord command interaction
   */
  private async handleServerInfoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guild) {
      await interaction.reply({ content: '❌ This command can only be used in a server.', ephemeral: true });
      return;
    }

    try {
      const guild = interaction.guild;

      // Fetch additional guild data
      await guild.fetch();

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🏰 Server Information')
        .setThumbnail(guild.iconURL({ dynamic: true }))
        .addFields(
          { name: 'Server Name', value: guild.name, inline: true },
          { name: 'Server ID', value: guild.id, inline: true },
          { name: 'Owner', value: `<@${guild.ownerId}>`, inline: true },
          { name: 'Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true },
          { name: 'Members', value: guild.memberCount.toString(), inline: true },
          { name: 'Channels', value: guild.channels.cache.size.toString(), inline: true },
          { name: 'Roles', value: guild.roles.cache.size.toString(), inline: true },
          { name: 'Boost Level', value: guild.premiumTier.toString(), inline: true },
          { name: 'Boost Count', value: guild.premiumSubscriptionCount?.toString() || '0', inline: true }
        )
        .setTimestamp();

      if (guild.description) {
        embed.addFields({ name: 'Description', value: guild.description, inline: false });
      }

      await interaction.reply({ embeds: [embed] });
    } catch (error: any) {
      await interaction.reply({
        content: `❌ Failed to get server info: ${error.message}`,
        flags: MessageFlags.Ephemeral
      });
    }
  }

  /**
   * Handle help command
   * @param interaction The Discord command interaction
   */
  private async handleHelpCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    try {
      // Defer the reply immediately to prevent timeout
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const category = interaction.options.getString('category');

      if (category) {
        await this.handleCategoryHelp(interaction, category);
      } else {
        await this.handleGeneralHelp(interaction);
      }
    } catch (error: any) {
      console.error('Error handling help command:', error);

      // Special handling for common Discord API errors
      if (error.code === 10062) { // Unknown interaction error
        console.log('Unknown interaction error: The interaction response time expired');
        return; // Just return without trying to reply to avoid unhandled promise rejection
      }

      try {
        // Check if we can still reply to the interaction
        if (interaction.deferred) {
          await interaction.editReply({
            content: '❌ Sorry, I encountered an error while showing help information.'
          });
        } else {
          await interaction.reply({
            content: '❌ Sorry, I encountered an error while showing help information.',
            flags: MessageFlags.Ephemeral
          });
        }
      } catch (replyError: any) {
        // If we can't reply to the interaction (e.g., it's already timed out), log it and continue
        console.log(`Could not reply to help interaction due to: ${replyError.message}`);
      }
    }
  }

  /**
   * Handle general help (overview of all commands)
   * @param interaction The Discord command interaction
   */
  private async handleGeneralHelp(interaction: ChatInputCommandInteraction): Promise<void> {
    // Build the embed quickly to avoid delays
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🤖 SkyPANEL Bot Commands')
      .setDescription('Here are all the available commands. Use `/help category:name` for detailed information about specific command categories.')
      .setThumbnail(this.client?.user?.displayAvatarURL() || null)
      .addFields(
        {
          name: '🔧 **General Commands**',
          value: '`/help` - Show this help menu\n`/status` - Check platform status',
          inline: false
        },
        {
          name: '🤖 **AI Assistant**',
          value: '`/ask` - Ask the AI assistant questions\n*Also works in DMs!*',
          inline: false
        },
        {
          name: '🎫 **Ticket Management**',
          value: '`/ticket close` - Close current ticket\n`/ticket reopen` - Reopen current ticket\n*Only works in ticket threads*',
          inline: false
        },
        {
          name: '🛡️ **Moderation Commands**',
          value: '`/kick` `/ban` `/unban` `/timeout` `/untimeout`\n`/clear` `/warn` `/userinfo` `/serverinfo`\n*Requires appropriate permissions*',
          inline: false
        }
      )
      .setFooter({
        text: 'Use /help category:moderation for detailed moderation command info',
        iconURL: interaction.user.displayAvatarURL()
      })
      .setTimestamp();

    // Check permissions quickly and safely
    let hasModPerms = false;
    try {
      if (interaction.guild && interaction.member) {
        const member = interaction.member as GuildMember;
        hasModPerms = member.permissions.has([
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageMessages
        ]);
      }
    } catch (permError) {
      // If permission checking fails, just continue without showing mod perms
      console.log('Permission check failed in help command:', permError);
    }

    if (hasModPerms) {
      embed.addFields({
        name: '✅ **Your Permissions**',
        value: 'You have access to moderation commands!',
        inline: false
      });
    }

    // Create navigation buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help_general')
          .setLabel('🔧 General')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_moderation')
          .setLabel('🛡️ Moderation')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_ai')
          .setLabel('🤖 AI Assistant')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId('help_tickets')
          .setLabel('🎫 Tickets')
          .setStyle(ButtonStyle.Secondary)
      );

    // Use editReply since we deferred the interaction
    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  /**
   * Handle category-specific help
   * @param interaction The Discord command interaction
   * @param category The help category to show
   */
  private async handleCategoryHelp(interaction: ChatInputCommandInteraction, category: string): Promise<void> {
    let embed: EmbedBuilder;

    switch (category) {
      case 'general':
        embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🔧 General Commands')
          .setDescription('Basic bot commands available to everyone.')
          .addFields(
            {
              name: '`/help [category]`',
              value: '**Description:** Show help information\n**Usage:** `/help` or `/help category:moderation`\n**Permissions:** None required',
              inline: false
            },
            {
              name: '`/status`',
              value: '**Description:** Check SkyPANEL platform status\n**Usage:** `/status`\n**Permissions:** None required\n**Features:** Real-time service status, refresh button',
              inline: false
            }
          );
        break;

      case 'ai':
        embed = new EmbedBuilder()
          .setColor(0x9B59B6)
          .setTitle('🤖 AI Assistant Commands')
          .setDescription('Interact with the AI-powered support assistant.')
          .addFields(
            {
              name: '`/ask <question>`',
              value: '**Description:** Ask the AI assistant about SkyPANEL services\n**Usage:** `/ask question:How do I create a VPS?`\n**Permissions:** None required\n**Rate Limits:** Applied per user',
              inline: false
            },
            {
              name: '💬 **Direct Messages**',
              value: 'You can also send direct messages to the bot for AI assistance!\nJust send a message and the AI will respond.',
              inline: false
            },
            {
              name: '🔄 **Conversation Memory**',
              value: 'The AI remembers your conversation context for better responses.',
              inline: false
            }
          );
        break;

      case 'tickets':
        embed = new EmbedBuilder()
          .setColor(0xE67E22)
          .setTitle('🎫 Ticket Management Commands')
          .setDescription('Manage support tickets (only works in ticket threads).')
          .addFields(
            {
              name: '`/ticket close`',
              value: '**Description:** Close the current support ticket\n**Usage:** `/ticket close`\n**Permissions:** Must be in ticket thread\n**Effect:** Marks ticket as resolved',
              inline: false
            },
            {
              name: '`/ticket reopen`',
              value: '**Description:** Reopen a closed ticket\n**Usage:** `/ticket reopen`\n**Permissions:** Must be in ticket thread\n**Effect:** Marks ticket as active again',
              inline: false
            },
            {
              name: '📝 **Ticket Integration**',
              value: 'Messages in ticket threads are automatically synced with the SkyPANEL ticket system.',
              inline: false
            }
          );
        break;

      case 'moderation':
        embed = new EmbedBuilder()
          .setColor(0xE74C3C)
          .setTitle('🛡️ Moderation Commands')
          .setDescription('Server moderation tools (requires appropriate permissions).')
          .addFields(
            {
              name: '**Member Actions**',
              value: '`/kick user reason` - Kick a member\n`/ban user reason delete_days` - Ban a member\n`/unban user_id reason` - Unban a user\n`/timeout user duration reason` - Timeout a member\n`/untimeout user reason` - Remove timeout',
              inline: false
            },
            {
              name: '**Message Management**',
              value: '`/clear amount [user]` - Delete messages (1-100)\n`/warn user reason` - Warn a member',
              inline: false
            },
            {
              name: '**Information**',
              value: '`/userinfo [user]` - Get user information\n`/serverinfo` - Get server information',
              inline: false
            },
            {
              name: '🔐 **Required Permissions**',
              value: 'Commands require specific Discord permissions:\n• Kick/Ban Members • Moderate Members • Manage Messages',
              inline: false
            }
          );
        break;

      default:
        await interaction.editReply({
          content: '❌ Unknown help category. Use `/help` to see all available categories.'
        });
        return;
    }

    // Add back button
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('help_back')
          .setLabel('⬅️ Back to Overview')
          .setStyle(ButtonStyle.Primary)
      );

    embed.setFooter({
      text: `Requested by ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL()
    }).setTimestamp();

    // Use editReply since we deferred the interaction
    await interaction.editReply({ embeds: [embed], components: [row] });
  }

  /**
   * Handle help button interactions
   * @param interaction The Discord button interaction
   */
  private async handleHelpButton(interaction: ButtonInteraction): Promise<void> {
    try {
      await interaction.deferUpdate();

      const buttonAction = interaction.customId.replace('help_', '');

      if (buttonAction === 'back') {
        // Show the general help overview
        await this.updateHelpMessage(interaction, null);
      } else {
        // Show specific category help
        await this.updateHelpMessage(interaction, buttonAction);
      }
    } catch (error: any) {
      console.error('Error handling help button:', error);

      // Special handling for common Discord API errors
      if (error.code === 10062) { // Unknown interaction error
        console.log('Unknown interaction error: The interaction response time expired');
        return; // Just return without trying to reply to avoid unhandled promise rejection
      }

      try {
        await interaction.followUp({
          content: '❌ Sorry, I encountered an error while updating the help information.',
          flags: MessageFlags.Ephemeral
        });
      } catch (replyError: any) {
        console.log(`Could not reply to help button interaction due to: ${replyError.message}`);
      }
    }
  }

  /**
   * Update help message for button interactions
   * @param interaction The Discord button interaction
   * @param category The help category to show (null for general overview)
   */
  private async updateHelpMessage(interaction: ButtonInteraction, category: string | null): Promise<void> {
    let embed: EmbedBuilder;
    let components: ActionRowBuilder<ButtonBuilder>[] = [];

    if (!category) {
      // Show general help overview
      embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🤖 SkyPANEL Bot Commands')
        .setDescription('Here are all the available commands. Click the buttons below for detailed information about specific command categories.')
        .setThumbnail(this.client?.user?.displayAvatarURL() || null)
        .addFields(
          {
            name: '🔧 **General Commands**',
            value: '`/help` - Show this help menu\n`/status` - Check platform status',
            inline: false
          },
          {
            name: '🤖 **AI Assistant**',
            value: '`/ask` - Ask the AI assistant questions\n*Also works in DMs with conversation memory!*',
            inline: false
          },
          {
            name: '🎫 **Ticket Management**',
            value: '`/ticket close` - Close current ticket\n`/ticket reopen` - Reopen current ticket\n*Only works in ticket threads*',
            inline: false
          },
          {
            name: '🛡️ **Moderation Commands**',
            value: '`/kick` `/ban` `/unban` `/timeout` `/untimeout`\n`/clear` `/warn` `/userinfo` `/serverinfo`\n*Requires appropriate permissions*',
            inline: false
          }
        )
        .setFooter({
          text: 'Click the buttons below for detailed command information',
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      // Add permission info if user has moderation permissions
      if (interaction.guild && interaction.member) {
        const member = interaction.member as GuildMember;
        const hasModPerms = member.permissions.has([
          PermissionFlagsBits.KickMembers,
          PermissionFlagsBits.BanMembers,
          PermissionFlagsBits.ModerateMembers,
          PermissionFlagsBits.ManageMessages
        ]);

        if (hasModPerms) {
          embed.addFields({
            name: '✅ **Your Permissions**',
            value: 'You have access to moderation commands!',
            inline: false
          });
        }
      }

      // Create navigation buttons
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_general')
            .setLabel('🔧 General')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_moderation')
            .setLabel('🛡️ Moderation')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_ai')
            .setLabel('🤖 AI Assistant')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('help_tickets')
            .setLabel('🎫 Tickets')
            .setStyle(ButtonStyle.Secondary)
        );

      components = [row];
    } else {
      // Show category-specific help
      switch (category) {
        case 'general':
          embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🔧 General Commands')
            .setDescription('Basic bot commands available to everyone.')
            .addFields(
              {
                name: '`/help [category]`',
                value: '**Description:** Show help information\n**Usage:** `/help` or `/help category:moderation`\n**Permissions:** None required',
                inline: false
              },
              {
                name: '`/status`',
                value: '**Description:** Check SkyPANEL platform status\n**Usage:** `/status`\n**Permissions:** None required\n**Features:** Real-time service status, refresh button',
                inline: false
              }
            );
          break;

        case 'ai':
          embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🤖 AI Assistant Commands')
            .setDescription('Interact with the AI-powered support assistant.')
            .addFields(
              {
                name: '`/ask <question>`',
                value: '**Description:** Ask the AI assistant about SkyPANEL services\n**Usage:** `/ask question:How do I create a VPS?`\n**Permissions:** None required\n**Rate Limits:** Applied per user',
                inline: false
              },
              {
                name: '💬 **Direct Messages**',
                value: 'You can also send direct messages to the bot for AI assistance!\nJust send a message and the AI will respond with full conversation context.',
                inline: false
              },
              {
                name: '🔄 **Conversation Memory**',
                value: 'The AI remembers your conversation context for better responses.\nEach user has their own conversation history (last 10 messages).',
                inline: false
              },
              {
                name: '⚡ **Features**',
                value: '• Instant responses to technical questions\n• Service information and guidance\n• Rate limiting to prevent abuse\n• Integration with SkyPANEL knowledge base.',
                inline: false
              }
            );
          break;

        case 'tickets':
          embed = new EmbedBuilder()
            .setColor(0xE67E22)
            .setTitle('🎫 Ticket Management Commands')
            .setDescription('Manage support tickets (only works in ticket threads).')
            .addFields(
              {
                name: '`/ticket close`',
                value: '**Description:** Close the current support ticket\n**Usage:** `/ticket close`\n**Permissions:** Must be in ticket thread\n**Effect:** Marks ticket as resolved',
                inline: false
              },
              {
                name: '`/ticket reopen`',
                value: '**Description:** Reopen a closed ticket\n**Usage:** `/ticket reopen`\n**Permissions:** Must be in ticket thread\n**Effect:** Marks ticket as active again',
                inline: false
              },
              {
                name: '📝 **Ticket Integration**',
                value: 'Messages in ticket threads are automatically synced with the SkyPANEL ticket system.',
                inline: false
              }
            );
          break;

        case 'moderation':
          embed = new EmbedBuilder()
            .setColor(0xE74C3C)
            .setTitle('🛡️ Moderation Commands')
            .setDescription('Server moderation tools (requires appropriate permissions).')
            .addFields(
              {
                name: '**Member Actions**',
                value: '`/kick user reason` - Kick a member\n`/ban user reason delete_days` - Ban a member\n`/unban user_id reason` - Unban a user\n`/timeout user duration reason` - Timeout a member\n`/untimeout user reason` - Remove timeout',
                inline: false
              },
              {
                name: '**Message Management**',
                value: '`/clear amount [user]` - Delete messages (1-100)\n`/warn user reason` - Warn a member',
                inline: false
              },
              {
                name: '**Information**',
                value: '`/userinfo [user]` - Get user information\n`/serverinfo` - Get server information',
                inline: false
              },
              {
                name: '🔐 **Required Permissions**',
                value: 'Commands require specific Discord permissions:\n• Kick/Ban Members • Moderate Members • Manage Messages',
                inline: false
              }
            );
          break;

        default:
          return; // Invalid category
      }

      // Add back button for category views
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('help_back')
            .setLabel('⬅️ Back to Overview')
            .setStyle(ButtonStyle.Primary)
        );

      components = [row];

      embed.setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL()
      }).setTimestamp();
    }

    await interaction.editReply({ embeds: [embed], components });
  }
}

export const discordBotService = DiscordBotService.getInstance();