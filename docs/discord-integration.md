# Discord Integration Guide

This document provides comprehensive documentation for the Discord integration in SkyPANEL, including setup, configuration, and usage.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Setup and Configuration](#setup-and-configuration)
- [Bot Commands](#bot-commands)
- [Webhook Integration](#webhook-integration)
- [Ticket System](#ticket-system)
- [Role Management](#role-management)
- [Notifications](#notifications)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

SkyPANEL integrates with Discord to provide real-time notifications, support ticket management, and server status updates. The integration includes a feature-rich Discord bot and webhook support for various system events.

## Prerequisites

- Discord Developer Portal access
- Bot token with required permissions
- Server admin access to add the bot
- Node.js environment for local development

## Setup and Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Discord Configuration
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here
DISCORD_GUILD_ID=your_server_id_here
DISCORD_WEBHOOK_URL=your_webhook_url_here
DISCORD_TICKET_CATEGORY_ID=category_id_for_tickets
```

### Bot Setup

1. Create a new application in the [Discord Developer Portal](https://discord.com/developers/applications)
2. Navigate to the "Bot" tab and click "Add Bot"
3. Copy the bot token and add it to your environment variables
4. Enable required intents:
   - Server Members Intent
   - Message Content Intent
   - Server Members Intent
5. Generate OAuth2 URL with these scopes:
   - `bot`
   - `applications.commands`
6. Add the bot to your server using the generated URL

### Initialization

The Discord bot is initialized in `discord-bot-service.ts`:

```typescript
import { Client, IntentsBitField, Partials } from 'discord.js';
import { config } from 'dotenv';

config();

export class DiscordBotService {
  private client: Client;
  private static instance: DiscordBotService;

  private constructor() {
    this.client = new Client({
      intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
      ],
      partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    });
    
    this.initializeEventHandlers();
  }

  public static getInstance(): DiscordBotService {
    if (!DiscordBotService.instance) {
      DiscordBotService.instance = new DiscordBotService();
    }
    return DiscordBotService.instance;
  }

  private initializeEventHandlers() {
    this.client.on('ready', () => {
      console.log(`Logged in as ${this.client.user?.tag}!`);
      this.registerSlashCommands();
    });

    // Add more event handlers...
  }


  public async start() {
    try {
      await this.client.login(process.env.DISCORD_BOT_TOKEN);
      console.log('Discord bot started successfully');
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const discordBot = DiscordBotService.getInstance();
```

## Bot Commands

### Slash Commands

SkyPANEL's Discord bot supports the following slash commands:

#### `/ticket create [subject] [description]`
Create a new support ticket.

**Options:**
- `subject`: Brief title for the ticket
- `description`: Detailed description of the issue

#### `/server status [server_id]`
Check the status of a server.

**Options:**
- `server_id`: (Optional) ID of the server to check

#### `/user info [user]`
Get information about a user.

**Options:**
- `user`: (Optional) User to get info about (defaults to command user)

#### `/help`
Show a list of available commands.

### Command Registration

Commands are registered using the Discord.js REST API:

```typescript
private async registerSlashCommands() {
  const commands = [
    {
      name: 'ticket',
      description: 'Create a new support ticket',
      options: [
        {
          name: 'subject',
          description: 'Brief title for the ticket',
          type: 3, // STRING
          required: true,
        },
        {
          name: 'description',
          description: 'Detailed description of the issue',
          type: 3, // STRING
          required: true,
        },
      ],
    },
    // Add more commands...
  ];

  try {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN!);
    await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID!, process.env.DISCORD_GUILD_ID!),
      { body: commands }
    );
    console.log('Successfully registered application commands.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
}
```

## Webhook Integration

SkyPANEL can send webhook notifications to Discord channels for various events.

### Sending Webhook Messages

```typescript
import { WebhookClient } from 'discord.js';

export async function sendDiscordWebhook(message: string, embed?: any) {
  if (!process.env.DISCORD_WEBHOOK_URL) {
    console.warn('DISCORD_WEBHOOK_URL not set, skipping webhook send');
    return;
  }

  const webhookClient = new WebhookClient({ url: process.env.DISCORD_WEBHOOK_URL });
  
  try {
    await webhookClient.send({
      content: message,
      embeds: embed ? [embed] : undefined,
      username: 'SkyPANEL',
      avatarURL: 'https://your-app-url.com/logo.png',
    });
  } catch (error) {
    console.error('Failed to send Discord webhook:', error);
    throw error;
  }
}
```

### Example Webhook Events

#### Server Status Update
```typescript
async sendServerStatusUpdate(server: Server) {
  const statusEmoji = server.status === 'online' ? '🟢' : '🔴';
  
  const embed = {
    title: `Server Status Update: ${server.name}`,
    description: `${statusEmoji} Server is now ${server.status.toUpperCase()}`,
    fields: [
      { name: 'IP Address', value: server.ipAddress, inline: true },
      { name: 'CPU Usage', value: `${server.cpuUsage}%`, inline: true },
      { name: 'Memory Usage', value: `${server.memoryUsage}%`, inline: true },
    ],
    timestamp: new Date().toISOString(),
    color: server.status === 'online' ? 0x00ff00 : 0xff0000,
  };

  await sendDiscordWebhook('', embed);
}
```

## Ticket System

The Discord integration includes a support ticket system that creates dedicated channels for each ticket.

### Creating a Ticket

```typescript
async createTicket(interaction: ChatInputCommandInteraction) {
  // Create a new channel in the tickets category
  const guild = interaction.guild;
  if (!guild) return;

  const ticketNumber = await this.getNextTicketNumber();
  const channelName = `ticket-${ticketNumber}`;
  
  try {
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: process.env.DISCORD_TICKET_CATEGORY_ID,
      permissionOverwrites: [
        {
          id: guild.roles.everyone,
          deny: [PermissionsBitField.Flags.ViewChannel],
        },
        {
          id: interaction.user.id,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
          ],
        },
        // Add support role permissions
      ],
    });

    // Send initial ticket message
    const embed = new EmbedBuilder()
      .setTitle(`Ticket #${ticketNumber}`)
      .setDescription(`Created by ${interaction.user.tag}`)
      .addFields(
        { name: 'Status', value: 'Open', inline: true },
        { name: 'Created', value: new Date().toLocaleString(), inline: true }
      )
      .setColor(0x3498db);

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(closeButton);

    await channel.send({
      content: `${interaction.user}, thank you for creating a ticket. A team member will assist you shortly.`,
      embeds: [embed],
      components: [row],
    });

    // Send confirmation to user
    await interaction.reply({
      content: `Your ticket has been created: ${channel}`,
      ephemeral: true,
    });

    // Log ticket creation
    await this.logTicketCreation(ticketNumber, interaction.user.id);

  } catch (error) {
    console.error('Failed to create ticket:', error);
    await interaction.reply({
      content: 'Failed to create ticket. Please try again later.',
      ephemeral: true,
    });
  }
}
```

## Role Management

The bot can sync Discord roles with SkyPANEL user roles.

### Syncing Roles

```typescript
async syncUserRoles(userId: string, roles: string[]) {
  const guild = this.client.guilds.cache.get(process.env.DISCORD_GUILD_ID!);
  if (!guild) throw new Error('Guild not found');

  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return;

  // Get current roles to remove
  const rolesToRemove = member.roles.cache.filter(
    role => !roles.includes(role.id) && role.id !== guild.roles.everyone.id
  );

  // Add new roles
  const rolesToAdd = roles.filter(roleId => !member.roles.cache.has(roleId));

  try {
    // Remove old roles
    if (rolesToRemove.size > 0) {
      await member.roles.remove(rolesToRemove);
    }

    // Add new roles
    if (rolesToAdd.length > 0) {
      await member.roles.add(rolesToAdd);
    }
  } catch (error) {
    console.error(`Failed to sync roles for user ${userId}:`, error);
    throw error;
  }
}
```

## Notifications

SkyPANEL can send various types of notifications to Discord:

### Notification Types

1. **Server Notifications**
   - Status changes
   - Resource usage alerts
   - Backup completion/failure

2. **User Notifications**
   - Account updates
   - Billing reminders
   - Security alerts

3. **System Notifications**
   - Maintenance windows
   - Updates and patches
   - Security incidents

### Example Notification Method

```typescript
async sendNotification(channelId: string, type: string, data: any) {
  const channel = await this.client.channels.fetch(channelId);
  if (!channel?.isTextBased()) return;

  let message = '';
  let embed;

  switch (type) {
    case 'server_status':
      message = `🔄 **Server Status Update**\n` +
               `**${data.serverName}** is now **${data.status.toUpperCase()}**`;
      embed = new EmbedBuilder()
        .setTitle('Server Status Update')
        .setDescription(`Server **${data.serverName}** has changed status.`)
        .addFields(
          { name: 'Status', value: data.status, inline: true },
          { name: 'IP Address', value: data.ipAddress, inline: true },
          { name: 'Last Checked', value: new Date().toLocaleString(), inline: true }
        )
        .setColor(data.status === 'online' ? 0x00ff00 : 0xff0000);
      break;
    
    // Add more notification types...
  }

  try {
    await channel.send({
      content: message,
      embeds: embed ? [embed] : undefined,
    });
  } catch (error) {
    console.error(`Failed to send ${type} notification:`, error);
  }
}
```

## Troubleshooting

### Common Issues

1. **Bot Not Responding**
   - Verify the bot is online and has the correct intents
   - Check for error messages in the logs
   - Ensure the bot has the required permissions

2. **Missing Slash Commands**
   - Verify the commands are registered with `registerSlashCommands()`
   - Check for any errors during command registration
   - Try kicking and re-adding the bot

3. **Permission Issues**
   - Ensure the bot has Administrator permissions or the required role
   - Check channel-specific permissions
   - Verify role hierarchy if using role-based permissions

4. **Webhook Failures**
   - Verify the webhook URL is correct
   - Check rate limits
   - Ensure the webhook hasn't been deleted

## Best Practices

1. **Error Handling**
   - Always use try/catch blocks for async operations
   - Log errors with sufficient context
   - Provide user-friendly error messages

2. **Rate Limiting**
   - Respect Discord's rate limits
   - Implement queueing for bulk operations
   - Use exponential backoff for retries

3. **Security**
   - Never log or expose bot tokens
   - Validate all user input
   - Use proper permission checks

4. **Performance**
   - Cache frequently accessed data
   - Use bulk operations when possible
   - Clean up unused resources

5. **Maintainability**
   - Keep command handlers modular
   - Use TypeScript for type safety
   - Document complex logic

## Monitoring and Logging

- Log all bot events and errors
- Monitor API rate limits
- Track command usage statistics
- Set up alerts for critical failures

## Support

For issues with the Discord integration:
1. Check the bot logs for errors
2. Verify bot permissions and intents
3. Consult the Discord.js documentation
4. Open an issue in the SkyPANEL repository if the problem persists
