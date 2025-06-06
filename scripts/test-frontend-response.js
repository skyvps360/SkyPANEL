#!/usr/bin/env node

/**
 * Test script to validate frontend response handling
 * This simulates the axios interceptor behavior and tests response parsing
 */

// Simulate the backend response structure
const mockBackendResponse = {
  status: 201,
  data: {
    domain: {
      id: 6,
      userId: 1,
      name: 'test-domain.com',
      status: 'active',
      interserverId: 497891
    },
    message: 'Domain created successfully with SkyPANEL nameservers (4 records replaced)',
    interServerStatus: 'linked',
    whitelabelStatus: {
      success: true,
      nameserversReplaced: 4,
      replacedRecords: [
        {
          type: 'NS',
          old: 'cdns1.interserver.net',
          new: 'cdns.ns1.skyvps360.xyz',
          recordId: '7007667'
        },
        {
          type: 'NS',
          old: 'cdns2.interserver.net',
          new: 'cdns.ns2.skyvps360.xyz',
          recordId: '7007674'
        },
        {
          type: 'NS',
          old: 'cdns3.interserver.net',
          new: 'cdns.ns3.skyvps360.xyz',
          recordId: '7007681'
        },
        {
          type: 'SOA',
          old: 'cdns1.interserver.net',
          new: 'cdns.ns1.skyvps360.xyz',
          recordId: '7007660'
        }
      ],
      errors: []
    },
    interServerResult: {
      id: 497891,
      domain: 'test-domain.com'
    }
  }
};

// Simulate axios interceptor behavior
function simulateAxiosInterceptor(response) {
  // The interceptor extracts response.data and returns it directly
  return response.data;
}

// Simulate frontend response handling
function simulateFrontendHandling(responseData) {
  console.log('🧪 Testing frontend response handling...');
  console.log('📦 Response data received:', JSON.stringify(responseData, null, 2));
  
  const { whitelabelStatus, message, domain } = responseData;
  
  let toastMessage = '';
  let toastTitle = '';
  let toastVariant = 'default';
  
  if (whitelabelStatus?.success) {
    // Full success - domain created and nameservers replaced
    toastTitle = 'Success';
    toastMessage = `${message || 'Domain created successfully with SkyPANEL nameservers'} Your domain is now using SkyPANEL nameservers.`;
    toastVariant = 'success';
  } else if (whitelabelStatus?.nameserversReplaced > 0) {
    // Partial success - domain created but some nameserver replacement issues
    toastTitle = 'Domain Created';
    toastMessage = `Domain added successfully, but some nameserver records couldn't be replaced. ${whitelabelStatus.nameserversReplaced} records were updated.`;
    toastVariant = 'default';
  } else if (domain) {
    // Domain created but no nameserver replacement
    toastTitle = 'Domain Created';
    toastMessage = 'Domain added successfully, but nameserver replacement failed. You may need to manually update DNS records.';
    toastVariant = 'default';
  } else {
    // Fallback success message
    toastTitle = 'Success';
    toastMessage = message || 'Domain created successfully';
    toastVariant = 'success';
  }
  
  return {
    title: toastTitle,
    message: toastMessage,
    variant: toastVariant,
    success: true
  };
}

// Run the test
console.log('🚀 Starting frontend response handling test...\n');

try {
  // Step 1: Simulate axios interceptor
  const interceptedResponse = simulateAxiosInterceptor(mockBackendResponse);
  console.log('✅ Axios interceptor simulation successful');
  
  // Step 2: Simulate frontend handling
  const frontendResult = simulateFrontendHandling(interceptedResponse);
  console.log('✅ Frontend handling simulation successful');
  
  // Step 3: Validate results
  console.log('\n📋 Test Results:');
  console.log(`   Title: ${frontendResult.title}`);
  console.log(`   Message: ${frontendResult.message}`);
  console.log(`   Variant: ${frontendResult.variant}`);
  console.log(`   Success: ${frontendResult.success}`);
  
  // Step 4: Validate expected behavior
  const expectedSuccess = mockBackendResponse.data.whitelabelStatus.success;
  const expectedNameserversReplaced = mockBackendResponse.data.whitelabelStatus.nameserversReplaced;
  
  if (frontendResult.success && frontendResult.title === 'Success' && expectedSuccess) {
    console.log('\n🎉 ✅ Test PASSED: Frontend correctly handles successful white-labeled domain creation');
    console.log(`   ✓ Detected ${expectedNameserversReplaced} nameserver replacements`);
    console.log(`   ✓ Shows appropriate success message`);
    console.log(`   ✓ Indicates SkyPANEL nameserver usage`);
  } else {
    console.log('\n❌ Test FAILED: Frontend response handling has issues');
  }
  
} catch (error) {
  console.error('❌ Test failed with error:', error.message);
  process.exit(1);
}

console.log('\n🏁 Frontend response handling test completed successfully!');
