/**
 * @fileoverview Add chat tables to the database
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { 
    chatSessions, 
    chatMessages, 
    chatDepartments, 
    chatDepartmentAdmins,
    adminChatStatus, 
    typingIndicators 
} from '@shared/schema';

async function addChatTables() {
    try {
        console.log('Creating chat tables...');
        
        // Create chat_departments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_departments (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        
        // Create chat_department_admins table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_department_admins (
                id SERIAL PRIMARY KEY,
                department_id INTEGER NOT NULL REFERENCES chat_departments(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        
        // Create chat_sessions table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                user_id INTEGER REFERENCES users(id),
                department_id INTEGER REFERENCES chat_departments(id),
                status TEXT NOT NULL DEFAULT 'active',
                started_at TIMESTAMP NOT NULL DEFAULT NOW(),
                ended_at TIMESTAMP,
                last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
                metadata JSONB DEFAULT '{}',
                converted_to_ticket_id INTEGER
            );
        `);
        
        // Create chat_messages table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
                sender_id INTEGER REFERENCES users(id),
                sender_type TEXT NOT NULL,
                message TEXT NOT NULL,
                message_type TEXT NOT NULL DEFAULT 'text',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        
        // Create admin_chat_status table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_chat_status (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                is_online BOOLEAN NOT NULL DEFAULT false,
                is_available BOOLEAN NOT NULL DEFAULT false,
                current_session_id INTEGER REFERENCES chat_sessions(id),
                last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
                metadata JSONB DEFAULT '{}'
            );
        `);
        
        // Create typing_indicators table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS typing_indicators (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                is_typing BOOLEAN NOT NULL DEFAULT false,
                last_typing_at TIMESTAMP NOT NULL DEFAULT NOW()
            );
        `);
        
        console.log('✅ Chat tables created successfully!');
        
        // Insert some default chat departments
        await db.execute(`
            INSERT INTO chat_departments (name, description) VALUES 
            ('General Support', 'General customer support and inquiries'),
            ('Technical Support', 'Technical issues and server problems'),
            ('Billing Support', 'Billing and payment related questions')
            ON CONFLICT DO NOTHING;
        `);
        
        console.log('✅ Default chat departments added!');
        
    } catch (error) {
        console.error('Error creating chat tables:', error);
    } finally {
        process.exit(0);
    }
}

addChatTables(); 