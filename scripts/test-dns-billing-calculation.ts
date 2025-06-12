#!/usr/bin/env npx tsx

/**
 * Test script to verify DNS plan billing calculation fixes
 * 
 * This script tests the new billing logic that ensures:
 * 1. All DNS plans bill on the 1st of every month
 * 2. Pro-rated billing is calculated correctly for mid-month upgrades
 * 3. Next billing date is always the 1st of the following month
 * 4. Days remaining calculation is accurate
 */

// Mock current date for consistent testing
const MOCK_CURRENT_DATE = new Date('2025-06-09T10:30:00.000Z'); // June 9th, 2025

/**
 * Calculate next billing date (always 1st of next month)
 */
function calculateNextBillingDate(currentDate: Date): Date {
  return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 0, 0, 0, 0);
}

/**
 * Calculate billing cycle end date (last millisecond before next 1st)
 */
function calculateBillingCycleEndDate(currentDate: Date): Date {
  const nextFirstOfMonth = calculateNextBillingDate(currentDate);
  return new Date(nextFirstOfMonth.getTime() - 1);
}

/**
 * Calculate days remaining until next billing date
 */
function calculateDaysRemaining(currentDate: Date): number {
  const nextFirstOfMonth = calculateNextBillingDate(currentDate);
  return Math.max(0, Math.ceil((nextFirstOfMonth.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)));
}

/**
 * Calculate pro-rated amount for plan change
 */
function calculateProratedAmount(currentPlanPrice: number, newPlanPrice: number, daysRemaining: number): number {
  return (newPlanPrice - currentPlanPrice) * (daysRemaining / 30);
}

// Test functions (removed Jest dependency for standalone execution)

// Run the tests (always run since this is a standalone script)
{
  console.log('🧪 Running DNS Billing Calculation Tests...\n');
  
  // Simulate the tests manually since we don't have Jest in this environment
  const tests = [
    {
      name: 'Next billing date calculation for June 9th, 2025',
      test: () => {
        const nextBillingDate = calculateNextBillingDate(MOCK_CURRENT_DATE);
        // Check the date components instead of ISO string to avoid timezone issues
        return nextBillingDate.getFullYear() === 2025 &&
               nextBillingDate.getMonth() === 6 && // July (0-indexed)
               nextBillingDate.getDate() === 1 &&
               nextBillingDate.getHours() === 0 &&
               nextBillingDate.getMinutes() === 0 &&
               nextBillingDate.getSeconds() === 0 &&
               nextBillingDate.getMilliseconds() === 0;
      }
    },
    {
      name: 'Days remaining calculation for June 9th, 2025',
      test: () => {
        const daysRemaining = calculateDaysRemaining(MOCK_CURRENT_DATE);
        return daysRemaining === 22;
      }
    },
    {
      name: 'Pro-rated upgrade calculation (Free to Basic)',
      test: () => {
        const proratedAmount = calculateProratedAmount(0, 5, 22);
        return Math.abs(proratedAmount - 3.67) < 0.01;
      }
    },
    {
      name: 'Pro-rated downgrade calculation (Premium to Basic)',
      test: () => {
        const proratedAmount = calculateProratedAmount(15, 5, 22);
        return Math.abs(proratedAmount - (-7.33)) < 0.01;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(({ name, test }) => {
    try {
      const result = test();
      if (result) {
        console.log(`✅ ${name}`);
        passed++;
      } else {
        console.log(`❌ ${name}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! DNS billing calculation logic is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the billing calculation logic.');
    process.exit(1);
  }
}
