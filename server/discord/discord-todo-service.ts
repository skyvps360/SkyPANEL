import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ComponentType
} from 'discord.js';
import { db } from '../db';
import { todos } from '../../shared/schemas/todo-schema';
import { eq, and, desc } from 'drizzle-orm';

/**
 * Discord Todo Service
 * Handles todo-related Discord slash commands
 */
export class DiscordTodoService {
    /**
     * Get todo slash commands
     * @returns Array of slash command builders
     */
    public getTodoCommands(): SlashCommandBuilder[] {
        return [
            // Add todo command
            new SlashCommandBuilder()
                .setName('todo-add')
                .setDescription('Add a new task to your todo list')
                .addStringOption(option =>
                    option.setName('task')
                        .setDescription('The task to add')
                        .setRequired(true)
                        .setMaxLength(500)
                ),

            // List todos command
            new SlashCommandBuilder()
                .setName('todo-list')
                .setDescription('View your todo list'),

            // Complete todo command
            new SlashCommandBuilder()
                .setName('todo-complete')
                .setDescription('Mark a task as completed')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('The ID of the task to complete')
                        .setRequired(true)
                        .setMinValue(1)
                ),

            // Delete todo command
            new SlashCommandBuilder()
                .setName('todo-delete')
                .setDescription('Delete a task from your todo list')
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('The ID of the task to delete')
                        .setRequired(true)
                        .setMinValue(1)
                ),

