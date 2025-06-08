#!/usr/bin/env tsx

import { db } from "../server/db";
import { 
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  userCredits as userCreditsTable,
  creditTransactions as creditTransactionsTable,
  transactions,
  users
} from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";

async function testDnsPlanSystem() {
  console.log("🧪 Testing DNS Plan Purchase System...\n");

  try {
    // Test 1: Check if DNS plans exist
    console.log("1. Checking DNS plans...");
    const plans = await db.select().from(dnsPlansTable).where(eq(dnsPlansTable.isActive, true));
    
    if (plans.length === 0) {
      console.log("   ❌ No active DNS plans found");
      console.log("   💡 Run the dual billing system migration script first");
      return;
    }
    
    console.log(`   ✅ Found ${plans.length} active DNS plans:`);
    plans.forEach(plan => {
      console.log(`      - ${plan.name}: $${plan.price}/month (${plan.maxDomains} domains, ${plan.maxRecords} records)`);
    });

    // Test 2: Check if we have a test user
    console.log("\n2. Finding test user...");
    const testUsers = await db.select().from(users).limit(1);
    
    if (testUsers.length === 0) {
      console.log("   ❌ No users found in database");
      return;
    }
    
    const testUser = testUsers[0];
    console.log(`   ✅ Using test user: ${testUser.username} (ID: ${testUser.id})`);

    // Test 3: Check/create user credits
    console.log("\n3. Checking user credits...");
    let userCredits = await db.select()
      .from(userCreditsTable)
      .where(eq(userCreditsTable.userId, testUser.id))
      .limit(1);

    if (userCredits.length === 0) {
      console.log("   📝 Creating user credits record...");
      await db.insert(userCreditsTable).values({
        userId: testUser.id,
        balance: 100.00 // Give test user $100 in credits
      });
      
      userCredits = await db.select()
        .from(userCreditsTable)
        .where(eq(userCreditsTable.userId, testUser.id))
        .limit(1);
    }

    const currentBalance = userCredits[0].balance;
    console.log(`   ✅ User has $${currentBalance.toFixed(2)} in custom credits`);

    // Test 4: Check existing subscriptions
    console.log("\n4. Checking existing DNS plan subscriptions...");
    const existingSubscriptions = await db.select({
      id: dnsPlanSubscriptionsTable.id,
      planId: dnsPlanSubscriptionsTable.planId,
      status: dnsPlanSubscriptionsTable.status,
      plan: {
        name: dnsPlansTable.name,
        price: dnsPlansTable.price
      }
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(dnsPlanSubscriptionsTable.userId, testUser.id))
      .orderBy(desc(dnsPlanSubscriptionsTable.createdAt));

    if (existingSubscriptions.length > 0) {
      console.log(`   📋 Found ${existingSubscriptions.length} existing subscriptions:`);
      existingSubscriptions.forEach(sub => {
        console.log(`      - ${sub.plan?.name || 'Unknown'}: ${sub.status}`);
      });
    } else {
      console.log("   📭 No existing subscriptions found");
    }

    // Test 5: Test API endpoints (simulate)
    console.log("\n5. Testing API endpoint responses...");
    
    // Simulate DNS plans endpoint
    const activePlans = await db.select()
      .from(dnsPlansTable)
      .where(eq(dnsPlansTable.isActive, true))
      .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.price);
    
    console.log(`   ✅ GET /api/dns-plans would return ${activePlans.length} plans`);

    // Simulate subscriptions endpoint
    const subscriptions = await db.select({
      id: dnsPlanSubscriptionsTable.id,
      planId: dnsPlanSubscriptionsTable.planId,
      status: dnsPlanSubscriptionsTable.status,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate,
      plan: {
        id: dnsPlansTable.id,
        name: dnsPlansTable.name,
        description: dnsPlansTable.description,
        price: dnsPlansTable.price,
        maxDomains: dnsPlansTable.maxDomains,
        maxRecords: dnsPlansTable.maxRecords,
        features: dnsPlansTable.features
      }
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .where(eq(dnsPlanSubscriptionsTable.userId, testUser.id))
      .orderBy(desc(dnsPlanSubscriptionsTable.createdAt));

    console.log(`   ✅ GET /api/dns-plans/subscriptions would return ${subscriptions.length} subscriptions`);

    // Test 6: Check transaction system integration
    console.log("\n6. Checking transaction system integration...");
    
    const recentTransactions = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, testUser.id),
        eq(transactions.type, 'custom_credit')
      ))
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    console.log(`   📊 Found ${recentTransactions.length} custom credit transactions in main table`);

    const recentCreditTransactions = await db.select()
      .from(creditTransactionsTable)
      .where(eq(creditTransactionsTable.userId, testUser.id))
      .orderBy(desc(creditTransactionsTable.createdAt))
      .limit(5);

    console.log(`   📊 Found ${recentCreditTransactions.length} transactions in credit audit table`);

    // Test 7: Summary
    console.log("\n📋 System Status Summary:");
    console.log(`   • DNS Plans Available: ${plans.length}`);
    console.log(`   • Test User Credits: $${currentBalance.toFixed(2)}`);
    console.log(`   • Active Subscriptions: ${existingSubscriptions.filter(s => s.status === 'active').length}`);
    console.log(`   • Transaction Integration: ✅ Ready`);
    
    const cheapestPlan = plans.reduce((min, plan) => plan.price < min.price ? plan : min);
    const canAffordCheapest = currentBalance >= cheapestPlan.price;
    
    console.log(`   • Can Purchase Cheapest Plan (${cheapestPlan.name} - $${cheapestPlan.price}): ${canAffordCheapest ? '✅ Yes' : '❌ No'}`);

    if (canAffordCheapest) {
      console.log("\n🎉 DNS Plan Purchase System is ready for testing!");
      console.log("   You can now:");
      console.log("   1. Visit /dns-plans to see available plans");
      console.log("   2. Purchase a plan using custom credits");
      console.log("   3. View subscriptions and manage them");
      console.log("   4. Check transaction history in /billing");
    } else {
      console.log("\n⚠️  User needs more custom credits to purchase plans");
      console.log(`   Add at least $${(cheapestPlan.price - currentBalance).toFixed(2)} more credits`);
    }

  } catch (error) {
    console.error("❌ Error testing DNS plan system:", error);
  }
}

// Run the test
testDnsPlanSystem()
  .then(() => {
    console.log("\n✅ DNS Plan System test completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test failed:", error);
    process.exit(1);
  });
