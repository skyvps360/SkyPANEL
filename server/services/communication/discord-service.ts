import axios from 'axios';
import { storage } from '../../storage';

interface WebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: WebhookEmbed[];
}

interface WebhookEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: WebhookField[];
  author?: {
    name: string;
    icon_url?: string;
  };
  footer?: {
    text: string;
    icon_url?: string;
  };
  timestamp?: string;
}

interface WebhookField {
  name: string;
  value: string;
  inline?: boolean;
}

/**
 * Service for sending notifications to Discord via webhooks
 */
export class DiscordService {
  private static instance: DiscordService;

  private constructor() {}

  /**
   * Get the singleton instance of DiscordService
   * @returns The DiscordService instance
   */
  public static getInstance(): DiscordService {
    if (!DiscordService.instance) {
      DiscordService.instance = new DiscordService();
    }
    return DiscordService.instance;
  }

  /**
   * Check if Discord webhook notifications are enabled
   * @returns True if webhook URL is configured
   */
  public async isEnabled(): Promise<boolean> {
    const webhookUrl = await this.getWebhookUrl();
    return !!webhookUrl;
  }

  /**
   * Get the Discord webhook URL from settings
   * @returns The webhook URL or empty string if not set
   */
  private async getWebhookUrl(): Promise<string> {
    const setting = await storage.getSetting('discord_webhook_url');
    return setting?.value || '';
  }

  /**
   * Get the Discord role ID from settings
   * @returns The role ID or empty string if not set
   */
  private async getRoleId(): Promise<string> {
    const setting = await storage.getSetting('discord_role_id');
    return setting?.value || '';
  }

  /**
   * Send a notification about a new ticket
   * @param ticketId The ticket ID
   * @param subject The ticket subject
   * @param message The ticket initial message
   * @param userName The user's name
   * @returns Success status
   */
  public async sendNewTicketNotification(
    ticketId: number,
    subject: string,
    message: string,
    userName: string
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled()) {
        console.log('Discord notifications disabled, skipping new ticket notification');
        return false;
      }

      const webhookUrl = await this.getWebhookUrl();
      const companyName = await this.getCompanyName();
      const roleId = await this.getRoleId();
      const timestamp = new Date().toISOString();
      const ticketUrl = 'https://skyvps360.xyz/admin/tickets';

      // Create a role mention if a role ID is configured
      const roleMention = roleId ? `<@&${roleId}> ` : '';

      const payload: WebhookPayload = {
        content: roleId ? `${roleMention}A new support ticket has been created.` : undefined,
        username: `${companyName} Support`,
        embeds: [
          {
            title: '🎫 New Support Ticket Created',
            url: ticketUrl,
            color: 0x00FFFF, // Cyan
            fields: [
              {
                name: 'Ticket ID',
                value: `#${ticketId}`,
                inline: true
              },
              {
                name: 'From',
                value: userName,
                inline: true
              },
              {
                name: 'Subject',
                value: subject
              },
              {
                name: 'Message',
                value: message.length > 1500 ? message.substring(0, 1500) + '...' : message
              }
            ],
            footer: {
              text: `${companyName} Support System`
            },
            timestamp
          }
        ]
      };

