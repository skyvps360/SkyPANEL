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
  ChatInputCommandInteraction,
  ButtonInteraction,
  ApplicationCommandType,
  Interaction
} from 'discord.js';
import { storage } from './storage';
import { InsertTicketMessage, InsertDiscordTicketThread } from '../shared/schema';

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
          // Check if it's an AI command
          if (interaction.commandName === 'ask') {
            await this.handleAICommand(interaction);
          } else {
            await this.handleCommand(interaction);
          }
        } else if (interaction.isButton()) {
          await this.handleButton(interaction);
        }
      });

      // Handle messages in threads
      this.client.on(Events.MessageCreate, async (message) => {
        // Handle direct messages to bot
        if (message.channel.type === 1) { // ChannelType.DM = 1
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

      // Post the initial message to the thread with close button
      const sentMessage = await thread.send({
        content: `**New Support Ticket from ${userName}**\n\n**Subject:** ${subject}\n\n${message}\n\n*Reply to this thread to respond to the ticket. You can also use the button below to close the ticket.*`,
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

        // Send the reply
        const prefix = isAdmin ? `**Staff Reply from ${userName}**` : `**Customer Reply from ${userName}**`;
        await thread.send(`${prefix}\n\n${message}`);

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

          // Send a message with reopen button and archive the thread
          await thread.send({
            content: `**Ticket Closed by ${userName}**\n\nThis support ticket has been closed. The thread will be archived.`,
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

          // Send a message and unarchive if needed
          await thread.send({
            content: `**Ticket Reopened by ${userName}**\n\nThis support ticket has been reopened.`,
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

        // Send a message that the ticket was deleted
        await thread.send(`**Ticket Deleted by ${adminName}**\n\nThis support ticket has been permanently deleted. The thread will be archived.`);
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
      // Only handle commands in threads
      if (!interaction.channel?.isThread()) {
        await interaction.reply({
          content: 'This command can only be used in ticket threads.',
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

      const commandName = interaction.commandName;
      const subcommand = interaction.options.getSubcommand(false);

      if (commandName === 'ticket') {
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
          ephemeral: true
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
      // Ensure thread is ready for interaction
      if (!await this.ensureThreadIsReady(interaction)) {
        return; // Exit if thread isn't ready
      }

      // Extract the button ID and action
      const [action, ticketIdStr] = interaction.customId.split(':');
      const ticketId = parseInt(ticketIdStr);

      if (isNaN(ticketId)) {
        await interaction.reply({
          content: 'Invalid ticket ID in button.',
          ephemeral: true
        });
        return;
      }

      // Get admin user for attributing actions
      const buttonAdminUsers = await storage.getAdminUsers();
      if (buttonAdminUsers.length === 0) {
        await interaction.reply({
          content: 'Cannot process button: No admin users found',
          ephemeral: true
        });
        return;
      }

      const buttonAdminUser = buttonAdminUsers[0];

      // Verify ticket exists
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        await interaction.reply({
          content: `Ticket #${ticketId} not found or has been deleted.`,
          ephemeral: true
        });
        return;
      }

      if (action === 'close') {
        // Handle close ticket button
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
          ephemeral: true
        });
      }
      else if (action === 'reopen') {
        // Handle reopen ticket button
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
          ephemeral: true
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
          ephemeral: true
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
          content: chunk,
          ephemeral: false
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
}

export const discordBotService = DiscordBotService.getInstance();