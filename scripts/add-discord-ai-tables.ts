/**
 * @fileoverview Database migration script to add Discord AI conversation tables
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Creates tables for Discord AI conversation persistence
 * - discord_ai_conversations: Stores individual messages with full conversation history
 * - discord_ai_user_settings: Per-user settings and limits
 */
async function addDiscordAITables() {
  try {
    console.log('🚀 Starting Discord AI tables migration...');

    // Create discord_ai_conversations table
    console.log('📝 Creating discord_ai_conversations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_ai_conversations" (
        "id" SERIAL PRIMARY KEY,
        "discord_user_id" TEXT NOT NULL,
        "discord_username" TEXT NOT NULL,
        "role" TEXT NOT NULL CHECK (role IN ('user', 'model')),
        "message" TEXT NOT NULL,
        "message_type" TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'error')),
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create discord_ai_user_settings table
    console.log('⚙️ Creating discord_ai_user_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_ai_user_settings" (
        "id" SERIAL PRIMARY KEY,
        "discord_user_id" TEXT NOT NULL UNIQUE,
        "discord_username" TEXT NOT NULL,
        "max_conversation_history" INTEGER DEFAULT 50,
        "is_enabled" BOOLEAN DEFAULT TRUE,
        "last_used_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "total_messages_count" INTEGER DEFAULT 0,
        "metadata" JSONB DEFAULT '{}',
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('🔗 Creating indexes for optimal performance...');

    // Indexes for discord_ai_conversations
    const conversationIndexes = [
      { name: "idx_discord_ai_conversations_user_id", column: "discord_user_id" },
      { name: "idx_discord_ai_conversations_created_at", column: "created_at" },
      { name: "idx_discord_ai_conversations_user_created", columns: ["discord_user_id", "created_at"] }
    ];

    for (const index of conversationIndexes) {
      try {
        if (index.columns) {
          await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${index.name}" ON "discord_ai_conversations" ("${index.columns.join('", "')}");`));
        } else {
          await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${index.name}" ON "discord_ai_conversations" ("${index.column}");`));
        }
        console.log(`✅ Index ${index.name} created!`);
      } catch (indexError) {
        console.log(`⚠️  Could not create index ${index.name}:`, indexError.message);
      }
    }

    // Indexes for discord_ai_user_settings
    const settingsIndexes = [
      { name: "idx_discord_ai_user_settings_user_id", column: "discord_user_id" },
      { name: "idx_discord_ai_user_settings_last_used", column: "last_used_at" },
      { name: "idx_discord_ai_user_settings_enabled", column: "is_enabled" }
    ];

    for (const index of settingsIndexes) {
      try {
        await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${index.name}" ON "discord_ai_user_settings" ("${index.column}");`));
        console.log(`✅ Index ${index.name} created!`);
      } catch (indexError) {
        console.log(`⚠️  Could not create index ${index.name}:`, indexError.message);
      }
    }

    console.log('🎉 Discord AI tables migration completed successfully!');
    console.log('');
    console.log('📊 Tables created:');
    console.log('  • discord_ai_conversations - Stores conversation history (up to 50 messages per user)');
    console.log('  • discord_ai_user_settings - Per-user settings and usage tracking');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('  1. Update DiscordAIService to use database instead of in-memory storage');
    console.log('  2. Implement conversation cleanup for the 50-message limit');
    console.log('  3. Add documentation and blog content integration');
    console.log('  4. Update AI model to gemini-2.5-pro-exp-03-25');
    
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Discord AI tables already exist, skipping creation');
    } else {
      console.error('❌ Error creating Discord AI tables:', error);
      throw error;
    }
  }
}

// Run the migration
addDiscordAITables()
  .then(() => {
    console.log('✨ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