      await axios.post(webhookUrl, payload);
      console.log(`Discord notification sent for new ticket #${ticketId}`);
      return true;
    } catch (error: any) {
      console.error('Error sending Discord notification for new ticket:', error.message);
      return false;
    }
  }

  /**
   * Send a notification about a new reply to a ticket
   * @param ticketId The ticket ID
   * @param subject The ticket subject
   * @param message The reply message
   * @param userName The user's name
   * @param isAdmin Whether the reply is from an admin
   * @returns Success status
   */
  public async sendTicketReplyNotification(
    ticketId: number,
    subject: string,
    message: string,
    userName: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled()) {
        console.log('Discord notifications disabled, skipping ticket reply notification');
        return false;
      }

      const webhookUrl = await this.getWebhookUrl();
      const companyName = await this.getCompanyName();
      const roleId = await this.getRoleId();
      const timestamp = new Date().toISOString();
      const ticketUrl = 'https://skyvps360.xyz/admin/tickets';

      // Create a role mention if a role ID is configured
      // Only ping roles if it's a customer reply, not staff reply
      const roleMention = (roleId && !isAdmin) ? `<@&${roleId}> ` : '';

      const payload: WebhookPayload = {
        content: (roleId && !isAdmin) ? `${roleMention}A customer has replied to a support ticket.` : undefined,
        username: `${companyName} Support`,
        embeds: [
          {
            title: isAdmin 
              ? '👨‍💼 Staff Reply to Support Ticket' 
              : '💬 Customer Reply to Support Ticket',
            url: ticketUrl,
            color: isAdmin ? 0x7289DA : 0xFFAA00, // Blue for staff, amber for customer
            fields: [
              {
                name: 'Ticket ID',
                value: `#${ticketId}`,
                inline: true
              },
              {
                name: 'From',
                value: userName,
                inline: true
              },
              {
                name: 'Subject',
                value: subject
              },
              {
                name: 'Message',
                value: message.length > 1500 ? message.substring(0, 1500) + '...' : message
              }
            ],
            footer: {
              text: `${companyName} Support System`
            },
            timestamp
          }
        ]
      };

      await axios.post(webhookUrl, payload);
      console.log(`Discord notification sent for reply to ticket #${ticketId}`);
      return true;
    } catch (error: any) {
      console.error('Error sending Discord notification for ticket reply:', error.message);
      return false;
    }
  }

  /**
   * Send a notification about a ticket status change (closed or reopened)
   * @param ticketId The ticket ID
   * @param subject The ticket subject
   * @param userName The user's name who changed the status
   * @param newStatus The new status of the ticket ('closed' or 'open')
   * @param isAdmin Whether the status change is performed by an admin
   * @returns Success status
   */
  public async sendTicketStatusNotification(
    ticketId: number,
    subject: string,
    userName: string,
    newStatus: string,
    isAdmin: boolean
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled()) {
        console.log('Discord notifications disabled, skipping ticket status notification');
        return false;
      }

      const webhookUrl = await this.getWebhookUrl();
      const companyName = await this.getCompanyName();
      const timestamp = new Date().toISOString();
      const ticketUrl = 'https://skyvps360.xyz/admin/tickets';

      const isClosed = newStatus.toLowerCase() === 'closed';

      const payload: WebhookPayload = {
        username: `${companyName} Support`,
        embeds: [
          {
            title: isClosed 
              ? '🔒 Support Ticket Closed' 
              : '🔓 Support Ticket Reopened',
            url: ticketUrl,
            color: isClosed ? 0x808080 : 0x00FF00, // Gray for closed, green for reopened
            fields: [
              {
                name: 'Ticket ID',
                value: `#${ticketId}`,
                inline: true
              },
              {
                name: 'Action By',
                value: userName + (isAdmin ? ' (Staff)' : ' (Customer)'),
                inline: true
              },
              {
                name: 'Subject',
                value: subject
              },
              {
                name: 'Status',
                value: isClosed ? 'Closed' : 'Reopened'
              }
            ],
            footer: {
              text: `${companyName} Support System`
            },
            timestamp
          }
        ]
      };

      await axios.post(webhookUrl, payload);
      console.log(`Discord notification sent for ticket #${ticketId} status change to ${newStatus}`);
      return true;
    } catch (error: any) {
      console.error('Error sending Discord notification for ticket status change:', error.message);
      return false;
    }
  }

  /**
   * Send a notification about a ticket being deleted
   * @param ticketId The ticket ID
   * @param subject The ticket subject
   * @param adminName The admin's name who deleted the ticket
   * @returns Success status
   */
  public async sendTicketDeletedNotification(
    ticketId: number,
    subject: string,
    adminName: string
  ): Promise<boolean> {
    try {
      if (!await this.isEnabled()) {
        console.log('Discord notifications disabled, skipping ticket deleted notification');
        return false;
      }

      const webhookUrl = await this.getWebhookUrl();
      const companyName = await this.getCompanyName();
      const timestamp = new Date().toISOString();
      const ticketUrl = 'https://skyvps360.xyz/admin/tickets';

      const payload: WebhookPayload = {
        username: `${companyName} Support`,
        embeds: [
          {
            title: '🗑️ Support Ticket Deleted',
            url: ticketUrl,
            color: 0xFF0000, // Red for deletion
            fields: [
              {
                name: 'Ticket ID',
                value: `#${ticketId}`,
                inline: true
              },
              {
                name: 'Deleted By',
                value: `${adminName} (Staff)`,
                inline: true
              },
              {
                name: 'Subject',
                value: subject
              }
            ],
            footer: {
              text: `${companyName} Support System`
            },
            timestamp
          }
        ]
      };

      await axios.post(webhookUrl, payload);
      console.log(`Discord notification sent for ticket #${ticketId} deletion`);
      return true;
    } catch (error: any) {
      console.error('Error sending Discord notification for ticket deletion:', error.message);
      return false;
    }
  }

  /**
   * Get the company name from settings
   * @returns The company name or a default value
   */
  private async getCompanyName(): Promise<string> {
    const setting = await storage.getSetting('company_name');
    return setting?.value || 'SkyVPS360';
  }
}

export const discordService = DiscordService.getInstance();