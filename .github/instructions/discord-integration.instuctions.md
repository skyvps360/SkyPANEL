# SkyPANEL Discord Integration

## Overview

SkyPANEL features comprehensive Discord integration for server notifications, support ticket management, and admin alerts. This system provides two-way communication between the SkyPANEL platform and Discord servers, allowing users to interact with their hosting services directly from Discord.

## Core Components

### Discord Bot Service

- **Bot Authentication**: Handles token management and authentication
- **Command Handling**: Processes Discord slash commands and message commands
- **Event Listeners**: Responds to Discord events and interactions
- **Message Formatting**: Creates properly formatted embeds and messages

### Support Ticket Integration

- **Ticket Creation**: Create support tickets from Discord messages
- **Ticket Updates**: Sync ticket replies between Discord threads and SkyPANEL
- **Status Updates**: Update ticket status from Discord reactions
- **File Attachments**: Support for file uploads in both systems

### Notification System

- **Server Events**: Notifications for server status changes and actions
- **Billing Alerts**: Payment confirmations and balance notifications
- **System Status**: Platform status updates and maintenance alerts
- **Admin Notifications**: Critical alerts for administrative users

### User Authentication

- **Account Linking**: Connect Discord and SkyPANEL accounts
- **Role Synchronization**: Sync Discord roles with SkyPANEL permissions
- **Verification System**: Verify account ownership through secure processes
- **Permission Management**: Handle user access based on Discord roles

## Implementation

### Discord Bot Setup

```typescript
import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import { db } from '../db';
import { loadCommands } from './commands';
import { loadEvents } from './events';

export class DiscordBot {
  private client: Client;
  private commands: Collection<string, any>;
  private token: string;
  private guildId: string;
  
  constructor() {
    this.token = process.env.DISCORD_BOT_TOKEN!;
    this.guildId = process.env.DISCORD_GUILD_ID!;
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions
      ]
    });
    
    this.commands = new Collection();
  }
  
  async initialize() {
    if (!this.token) {
      console.error('DISCORD_BOT_TOKEN is not defined in environment variables');
      return;
    }
    
    // Load commands and events
    await loadCommands(this.client, this.commands);
    await loadEvents(this.client);
    
    // Set up event handlers
    this.client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isChatInputCommand()) return;
      
      const command = this.commands.get(interaction.commandName);
      if (!command) return;
      
      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({
          content: 'There was an error executing this command!',
          ephemeral: true
        });
      }
    });
    
    // Login to Discord
    try {
      await this.client.login(this.token);
      console.log('Discord bot logged in successfully');
    } catch (error) {
      console.error('Error logging in Discord bot:', error);
    }
  }
  
  async sendNotification(options: {
    channelId: string;
    content?: string;
    embed?: any;
  }) {
    const { channelId, content, embed } = options;
    
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel ID or not a text channel');
      }
      
      return await channel.send({
        content: content || undefined,
        embeds: embed ? [embed] : undefined
      });
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      throw error;
    }
  }
  
  // Additional methods for ticket management, user verification, etc.
}
```

### Support Ticket Integration

```typescript
export class DiscordTicketService {
  private bot: DiscordBot;
  private supportChannelId: string;
  private db: Database;
  
  constructor(bot: DiscordBot, db: Database) {
    this.bot = bot;
    this.db = db;
    this.supportChannelId = process.env.DISCORD_SUPPORT_CHANNEL_ID!;
  }
  
  async createTicketFromDiscord(
    userId: string,
    discordUserId: string,
    subject: string,
    message: string
  ) {
    try {
      // Create ticket in database
      const ticket = await this.db.transaction(async (tx) => {
        const newTicket = await tx.insert(ticketsTable).values({
          userId,
          subject,
          status: 'open',
          source: 'discord'
        }).returning();
        
        // Add initial message
        await tx.insert(ticketMessagesTable).values({
          ticketId: newTicket[0].id,
          userId,
          content: message,
          isFromStaff: false
        });
        
        return newTicket[0];
      });
      
      // Create Discord thread for this ticket
      const embed = {
        title: `Ticket #${ticket.id}: ${subject}`,
        description: message,
        color: 0x3498db,
        footer: {
          text: `User ID: ${userId} • Ticket ID: ${ticket.id}`
        },
        timestamp: new Date()
      };
      
      const sentMessage = await this.bot.sendNotification({
        channelId: this.supportChannelId,
        embed
      });
      
      // Create thread from the message
      const thread = await sentMessage.startThread({
        name: `ticket-${ticket.id}-${subject.substring(0, 20)}`,
        autoArchiveDuration: 10080 // 7 days
      });
      
      // Update ticket with Discord thread ID
      await this.db.update(ticketsTable)
        .set({ 
          discordThreadId: thread.id,
          metadata: JSON.stringify({ 
            discordMessageId: sentMessage.id 
          })
        })
        .where(eq(ticketsTable.id, ticket.id));
      
      return ticket;
    } catch (error) {
      console.error('Error creating ticket from Discord:', error);
      throw error;
    }
  }
  
  async syncTicketReply(
    ticketId: string,
    message: string,
    isFromStaff: boolean,
    userName: string
  ) {
    try {
      // Get ticket with Discord thread ID
      const ticket = await this.db.query.ticketsTable.findFirst({
        where: eq(ticketsTable.id, ticketId)
      });
      
      if (!ticket?.discordThreadId) {
        throw new Error('Ticket has no associated Discord thread');
      }
      
      // Send message to Discord thread
      const embed = {
        description: message,
        color: isFromStaff ? 0x2ecc71 : 0x3498db,
        author: {
          name: isFromStaff ? `Staff: ${userName}` : userName
        },
        timestamp: new Date()
      };
      
      await this.bot.sendNotification({
        channelId: ticket.discordThreadId,
        embed
      });
      
      return true;
    } catch (error) {
      console.error('Error syncing ticket reply to Discord:', error);
      return false;
    }
  }
}
```

### Server Status Notifications

```typescript
export class DiscordNotificationService {
  private bot: DiscordBot;
  private notificationChannelId: string;
  private adminChannelId: string;
  
