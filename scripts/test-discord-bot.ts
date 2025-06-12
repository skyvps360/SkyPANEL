import { discordBotService } from '../server/discord-bot-service';

/**
 * Simple script to test the Discord bot service
 */
async function testDiscordBot() {
  console.log('Testing Discord bot service...');

  // Check if the bot is enabled
  const isEnabled = await discordBotService.isEnabled();
  console.log(`Discord bot enabled: ${isEnabled}`);

  if (!isEnabled) {
    console.log('Discord bot is disabled. Skipping initialization test.');
    return;
  }

  // Initialize the bot
  console.log('Initializing Discord bot...');
  const initResult = await discordBotService.initialize();
  console.log(`Discord bot initialization result: ${initResult}`);

  if (!initResult) {
    console.log('Failed to initialize Discord bot. Check the logs for errors.');
    return;
  }

  console.log('Discord bot initialized successfully!');
  console.log('Discord bot service test completed.');
}

// Run the test
testDiscordBot().catch(error => {
  console.error('Error testing Discord bot:', error);
});