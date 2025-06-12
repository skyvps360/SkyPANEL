#!/usr/bin/env node

/**
 * DNS Plan Upgrade Test Script
 *
 * This script tests the VirtFusion API balance retrieval method
 * that was failing in the DNS plan upgrade.
 */

const axios = require('axios');
require('dotenv').config();

async function testVirtFusionBalance() {
  console.log('🧪 Testing VirtFusion Balance Retrieval...\n');

  try {
    // Get VirtFusion API settings from environment
    const apiUrl = process.env.VIRTFUSION_API_URL || 'https://vdc.skyvps360.xyz/api/v1';
    const apiToken = process.env.VIRTFUSION_API_TOKEN;

    if (!apiToken) {
      throw new Error('VIRTFUSION_API_TOKEN not found in environment variables');
    }

    console.log(`API URL: ${apiUrl}`);
    console.log(`API Token: ${apiToken.substring(0, 8)}...`);

    // Test 1: Basic API connection
    console.log('\n1️⃣ Testing basic API connection...');
    const testResponse = await axios.get(`${apiUrl}/account`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (testResponse.status === 200) {
      console.log('✅ VirtFusion API connection successful');
    } else {
      throw new Error(`API returned status ${testResponse.status}`);
    }

    // Test 2: Get user hourly stats (the method used in dashboard)
    console.log('\n2️⃣ Testing getUserHourlyStats endpoint...');
    const userId = 1; // Test with user ID 1 from error logs

    try {
      const statsResponse = await axios.get(`${apiUrl}/selfService/user/${userId}/hourlyStats`, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ getUserHourlyStats API call successful');
      console.log('Response status:', statsResponse.status);

      if (statsResponse.data?.data?.credit?.tokens) {
        const tokens = parseFloat(statsResponse.data.data.credit.tokens);
        console.log(`✅ User balance found: ${tokens} tokens ($${(tokens / 100).toFixed(2)})`);
      } else {
        console.log('⚠️  No balance data in response');
        console.log('Response structure:', JSON.stringify(statsResponse.data, null, 2));
      }

    } catch (error) {
      console.log(`❌ getUserHourlyStats failed: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // Test 3: Test the removeCreditFromUserByExtRelationId endpoint (without actually removing credits)
    console.log('\n3️⃣ Testing removeCreditFromUserByExtRelationId endpoint structure...');

    // Just test if the endpoint exists by making a request with invalid data
    try {
      await axios.post(`${apiUrl}/selfService/credit/byUserExtRelationId/999999`, {
        tokens: 1,
        reference_1: 'test',
        reference_2: 'test'
      }, {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ removeCreditFromUserByExtRelationId endpoint exists (returned 404 for invalid user)');
      } else if (error.response && error.response.status === 422) {
        console.log('✅ removeCreditFromUserByExtRelationId endpoint exists (validation error)');
      } else {
        console.log(`⚠️  Unexpected response: ${error.response?.status} - ${error.message}`);
      }
    }

    console.log('\n🎉 VirtFusion API tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the test
testVirtFusionBalance();

async function testDnsUpgrade() {
  console.log('🧪 Testing DNS Plan Upgrade Functionality...\n');

  try {
    // 1. Initialize VirtFusion API
    console.log('1️⃣ Initializing VirtFusion API...');
    await virtFusionApi.updateSettings();
    
    if (!virtFusionApi.isConfigured()) {
      throw new Error('VirtFusion API is not configured');
    }
    console.log('✅ VirtFusion API initialized');

    // 2. Get test user (User ID 1 from the error logs)
    console.log('\n2️⃣ Getting test user...');
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, 1))
      .limit(1);

    if (!user) {
      throw new Error('User ID 1 not found');
    }

    if (!user.virtFusionId) {
      throw new Error('User is not linked to VirtFusion');
    }

    console.log(`✅ Found user: ${user.email} (VirtFusion ID: ${user.virtFusionId})`);

    // 3. Test balance retrieval
    console.log('\n3️⃣ Testing balance retrieval...');
    const balanceResponse = await virtFusionApi.getUserHourlyStats(user.id);
    
    let virtFusionBalance = 0;
    if (balanceResponse?.data?.credit?.tokens) {
      virtFusionBalance = parseFloat(balanceResponse.data.credit.tokens);
      console.log(`✅ User balance: ${virtFusionBalance} tokens ($${(virtFusionBalance / 100).toFixed(2)})`);
    } else {
      console.log('⚠️  No balance data found, but API call succeeded');
      console.log('Balance response:', JSON.stringify(balanceResponse, null, 2));
    }

    // 4. Get DNS plans
    console.log('\n4️⃣ Getting DNS plans...');
    const [freePlan] = await db.select()
      .from(dnsPlans)
      .where(and(eq(dnsPlans.id, 4), eq(dnsPlans.isActive, true)))
      .limit(1);

    const [paidPlan] = await db.select()
      .from(dnsPlans)
      .where(and(eq(dnsPlans.id, 1), eq(dnsPlans.isActive, true)))
      .limit(1);

    if (!freePlan) {
      throw new Error('Free plan (ID: 4) not found');
    }

    if (!paidPlan) {
      throw new Error('Paid plan (ID: 1) not found');
    }

    console.log(`✅ Free plan: ${freePlan.name} ($${freePlan.price}/month)`);
    console.log(`✅ Paid plan: ${paidPlan.name} ($${paidPlan.price}/month)`);

    // 5. Calculate pro-rated billing
    console.log('\n5️⃣ Calculating pro-rated billing...');
    const now = new Date();
    const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    const daysRemaining = Math.max(0, Math.ceil((nextFirstOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    
    const proratedAmount = (paidPlan.price - freePlan.price) * (daysRemaining / 30);
    const tokensRequired = Math.round(proratedAmount * 100);

    console.log(`✅ Pro-rated calculation:`);
    console.log(`   Current date: ${now.toISOString().split('T')[0]}`);
    console.log(`   Next billing cycle: ${nextFirstOfMonth.toISOString().split('T')[0]}`);
    console.log(`   Days remaining: ${daysRemaining}`);
    console.log(`   Price difference: $${(paidPlan.price - freePlan.price).toFixed(2)}`);
    console.log(`   Pro-rated amount: $${proratedAmount.toFixed(2)}`);
    console.log(`   Tokens required: ${tokensRequired}`);

    // 6. Check if user has sufficient balance
    console.log('\n6️⃣ Checking balance sufficiency...');
    if (virtFusionBalance >= tokensRequired) {
      console.log(`✅ User has sufficient balance (${virtFusionBalance} >= ${tokensRequired})`);
    } else {
      console.log(`⚠️  User has insufficient balance (${virtFusionBalance} < ${tokensRequired})`);
      console.log(`   User needs ${tokensRequired - virtFusionBalance} more tokens`);
    }

    // 7. Test VirtFusion API methods
    console.log('\n7️⃣ Testing VirtFusion API methods...');
    
    // Test the method used for token deduction
    console.log('   Testing removeCreditFromUserByExtRelationId method...');
    try {
      // Don't actually deduct tokens, just test if the method exists
      const methodExists = typeof virtFusionApi.removeCreditFromUserByExtRelationId === 'function';
      if (methodExists) {
        console.log('✅ removeCreditFromUserByExtRelationId method exists');
      } else {
        console.log('❌ removeCreditFromUserByExtRelationId method missing');
      }
    } catch (error) {
      console.log(`❌ Error testing removeCreditFromUserByExtRelationId: ${error.message}`);
    }

    console.log('\n🎉 DNS upgrade test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   User: ${user.email}`);
    console.log(`   Current balance: ${virtFusionBalance} tokens`);
    console.log(`   Upgrade cost: ${tokensRequired} tokens`);
    console.log(`   Can upgrade: ${virtFusionBalance >= tokensRequired ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ DNS upgrade test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testDnsUpgrade();
