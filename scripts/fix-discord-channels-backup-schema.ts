import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Fix Discord channels backup table schema
 * Add missing message_count column to discord_channels_backup table
 */
async function fixDiscordChannelsBackupSchema() {
    try {
        console.log('🔧 Adding missing message_count column to discord_channels_backup table...');
        
        // Add the missing message_count column
        await db.execute(sql`
            ALTER TABLE "discord_channels_backup" 
            ADD COLUMN IF NOT EXISTS "message_count" integer DEFAULT 0;
        `);
        
        console.log('✅ Successfully added message_count column to discord_channels_backup table');
        
        // Verify the column was added
        const result = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'discord_channels_backup' 
            AND column_name = 'message_count';
        `);
        
        if (result.length > 0) {
            console.log('✅ Verified: message_count column exists in discord_channels_backup table');
        } else {
            console.log('❌ Warning: message_count column was not found after adding it');
        }
        
        console.log('\n✅ Discord channels backup schema fix completed successfully!');
        
    } catch (error: any) {
        console.error('❌ Error fixing Discord channels backup schema:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the fix
fixDiscordChannelsBackupSchema();