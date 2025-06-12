import 'dotenv/config';
import { db } from '../server/db';
import { 
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable, 
  dnsPlans as dnsPlansTable,
  users as usersTable
} from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function cleanupAdminSubscriptions() {
  console.log("🧹 CLEANING UP ADMIN DNS SUBSCRIPTIONS");
  console.log("=" .repeat(50));

  try {
    // 1. Get all admin subscriptions
    console.log("\n1. Finding admin subscriptions...");
    const adminSubscriptions = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      userId: dnsPlanSubscriptionsTable.userId,
      planId: dnsPlanSubscriptionsTable.planId,
      status: dnsPlanSubscriptionsTable.status,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate,
      createdAt: dnsPlanSubscriptionsTable.createdAt,
      // User details
      username: usersTable.username,
      userRole: usersTable.role,
      // Plan details
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(usersTable.role, 'admin'))
      .orderBy(dnsPlanSubscriptionsTable.createdAt);

    console.log(`Found ${adminSubscriptions.length} admin subscriptions:`);
    
    const activeSubs = adminSubscriptions.filter(s => s.status === 'active');
    const cancelledSubs = adminSubscriptions.filter(s => s.status === 'cancelled');
    
    console.log(`   Active: ${activeSubs.length}`);
    console.log(`   Cancelled: ${cancelledSubs.length}`);

    // 2. Show details of admin subscriptions
    console.log("\n2. Admin subscription details:");
    adminSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.planName} - Status: ${sub.status} - Created: ${new Date(sub.createdAt).toLocaleDateString()} (ID: ${sub.subscriptionId})`);
    });

    // 3. Keep only one active Free plan subscription for admin
    console.log("\n3. Cleanup strategy:");
    console.log("   - Keep 1 active Free plan subscription for admin");
    console.log("   - Remove all cancelled admin subscriptions");
    console.log("   - Remove any duplicate active admin subscriptions");

    // Find the best active subscription to keep (Free plan, most recent)
    const freeActiveSubs = activeSubs.filter(s => s.planName === 'Free');
    const nonFreeActiveSubs = activeSubs.filter(s => s.planName !== 'Free');
    
    let subscriptionToKeep = null;
    let subscriptionsToRemove = [];

    if (freeActiveSubs.length > 0) {
      // Keep the most recent Free plan subscription
      subscriptionToKeep = freeActiveSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      subscriptionsToRemove = [
        ...freeActiveSubs.filter(s => s.subscriptionId !== subscriptionToKeep.subscriptionId),
        ...nonFreeActiveSubs,
        ...cancelledSubs
      ];
    } else if (nonFreeActiveSubs.length > 0) {
      // Keep the most recent non-free subscription and convert to Free
      subscriptionToKeep = nonFreeActiveSubs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      subscriptionsToRemove = [
        ...nonFreeActiveSubs.filter(s => s.subscriptionId !== subscriptionToKeep.subscriptionId),
        ...cancelledSubs
      ];
    } else {
      // Only cancelled subscriptions, remove all
      subscriptionsToRemove = cancelledSubs;
    }

    console.log(`\n4. Cleanup plan:`);
    if (subscriptionToKeep) {
      console.log(`   ✅ Keep: ${subscriptionToKeep.planName} subscription (ID: ${subscriptionToKeep.subscriptionId})`);
    }
    console.log(`   🗑️  Remove: ${subscriptionsToRemove.length} subscriptions`);
    
    subscriptionsToRemove.forEach(sub => {
      console.log(`      - ${sub.planName} (${sub.status}) - ID: ${sub.subscriptionId}`);
    });

    // 5. Execute cleanup
    if (subscriptionsToRemove.length > 0) {
      console.log(`\n5. Executing cleanup...`);
      
      for (const sub of subscriptionsToRemove) {
        await db.delete(dnsPlanSubscriptionsTable)
          .where(eq(dnsPlanSubscriptionsTable.id, sub.subscriptionId));
        console.log(`   ✅ Removed ${sub.planName} subscription (ID: ${sub.subscriptionId})`);
      }
      
      console.log(`\n✅ Cleanup completed! Removed ${subscriptionsToRemove.length} admin subscriptions.`);
    } else {
      console.log(`\n✅ No cleanup needed - admin subscriptions are already clean.`);
    }

    // 6. Ensure admin has exactly one Free plan subscription
    if (!subscriptionToKeep || subscriptionToKeep.planName !== 'Free') {
      console.log(`\n6. Ensuring admin has Free plan subscription...`);
      
      // Get Free plan
      const freePlans = await db.select()
        .from(dnsPlansTable)
        .where(and(
          eq(dnsPlansTable.name, 'Free'),
          eq(dnsPlansTable.price, 0)
        ))
        .limit(1);

      if (freePlans.length === 0) {
        console.log("   ❌ No Free plan found! Cannot assign Free plan to admin.");
        return;
      }

      const freePlan = freePlans[0];
      
      // Remove the non-free subscription if it exists
      if (subscriptionToKeep && subscriptionToKeep.planName !== 'Free') {
        await db.delete(dnsPlanSubscriptionsTable)
          .where(eq(dnsPlanSubscriptionsTable.id, subscriptionToKeep.subscriptionId));
        console.log(`   🗑️  Removed ${subscriptionToKeep.planName} subscription`);
      }

      // Create Free plan subscription for admin
      const now = new Date();
      const endDate = new Date('2099-12-31'); // Never expires for free plan

      await db.insert(dnsPlanSubscriptionsTable).values({
        userId: 1, // Admin user ID
        planId: freePlan.id,
        status: 'active',
        startDate: now,
        endDate: endDate,
        autoRenew: false,
        lastPaymentDate: now,
        nextPaymentDate: endDate
      });

      console.log(`   ✅ Created Free plan subscription for admin`);
    }

    // 7. Final verification
    console.log(`\n7. Final verification...`);
    const finalAdminSubs = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      status: dnsPlanSubscriptionsTable.status,
      planName: dnsPlansTable.name
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(usersTable.role, 'admin'));

    console.log(`Admin now has ${finalAdminSubs.length} subscription(s):`);
    finalAdminSubs.forEach(sub => {
      console.log(`   - ${sub.planName} (${sub.status}) - ID: ${sub.subscriptionId}`);
    });

  } catch (error) {
    console.error("\n❌ Error during cleanup:", error);
    process.exit(1);
  }
}

// Run the script
cleanupAdminSubscriptions()
  .then(() => {
    console.log("\n🎉 Admin subscription cleanup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Admin subscription cleanup failed:", error);
    process.exit(1);
  });
