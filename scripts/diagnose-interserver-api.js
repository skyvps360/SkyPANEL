#!/usr/bin/env node

/**
 * InterServer API Diagnostic Script
 * 
 * This script helps diagnose InterServer API connectivity issues in production.
 * It tests various aspects of the API connection and provides detailed feedback.
 */

import axios from 'axios';
import { config } from 'dotenv';

// Load environment variables
config();

async function diagnoseInterServerAPI() {
  console.log('🔍 InterServer API Diagnostic Tool');
  console.log('=====================================\n');

  // Step 1: Check environment variables
  console.log('📋 Step 1: Environment Variable Check');
  console.log('-------------------------------------');
  
  const apiKey = process.env.INTERSERVER_API_KEY;
  
  if (!apiKey) {
    console.error('❌ INTERSERVER_API_KEY not found in environment variables');
    console.log('   Please ensure the environment variable is set in production');
    return;
  }
  
  console.log('✅ INTERSERVER_API_KEY found');
  console.log(`   Length: ${apiKey.length} characters`);
  console.log(`   Preview: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
  console.log();

  // Step 2: Test basic connectivity and network info
  console.log('🌐 Step 2: Network Connectivity Test');
  console.log('------------------------------------');

  const baseUrl = 'https://my.interserver.net/apiv2';

  // Check our public IP (to see if Cloudflare is affecting it)
  try {
    console.log('Checking public IP address...');
    const ipResponse = await axios.get('https://api.ipify.org?format=json', { timeout: 5000 });
    console.log(`✅ Public IP: ${ipResponse.data.ip}`);
  } catch (ipError) {
    console.log('⚠️  Could not determine public IP');
  }

  // Test DNS resolution for InterServer
  try {
    console.log('Testing DNS resolution for my.interserver.net...');
    const dns = await import('dns');
    const { promisify } = await import('util');
    const lookup = promisify(dns.lookup);
    const result = await lookup('my.interserver.net');
    console.log(`✅ DNS resolution successful: ${result.address}`);
  } catch (dnsError) {
    console.error('❌ DNS resolution failed:', dnsError.message);
  }

  try {
    // Test basic HTTP connectivity
    const response = await axios.get('https://my.interserver.net', { timeout: 10000 });
    console.log('✅ Basic connectivity to my.interserver.net successful');
    console.log(`   Status: ${response.status}`);
    console.log(`   Server: ${response.headers.server || 'Unknown'}`);
  } catch (error) {
    console.error('❌ Basic connectivity test failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);

    if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 DNS Resolution Issue Detected:');
      console.log('   - This could be caused by Cloudflare DNS settings');
      console.log('   - Try using different DNS servers (8.8.8.8, 1.1.1.1)');
      console.log('   - Check if your server can resolve external domains');
    }

    return;
  }
  console.log();

  // Step 3: Test API endpoint with authentication
  console.log('🔑 Step 3: API Authentication Test');
  console.log('----------------------------------');
  
  const client = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
  });

  try {
    console.log('Testing DNS list endpoint...');
    const dnsResponse = await client.get('/dns');
    
    console.log('✅ DNS API call successful');
    console.log(`   Status: ${dnsResponse.status}`);
    console.log(`   Response type: ${typeof dnsResponse.data}`);
    console.log(`   Domains found: ${Array.isArray(dnsResponse.data) ? dnsResponse.data.length : 'N/A'}`);
    
    if (Array.isArray(dnsResponse.data) && dnsResponse.data.length > 0) {
      console.log('   Sample domain:', {
        id: dnsResponse.data[0].id,
        name: dnsResponse.data[0].name,
        status: dnsResponse.data[0].status
      });
    }
    
  } catch (error) {
    console.error('❌ DNS API call failed:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.response) {
      console.error(`   HTTP Status: ${error.response.status}`);
      console.error(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    // Provide specific troubleshooting advice
    if (error.response?.status === 401) {
      console.log('\n🔧 Troubleshooting Advice:');
      console.log('   - Verify the API key is correct');
      console.log('   - Check if the API key has expired');
      console.log('   - Ensure the API key has DNS management permissions');
    } else if (error.response?.status === 403) {
      console.log('\n🔧 Troubleshooting Advice:');
      console.log('   - Check API key permissions');
      console.log('   - Verify account has DNS service enabled');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n🔧 Troubleshooting Advice:');
      console.log('   - Network timeout - check firewall settings');
      console.log('   - Verify outbound HTTPS connections are allowed');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🔧 Troubleshooting Advice:');
      console.log('   - DNS resolution failed');
      console.log('   - Check DNS settings on the server');
    }
    
    return;
  }
  console.log();

  // Step 4: Test specific API endpoints
  console.log('🧪 Step 4: Additional API Endpoint Tests');
  console.log('----------------------------------------');
  
  try {
    // Test if we can get account info (if available)
    console.log('Testing account endpoint...');
    try {
      const accountResponse = await client.get('/account');
      console.log('✅ Account API call successful');
    } catch (accountError) {
      if (accountError.response?.status === 404) {
        console.log('ℹ️  Account endpoint not available (expected)');
      } else {
        console.log(`⚠️  Account endpoint failed: ${accountError.message}`);
      }
    }
    
  } catch (error) {
    console.log(`⚠️  Additional tests failed: ${error.message}`);
  }
  console.log();

  // Step 5: Environment summary
  console.log('📊 Step 5: Environment Summary');
  console.log('------------------------------');
  console.log(`Node.js version: ${process.version}`);
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'not set'}`);
  console.log();

  console.log('✅ Diagnostic complete!');
  console.log('If issues persist, check the server logs for more details.');
}

// Run the diagnostic
diagnoseInterServerAPI().catch(error => {
  console.error('💥 Diagnostic script failed:', error);
  process.exit(1);
});
