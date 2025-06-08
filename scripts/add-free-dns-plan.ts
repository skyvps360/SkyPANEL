#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { dnsPlans as dnsPlansTable, dnsPlanSubscriptions as dnsPlanSubscriptionsTable, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function addFreeDnsPlan() {
  console.log("🆓 Adding Free DNS Plan...\n");

  try {
    // Check if Free plan already exists
    const existingFreePlan = await db.select()
      .from(dnsPlansTable)
      .where(and(
        eq(dnsPlansTable.name, 'Free'),
        eq(dnsPlansTable.price, 0)
      ))
      .limit(1);

    let freePlan;

    if (existingFreePlan.length === 0) {
      console.log("Creating Free DNS plan...");
      
      // Create the Free DNS plan
      const [newFreePlan] = await db.insert(dnsPlansTable).values({
        name: 'Free',
        description: 'Perfect for getting started with DNS management',
        price: 0.00,
        maxDomains: 1,
        maxRecords: 10,
        features: [
          'Basic DNS management',
          'Standard DNS propagation',
          'Community support'
        ],
        isActive: true,
        displayOrder: 0 // Show first
      }).returning();

      freePlan = newFreePlan;
      console.log("✅ Free DNS plan created successfully");
    } else {
      freePlan = existingFreePlan[0];
      console.log("✅ Free DNS plan already exists");
    }

    // Get all users who don't have a Free plan subscription
    const allUsers = await db.select({ id: users.id, username: users.username })
      .from(users);

    console.log(`\nFound ${allUsers.length} users in the system`);

    let assignedCount = 0;

    for (const user of allUsers) {
      // Check if user already has a Free plan subscription
      const existingSubscription = await db.select()
        .from(dnsPlanSubscriptionsTable)
        .where(and(
          eq(dnsPlanSubscriptionsTable.userId, user.id),
          eq(dnsPlanSubscriptionsTable.planId, freePlan.id)
        ))
        .limit(1);

      if (existingSubscription.length === 0) {
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
        console.log(`   ✅ Assigned Free plan to user: ${user.username}`);
      } else {
        console.log(`   ⏭️  User ${user.username} already has Free plan`);
      }
    }

    console.log(`\n🎉 Free DNS Plan Setup Complete!`);
    console.log(`   • Plan: ${freePlan.name} ($${freePlan.price}/month)`);
    console.log(`   • Limits: ${freePlan.maxDomains} domain, ${freePlan.maxRecords} records`);
    console.log(`   • Assigned to: ${assignedCount} new users`);
    console.log(`   • Total users with Free plan: ${allUsers.length}`);

    // Update display order for other plans to ensure Free plan shows first
    await db.update(dnsPlansTable)
      .set({ displayOrder: 1 })
      .where(and(
        eq(dnsPlansTable.name, 'Basic'),
        eq(dnsPlansTable.price, 5)
      ));

    await db.update(dnsPlansTable)
      .set({ displayOrder: 2 })
      .where(and(
        eq(dnsPlansTable.name, 'Pro'),
        eq(dnsPlansTable.price, 15)
      ));

    await db.update(dnsPlansTable)
      .set({ displayOrder: 3 })
      .where(and(
        eq(dnsPlansTable.name, 'Enterprise'),
        eq(dnsPlansTable.price, 50)
      ));

    console.log("   ✅ Updated display order for all plans");

  } catch (error) {
    console.error("❌ Error adding Free DNS plan:", error);
    throw error;
  }
}

// Run the script
addFreeDnsPlan()
  .then(() => {
    console.log("\n✅ Free DNS Plan script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
