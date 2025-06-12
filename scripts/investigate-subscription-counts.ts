import 'dotenv/config';
import { db } from '../server/db';
import { 
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable, 
  dnsPlans as dnsPlansTable,
  users as usersTable
} from '../shared/schema';
import { eq, and, sql } from 'drizzle-orm';

async function investigateSubscriptionCounts() {
  console.log("🔍 INVESTIGATING DNS PLAN SUBSCRIPTION COUNTS");
  console.log("=" .repeat(60));

  try {
    // 1. Get all users and their roles
    console.log("\n1. Checking all users and their roles...");
    const allUsers = await db.select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role
    }).from(usersTable);

    console.log(`Total users in system: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   - ${user.username} (ID: ${user.id}) - Role: ${user.role || 'user'} - ${user.email}`);
    });

    // 2. Get all DNS plan subscriptions with user details
    console.log("\n2. Checking all DNS plan subscriptions...");
    const allSubscriptions = await db.select({
      subscriptionId: dnsPlanSubscriptionsTable.id,
      userId: dnsPlanSubscriptionsTable.userId,
      planId: dnsPlanSubscriptionsTable.planId,
      status: dnsPlanSubscriptionsTable.status,
      startDate: dnsPlanSubscriptionsTable.startDate,
      endDate: dnsPlanSubscriptionsTable.endDate,
      createdAt: dnsPlanSubscriptionsTable.createdAt,
      // User details
      username: usersTable.username,
      userEmail: usersTable.email,
      userRole: usersTable.role,
      // Plan details
      planName: dnsPlansTable.name,
      planPrice: dnsPlansTable.price
    })
      .from(dnsPlanSubscriptionsTable)
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
      .orderBy(dnsPlanSubscriptionsTable.userId, dnsPlanSubscriptionsTable.createdAt);

    console.log(`Total DNS plan subscriptions: ${allSubscriptions.length}`);

    // Group by plan
    const subscriptionsByPlan = new Map();
    allSubscriptions.forEach(sub => {
      if (!subscriptionsByPlan.has(sub.planName)) {
        subscriptionsByPlan.set(sub.planName, []);
      }
      subscriptionsByPlan.get(sub.planName).push(sub);
    });

    // 3. Analyze subscriptions by plan
    console.log("\n3. Subscription breakdown by plan:");
    subscriptionsByPlan.forEach((subs, planName) => {
      console.log(`\n📋 ${planName} Plan:`);
      console.log(`   Total subscriptions: ${subs.length}`);
      
      const activeSubs = subs.filter(s => s.status === 'active');
      const adminSubs = subs.filter(s => s.userRole === 'admin');
      const clientSubs = subs.filter(s => s.userRole !== 'admin' && s.status === 'active');
      
      console.log(`   Active subscriptions: ${activeSubs.length}`);
      console.log(`   Admin subscriptions: ${adminSubs.length}`);
      console.log(`   Client subscriptions (active, non-admin): ${clientSubs.length}`);
      
      console.log(`   Subscription details:`);
      subs.forEach((sub, index) => {
        const userType = sub.userRole === 'admin' ? '[ADMIN]' : '[CLIENT]';
        console.log(`     ${index + 1}. ${userType} ${sub.username} - Status: ${sub.status} - Created: ${new Date(sub.createdAt).toLocaleDateString()}`);
      });
    });

    // 4. Current admin query simulation
    console.log("\n4. Simulating current admin query (what admin panel shows):");
    const currentAdminQuery = await db
      .select({
        planId: dnsPlansTable.id,
        planName: dnsPlansTable.name,
        subscriptionCount: sql<number>`count(${dnsPlanSubscriptionsTable.id})`.as('subscription_count'),
      })
      .from(dnsPlansTable)
      .leftJoin(dnsPlanSubscriptionsTable, eq(dnsPlansTable.id, dnsPlanSubscriptionsTable.planId))
      .groupBy(dnsPlansTable.id)
      .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.id);

    console.log("Current admin query results (what you see in admin panel):");
    currentAdminQuery.forEach(plan => {
      console.log(`   ${plan.planName}: ${plan.subscriptionCount} subscriptions`);
    });

    // 5. Corrected query (what it should show)
    console.log("\n5. Corrected query (active non-admin subscriptions only):");
    const correctedQuery = await db
      .select({
        planId: dnsPlansTable.id,
        planName: dnsPlansTable.name,
        subscriptionCount: sql<number>`count(case when ${dnsPlanSubscriptionsTable.status} = 'active' and ${usersTable.role} != 'admin' then 1 end)`.as('subscription_count'),
      })
      .from(dnsPlansTable)
      .leftJoin(dnsPlanSubscriptionsTable, eq(dnsPlansTable.id, dnsPlanSubscriptionsTable.planId))
      .leftJoin(usersTable, eq(dnsPlanSubscriptionsTable.userId, usersTable.id))
      .groupBy(dnsPlansTable.id)
      .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.id);

    console.log("Corrected query results (what admin panel should show):");
    correctedQuery.forEach(plan => {
      console.log(`   ${plan.planName}: ${plan.subscriptionCount} active client subscriptions`);
    });

    // 6. Summary
    console.log("\n6. SUMMARY:");
    console.log("=" .repeat(40));
    console.log(`Total users: ${allUsers.length}`);
    console.log(`Admin users: ${allUsers.filter(u => u.role === 'admin').length}`);
    console.log(`Client users: ${allUsers.filter(u => u.role !== 'admin').length}`);
    console.log(`Total subscriptions: ${allSubscriptions.length}`);
    console.log(`Active subscriptions: ${allSubscriptions.filter(s => s.status === 'active').length}`);
    console.log(`Admin subscriptions: ${allSubscriptions.filter(s => s.userRole === 'admin').length}`);
    console.log(`Client subscriptions (active): ${allSubscriptions.filter(s => s.userRole !== 'admin' && s.status === 'active').length}`);

  } catch (error) {
    console.error("\n❌ Error during investigation:", error);
    process.exit(1);
  }
}

// Run the script
investigateSubscriptionCounts()
  .then(() => {
    console.log("\n🎉 Investigation completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Investigation failed:", error);
    process.exit(1);
  });
