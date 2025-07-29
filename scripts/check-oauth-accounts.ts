import 'dotenv/config';
import { db } from '../server/db';
import { userOAuthAccounts } from '../shared/schemas/oauth-schema';

async function checkOAuthAccounts() {
  try {
    console.log('Checking OAuth accounts in database...');
    
    const accounts = await db.select().from(userOAuthAccounts);
    
    console.log('Found OAuth accounts:', accounts);
    
    if (accounts.length === 0) {
      console.log('No OAuth accounts found in database');
    } else {
      console.log('\nOAuth Account Details:');
      accounts.forEach((account, index) => {
        console.log(`\nAccount ${index + 1}:`);
        console.log(`  ID: ${account.id}`);
        console.log(`  User ID: ${account.userId}`);
        console.log(`  Provider Name: ${account.providerName}`);
        console.log(`  Provider User ID: ${account.providerUserId}`);
        console.log(`  Provider User Email: ${account.providerUserEmail}`);
        console.log(`  Provider User Name: ${account.providerUserName}`);
        console.log(`  Is Active: ${account.isActive}`);
        console.log(`  Created At: ${account.createdAt}`);
        console.log(`  Updated At: ${account.updatedAt}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check OAuth accounts:', error);
    process.exit(1);
  }
}

// Run the check
checkOAuthAccounts(); 