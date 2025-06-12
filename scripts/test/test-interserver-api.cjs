const axios = require('axios');
require('dotenv').config();

async function testInterServerAPI() {
  const apiKey = process.env.INTERSERVER_API_KEY;
  const baseUrl = 'https://my.interserver.net/apiv2';

  if (!apiKey) {
    console.error('❌ INTERSERVER_API_KEY not found in environment variables');
    console.log('Please add your InterServer API key to the .env file:');
    console.log('INTERSERVER_API_KEY=your_actual_api_key_here');
    return;
  }

  console.log('🔑 Testing InterServer API with key:', apiKey.substring(0, 8) + '...');

  const client = axios.create({
    baseURL: baseUrl,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': apiKey,
    },
  });

  try {
    console.log('\n📋 Testing DNS domains list (GET /dns)...');
    const domainsResponse = await client.get('/dns');
    console.log('✅ DNS domains response status:', domainsResponse.status);
    console.log('📊 Number of domains:', domainsResponse.data?.length || 0);

    if (domainsResponse.data && domainsResponse.data.length > 0) {
      console.log('🏷️  First domain example:', domainsResponse.data[0]);

      // Test getting records for the first domain
      const firstDomain = domainsResponse.data[0];
      console.log(`\n📝 Testing DNS records for domain ID ${firstDomain.id} (GET /dns/${firstDomain.id})...`);

      try {
        const recordsResponse = await client.get(`/dns/${firstDomain.id}`);
        console.log('✅ DNS records response status:', recordsResponse.status);
        console.log('📊 Number of records:', recordsResponse.data?.length || 0);

        if (recordsResponse.data && recordsResponse.data.length > 0) {
          console.log('🏷️  First record example:', recordsResponse.data[0]);
          console.log('\n📋 Record structure analysis:');
          const record = recordsResponse.data[0];
          console.log('- ID type:', typeof record.id, '(value:', record.id, ')');
          console.log('- Domain ID type:', typeof record.domain_id, '(value:', record.domain_id, ')');
          console.log('- TTL type:', typeof record.ttl, '(value:', record.ttl, ')');
          console.log('- Priority type:', typeof record.prio, '(value:', record.prio, ')');
          console.log('- Disabled type:', typeof record.disabled, '(value:', record.disabled, ')');
        }
      } catch (recordsError) {
        console.error('❌ Error fetching DNS records:', recordsError.response?.status, recordsError.response?.data || recordsError.message);
      }
    } else {
      console.log('ℹ️  No domains found.');

      // Test domain creation
      // Note: InterServer doesn't allow subdomains, so we'll use a proper domain format
      const testDomain = `testdomain${Date.now()}.com`;
      const testIp = '192.168.1.100';

      console.log(`\n🧪 Testing domain creation (POST /dns)...`);
      console.log(`Domain: ${testDomain}, IP: ${testIp}`);

      try {
        const createResponse = await client.post('/dns', {
          domain: testDomain,
          ip: testIp
        });

        console.log('✅ Domain creation response status:', createResponse.status);
        console.log('📄 Response data:', createResponse.data);

        // Wait a moment and check if domain appears in list
        console.log('\n⏳ Waiting 2 seconds then checking domain list...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newDomainsResponse = await client.get('/dns');
        console.log('📊 Number of domains after creation:', newDomainsResponse.data?.length || 0);

        if (newDomainsResponse.data && newDomainsResponse.data.length > 0) {
          const createdDomain = newDomainsResponse.data.find(d => d.name === testDomain);
          if (createdDomain) {
            console.log('✅ Found created domain:', createdDomain);
          } else {
            console.log('⚠️  Domain created but not found in list. Available domains:');
            newDomainsResponse.data.forEach(d => console.log(`  - ${d.name} (ID: ${d.id})`));
          }
        }

      } catch (createError) {
        console.error('❌ Error creating domain:', createError.response?.status, createError.response?.data || createError.message);
      }
    }

  } catch (error) {
    console.error('❌ Error testing InterServer API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 Troubleshooting:');
      console.log('- Check that your API key is correct');
      console.log('- Verify that the API key has DNS management permissions');
      console.log('- Make sure the API key is active in your InterServer account');
    }
  }
}

console.log('🧪 InterServer API Integration Test');
console.log('=====================================');
testInterServerAPI();
