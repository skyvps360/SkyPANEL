import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    Message,
    EmbedBuilder
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';
import {geminiService} from '../gemini-service';
import {DiscordEmbedUtils} from './discord-embed-utils';

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
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Missing Prompt', 'You must specify a prompt to ask the AI.')],
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

                // Send response using embed
                const embed = DiscordEmbedUtils.createAIEmbed(content, response, message.author);
                await message.reply({ embeds: [embed] });
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
     * Send AI response using embed
     * @param interaction The interaction
     * @param prompt The user's prompt
     * @param response The AI response
     */
    private async sendAIResponse(
        interaction: ChatInputCommandInteraction,
        prompt: string,
        response: string
    ): Promise<void> {
        try {
            const embed = DiscordEmbedUtils.createAIEmbed(prompt, response, interaction.user);
            await interaction.editReply({ embeds: [embed] });
        } catch (error: any) {
            // Handle Unknown Interaction error specifically
            if (error.code === 10062) {
                console.error('Interaction expired while sending AI response:', error.message);
                return;
            }

            console.error('Error sending AI response:', error.message);
            // Fallback to plain text if embed fails
            try {
                await interaction.editReply(`**AI Response:**\n${DiscordEmbedUtils.truncateText(response, 1900)}`);
            } catch (fallbackError: any) {
                console.error('Error sending fallback AI response:', fallbackError.message);
            }
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
