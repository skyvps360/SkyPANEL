-- Migration: Add awards system tables
-- Created: Awards and coupon system for daily login rewards

-- Award Settings table - Admin configurable daily login rewards
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

-- User Login Streaks table - Track consecutive login days
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

-- User Awards table - Track awarded rewards
CREATE TABLE IF NOT EXISTS "user_awards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"award_setting_id" integer NOT NULL,
	"virtfusion_tokens" real NOT NULL,
	"streak_day" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"claimed_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);

-- Coupons table - General coupon system
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

-- User Coupon Usage table - Track coupon usage by users
CREATE TABLE IF NOT EXISTS "user_coupon_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"coupon_id" integer NOT NULL,
	"used_at" timestamp DEFAULT now()
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "user_login_streaks" ADD CONSTRAINT "user_login_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_award_setting_id_award_settings_id_fk" FOREIGN KEY ("award_setting_id") REFERENCES "award_settings"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_coupon_usage" ADD CONSTRAINT "user_coupon_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "user_coupon_usage" ADD CONSTRAINT "user_coupon_usage_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE cascade;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_user_login_streaks_user_id" ON "user_login_streaks" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_awards_user_id" ON "user_awards" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_awards_status" ON "user_awards" ("status");
CREATE INDEX IF NOT EXISTS "idx_coupons_code" ON "coupons" ("code");
CREATE INDEX IF NOT EXISTS "idx_coupons_active" ON "coupons" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_user_coupon_usage_user_id" ON "user_coupon_usage" ("user_id");

-- Insert default award setting
INSERT INTO "award_settings" ("name", "description", "login_days_required", "virtfusion_tokens", "is_active")
VALUES 
  ('Daily Login Reward', 'Reward for logging in daily', 1, 10.0, true),
  ('Weekly Login Streak', 'Reward for 7 consecutive days', 7, 100.0, true),
  ('Monthly Login Streak', 'Reward for 30 consecutive days', 30, 500.0, true)
ON CONFLICT DO NOTHING;