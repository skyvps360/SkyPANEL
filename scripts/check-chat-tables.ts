/**
 * @fileoverview Check if chat tables exist in the database
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkChatTables() {
    try {
        console.log('Checking for chat tables...');
        
        // Check if chat_sessions table exists
        const sessionsResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chat_sessions'
            );
        `);
        
        // Check if chat_messages table exists
        const messagesResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chat_messages'
            );
        `);
        
        // Check if chat_departments table exists
        const departmentsResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'chat_departments'
            );
        `);
        
        // Check if admin_chat_status table exists
        const statusResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'admin_chat_status'
            );
        `);
        
        // Check if typing_indicators table exists
        const typingResult = await db.execute(sql`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'typing_indicators'
            );
        `);
        
        console.log('Chat tables status:');
        console.log('- chat_sessions:', sessionsResult[0]?.exists ? 'EXISTS' : 'MISSING');
        console.log('- chat_messages:', messagesResult[0]?.exists ? 'EXISTS' : 'MISSING');
        console.log('- chat_departments:', departmentsResult[0]?.exists ? 'EXISTS' : 'MISSING');
        console.log('- admin_chat_status:', statusResult[0]?.exists ? 'EXISTS' : 'MISSING');
        console.log('- typing_indicators:', typingResult[0]?.exists ? 'EXISTS' : 'MISSING');
        
        const allExist = sessionsResult[0]?.exists && 
                        messagesResult[0]?.exists && 
                        departmentsResult[0]?.exists && 
                        statusResult[0]?.exists && 
                        typingResult[0]?.exists;
        
        if (allExist) {
            console.log('\n✅ All chat tables exist!');
        } else {
            console.log('\n❌ Some chat tables are missing. Creating migration...');
        }
        
    } catch (error) {
        console.error('Error checking chat tables:', error);
    } finally {
        process.exit(0);
    }
}

checkChatTables(); 