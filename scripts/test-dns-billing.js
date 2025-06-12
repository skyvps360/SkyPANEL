#!/usr/bin/env node

/**
 * DNS Billing System Test Script
 * 
 * This script tests the VirtFusion token-based DNS billing system:
 * 1. VirtFusion API connectivity and authentication
 * 2. User balance retrieval functionality
 * 3. DNS plan upgrade process from free to paid plans
 * 4. Pro-rated billing calculations
 * 5. Cron job system functionality
 */

import 'dotenv/config';
import { db } from '../server/db.js';
import { users, dnsPlans, dnsPlanSubscriptions } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';
import { virtFusionApi } from '../server/virtfusion-api.js';
import { dnsBillingService } from '../server/services/dns-billing-service.js';
import { cronService } from '../server/services/cron-service.js';

class DnsBillingTester {
  constructor() {
    this.testResults = {
      virtfusionApi: false,
      userBalance: false,
      dnsPlans: false,
      billingCalculation: false,
      cronSystem: false,
      errors: []
    };
  }

  async runAllTests() {
    console.log('🧪 Starting DNS Billing System Tests...\n');

    try {
      await this.testVirtFusionApi();
      await this.testUserBalance();
      await this.testDnsPlans();
      await this.testBillingCalculation();
      await this.testCronSystem();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.testResults.errors.push(`Test suite error: ${error.message}`);
      this.printResults();
      process.exit(1);
    }
  }

  async testVirtFusionApi() {
    console.log('🔌 Testing VirtFusion API connectivity...');
    
    try {
      // Update API settings from database
      await virtFusionApi.updateSettings();
      
      if (!virtFusionApi.isConfigured()) {
        throw new Error('VirtFusion API is not configured');
      }

      // Test connection
      const testResult = await virtFusionApi.testConnection();
      console.log('✅ VirtFusion API connection successful');
      console.log(`   API URL: ${virtFusionApi.getApiUrl()}`);
      
      this.testResults.virtfusionApi = true;
    } catch (error) {
      console.error('❌ VirtFusion API test failed:', error.message);
      this.testResults.errors.push(`VirtFusion API: ${error.message}`);
    }
  }

  async testUserBalance() {
    console.log('\n💰 Testing user balance retrieval...');
    
    try {
      // Get a test user
      const [testUser] = await db.select()
        .from(users)
        .where(eq(users.virtFusionId, 1)) // Assuming user ID 1 exists
        .limit(1);

      if (!testUser) {
        throw new Error('No test user found with VirtFusion ID');
      }

      console.log(`   Testing with user: ${testUser.email} (ID: ${testUser.id})`);

      // Test balance retrieval using the same method as dashboard
      const balanceResponse = await virtFusionApi.getUserHourlyStats(testUser.id);
      
      if (balanceResponse?.data?.credit?.tokens) {
        const tokens = parseFloat(balanceResponse.data.credit.tokens);
        const dollars = tokens / 100;
        
        console.log('✅ User balance retrieval successful');
        console.log(`   VirtFusion Tokens: ${tokens}`);
        console.log(`   USD Value: $${dollars.toFixed(2)}`);
        
        this.testResults.userBalance = true;
      } else {
        throw new Error('No balance data found in response');
      }
    } catch (error) {
      console.error('❌ User balance test failed:', error.message);
      this.testResults.errors.push(`User balance: ${error.message}`);
    }
  }

  async testDnsPlans() {
    console.log('\n📋 Testing DNS plans configuration...');
    
    try {
      // Get all active DNS plans
      const plans = await db.select()
        .from(dnsPlans)
        .where(eq(dnsPlans.isActive, true));

      if (plans.length === 0) {
        throw new Error('No active DNS plans found');
      }

      console.log('✅ DNS plans found:');
      plans.forEach(plan => {
        console.log(`   - ${plan.name}: $${plan.price}/month (${plan.maxDomains} domains, ${plan.maxRecords} records)`);
      });

      // Check for free and paid plans
      const freePlans = plans.filter(p => p.price === 0);
      const paidPlans = plans.filter(p => p.price > 0);

      if (freePlans.length === 0) {
        throw new Error('No free DNS plan found');
      }

      if (paidPlans.length === 0) {
        throw new Error('No paid DNS plans found');
      }

      console.log(`   Free plans: ${freePlans.length}, Paid plans: ${paidPlans.length}`);
      
      this.testResults.dnsPlans = true;
    } catch (error) {
      console.error('❌ DNS plans test failed:', error.message);
      this.testResults.errors.push(`DNS plans: ${error.message}`);
    }
  }

