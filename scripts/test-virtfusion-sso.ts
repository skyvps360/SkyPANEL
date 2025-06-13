#!/usr/bin/env tsx

/**
 * Test script for VirtFusion SSO authentication token generation
 * This script tests the generateAuthToken method to ensure it works correctly
 */

import { VirtFusionApi } from '../server/virtfusion-api';

async function testVirtFusionSSO() {
  console.log('🧪 Testing VirtFusion SSO Authentication Token Generation');
  console.log('=' .repeat(60));

  try {
    // Create VirtFusion API instance
    const virtFusionApi = new VirtFusionApi();
    
    // Update settings from database
    console.log('📡 Updating VirtFusion API settings...');
    await virtFusionApi.updateSettings();
    
    // Check if API is configured
    if (!virtFusionApi.isConfigured()) {
      console.error('❌ VirtFusion API is not configured. Please set up API URL and token in admin settings.');
      process.exit(1);
    }
    
    console.log('✅ VirtFusion API is configured');
    
    // Test connection first
    console.log('🔗 Testing VirtFusion API connection...');
    try {
      await virtFusionApi.testConnection();
      console.log('✅ VirtFusion API connection successful');
    } catch (error: any) {
      console.error('❌ VirtFusion API connection failed:', error.message);
      process.exit(1);
    }
    
    // Test authentication token generation
    console.log('🔐 Testing authentication token generation...');
    
    // Use a test extRelationId (user ID) - you may need to adjust this
    const testExtRelationId = 1; // This should be a valid user ID in your system
    
    console.log(`📝 Generating authentication tokens for extRelationId: ${testExtRelationId}`);
    
    try {
      const authResponse = await virtFusionApi.generateAuthToken(testExtRelationId);
      
      console.log('✅ Authentication token generation successful!');
      console.log('📋 Response structure:');
      console.log(JSON.stringify(authResponse, null, 2));
      
      // Verify the response has the expected structure
      if (authResponse && authResponse.data) {
        const { token, redirectUrl, authentication } = authResponse.data;
        
        if (token && redirectUrl) {
          console.log('✅ Response contains required token and redirectUrl');
          console.log(`🔗 Redirect URL: ${redirectUrl}`);
          console.log(`🎫 Token (first 50 chars): ${token.substring(0, 50)}...`);
          
          if (authentication && authentication.tokens) {
            console.log('✅ Response contains VirtFusion authentication object');
            console.log(`⏰ Token TTL: ${authentication.expiry?.ttl} seconds`);
            console.log(`📅 Expires at: ${authentication.expiry?.expires}`);
          }
          
          console.log('🎉 VirtFusion SSO authentication test completed successfully!');
        } else {
          console.error('❌ Response missing required token or redirectUrl');
          console.error('Response data:', authResponse.data);
        }
      } else {
        console.error('❌ Response missing data object');
        console.error('Full response:', authResponse);
      }
      
    } catch (error: any) {
      console.error('❌ Authentication token generation failed:', error.message);
      
      if (error.response) {
        console.error('HTTP Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      // Check for common issues
      if (error.message.includes('404')) {
        console.error('💡 Hint: User with extRelationId may not exist in VirtFusion');
      } else if (error.message.includes('401')) {
        console.error('💡 Hint: API token may be invalid or expired');
      } else if (error.message.includes('403')) {
        console.error('💡 Hint: API token may not have sufficient permissions');
      }
      
      process.exit(1);
    }
    
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testVirtFusionSSO().catch(console.error);
}

export { testVirtFusionSSO };
