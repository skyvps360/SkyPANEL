#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function addDnsSubscriptionConstraint() {
  console.log("🔧 Adding DNS subscription constraint to prevent multiple active subscriptions per user...\n");

  try {
    // First, let's check if the constraint already exists
    console.log("1. Checking if constraint already exists...");
    
    const constraintCheck = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'dns_plan_subscriptions' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'unique_active_subscription_per_user'
    `);

    if (constraintCheck.length > 0) {
      console.log("✅ Constraint 'unique_active_subscription_per_user' already exists.");
      console.log("No action needed.");
      return;
    }

    console.log("2. Constraint does not exist. Creating unique constraint...");

    // Create a unique constraint on (userId, status) where status = 'active'
    // This will prevent multiple active subscriptions per user
    await db.execute(sql`
      CREATE UNIQUE INDEX unique_active_subscription_per_user
      ON dns_plan_subscriptions ("userId")
      WHERE status = 'active'
    `);

    console.log("✅ Successfully created unique constraint 'unique_active_subscription_per_user'");
    
    // Verify the constraint was created
    console.log("\n3. Verifying constraint creation...");
    
    const verifyConstraint = await db.execute(sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE tablename = 'dns_plan_subscriptions' 
      AND indexname = 'unique_active_subscription_per_user'
    `);

    if (verifyConstraint.length > 0) {
      console.log("✅ Constraint verification successful!");
      console.log("Index definition:", verifyConstraint[0].indexdef);
    } else {
      console.log("❌ Constraint verification failed!");
    }

    console.log("\n" + "=" .repeat(60));
    console.log("🎉 DNS SUBSCRIPTION CONSTRAINT ADDED SUCCESSFULLY!");
    console.log("=" .repeat(60));
    console.log("✅ Database now enforces single active DNS subscription per user");
    console.log("✅ Attempts to create multiple active subscriptions will fail at DB level");
    console.log("✅ This provides an additional safety layer beyond application logic");

  } catch (error: any) {
    console.error("\n❌ Error adding DNS subscription constraint:", error);
    
    // Check if it's a duplicate constraint error (which is actually OK)
    if (error.message && error.message.includes('already exists')) {
      console.log("✅ Constraint already exists - this is expected and OK.");
      return;
    }
    
    process.exit(1);
  }
}

// Run the script
addDnsSubscriptionConstraint()
  .then(() => {
    console.log("\n🎉 DNS subscription constraint setup completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 DNS subscription constraint setup failed:", error);
    process.exit(1);
  });
