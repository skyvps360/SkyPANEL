#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function assignFreeDnsPlans() {
  console.log("🚀 Starting Free DNS Plan Assignment...\n");

  try {
    // 1. Check if Free plan exists, create if not
    console.log("1. Checking for Free DNS plan...");
    
    let freePlans = await db.select()
      .from(dnsPlansTable)
      .where(and(
        eq(dnsPlansTable.name, 'Free'),
        eq(dnsPlansTable.price, 0)
      ))
      .limit(1);

    let freePlan;
    if (freePlans.length === 0) {
      console.log("   Creating Free DNS plan...");
      const createdPlans = await db.insert(dnsPlansTable).values({
        name: 'Free',
        description: 'Free DNS plan with basic features',
        price: 0,
        maxDomains: 1,
        maxRecords: 10,
        features: ['1 Domain', '10 DNS Records', 'Basic Support'],
        isActive: true,
        displayOrder: 0
      }).returning();
      
      freePlan = createdPlans[0];
      console.log(`   ✅ Created Free plan with ID: ${freePlan.id}`);
    } else {
      freePlan = freePlans[0];
      console.log(`   ✅ Found existing Free plan with ID: ${freePlan.id}`);
    }

    // 2. Get all users
    console.log("\n2. Fetching all users...");
    const allUsers = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email
    }).from(usersTable);
    
    console.log(`   Found ${allUsers.length} users`);

    // 3. Check which users already have DNS plan subscriptions
    console.log("\n3. Checking existing DNS plan subscriptions...");
    const existingSubscriptions = await db.select({
      userId: dnsPlanSubscriptionsTable.userId
    }).from(dnsPlanSubscriptionsTable)
      .where(eq(dnsPlanSubscriptionsTable.status, 'active'));

    const usersWithSubscriptions = new Set(existingSubscriptions.map(sub => sub.userId));
    console.log(`   Found ${usersWithSubscriptions.size} users with existing active subscriptions`);

    // 4. Assign Free plan to users without any DNS plan subscription
    console.log("\n4. Assigning Free plan to users without subscriptions...");
    let assignedCount = 0;
    let skippedCount = 0;

    for (const user of allUsers) {
      if (usersWithSubscriptions.has(user.id)) {
        console.log(`   ⏭️  User ${user.username} already has an active DNS plan subscription`);
        skippedCount++;
        continue;
      }

      // Create Free plan subscription for user
      const now = new Date();
      const endDate = new Date('2099-12-31'); // Never expires for free plan
      
      await db.insert(dnsPlanSubscriptionsTable).values({
        userId: user.id,
        planId: freePlan.id,
        status: 'active',
        startDate: now,
        endDate: endDate,
        autoRenew: false, // Free plan doesn't need renewal
        lastPaymentDate: now,
        nextPaymentDate: endDate // Set to far future
      });

      assignedCount++;
      console.log(`   ✅ Assigned Free plan to user: ${user.username} (${user.email})`);
    }

    // 5. Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 FREE DNS PLAN ASSIGNMENT SUMMARY");
    console.log("=".repeat(50));
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Users with existing subscriptions: ${skippedCount}`);
    console.log(`Users assigned Free plan: ${assignedCount}`);
    console.log(`Free plan ID: ${freePlan.id}`);
    
    if (assignedCount > 0) {
      console.log("\n✅ Free DNS plan assignment completed successfully!");
      console.log("All users now have at least one DNS plan subscription.");
    } else {
      console.log("\n✅ No new assignments needed - all users already have DNS plan subscriptions.");
    }

  } catch (error) {
    console.error("\n❌ Error during Free DNS plan assignment:", error);
    process.exit(1);
  }
}

// Run the script
assignFreeDnsPlans()
  .then(() => {
    console.log("\n🎉 Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Script failed:", error);
    process.exit(1);
  });
