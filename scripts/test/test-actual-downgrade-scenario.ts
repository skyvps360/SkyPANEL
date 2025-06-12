#!/usr/bin/env tsx

/**
 * Test script to simulate the exact downgrade scenario the user is experiencing
 * This script will test the actual API call that should happen during downgrade
 */

import 'dotenv/config';
import { db } from '../../server/db';
import { dnsDomains, dnsPlans, dnsPlanSubscriptions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { interServerApi } from '../../server/interserver-api';

async function testActualDowngradeScenario() {
  console.log('🧪 Testing Actual DNS Downgrade Scenario\n');

  try {
    // 1. Get the user's current situation (user ID 1 - storm@skyvps360.xyz)
    const userId = 1;
    console.log(`1. 📊 Getting current situation for user ${userId}...`);
    
    // Get user's domains
    const userDomains = await db.select()
      .from(dnsDomains)
      .where(eq(dnsDomains.userId, userId));

    console.log(`   User has ${userDomains.length} domains:`);
    userDomains.forEach(domain => {
      console.log(`   - ${domain.name} (Local ID: ${domain.id}, InterServer ID: ${domain.interserverId})`);
    });

    // Get user's current plan
    const currentSubscription = await db.select({
      id: dnsPlanSubscriptions.id,
      planId: dnsPlanSubscriptions.planId,
      plan: {
        id: dnsPlans.id,
        name: dnsPlans.name,
        maxDomains: dnsPlans.maxDomains
      }
    })
      .from(dnsPlanSubscriptions)
      .leftJoin(dnsPlans, eq(dnsPlanSubscriptions.planId, dnsPlans.id))
      .where(and(
        eq(dnsPlanSubscriptions.userId, userId),
        eq(dnsPlanSubscriptions.status, 'active')
      ))
      .limit(1);

    if (currentSubscription.length === 0) {
      console.log('   ❌ No active subscription found');
      return;
    }

    const currentPlan = currentSubscription[0].plan;
    console.log(`   Current plan: ${currentPlan?.name} (${currentPlan?.maxDomains} domains max)`);

    // Get the Free plan (target downgrade plan)
    const freePlan = await db.select()
      .from(dnsPlans)
      .where(eq(dnsPlans.name, 'Free'))
      .limit(1);

    if (freePlan.length === 0) {
      console.log('   ❌ Free plan not found');
      return;
    }

    const targetPlan = freePlan[0];
    console.log(`   Target plan: ${targetPlan.name} (${targetPlan.maxDomains} domains max)`);

    // 2. Simulate the downgrade scenario
    console.log(`\n2. 🎯 Simulating Downgrade Scenario...`);
    
    const domainsToKeep = targetPlan.maxDomains;
    const domainsToRemove = userDomains.length - domainsToKeep;
    
    console.log(`   Domains to keep: ${domainsToKeep}`);
    console.log(`   Domains to remove: ${domainsToRemove}`);

    if (domainsToRemove <= 0) {
      console.log('   ✅ No domains need to be removed for this downgrade');
      return;
    }

    // Simulate user selection (keep first domain, remove the rest)
    const selectedDomainIds = userDomains.slice(0, domainsToKeep).map(d => d.id);
    const domainsToDelete = userDomains.filter(d => !selectedDomainIds.includes(d.id));

    console.log('\n   📝 Simulated User Selection:');
    console.log('   Domains to KEEP:');
    userDomains.filter(d => selectedDomainIds.includes(d.id)).forEach(domain => {
      console.log(`     ✅ ${domain.name} (ID: ${domain.id})`);
    });

    console.log('   Domains to DELETE:');
    domainsToDelete.forEach(domain => {
      console.log(`     ❌ ${domain.name} (ID: ${domain.id}, InterServer ID: ${domain.interserverId})`);
    });

    // 3. Test the actual domain deletion process
    console.log(`\n3. 🗑️  Testing Domain Deletion Process...`);

    for (const domain of domainsToDelete) {
      console.log(`\n   Processing domain: ${domain.name}`);
      
      if (domain.interserverId) {
        console.log(`     🌐 Has InterServer ID: ${domain.interserverId}`);
        console.log(`     🔄 Attempting InterServer deletion...`);
        
        try {
          // This is the exact call that should happen during downgrade
          const deleteResult = await interServerApi.deleteDnsDomain(domain.interserverId);
          console.log(`     ✅ InterServer deletion successful!`);
          console.log(`     📄 Response:`, deleteResult);
          
        } catch (interServerError) {
          console.log(`     ❌ InterServer deletion failed!`);
          console.log(`     📄 Error:`, interServerError.message);
          
          // This is critical - if this fails, the domain won't be deleted from InterServer
          console.log(`     ⚠️  THIS IS THE ISSUE: Domain ${domain.name} was NOT deleted from InterServer!`);
        }
        
        // Note: In the actual downgrade, the local database deletion would happen here
        console.log(`     💾 Local database deletion would happen here (not executed in test)`);
        
      } else {
        console.log(`     ❌ No InterServer ID - would only delete from local database`);
      }
    }

    // 4. Verify current state
    console.log(`\n4. 🔍 Verifying Current State...`);
    
    try {
      const currentDomainsList = await interServerApi.getDnsList();
      console.log(`   📋 Current domains in InterServer:`);
      
      domainsToDelete.forEach(domain => {
        if (domain.interserverId) {
          const stillExists = currentDomainsList.find(d => d.id === domain.interserverId);
          if (stillExists) {
            console.log(`     ❌ ${domain.name} (ID: ${domain.interserverId}) STILL EXISTS in InterServer`);
          } else {
            console.log(`     ✅ ${domain.name} (ID: ${domain.interserverId}) successfully deleted from InterServer`);
          }
        }
      });
      
    } catch (listError) {
      console.log(`   ❌ Could not verify InterServer state: ${listError.message}`);
    }

    console.log('\n✅ Actual Downgrade Scenario Test Complete!');
    console.log('\n📋 Summary:');
    console.log(`   - User: ${userId}`);
    console.log(`   - Current domains: ${userDomains.length}`);
    console.log(`   - Domains to delete: ${domainsToDelete.length}`);
    console.log(`   - InterServer deletions required: ${domainsToDelete.filter(d => d.interserverId).length}`);

  } catch (error) {
    console.error('❌ Error during actual downgrade scenario test:', error);
  }
}

// Run the test
testActualDowngradeScenario();
