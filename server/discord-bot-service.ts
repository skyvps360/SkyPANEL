import {Express, Server} from 'express';
import {discordBotCore} from './discord/discord-bot-core';
import {discordTicketService} from './discord/discord-ticket-service';
import {discordCommandHandler} from './discord/discord-command-handler';
import {discordModerationService} from './discord/discord-moderation-service';
import {discordStatusService} from './discord/discord-status-service';
import {discordTodoService} from './discord/discord-todo-service';
import {discordHelpService} from './discord/discord-help-service';
import {discordAIService} from './discord/discord-ai-service';

/**
 * Main Discord bot service that initializes and coordinates all Discord-related functionality
 */
export class DiscordBotService {
  private static instance: DiscordBotService;

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
      return discordBotCore.isEnabled();
  }

  /**
   * Initialize the Discord bot
   * @returns True if initialization was successful
   */
  public async initialize(): Promise<boolean> {
    try {
        // Set up the services in the core
        discordBotCore.setServices(
            discordTicketService,
            discordCommandHandler,
            discordModerationService,
            discordStatusService,
            discordTodoService,
            discordHelpService,
            discordAIService
        );

        // Initialize the core
        return await discordBotCore.initialize();
    } catch (error: any) {
        console.error('Error initializing Discord bot service:', error.message);
      return false;
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
      return discordTicketService.createThreadForTicket(ticketId, subject, message, userName);
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
      return discordTicketService.sendReplyToThread(ticketId, message, userName, isAdmin);
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
      return discordTicketService.updateThreadStatus(ticketId, status, userName);
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
      return discordTicketService.handleTicketDeletion(ticketId, adminName);
  }
}

// Export the singleton instance
export const discordBotService = DiscordBotService.getInstance();