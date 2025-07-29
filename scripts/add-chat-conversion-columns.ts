/**
 * @fileoverview Script to add chat conversion columns
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addChatConversionColumns() {
    try {
        console.log('Adding chat conversion columns...');

        // Add converted_to_ticket_id column to chat_sessions if it doesn't exist
        await db.execute(sql`
            ALTER TABLE chat_sessions 
            ADD COLUMN IF NOT EXISTS converted_to_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL;
        `);

        // Add converted_at column to chat_sessions if it doesn't exist
        await db.execute(sql`
            ALTER TABLE chat_sessions 
            ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP;
        `);

        // Add converted_by_admin_id column to chat_sessions if it doesn't exist
        await db.execute(sql`
            ALTER TABLE chat_sessions 
            ADD COLUMN IF NOT EXISTS converted_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        `);

        console.log('Chat conversion columns added successfully!');
    } catch (error) {
        console.error('Error adding chat conversion columns:', error);
    }
}

addChatConversionColumns(); 