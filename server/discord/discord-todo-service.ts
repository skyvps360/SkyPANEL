import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    ButtonInteraction,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import {storage} from '../storage';
import {discordBotCore} from './discord-bot-core';

/**
 * Service for handling Discord todo commands
 */
export class DiscordTodoService {
    private static instance: DiscordTodoService;

    private constructor() {
    }

    /**
     * Get the singleton instance of DiscordTodoService
     * @returns The DiscordTodoService instance
     */
    public static getInstance(): DiscordTodoService {
        if (!DiscordTodoService.instance) {
            DiscordTodoService.instance = new DiscordTodoService();
        }
        return DiscordTodoService.instance;
    }

    /**
     * Handle the todo add command
     * @param interaction The command interaction
     */
    public async handleTodoAddCommand(interaction: ChatInputCommandInteraction): Promise<void> {
        try {
            // Get the task from the command options
            const task = interaction.options.getString('task');
            if (!task) {
                await interaction.reply({
                    content: 'You must specify a task to add.',
                    ephemeral: true
                });
                return;
            }

            // Add the task to the database
            await storage.createTodo({
                task,
                completed: false,
                userId: interaction.user.id,
                userName: interaction.user.username
            });

            // Reply with success message
            await interaction.reply({
                content: `Added todo: ${task}`,
                ephemeral: false
            });
        } catch (error: any) {
            console.error('Error adding todo:', error.message);
            await interaction.reply({
                content: `Failed to add todo: ${error.message}`,
                ephemeral: true
            });
        }
    }

