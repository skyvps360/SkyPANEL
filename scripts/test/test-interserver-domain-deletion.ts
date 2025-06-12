#!/usr/bin/env tsx

/**
 * Test script to verify InterServer API domain deletion functionality
 * This script tests the actual InterServer API call for domain deletion
 */

import 'dotenv/config';
import { interServerApi } from '../server/interserver-api';

async function testInterServerDomainDeletion() {
  console.log('🧪 Testing InterServer API Domain Deletion\n');

  try {
    // Test with a known domain ID (from your test data)
    const testDomainId = 500992; // test-domain.com from your test scenario
    
    console.log(`1. 🌐 Testing InterServer API Configuration...`);
    
    // Check if API is configured
    if (!process.env.INTERSERVER_API_KEY) {
      console.log('   ❌ INTERSERVER_API_KEY environment variable not set');
      console.log('   💡 Make sure to set INTERSERVER_API_KEY in your .env file');
      return;
    }
    
    console.log('   ✅ INTERSERVER_API_KEY is configured');
    console.log(`   🔑 API Key: ${process.env.INTERSERVER_API_KEY.substring(0, 8)}...`);

    console.log(`\n2. 🎯 Testing Domain Deletion...`);
    console.log(`   Target Domain ID: ${testDomainId}`);
    
    // First, let's try to get the domain list to see if the domain exists
    console.log('\n   📋 Checking if domain exists in InterServer...');
    try {
      const domainsList = await interServerApi.getDnsList();
      const targetDomain = domainsList.find(d => d.id === testDomainId);
      
      if (targetDomain) {
        console.log(`   ✅ Domain found: ${targetDomain.name} (ID: ${targetDomain.id})`);
        
        // Now try to delete it
        console.log(`\n   🗑️  Attempting to delete domain ${targetDomain.name} (ID: ${testDomainId})...`);
        
        try {
          const deleteResult = await interServerApi.deleteDnsDomain(testDomainId);
          console.log('   ✅ Domain deletion successful!');
          console.log('   📄 InterServer response:', deleteResult);
          
          // Verify deletion by checking if domain still exists
          console.log('\n   🔍 Verifying deletion...');
          const updatedDomainsList = await interServerApi.getDnsList();
          const deletedDomain = updatedDomainsList.find(d => d.id === testDomainId);
          
          if (!deletedDomain) {
            console.log('   ✅ Verification successful: Domain no longer exists in InterServer');
          } else {
            console.log('   ⚠️  Warning: Domain still exists in InterServer after deletion');
          }
          
        } catch (deleteError) {
          console.log('   ❌ Domain deletion failed');
          console.log('   📄 Error details:', deleteError.message);
          
          // Check if it's a 404 (domain already deleted)
          if (deleteError.message.includes('not found')) {
            console.log('   💡 Domain may have already been deleted');
          }
        }
        
      } else {
        console.log(`   ❌ Domain with ID ${testDomainId} not found in InterServer`);
        console.log('   💡 This could mean:');
        console.log('      - Domain was already deleted');
        console.log('      - Domain ID is incorrect');
        console.log('      - API access issues');
        
        // Show available domains for reference
        console.log('\n   📋 Available domains in InterServer:');
        domainsList.slice(0, 5).forEach(domain => {
          console.log(`      - ${domain.name} (ID: ${domain.id})`);
        });
        if (domainsList.length > 5) {
          console.log(`      ... and ${domainsList.length - 5} more domains`);
        }
      }
      
    } catch (listError) {
      console.log('   ❌ Failed to get domain list from InterServer');
      console.log('   📄 Error details:', listError.message);
      console.log('   💡 This suggests an API configuration or connectivity issue');
    }

    console.log('\n3. 🧪 Testing Error Handling...');
    
    // Test with an invalid domain ID to check error handling
    const invalidDomainId = 999999;
    console.log(`   Testing deletion with invalid domain ID: ${invalidDomainId}`);
    
    try {
      await interServerApi.deleteDnsDomain(invalidDomainId);
      console.log('   ⚠️  Unexpected: Deletion succeeded with invalid ID');
    } catch (invalidError) {
      console.log('   ✅ Error handling working correctly');
      console.log(`   📄 Error message: ${invalidError.message}`);
    }

    console.log('\n✅ InterServer API Domain Deletion Test Complete!');

  } catch (error) {
    console.error('❌ Error during InterServer API test:', error);
    console.error('📄 Full error details:', error);
  }
}

// Run the test
testInterServerDomainDeletion();
