import {
    EmbedBuilder,
    ColorResolvable,
    User,
    GuildMember,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder
} from 'discord.js';

/**
 * Discord Embed Utility Service
 * Provides standardized embed templates and utilities for consistent Discord bot responses
 */
export class DiscordEmbedUtils {
    // Brand colors
    public static readonly COLORS = {
        PRIMARY: 0x3b82f6,      // Blue
        SUCCESS: 0x10b981,      // Green
        ERROR: 0xef4444,        // Red
        WARNING: 0xf59e0b,      // Amber
        INFO: 0x6366f1,         // Indigo
        SECONDARY: 0x6b7280,    // Gray
        PURPLE: 0x8b5cf6,       // Purple
        PINK: 0xec4899,         // Pink
    } as const;

    // Company branding
    private static readonly COMPANY_NAME = 'SkyVPS360';
    private static readonly COMPANY_URL = 'https://skyvps360.xyz';
    private static readonly COMPANY_ICON = 'https://skyvps360.xyz/favicon.ico';

    /**
     * Create a basic embed with company branding
     */
    public static createBaseEmbed(color: ColorResolvable = this.COLORS.PRIMARY): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(color)
            .setTimestamp()
            .setFooter({
                text: this.COMPANY_NAME,
                iconURL: this.COMPANY_ICON
            });
    }

    /**
     * Create a success embed
     */
    public static createSuccessEmbed(title: string, description?: string): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.SUCCESS)
            .setTitle(`✅ ${title}`);
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    /**
     * Create an error embed
     */
    public static createErrorEmbed(title: string, description?: string): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.ERROR)
            .setTitle(`❌ ${title}`);
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    /**
     * Create a warning embed
     */
    public static createWarningEmbed(title: string, description?: string): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.WARNING)
            .setTitle(`⚠️ ${title}`);
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    /**
     * Create an info embed
     */
    public static createInfoEmbed(title: string, description?: string): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.INFO)
            .setTitle(`ℹ️ ${title}`);
        
        if (description) {
            embed.setDescription(description);
        }
        
        return embed;
    }

    /**
     * Create an AI response embed
     */
    public static createAIEmbed(
        prompt: string, 
        response: string, 
        user?: User | GuildMember
    ): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.PURPLE)
            .setTitle('🤖 SkyAI Response')
            .setDescription(response.length > 4096 ? response.substring(0, 4093) + '...' : response)
            .addFields(
                { name: '💭 Your Question', value: prompt.length > 1024 ? prompt.substring(0, 1021) + '...' : prompt }
            );

        if (user) {
            embed.setAuthor({
                name: user instanceof GuildMember ? user.displayName : user.username,
                iconURL: user.displayAvatarURL()
            });
        }

        return embed;
    }

    /**
     * Create a moderation action embed
     */
    public static createModerationEmbed(
        action: string,
        target: User | GuildMember,
        moderator: User | GuildMember,
        reason?: string,
        duration?: string
    ): EmbedBuilder {
        const embed = this.createBaseEmbed(this.COLORS.WARNING)
            .setTitle(`🛡️ Moderation Action: ${action}`)
            .addFields(
                { name: '👤 Target', value: `${target.toString()} (${target instanceof GuildMember ? target.displayName : target.username})`, inline: true },
                { name: '👮 Moderator', value: `${moderator.toString()} (${moderator instanceof GuildMember ? moderator.displayName : moderator.username})`, inline: true }
            );

        if (reason) {
            embed.addFields({ name: '📝 Reason', value: reason, inline: false });
        }

        if (duration) {
            embed.addFields({ name: '⏰ Duration', value: duration, inline: true });
        }

        embed.setThumbnail(target.displayAvatarURL());

        return embed;
    }

    /**
     * Create a ticket embed
     */
    public static createTicketEmbed(
        ticketId: number,
        subject: string,
        status: string,
        priority: string,
        user?: string
    ): EmbedBuilder {
        const statusEmoji = status === 'open' ? '🟢' : status === 'in-progress' ? '🟡' : '🔴';
        const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';

        const embed = this.createBaseEmbed(this.COLORS.PRIMARY)
            .setTitle(`🎫 Ticket #${ticketId}`)
            .setDescription(subject)
            .addFields(
                { name: '📊 Status', value: `${statusEmoji} ${status.charAt(0).toUpperCase() + status.slice(1)}`, inline: true },
                { name: '⚡ Priority', value: `${priorityEmoji} ${priority.charAt(0).toUpperCase() + priority.slice(1)}`, inline: true }
            );

        if (user) {
            embed.addFields({ name: '👤 User', value: user, inline: true });
        }

        return embed;
    }

    /**
     * Create a status embed
     */
    public static createStatusEmbed(
        systemStatus: string,
        services: Array<{ name: string; status: string; uptime?: string }>
    ): EmbedBuilder {
        const statusEmoji = systemStatus === 'operational' ? '🟢' : systemStatus === 'degraded' ? '🟡' : '🔴';
        
        const embed = this.createBaseEmbed(this.COLORS.SUCCESS)
            .setTitle(`📊 ${this.COMPANY_NAME} System Status`)
            .setDescription(`${statusEmoji} Overall Status: **${systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}**`)
            .setURL(this.COMPANY_URL);

        services.forEach(service => {
            const serviceEmoji = service.status === 'operational' ? '🟢' : service.status === 'degraded' ? '🟡' : '🔴';
            const uptimeText = service.uptime ? ` (${service.uptime})` : '';
            embed.addFields({
                name: service.name,
                value: `${serviceEmoji} ${service.status.charAt(0).toUpperCase() + service.status.slice(1)}${uptimeText}`,
                inline: true
            });
        });

        return embed;
    }

    /**
     * Create pagination buttons
     */
    public static createPaginationButtons(
        currentPage: number,
        totalPages: number,
        customId: string
    ): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>();

        // Previous button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${customId}:prev:${currentPage - 1}`)
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('⬅️')
                .setDisabled(currentPage <= 1)
        );

        // Page indicator
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${customId}:page:${currentPage}`)
                .setLabel(`${currentPage}/${totalPages}`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );

        // Next button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`${customId}:next:${currentPage + 1}`)
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('➡️')
                .setDisabled(currentPage >= totalPages)
        );

        return row;
    }

    /**
     * Truncate text to fit Discord limits
     */
    public static truncateText(text: string, maxLength: number = 1024): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    /**
     * Format timestamp for Discord
     */
    public static formatTimestamp(date: Date, format: 'f' | 'F' | 'R' | 't' | 'T' | 'd' | 'D' = 'f'): string {
        const timestamp = Math.floor(date.getTime() / 1000);
        return `<t:${timestamp}:${format}>`;
    }

    /**
     * Create a loading embed
     */
    public static createLoadingEmbed(message: string = 'Processing...'): EmbedBuilder {
        return this.createBaseEmbed(this.COLORS.SECONDARY)
            .setTitle('⏳ Loading')
            .setDescription(message);
    }

    /**
     * Create AI response embeds that can handle long responses
     * Splits responses across multiple embeds if needed
     */
    public static createLongAIResponseEmbeds(
        prompt: string,
        response: string,
        user?: User | GuildMember
    ): EmbedBuilder[] {
        const embeds: EmbedBuilder[] = [];
        
        // Constants for Discord limits
        const MAX_EMBED_DESCRIPTION = 4000; // Leave some buffer from 4096 limit
        const MAX_FIELD_VALUE = 1020; // Leave some buffer from 1024 limit
        
        // Create the first embed with the prompt
        const baseEmbed = this.createBaseEmbed(this.COLORS.PURPLE)
            .setTitle('🤖 SkyAI Response');
            
        if (user) {
            baseEmbed.setAuthor({
                name: user instanceof GuildMember ? user.displayName : user.username,
                iconURL: user.displayAvatarURL()
            });
        }
        
        // Add the prompt field (truncate if too long)
        const truncatedPrompt = prompt.length > MAX_FIELD_VALUE 
            ? prompt.substring(0, MAX_FIELD_VALUE - 3) + '...'
            : prompt;
        baseEmbed.addFields({ name: '💭 Your Question', value: truncatedPrompt });
        
        // Split the response into chunks if it's too long for a single description
        const chunks = this.splitTextIntoChunks(response, MAX_EMBED_DESCRIPTION);
        
        // Set the description for the first embed
        baseEmbed.setDescription(chunks[0]);
        embeds.push(baseEmbed);
        
        // Create additional embeds for the rest of the chunks
        if (chunks.length > 1) {
            for (let i = 1; i < chunks.length; i++) {
                const continuationEmbed = this.createBaseEmbed(this.COLORS.PURPLE)
                    .setDescription(chunks[i]);
                embeds.push(continuationEmbed);
            }
        }
        
        return embeds;
    }
    
    /**
     * Split text into chunks that fit within Discord embed limits
     * Tries to split at natural break points (sentences, paragraphs)
     */
    public static splitTextIntoChunks(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) return [text];
        
        const chunks: string[] = [];
        let remainingText = text;
        
        while (remainingText.length > 0) {
            if (remainingText.length <= maxLength) {
                chunks.push(remainingText);
                break;
            }
            
            // Try to find a good break point
            let breakPoint = maxLength;
            
            // Look for paragraph breaks (double newlines)
            const paragraphBreak = remainingText.lastIndexOf('\n\n', maxLength);
            if (paragraphBreak > maxLength * 0.5) { // Only use if it's not too early
                breakPoint = paragraphBreak + 2;
            } else {
                // Look for sentence breaks
                const sentenceBreak = remainingText.lastIndexOf('. ', maxLength);
                if (sentenceBreak > maxLength * 0.5) {
                    breakPoint = sentenceBreak + 2;
                } else {
                    // Look for any newline
                    const lineBreak = remainingText.lastIndexOf('\n', maxLength);
                    if (lineBreak > maxLength * 0.5) {
                        breakPoint = lineBreak + 1;
                    } else {
                        // Look for word boundaries
                        const wordBreak = remainingText.lastIndexOf(' ', maxLength);
                        if (wordBreak > maxLength * 0.5) {
                            breakPoint = wordBreak + 1;
                        }
                        // If no good break point found, use maxLength (hard break)
                    }
                }
            }
            
            chunks.push(remainingText.substring(0, breakPoint));
            remainingText = remainingText.substring(breakPoint);
        }
        
        return chunks;
    }
}