    /**
     * Handle the todo complete/incomplete command
     * @param interaction The command interaction or button interaction
     * @param isComplete Whether to mark the todo as complete or incomplete
     */
    public async handleTodoCompleteCommand(
        interaction: ChatInputCommandInteraction | ButtonInteraction,
        isComplete: boolean
    ): Promise<void> {
        try {
            let todoId: string | null = null;

            // Get the todo ID from the command options or button custom ID
            if (interaction instanceof ChatInputCommandInteraction) {
                todoId = interaction.options.getString('id');
            } else if (interaction instanceof ButtonInteraction) {
                const parts = interaction.customId.split(':');
                if (parts.length >= 3) {
                    todoId = parts[2];
                }
            }

            if (!todoId) {
                await interaction.reply({
                    content: 'You must specify a todo ID.',
                    ephemeral: true
                });
                return;
            }

            // Get the todo from the database
            const todo = await storage.getTodo(todoId);
            if (!todo) {
                await interaction.reply({
                    content: `Todo with ID ${todoId} not found.`,
                    ephemeral: true
                });
                return;
            }

            // Check if the user is the owner of the todo
            if (todo.userId !== interaction.user.id) {
                await interaction.reply({
                    content: 'You can only modify your own todos.',
                    ephemeral: true
                });
                return;
            }

            // Update the todo in the database
            await storage.updateTodo(todoId, {completed: isComplete});

            // Reply with success message
            const action = isComplete ? 'completed' : 'marked as incomplete';

            if (interaction instanceof ButtonInteraction) {
                // If it's a button interaction, update the message
                await this.handleTodoListCommand(interaction);
            } else {
                // If it's a command interaction, reply with a message
                await interaction.reply({
                    content: `Todo "${todo.task}" ${action}.`,
                    ephemeral: false
                });
            }
        } catch (error: any) {
            console.error('Error updating todo:', error.message);

            // Reply with an error message
            if (interaction instanceof ButtonInteraction) {
                try {
                    await interaction.reply({
                        content: `Failed to update todo: ${error.message}`,
                        ephemeral: true
                    });
                } catch {
                    await interaction.followUp({
                        content: `Failed to update todo: ${error.message}`,
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: `Failed to update todo: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Handle the todo delete command
     * @param interaction The command interaction or button interaction
     */
    public async handleTodoDeleteCommand(
        interaction: ChatInputCommandInteraction | ButtonInteraction
    ): Promise<void> {
        try {
            let todoId: string | null = null;

            // Get the todo ID from the command options or button custom ID
            if (interaction instanceof ChatInputCommandInteraction) {
                todoId = interaction.options.getString('id');
            } else if (interaction instanceof ButtonInteraction) {
                const parts = interaction.customId.split(':');
                if (parts.length >= 3) {
                    todoId = parts[2];
                }
            }

            if (!todoId) {
                await interaction.reply({
                    content: 'You must specify a todo ID.',
                    ephemeral: true
                });
                return;
            }

            // Get the todo from the database
            const todo = await storage.getTodo(todoId);
            if (!todo) {
                await interaction.reply({
                    content: `Todo with ID ${todoId} not found.`,
                    ephemeral: true
                });
                return;
            }

            // Check if the user is the owner of the todo
            if (todo.userId !== interaction.user.id) {
                await interaction.reply({
                    content: 'You can only delete your own todos.',
                    ephemeral: true
                });
                return;
            }

            // Delete the todo from the database
            await storage.deleteTodo(todoId);

            // Reply with success message
            if (interaction instanceof ButtonInteraction) {
                // If it's a button interaction, update the message
                await this.handleTodoListCommand(interaction);
            } else {
                // If it's a command interaction, reply with a message
                await interaction.reply({
                    content: `Todo "${todo.task}" deleted.`,
                    ephemeral: false
                });
            }
        } catch (error: any) {
            console.error('Error deleting todo:', error.message);

            // Reply with an error message
            if (interaction instanceof ButtonInteraction) {
                try {
                    await interaction.reply({
                        content: `Failed to delete todo: ${error.message}`,
                        ephemeral: true
                    });
                } catch {
                    await interaction.followUp({
                        content: `Failed to delete todo: ${error.message}`,
                        ephemeral: true
                    });
                }
            } else {
                await interaction.reply({
                    content: `Failed to delete todo: ${error.message}`,
                    ephemeral: true
                });
            }
        }
    }

    /**
     * Handle the todo list command
     * @param interaction The command interaction or button interaction
     */
    public async handleTodoListCommand(
        interaction: ChatInputCommandInteraction | ButtonInteraction
    ): Promise<void> {
        try {
            // Defer the reply as this might take some time
            if (interaction instanceof ChatInputCommandInteraction) {
                await interaction.deferReply();
            } else {
                await interaction.deferUpdate();
            }

            // Get the todos from the database
            const todos = await storage.getTodosByUserId(interaction.user.id);

            // Check if there are any todos
            if (todos.length === 0) {
                if (interaction instanceof ChatInputCommandInteraction) {
                    await interaction.editReply('You have no todos. Use `/todo add` to create one.');
                } else {
                    await interaction.editReply({
                        content: 'You have no todos. Use `/todo add` to create one.',
                        components: []
                    });
                }
                return;
            }

            // Sort todos by completion status and creation date
            todos.sort((a, b) => {
                if (a.completed === b.completed) {
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                }
                return a.completed ? 1 : -1;
            });

            // Create the todo list embed
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Your Todo List')
                .setDescription('Here are your todos:')
                .setTimestamp();

            // Add incomplete todos
            const incompleteTodos = todos.filter(todo => !todo.completed);
            if (incompleteTodos.length > 0) {
                let todoList = '';
                for (const todo of incompleteTodos) {
                    todoList += `📝 **${todo.task}** (ID: \`${todo.id}\`)\n`;
                }
                embed.addFields({name: 'Incomplete', value: todoList});
            }

            // Add complete todos
            const completeTodos = todos.filter(todo => todo.completed);
            if (completeTodos.length > 0) {
                let todoList = '';
                for (const todo of completeTodos) {
                    todoList += `✅ **${todo.task}** (ID: \`${todo.id}\`)\n`;
                }
                embed.addFields({name: 'Complete', value: todoList});
            }

            // Create buttons for the first todo
            const buttons = this.createButtons(todos[0].id, todos[0].completed);

            // Reply with the todo list
            if (interaction instanceof ChatInputCommandInteraction) {
                await interaction.editReply({
                    embeds: [embed],
                    components: [buttons]
                });
            } else {
                await interaction.editReply({
                    embeds: [embed],
                    components: [buttons]
                });
            }

            // Set up a collector for button interactions
            const message = await interaction.fetchReply();
            const filter = (i: ButtonInteraction) => i.user.id === interaction.user.id;
            const collector = message.createMessageComponentCollector({filter, time: 60000});

            collector.on('collect', async (i) => {
                // Reset the collector timeout
                collector.resetTimer();

                // Handle the button interaction
                if (i.customId.startsWith('todo:complete:')) {
                    await this.handleTodoCompleteCommand(i, true);
                } else if (i.customId.startsWith('todo:incomplete:')) {
                    await this.handleTodoCompleteCommand(i, false);
                } else if (i.customId.startsWith('todo:delete:')) {
                    await this.handleTodoDeleteCommand(i);
                }
            });

            collector.on('end', async () => {
                // Remove the buttons when the collector ends
                try {
                    if (interaction instanceof ChatInputCommandInteraction) {
                        await interaction.editReply({
                            embeds: [embed],
                            components: []
                        });
                    } else {
                        await interaction.editReply({
                            embeds: [embed],
                            components: []
                        });
                    }
                } catch (error) {
                    console.error('Error removing buttons:', error);
                }
            });
        } catch (error: any) {
            console.error('Error listing todos:', error.message);

            // Reply with an error message
            if (interaction instanceof ChatInputCommandInteraction) {
                if (interaction.deferred) {
                    await interaction.editReply(`Failed to list todos: ${error.message}`);
                } else {
                    await interaction.reply({
                        content: `Failed to list todos: ${error.message}`,
                        ephemeral: true
                    });
                }
            } else {
                try {
                    await interaction.reply({
                        content: `Failed to list todos: ${error.message}`,
                        ephemeral: true
                    });
                } catch {
                    await interaction.followUp({
                        content: `Failed to list todos: ${error.message}`,
                        ephemeral: true
                    });
                }
            }
        }
    }

    /**
     * Create buttons for a todo
     * @param todoId The todo ID
     * @param completed Whether the todo is completed
     * @returns The action row with buttons
     */
    private createButtons(todoId: string, completed: boolean): ActionRowBuilder<ButtonBuilder> {
        const row = new ActionRowBuilder<ButtonBuilder>();

        if (completed) {
            // Add incomplete button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`todo:incomplete:${todoId}`)
                    .setLabel('Mark as Incomplete')
                    .setStyle(ButtonStyle.Primary)
            );
        } else {
            // Add complete button
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`todo:complete:${todoId}`)
                    .setLabel('Mark as Complete')
                    .setStyle(ButtonStyle.Success)
            );
        }

        // Add delete button
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`todo:delete:${todoId}`)
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
        );

        return row;
    }

    /**
     * Get the todo commands for registration
     * @returns The todo commands
     */
    public getTodoCommands(): any[] {
        return [
            new SlashCommandBuilder()
                .setName('todo')
                .setDescription('Manage your todo list')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('add')
                        .setDescription('Add a new todo')
                        .addStringOption(option =>
                            option
                                .setName('task')
                                .setDescription('The task to add')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('complete')
                        .setDescription('Mark a todo as complete')
                        .addStringOption(option =>
                            option
                                .setName('id')
                                .setDescription('The ID of the todo to complete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('incomplete')
                        .setDescription('Mark a todo as incomplete')
                        .addStringOption(option =>
                            option
                                .setName('id')
                                .setDescription('The ID of the todo to mark as incomplete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('delete')
                        .setDescription('Delete a todo')
                        .addStringOption(option =>
                            option
                                .setName('id')
                                .setDescription('The ID of the todo to delete')
                                .setRequired(true)
                        )
                )
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List your todos')
                )
        ];
    }
}

// Export the singleton instance
export const discordTodoService = DiscordTodoService.getInstance();