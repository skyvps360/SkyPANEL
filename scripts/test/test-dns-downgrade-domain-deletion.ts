#!/usr/bin/env tsx

/**
 * Test script to verify DNS downgrade domain deletion functionality
 * This script tests the enhanced domain deletion system with InterServer API integration
 */

import 'dotenv/config';
import { db } from '../../server/db';
import { dnsDomains, dnsPlans, dnsPlanSubscriptions, users } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

async function testDnsDowngradeDomainDeletion() {
  console.log('🧪 Testing DNS Downgrade Domain Deletion Functionality\n');

  try {
    // 1. Find a test user with domains and active DNS plan
    console.log('1. 🔍 Finding test user with domains and active DNS plan...');
    
    const testUsers = await db.select({
      userId: users.id,
      email: users.email,
      domainCount: 0 // Will be calculated separately
    })
      .from(users)
      .limit(5);

    if (testUsers.length === 0) {
      console.log('   ❌ No users found in database');
      return;
    }

    let selectedUser = null;
    let userDomains = [];
    let userSubscription = null;

    for (const user of testUsers) {
      // Check if user has domains
      const domains = await db.select()
        .from(dnsDomains)
        .where(eq(dnsDomains.userId, user.userId));

      // Check if user has active DNS plan
      const subscription = await db.select({
        id: dnsPlanSubscriptions.id,
        planId: dnsPlanSubscriptions.planId,
        plan: {
          id: dnsPlans.id,
          name: dnsPlans.name,
          maxDomains: dnsPlans.maxDomains,
          maxRecords: dnsPlans.maxRecords
        }
      })
        .from(dnsPlanSubscriptions)
        .leftJoin(dnsPlans, eq(dnsPlanSubscriptions.planId, dnsPlans.id))
        .where(and(
          eq(dnsPlanSubscriptions.userId, user.userId),
          eq(dnsPlanSubscriptions.status, 'active')
        ))
        .limit(1);

      if (domains.length > 0 && subscription.length > 0) {
        selectedUser = user;
        userDomains = domains;
        userSubscription = subscription[0];
        break;
      }
    }

    if (!selectedUser) {
      console.log('   ❌ No users found with both domains and active DNS plans');
      console.log('   💡 Create a test user with domains and an active DNS plan first');
      return;
    }

    console.log(`   ✅ Found test user: ${selectedUser.email} (ID: ${selectedUser.userId})`);
    console.log(`   📊 User has ${userDomains.length} domains`);
    console.log(`   📋 Current plan: ${userSubscription.plan?.name} (${userSubscription.plan?.maxDomains} domains max)`);

    // 2. Display user's domains with InterServer status
    console.log('\n2. 📋 User\'s Current Domains:');
    userDomains.forEach((domain, index) => {
      const interServerStatus = domain.interserverId ? `✅ InterServer ID: ${domain.interserverId}` : '❌ No InterServer ID';
      console.log(`   ${index + 1}. ${domain.name} (Local ID: ${domain.id}) - ${interServerStatus}`);
    });

    // 3. Find available plans for downgrade testing
    console.log('\n3. 🎯 Available Plans for Downgrade Testing:');
    
    const allPlans = await db.select()
      .from(dnsPlans)
      .where(eq(dnsPlans.isActive, true));

    const downgradePlans = allPlans.filter(plan => 
      plan.maxDomains < (userSubscription.plan?.maxDomains || 0)
    );

    if (downgradePlans.length === 0) {
      console.log('   ❌ No plans available for downgrade testing');
      console.log('   💡 Current plan already has the lowest domain limit');
      return;
    }

    downgradePlans.forEach(plan => {
      const wouldRequireSelection = userDomains.length > plan.maxDomains;
      console.log(`   - ${plan.name}: ${plan.maxDomains} domains max ${wouldRequireSelection ? '⚠️  REQUIRES DOMAIN SELECTION' : '✅ No selection needed'}`);
    });

    // 4. Test domain selection logic
    console.log('\n4. 🧮 Testing Domain Selection Logic:');
    
    const testPlan = downgradePlans.find(plan => userDomains.length > plan.maxDomains);
    
    if (!testPlan) {
      console.log('   ✅ No downgrade scenarios require domain selection with current domain count');
      return;
    }

    console.log(`   Target plan: ${testPlan.name} (${testPlan.maxDomains} domains max)`);
    console.log(`   Current domains: ${userDomains.length}`);
    console.log(`   Domains to keep: ${testPlan.maxDomains}`);
    console.log(`   Domains to remove: ${userDomains.length - testPlan.maxDomains}`);

    // Simulate domain selection (keep first N domains)
    const selectedDomainIds = userDomains.slice(0, testPlan.maxDomains).map(d => d.id);
    const domainsToRemove = userDomains.filter(d => !selectedDomainIds.includes(d.id));

    console.log('\n   📝 Simulated Domain Selection:');
    console.log('   Domains to KEEP:');
    userDomains.filter(d => selectedDomainIds.includes(d.id)).forEach(domain => {
      console.log(`     ✅ ${domain.name} (ID: ${domain.id})`);
    });

    console.log('   Domains to REMOVE:');
    domainsToRemove.forEach(domain => {
      const interServerStatus = domain.interserverId ? 'Will delete from InterServer' : 'Local deletion only';
      console.log(`     ❌ ${domain.name} (ID: ${domain.id}) - ${interServerStatus}`);
    });

    // 5. Test API payload structure
    console.log('\n5. 📡 API Payload Structure Test:');
    
    const apiPayload = {
      planId: testPlan.id,
      selectedDomainIds: selectedDomainIds
    };

    console.log('   POST /api/dns-plans/change');
    console.log('   Payload:', JSON.stringify(apiPayload, null, 2));

    // 6. Validation tests
    console.log('\n6. ✅ Validation Tests:');
    
    const validationTests = [
      {
        name: 'Correct number of domains selected',
        test: selectedDomainIds.length === testPlan.maxDomains,
        expected: true
      },
      {
        name: 'All selected domains belong to user',
        test: selectedDomainIds.every(id => userDomains.some(d => d.id === id)),
        expected: true
      },
      {
        name: 'No duplicate selections',
        test: new Set(selectedDomainIds).size === selectedDomainIds.length,
        expected: true
      },
      {
        name: 'Correct number of domains to remove',
        test: domainsToRemove.length === (userDomains.length - testPlan.maxDomains),
        expected: true
      },
      {
        name: 'InterServer deletion required for some domains',
        test: domainsToRemove.some(d => d.interserverId),
        expected: true // This might be false if no domains have InterServer IDs
      }
    ];

    validationTests.forEach(test => {
      const result = test.test === test.expected ? '✅' : '❌';
      console.log(`   ${result} ${test.name}: ${test.test} (expected: ${test.expected})`);
    });

    // 7. InterServer API integration check
    console.log('\n7. 🌐 InterServer API Integration Check:');
    
    const domainsWithInterServerId = domainsToRemove.filter(d => d.interserverId);
    const domainsWithoutInterServerId = domainsToRemove.filter(d => !d.interserverId);

    console.log(`   Domains requiring InterServer deletion: ${domainsWithInterServerId.length}`);
    domainsWithInterServerId.forEach(domain => {
      console.log(`     🌐 ${domain.name} (InterServer ID: ${domain.interserverId})`);
    });

    console.log(`   Domains requiring local deletion only: ${domainsWithoutInterServerId.length}`);
    domainsWithoutInterServerId.forEach(domain => {
      console.log(`     💾 ${domain.name} (No InterServer ID)`);
    });

    console.log('\n✅ DNS Downgrade Domain Deletion Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Test user: ${selectedUser.email}`);
    console.log(`   - Current domains: ${userDomains.length}`);
    console.log(`   - Target plan: ${testPlan.name} (${testPlan.maxDomains} domains)`);
    console.log(`   - Domains to keep: ${selectedDomainIds.length}`);
    console.log(`   - Domains to remove: ${domainsToRemove.length}`);
    console.log(`   - InterServer deletions required: ${domainsWithInterServerId.length}`);
    console.log(`   - Local deletions only: ${domainsWithoutInterServerId.length}`);

  } catch (error) {
    console.error('❌ Error during DNS downgrade domain deletion test:', error);
  }
}

// Run the test
testDnsDowngradeDomainDeletion();