            // Clear completed todos command
            new SlashCommandBuilder()
                .setName('todo-clear')
                .setDescription('Clear all completed tasks from your todo list')
        ];
    }

    /**
     * Handle todo command interactions
     * @param interaction The command interaction
     */
    public async handleTodoCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        const commandName = interaction.commandName;
        const userId = interaction.user.id;

        try {
            switch (commandName) {
                case 'todo-add':
                    await this.handleAddTodo(interaction, userId);
                    break;
                case 'todo-list':
                    await this.handleListTodos(interaction, userId);
                    break;
                case 'todo-complete':
                    await this.handleCompleteTodo(interaction, userId);
                    break;
                case 'todo-delete':
                    await this.handleDeleteTodo(interaction, userId);
                    break;
                case 'todo-clear':
                    await this.handleClearCompleted(interaction, userId);
                    break;
                default:
                    await interaction.reply({
                        content: 'Unknown todo command.',
                        ephemeral: true
                    });
            }
        } catch (error: any) {
            console.error(`Error handling todo command ${commandName}:`, error);
            
            const errorMessage = 'An error occurred while processing your todo command. Please try again.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }

    /**
     * Handle adding a new todo
     * @param interaction The command interaction
     * @param userId The Discord user ID
     */
    private async handleAddTodo(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
        const task = interaction.options.getString('task', true);

        // Insert the new todo
        const [newTodo] = await db.insert(todos).values({
            userId,
            task,
            isCompleted: false
        }).returning();

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Task Added')
            .setDescription(`**Task #${newTodo.id}:** ${task}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle listing todos
     * @param interaction The command interaction
     * @param userId The Discord user ID
     */
    private async handleListTodos(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
        const userTodos = await db.select()
            .from(todos)
            .where(eq(todos.userId, userId))
            .orderBy(desc(todos.createdAt));

        if (userTodos.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(0x808080)
                .setTitle('📝 Your Todo List')
                .setDescription('Your todo list is empty! Use `/todo-add` to add your first task.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        // Separate completed and pending tasks
        const pendingTasks = userTodos.filter(todo => !todo.isCompleted);
        const completedTasks = userTodos.filter(todo => todo.isCompleted);

        let description = '';

        if (pendingTasks.length > 0) {
            description += '**📋 Pending Tasks:**\n';
            pendingTasks.forEach(todo => {
                description += `\`${todo.id}\` - ${todo.task}\n`;
            });
            description += '\n';
        }

        if (completedTasks.length > 0) {
            description += '**✅ Completed Tasks:**\n';
            completedTasks.forEach(todo => {
                description += `\`${todo.id}\` - ~~${todo.task}~~\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('📝 Your Todo List')
            .setDescription(description)
            .addFields(
                { name: 'Total Tasks', value: userTodos.length.toString(), inline: true },
                { name: 'Pending', value: pendingTasks.length.toString(), inline: true },
                { name: 'Completed', value: completedTasks.length.toString(), inline: true }
            )
            .setTimestamp();

        // Add action buttons
        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('todo_refresh')
                    .setLabel('🔄 Refresh')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('todo_clear_completed')
                    .setLabel('🗑️ Clear Completed')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(completedTasks.length === 0)
            );

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    }

    /**
     * Handle completing a todo
     * @param interaction The command interaction
     * @param userId The Discord user ID
     */
    private async handleCompleteTodo(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
        const todoId = interaction.options.getInteger('id', true);

        // Check if the todo exists and belongs to the user
        const [existingTodo] = await db.select()
            .from(todos)
            .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
            .limit(1);

        if (!existingTodo) {
            await interaction.reply({
                content: `❌ Task #${todoId} not found in your todo list.`,
                ephemeral: true
            });
            return;
        }

        if (existingTodo.isCompleted) {
            await interaction.reply({
                content: `✅ Task #${todoId} is already completed.`,
                ephemeral: true
            });
            return;
        }

        // Mark as completed
        await db.update(todos)
            .set({ 
                isCompleted: true,
                updatedAt: new Date()
            })
            .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

        const embed = new EmbedBuilder()
            .setColor(0x00ff00)
            .setTitle('✅ Task Completed')
            .setDescription(`**Task #${todoId}:** ~~${existingTodo.task}~~`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle deleting a todo
     * @param interaction The command interaction
     * @param userId The Discord user ID
     */
    private async handleDeleteTodo(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
        const todoId = interaction.options.getInteger('id', true);

        // Check if the todo exists and belongs to the user
        const [existingTodo] = await db.select()
            .from(todos)
            .where(and(eq(todos.id, todoId), eq(todos.userId, userId)))
            .limit(1);

        if (!existingTodo) {
            await interaction.reply({
                content: `❌ Task #${todoId} not found in your todo list.`,
                ephemeral: true
            });
            return;
        }

        // Delete the todo
        await db.delete(todos)
            .where(and(eq(todos.id, todoId), eq(todos.userId, userId)));

        const embed = new EmbedBuilder()
            .setColor(0xff0000)
            .setTitle('🗑️ Task Deleted')
            .setDescription(`**Task #${todoId}:** ${existingTodo.task}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle clearing completed todos
     * @param interaction The command interaction
     * @param userId The Discord user ID
     */
    private async handleClearCompleted(interaction: ChatInputCommandInteraction, userId: string): Promise<void> {
        // Get count of completed todos
        const completedTodos = await db.select()
            .from(todos)
            .where(and(eq(todos.userId, userId), eq(todos.isCompleted, true)));

        if (completedTodos.length === 0) {
            await interaction.reply({
                content: '📝 No completed tasks to clear.',
                ephemeral: true
            });
            return;
        }

        // Delete completed todos
        await db.delete(todos)
            .where(and(eq(todos.userId, userId), eq(todos.isCompleted, true)));

        const embed = new EmbedBuilder()
            .setColor(0xff9900)
            .setTitle('🗑️ Completed Tasks Cleared')
            .setDescription(`Removed ${completedTodos.length} completed task(s) from your todo list.`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    /**
     * Handle button interactions for todo commands
     * @param interaction The button interaction
     */
    public async handleTodoButton(interaction: any): Promise<void> {
        const customId = interaction.customId;
        const userId = interaction.user.id;

        try {
            if (customId === 'todo_refresh') {
                // Refresh the todo list
                await interaction.deferUpdate();
                
                // Get updated todos
                const userTodos = await db.select()
                    .from(todos)
                    .where(eq(todos.userId, userId))
                    .orderBy(desc(todos.createdAt));

                // Recreate the embed with updated data
                const pendingTasks = userTodos.filter(todo => !todo.isCompleted);
                const completedTasks = userTodos.filter(todo => todo.isCompleted);

                let description = '';

                if (pendingTasks.length > 0) {
                    description += '**📋 Pending Tasks:**\n';
                    pendingTasks.forEach(todo => {
                        description += `\`${todo.id}\` - ${todo.task}\n`;
                    });
                    description += '\n';
                }

                if (completedTasks.length > 0) {
                    description += '**✅ Completed Tasks:**\n';
                    completedTasks.forEach(todo => {
                        description += `\`${todo.id}\` - ~~${todo.task}~~\n`;
                    });
                }

                if (userTodos.length === 0) {
                    description = 'Your todo list is empty! Use `/todo-add` to add your first task.';
                }

                const embed = new EmbedBuilder()
                    .setColor(0x0099ff)
                    .setTitle('📝 Your Todo List')
                    .setDescription(description)
                    .addFields(
                        { name: 'Total Tasks', value: userTodos.length.toString(), inline: true },
                        { name: 'Pending', value: pendingTasks.length.toString(), inline: true },
                        { name: 'Completed', value: completedTasks.length.toString(), inline: true }
                    )
                    .setTimestamp();

                const row = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('todo_refresh')
                            .setLabel('🔄 Refresh')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId('todo_clear_completed')
                            .setLabel('🗑️ Clear Completed')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(completedTasks.length === 0)
                    );

                await interaction.editReply({ embeds: [embed], components: [row] });
            } else if (customId === 'todo_clear_completed') {
                await interaction.deferReply({ ephemeral: true });
                
                // Clear completed todos
                const completedTodos = await db.select()
                    .from(todos)
                    .where(and(eq(todos.userId, userId), eq(todos.isCompleted, true)));

                if (completedTodos.length === 0) {
                    await interaction.editReply({
                        content: '📝 No completed tasks to clear.'
                    });
                    return;
                }

                await db.delete(todos)
                    .where(and(eq(todos.userId, userId), eq(todos.isCompleted, true)));

                await interaction.editReply({
                    content: `🗑️ Cleared ${completedTodos.length} completed task(s) from your todo list.`
                });
            }
        } catch (error: any) {
            console.error('Error handling todo button interaction:', error);
            
            const errorMessage = 'An error occurred while processing your request.';
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
}

// Export singleton instance
export const discordTodoService = new DiscordTodoService();