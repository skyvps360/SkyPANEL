import {
    GuildMember,
    User,
    Guild,
    Client
} from 'discord.js';
import {discordBotCore} from './discord-bot-core';

/**
 * Utility functions for Discord bot
 */
export class DiscordUtils {
    /**
     * Search for Discord users by query
     * @param query The search query
     * @param limit The maximum number of results to return
     * @returns The matching users with avatar information
     */
    public static async searchDiscordUsers(
        query: string,
        limit: number = 10
    ): Promise<Array<{ id: string; name: string; roles: string[]; avatar: string | null; username: string }>> {
        try {
            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return [];
            }

            // Get the guild
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return [];
            }

            // Fetch all members
            await guild.members.fetch();

            // Search for members
            const results: Array<{ id: string; name: string; roles: string[]; avatar: string | null; username: string }> = [];
            const lowerQuery = query.toLowerCase();

            // Search through members
            for (const [_, member] of guild.members.cache) {
                // Skip bots
                if (member.user.bot) continue;

                // Check if the member matches the query
                const username = member.user.username.toLowerCase();
                const nickname = member.nickname?.toLowerCase() || '';
                const tag = member.user.tag.toLowerCase();
                const id = member.user.id;

                if (
                    username.includes(lowerQuery) ||
                    nickname.includes(lowerQuery) ||
                    tag.includes(lowerQuery) ||
                    id === query
                ) {
                    // Get the member's roles
                    const roles = member.roles.cache
                        .filter(role => role.id !== guild.id) // Filter out @everyone role
                        .map(role => role.name);

                    // Add the member to the results with avatar information
                    results.push({
                        id: member.user.id,
                        name: member.nickname || member.user.username,
                        username: member.user.username,
                        avatar: member.user.avatar, // This is the avatar hash from Discord
                        roles
                    });

                    // Break if we've reached the limit
                    if (results.length >= limit) break;
                }
            }

            return results;
        } catch (error: any) {
            console.error('Error searching Discord users:', error.message);
            return [];
        }
    }

    /**
     * Get a Discord user by ID
     * @param userId The user ID
     * @returns The user information with avatar or null if not found
     */
    public static async getDiscordUser(
        userId: string
    ): Promise<{ id: string; name: string; roles: string[]; avatar: string | null; username: string } | null> {
        try {
            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return null;
            }

            // Get the guild
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return null;
            }

            // Get the member
            try {
                const member = await guild.members.fetch(userId);
                if (!member) return null;

                // Get the member's roles
                const roles = member.roles.cache
                    .filter(role => role.id !== guild.id) // Filter out @everyone role
                    .map(role => role.name);

                // Return the user information with avatar
                return {
                    id: member.user.id,
                    name: member.nickname || member.user.username,
                    username: member.user.username,
                    avatar: member.user.avatar, // This is the avatar hash from Discord
                    roles
                };
            } catch {
                return null;
            }
        } catch (error: any) {
            console.error('Error getting Discord user:', error.message);
            return null;
        }
    }

    /**
     * Check if a user has a specific role
     * @param userId The user ID
     * @param roleName The role name
     * @returns True if the user has the role
     */
    public static async userHasRole(userId: string, roleName: string): Promise<boolean> {
        try {
            const client = discordBotCore.getClient();
            const guildId = await discordBotCore.getGuildId();

            if (!client || !guildId) {
                console.log('Discord client or guild ID not available');
                return false;
            }

            // Get the guild
            const guild = await client.guilds.fetch(guildId);
            if (!guild) {
                console.error(`Guild with ID ${guildId} not found`);
                return false;
            }

            // Get the member
            try {
                const member = await guild.members.fetch(userId);
                if (!member) return false;

                // Check if the member has the role
                return member.roles.cache.some(role => role.name === roleName);
            } catch {
                return false;
            }
        } catch (error: any) {
            console.error('Error checking if user has role:', error.message);
            return false;
        }
    }

    /**
     * Send a direct message to a user
     * @param userId The user ID
     * @param message The message to send
     * @returns True if the message was sent successfully
     */
    public static async sendDirectMessage(userId: string, message: string): Promise<boolean> {
        try {
            const client = discordBotCore.getClient();
            if (!client) {
                console.log('Discord client not available');
                return false;
            }

            // Get the user
            try {
                const user = await client.users.fetch(userId);
                if (!user) return false;

                // Send the message
                await user.send(message);
                return true;
            } catch {
                return false;
            }
        } catch (error: any) {
            console.error('Error sending direct message:', error.message);
            return false;
        }
    }

    /**
     * Format a timestamp for Discord
     * @param timestamp The timestamp
     * @param format The format to use
     * @returns The formatted timestamp
     */
    public static formatTimestamp(timestamp: Date | number, format: 'f' | 'F' | 'R' | 't' | 'T' | 'd' | 'D' = 'f'): string {
        const unixTimestamp = timestamp instanceof Date ? Math.floor(timestamp.getTime() / 1000) : Math.floor(timestamp / 1000);
        return `<t:${unixTimestamp}:${format}>`;
    }

    /**
     * Escape Discord markdown characters
     * @param text The text to escape
     * @returns The escaped text
     */
    public static escapeMarkdown(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/~/g, '\\~')
            .replace(/`/g, '\\`')
            .replace(/>/g, '\\>')
            .replace(/\|/g, '\\|');
    }

    /**
     * Truncate a string to a maximum length
     * @param text The text to truncate
     * @param maxLength The maximum length
     * @param suffix The suffix to add if truncated
     * @returns The truncated text
     */
    public static truncate(text: string, maxLength: number, suffix: string = '...'): string {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - suffix.length) + suffix;
    }

    /**
     * Check if a string is a valid Discord ID
     * @param id The ID to check
     * @returns True if the ID is valid
     */
    public static isValidDiscordId(id: string): boolean {
        return /^\d{17,19}$/.test(id);
    }

    /**
     * Get Discord avatar URL for a user
     * @param userId The user's Discord ID
     * @param avatarHash The user's avatar hash (null if using default)
     * @param size The desired image size (default: 128)
     * @returns The Discord avatar URL
     */
    public static getDiscordAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
        if (avatarHash) {
            // User has a custom avatar
            const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
            return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
        } else {
            // User is using default avatar
            // Use BigInt to handle large Discord IDs properly
            const defaultAvatarNumber = Number(BigInt(userId) % 5n);
            return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
        }
    }
}