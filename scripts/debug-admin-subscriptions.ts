#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  users as usersTable
} from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function debugAdminSubscriptions() {
  console.log("🐛 Debugging admin user DNS subscriptions...\n");

  try {
    // 1. Check admin user directly
    console.log("1. Admin user info:");
    const [adminUser] = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 1))
      .limit(1);
    
    if (adminUser) {
      console.log(`   Found admin user: ${adminUser.username} (${adminUser.email})`);
    } else {
      console.log("   ❌ Admin user not found!");
      return;
    }

    // 2. Get ALL admin subscriptions (not just active)
    console.log("\n2. All admin DNS subscriptions (any status):");
    const allAdminSubs = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      status: dnsPlanSubscriptionsTable.status,
      planId: dnsPlansTable.id,
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(dnsPlanSubscriptionsTable.userId, 1));

    console.log(`   Found ${allAdminSubs.length} total subscriptions for admin user:`);
    allAdminSubs.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.planName} ($${sub.planPrice}/month) - Status: ${sub.status} - ID: ${sub.subscriptionId}`);
      console.log(`      Start: ${new Date(sub.startDate).toISOString()}`);
      console.log(`      End: ${new Date(sub.endDate).toISOString()}`);
    });

    // 3. Get only ACTIVE admin subscriptions
    console.log("\n3. Active admin DNS subscriptions:");
    const activeAdminSubs = allAdminSubs.filter(sub => sub.status === 'active');
    console.log(`   Found ${activeAdminSubs.length} active subscriptions:`);
    activeAdminSubs.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.planName} ($${sub.planPrice}/month) - ID: ${sub.subscriptionId}`);
    });

    // 4. Test the original query that's failing
    console.log("\n4. Testing original investigation query:");
    const originalQuery = await db.select({
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
      .where(and(
        eq(usersTable.id, 1), // Admin user only
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    console.log(`   Original query returned ${originalQuery.length} rows for admin user:`);
    originalQuery.forEach((row, index) => {
      console.log(`   ${index + 1}. User: ${row.username}, Plan: ${row.planName}, Sub ID: ${row.subscriptionId}`);
    });

    // 5. Alternative query approach
    console.log("\n5. Alternative query (subscription-first approach):");
    const altQuery = await db.select({
      userId: dnsPlanSubscriptionsTable.userId,
      subscriptionId: dnsPlanSubscriptionsTable.id,
      status: dnsPlanSubscriptionsTable.status,
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price,
      username: usersTable.username
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .where(and(
        eq(dnsPlanSubscriptionsTable.userId, 1),
        eq(dnsPlanSubscriptionsTable.status, 'active')
      ));

    console.log(`   Alternative query returned ${altQuery.length} rows for admin user:`);
    altQuery.forEach((row, index) => {
      console.log(`   ${index + 1}. User: ${row.username}, Plan: ${row.planName}, Sub ID: ${row.subscriptionId}`);
    });

  } catch (error) {
    console.error("\n❌ Error during debug:", error);
    process.exit(1);
  }
}

// Run the script
debugAdminSubscriptions()
  .then(() => {
    console.log("\n🎉 Debug completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Debug failed:", error);
    process.exit(1);
  });
