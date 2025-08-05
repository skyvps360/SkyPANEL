import 'dotenv/config';
import { db } from '../server/db';
import { virtFusionApi } from '../server/virtfusion-api';
import { virtfusionHourlyBilling } from '../shared/schemas/virtfusion-billing-schema';
import { eq } from 'drizzle-orm';

/**
 * Test script to verify the UUID-based cross-checking functionality
 * This script simulates the billing process without actually charging users
 */
async function testVirtFusionUuidCrossCheck() {
  try {
    console.log('🧪 Starting VirtFusion UUID cross-check test...');
    
    // Get a few billing records to test with
    const testRecords = await db.select()
      .from(virtfusionHourlyBilling)
      .where(eq(virtfusionHourlyBilling.billingEnabled, true))
      .limit(5);

    if (testRecords.length === 0) {
      console.log('⚠️ No active billing records found for testing');
      process.exit(0);
    }

    console.log(`📊 Testing ${testRecords.length} billing records...\n`);

    for (const record of testRecords) {
      console.log(`\n🔍 Testing Record ID: ${record.id}`);
      console.log(`   - User ID: ${record.userId}`);
      console.log(`   - Server ID: ${record.serverId}`);
      console.log(`   - VirtFusion Server ID: ${record.virtfusionServerId}`);
      console.log(`   - Server UUID: ${record.serverUuid || 'NOT SET'}`);
      
      if (!record.serverUuid) {
        console.log('   ❌ No server UUID found - run populate-missing-server-uuids.ts first');
        continue;
      }

      try {
        // Test the new UUID-based verification
        console.log(`   🔍 Testing UUID-based ownership verification...`);
        const isStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
          record.serverUuid, 
          record.userId
        );
        
        if (isStillOwned) {
          console.log(`   ✅ Server ${record.serverUuid} is still owned by user ${record.userId}`);
          console.log(`   💰 Would proceed with billing`);
        } else {
          console.log(`   ❌ Server ${record.serverUuid} is NOT owned by user ${record.userId}`);
          console.log(`   🚫 Would disable billing for this server`);
        }

        // Also test getting user's current servers for reference
        console.log(`   📋 Getting user's current servers from VirtFusion...`);
        const userServers = await virtFusionApi.getUserServers(record.userId);
        
        if (userServers?.data && Array.isArray(userServers.data)) {
          console.log(`   📊 User has ${userServers.data.length} servers currently:`);
          userServers.data.forEach((server: any, index: number) => {
            console.log(`      ${index + 1}. Server ID: ${server.id}, UUID: ${server.uuid}, Name: ${server.name || 'N/A'}`);
          });
        } else {
          console.log(`   📭 No servers found for user ${record.userId}`);
        }
        
      } catch (error: any) {
        console.error(`   ❌ Error testing record ${record.id}:`, error.message);
      }
    }

    console.log(`\n✅ Cross-check testing completed!`);
    console.log(`\n📝 Summary:`);
    console.log(`   - The system will now cross-check server ownership using UUIDs`);
    console.log(`   - Billing will only occur for servers still owned by the user`);
    console.log(`   - Servers no longer owned will have billing automatically disabled`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error during cross-check testing:', error);
    process.exit(1);
  }
}

// Run the test
testVirtFusionUuidCrossCheck();