/**
 * @fileoverview Discord AI Storage Service for database persistence
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../db';
import { 
    discordAIConversations, 
    discordAIUserSettings,
    InsertDiscordAIConversation,
    InsertDiscordAIUserSettings,
    DiscordAIConversation,
    DiscordAIUserSettings
} from '@shared/schemas';
import { eq, desc, and, sql } from 'drizzle-orm';

/**
 * Service for managing Discord AI conversation persistence and user settings
 * Handles database operations for conversation history and user preferences
 */
export class DiscordAIStorageService {
    private static instance: DiscordAIStorageService;

    private constructor() {}

    /**
     * Get the singleton instance of DiscordAIStorageService
     * @returns The DiscordAIStorageService instance
     */
    public static getInstance(): DiscordAIStorageService {
        if (!DiscordAIStorageService.instance) {
            DiscordAIStorageService.instance = new DiscordAIStorageService();
        }
        return DiscordAIStorageService.instance;
    }

    /**
     * Save a conversation message to the database
     * @param discordUserId Discord user ID
     * @param discordUsername Discord username
     * @param role 'user' or 'model'
     * @param message The message content
     * @param messageType Type of message (text, system, error)
     * @param metadata Additional metadata
     * @returns The created conversation record
     */
    public async saveConversationMessage(
        discordUserId: string,
        discordUsername: string,
        role: 'user' | 'model',
        message: string,
        messageType: string = 'text',
        metadata: Record<string, any> = {}
    ): Promise<DiscordAIConversation> {
        try {
            const conversationData: InsertDiscordAIConversation = {
                discordUserId,
                discordUsername,
                role,
                message,
                messageType,
                metadata
            };

            const [conversation] = await db
                .insert(discordAIConversations)
                .values(conversationData)
                .returning();

            // After saving, cleanup old messages to maintain the 50-message limit
            await this.cleanupOldMessages(discordUserId);

            return conversation;
        } catch (error: any) {
            console.error('Error saving conversation message:', error);
            throw new Error(`Failed to save conversation message: ${error.message}`);
        }
    }

    /**
     * Get conversation history for a user (up to specified limit)
     * @param discordUserId Discord user ID
     * @param limit Maximum number of messages to retrieve (default: 50)
     * @returns Array of conversation messages ordered by creation time
     */
    public async getConversationHistory(
        discordUserId: string,
        limit: number = 50
    ): Promise<DiscordAIConversation[]> {
        try {
            const conversations = await db
                .select()
                .from(discordAIConversations)
                .where(eq(discordAIConversations.discordUserId, discordUserId))
                .orderBy(desc(discordAIConversations.createdAt))
                .limit(limit);

            // Return in chronological order (oldest first) for AI processing
            return conversations.reverse();
        } catch (error: any) {
            console.error('Error getting conversation history:', error);
            throw new Error(`Failed to get conversation history: ${error.message}`);
        }
    }    /**
     * Get the last N messages for displaying "memory" to user
     * @param discordUserId Discord user ID
     * @param count Number of recent messages to retrieve (default: 3)
     * @param roleFilter Optional role filter ('user' or 'model')
     * @returns Array of recent conversation messages
     */
    public async getRecentMessages(
        discordUserId: string,
        count: number = 3,
        roleFilter?: 'user' | 'model'
    ): Promise<DiscordAIConversation[]> {
        try {
            // If filtering by role, we need to get more messages to ensure we get enough after filtering
            const fetchLimit = roleFilter ? count * 5 : count * 2;
            
            const query = db
                .select()
                .from(discordAIConversations)
                .where(eq(discordAIConversations.discordUserId, discordUserId))
                .orderBy(desc(discordAIConversations.createdAt))
                .limit(fetchLimit);

            const allMessages = await query;

            let filteredMessages = allMessages;
            
            // Apply role filter if specified
            if (roleFilter) {
                filteredMessages = allMessages.filter(msg => msg.role === roleFilter);
                // Take only the requested count after filtering
                filteredMessages = filteredMessages.slice(0, count);
            }

            // Return in chronological order for display
            return filteredMessages.reverse();
        } catch (error: any) {
            console.error('Error getting recent messages:', error);
            throw new Error(`Failed to get recent messages: ${error.message}`);
        }
    }

