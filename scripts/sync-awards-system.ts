import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Sync awards system tables and data to the database
 * Creates all necessary tables, indexes, foreign keys, and default award settings
 */
async function syncAwardsSystem() {
  try {
    console.log('Starting awards system sync...');
    
    // Create award_settings table
    console.log('Creating award_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "award_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "login_days_required" integer DEFAULT 1 NOT NULL,
        "virtfusion_tokens" real DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // Create user_login_streaks table (this is a new table)
    console.log('Creating user_login_streaks table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_login_streaks" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "current_streak" integer DEFAULT 0 NOT NULL,
        "longest_streak" integer DEFAULT 0 NOT NULL,
        "last_login_date" timestamp,
        "total_login_days" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);

    // Update user_awards table structure
    console.log('Updating user_awards table structure...');
    
    // Add missing columns to existing user_awards table
    await db.execute(sql`
      ALTER TABLE "user_awards" 
      ADD COLUMN IF NOT EXISTS "award_setting_id" integer,
      ADD COLUMN IF NOT EXISTS "virtfusion_tokens" real,
      ADD COLUMN IF NOT EXISTS "streak_day" integer,
      ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS "claimed_at" timestamp,
      ADD COLUMN IF NOT EXISTS "expires_at" timestamp;
    `);
    
    // Update existing records to have default values
    await db.execute(sql`
      UPDATE "user_awards" 
      SET 
        "virtfusion_tokens" = COALESCE("virtfusion_tokens", "credits_awarded"::real),
        "status" = COALESCE("status", 'claimed'),
        "streak_day" = COALESCE("streak_day", 1)
      WHERE "virtfusion_tokens" IS NULL OR "status" IS NULL OR "streak_day" IS NULL;
    `);

    // Create coupons table
    console.log('Creating coupons table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "type" text NOT NULL,
        "value" real NOT NULL,
        "min_amount" real DEFAULT 0,
        "max_uses" integer,
        "current_uses" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "valid_from" timestamp DEFAULT now(),
        "valid_until" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "coupons_code_unique" UNIQUE("code")
      );
    `);

    // Create user_coupon_usage table
    console.log('Creating user_coupon_usage table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_coupon_usage" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "coupon_id" integer NOT NULL,
        "used_at" timestamp DEFAULT now()
      );
    `);

    // Add foreign key constraints
    console.log('Adding foreign key constraints...');
    
    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_login_streaks" ADD CONSTRAINT "user_login_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_award_setting_id_award_settings_id_fk" FOREIGN KEY ("award_setting_id") REFERENCES "award_settings"("id") ON DELETE cascade;
      EXCEPTION
       WHEN duplicate_object THEN null;
       WHEN undefined_column THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_coupon_usage" ADD CONSTRAINT "user_coupon_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.execute(sql`
      DO $$ BEGIN
       ALTER TABLE "user_coupon_usage" ADD CONSTRAINT "user_coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE cascade;
      EXCEPTION
       WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create indexes for better performance
    console.log('Creating indexes...');
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_login_streaks_user_id" ON "user_login_streaks" ("user_id");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_awards_user_id" ON "user_awards" ("user_id");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_awards_status" ON "user_awards" ("status");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coupons_code" ON "coupons" ("code");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_coupons_active" ON "coupons" ("is_active");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_user_coupon_usage_user_id" ON "user_coupon_usage" ("user_id");
    `);

    // Insert default award settings
    console.log('Inserting default award settings...');
    await db.execute(sql`
      INSERT INTO "award_settings" ("name", "description", "login_days_required", "virtfusion_tokens", "is_active")
      VALUES 
        ('Daily Login Reward', 'Reward for logging in daily', 1, 10.0, true),
        ('Weekly Login Streak', 'Reward for 7 consecutive days', 7, 100.0, true),
        ('Monthly Login Streak', 'Reward for 30 consecutive days', 30, 500.0, true)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Awards system synced successfully!');
    console.log('📊 Created tables: award_settings, user_login_streaks, user_awards, coupons, user_coupon_usage');
    console.log('🔗 Added foreign key constraints and indexes');
    console.log('🎁 Inserted default award settings');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to sync awards system:', error);
    process.exit(1);
  }
}

// Run the sync
syncAwardsSystem();