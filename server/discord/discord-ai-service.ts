import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    Message,
    EmbedBuilder
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';
import {geminiService} from '../gemini-service';

/**
 * Service for handling Discord AI commands and interactions
 */
export class DiscordAIService {
    private static instance: DiscordAIService;
    private userConversations: Map<string, Array<{ role: string, parts: Array<{ text: string }> }>> = new Map();

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
     * Handle the AI command
     * @param interaction The command interaction
     */
    public async handleAICommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Get the prompt from the command options
            const prompt = interaction.options.getString('prompt');
            if (!prompt) {
                await interaction.reply({
                    content: 'You must specify a prompt.',
                    ephemeral: true
                });
                return;
            }

            // Defer the reply as this might take some time
            await interaction.deferReply();

            // Get or initialize the conversation for this user
            if (!this.userConversations.has(interaction.user.id)) {
                this.userConversations.set(interaction.user.id, []);
            }

            const conversation = this.userConversations.get(interaction.user.id)!;

            // Add the user's message to the conversation
            conversation.push({
                role: 'user',
                parts: [{text: prompt}]
            });

            try {
                // Call the AI service to get a response
                const response = await this.callAIService(prompt, conversation, interaction.user.username);

                // Add the AI's response to the conversation
                conversation.push({
                    role: 'model',
                    parts: [{text: response}]
                });

                // Limit the conversation history to the last 10 messages
                if (conversation.length > 10) {
                    this.userConversations.set(
                        interaction.user.id,
                        conversation.slice(conversation.length - 10)
                    );
                }

                // Send the response
                await this.sendLongMessage(interaction, response);
            } catch (aiError: any) {
                console.error('Error calling AI service:', aiError.message);
                try {
                    await interaction.editReply(`Error: ${aiError.message}`);
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
                // Reply with an error message
                if (interaction.deferred) {
                    await interaction.editReply(`Failed to process AI command: ${error.message}`);
                } else {
                    await interaction.reply({
                        content: `Failed to process AI command: ${error.message}`,
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

            // Get or initialize the conversation for this user
            if (!this.userConversations.has(message.author.id)) {
                this.userConversations.set(message.author.id, []);
            }

            const conversation = this.userConversations.get(message.author.id)!;

            // Add the user's message to the conversation
            conversation.push({
                role: 'user',
                parts: [{text: content}]
            });

            // Show typing indicator
            await message.channel.sendTyping();

            try {
                // Call the AI service to get a response
                const response = await this.callAIService(content, conversation, message.author.username);

                // Add the AI's response to the conversation
                conversation.push({
                    role: 'model',
                    parts: [{text: response}]
                });

                // Limit the conversation history to the last 10 messages
                if (conversation.length > 10) {
                    this.userConversations.set(
                        message.author.id,
                        conversation.slice(conversation.length - 10)
                    );
                }

                // Split the response into chunks if it's too long
                const maxLength = 2000;
                if (response.length <= maxLength) {
                    await message.reply(response);
                } else {
                    // Split the message into chunks
                    const chunks = [];
                    for (let i = 0; i < response.length; i += maxLength) {
                        chunks.push(response.substring(i, i + maxLength));
                    }

                    // Send each chunk
                    for (const chunk of chunks) {
                        await message.channel.send(chunk);
                    }
                }
            } catch (aiError: any) {
                console.error('Error calling AI service:', aiError.message);
                try {
                    await message.reply(`Error: ${aiError.message}`);
                } catch (replyError: any) {
                    console.error('Error sending AI error response in DM:', replyError.message);
                }
            }
        } catch (error: any) {
            console.error('Error handling direct message:', error.message);
            try {
                await message.reply(`An error occurred while processing your message: ${error.message}`);
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
     * Send a long message, splitting it into chunks if necessary
     * @param interaction The interaction
     * @param message The message to send
     * @param isEdit Whether to edit the reply or send a new one
     */
    private async sendLongMessage(
        interaction: ChatInputCommandInteraction,
        message: string,
        isEdit: boolean = true
    ): Promise<void> {
        try {
            const maxLength = 2000;

            if (message.length <= maxLength) {
                // If the message is short enough, send it as is
                if (isEdit) {
                    await interaction.editReply(message);
                } else {
                    await interaction.followUp(message);
                }
            } else {
                // Split the message into chunks
                const chunks = [];
                for (let i = 0; i < message.length; i += maxLength) {
                    chunks.push(message.substring(i, i + maxLength));
                }

                // Send each chunk
                for (let i = 0; i < chunks.length; i++) {
                    try {
                        if (i === 0 && isEdit) {
                            await interaction.editReply(chunks[i]);
                        } else {
                            await interaction.followUp(chunks[i]);
                        }
                    } catch (chunkError: any) {
                        // If we get an Unknown Interaction error, log it but don't throw
                        // This happens when the interaction expires during processing
                        if (chunkError.code === 10062) {
                            console.error(`Interaction expired while sending chunk ${i+1}/${chunks.length}:`, chunkError.message);
                            // Stop trying to send more chunks if the interaction is expired
                            return;
                        } else {
                            // For other errors, log and continue trying other chunks
                            console.error(`Error sending chunk ${i+1}/${chunks.length}:`, chunkError.message);
                        }
                    }
                }
            }
        } catch (error: any) {
            // Handle Unknown Interaction error specifically
            if (error.code === 10062) {
                console.error('Interaction expired while sending message:', error.message);
                // Don't throw, just log the error
                return;
            }

            console.error('Error sending long message:', error.message);
            // Don't throw the error to prevent crashing the application
            // Just log it and continue
        }
    }

    /**
     * Get the formatted conversation for a user
     * @param userId The user ID
     * @returns The formatted conversation
     */
    public getFormattedConversation(userId: string): string {
        const conversation = this.userConversations.get(userId);
        if (!conversation || conversation.length === 0) {
            return 'No conversation history.';
        }

        return conversation.map(msg => {
            const role = msg.role === 'user' ? 'You' : 'AI';
            return `**${role}**: ${msg.parts.map(part => part.text).join(' ')}`;
        }).join('\n\n');
    }

    /**
     * Get the AI chat commands for registration
     * @returns The AI chat commands
     */
    public getAIChatCommands(): any {
        return new SlashCommandBuilder()
            .setName('ask')
            .setDescription('Ask a question to the AI')
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
