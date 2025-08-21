import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDiscordBackupTables() {
  try {
    console.log('Starting Discord backup tables migration...');
    
    // Create discord_server_backups table
    console.log('Creating discord_server_backups table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_server_backups" (
        "id" serial PRIMARY KEY NOT NULL,
        "guild_id" text NOT NULL,
        "guild_name" text NOT NULL,
        "backup_name" text NOT NULL,
        "backup_type" text NOT NULL DEFAULT 'manual',
        "status" text NOT NULL DEFAULT 'in_progress',
        "total_size" integer DEFAULT 0,
        "message_count" integer DEFAULT 0,
        "channel_count" integer DEFAULT 0,
        "role_count" integer DEFAULT 0,
        "member_count" integer DEFAULT 0,
        "created_by" text NOT NULL,
        "error_log" text,
        "metadata" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp
      );
    `);

    // Create discord_guild_settings_backup table
    console.log('Creating discord_guild_settings_backup table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_guild_settings_backup" (
        "id" serial PRIMARY KEY NOT NULL,
        "backup_id" integer NOT NULL,
        "guild_id" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "icon_url" text,
        "banner_url" text,
        "splash_url" text,
        "owner_id" text NOT NULL,
        "region" text,
        "afk_channel_id" text,
        "afk_timeout" integer,
        "system_channel_id" text,
        "rules_channel_id" text,
        "public_updates_channel_id" text,
        "verification_level" integer,
        "default_message_notifications" integer,
        "explicit_content_filter" integer,
        "mfa_level" integer,
        "premium_tier" integer,
        "premium_subscription_count" integer,
        "preferred_locale" text,
        "features" json DEFAULT '[]',
        "vanity_url_code" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("backup_id") REFERENCES "discord_server_backups"("id") ON DELETE CASCADE
      );
    `);

    // Create discord_roles_backup table
    console.log('Creating discord_roles_backup table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_roles_backup" (
        "id" serial PRIMARY KEY NOT NULL,
        "backup_id" integer NOT NULL,
        "role_id" text NOT NULL,
        "name" text NOT NULL,
        "color" integer DEFAULT 0,
        "hoist" boolean DEFAULT false,
        "position" integer NOT NULL,
        "permissions" text NOT NULL,
        "managed" boolean DEFAULT false,
        "mentionable" boolean DEFAULT false,
        "icon_url" text,
        "unicode_emoji" text,
        "tags" json DEFAULT '{}',
        "member_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("backup_id") REFERENCES "discord_server_backups"("id") ON DELETE CASCADE
      );
    `);

    // Create discord_channels_backup table
    console.log('Creating discord_channels_backup table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_channels_backup" (
        "id" serial PRIMARY KEY NOT NULL,
        "backup_id" integer NOT NULL,
        "channel_id" text NOT NULL,
        "name" text NOT NULL,
        "type" integer NOT NULL,
        "position" integer NOT NULL,
        "parent_id" text,
        "topic" text,
        "nsfw" boolean DEFAULT false,
        "rate_limit_per_user" integer DEFAULT 0,
        "bitrate" integer,
        "user_limit" integer,
        "rtc_region" text,
        "video_quality_mode" integer,
        "default_auto_archive_duration" integer,
        "permissions" json DEFAULT '[]',
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("backup_id") REFERENCES "discord_server_backups"("id") ON DELETE CASCADE
      );
    `);

    // Create discord_messages_backup table
    console.log('Creating discord_messages_backup table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_messages_backup" (
        "id" serial PRIMARY KEY NOT NULL,
        "backup_id" integer NOT NULL,
        "channel_backup_id" integer NOT NULL,
        "message_id" text NOT NULL,
        "author_id" text NOT NULL,
        "author_username" text NOT NULL,
        "author_display_name" text,
        "author_avatar" text,
        "content" text,
        "embeds" json DEFAULT '[]',
        "attachments" json DEFAULT '[]',
        "reactions" json DEFAULT '[]',
        "mentions" json DEFAULT '[]',
        "mention_roles" json DEFAULT '[]',
        "mention_channels" json DEFAULT '[]',
        "pinned" boolean DEFAULT false,
        "tts" boolean DEFAULT false,
        "message_type" integer DEFAULT 0,
        "flags" integer DEFAULT 0,
        "referenced_message_id" text,
        "thread_id" text,
        "edited_at" timestamp,
        "original_created_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("backup_id") REFERENCES "discord_server_backups"("id") ON DELETE CASCADE,
        FOREIGN KEY ("channel_backup_id") REFERENCES "discord_channels_backup"("id") ON DELETE CASCADE
      );
    `);

    // Create discord_backup_settings table
    console.log('Creating discord_backup_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_backup_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "guild_id" text NOT NULL UNIQUE,
        "is_enabled" boolean DEFAULT false,
        "auto_backup_enabled" boolean DEFAULT false,
        "auto_backup_interval" integer DEFAULT 24,
        "max_backup_count" integer DEFAULT 10,
        "include_messages" boolean DEFAULT true,
        "message_history_days" integer DEFAULT 30,
        "include_attachments" boolean DEFAULT false,
        "max_attachment_size" integer DEFAULT 8388608,
        "allowed_roles" json DEFAULT '[]',
        "excluded_channels" json DEFAULT '[]',
        "notification_channel_id" text,
        "last_auto_backup" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Create discord_backup_jobs table
    console.log('Creating discord_backup_jobs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "discord_backup_jobs" (
        "id" serial PRIMARY KEY NOT NULL,
        "guild_id" text NOT NULL,
        "job_type" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "scheduled_for" timestamp NOT NULL,
        "started_at" timestamp,
        "completed_at" timestamp,
        "backup_id" integer,
        "error_message" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("backup_id") REFERENCES "discord_server_backups"("id")
      );
    `);

    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_server_backups_guild_id_idx" ON "discord_server_backups" ("guild_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_server_backups_created_at_idx" ON "discord_server_backups" ("created_at");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_guild_settings_backup_backup_id_idx" ON "discord_guild_settings_backup" ("backup_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_roles_backup_backup_id_idx" ON "discord_roles_backup" ("backup_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_channels_backup_backup_id_idx" ON "discord_channels_backup" ("backup_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_messages_backup_backup_id_idx" ON "discord_messages_backup" ("backup_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_messages_backup_channel_backup_id_idx" ON "discord_messages_backup" ("channel_backup_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_backup_settings_guild_id_idx" ON "discord_backup_settings" ("guild_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_backup_jobs_guild_id_idx" ON "discord_backup_jobs" ("guild_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "discord_backup_jobs_scheduled_for_idx" ON "discord_backup_jobs" ("scheduled_for");
    `);
    
    console.log('✅ Discord backup tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create Discord backup tables:', error);
    process.exit(1);
  }
}

// Run the migration
addDiscordBackupTables();