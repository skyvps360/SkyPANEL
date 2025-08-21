import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function verifyMessageCountColumn() {
    try {
        console.log('🔍 Checking for message_count column in discord_channels_backup table...');
        
        // Check if column exists
        const result = await db.execute(sql`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'discord_channels_backup' 
            AND column_name = 'message_count';
        `);
        
        console.log('Query result:', result);
        
        if (result && result.length > 0) {
            console.log('✅ message_count column exists!');
        } else {
            console.log('❌ message_count column does NOT exist');
            
            // Try to add it
            console.log('🔧 Attempting to add message_count column...');
            await db.execute(sql`
                ALTER TABLE discord_channels_backup 
                ADD COLUMN message_count integer DEFAULT 0;
            `);
            console.log('✅ Added message_count column');
        }
        
    } catch (error: any) {
        console.error('❌ Error:', error.message);
        if (error.message.includes('already exists')) {
            console.log('✅ Column already exists (caught duplicate column error)');
        }
    }
}

verifyMessageCountColumn();