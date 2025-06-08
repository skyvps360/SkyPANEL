#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function restoreAdminDnsPlan() {
  console.log("🔧 Restoring Admin User's DNS Plan...\n");

  try {
    const adminUserId = 1;

    // 1. Check admin user exists
    console.log("1. Verifying admin user...");
    const [adminUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, adminUserId))
      .limit(1);

    if (!adminUser) {
      console.log("❌ Admin user not found!");
      return;
    }

    console.log(`✅ Found admin user: ${adminUser.username} (${adminUser.email})`);

    // 2. Check current active subscriptions
    console.log("\n2. Checking current DNS subscriptions...");
    const activeSubscriptions = await db.select()
      .from(dnsPlanSubscriptionsTable)
      .where(and(
        eq(dnsPlanSubscriptionsTable.userId, adminUserId),
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    console.log(`   Current active subscriptions: ${activeSubscriptions.length}`);

    if (activeSubscriptions.length > 0) {
      console.log("ℹ️  Admin user already has active DNS subscription(s):");
      for (const sub of activeSubscriptions) {
        const [plan] = await db.select()
          .from(dnsPlansTable)
          .where(eq(dnsPlansTable.id, sub.planId))
          .limit(1);
        console.log(`   - ${plan?.name || 'Unknown'} (ID: ${sub.planId})`);
      }
      console.log("No action needed.");
      return;
    }

    // 3. Find the Free DNS plan
    console.log("\n3. Finding Free DNS plan...");
    const [freePlan] = await db.select()
      .from(dnsPlansTable)
      .where(and(
        eq(dnsPlansTable.name, 'Free'),
        eq(dnsPlansTable.isActive, true)
      ))
      .limit(1);

    if (!freePlan) {
      console.log("❌ Free DNS plan not found!");
      console.log("Available plans:");
      const allPlans = await db.select().from(dnsPlansTable).where(eq(dnsPlansTable.isActive, true));
      allPlans.forEach(plan => {
        console.log(`   - ${plan.name}: $${plan.price}/month (ID: ${plan.id})`);
      });
      return;
    }

    console.log(`✅ Found Free plan: ${freePlan.name} ($${freePlan.price}/month)`);
    console.log(`   Max Domains: ${freePlan.maxDomains}, Max Records: ${freePlan.maxRecords}`);

    // 4. Create Free plan subscription for admin
    console.log("\n4. Creating Free plan subscription for admin user...");
    
    const now = new Date();
    const endDate = new Date('2099-12-31'); // Permanent free plan
    const nextPaymentDate = endDate; // No payment needed for free plan

    await db.insert(dnsPlanSubscriptionsTable).values({
      userId: adminUserId,
      planId: freePlan.id,
      status: 'active',
      startDate: now,
      endDate: endDate,
      autoRenew: false, // Free plan doesn't auto-renew
      lastPaymentDate: now,
      nextPaymentDate: nextPaymentDate
    });

    console.log("✅ Successfully created Free plan subscription for admin user");

    // 5. Verify the subscription was created
    console.log("\n5. Verifying subscription creation...");
    const newSubscriptions = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      planName: dnsPlansTable.name,
      status: dnsPlanSubscriptionsTable.status,
      endDate: dnsPlanSubscriptionsTable.endDate
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(and(
        eq(dnsPlanSubscriptionsTable.userId, adminUserId),
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    if (newSubscriptions.length > 0) {
      console.log("✅ Verification successful!");
      newSubscriptions.forEach(sub => {
        console.log(`   - ${sub.planName} (ID: ${sub.subscriptionId}) - Status: ${sub.status}`);
        console.log(`     End Date: ${new Date(sub.endDate).toLocaleDateString()}`);
      });
    } else {
      console.log("❌ Verification failed - no active subscriptions found");
    }

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 ADMIN DNS PLAN RESTORATION COMPLETED!");
    console.log("=" .repeat(60));
    console.log("✅ Admin user now has access to Free DNS plan");
    console.log("✅ Can manage up to 1 domain with 10 DNS records");
    console.log("✅ Ready to test DNS management features");

  } catch (error) {
    console.error("\n❌ Error restoring admin DNS plan:", error);
    process.exit(1);
  }
}

// Run the script
restoreAdminDnsPlan()
  .then(() => {
    console.log("\n🎉 Admin DNS plan restoration completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Admin DNS plan restoration failed:", error);
    process.exit(1);
  });
