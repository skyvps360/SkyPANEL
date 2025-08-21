import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Add missing message_count column to discord_channels_backup table
 * This column was missing from the original table creation script
 */
async function addMissingMessageCountColumn() {
    try {
        console.log('🔧 Adding missing message_count column to discord_channels_backup table...');
        
        // Add the missing message_count column
        await db.execute(sql`
            ALTER TABLE "discord_channels_backup" 
            ADD COLUMN IF NOT EXISTS "message_count" integer DEFAULT 0;
        `);
        
        console.log('✅ Successfully added message_count column');
        
        // Verify the column exists
        const result = await db.execute(sql`
            SELECT column_name, data_type, column_default 
            FROM information_schema.columns 
            WHERE table_name = 'discord_channels_backup' 
            AND column_name = 'message_count';
        `);
        
        if (result.rows && result.rows.length > 0) {
            console.log('✅ Verified: message_count column exists');
            console.log('Column details:', result.rows[0]);
        } else {
            console.log('❌ Error: message_count column was not found after adding');
            process.exit(1);
        }
        
        console.log('\n✅ Migration completed successfully!');
        
    } catch (error: any) {
        if (error.message.includes('already exists')) {
            console.log('✅ Column already exists, skipping...');
        } else {
            console.error('❌ Error adding message_count column:', error.message);
            process.exit(1);
        }
    }
}

// Run the migration
addMissingMessageCountColumn();