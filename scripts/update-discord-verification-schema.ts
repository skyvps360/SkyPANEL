import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function updateDiscordVerificationSchema() {
  try {
    console.log('Starting Discord verification schema update...');
    
    // Check if the table exists
    console.log('Checking if discord_verification_settings table exists...');
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'discord_verification_settings'
      ) AS exists;
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Table does not exist, creating new table with updated schema...');
      await db.execute(sql`
        CREATE TABLE "discord_verification_settings" (
          "id" serial PRIMARY KEY NOT NULL,
          "guild_id" text NOT NULL,
          "verified_role_id" text NOT NULL,
          "unverified_role_id" text NOT NULL,
          "channel_id" text,
          "message_id" text,
          "is_enabled" boolean DEFAULT false,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL,
          CONSTRAINT "discord_verification_settings_guild_id_unique" UNIQUE("guild_id")
        );
      `);
      console.log('✅ New table created with updated schema!');
    } else {
      console.log('Table exists, checking current schema...');
      
      // Check if verified_role_id column exists
      const verifiedRoleExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'discord_verification_settings' 
          AND column_name = 'verified_role_id'
        ) AS exists;
      `);
      
      if (!verifiedRoleExists.rows[0].exists) {
        console.log('Updating schema to support verified and unverified roles...');
        
        // Add new columns
        await db.execute(sql`
          ALTER TABLE "discord_verification_settings" 
          ADD COLUMN "verified_role_id" text,
          ADD COLUMN "unverified_role_id" text;
        `);
        
        // Migrate existing role_id data to verified_role_id
        await db.execute(sql`
          UPDATE "discord_verification_settings" 
          SET "verified_role_id" = "role_id" 
          WHERE "role_id" IS NOT NULL;
        `);
        
        // Set default unverified role (will need to be configured by admin)
        await db.execute(sql`
          UPDATE "discord_verification_settings" 
          SET "unverified_role_id" = "verified_role_id" 
          WHERE "unverified_role_id" IS NULL;
        `);
        
        // Make columns NOT NULL
        await db.execute(sql`
          ALTER TABLE "discord_verification_settings" 
          ALTER COLUMN "verified_role_id" SET NOT NULL,
          ALTER COLUMN "unverified_role_id" SET NOT NULL;
        `);
        
        // Remove old role_id column
        await db.execute(sql`
          ALTER TABLE "discord_verification_settings" 
          DROP COLUMN "role_id";
        `);
        
        console.log('✅ Schema updated successfully!');
      } else {
        console.log('✅ Schema is already up to date!');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to update Discord verification schema:', error);
    process.exit(1);
  }
}

// Run the migration
updateDiscordVerificationSchema(); 