    /**
     * Get or create user settings for Discord AI
     * @param discordUserId Discord user ID
     * @param discordUsername Discord username
     * @returns User settings
     */
    public async getUserSettings(
        discordUserId: string,
        discordUsername: string
    ): Promise<DiscordAIUserSettings> {
        try {
            // Try to get existing settings
            const existingSettings = await db
                .select()
                .from(discordAIUserSettings)
                .where(eq(discordAIUserSettings.discordUserId, discordUserId))
                .limit(1);

            if (existingSettings.length > 0) {
                return existingSettings[0];
            }

            // Create new settings if none exist
            const newSettingsData: InsertDiscordAIUserSettings = {
                discordUserId,
                discordUsername,
                maxConversationHistory: 50,
                isEnabled: true,
                totalMessagesCount: 0,
                metadata: {}
            };

            const [newSettings] = await db
                .insert(discordAIUserSettings)
                .values(newSettingsData)
                .returning();

            return newSettings;
        } catch (error: any) {
            console.error('Error getting user settings:', error);
            throw new Error(`Failed to get user settings: ${error.message}`);
        }
    }

    /**
     * Update user settings
     * @param discordUserId Discord user ID
     * @param updates Partial settings to update
     * @returns Updated user settings
     */
    public async updateUserSettings(
        discordUserId: string,
        updates: Partial<Omit<DiscordAIUserSettings, 'id' | 'createdAt' | 'updatedAt'>>
    ): Promise<DiscordAIUserSettings> {
        try {
            const [updatedSettings] = await db
                .update(discordAIUserSettings)
                .set({
                    ...updates,
                    lastUsedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(discordAIUserSettings.discordUserId, discordUserId))
                .returning();

            if (!updatedSettings) {
                throw new Error('User settings not found');
            }

            return updatedSettings;
        } catch (error: any) {
            console.error('Error updating user settings:', error);
            throw new Error(`Failed to update user settings: ${error.message}`);
        }
    }

    /**
     * Increment the total message count for a user
     * @param discordUserId Discord user ID
     */
    public async incrementMessageCount(discordUserId: string): Promise<void> {
        try {
            await db
                .update(discordAIUserSettings)
                .set({
                    totalMessagesCount: sql`${discordAIUserSettings.totalMessagesCount} + 1`,
                    lastUsedAt: new Date(),
                    updatedAt: new Date()
                })
                .where(eq(discordAIUserSettings.discordUserId, discordUserId));
        } catch (error: any) {
            console.error('Error incrementing message count:', error);
            // Don't throw here as this is not critical functionality
        }
    }

    /**
     * Cleanup old messages to maintain the conversation limit
     * Keeps only the most recent messages up to the user's limit
     * @param discordUserId Discord user ID
     */
    public async cleanupOldMessages(discordUserId: string): Promise<void> {        try {
            // Get user settings to determine the limit
            const userSettings = await this.getUserSettings(discordUserId, '');
            const limit = userSettings.maxConversationHistory || 50; // Default to 50 if null

            // Get the count of messages for this user
            const messageCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(discordAIConversations)
                .where(eq(discordAIConversations.discordUserId, discordUserId));

            const totalMessages = messageCount[0]?.count || 0;

            if (totalMessages > limit) {
                // Get the IDs of messages to keep (most recent ones)
                const messagesToKeep = await db
                    .select({ id: discordAIConversations.id })
                    .from(discordAIConversations)
                    .where(eq(discordAIConversations.discordUserId, discordUserId))
                    .orderBy(desc(discordAIConversations.createdAt))
                    .limit(limit);

                const idsToKeep = messagesToKeep.map(msg => msg.id);

                // Delete old messages
                await db
                    .delete(discordAIConversations)
                    .where(
                        and(
                            eq(discordAIConversations.discordUserId, discordUserId),
                            sql`${discordAIConversations.id} NOT IN (${sql.join(idsToKeep, sql`, `)})`
                        )
                    );

                console.log(`Cleaned up old messages for user ${discordUserId}. Kept ${limit} most recent messages.`);
            }
        } catch (error: any) {
            console.error('Error cleaning up old messages:', error);
            // Don't throw here as this is a maintenance operation
        }
    }

    /**
     * Clear all conversation history for a user
     * @param discordUserId Discord user ID
     */
    public async clearUserConversation(discordUserId: string): Promise<void> {
        try {
            await db
                .delete(discordAIConversations)
                .where(eq(discordAIConversations.discordUserId, discordUserId));

            console.log(`Cleared conversation history for user ${discordUserId}`);
        } catch (error: any) {
            console.error('Error clearing user conversation:', error);
            throw new Error(`Failed to clear conversation: ${error.message}`);
        }
    }

    /**
     * Get conversation statistics for a user
     * @param discordUserId Discord user ID
     * @returns Statistics about the user's conversation history
     */
    public async getConversationStats(discordUserId: string): Promise<{
        totalMessages: number;
        userMessages: number;
        modelMessages: number;
        firstMessageDate: Date | null;
        lastMessageDate: Date | null;
    }> {
        try {
            const stats = await db
                .select({
                    totalMessages: sql<number>`count(*)`,
                    userMessages: sql<number>`count(*) filter (where role = 'user')`,
                    modelMessages: sql<number>`count(*) filter (where role = 'model')`,
                    firstMessageDate: sql<Date>`min(created_at)`,
                    lastMessageDate: sql<Date>`max(created_at)`
                })
                .from(discordAIConversations)
                .where(eq(discordAIConversations.discordUserId, discordUserId));

            return stats[0] || {
                totalMessages: 0,
                userMessages: 0,
                modelMessages: 0,
                firstMessageDate: null,
                lastMessageDate: null
            };
        } catch (error: any) {
            console.error('Error getting conversation stats:', error);
            throw new Error(`Failed to get conversation stats: ${error.message}`);
        }
    }    /**
     * Format conversation history for AI processing
     * Converts database records to the format expected by the Gemini service
     * Ensures the first message is always from 'user' role (Gemini API requirement)
     * @param conversations Array of conversation records
     * @returns Formatted conversation history for AI
     */
    public formatConversationForAI(conversations: DiscordAIConversation[]): Array<{
        role: string;
        parts: Array<{ text: string }>;
    }> {
        if (conversations.length === 0) {
            return [];
        }

        const formatted = conversations.map(conv => ({
            role: conv.role,
            parts: [{ text: conv.message }]
        }));

        // Ensure the first message is always from 'user' role (Gemini API requirement)
        // If the first message is from 'model', remove it or find the first 'user' message
        if (formatted.length > 0 && formatted[0].role !== 'user') {
            // Find the first user message and start from there
            const firstUserIndex = formatted.findIndex(msg => msg.role === 'user');
            if (firstUserIndex > 0) {
                // Start from the first user message
                return formatted.slice(firstUserIndex);
            } else if (firstUserIndex === -1) {
                // No user messages found, return empty to start fresh conversation
                return [];
            }
        }

        return formatted;
    }    /**
     * Get a formatted summary of recent messages for display
     * @param discordUserId Discord user ID
     * @param count Number of recent messages to include
     * @param roleFilter Optional role filter ('user' or 'model') - when specified, only shows messages from that role
     * @returns Formatted string showing recent conversation
     */
    public async getFormattedRecentMessages(
        discordUserId: string,
        count: number = 3,
        roleFilter?: 'user' | 'model'
    ): Promise<string> {
        try {
            const recentMessages = await this.getRecentMessages(discordUserId, count, roleFilter);
            
            if (recentMessages.length === 0) {
                return roleFilter === 'user' 
                    ? 'No previous questions found.' 
                    : 'No previous conversation history.';
            }

            const formatted = recentMessages
                .map(msg => {
                    const role = msg.role === 'user' ? 'You' : 'AI';
                    const timestamp = new Date(msg.createdAt).toLocaleTimeString();
                    return `**${role}** (${timestamp}): ${msg.message}`;
                })
                .join('\n');

            const headerText = roleFilter === 'user' 
                ? '**Recent Questions:**' 
                : '**Recent Conversation:**';

            return `${headerText}\n${formatted}`;
        } catch (error: any) {
            console.error('Error formatting recent messages:', error);
            return 'Unable to retrieve conversation history.';
        }
    }
}

// Export the singleton instance
export const discordAIStorageService = DiscordAIStorageService.getInstance();
