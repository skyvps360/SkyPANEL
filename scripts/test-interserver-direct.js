#!/usr/bin/env node

/**
 * Direct InterServer API Test
 * 
 * This script tests the InterServer API with different configurations
 * to help identify if Cloudflare or network issues are causing problems.
 */

import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

async function testInterServerDirect() {
  console.log('🧪 Direct InterServer API Test');
  console.log('==============================\n');

  const apiKey = process.env.INTERSERVER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ INTERSERVER_API_KEY not found');
    return;
  }

  console.log(`🔑 API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log(`📏 API Key Length: ${apiKey.length}\n`);

  // Test 1: Basic connectivity with different DNS
  console.log('🌐 Test 1: Basic Connectivity');
  console.log('-----------------------------');
  
  try {
    // Test with different DNS settings
    const testConfigs = [
      { name: 'Default DNS', dns: undefined },
      { name: 'Google DNS', dns: '8.8.8.8' },
      { name: 'Cloudflare DNS', dns: '1.1.1.1' }
    ];

    for (const testConfig of testConfigs) {
      try {
        console.log(`Testing with ${testConfig.name}...`);
        
        const axiosConfig = {
          timeout: 10000,
          headers: {
            'User-Agent': 'SkyPANEL/1.0.0',
            'Accept': 'application/json'
          }
        };

        if (testConfig.dns) {
          // Note: This is just for logging, axios doesn't directly support DNS override
          console.log(`  (Would use DNS: ${testConfig.dns})`);
        }

        const response = await axios.get('https://my.interserver.net', axiosConfig);
        console.log(`  ✅ ${testConfig.name}: Status ${response.status}`);
      } catch (error) {
        console.log(`  ❌ ${testConfig.name}: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Basic connectivity test failed:', error.message);
  }

  console.log();

  // Test 2: API Endpoint with different configurations
  console.log('🔌 Test 2: API Endpoint Tests');
  console.log('-----------------------------');

  const testConfigurations = [
    {
      name: 'Standard Request',
      config: {
        baseURL: 'https://my.interserver.net/apiv2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
        }
      }
    },
    {
      name: 'With User-Agent',
      config: {
        baseURL: 'https://my.interserver.net/apiv2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
          'User-Agent': 'SkyPANEL/1.0.0'
        }
      }
    },
    {
      name: 'With Additional Headers',
      config: {
        baseURL: 'https://my.interserver.net/apiv2',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': apiKey,
          'User-Agent': 'SkyPANEL/1.0.0',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    }
  ];

  for (const test of testConfigurations) {
    try {
      console.log(`Testing: ${test.name}`);
      const client = axios.create(test.config);
      
      const response = await client.get('/dns');
      console.log(`  ✅ Success: ${response.status}, Domains: ${response.data?.length || 0}`);
      
      if (response.data && response.data.length > 0) {
        console.log(`  📋 Sample domain: ${response.data[0].name} (ID: ${response.data[0].id})`);
      }
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      if (error.response) {
        console.log(`     Status: ${error.response.status}`);
        console.log(`     Data: ${JSON.stringify(error.response.data)}`);
      }
      if (error.code) {
        console.log(`     Code: ${error.code}`);
      }
    }
    console.log();
  }

  // Test 3: Network diagnostics
  console.log('🔍 Test 3: Network Diagnostics');
  console.log('------------------------------');
  
  try {
    // Check public IP
    const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    console.log(`📍 Public IP: ${ipResponse.data.ip}`);
    
    // Check if we can reach other APIs
    const testApis = [
      'https://httpbin.org/ip',
      'https://api.github.com',
      'https://jsonplaceholder.typicode.com/posts/1'
    ];
    
    for (const testApi of testApis) {
      try {
        const testResponse = await axios.get(testApi, { timeout: 5000 });
        console.log(`✅ ${testApi}: ${testResponse.status}`);
      } catch (testError) {
        console.log(`❌ ${testApi}: ${testError.message}`);
      }
    }
    
  } catch (error) {
    console.log('⚠️  Network diagnostics failed:', error.message);
  }

  console.log('\n🏁 Test Complete');
  console.log('================');
  console.log('If all tests fail, check:');
  console.log('1. Environment variable configuration in DigitalOcean');
  console.log('2. Firewall settings allowing outbound HTTPS');
  console.log('3. InterServer API key validity and permissions');
  console.log('4. Network connectivity from your DigitalOcean droplet');
}

// Run the test
testInterServerDirect().catch(error => {
  console.error('💥 Test script failed:', error);
  process.exit(1);
});
