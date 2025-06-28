#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from '../server/db';
import { slaPlans } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function addDefaultSlaPlans() {
  console.log("🚀 Starting default SLA plans migration...\n");

  try {
    // Define the default SLA plans
    const defaultPlans = [
      {
        name: 'Bronze',
        description: 'Basic service level with standard support response times and 99.0% uptime guarantee. Suitable for development and testing environments.',
        response_time_hours: 24,
        resolution_time_hours: 72,
        uptime_guarantee_percentage: 99.0
      },
      {
        name: 'Silver',
        description: 'Enhanced service level with faster support response times and 99.5% uptime guarantee. Perfect for production workloads with moderate availability requirements.',
        response_time_hours: 8,
        resolution_time_hours: 24,
        uptime_guarantee_percentage: 99.5
      },
      {
        name: 'Gold',
        description: 'Premium service level with priority support and 99.9% uptime guarantee. Ideal for mission-critical applications requiring maximum availability.',
        response_time_hours: 2,
        resolution_time_hours: 8,
        uptime_guarantee_percentage: 99.9
      }
    ];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    // Check and create each plan individually
    for (const plan of defaultPlans) {
      console.log(`🔍 Checking if ${plan.name} SLA plan exists...`);
      
      // Use proper Drizzle ORM syntax to check for existing plan
      const existingPlan = await db.select()
        .from(slaPlans)
        .where(eq(slaPlans.name, plan.name))
        .limit(1);
      
      if (existingPlan.length > 0) {
        console.log(`   ⚠️  ${plan.name} SLA plan already exists, skipping...`);
        skippedCount++;
        continue;
      }
      
      console.log(`   ✨ Creating ${plan.name} SLA plan...`);
      
      // Use proper Drizzle ORM syntax to insert new plan
      await db.insert(slaPlans).values({
        name: plan.name,
        description: plan.description,
        response_time_hours: plan.response_time_hours,
        resolution_time_hours: plan.resolution_time_hours,
        uptime_guarantee_percentage: plan.uptime_guarantee_percentage,
        is_active: true
      });
      
      createdCount++;
      console.log(`   ✅ ${plan.name} SLA plan created successfully!`);
    }
    
    // Show summary
    console.log('\n📊 Migration Summary:');
    console.log(`   - Created: ${createdCount} SLA plans`);
    console.log(`   - Skipped: ${skippedCount} SLA plans (already existed)`);
    
    // Verify all plans exist using proper Drizzle ORM syntax
    console.log('\n🔍 Verifying all SLA plans...');
    const allPlans = await db.select({
      name: slaPlans.name,
      response_time_hours: slaPlans.response_time_hours,
      resolution_time_hours: slaPlans.resolution_time_hours,
      uptime_guarantee_percentage: slaPlans.uptime_guarantee_percentage
    })
    .from(slaPlans)
    .orderBy(slaPlans.uptime_guarantee_percentage);
    
    console.log('📋 Current SLA plans in database:');
    allPlans.forEach((plan) => {
      console.log(`   - ${plan.name}: ${plan.uptime_guarantee_percentage}% uptime, ${plan.response_time_hours}h response, ${plan.resolution_time_hours}h resolution`);
    });
    
    console.log('\n🎉 Default SLA plans migration completed successfully!');
    
  } catch (error) {
    console.error("❌ Error adding default SLA plans:", error);
    throw error;
  }
}

// Run the script
addDefaultSlaPlans()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });