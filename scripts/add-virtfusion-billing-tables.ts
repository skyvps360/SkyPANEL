import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addVirtFusionBillingTables() {
  try {
    console.log('Starting VirtFusion billing tables migration...');
    
    // Create VirtFusion hourly billing table
    console.log('Creating virtfusion_hourly_billing table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "virtfusion_hourly_billing" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "server_id" integer NOT NULL,
        "virtfusion_server_id" integer NOT NULL,
        "package_id" integer NOT NULL,
        "package_name" text NOT NULL,
        "monthly_price" numeric(10,4) NOT NULL,
        "hourly_rate" numeric(10,6) NOT NULL,
        "hours_in_month" integer DEFAULT 730 NOT NULL,
        "billing_enabled" boolean DEFAULT true NOT NULL,
        "last_billed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create VirtFusion hourly transactions table
    console.log('Creating virtfusion_hourly_transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "virtfusion_hourly_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "billing_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "server_id" integer NOT NULL,
        "transaction_id" integer,
        "hours_billed" numeric(4,2) DEFAULT '1.0' NOT NULL,
        "amount_charged" numeric(10,4) NOT NULL,
        "billing_period_start" timestamp NOT NULL,
        "billing_period_end" timestamp NOT NULL,
        "status" text DEFAULT 'pending' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "virtfusion_hourly_transactions_billing_id_fkey" 
          FOREIGN KEY ("billing_id") REFERENCES "virtfusion_hourly_billing"("id") ON DELETE CASCADE
      );
    `);
    
    // Create VirtFusion cron settings table
    console.log('Creating virtfusion_cron_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "virtfusion_cron_settings" (
        "id" serial PRIMARY KEY NOT NULL,
        "enabled" boolean DEFAULT false NOT NULL,
        "hours_per_month" integer DEFAULT 730 NOT NULL,
        "billing_on_first_enabled" boolean DEFAULT true NOT NULL,
        "hourly_billing_enabled" boolean DEFAULT true NOT NULL,
        "last_monthly_billing" timestamp,
        "last_hourly_billing" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "virtfusion_hourly_billing_user_id_idx" 
        ON "virtfusion_hourly_billing" ("user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "virtfusion_hourly_billing_server_id_idx" 
        ON "virtfusion_hourly_billing" ("server_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "virtfusion_hourly_transactions_billing_id_idx" 
        ON "virtfusion_hourly_transactions" ("billing_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "virtfusion_hourly_transactions_user_id_idx" 
        ON "virtfusion_hourly_transactions" ("user_id");
    `);
    
    // Insert default cron settings if none exist
    console.log('Inserting default VirtFusion cron settings...');
    await db.execute(sql`
      INSERT INTO "virtfusion_cron_settings" 
        ("enabled", "hours_per_month", "billing_on_first_enabled", "hourly_billing_enabled")
      SELECT false, 730, true, true
      WHERE NOT EXISTS (SELECT 1 FROM "virtfusion_cron_settings");
    `);
    
    console.log('✅ VirtFusion billing tables created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create VirtFusion billing tables:', error);
    process.exit(1);
  }
}

// Run the migration
addVirtFusionBillingTables();
