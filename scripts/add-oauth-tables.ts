import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addOAuthTables() {
  try {
    console.log('Starting OAuth tables migration...');
    
    // Create oauth_providers table
    console.log('Creating oauth_providers table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "oauth_providers" (
        "id" serial PRIMARY KEY NOT NULL,
        "provider_name" text NOT NULL UNIQUE,
        "display_name" text NOT NULL,
        "client_id" text,
        "client_secret" text,
        "redirect_url" text,
        "scopes" text[] DEFAULT '{}',
        "is_enabled" boolean DEFAULT false,
        "is_configured" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create user_oauth_accounts table
    console.log('Creating user_oauth_accounts table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_oauth_accounts" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "provider_name" text NOT NULL,
        "provider_user_id" text NOT NULL,
        "provider_user_email" text,
        "provider_user_name" text,
        "provider_user_avatar" text,
        "access_token" text,
        "refresh_token" text,
        "token_expires_at" timestamp,
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        UNIQUE("user_id", "provider_name")
      );
    `);
    
    // Create oauth_login_logs table
    console.log('Creating oauth_login_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "oauth_login_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer,
        "provider_name" text NOT NULL,
        "provider_user_id" text,
        "login_type" text NOT NULL,
        "status" text NOT NULL,
        "ip_address" text,
        "user_agent" text,
        "error_message" text,
        "metadata" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "oauth_providers_name_idx" ON "oauth_providers" ("provider_name");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_oauth_accounts_user_id_idx" ON "user_oauth_accounts" ("user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_oauth_accounts_provider_idx" ON "user_oauth_accounts" ("provider_name");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "oauth_login_logs_user_id_idx" ON "oauth_login_logs" ("user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "oauth_login_logs_provider_idx" ON "oauth_login_logs" ("provider_name");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "oauth_login_logs_created_at_idx" ON "oauth_login_logs" ("created_at");
    `);
    
    // Insert default OAuth providers
    console.log('Inserting default OAuth providers...');
    await db.execute(sql`
      INSERT INTO "oauth_providers" ("provider_name", "display_name", "is_enabled", "is_configured")
      VALUES 
        ('discord', 'Discord', false, false),
        ('github', 'GitHub', false, false),
        ('google', 'Google', false, false),
        ('linkedin', 'LinkedIn', false, false)
      ON CONFLICT ("provider_name") DO NOTHING;
    `);
    
    console.log('✅ OAuth tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create OAuth tables:', error);
    process.exit(1);
  }
}

// Run the migration
addOAuthTables(); 