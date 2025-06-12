#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../../server/db";
import { 
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  dnsPlans as dnsPlansTable
} from "../../shared/schema";
import { eq } from "drizzle-orm";

async function checkAdminSubscriptions() {
  console.log("🔍 Checking Admin User's DNS Subscriptions...\n");

  try {
    const adminUserId = 1;

    // Get all subscriptions for admin user
    const subscriptions = await db.select({
      id: dnsPlanSubscriptionsTable.id,
      userId: dnsPlanSubscriptionsTable.userId,
      planId: dnsPlanSubscriptionsTable.planId,
      status: dnsPlanSubscriptionsTable.status,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate,
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price,
      maxDomains: dnsPlansTable.maxDomains,
      maxRecords: dnsPlansTable.maxRecords
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(dnsPlanSubscriptionsTable.userId, adminUserId));

    console.log(`Found ${subscriptions.length} subscription(s) for admin user:`);
    
    subscriptions.forEach((sub, index) => {
      console.log(`\n${index + 1}. Subscription ID: ${sub.id}`);
      console.log(`   Plan: ${sub.planName} ($${sub.planPrice}/month)`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Limits: ${sub.maxDomains} domains, ${sub.maxRecords} records`);
      console.log(`   Start: ${new Date(sub.startDate).toLocaleDateString()}`);
      console.log(`   End: ${new Date(sub.endDate).toLocaleDateString()}`);
    });

    // Check active subscriptions only
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
    console.log(`\n✅ Active subscriptions: ${activeSubscriptions.length}`);

    if (activeSubscriptions.length > 1) {
      console.log("⚠️  WARNING: Multiple active subscriptions found! This should not happen with single-plan-per-user system.");
    }

  } catch (error) {
    console.error("\n❌ Error checking admin subscriptions:", error);
    process.exit(1);
  }
}

// Run the script
checkAdminSubscriptions()
  .then(() => {
    console.log("\n🎉 Admin subscription check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Admin subscription check failed:", error);
    process.exit(1);
  });
