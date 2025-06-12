#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../shared/schema";
import { eq, and, inArray } from "drizzle-orm";

async function fixDnsSubscriptions() {
  console.log("🔧 DNS Subscription Fix Script");
  console.log("=" .repeat(60));
  console.log("This script will fix users with multiple active DNS subscriptions");
  console.log("by keeping the highest-tier plan and cancelling others.\n");

  try {
    // 1. Find users with multiple active subscriptions
    const usersWithSubscriptions = await db.select({
      userId: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      subscriptionId: dnsPlanSubscriptionsTable.id,
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
          planId: row.planId,
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

    // 2. Identify users with multiple subscriptions
    const violatingUsers = [];
    userSubscriptions.forEach((userData) => {
      if (userData.subscriptions.length > 1) {
        violatingUsers.push(userData);
      }
    });

    if (violatingUsers.length === 0) {
      console.log("✅ No users with multiple active subscriptions found.");
      console.log("The DNS subscription system is already compliant!");
      return;
    }

    console.log(`Found ${violatingUsers.length} users with multiple active subscriptions.\n`);

    // 3. Process each violating user
    let totalFixed = 0;
    let totalCancelled = 0;

    for (const { user, subscriptions } of violatingUsers) {
      console.log(`\n🔧 Fixing user: ${user.username} (ID: ${user.id})`);
      console.log(`   Current active subscriptions: ${subscriptions.length}`);
      
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
      
      console.log(`   ✅ Keeping: ${keepSubscription.plan.name} ($${keepSubscription.plan.price}/month) - ID: ${keepSubscription.id}`);
      
      if (cancelSubscriptions.length > 0) {
        const cancelIds = cancelSubscriptions.map(sub => sub.id);
        
        console.log(`   ❌ Cancelling ${cancelSubscriptions.length} subscriptions:`);
        cancelSubscriptions.forEach(sub => {
          console.log(`      - ${sub.plan.name} ($${sub.plan.price}/month) - ID: ${sub.id}`);
        });
        
        // Cancel the subscriptions in database
        await db.update(dnsPlanSubscriptionsTable)
          .set({ 
            status: 'cancelled',
            updatedAt: new Date()
          })
          .where(inArray(dnsPlanSubscriptionsTable.id, cancelIds));
        
        totalCancelled += cancelSubscriptions.length;
        console.log(`   ✅ Successfully cancelled ${cancelSubscriptions.length} subscriptions`);
      }
      
      totalFixed++;
    }

    // 4. Verification
    console.log("\n" + "=" .repeat(60));
    console.log("🎉 DNS SUBSCRIPTION FIX COMPLETED!");
    console.log("=" .repeat(60));
    console.log(`Users fixed: ${totalFixed}`);
    console.log(`Subscriptions cancelled: ${totalCancelled}`);
    
    // Verify the fix worked
    console.log("\n🔍 Verifying fix...");
    const remainingViolations = await db.select({
      userId: dnsPlanSubscriptionsTable.userId,
      count: dnsPlanSubscriptionsTable.id
    })
      .from(dnsPlanSubscriptionsTable)
      .where(eq(dnsPlanSubscriptionsTable.status, 'active'));
    
    const userCounts = new Map();
    remainingViolations.forEach(row => {
      userCounts.set(row.userId, (userCounts.get(row.userId) || 0) + 1);
    });
    
    const stillViolating = Array.from(userCounts.entries()).filter(([_, count]) => count > 1);
    
    if (stillViolating.length === 0) {
      console.log("✅ Verification successful! All users now have at most 1 active DNS subscription.");
    } else {
      console.log(`❌ Verification failed! ${stillViolating.length} users still have multiple subscriptions.`);
      stillViolating.forEach(([userId, count]) => {
        console.log(`   User ID ${userId}: ${count} active subscriptions`);
      });
    }

  } catch (error) {
    console.error("\n❌ Error during DNS subscription fix:", error);
    process.exit(1);
  }
}

// Run the script
fixDnsSubscriptions()
  .then(() => {
    console.log("\n🎉 DNS subscription fix completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 DNS subscription fix failed:", error);
    process.exit(1);
  });
