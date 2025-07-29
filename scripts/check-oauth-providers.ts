import 'dotenv/config';
import { db } from '../server/db';
import { oauthProviders } from '../shared/schemas/oauth-schema';

async function checkOAuthProviders() {
  try {
    console.log('Checking OAuth providers in database...');
    
    const providers = await db.select().from(oauthProviders);
    
    console.log('Found OAuth providers:', providers);
    
    if (providers.length === 0) {
      console.log('No OAuth providers found in database');
    } else {
      console.log('\nOAuth Provider Details:');
      providers.forEach((provider, index) => {
        console.log(`\nProvider ${index + 1}:`);
        console.log(`  ID: ${provider.id}`);
        console.log(`  Provider Name: ${provider.providerName}`);
        console.log(`  Display Name: ${provider.displayName}`);
        console.log(`  Client ID: ${provider.clientId ? '***SET***' : 'NOT SET'}`);
        console.log(`  Client Secret: ${provider.clientSecret ? '***SET***' : 'NOT SET'}`);
        console.log(`  Redirect URL: ${provider.redirectUrl}`);
        console.log(`  Scope: ${provider.scope}`);
        console.log(`  Enabled: ${provider.enabled}`);
        console.log(`  Created At: ${provider.createdAt}`);
        console.log(`  Updated At: ${provider.updatedAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check OAuth providers:', error);
    process.exit(1);
  }
}

// Run the check
checkOAuthProviders(); 