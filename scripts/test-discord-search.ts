#!/usr/bin/env tsx

/**
 * Test script to check Discord user search functionality
 */

import { storage } from '../server/storage';
import { discordBotService } from '../server/discord-bot-service';

async function testDiscordSearch() {
  console.log('🔍 Testing Discord User Search Functionality\n');

  try {
    // Check if Discord bot is enabled
    console.log('1. Checking if Discord bot is enabled...');
    const isEnabled = await discordBotService.isEnabled();
    console.log(`   Discord bot enabled: ${isEnabled}`);

    if (!isEnabled) {
      console.log('❌ Discord bot is disabled. Please enable it in admin settings.');
      return;
    }

    // Check Discord bot settings
    console.log('\n2. Checking Discord bot configuration...');
    const botToken = await storage.getSetting('discord_bot_token');
    const guildId = await storage.getSetting('discord_guild_id');
    const channelId = await storage.getSetting('discord_channel_id');

    console.log(`   Bot token configured: ${botToken?.value ? 'Yes' : 'No'}`);
    console.log(`   Guild ID configured: ${guildId?.value ? 'Yes' : 'No'}`);
    console.log(`   Channel ID configured: ${channelId?.value ? 'Yes' : 'No'}`);

    if (!botToken?.value || !guildId?.value) {
      console.log('❌ Discord bot is not properly configured. Missing bot token or guild ID.');
      return;
    }

    // Initialize Discord bot
    console.log('\n3. Initializing Discord bot...');
    const initialized = await discordBotService.initialize();
    console.log(`   Discord bot initialized: ${initialized}`);

    if (!initialized) {
      console.log('❌ Failed to initialize Discord bot.');
      return;
    }

    // Test user search
    console.log('\n4. Testing user search...');
    const testQueries = ['test', 'admin', 'user'];

    for (const query of testQueries) {
      console.log(`   Searching for "${query}"...`);
      try {
        const users = await discordBotService.searchDiscordUsers(query, 5);
        console.log(`   Found ${users.length} users matching "${query}"`);
        
        if (users.length > 0) {
          users.forEach((user, index) => {
            console.log(`     ${index + 1}. ${user.username} (ID: ${user.id})`);
          });
        }
      } catch (error: any) {
        console.log(`   Error searching for "${query}": ${error.message}`);
      }
    }

    console.log('\n✅ Discord search test completed!');

  } catch (error: any) {
    console.error('❌ Error during Discord search test:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDiscordSearch().then(() => {
  console.log('\n🏁 Test finished');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
