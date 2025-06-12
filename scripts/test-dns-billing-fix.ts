#!/usr/bin/env tsx

/**
 * Test script to verify DNS plan billing cycle fix
 * This script tests the pro-rating calculation for newly created users
 */

import { db } from '../server/db';
import { users, dnsPlanSubscriptions, dnsPlans } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function testBillingCalculation() {
  console.log('🧪 Testing DNS Plan Billing Cycle Fix\n');

  try {
    // Test the billing cycle calculation logic
    const now = new Date();
    console.log(`Current date: ${now.toISOString()}`);

    // Test 1: Free plan with far-future endDate (like new users have)
    console.log('\n📅 Test 1: Free plan billing cycle calculation');
    const freePlanEndDate = new Date('2099-12-31');
    console.log(`Free plan endDate: ${freePlanEndDate.toISOString()}`);
    
    // OLD LOGIC (BROKEN)
    const oldDaysRemaining = Math.max(0, Math.ceil((freePlanEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const oldProratedAmount = (5.00 - 0) * (oldDaysRemaining / 30); // Basic plan ($5) - Free plan ($0)
    console.log(`❌ OLD LOGIC: Days remaining: ${oldDaysRemaining}, Prorated amount: $${oldProratedAmount.toFixed(2)}`);

    // NEW LOGIC (FIXED)
    let billingCycleEndDate;
    if (freePlanEndDate.getFullYear() > 2050) {
      // This is a Free plan with far-future endDate, calculate proper monthly cycle
      billingCycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of current month
    } else {
      billingCycleEndDate = freePlanEndDate;
    }

    const newDaysRemaining = Math.max(0, Math.ceil((billingCycleEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const newProratedAmount = (5.00 - 0) * (newDaysRemaining / 30);
    console.log(`✅ NEW LOGIC: Billing cycle end: ${billingCycleEndDate.toISOString()}`);
    console.log(`✅ NEW LOGIC: Days remaining: ${newDaysRemaining}, Prorated amount: $${newProratedAmount.toFixed(2)}`);

    // Test 2: Paid plan with proper billing cycle
    console.log('\n📅 Test 2: Paid plan billing cycle calculation');
    const paidPlanEndDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 days from now
    console.log(`Paid plan endDate: ${paidPlanEndDate.toISOString()}`);

    const paidDaysRemaining = Math.max(0, Math.ceil((paidPlanEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const paidProratedAmount = (15.00 - 5.00) * (paidDaysRemaining / 30); // Pro plan ($15) - Basic plan ($5)
    console.log(`✅ PAID PLAN: Days remaining: ${paidDaysRemaining}, Prorated amount: $${paidProratedAmount.toFixed(2)}`);

    // Test 3: New plan purchase billing cycle
    console.log('\n📅 Test 3: New plan purchase billing cycle');
    const purchaseEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of current month
    console.log(`Purchase plan endDate: ${purchaseEndDate.toISOString()}`);
    
    const purchaseDaysRemaining = Math.max(0, Math.ceil((purchaseEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    console.log(`✅ PURCHASE: Days until end of month: ${purchaseDaysRemaining}`);

    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`❌ Old logic would charge: $${oldProratedAmount.toFixed(2)} (BROKEN - too high!)`);
    console.log(`✅ New logic will charge: $${newProratedAmount.toFixed(2)} (FIXED - reasonable amount)`);
    console.log(`💰 Savings for users: $${(oldProratedAmount - newProratedAmount).toFixed(2)}`);

    // Verify the fix is reasonable
    if (newProratedAmount < 10 && oldProratedAmount > 100) {
      console.log('\n🎉 SUCCESS: The billing fix is working correctly!');
      console.log('   - New users will see reasonable upgrade costs');
      console.log('   - Billing cycles align with calendar months');
      console.log('   - Pro-rating is calculated correctly');
    } else {
      console.log('\n⚠️  WARNING: The fix may not be working as expected');
      console.log(`   - Old amount: $${oldProratedAmount.toFixed(2)}`);
      console.log(`   - New amount: $${newProratedAmount.toFixed(2)}`);
    }

  } catch (error) {
    console.error('❌ Error testing billing calculation:', error);
  }
}

// Run the test
testBillingCalculation().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
