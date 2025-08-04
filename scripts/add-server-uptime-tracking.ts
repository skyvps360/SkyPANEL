import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addServerUptimeTracking() {
  try {
    console.log('🔄 Adding server uptime tracking tables...');
    
    // Create server_uptime_logs table
    console.log('Creating server_uptime_logs table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "server_uptime_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "server_id" integer NOT NULL,
        "virtfusion_server_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "status" text NOT NULL DEFAULT 'running',
        "start_time" timestamp with time zone NOT NULL DEFAULT now(),
        "end_time" timestamp with time zone,
        "total_hours" decimal(10,2) DEFAULT 0,
        "hourly_rate" decimal(10,4) NOT NULL DEFAULT 0,
        "total_cost" decimal(10,4) DEFAULT 0,
        "billing_cycle" text NOT NULL DEFAULT 'hourly',
        "is_billed" boolean NOT NULL DEFAULT false,
        "billing_transaction_id" uuid,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    
    // Create server_hourly_billing_settings table
    console.log('Creating server_hourly_billing_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "server_hourly_billing_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "hours_per_month" integer NOT NULL DEFAULT 730,
        "cron_enabled" boolean NOT NULL DEFAULT true,
        "cron_schedule" text NOT NULL DEFAULT '0 * * * *',
        "last_cron_run" timestamp with time zone,
        "next_cron_run" timestamp with time zone,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    
    // Create server_package_hourly_rates table
    console.log('Creating server_package_hourly_rates table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "server_package_hourly_rates" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "package_id" integer NOT NULL,
        "package_name" text NOT NULL,
        "hourly_rate" decimal(10,4) NOT NULL,
        "monthly_rate" decimal(10,4) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_uptime_logs_server_id" ON "server_uptime_logs" ("server_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_uptime_logs_user_id" ON "server_uptime_logs" ("user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_uptime_logs_status" ON "server_uptime_logs" ("status");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_uptime_logs_is_billed" ON "server_uptime_logs" ("is_billed");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_uptime_logs_start_time" ON "server_uptime_logs" ("start_time");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_package_hourly_rates_package_id" ON "server_package_hourly_rates" ("package_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_package_hourly_rates_is_active" ON "server_package_hourly_rates" ("is_active");
    `);
    
    // Insert default hourly billing settings
    console.log('Inserting default hourly billing settings...');
    await db.execute(sql`
      INSERT INTO "server_hourly_billing_settings" ("hours_per_month", "cron_enabled", "cron_schedule")
      VALUES (730, true, '0 * * * *')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log("✅ Server uptime tracking tables created successfully!");
    
    // Add settings to the settings table
    console.log('Adding settings to settings table...');
    await db.execute(sql`
      INSERT INTO "settings" ("key", "value", "updated_at")
      VALUES 
        ('server_hourly_billing_enabled', 'true', now()),
        ('server_hours_per_month', '730', now()),
        ('server_hourly_billing_cron_schedule', '0 * * * *', now())
      ON CONFLICT ("key") DO UPDATE SET 
        "value" = EXCLUDED."value",
        "updated_at" = now();
    `);
    
    console.log("✅ Server hourly billing settings added!");
    
  } catch (error) {
    console.error("❌ Error creating server uptime tracking tables:", error);
    throw error;
  }
}

// Run the migration
addServerUptimeTracking()
  .then(() => {
    console.log("🎉 Server uptime tracking migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  }); 