import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL is not set. This test requires a database connection.');
    console.log('   To run this test, you need to:');
    console.log('   1. Set up a database (PostgreSQL/Neon)');
    console.log('   2. Create a .env file with DATABASE_URL');
    console.log('   3. Example: DATABASE_URL="postgresql://user:password@localhost:5432/skypanel"');
    console.log('\n   Skipping test due to missing DATABASE_URL...');
    process.exit(0);
}

async function testServerSync() {
    console.log('🧪 Testing Server Synchronization System');
    console.log('=====================================\n');

    try {
        // Import database modules after confirming DATABASE_URL is set
        const { db } = await import('../server/db');
        const { storage } = await import('../server/storage');
        const { ServerSyncService } = await import('../server/services/server-sync-service');

        // Test 1: Get all users with VirtFusion accounts
        console.log('1. Fetching users with VirtFusion accounts...');
        const users = await storage.getAllUsers();
        const usersWithVirtFusion = users.filter(user => user.virtFusionId);

        console.log(`   Found ${users.length} total users`);
        console.log(`   Found ${usersWithVirtFusion.length} users with VirtFusion accounts`);

        if (usersWithVirtFusion.length === 0) {
            console.log('   ⚠️  No users with VirtFusion accounts found. Cannot test synchronization.');
            return;
        }

        // Test 2: Test sync status for first user
        const testUser = usersWithVirtFusion[0];
        console.log(`\n2. Testing sync status for user ${testUser.id} (${testUser.email})...`);

        const syncStatus = await ServerSyncService.getSyncStatus(testUser.id);
        console.log('   Sync Status:', {
            totalServers: syncStatus.totalServers,
            syncedServers: syncStatus.syncedServers,
            externalServers: syncStatus.externalServers,
            billingRecords: syncStatus.billingRecords
        });

        // Test 3: Test individual user sync
        console.log(`\n3. Testing server synchronization for user ${testUser.id}...`);
        const syncResult = await ServerSyncService.syncUserServers(testUser.id);

        console.log('   Sync Result:', {
            success: syncResult.success,
            message: syncResult.message,
            syncedServers: syncResult.syncedServers,
            newServers: syncResult.newServers,
            updatedServers: syncResult.updatedServers,
            errors: syncResult.errors.length
        });

        if (syncResult.errors.length > 0) {
            console.log('   Errors encountered:');
            syncResult.errors.forEach((error, index) => {
                console.log(`     ${index + 1}. ${error}`);
            });
        }

        // Test 4: Test all users sync (limited to first 3 users to avoid overwhelming the API)
        console.log('\n4. Testing synchronization for all users (limited to first 3)...');
        const limitedUsers = usersWithVirtFusion.slice(0, 3);

        for (const user of limitedUsers) {
            console.log(`   Syncing user ${user.id} (${user.email})...`);
            try {
                const userResult = await ServerSyncService.syncUserServers(user.id);
                console.log(`     Result: ${userResult.success ? '✅' : '❌'} ${userResult.message}`);
                if (userResult.errors.length > 0) {
                    console.log(`     Errors: ${userResult.errors.length}`);
                }
            } catch (error) {
                console.log(`     ❌ Error: ${error}`);
            }
        }

        // Test 5: Verify database records
        console.log('\n5. Verifying database records...');
        const { virtfusionHourlyBilling, virtfusionHourlyTransactions } = await import('../shared/schemas');
        const { eq } = await import('drizzle-orm');

        const billingRecords = await db
            .select()
            .from(virtfusionHourlyBilling)
            .where(eq(virtfusionHourlyBilling.userId, testUser.id));

        const transactionRecords = await db
            .select()
            .from(virtfusionHourlyTransactions)
            .where(eq(virtfusionHourlyTransactions.userId, testUser.id));

        console.log(`   Billing records for user ${testUser.id}: ${billingRecords.length}`);
        console.log(`   Transaction records for user ${testUser.id}: ${transactionRecords.length}`);

        // Show external servers
        const externalServers = billingRecords.filter(record =>
            !record.serverCreatedAt ||
            (record.reference1 && record.reference1.includes('external_server'))
        );

        console.log(`   External servers: ${externalServers.length}`);
        if (externalServers.length > 0) {
            console.log('   External server details:');
            externalServers.forEach((record, index) => {
                console.log(`     ${index + 1}. Server ID: ${record.serverId}, UUID: ${record.serverUuid || 'N/A'}`);
            });
        }

        console.log('\n✅ Server synchronization test completed successfully!');

    } catch (error) {
        console.error('❌ Server synchronization test failed:', error);
        process.exit(1);
    }
}

// Run the test
testServerSync()
    .then(() => {
        console.log('\n🎉 All tests completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Test failed with error:', error);
        process.exit(1);
    });
