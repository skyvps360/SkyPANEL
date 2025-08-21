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
    MessageFlags,
    ActivityType,
    ComponentType,
    VoiceChannel,
    CategoryChannel,
    UserSelectMenuInteraction,
    StringSelectMenuInteraction
} from 'discord.js';
import {storage} from '../storage';
import {discordTodoService} from './discord-todo-service';
import {discordVerificationService} from './discord-verification-service';
import {discordBackupScheduler} from './discord-backup-scheduler';

/**
 * Core service for managing Discord bot operations
 * Handles initialization and core functionality
 */
export class DiscordBotCore {
    private static instance: DiscordBotCore;
    private client: Client | null = null;
    private ready: boolean = false;
    private commandsRegistered: boolean = false;    // Services that will be initialized
    private ticketService: any;
    private commandHandler: any;
    private moderationService: any;
    private statusService: any;
    private helpService: any;
    private aiService: any;
    private todoService: any;
    private verificationService: any;
    private backupService: any;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordBotCore
     * @returns The DiscordBotCore instance
     */
    public static getInstance(): DiscordBotCore {
        if (!DiscordBotCore.instance) {
            DiscordBotCore.instance = new DiscordBotCore();
        }
        return DiscordBotCore.instance;
    }    /**
     * Set the service instances
     */
    public setServices(
        ticketService: any,
        commandHandler: any,
        moderationService: any,
        statusService: any,
        helpService: any,
        aiService: any,
        verificationService: any,
        backupService: any
    ): void {
        this.ticketService = ticketService;
        this.commandHandler = commandHandler;
        this.moderationService = moderationService;
        this.statusService = statusService;
        this.helpService = helpService;
        this.aiService = aiService;
        this.todoService = discordTodoService;
        this.verificationService = verificationService;
        this.backupService = backupService;
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

                // Set bot status to "watching skyvps360.xyz"
                readyClient.user.setPresence({
                    activities: [{
                        name: 'skyvps360.xyz',
                        type: ActivityType.Watching
                    }],
                    status: 'online'
                });
                console.log('Discord bot status set to: watching skyvps360.xyz');

                this.ready = true;
                await this.ticketService.loadExistingTicketThreads();
                await this.registerCommands();
                
                // Initialize backup scheduler
                await discordBackupScheduler.initialize();
            });

            // Handle slash commands and button interactions
            this.client.on(Events.InteractionCreate, async (interaction) => {
                if (interaction.isChatInputCommand()) {
                    // Handle status command (can be used anywhere)
                    if (interaction.commandName === 'status') {
                        await this.statusService.handleStatusCommand(interaction);
                    }
                    // Handle help command (can be used anywhere)
                    else if (interaction.commandName === 'help') {
                        await this.helpService.handleHelpCommand(interaction);
                    }
                    // Check if it's an AI command
                    else if (interaction.commandName === 'ask') {
                        await this.aiService.handleAICommand(interaction);
                    }
                    // Check if it's a todo command
                    else if (interaction.commandName.startsWith('todo-')) {
                        await this.todoService.handleTodoCommand(interaction);
                    }
                    // Check if it's a moderation command
                    else if (this.moderationService.isModerationCommand(interaction.commandName)) {
                        await this.moderationService.handleModerationCommand(interaction);
                    }
                    // Handle ticket commands (require thread context)
                    else {
                        await this.commandHandler.handleCommand(interaction);
                    }
                } else if (interaction.isButton()) {
                    await this.handleButton(interaction);
                } else if (interaction.isStringSelectMenu()) {
                    await this.handleSelectMenu(interaction);
                }
            });

            // Handle new member joins
            this.client.on(Events.GuildMemberAdd, async (member) => {
                console.log(`New member joined: ${member.user.username} in guild ${member.guild.name}`);
                await this.verificationService.handleNewMemberJoin(member);
            });

            // Handle messages in threads
            this.client.on(Events.MessageCreate, async (message) => {
                // Handle direct messages to bot
                if (message.channel.type === 1) { // ChannelType.DM = 1
                    console.log(`Processing DM from ${message.author.username}: ${message.content}`);
                    await this.aiService.handleDirectMessage(message);
                    return;
                }

                // Only process messages from threads in the configured channel
                if (!message.channel.isThread() || message.author.bot) {
                    return;
                }

                // Find the ticket ID associated with this thread
                const ticketId = this.ticketService.getTicketIdFromThread(message.channel as ThreadChannel);

                if (ticketId) {
                    // Process the message and add it to the ticket
                    // Pass the message object so we can add reactions
                    await this.ticketService.processDiscordMessageToTicket(ticketId, message.author.username, message.content, message);
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
     * Register slash commands with Discord
     */
    public async registerCommands(): Promise<void> {
        if (this.commandsRegistered) {
            console.log('Commands already registered, skipping');
            return;
        }

        try {
            const botToken = await this.getBotToken();
            const guildId = await this.getGuildId();

            if (!botToken || !guildId || !this.client) {
                console.log('Bot token, guild ID, or client not available, skipping command registration');
                return;
            }

            const commands = [
                // Status command
                this.statusService.getStatusCommand(),

                // Help command
                this.helpService.getHelpCommand(),

                // AI commands
                this.aiService.getAIChatCommands(),

                // Todo commands
                ...this.todoService.getTodoCommands(),

                // Moderation commands
                ...this.moderationService.getModerationCommands(),

                // Ticket commands
                ...this.commandHandler.getTicketCommands(),

                // Backup commands
                ...this.backupService.getBackupCommands(),
            ];

            const rest = new REST().setToken(botToken);

            console.log(`Started refreshing ${commands.length} application (/) commands`);

            // Register commands with Discord
            await rest.put(
                Routes.applicationGuildCommands(this.client.user!.id, guildId),
                {body: commands}
            );

            console.log('Successfully registered application commands');
            this.commandsRegistered = true;
        } catch (error: any) {
            console.error('Error registering commands:', error.message);
        }
    }

    /**
     * Handle button interactions
     * @param interaction The button interaction
     */
    public async handleButton(interaction: ButtonInteraction): Promise<void> {
        try {
            const customId = interaction.customId;

            // Status button
            if (customId.startsWith('status:')) {
                await this.statusService.handleStatusButton(interaction);
                return;
            }

            // Help button
            if (customId.startsWith('help:')) {  
                await this.helpService.handleHelpButton(interaction);
                return;
            }

            // Todo buttons
            if (customId.startsWith('todo_')) {
                await this.todoService.handleTodoButton(interaction);
                return;
            }

            // Ticket buttons
            if (customId.startsWith('close:') || customId.startsWith('reopen:')) {
                const parts = customId.split(':');
                const action = parts[0];
                const ticketId = parseInt(parts[1]);

                try {
                    // Defer the reply to give us more time
                    await interaction.deferReply({ ephemeral: true });

                    // First update the Discord thread status (this may archive/unarchive the thread)
                    let threadUpdateSuccess = false;
                    if (action === 'close') {
                        threadUpdateSuccess = await this.ticketService.updateThreadStatus(ticketId, 'closed', interaction.user.username);
                    } else if (action === 'reopen') {
                        threadUpdateSuccess = await this.ticketService.updateThreadStatus(ticketId, 'open', interaction.user.username);
                    }

                    // Only update the database if Discord thread update was successful
                    if (threadUpdateSuccess) {
                        const newStatus = action === 'close' ? 'closed' : 'open';
                        await storage.updateTicket(ticketId, { status: newStatus });
                        
                        // Send success message
                        await interaction.editReply({
                            content: `Ticket #${ticketId} ${action === 'close' ? 'closed' : 'reopened'} successfully`
                        });
                    } else {
                        // Send failure message
                        await interaction.editReply({
                            content: `Failed to ${action} ticket #${ticketId} in Discord. The system may be experiencing issues. Please try again.`
                        });
                    }
                } catch (error: any) {
                    console.error(`Error ${action}ing ticket #${ticketId}:`, error.message);
                    try {
                        await interaction.editReply({
                            content: `Failed to ${action} ticket #${ticketId}. Please try again.`
                        });
                    } catch (editError) {
                        console.error('Failed to edit deferred reply:', editError);
                    }
                }
            }

            // Verification button
            if (customId === 'verify_user') {
                await discordVerificationService.handleVerificationButton(interaction);
                return;
            }
        } catch (error: any) {
            console.error('Error handling button interaction:', error.message);
            await interaction.reply({content: 'An error occurred while processing this button', ephemeral: true});
        }
    }

    /**
     * Handle select menu interactions
     * @param interaction The select menu interaction
     */
    public async handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
        try {
            const customId = interaction.customId;

            // Help select menu
            if (customId.startsWith('help:')) {
                await this.helpService.handleHelpSelectMenu(interaction);
                return;
            }

            // Add other select menu handlers here as needed
            console.log(`Unhandled select menu interaction: ${customId}`);
        } catch (error: any) {
            console.error('Error handling select menu:', error.message);
            try {
                await interaction.reply({
                    content: `Failed to process selection: ${error.message}`,
                    ephemeral: true
                });
            } catch (replyError) {
                console.error('Error replying to select menu:', replyError);
            }
        }
    }

    /**
     * Get the Discord bot token from settings
     * @returns The bot token or null if not configured
     */
    public async getBotToken(): Promise<string | null> {
        const setting = await storage.getSetting('discord_bot_token');
        return setting?.value || process.env.DISCORD_BOT_TOKEN || null;
    }

    /**
     * Get the Discord guild ID from settings
     * @returns The guild ID or null if not configured
     */
    public async getGuildId(): Promise<string | null> {
        const setting = await storage.getSetting('discord_guild_id');
        return setting?.value || process.env.DISCORD_GUILD_ID || null;
    }

    /**
     * Get the Discord channel ID from settings
     * @returns The channel ID or null if not configured
     */
    public async getChannelId(): Promise<string | null> {
        const setting = await storage.getSetting('discord_channel_id');
        return setting?.value || process.env.DISCORD_CHANNEL_ID || null;
    }

    /**
     * Get the Discord role ID from settings
     * @returns The role ID or null if not configured
     */
    public async getRoleId(): Promise<string | null> {
        const setting = await storage.getSetting('discord_role_id');
        return setting?.value || process.env.DISCORD_ROLE_ID || null;
    }

    /**
     * Get the Discord client instance
     * @returns The Discord client
     */
    public getClient(): Client | null {
        return this.client;
    }

    /**
     * Check if the bot is ready
     * @returns True if the bot is ready
     */
    public isReady(): boolean {
        return this.ready;
    }
}

// Export the singleton instance
export const discordBotCore = DiscordBotCore.getInstance();