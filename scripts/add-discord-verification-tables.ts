import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDiscordVerificationTables() {
  try {
    console.log('Starting Discord verification tables migration...');
    
    // Create discord_verification_settings table
    console.log('Creating discord_verification_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_verification_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "guild_id" text NOT NULL,
        "role_id" text NOT NULL,
        "channel_id" text,
        "message_id" text,
        "is_enabled" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "discord_verification_settings_guild_id_unique" UNIQUE("guild_id")
      );
    `);
    
    // Create discord_verified_users table
    console.log('Creating discord_verified_users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_verified_users" (
        "id" serial PRIMARY KEY NOT NULL,
        "discord_user_id" text NOT NULL,
        "discord_username" text NOT NULL,
        "verified_at" timestamp DEFAULT now() NOT NULL,
        "guild_id" text NOT NULL,
        CONSTRAINT "discord_verified_users_discord_user_id_unique" UNIQUE("discord_user_id")
      );
    `);
    
    // Create indexes for faster lookups
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_verification_settings_guild_id_idx" ON "discord_verification_settings" ("guild_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_verified_users_discord_user_id_idx" ON "discord_verified_users" ("discord_user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_verified_users_guild_id_idx" ON "discord_verified_users" ("guild_id");
    `);
    
    console.log('✅ Discord verification tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create Discord verification tables:', error);
    process.exit(1);
  }
}

// Run the migration
addDiscordVerificationTables();
