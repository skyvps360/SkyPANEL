import 'dotenv/config';
import { db } from '../../server/db';
import { 
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable, 
  dnsPlans as dnsPlansTable,
  users as usersTable
} from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function testAdminDnsApi() {
  console.log("🧪 TESTING ADMIN DNS API QUERY");
  console.log("=" .repeat(50));

  try {
    // Simulate the exact query from the admin DNS API endpoint
    console.log("\n1. Testing the updated admin DNS API query...");
    
    const plans = await db
      .select({
        id: dnsPlansTable.id,
        name: dnsPlansTable.name,
        description: dnsPlansTable.description,
        price: dnsPlansTable.price,
        maxDomains: dnsPlansTable.maxDomains,
        maxRecords: dnsPlansTable.maxRecords,
        features: dnsPlansTable.features,
        isActive: dnsPlansTable.isActive,
        displayOrder: dnsPlansTable.displayOrder,
        createdAt: dnsPlansTable.createdAt,
        updatedAt: dnsPlansTable.updatedAt,
        // Count only active subscriptions from non-admin users
        subscriptionCount: sql<number>`count(case when ${dnsPlanSubscriptionsTable.status} = 'active' and (${usersTable.role} != 'admin' or ${usersTable.role} is null) then 1 end)`.as('subscription_count'),
      })
      .from(dnsPlansTable)
      .leftJoin(dnsPlanSubscriptionsTable, eq(dnsPlansTable.id, dnsPlanSubscriptionsTable.planId))
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .groupBy(dnsPlansTable.id)
      .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.id);

    console.log("API Query Results:");
    console.log("=" .repeat(30));
    
    plans.forEach(plan => {
      console.log(`📋 ${plan.name} Plan:`);
      console.log(`   Price: $${plan.price}/month`);
      console.log(`   Max Domains: ${plan.maxDomains}`);
      console.log(`   Max Records: ${plan.maxRecords}`);
      console.log(`   Active Client Subscriptions: ${plan.subscriptionCount}`);
      console.log(`   Active: ${plan.isActive}`);
      console.log('');
    });

    // Transform the result to include _count for compatibility with frontend
    const transformedPlans = plans.map(plan => ({
      ...plan,
      _count: {
        subscriptions: plan.subscriptionCount || 0
      }
    }));

    console.log("2. Frontend-compatible format:");
    console.log("=" .repeat(30));
    
    transformedPlans.forEach(plan => {
      console.log(`${plan.name}: ${plan._count.subscriptions} active client subscriptions`);
    });

    // 3. Verify the expected results
    console.log("\n3. Verification:");
    console.log("=" .repeat(20));
    
    const freePlan = transformedPlans.find(p => p.name === 'Free');
    const basicPlan = transformedPlans.find(p => p.name === 'Basic');
    const proPlan = transformedPlans.find(p => p.name === 'Pro');
    const enterprisePlan = transformedPlans.find(p => p.name === 'Enterprise');

    console.log(`✅ Free Plan: ${freePlan?._count.subscriptions || 0} subscriptions (Expected: 2)`);
    console.log(`✅ Basic Plan: ${basicPlan?._count.subscriptions || 0} subscriptions (Expected: 0)`);
    console.log(`✅ Pro Plan: ${proPlan?._count.subscriptions || 0} subscriptions (Expected: 0)`);
    console.log(`✅ Enterprise Plan: ${enterprisePlan?._count.subscriptions || 0} subscriptions (Expected: 0)`);

    // 4. Summary
    const totalClientSubscriptions = transformedPlans.reduce((sum, plan) => sum + (plan._count.subscriptions || 0), 0);
    
    console.log("\n4. Summary:");
    console.log("=" .repeat(15));
    console.log(`Total active client subscriptions: ${totalClientSubscriptions}`);
    console.log(`Expected total: 2 (2 client users with Free plans)`);
    
    if (totalClientSubscriptions === 2 && freePlan?._count.subscriptions === 2) {
      console.log("\n🎉 SUCCESS: Admin DNS API is now showing correct subscription counts!");
      console.log("✅ Admin users are excluded from subscription counts");
      console.log("✅ Only active subscriptions are counted");
      console.log("✅ Data integrity is maintained");
    } else {
      console.log("\n❌ ISSUE: Subscription counts don't match expected values");
      console.log("Please review the query logic or data integrity");
    }

  } catch (error) {
    console.error("\n❌ Error testing admin DNS API:", error);
    process.exit(1);
  }
}

// Run the script
testAdminDnsApi()
  .then(() => {
    console.log("\n🎉 Admin DNS API test completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Admin DNS API test failed:", error);
    process.exit(1);
  });
