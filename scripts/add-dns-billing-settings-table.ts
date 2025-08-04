import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDnsBillingSettingsTable() {
  try {
    console.log('Starting DNS billing settings table migration...');
    
    // Create dns_billing_settings table
    console.log('Creating dns_billing_settings table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dns_billing_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "cron_enabled" boolean DEFAULT false NOT NULL,
        "cron_schedule" text DEFAULT '0 2 1 * *' NOT NULL,
        "last_cron_run" timestamp with time zone,
        "next_cron_run" timestamp with time zone,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL
      );
    `);
    
    // Insert default settings record
    console.log('Inserting default DNS billing settings...');
    await db.execute(sql`
      INSERT INTO "dns_billing_settings" (
        "cron_enabled",
        "cron_schedule",
        "created_at",
        "updated_at"
      ) VALUES (
        false,
        '0 2 1 * *',
        now(),
        now()
      )
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ DNS billing settings table created successfully!');
    console.log('📅 Default schedule: 0 2 1 * * (2 AM on the 1st of each month)');
    console.log('⚙️  DNS billing automation is disabled by default');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create DNS billing settings table:', error);
    process.exit(1);
  }
}

// Run the migration
addDnsBillingSettingsTable();
