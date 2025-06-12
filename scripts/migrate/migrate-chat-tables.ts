import 'dotenv/config';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function migrateChatTables() {
  try {
    console.log('Starting chat tables migration...');
    
    // Create chat_sessions table
    console.log('Creating chat_sessions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_sessions" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "assigned_admin_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "status" TEXT NOT NULL DEFAULT 'waiting',
        "priority" TEXT NOT NULL DEFAULT 'normal',
        "subject" TEXT,
        "department" TEXT DEFAULT 'general',
        "metadata" JSONB DEFAULT '{}',
        "started_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "ended_at" TIMESTAMP,
        "last_activity_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create chat_messages table
    console.log('Creating chat_messages table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_messages" (
        "id" SERIAL PRIMARY KEY,
        "session_id" INTEGER NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "message" TEXT NOT NULL,
        "message_type" TEXT NOT NULL DEFAULT 'text',
        "is_from_admin" BOOLEAN NOT NULL DEFAULT FALSE,
        "read_at" TIMESTAMP,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create admin_chat_status table
    console.log('Creating admin_chat_status table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "admin_chat_status" (
        "id" SERIAL PRIMARY KEY,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE UNIQUE,
        "status" TEXT NOT NULL DEFAULT 'offline',
        "status_message" TEXT,
        "max_concurrent_chats" INTEGER DEFAULT 5,
        "auto_assign" BOOLEAN DEFAULT TRUE,
        "last_seen_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create chat_typing_indicators table
    console.log('Creating chat_typing_indicators table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_typing_indicators" (
        "id" SERIAL PRIMARY KEY,
        "session_id" INTEGER NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
        "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "is_typing" BOOLEAN NOT NULL DEFAULT FALSE,
        "last_typing_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    
    // Index for chat sessions by user
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_sessions_user_id" ON "chat_sessions"("user_id");
    `);
    
    // Index for chat sessions by assigned admin
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_sessions_assigned_admin_id" ON "chat_sessions"("assigned_admin_id");
    `);
    
    // Index for chat sessions by status
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_sessions_status" ON "chat_sessions"("status");
    `);
    
    // Index for chat sessions by last activity
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_sessions_last_activity" ON "chat_sessions"("last_activity_at");
    `);
    
    // Index for chat messages by session
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_session_id" ON "chat_messages"("session_id");
    `);
    
    // Index for chat messages by user
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_user_id" ON "chat_messages"("user_id");
    `);
    
    // Index for chat messages by creation time
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_messages_created_at" ON "chat_messages"("created_at");
    `);
    
    // Index for admin chat status by user
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_admin_chat_status_user_id" ON "admin_chat_status"("user_id");
    `);
    
    // Index for admin chat status by status
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_admin_chat_status_status" ON "admin_chat_status"("status");
    `);
    
    // Index for typing indicators by session
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_typing_session_id" ON "chat_typing_indicators"("session_id");
    `);
    
    // Index for typing indicators by user
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_typing_user_id" ON "chat_typing_indicators"("user_id");
    `);
    
    // Composite index for typing indicators by session and user
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_typing_session_user" ON "chat_typing_indicators"("session_id", "user_id");
    `);
    
    console.log('Chat tables migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Chat tables migration failed:', error);
    process.exit(1);
  }
}

migrateChatTables();
