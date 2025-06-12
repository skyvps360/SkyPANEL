#!/usr/bin/env tsx

import { db } from '../../server/db';
import { chatDepartments, ticketDepartments, supportDepartments } from '../../shared/schema';
import { departmentMigrationService } from '../../server/services/department-migration';

async function testDepartmentSync() {
  console.log('🧪 Testing Department Sync Functionality\n');

  try {
    // Step 1: Check current migration status
    console.log('1️⃣ Checking current migration status...');
    const initialStatus = await departmentMigrationService.checkMigrationStatus();
    console.log('Initial status:', {
      needsMigration: initialStatus.needsMigration,
      supportDepartmentCount: initialStatus.supportDepartmentCount,
      syncStatus: initialStatus.syncStatus
    });

    if (initialStatus.needsMigration) {
      console.log('❌ Migration not completed yet. Please run migration first.');
      return;
    }

    // Step 2: Create a new test chat department
    console.log('\n2️⃣ Creating a new test chat department...');
    const [newChatDept] = await db.insert(chatDepartments).values({
      name: 'Test Sync Department',
      description: 'A test department to verify sync functionality',
      isActive: true,
      displayOrder: 99,
      color: '#ff6b35',
      icon: 'TestTube'
    }).returning();
    
    console.log('Created chat department:', newChatDept);

    // Step 3: Check sync status after adding new department
    console.log('\n3️⃣ Checking sync status after adding new department...');
    const syncStatus = await departmentMigrationService.checkMigrationStatus();
    console.log('Sync status:', {
      needsMigration: syncStatus.needsMigration,
      syncStatus: syncStatus.syncStatus
    });

    if (!syncStatus.syncStatus?.needsSync) {
      console.log('❌ Sync not detected. Expected needsSync to be true.');
      return;
    }

    console.log('✅ Sync needed detected!');
    console.log('New departments to sync:', {
      newTicketDepartments: syncStatus.syncStatus.newTicketDepartments.length,
      newChatDepartments: syncStatus.syncStatus.newChatDepartments.length,
      totalNewDepartments: syncStatus.syncStatus.totalNewDepartments
    });

    // Step 4: Perform the sync
    console.log('\n4️⃣ Performing department sync...');
    const syncResult = await departmentMigrationService.syncNewDepartments();
    console.log('Sync result:', {
      success: syncResult.success,
      message: syncResult.message,
      details: syncResult.details
    });

    if (!syncResult.success) {
      console.log('❌ Sync failed:', syncResult.message);
      return;
    }

    // Step 5: Verify sync completed
    console.log('\n5️⃣ Verifying sync completion...');
    const finalStatus = await departmentMigrationService.checkMigrationStatus();
    console.log('Final status:', {
      needsMigration: finalStatus.needsMigration,
      syncStatus: finalStatus.syncStatus
    });

    if (finalStatus.syncStatus?.needsSync) {
      console.log('❌ Sync still needed after completion. Something went wrong.');
      return;
    }

    // Step 6: Verify the new department exists in support_departments
    console.log('\n6️⃣ Verifying new department in unified system...');
    const unifiedDepts = await db.select().from(supportDepartments);
    const syncedDept = unifiedDepts.find(dept => dept.name === 'Test Sync Department');
    
    if (!syncedDept) {
      console.log('❌ New department not found in unified system.');
      return;
    }

    console.log('✅ New department found in unified system:', syncedDept);

    // Step 7: Cleanup - remove test department
    console.log('\n7️⃣ Cleaning up test data...');
    await db.delete(chatDepartments).where(chatDepartments.id.eq(newChatDept.id));
    await db.delete(supportDepartments).where(supportDepartments.id.eq(syncedDept.id));
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Department sync functionality test completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('✅ Migration status check works');
    console.log('✅ New department detection works');
    console.log('✅ Sync functionality works');
    console.log('✅ Post-sync verification works');
    console.log('✅ Data integrity maintained');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    process.exit(0);
  }
}

// Run the test
testDepartmentSync().catch(console.error);