  constructor(bot: DiscordBot) {
    this.bot = bot;
    this.notificationChannelId = process.env.DISCORD_NOTIFICATION_CHANNEL_ID!;
    this.adminChannelId = process.env.DISCORD_ADMIN_CHANNEL_ID!;
  }
  
  async sendServerStatusNotification(
    serverId: number,
    serverName: string,
    status: 'online' | 'offline' | 'rebooting' | 'provisioning',
    userId?: string
  ) {
    const statusColors = {
      online: 0x2ecc71, // Green
      offline: 0xe74c3c, // Red
      rebooting: 0xf39c12, // Orange
      provisioning: 0x3498db // Blue
    };
    
    const statusEmojis = {
      online: '🟢',
      offline: '🔴',
      rebooting: '🔄',
      provisioning: '⚙️'
    };
    
    const embed = {
      title: `${statusEmojis[status]} Server Status Update`,
      description: `Server **${serverName}** is now **${status}**`,
      color: statusColors[status],
      fields: [
        {
          name: 'Server ID',
          value: serverId.toString(),
          inline: true
        },
        {
          name: 'Status',
          value: status,
          inline: true
        },
        {
          name: 'Time',
          value: new Date().toLocaleString(),
          inline: true
        }
      ],
      footer: {
        text: userId ? `Initiated by User ID: ${userId}` : 'System Notification'
      },
      timestamp: new Date()
    };
    
    try {
      await this.bot.sendNotification({
        channelId: this.notificationChannelId,
        embed
      });
      
      return true;
    } catch (error) {
      console.error('Error sending server status notification:', error);
      return false;
    }
  }
  
  async sendBillingNotification(
    userId: string,
    userName: string,
    transactionType: string,
    amount: number,
    description: string
  ) {
    const embed = {
      title: `💰 Billing Notification`,
      description: `New ${transactionType} transaction for **${userName}**`,
      color: 0x9b59b6, // Purple
      fields: [
        {
          name: 'Amount',
          value: `$${amount.toFixed(2)}`,
          inline: true
        },
        {
          name: 'Type',
          value: transactionType,
          inline: true
        },
        {
          name: 'Description',
          value: description
        }
      ],
      footer: {
        text: `User ID: ${userId}`
      },
      timestamp: new Date()
    };
    
    try {
      await this.bot.sendNotification({
        channelId: this.adminChannelId,
        embed
      });
      
      return true;
    } catch (error) {
      console.error('Error sending billing notification:', error);
      return false;
    }
  }
}
```

## Discord Commands

### Server Management Commands

```typescript
export const serverCommands = {
  data: new SlashCommandBuilder()
    .setName('server')
    .setDescription('Manage your servers')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List your servers')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Get status of a specific server')
        .addStringOption(option =>
          option
            .setName('server_id')
            .setDescription('The ID of the server')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('action')
        .setDescription('Perform an action on a server')
        .addStringOption(option =>
          option
            .setName('server_id')
            .setDescription('The ID of the server')
            .setRequired(true)
        )
        .addStringOption(option =>
          option
            .setName('action')
            .setDescription('Action to perform')
            .setRequired(true)
            .addChoices(
              { name: 'Start', value: 'start' },
              { name: 'Stop', value: 'stop' },
              { name: 'Reboot', value: 'reboot' }
            )
        )
    ),
  
  async execute(interaction: CommandInteraction) {
    // Verify user is linked to a SkyPANEL account
    const discordUserId = interaction.user.id;
    const user = await getUserByDiscordId(discordUserId);
    
    if (!user) {
      return interaction.reply({
        content: 'You need to link your Discord account to SkyPANEL first. Use /link command.',
        ephemeral: true
      });
    }
    
    const subcommand = interaction.options.getSubcommand();
    
    if (subcommand === 'list') {
      await interaction.deferReply({ ephemeral: true });
      
      try {
        const servers = await getServersForUser(user.id);
        
        if (!servers.length) {
          return interaction.editReply('You don\'t have any servers yet.');
        }
        
        const serverList = servers.map(server => 
          `**${server.name}** (ID: ${server.id}) - Status: ${server.status}`
        ).join('\n');
        
        return interaction.editReply({
          content: `Your servers:\n\n${serverList}`
        });
      } catch (error) {
        console.error('Error fetching servers:', error);
        return interaction.editReply('Failed to fetch your servers. Please try again later.');
      }
    }
    
    // Handle other subcommands (status, action)
  }
};
```

## Common Usage Patterns

### Handling Discord Account Linking

```typescript
// Generate a secure one-time token for account linking
const generateLinkToken = async (userId: string): Promise<string> => {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour expiration
  
  await db.insert(discordLinkTokensTable).values({
    userId,
    token,
    expiresAt
  });
  
  return token;
};

