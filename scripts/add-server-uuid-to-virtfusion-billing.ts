import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addServerUuidToVirtfusionBilling() {
  try {
    console.log('Starting VirtFusion billing server UUID migration...');
    
    // Add server_uuid column to virtfusion_hourly_billing table
    console.log('Adding server_uuid column to virtfusion_hourly_billing table...');
    await db.execute(sql`
      ALTER TABLE virtfusion_hourly_billing 
      ADD COLUMN IF NOT EXISTS server_uuid TEXT;
    `);
    
    // Add index on server_uuid for better performance
    console.log('Creating index on server_uuid...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_virtfusion_hourly_billing_server_uuid 
      ON virtfusion_hourly_billing(server_uuid);
    `);
    
    console.log('✅ VirtFusion billing server UUID migration completed successfully!');
    console.log('   - Added server_uuid column to virtfusion_hourly_billing');
    console.log('   - Added index on server_uuid for performance');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add server UUID to VirtFusion billing:', error);
    process.exit(1);
  }
}

// Run the migration
addServerUuidToVirtfusionBilling();