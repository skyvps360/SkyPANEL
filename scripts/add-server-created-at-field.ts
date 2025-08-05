import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addServerCreatedAtField() {
  try {
    console.log('🔄 Starting migration: Add serverCreatedAt field to virtfusion_hourly_billing table...');

    // Step 1: Add the serverCreatedAt column
    console.log('📝 Adding serverCreatedAt column to virtfusion_hourly_billing table...');
    await db.execute(sql`
      ALTER TABLE virtfusion_hourly_billing 
      ADD COLUMN IF NOT EXISTS server_created_at TIMESTAMP;
    `);
    console.log('✅ Added serverCreatedAt column');

    // Step 2: For existing records without serverCreatedAt, try to fetch from VirtFusion API
    // First, let's see how many records need updating
    const recordsNeedingUpdate = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM virtfusion_hourly_billing 
      WHERE server_created_at IS NULL;
    `);
    
    const count = recordsNeedingUpdate.rows[0]?.count || 0;
    console.log(`📊 Found ${count} records that need serverCreatedAt populated`);

    if (count > 0) {
      // For existing records, we'll set serverCreatedAt to the record's createdAt as a fallback
      // This isn't perfect but ensures the billing system continues to work
      console.log('⚠️  Setting serverCreatedAt to record createdAt for existing records as fallback...');
      console.log('⚠️  Note: This may not be the exact VirtFusion server creation time, but ensures billing continues to work');
      
      await db.execute(sql`
        UPDATE virtfusion_hourly_billing 
        SET server_created_at = created_at 
        WHERE server_created_at IS NULL;
      `);
      
      console.log('✅ Updated existing records with fallback serverCreatedAt values');
      console.log('💡 Future server creations will use the actual VirtFusion server creation timestamp');
    }

    // Step 3: Add index for performance on serverCreatedAt queries
    console.log('📝 Adding index on serverCreatedAt for performance...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_virtfusion_hourly_billing_server_created_at 
      ON virtfusion_hourly_billing(server_created_at);
    `);
    console.log('✅ Added index on serverCreatedAt');

    // Step 4: Verify the migration
    const verificationResult = await db.execute(sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(server_created_at) as records_with_timestamp,
        COUNT(*) - COUNT(server_created_at) as records_without_timestamp
      FROM virtfusion_hourly_billing;
    `);

    const verification = verificationResult.rows[0];
    console.log('📊 Migration verification:');
    console.log(`   Total records: ${verification?.total_records || 0}`);
    console.log(`   Records with timestamp: ${verification?.records_with_timestamp || 0}`);
    console.log(`   Records without timestamp: ${verification?.records_without_timestamp || 0}`);

    if ((verification?.records_without_timestamp || 0) > 0) {
      console.warn('⚠️  Some records still don\'t have serverCreatedAt timestamps');
    } else {
      console.log('✅ All records now have serverCreatedAt timestamps');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('   1. Added server_created_at column to virtfusion_hourly_billing table');
    console.log('   2. Populated existing records with fallback timestamps');
    console.log('   3. Added performance index on server_created_at');
    console.log('   4. Future server creations will use actual VirtFusion timestamps');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Restart the server to load the updated schema');
    console.log('   2. VirtFusion hourly billing will now bill servers based on their individual creation times');
    console.log('   3. Monitor the cron logs to verify the new billing logic is working correctly');

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addServerCreatedAtField();