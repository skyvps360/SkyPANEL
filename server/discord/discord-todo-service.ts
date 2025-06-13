import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    User,
    GuildMember
} from 'discord.js';
import { storage } from '../storage';
import { DiscordEmbedUtils } from './discord-embed-utils';
import { InsertDiscordTodo, UpdateDiscordTodo, DiscordTodo } from '@shared/schema';

/**
 * Discord Todo Service
 * Handles todo list management for Discord users
 */
export class DiscordTodoService {
    private static instance: DiscordTodoService;

    /**
     * Get the singleton instance
     */
    public static getInstance(): DiscordTodoService {
        if (!DiscordTodoService.instance) {
            DiscordTodoService.instance = new DiscordTodoService();
        }
        return DiscordTodoService.instance;
    }

    /**
     * Handle todo command interactions
     */
    public async handleTodoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const subcommand = interaction.options.getSubcommand();

            switch (subcommand) {
                case 'add':
                    await this.handleAddTodo(interaction);
                    break;
                case 'list':
                    await this.handleListTodos(interaction);
                    break;
                case 'complete':
                    await this.handleCompleteTodo(interaction);
                    break;
                case 'delete':
                    await this.handleDeleteTodo(interaction);
                    break;
                case 'edit':
                    await this.handleEditTodo(interaction);
                    break;
                case 'clear':
                    await this.handleClearCompleted(interaction);
                    break;
                default:
                    await interaction.reply({
                        embeds: [DiscordEmbedUtils.createErrorEmbed('Unknown Command', 'Unknown todo subcommand.')],
                        ephemeral: true
                    });
            }
        } catch (error: any) {
            console.error('Error handling todo command:', error.message);
            
            const errorEmbed = DiscordEmbedUtils.createErrorEmbed(
                'Command Error',
                'An error occurred while processing your todo command. Please try again.'
            );

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }

    /**
     * Handle adding a new todo
     */
    private async handleAddTodo(interaction: ChatInputCommandInteraction): Promise<void> {
        const task = interaction.options.getString('task', true);
        const description = interaction.options.getString('description');
        const priority = interaction.options.getString('priority') || 'medium';
        const category = interaction.options.getString('category') || 'general';
        const dueDateStr = interaction.options.getString('due_date');

        let dueDate: Date | undefined;
        if (dueDateStr) {
            dueDate = new Date(dueDateStr);
            if (isNaN(dueDate.getTime())) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Invalid Date', 'Please provide a valid due date in YYYY-MM-DD format.')],
                    ephemeral: true
                });
                return;
            }
        }

        try {
            // Get or create user in database
            const user = await this.getOrCreateUser(interaction.user);
            
            const todoData: InsertDiscordTodo = {
                userId: user.id,
                discordUserId: interaction.user.id,
                discordUsername: interaction.user.username,
                task,
                description,
                priority: priority as 'low' | 'medium' | 'high' | 'urgent',
                category,
                dueDate
            };

            const newTodo = await storage.createDiscordTodo(todoData);

            const embed = DiscordEmbedUtils.createSuccessEmbed(
                'Todo Added',
                `Successfully added todo: **${task}**`
            )
            .addFields(
                { name: '📝 Task', value: task, inline: false },
                { name: '⚡ Priority', value: this.getPriorityEmoji(priority) + ' ' + priority.charAt(0).toUpperCase() + priority.slice(1), inline: true },
                { name: '📂 Category', value: category, inline: true }
            );

            if (description) {
                embed.addFields({ name: '📄 Description', value: description, inline: false });
            }

            if (dueDate) {
                embed.addFields({ name: '📅 Due Date', value: DiscordEmbedUtils.formatTimestamp(dueDate, 'f'), inline: true });
            }

            embed.addFields({ name: '🆔 Todo ID', value: `#${newTodo.id}`, inline: true });

            await interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error adding todo:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to add todo. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle listing todos
     */
    private async handleListTodos(interaction: ChatInputCommandInteraction): Promise<void> {
        const filter = interaction.options.getString('filter') || 'all';
        const category = interaction.options.getString('category');
        const priority = interaction.options.getString('priority');

        try {
            let todos: DiscordTodo[];

            switch (filter) {
                case 'completed':
                    todos = await storage.getCompletedDiscordTodos(interaction.user.id);
                    break;
                case 'pending':
                    todos = await storage.getPendingDiscordTodos(interaction.user.id);
                    break;
                default:
                    todos = await storage.getDiscordTodos(interaction.user.id);
            }

            // Apply additional filters
            if (category) {
                todos = todos.filter(todo => todo.category === category);
            }

            if (priority) {
                todos = todos.filter(todo => todo.priority === priority);
            }

            if (todos.length === 0) {
                const embed = DiscordEmbedUtils.createInfoEmbed(
                    'No Todos Found',
                    'You don\'t have any todos matching the specified criteria.'
                );
                await interaction.reply({ embeds: [embed] });
                return;
            }

            // Paginate todos (10 per page)
            const todosPerPage = 10;
            const totalPages = Math.ceil(todos.length / todosPerPage);
            const currentPage = 1;
            
            const embed = this.createTodoListEmbed(todos, currentPage, totalPages, filter);
            const components = totalPages > 1 ? [DiscordEmbedUtils.createPaginationButtons(currentPage, totalPages, 'todo_list')] : [];

            await interaction.reply({ embeds: [embed], components });

        } catch (error: any) {
            console.error('Error listing todos:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to retrieve todos. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle completing a todo
     */
    private async handleCompleteTodo(interaction: ChatInputCommandInteraction): Promise<void> {
        const todoId = interaction.options.getInteger('id', true);

        try {
            const todo = await storage.getDiscordTodo(todoId);
            
            if (!todo || todo.discordUserId !== interaction.user.id) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Todo Not Found', 'Todo not found or you don\'t have permission to modify it.')],
                    ephemeral: true
                });
                return;
            }

            if (todo.completed) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createWarningEmbed('Already Completed', 'This todo is already marked as completed.')],
                    ephemeral: true
                });
                return;
            }

            const completedTodo = await storage.completeDiscordTodo(todoId);

            const embed = DiscordEmbedUtils.createSuccessEmbed(
                'Todo Completed',
                `Successfully completed todo: **${completedTodo.task}**`
            )
            .addFields(
                { name: '✅ Completed At', value: DiscordEmbedUtils.formatTimestamp(completedTodo.completedAt!, 'f'), inline: true },
                { name: '🆔 Todo ID', value: `#${completedTodo.id}`, inline: true }
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error completing todo:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to complete todo. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle deleting a todo
     */
    private async handleDeleteTodo(interaction: ChatInputCommandInteraction): Promise<void> {
        const todoId = interaction.options.getInteger('id', true);

        try {
            const todo = await storage.getDiscordTodo(todoId);
            
            if (!todo || todo.discordUserId !== interaction.user.id) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Todo Not Found', 'Todo not found or you don\'t have permission to delete it.')],
                    ephemeral: true
                });
                return;
            }

            await storage.deleteDiscordTodo(todoId);

            const embed = DiscordEmbedUtils.createSuccessEmbed(
                'Todo Deleted',
                `Successfully deleted todo: **${todo.task}**`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error deleting todo:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to delete todo. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle editing a todo
     */
    private async handleEditTodo(interaction: ChatInputCommandInteraction): Promise<void> {
        const todoId = interaction.options.getInteger('id', true);
        const newTask = interaction.options.getString('task');
        const newDescription = interaction.options.getString('description');
        const newPriority = interaction.options.getString('priority');
        const newCategory = interaction.options.getString('category');

        try {
            const todo = await storage.getDiscordTodo(todoId);
            
            if (!todo || todo.discordUserId !== interaction.user.id) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createErrorEmbed('Todo Not Found', 'Todo not found or you don\'t have permission to edit it.')],
                    ephemeral: true
                });
                return;
            }

            const updates: UpdateDiscordTodo = {};
            if (newTask) updates.task = newTask;
            if (newDescription !== null) updates.description = newDescription;
            if (newPriority) updates.priority = newPriority as 'low' | 'medium' | 'high' | 'urgent';
            if (newCategory) updates.category = newCategory;

            if (Object.keys(updates).length === 0) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createWarningEmbed('No Changes', 'No changes were specified for the todo.')],
                    ephemeral: true
                });
                return;
            }

            const updatedTodo = await storage.updateDiscordTodo(todoId, updates);

            const embed = DiscordEmbedUtils.createSuccessEmbed(
                'Todo Updated',
                `Successfully updated todo: **${updatedTodo.task}**`
            )
            .addFields(
                { name: '📝 Task', value: updatedTodo.task, inline: false },
                { name: '⚡ Priority', value: this.getPriorityEmoji(updatedTodo.priority) + ' ' + updatedTodo.priority.charAt(0).toUpperCase() + updatedTodo.priority.slice(1), inline: true },
                { name: '📂 Category', value: updatedTodo.category || 'general', inline: true },
                { name: '🆔 Todo ID', value: `#${updatedTodo.id}`, inline: true }
            );

            if (updatedTodo.description) {
                embed.addFields({ name: '📄 Description', value: updatedTodo.description, inline: false });
            }

            await interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error editing todo:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to edit todo. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle clearing completed todos
     */
    private async handleClearCompleted(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            const completedTodos = await storage.getCompletedDiscordTodos(interaction.user.id);

            if (completedTodos.length === 0) {
                await interaction.reply({
                    embeds: [DiscordEmbedUtils.createInfoEmbed('No Completed Todos', 'You don\'t have any completed todos to clear.')],
                    ephemeral: true
                });
                return;
            }

            await storage.clearCompletedDiscordTodos(interaction.user.id);

            const embed = DiscordEmbedUtils.createSuccessEmbed(
                'Completed Todos Cleared',
                `Successfully cleared ${completedTodos.length} completed todo${completedTodos.length === 1 ? '' : 's'}.`
            );

            await interaction.reply({ embeds: [embed] });

        } catch (error: any) {
            console.error('Error clearing completed todos:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to clear completed todos. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Handle button interactions for todo pagination
     */
    public async handleButtonInteraction(interaction: ButtonInteraction): Promise<void> {
        if (!interaction.customId.startsWith('todo_list:')) {
            return;
        }

        const [, action, pageStr] = interaction.customId.split(':');
        const page = parseInt(pageStr);

        if (action === 'page') {
            // Page indicator button - do nothing
            return;
        }

        try {
            // Get todos for the user
            const todos = await storage.getDiscordTodos(interaction.user.id);
            const todosPerPage = 10;
            const totalPages = Math.ceil(todos.length / todosPerPage);

            let newPage = page;
            if (action === 'prev' && page > 1) {
                newPage = page - 1;
            } else if (action === 'next' && page < totalPages) {
                newPage = page + 1;
            }

            const embed = this.createTodoListEmbed(todos, newPage, totalPages, 'all');
            const components = totalPages > 1 ? [DiscordEmbedUtils.createPaginationButtons(newPage, totalPages, 'todo_list')] : [];

            await interaction.update({ embeds: [embed], components });

        } catch (error: any) {
            console.error('Error handling todo pagination:', error.message);
            await interaction.reply({
                embeds: [DiscordEmbedUtils.createErrorEmbed('Error', 'Failed to update todo list. Please try again.')],
                ephemeral: true
            });
        }
    }

    /**
     * Create a todo list embed
     */
    private createTodoListEmbed(todos: DiscordTodo[], page: number, totalPages: number, filter: string): EmbedBuilder {
        const todosPerPage = 10;
        const startIndex = (page - 1) * todosPerPage;
        const endIndex = startIndex + todosPerPage;
        const pageTodos = todos.slice(startIndex, endIndex);

        const embed = DiscordEmbedUtils.createBaseEmbed(DiscordEmbedUtils.COLORS.PRIMARY)
            .setTitle(`📝 Your Todo List (${filter.charAt(0).toUpperCase() + filter.slice(1)})`)
            .setDescription(`Showing ${pageTodos.length} of ${todos.length} todo${todos.length === 1 ? '' : 's'}`);

        if (pageTodos.length === 0) {
            embed.addFields({ name: 'No Todos', value: 'No todos found matching your criteria.', inline: false });
        } else {
            pageTodos.forEach((todo, index) => {
                const status = todo.completed ? '✅' : '⏳';
                const priority = this.getPriorityEmoji(todo.priority);
                const dueDate = todo.dueDate ? ` (Due: ${DiscordEmbedUtils.formatTimestamp(todo.dueDate, 'd')})` : '';

                embed.addFields({
                    name: `${status} ${priority} #${todo.id} - ${todo.task}`,
                    value: `**Category:** ${todo.category || 'general'} | **Priority:** ${todo.priority}${dueDate}${todo.description ? `\n*${DiscordEmbedUtils.truncateText(todo.description, 100)}*` : ''}`,
                    inline: false
                });
            });
        }

        if (totalPages > 1) {
            embed.setFooter({
                text: `Page ${page} of ${totalPages} • ${DiscordEmbedUtils.COMPANY_NAME}`,
                iconURL: DiscordEmbedUtils.COMPANY_ICON
            });
        }

        return embed;
    }

    /**
     * Get priority emoji
     */
    private getPriorityEmoji(priority: string): string {
        switch (priority) {
            case 'urgent': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }

    /**
     * Get or create user in database
     */
    private async getOrCreateUser(discordUser: User | GuildMember): Promise<{ id: number }> {
        // For now, we'll use a simple approach - in a real implementation,
        // you might want to link Discord users to existing SkyPANEL users
        // For this demo, we'll create a mock user ID based on Discord ID
        const discordId = discordUser.id;
        const numericId = parseInt(discordId.slice(-8), 16) % 1000000; // Convert to reasonable number

        return { id: numericId };
    }

    /**
     * Get todo commands for registration
     */
    public getTodoCommands(): any[] {
        return [
            new SlashCommandBuilder()
                .setName('todo')
                .setDescription('Manage your todo list')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a new todo item')
                        .addStringOption(option =>
                            option
                                .setName('task')
                                .setDescription('The todo task')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('description')
                                .setDescription('Optional description for the todo')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('priority')
                                .setDescription('Priority level')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Low', value: 'low' },
                                    { name: 'Medium', value: 'medium' },
                                    { name: 'High', value: 'high' },
                                    { name: 'Urgent', value: 'urgent' }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName('category')
                                .setDescription('Category for the todo')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('due_date')
                                .setDescription('Due date (YYYY-MM-DD format)')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List your todos')
                        .addStringOption(option =>
                            option
                                .setName('filter')
                                .setDescription('Filter todos')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'All', value: 'all' },
                                    { name: 'Pending', value: 'pending' },
                                    { name: 'Completed', value: 'completed' }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName('category')
                                .setDescription('Filter by category')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('priority')
                                .setDescription('Filter by priority')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Low', value: 'low' },
                                    { name: 'Medium', value: 'medium' },
                                    { name: 'High', value: 'high' },
                                    { name: 'Urgent', value: 'urgent' }
                                )
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('complete')
                        .setDescription('Mark a todo as completed')
                        .addIntegerOption(option =>
                            option
                                .setName('id')
                                .setDescription('Todo ID to complete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a todo')
                        .addIntegerOption(option =>
                            option
                                .setName('id')
                                .setDescription('Todo ID to delete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('edit')
                        .setDescription('Edit a todo')
                        .addIntegerOption(option =>
                            option
                                .setName('id')
                                .setDescription('Todo ID to edit')
                                .setRequired(true)
                        )
                        .addStringOption(option =>
                            option
                                .setName('task')
                                .setDescription('New task description')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('description')
                                .setDescription('New description')
                                .setRequired(false)
                        )
                        .addStringOption(option =>
                            option
                                .setName('priority')
                                .setDescription('New priority level')
                                .setRequired(false)
                                .addChoices(
                                    { name: 'Low', value: 'low' },
                                    { name: 'Medium', value: 'medium' },
                                    { name: 'High', value: 'high' },
                                    { name: 'Urgent', value: 'urgent' }
                                )
                        )
                        .addStringOption(option =>
                            option
                                .setName('category')
                                .setDescription('New category')
                                .setRequired(false)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('clear')
                        .setDescription('Clear all completed todos')
                )
        ];
    }
}

// Export the singleton instance
export const discordTodoService = DiscordTodoService.getInstance();
