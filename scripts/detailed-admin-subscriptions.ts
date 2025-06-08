#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function getDetailedAdminSubscriptions() {
  console.log("🔍 Getting detailed admin user subscriptions...\n");

  try {
    // Get admin user subscriptions with plan details
    const adminSubscriptions = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      subscriptionStatus: dnsPlanSubscriptionsTable.status,
      planId: dnsPlansTable.id,
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate,
      createdAt: dnsPlanSubscriptionsTable.createdAt,
      updatedAt: dnsPlanSubscriptionsTable.updatedAt
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(and(
        eq(dnsPlanSubscriptionsTable.userId, 1), // admin user ID
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    console.log("Admin user active DNS subscriptions:");
    console.log("=" .repeat(60));
    
    adminSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. Subscription ID: ${sub.subscriptionId}`);
      console.log(`   Plan: ${sub.planName} (ID: ${sub.planId})`);
      console.log(`   Price: $${sub.planPrice}/month`);
      console.log(`   Status: ${sub.subscriptionStatus}`);
      console.log(`   Start Date: ${new Date(sub.startDate).toISOString()}`);
      console.log(`   End Date: ${new Date(sub.endDate).toISOString()}`);
      console.log(`   Created: ${new Date(sub.createdAt).toISOString()}`);
      console.log(`   Updated: ${new Date(sub.updatedAt).toISOString()}`);
      console.log('');
    });

    // Also get all DNS plans for reference
    console.log("All available DNS plans:");
    console.log("=" .repeat(60));
    
    const allPlans = await db.select().from(dnsPlansTable).where(eq(dnsPlansTable.isActive, true));
    
    allPlans.forEach(plan => {
      console.log(`- ${plan.name}: $${plan.price}/month (ID: ${plan.id})`);
      console.log(`  Max Domains: ${plan.maxDomains}`);
      console.log(`  Max Records: ${plan.maxRecords}`);
      console.log('');
    });

  } catch (error) {
    console.error("\n❌ Error getting admin subscriptions:", error);
    process.exit(1);
  }
}

// Run the script
getDetailedAdminSubscriptions()
  .then(() => {
    console.log("\n🎉 Detailed investigation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Investigation failed:", error);
    process.exit(1);
  });
