#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../../server/db";
import { dnsPlans as dnsPlansTable } from "../../shared/schema";

async function checkDnsPlans() {
  console.log("🔍 Checking DNS Plans...\n");

  try {
    const plans = await db.select().from(dnsPlansTable);
    
    console.log(`Found ${plans.length} DNS plan(s):`);
    
    plans.forEach((plan, index) => {
      console.log(`\n${index + 1}. Plan ID: ${plan.id}`);
      console.log(`   Name: ${plan.name}`);
      console.log(`   Price: $${plan.price}/month`);
      console.log(`   Max Domains: ${plan.maxDomains}`);
      console.log(`   Max Records: ${plan.maxRecords}`);
      console.log(`   Active: ${plan.isActive}`);
      console.log(`   Display Order: ${plan.displayOrder}`);
    });

  } catch (error) {
    console.error("\n❌ Error checking DNS plans:", error);
    process.exit(1);
  }
}

// Run the script
checkDnsPlans()
  .then(() => {
    console.log("\n🎉 DNS plans check completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 DNS plans check failed:", error);
    process.exit(1);
  });
