/**
 * @fileoverview Script to migrate chat tables
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function migrateChatTables() {
    try {
        console.log('Creating chat tables...');

        // Create chat_departments table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS chat_departments (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_default BOOLEAN DEFAULT false NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                display_order INTEGER DEFAULT 0 NOT NULL,
                color TEXT DEFAULT '#3b82f6' NOT NULL,
                icon TEXT DEFAULT 'MessageCircle' NOT NULL,
                created_at TIMESTAMP DEFAULT now() NOT NULL,
                updated_at TIMESTAMP DEFAULT now() NOT NULL,
                CONSTRAINT chat_departments_name_unique UNIQUE(name)
            );
        `);

        // Create chat_department_admins table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS chat_department_admins (
                id SERIAL PRIMARY KEY,
                department_id INTEGER NOT NULL,
                admin_id INTEGER NOT NULL,
                can_manage BOOLEAN DEFAULT false NOT NULL,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMP DEFAULT now() NOT NULL,
                updated_at TIMESTAMP DEFAULT now() NOT NULL,
                FOREIGN KEY (department_id) REFERENCES chat_departments(id) ON DELETE CASCADE,
                FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Create chat_sessions table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                assigned_admin_id INTEGER,
                department_id INTEGER,
                status TEXT DEFAULT 'waiting' NOT NULL,
                priority TEXT DEFAULT 'normal' NOT NULL,
                subject TEXT,
                department TEXT DEFAULT 'general',
                converted_to_ticket_id INTEGER,
                converted_at TIMESTAMP,
                converted_by_admin_id INTEGER,
                metadata JSON DEFAULT '{}'::json,
                started_at TIMESTAMP DEFAULT now() NOT NULL,
                ended_at TIMESTAMP,
                last_activity_at TIMESTAMP DEFAULT now() NOT NULL,
                created_at TIMESTAMP DEFAULT now() NOT NULL,
                updated_at TIMESTAMP DEFAULT now() NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (assigned_admin_id) REFERENCES users(id) ON DELETE SET NULL,
                FOREIGN KEY (department_id) REFERENCES chat_departments(id) ON DELETE SET NULL,
                FOREIGN KEY (converted_to_ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
                FOREIGN KEY (converted_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
            );
        `);

        // Create chat_messages table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                message_type TEXT DEFAULT 'text' NOT NULL,
                is_from_admin BOOLEAN DEFAULT false NOT NULL,
                read_at TIMESTAMP,
                metadata JSON DEFAULT '{}'::json,
                created_at TIMESTAMP DEFAULT now() NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        // Create admin_chat_status table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS admin_chat_status (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                is_online BOOLEAN DEFAULT false NOT NULL,
                is_available BOOLEAN DEFAULT false NOT NULL,
                current_session_id INTEGER,
                last_activity_at TIMESTAMP DEFAULT now() NOT NULL,
                metadata JSON DEFAULT '{}'::json,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (current_session_id) REFERENCES chat_sessions(id) ON DELETE SET NULL
            );
        `);

        // Create typing_indicators table
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS typing_indicators (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                is_typing BOOLEAN DEFAULT false NOT NULL,
                last_typing_at TIMESTAMP DEFAULT now() NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(session_id, user_id)
            );
        `);

        // Create indexes for performance
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_sessions_department_id ON chat_sessions(department_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_admin_chat_status_user_id ON admin_chat_status(user_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_typing_indicators_session_id ON typing_indicators(session_id);`);

        console.log('Chat tables created successfully!');
    } catch (error) {
        console.error('Error creating chat tables:', error);
    }
}

migrateChatTables(); 