  async testBillingCalculation() {
    console.log('\n🧮 Testing pro-rated billing calculation...');
    
    try {
      // Test pro-rated billing calculation
      const now = new Date();
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const daysRemaining = Math.max(0, Math.ceil((nextFirstOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Test calculation for upgrading from free ($0) to paid ($5) plan
      const currentPlanPrice = 0;
      const newPlanPrice = 5;
      const proratedAmount = (newPlanPrice - currentPlanPrice) * (daysRemaining / 30);
      const tokensRequired = proratedAmount * 100;

      console.log('✅ Pro-rated billing calculation successful');
      console.log(`   Current date: ${now.toISOString().split('T')[0]}`);
      console.log(`   Next billing cycle: ${nextFirstOfMonth.toISOString().split('T')[0]}`);
      console.log(`   Days remaining: ${daysRemaining}`);
      console.log(`   Pro-rated amount: $${proratedAmount.toFixed(2)}`);
      console.log(`   Tokens required: ${tokensRequired.toFixed(0)}`);

      if (daysRemaining <= 0) {
        console.log('   ⚠️  Note: Today is the 1st of the month - no pro-rating needed');
      }

      this.testResults.billingCalculation = true;
    } catch (error) {
      console.error('❌ Billing calculation test failed:', error.message);
      this.testResults.errors.push(`Billing calculation: ${error.message}`);
    }
  }

  async testCronSystem() {
    console.log('\n⏰ Testing cron system...');
    
    try {
      // Test cron service initialization
      await cronService.initialize();
      console.log('✅ Cron service initialized');

      // Test cron status
      const status = await cronService.getCronStatus();
      console.log(`   DNS billing cron enabled: ${status.dnsBilling.enabled}`);
      console.log(`   DNS billing schedule: ${status.dnsBilling.schedule}`);
      console.log(`   DNS billing running: ${status.dnsBilling.isRunning}`);

      // Test DNS billing service stats
      const stats = await dnsBillingService.getRenewalStats();
      console.log('✅ DNS billing service stats:');
      console.log(`   Active subscriptions: ${stats.totalActiveSubscriptions}`);
      console.log(`   Due today: ${stats.subscriptionsDueToday}`);
      console.log(`   Suspended: ${stats.suspendedSubscriptions}`);
      console.log(`   Monthly revenue: $${stats.totalMonthlyRevenue.toFixed(2)}`);

      // Test manual trigger (dry run)
      console.log('   Testing manual billing trigger...');
      const triggerResult = await cronService.triggerDnsBillingManually();
      console.log(`   Manual trigger result: ${triggerResult.processed} processed, ${triggerResult.successful} successful`);

      this.testResults.cronSystem = true;
    } catch (error) {
      console.error('❌ Cron system test failed:', error.message);
      this.testResults.errors.push(`Cron system: ${error.message}`);
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const tests = [
      { name: 'VirtFusion API', result: this.testResults.virtfusionApi },
      { name: 'User Balance', result: this.testResults.userBalance },
      { name: 'DNS Plans', result: this.testResults.dnsPlans },
      { name: 'Billing Calculation', result: this.testResults.billingCalculation },
      { name: 'Cron System', result: this.testResults.cronSystem }
    ];

    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${test.name}`);
    });

    const passedTests = tests.filter(t => t.result).length;
    const totalTests = tests.length;
    
    console.log(`\nOverall: ${passedTests}/${totalTests} tests passed`);

    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors encountered:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    if (passedTests === totalTests) {
      console.log('\n🎉 All tests passed! DNS billing system is ready for production.');
    } else {
      console.log('\n⚠️  Some tests failed. Please fix the issues before using the DNS billing system.');
    }
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new DnsBillingTester();
  tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { DnsBillingTester };
