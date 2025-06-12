#!/usr/bin/env tsx

import 'dotenv/config';

async function testDnsLimits() {
  console.log("🧪 Testing DNS Plan Limits...\n");

  try {
    console.log("1. Manual limit calculation test...");
    
    // Import database modules
    const dbModule = await import("../server/db");
    const db = dbModule.db;
    const schemaModule = await import("../shared/schema");
    const dnsPlansTable = schemaModule.dnsPlans;
    const dnsPlanSubscriptionsTable = schemaModule.dnsPlanSubscriptions;
    const dnsDomainsTable = schemaModule.dnsDomains;
    const drizzleModule = await import("drizzle-orm");
    const { eq, and, sql } = drizzleModule;

    const adminUserId = 1;

    // Get admin user's active DNS plan
    const activeSubscriptions = await db.select({
      planId: dnsPlanSubscriptionsTable.planId,
      plan: {
        id: dnsPlansTable.id,
        name: dnsPlansTable.name,
        maxDomains: dnsPlansTable.maxDomains,
        maxRecords: dnsPlansTable.maxRecords
      }
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(and(
        eq(dnsPlanSubscriptionsTable.userId, adminUserId),
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    console.log(`   Admin user active subscriptions: ${activeSubscriptions.length}`);
    
    if (activeSubscriptions.length > 0) {
      const plan = activeSubscriptions[0].plan;
      console.log(`   Plan: ${plan?.name}`);
      console.log(`   Max Domains: ${plan?.maxDomains}`);
      console.log(`   Max Records: ${plan?.maxRecords}`);

      // Get current domain count
      const domainCount = await db.select({ count: sql<number>`count(*)` })
        .from(dnsDomainsTable)
        .where(eq(dnsDomainsTable.userId, adminUserId));

      const currentDomains = domainCount[0]?.count || 0;
      console.log(`   Current Domains: ${currentDomains}`);
      console.log(`   Can Add Domain: ${currentDomains < (plan?.maxDomains || 0)}`);

      // Calculate limits
      const limits = {
        maxDomains: plan?.maxDomains || 0,
        maxRecords: plan?.maxRecords || 0
      };

      const usage = {
        domains: currentDomains
      };

      const canAddDomain = activeSubscriptions.length === 0 || currentDomains < limits.maxDomains;

      console.log("\n   Calculated limits:");
      console.log(`   - Max Domains: ${limits.maxDomains}`);
      console.log(`   - Max Records: ${limits.maxRecords}`);
      console.log(`   - Current Domains: ${usage.domains}`);
      console.log(`   - Can Add Domain: ${canAddDomain}`);

    } else {
      console.log("   ❌ No active DNS plan found for admin user");
    }

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 DNS LIMITS TEST COMPLETED!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("\n❌ Error testing DNS limits:", error);
    process.exit(1);
  }
}

// Run the script
testDnsLimits()
  .then(() => {
    console.log("\n🎉 DNS limits test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 DNS limits test failed:", error);
    process.exit(1);
  });