// Link a Discord user to a SkyPANEL account
export async function linkDiscordAccount(token: string, discordUserId: string): Promise<boolean> {
  try {
    // Verify token is valid and not expired
    const linkToken = await db.query.discordLinkTokensTable.findFirst({
      where: eq(discordLinkTokensTable.token, token)
    });
    
    if (!linkToken || linkToken.expiresAt < new Date()) {
      throw new Error('Invalid or expired token');
    }
    
    // Link Discord ID to user account
    await db.update(usersTable)
      .set({ 
        discordUserId,
        updatedAt: new Date()
      })
      .where(eq(usersTable.id, linkToken.userId));
    
    // Delete used token
    await db.delete(discordLinkTokensTable)
      .where(eq(discordLinkTokensTable.token, token));
    
    return true;
  } catch (error) {
    console.error('Error linking Discord account:', error);
    return false;
  }
}
```

### Processing Support Ticket Reactions

```typescript
// Handle reaction-based ticket status updates
export async function handleTicketReaction(
  messageId: string,
  reaction: string,
  userId: string
): Promise<boolean> {
  try {
    // Get ticket associated with this message
    const ticket = await db.query.ticketsTable.findFirst({
      where: sql`metadata->>'discordMessageId' = ${messageId}`
    });
    
    if (!ticket) {
      return false;
    }
    
    // Check if user is staff
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.discordUserId, userId),
      columns: {
        role: true
      }
    });
    
    if (!user || user.role !== 'admin') {
      return false; // Only staff can update status via reactions
    }
    
    // Update ticket status based on reaction
    let newStatus = ticket.status;
    
    switch (reaction) {
      case '✅':
        newStatus = 'closed';
        break;
      case '🔄':
        newStatus = 'in_progress';
        break;
      case '❗':
        newStatus = 'urgent';
        break;
      default:
        return false; // Unrecognized reaction
    }
    
    // Update ticket status
    await db.update(ticketsTable)
      .set({ 
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(ticketsTable.id, ticket.id));
    
    return true;
  } catch (error) {
    console.error('Error processing ticket reaction:', error);
    return false;
  }
}
```

### Sending Server Status Updates

```typescript
// Middleware to send Discord notifications for server status changes
export const discordServerNotificationMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;
  
  // Override json method to capture response
  res.json = function(body) {
    // Restore original method
    res.json = originalJson;
    
    // Check if this is a server action response
    if (
      req.path.includes('/servers/') && 
      req.path.includes('/action') &&
      body?.success === true
    ) {
      // Get server details and action
      const serverId = parseInt(req.params.id);
      const action = req.body.action;
      const userId = req.user?.id;
      
      // Send status notification asynchronously (don't await)
      getServerDetails(serverId)
        .then(server => {
          if (server) {
            const notificationService = new DiscordNotificationService(discordBot);
            
            // Map action to status
            let status = 'unknown';
            if (action === 'start') status = 'online';
            if (action === 'stop') status = 'offline';
            if (action === 'reboot') status = 'rebooting';
            
            notificationService.sendServerStatusNotification(
              serverId,
              server.name,
              status as any,
              userId
            );
          }
        })
        .catch(error => {
          console.error('Error sending Discord notification:', error);
        });
    }
    
    // Call original method
    return originalJson.call(this, body);
  };
  
  next();
};
```
