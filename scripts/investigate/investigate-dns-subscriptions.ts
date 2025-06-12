#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../../server/db";
import {
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

async function investigateDnsSubscriptions() {
  console.log("🔍 Investigating DNS Plan Subscriptions...\n");

  try {
    // 1. Get all users with their active DNS subscriptions
    console.log("1. Checking all users and their active DNS subscriptions...");

    const usersWithSubscriptions = await db.select({
      userId: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      subscriptionId: dnsPlanSubscriptionsTable.id,
      subscriptionStatus: dnsPlanSubscriptionsTable.status,
      planId: dnsPlansTable.id,
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate
    })
      .from(usersTable)
      .leftJoin(dnsPlanSubscriptionsTable, eq(usersTable.id, dnsPlanSubscriptionsTable.userId))
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(dnsPlanSubscriptionsTable.status, 'active'));

    // Group by user
    const userSubscriptions = new Map();

    usersWithSubscriptions.forEach(row => {
      if (!userSubscriptions.has(row.userId)) {
        userSubscriptions.set(row.userId, {
          user: { id: row.userId, username: row.username, email: row.email },
          subscriptions: []
        });
      }

      if (row.subscriptionId) {
        userSubscriptions.get(row.userId).subscriptions.push({
          id: row.subscriptionId,
          status: row.subscriptionStatus,
          plan: {
            id: row.planId,
            name: row.planName,
            price: row.planPrice
          },
          startDate: row.startDate,
          endDate: row.endDate
        });
      }
    });

    console.log(`Found ${userSubscriptions.size} users with DNS subscriptions\n`);

    // 2. Identify users with multiple active subscriptions
    let usersWithMultiplePlans = 0;
    let totalViolations = 0;
    const violatingUsers = [];

    userSubscriptions.forEach((userData, userId) => {
      const { user, subscriptions } = userData;

      console.log(`👤 User: ${user.username} (ID: ${user.id})`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Active subscriptions: ${subscriptions.length}`);

      if (subscriptions.length > 1) {
        usersWithMultiplePlans++;
        totalViolations += subscriptions.length - 1;
        console.log(`   ⚠️  VIOLATION: Multiple active subscriptions detected!`);
        violatingUsers.push({ user, subscriptions });
      }

      subscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.plan.name} ($${sub.plan.price}/month) - Subscription ID: ${sub.id}`);
        console.log(`      Start: ${new Date(sub.startDate).toLocaleDateString()}`);
        console.log(`      End: ${new Date(sub.endDate).toLocaleDateString()}`);
      });

      console.log('');
    });

    // 3. Summary
    console.log("=" .repeat(60));
    console.log("📊 DNS SUBSCRIPTION INVESTIGATION SUMMARY");
    console.log("=" .repeat(60));
    console.log(`Total users with DNS subscriptions: ${userSubscriptions.size}`);
    console.log(`Users with multiple active plans: ${usersWithMultiplePlans}`);
    console.log(`Total subscription violations: ${totalViolations}`);

    if (usersWithMultiplePlans > 0) {
      console.log(`\n❌ CRITICAL ISSUE: ${usersWithMultiplePlans} users have multiple active DNS plans!`);
      console.log("This violates the single-plan-per-user design and needs immediate fixing.");

      // Return violating users for cleanup
      return { violatingUsers, userSubscriptions };
    } else {
      console.log(`\n✅ No multiple subscription violations found.`);
    }

    // 4. Get all DNS plans for reference
    console.log("\n4. Available DNS Plans:");
    const allPlans = await db.select().from(dnsPlansTable).where(eq(dnsPlansTable.isActive, true));

    allPlans.forEach(plan => {
      console.log(`   - ${plan.name}: $${plan.price}/month (ID: ${plan.id})`);
    });

    return { violatingUsers: [], userSubscriptions };

  } catch (error) {
    console.error("\n❌ Error during investigation:", error);
    process.exit(1);
  }
}

async function cleanupMultipleSubscriptions() {
  console.log("\n🧹 Starting DNS subscription cleanup...\n");

  const { violatingUsers } = await investigateDnsSubscriptions();

  if (violatingUsers.length === 0) {
    console.log("✅ No cleanup needed - no multiple subscriptions found.");
    return;
  }

  console.log(`\n🔧 CLEANUP PLAN for ${violatingUsers.length} users:`);
  console.log("=" .repeat(60));

  for (const { user, subscriptions } of violatingUsers) {
    console.log(`\n👤 User: ${user.username} (ID: ${user.id})`);
    console.log(`   Current subscriptions: ${subscriptions.length}`);

    // Sort subscriptions by priority: highest price first, then by end date
    const sortedSubs = subscriptions.sort((a, b) => {
      // First priority: highest price (best plan)
      if (a.plan.price !== b.plan.price) {
        return b.plan.price - a.plan.price;
      }
      // Second priority: latest end date (most recently purchased)
      return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
    });

    const keepSubscription = sortedSubs[0];
    const cancelSubscriptions = sortedSubs.slice(1);

    console.log(`   ✅ KEEP: ${keepSubscription.plan.name} ($${keepSubscription.plan.price}/month) - ID: ${keepSubscription.id}`);
    console.log(`      End Date: ${new Date(keepSubscription.endDate).toLocaleDateString()}`);

    for (const sub of cancelSubscriptions) {
      console.log(`   ❌ CANCEL: ${sub.plan.name} ($${sub.plan.price}/month) - ID: ${sub.id}`);
      console.log(`      End Date: ${new Date(sub.endDate).toLocaleDateString()}`);
    }
  }

  console.log("\n⚠️  This cleanup will:");
  console.log("   1. Keep the highest-tier plan for each user");
  console.log("   2. Cancel all other active subscriptions");
  console.log("   3. Set cancelled subscriptions status to 'cancelled'");
  console.log("   4. No refunds will be processed (manual admin decision)");

  // For safety, don't auto-execute - require manual confirmation
  console.log("\n🚨 MANUAL ACTION REQUIRED:");
  console.log("   Review the cleanup plan above and run the fix script if approved.");
  console.log("   Script: npx tsx scripts/fix-dns-subscriptions.ts");
}

// Run the script
cleanupMultipleSubscriptions()
  .then(() => {
    console.log("\n🎉 Investigation and cleanup planning completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Investigation failed:", error);
    process.exit(1);
  });
