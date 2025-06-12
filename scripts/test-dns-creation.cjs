const axios = require('axios');
require('dotenv').config();

async function testDnsCreation() {
  const baseUrl = 'http://localhost:3333';
  
  console.log('🧪 Testing DNS Domain Creation through SkyPANEL API');
  console.log('==================================================');

  // First, we need to authenticate to get a session
  console.log('\n🔐 Step 1: Authenticating...');
  
  try {
    // For testing, we'll need to create a test user or use existing credentials
    // This is a simplified test - in reality you'd need proper authentication
    
    const testDomain = `testdomain${Date.now()}.com`;
    const testIp = '192.168.1.100';
    
    console.log(`\n🌐 Step 2: Creating domain: ${testDomain}`);
    console.log(`IP Address: ${testIp}`);
    
    // Test the DNS creation endpoint directly
    const createResponse = await axios.post(`${baseUrl}/api/dns/domains`, {
      name: testDomain,
      ip: testIp
    }, {
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need proper authentication headers
      },
      timeout: 30000
    });
    
    console.log('✅ Domain creation response status:', createResponse.status);
    console.log('📄 Response data:', JSON.stringify(createResponse.data, null, 2));
    
    if (createResponse.data.domain && createResponse.data.domain.interserverId) {
      console.log(`🎉 SUCCESS: Domain created with InterServer ID: ${createResponse.data.domain.interserverId}`);
    } else {
      console.log('⚠️  WARNING: Domain created but InterServer ID is missing');
      console.log('InterServer Status:', createResponse.data.interServerStatus);
    }
    
  } catch (error) {
    console.error('❌ Error testing DNS creation:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Note: This test requires authentication.');
      console.log('To test properly, you would need to:');
      console.log('1. Log in through the web interface');
      console.log('2. Extract the session cookie');
      console.log('3. Include it in the request headers');
    }
  }
}

console.log('Starting DNS creation test...');
testDnsCreation();
