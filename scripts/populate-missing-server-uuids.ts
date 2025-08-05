import 'dotenv/config';
import { db } from '../server/db';
import { virtFusionApi } from '../server/virtfusion-api';
import { virtfusionHourlyBilling } from '../shared/schemas/virtfusion-billing-schema';
import { eq, isNull, or } from 'drizzle-orm';

/**
 * Migration script to populate missing server UUIDs in virtfusion_hourly_billing table
 * This ensures that all billing records have UUIDs for accurate cross-checking
 */
async function populateMissingServerUuids() {
  try {
    console.log('🔄 Starting migration to populate missing server UUIDs...');
    
    // Get all billing records that don't have server_uuid
    const recordsWithoutUuid = await db.select()
      .from(virtfusionHourlyBilling)
      .where(or(
        isNull(virtfusionHourlyBilling.serverUuid),
        eq(virtfusionHourlyBilling.serverUuid, '')
      ));

    console.log(`📊 Found ${recordsWithoutUuid.length} records without server UUID`);

    if (recordsWithoutUuid.length === 0) {
      console.log('✅ All records already have server UUIDs');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;
    const errors: any[] = [];

    for (const record of recordsWithoutUuid) {
      try {
        console.log(`🔍 Looking up UUID for server ${record.virtfusionServerId}...`);
        
        // Get server details from VirtFusion API
        const serverResponse = await virtFusionApi.getServerById(record.virtfusionServerId);
        
        if (serverResponse?.data?.uuid) {
          const serverUuid = serverResponse.data.uuid;
          
          // Update the record with the UUID
          await db.update(virtfusionHourlyBilling)
            .set({
              serverUuid: serverUuid
            })
            .where(eq(virtfusionHourlyBilling.id, record.id));
          
          console.log(`✅ Updated record ${record.id} with UUID: ${serverUuid}`);
          updated++;
        } else {
          console.warn(`⚠️ No UUID found for server ${record.virtfusionServerId} - server may no longer exist`);
          
          // Disable billing for servers that no longer exist
          await db.update(virtfusionHourlyBilling)
            .set({
              billingEnabled: false,
              serverUuid: 'DELETED_SERVER' // Mark as deleted
            })
            .where(eq(virtfusionHourlyBilling.id, record.id));
          
          console.log(`🚫 Disabled billing for non-existent server ${record.virtfusionServerId}`);
          updated++;
        }
        
      } catch (error: any) {
        console.error(`❌ Error processing server ${record.virtfusionServerId}:`, error.message);
        failed++;
        errors.push({
          recordId: record.id,
          serverId: record.virtfusionServerId,
          error: error.message
        });
      }
    }

    console.log(`\n📈 Migration Summary:`);
    console.log(`   - Total records processed: ${recordsWithoutUuid.length}`);
    console.log(`   - Successfully updated: ${updated}`);
    console.log(`   - Failed: ${failed}`);
    
    if (errors.length > 0) {
      console.log(`\n❌ Errors encountered:`);
      errors.forEach(err => {
        console.log(`   - Record ${err.recordId} (Server ${err.serverId}): ${err.error}`);
      });
    }
    
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to populate missing server UUIDs:', error);
    process.exit(1);
  }
}

// Run the migration
populateMissingServerUuids();