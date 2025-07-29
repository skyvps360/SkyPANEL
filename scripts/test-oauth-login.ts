import 'dotenv/config';
import { db } from '../server/db';
import { userOAuthAccounts } from '../shared/schemas/oauth-schema';
import { eq, and } from 'drizzle-orm';

async function testOAuthLogin() {
  try {
    console.log('Testing OAuth login flow...');
    
    // Test with the known Discord user ID
    const providerName = 'discord';
    const providerUserId = '142025929454125056';
    
    console.log(`Looking for OAuth account with provider: ${providerName}, user ID: ${providerUserId}`);
    
    const accounts = await db.select()
      .from(userOAuthAccounts)
      .where(and(
        eq(userOAuthAccounts.providerName, providerName),
        eq(userOAuthAccounts.providerUserId, providerUserId),
        eq(userOAuthAccounts.isActive, true)
      ));
    
    console.log('Query result:', accounts);
    
    if (accounts.length > 0) {
      console.log('✅ Found OAuth account:', accounts[0]);
      console.log(`User ID: ${accounts[0].userId}`);
      console.log(`Provider: ${accounts[0].providerName}`);
      console.log(`Provider User ID: ${accounts[0].providerUserId}`);
      console.log(`Is Active: ${accounts[0].isActive}`);
    } else {
      console.log('❌ No OAuth account found');
      
      // Let's also check what accounts exist for Discord
      const allDiscordAccounts = await db.select()
        .from(userOAuthAccounts)
        .where(eq(userOAuthAccounts.providerName, providerName));
      
      console.log('All Discord accounts:', allDiscordAccounts);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to test OAuth login:', error);
    process.exit(1);
  }
}

// Run the test
testOAuthLogin(); 