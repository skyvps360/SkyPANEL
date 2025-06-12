const axios = require('axios');
require('dotenv').config();

async function testDnsStatus() {
  const baseUrl = 'http://localhost:3333';
  
  console.log('🧪 Testing DNS Domain Status Display');
  console.log('====================================');

  try {
    // Test the domains endpoint directly (this would normally require authentication)
    console.log('\n📋 Testing GET /api/dns/domains...');
    
    const response = await axios.get(`${baseUrl}/api/dns/domains`, {
      timeout: 10000,
      validateStatus: function (status) {
        // Accept both success and auth errors for testing
        return status < 500;
      }
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) {
      console.log('⚠️  Authentication required (expected for this test)');
      console.log('This confirms the endpoint is working but requires login');
      return;
    }
    
    if (response.data && response.data.domains) {
      console.log('✅ Domains response received');
      console.log('📊 Number of domains:', response.data.domains.length);
      
      if (response.data.warning) {
        console.log('⚠️  Warning:', response.data.warning);
      }
      
      response.data.domains.forEach((domain, index) => {
        console.log(`\n🏷️  Domain ${index + 1}:`);
        console.log(`  - Name: ${domain.name}`);
        console.log(`  - Status: ${domain.status}`);
        console.log(`  - InterServer ID: ${domain.interserverId || 'null'}`);
        console.log(`  - InterServer Status: ${domain.interServerStatus || 'not set'}`);
        
        if (domain.interServerData) {
          console.log(`  - InterServer Data:`, domain.interServerData);
        }
      });
    } else {
      console.log('📄 Response data:', JSON.stringify(response.data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error testing DNS status:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
  }
}

console.log('Starting DNS status test...');
testDnsStatus();
