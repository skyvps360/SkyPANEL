/**
 * @fileoverview Discord AI Service for handling AI commands and interactions
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 2.0.0
 */

import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    Message,
    EmbedBuilder
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';
import {geminiService} from '../gemini-service';
import {DiscordEmbedUtils} from './discord-embed-utils';
import {discordAIStorageService} from '../services/discord-ai-storage-service';

/**
 * Service for handling Discord AI commands and interactions
 * Uses PostgreSQL database for persistent conversation storage (up to 50 messages per user)
 */
export class DiscordAIService {
    private static instance: DiscordAIService;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordAIService
     * @returns The DiscordAIService instance
     */
    public static getInstance(): DiscordAIService {
        if (!DiscordAIService.instance) {
            DiscordAIService.instance = new DiscordAIService();
        }
        return DiscordAIService.instance;
    }

    /**
     * Handle the AI command (/ask)
     * @param interaction The command interaction
     */
    public async handleAICommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Get the prompt from the command options
            const prompt = interaction.options.getString('prompt');
            if (!prompt) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Missing Prompt', 'You must specify a prompt to ask the AI.')],
                    ephemeral: true
                });
                return;
            }

            // Defer the reply as this might take some time
            await interaction.deferReply();

            const userId = interaction.user.id;
            const username = interaction.user.username;

            try {
                // Get conversation history from database
                const conversationHistory = await discordAIStorageService.getConversationHistory(userId);
                const conversation = discordAIStorageService.formatConversationForAI(conversationHistory);

                // Save user's message to database
                await discordAIStorageService.saveConversationMessage(
                    userId,
                    username,
                    'user',
                    prompt
                );

                // Call the AI service to get a response
                const response = await this.callAIService(prompt, conversation, username);

                // Save AI's response to database
                await discordAIStorageService.saveConversationMessage(
                    userId,
                    username,
                    'model',
                    response
                );

                // Send the response using embed
                await this.sendAIResponse(interaction, prompt, response);
            } catch (aiError: any) {
                console.error('Error calling AI service:', aiError.message);
                try {
                    const errorEmbed = DiscordEmbedUtils.createErrorEmbed(
                        'AI Service Error',
                        `Failed to get AI response: ${aiError.message}`
                    );
                    await interaction.editReply({ embeds: [errorEmbed] });
                } catch (replyError: any) {
                    // If we can't reply (e.g., interaction expired), just log it
                    if (replyError.code === 10062) {
                        console.error('Interaction expired while sending AI error response:', replyError.message);
                    } else {
                        console.error('Error sending AI error response:', replyError.message);
                    }
                }
            }
        } catch (error: any) {
            console.error('Error handling AI command:', error.message);

            // Check if this is an Unknown Interaction error
            if (error.code === 10062) {
                console.error('Interaction expired while processing AI command:', error.message);
                // Don't try to respond to an expired interaction
                return;
            }

            try {
                // Reply with an error message using embed
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed(
                    'Command Error',
                    `Failed to process AI command: ${error.message}`
                );

                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({
                        embeds: [errorEmbed],
                        ephemeral: true
                    });
                }
            } catch (replyError: any) {
                // If we can't reply (e.g., interaction expired), just log it
                console.error('Error sending error reply:', replyError.message);
            }
        }
    }

    /**
     * Handle direct messages to the bot
     * @param message The message
     */
    public async handleDirectMessage(message: Message): Promise<void> {
        try {
            // Ignore messages from bots
            if (message.author.bot) return;

            // Get the content of the message
            const content = message.content.trim();
            if (!content) return;

            const userId = message.author.id;
            const username = message.author.username;

            // Show typing indicator (if channel supports it)
            if ('sendTyping' in message.channel && typeof message.channel.sendTyping === 'function') {
                await message.channel.sendTyping();
            }

            try {
                // Get conversation history from database
                const conversationHistory = await discordAIStorageService.getConversationHistory(userId);
                const conversation = discordAIStorageService.formatConversationForAI(conversationHistory);

                // Save user's message to database
                await discordAIStorageService.saveConversationMessage(
                    userId,
                    username,
                    'user',
                    content
                );

                // Call the AI service to get a response
                const response = await this.callAIService(content, conversation, username);

                // Save AI's response to database
                await discordAIStorageService.saveConversationMessage(
                    userId,
                    username,
                    'model',
                    response                );

                // Send response using embeds (supports long responses)
                const embeds = DiscordEmbedUtils.createLongAIResponseEmbeds(content, response, message.author);
                await message.reply({ embeds });
            } catch (aiError: any) {
                console.error('Error calling AI service:', aiError.message);
                try {
                    const errorEmbed = DiscordEmbedUtils.createErrorEmbed(
                        'AI Service Error',
                        `Failed to get AI response: ${aiError.message}`
                    );
                    await message.reply({ embeds: [errorEmbed] });
                } catch (replyError: any) {
                    console.error('Error sending AI error response in DM:', replyError.message);
                }
            }
        } catch (error: any) {
            console.error('Error handling direct message:', error.message);
            try {
                const errorEmbed = DiscordEmbedUtils.createErrorEmbed(
                    'Message Processing Error',
                    `An error occurred while processing your message: ${error.message}`
                );
                await message.reply({ embeds: [errorEmbed] });
            } catch (replyError: any) {
                console.error('Error sending error response in DM:', replyError.message);
            }
        }
    }

    /**
     * Call the AI service to get a response
     * @param prompt The prompt
     * @param conversation The conversation history
     * @param username The Discord username (optional)
     * @returns The AI response
     */
    private async callAIService(
        prompt: string,
        conversation: Array<{ role: string, parts: Array<{ text: string }> }>,
        username: string = "Discord User"
    ): Promise<string> {
        try {
            // Use the geminiService to generate a response
            const result = await geminiService.generateChatResponse(prompt, username, conversation);

            if (result.success) {
                return result.response;
            } else {
                throw new Error(result.response);
            }
        } catch (error: any) {
            console.error('Error calling AI service:', error.message);
            throw new Error(`Failed to get AI response: ${error.message}`);
        }
    }

    /**
     * Send AI response using embed(s) - supports long responses with memory display
     * @param interaction The interaction
     * @param prompt The user's prompt
     * @param response The AI response
     * @param response The AI response
     */
    private async sendAIResponse(
        interaction: ChatInputCommandInteraction,
        prompt: string,
        response: string
    ): Promise<void> {
        try {
            const embeds = DiscordEmbedUtils.createLongAIResponseEmbeds(prompt, response, interaction.user);
            
            await interaction.editReply({ embeds });
        } catch (error: any) {
            // Handle Unknown Interaction error specifically
            if (error.code === 10062) {
                console.error('Interaction expired while sending AI response:', error.message);
                return;
            }

            console.error('Error sending AI response:', error.message);
            // Fallback to plain text if embed fails
            try {
                // For very long responses, split into multiple messages
                if (response.length > 1900) {
                    const chunks = DiscordEmbedUtils.splitTextIntoChunks(response, 1900);
                    await interaction.editReply(`**AI Response (Part 1):**\n${chunks[0]}`);
                    
                    // Send additional chunks as follow-up messages
                    for (let i = 1; i < chunks.length; i++) {
                        await interaction.followUp(`**AI Response (Part ${i + 1}):**\n${chunks[i]}`);
                    }
                } else {
                    await interaction.editReply(`**AI Response:**\n${response}`);
                }
            } catch (fallbackError: any) {
                console.error('Error sending fallback AI response:', fallbackError.message);
            }
        }
    }

    /**
     * Get the formatted conversation for a user from database
     * @param userId The user ID
     * @returns The formatted conversation
     */
    public async getFormattedConversation(userId: string): Promise<string> {
        try {
            const conversationHistory = await discordAIStorageService.getConversationHistory(userId);
            
            if (!conversationHistory || conversationHistory.length === 0) {
                return 'No conversation history.';
            }

            return conversationHistory.map(msg => {
                const role = msg.role === 'user' ? 'You' : 'AI';
                const timestamp = new Date(msg.createdAt).toLocaleTimeString();
                return `**${role}** (${timestamp}): ${msg.message}`;
            }).join('\n\n');
        } catch (error: any) {
            console.error('Error getting formatted conversation:', error.message);
            return 'Unable to retrieve conversation history.';
        }
    }

    /**
     * Clear conversation history for a user
     * @param userId The user ID
     * @returns Success status
     */
    public async clearUserConversation(userId: string): Promise<boolean> {
        try {
            await discordAIStorageService.clearUserConversation(userId);
            return true;
        } catch (error: any) {
            console.error('Error clearing user conversation:', error.message);
            return false;
        }
    }

    /**
     * Get conversation statistics for a user
     * @param userId The user ID
     * @returns Conversation statistics
     */
    public async getUserStats(userId: string): Promise<any> {
        try {
            return await discordAIStorageService.getConversationStats(userId);
        } catch (error: any) {
            console.error('Error getting user stats:', error.message);
            return null;
        }
    }

    /**
     * Get the AI chat commands for registration
     * @returns The AI chat commands
     */
    public getAIChatCommands(): any {
        return new SlashCommandBuilder()
            .setName('ask')
            .setDescription('Ask a question to the AI (with persistent conversation history)')
            .addStringOption(option =>
                option
                    .setName('prompt')
                    .setDescription('Your question or prompt')
                    .setRequired(true)
            );
    }
}

// Export the singleton instance
export const discordAIService = DiscordAIService.getInstance();
