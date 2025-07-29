/**
 * @fileoverview Setup script for the chat system
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { config } from 'dotenv';
import { db } from '../server/db';
import { 
    chatDepartments, 
    chatDepartmentAdmins, 
    chatSessions, 
    chatMessages, 
    adminChatStatus, 
    typingIndicators 
} from '@shared/schema';

// Load environment variables
config();

async function setupChatSystem() {
    try {
        console.log('Setting up chat system...');

        // Check if DATABASE_URL is set
        if (!process.env.DATABASE_URL) {
            console.error('DATABASE_URL is not set. Please create a .env file with:');
            console.error('DATABASE_URL=postgresql://username:password@localhost:5432/skypanel');
            console.error('JWT_SECRET=your_jwt_secret_here');
            console.error('NODE_ENV=development');
            console.error('PORT=3333');
            process.exit(1);
        }

        console.log('Database URL found, proceeding with setup...');

        // Test database connection
        try {
            await db.execute('SELECT 1');
            console.log('✅ Database connection successful');
        } catch (error) {
            console.error('❌ Database connection failed:', error);
            console.error('Please ensure your PostgreSQL database is running and accessible');
            process.exit(1);
        }

        // Create chat tables
        console.log('Creating chat tables...');
        
        // Create chat departments table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_departments (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_active BOOLEAN DEFAULT true NOT NULL,
                created_at TIMESTAMP DEFAULT NOW() NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        // Create chat department admins table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_department_admins (
                id SERIAL PRIMARY KEY,
                department_id INTEGER NOT NULL REFERENCES chat_departments(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        // Create chat sessions table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id SERIAL PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                user_id INTEGER REFERENCES users(id),
                department_id INTEGER REFERENCES chat_departments(id),
                status TEXT NOT NULL DEFAULT 'active',
                started_at TIMESTAMP DEFAULT NOW() NOT NULL,
                ended_at TIMESTAMP,
                last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL,
                metadata JSONB DEFAULT '{}',
                converted_to_ticket_id INTEGER
            );
        `);

        // Create chat messages table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
                sender_id INTEGER REFERENCES users(id),
                sender_type TEXT NOT NULL,
                message TEXT NOT NULL,
                message_type TEXT NOT NULL DEFAULT 'text',
                metadata JSONB DEFAULT '{}',
                created_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        // Create admin chat status table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS admin_chat_status (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                is_online BOOLEAN DEFAULT false NOT NULL,
                is_available BOOLEAN DEFAULT false NOT NULL,
                current_session_id INTEGER REFERENCES chat_sessions(id),
                last_activity_at TIMESTAMP DEFAULT NOW() NOT NULL,
                metadata JSONB DEFAULT '{}'
            );
        `);

        // Create typing indicators table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS typing_indicators (
                id SERIAL PRIMARY KEY,
                session_id INTEGER NOT NULL REFERENCES chat_sessions(id),
                user_id INTEGER NOT NULL REFERENCES users(id),
                is_typing BOOLEAN DEFAULT false NOT NULL,
                last_typing_at TIMESTAMP DEFAULT NOW() NOT NULL
            );
        `);

        // Create indexes for better performance
        console.log('Creating indexes...');
        await db.execute(`
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_department_id ON chat_sessions(department_id);
            CREATE INDEX IF NOT EXISTS idx_chat_sessions_last_activity ON chat_sessions(last_activity_at);
            CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
            CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
            CREATE INDEX IF NOT EXISTS idx_admin_chat_status_user_id ON admin_chat_status(user_id);
            CREATE INDEX IF NOT EXISTS idx_admin_chat_status_online ON admin_chat_status(is_online, is_available);
            CREATE INDEX IF NOT EXISTS idx_typing_indicators_session_user ON typing_indicators(session_id, user_id);
        `);

        // Insert default chat department
        console.log('Inserting default chat department...');
        await db.execute(`
            INSERT INTO chat_departments (name, description, is_active)
            VALUES ('General Support', 'General customer support and inquiries', true)
            ON CONFLICT DO NOTHING;
        `);

        // Verify tables were created
        console.log('Verifying table creation...');
        const tables = await db.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'chat_%'
            ORDER BY table_name;
        `);
        
        console.log('✅ Created chat tables:', tables.rows.map((row: any) => row.table_name));
        
        // Test inserting a sample department
        console.log('Testing database operations...');
        const testDept = await db.execute(`
            INSERT INTO chat_departments (name, description, is_active)
            VALUES ('Technical Support', 'Technical issues and server problems', true)
            ON CONFLICT DO NOTHING
            RETURNING id, name;
        `);
        
        if (testDept.rows.length > 0) {
            console.log('✅ Test department created:', testDept.rows[0]);
        }

        console.log('🎉 Chat system setup completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Start the development server: npm run dev');
        console.log('2. Visit http://localhost:3333/admin/chat to manage chat sessions');
        console.log('');
        console.log('The chat system includes:');
        console.log('- Real-time WebSocket communication');
        console.log('- Department-based chat routing');
        console.log('- Admin chat management interface');
        console.log('- Typing indicators');
        console.log('- Session management');
        console.log('- Message history');
        
    } catch (error) {
        console.error('❌ Error setting up chat system:', error);
        process.exit(1);
    }
}

// Run the setup
if (require.main === module) {
    setupChatSystem()
        .then(() => {
            console.log('Setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
}

export { setupChatSystem }; 