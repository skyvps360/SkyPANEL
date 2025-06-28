import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addSlaTables() {
  try {
    console.log('Starting SLA tables migration...');
    
    // Enable uuid-ossp extension
    console.log('Enabling uuid-ossp extension...');
    await db.execute(sql`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);

    // Drop sla_plans table if it exists
    console.log('Dropping sla_plans table if it exists...');
    await db.execute(sql`
      DROP TABLE IF EXISTS "sla_plans" CASCADE;
    `);

    // Create sla_plans table
    console.log('Creating sla_plans table...');
    await db.execute(sql`
      CREATE TABLE "sla_plans" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "name" varchar(256) NOT NULL UNIQUE,
        "description" text,
        "response_time_hours" integer NOT NULL,
        "resolution_time_hours" integer NOT NULL,
        "uptime_guarantee_percentage" integer NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Verify sla_plans.id type
    console.log('Verifying sla_plans.id type...');
    const slaIdType = await db.execute(sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'sla_plans' AND column_name = 'id';
    `);
    console.log(`sla_plans.id type: ${slaIdType.rows[0].data_type}`);

    // Drop foreign key constraint and column for package_pricing
    console.log('Dropping existing sla_plan_id and its constraint from package_pricing...');
    await db.execute(sql`
      ALTER TABLE "package_pricing"
      DROP CONSTRAINT IF EXISTS "package_pricing_sla_plan_id_fkey";
    `);
    await db.execute(sql`
      ALTER TABLE "package_pricing"
      DROP COLUMN IF EXISTS "sla_plan_id";
    `);

    // Add sla_plan_id to package_pricing (without FK initially)
    console.log('Adding sla_plan_id to package_pricing table (without FK)...');
    await db.execute(sql`
      ALTER TABLE "package_pricing"
      ADD COLUMN "sla_plan_id" UUID;
    `);

    // Verify package_pricing.sla_plan_id type
    console.log('Verifying package_pricing.sla_plan_id type...');
    const packageSlaIdType = await db.execute(sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'package_pricing' AND column_name = 'sla_plan_id';
    `);
    console.log(`package_pricing.sla_plan_id type: ${packageSlaIdType.rows[0].data_type}`);

    // Drop foreign key constraint and column for server_power_status
    console.log('Dropping existing sla_plan_id and its constraint from server_power_status...');
    await db.execute(sql`
      ALTER TABLE "server_power_status"
      DROP CONSTRAINT IF EXISTS "server_power_status_sla_plan_id_fkey";
    `);
    await db.execute(sql`
      ALTER TABLE "server_power_status"
      DROP COLUMN IF EXISTS "sla_plan_id";
    `);

    // Add sla_plan_id to server_power_status (without FK initially)
    console.log('Adding sla_plan_id to server_power_status table (without FK)...');
    await db.execute(sql`
      ALTER TABLE "server_power_status"
      ADD COLUMN "sla_plan_id" UUID;
    `);

    // Verify server_power_status.sla_plan_id type
    console.log('Verifying server_power_status.sla_plan_id type...');
    const serverSlaIdType = await db.execute(sql`
      SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'server_power_status' AND column_name = 'sla_plan_id';
    `);
    console.log(`server_power_status.sla_plan_id type: ${serverSlaIdType.rows[0].data_type}`);

    // Add foreign key constraints
    console.log('Adding foreign key constraints...');
    await db.execute(sql`
      ALTER TABLE "package_pricing"
      ADD CONSTRAINT "package_pricing_sla_plan_id_fkey"
      FOREIGN KEY ("sla_plan_id") REFERENCES "sla_plans"("id") ON DELETE SET NULL;
    `);
    await db.execute(sql`
      ALTER TABLE "server_power_status"
      ADD CONSTRAINT "server_power_status_sla_plan_id_fkey"
      FOREIGN KEY ("sla_plan_id") REFERENCES "sla_plans"("id") ON DELETE SET NULL;
    `);
    
    console.log('✅ SLA tables migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to migrate SLA tables:', error);
    process.exit(1);
  }
}

// Run the migration
addSlaTables();