import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDiscordTables() {
  try {
    console.log('Checking if Discord verification tables exist...');
    
    // Check if discord_verification_settings table exists
    console.log('Checking discord_verification_settings table...');
    const verificationSettingsResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_verification_settings'
      ) AS exists;
    `);
    
    console.log('Verification settings result:', verificationSettingsResult);
    const verificationSettingsExists = verificationSettingsResult.rows[0].exists;
    console.log(`discord_verification_settings table exists: ${verificationSettingsExists}`);
    
    // Check if discord_verified_users table exists
    console.log('Checking discord_verified_users table...');
    const verifiedUsersResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_verified_users'
      ) AS exists;
    `);
    
    console.log('Verified users result:', verifiedUsersResult);
    const verifiedUsersExists = verifiedUsersResult.rows[0].exists;
    console.log(`discord_verified_users table exists: ${verifiedUsersExists}`);
    
    if (verificationSettingsExists && verifiedUsersExists) {
      console.log('✅ Both Discord verification tables exist!');
    } else {
      console.log('❌ Some Discord verification tables are missing.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check Discord verification tables:', error);
    process.exit(1);
  }
}

// Run the check
checkDiscordTables();
