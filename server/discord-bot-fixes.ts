/**
 * This file contains fixes for the Discord bot service.
 * It's not meant to be imported, but rather to show code examples to fix the issues.
 */

/**
 * SOLUTION 1: Updated handleCommand function catch block to handle archived thread errors
 * 
 * Replace the catch block in handleCommand with this:
 */

try {
  // Command processing code...
} catch (error: any) {
  console.error(`Error handling Discord command for ticket #${ticketId}:`, error.message);

  // Special handling for common Discord API errors
  if (error.code === 10062) { // Unknown interaction error
    console.log('Unknown interaction error: The interaction response time expired');
    return; // Just return without trying to reply to avoid unhandled promise rejection
  }

  try {
    await interaction.reply({
      content: `An error occurred while processing your command: ${error.message}`,
      ephemeral: true
    });
  } catch (replyError: any) {
    // If we can't reply to the interaction (e.g., it's already timed out), log it and continue
    console.log(`Could not reply to interaction due to: ${replyError.message}`);
  }
}

/**
 * SOLUTION 2: Add a check for archived threads at the beginning of handleCommand
 * 
 * Add this code after checking that the channel is a thread but before processing the command:
 */

// Only handle commands in threads
if (!interaction.channel?.isThread()) {
  await interaction.reply({
    content: 'This command can only be used in ticket threads.',
    ephemeral: true
  });
  return;
}

const thread = interaction.channel as ThreadChannel;

// Check if thread is archived and try to unarchive it
if (thread.archived) {
  try {
    await thread.setArchived(false);
    console.log(`Unarchived thread ${thread.id} to process command`);
  } catch (archiveError: any) {
    console.log(`Error unarchiving thread: ${archiveError.message}`);
    try {
      await interaction.reply({
        content: 'This thread is archived. Please try again in a few moments.',
        ephemeral: true
      });
    } catch (replyError: any) {
      console.log('Could not reply to interaction in archived thread');
    }
    return;
  }
}

const ticketId = this.getTicketIdFromThread(thread);