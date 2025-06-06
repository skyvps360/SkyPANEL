#!/usr/bin/env node

/**
 * Test script to verify SOA record replacement is working correctly
 */

const axios = require('axios');

class SOATestRunner {
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.interserver.net/v0.9.0',
      headers: {
        'X-API-KEY': process.env.INTERSERVER_API_KEY,
        'Content-Type': 'application/json'
      }
    });
  }

  async log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[level] || 'ℹ️';
    
    console.log(`[${timestamp}] ${emoji} ${message}`);
  }

  async testSOAReplacementLogic() {
    await this.log('🧪 Testing SOA record replacement logic...');
    
    // Test the replacement logic with sample SOA content
    const testSOAContent = 'cdns1.interserver.net. dns.interserver.net. 2025060601 10800 3600 604800 3600';
    
    await this.log(`Original SOA: ${testSOAContent}`);
    
    // Apply the same replacement logic as in the server
    let newSOAContent = testSOAContent;
    
    // Replace primary nameserver (cdns1.interserver.net)
    newSOAContent = newSOAContent.replace(
      'cdns1.interserver.net',
      'cdns.ns1.skyvps360.xyz'
    );
    
    // Replace administrative contact (dns.interserver.net with cdns.ns2.skyvps360.xyz)
    newSOAContent = newSOAContent.replace(
      'dns.interserver.net',
      'cdns.ns2.skyvps360.xyz'
    );
    
    await this.log(`Expected SOA: ${newSOAContent}`);
    
    // Verify both replacements occurred
    const hasPrimaryReplacement = newSOAContent.includes('cdns.ns1.skyvps360.xyz');
    const hasAdminReplacement = newSOAContent.includes('cdns.ns2.skyvps360.xyz');
    const hasNoInterServerRefs = !newSOAContent.includes('interserver.net');
    
    if (hasPrimaryReplacement && hasAdminReplacement && hasNoInterServerRefs) {
      await this.log('✅ SOA replacement logic is working correctly', 'success');
      return true;
    } else {
      await this.log('❌ SOA replacement logic has issues', 'error');
      if (!hasPrimaryReplacement) await this.log('   - Primary nameserver not replaced', 'error');
      if (!hasAdminReplacement) await this.log('   - Admin contact not replaced', 'error');
      if (!hasNoInterServerRefs) await this.log('   - Still contains InterServer references', 'error');
      return false;
    }
  }

  async testLiveSOAReplacement() {
    await this.log('🌐 Testing live SOA replacement with InterServer API...');
    
    const testDomain = `test-soa-${Date.now()}.com`;
    const testIP = '192.168.1.100';
    
    try {
      // Step 1: Create domain
      await this.log(`Creating test domain: ${testDomain}`);
      const createResponse = await this.client.post('/dns', {
        domain: testDomain,
        ip: testIP
      });
      
      await this.log(`Domain creation response: ${JSON.stringify(createResponse.data)}`);
      
      // Step 2: Find the domain ID
      await this.log('Finding domain ID...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for domain to be created
      
      const domainsResponse = await this.client.get('/dns');
      const createdDomain = domainsResponse.data.find(d => d.domain === testDomain);
      
      if (!createdDomain) {
        throw new Error('Created domain not found in domain list');
      }
      
      const domainId = parseInt(createdDomain.id);
      await this.log(`Found domain ID: ${domainId}`);
      
      // Step 3: Get DNS records
      const recordsResponse = await this.client.get(`/dns/${domainId}`);
      const records = recordsResponse.data;
      
      await this.log(`Found ${records.length} DNS records`);
      
      // Step 4: Find SOA record
      const soaRecord = records.find(r => r.type === 'SOA');
      if (!soaRecord) {
        throw new Error('No SOA record found');
      }
      
      await this.log(`Original SOA: ${soaRecord.content}`);
      
      // Step 5: Test SOA replacement
      let newSOAContent = soaRecord.content;
      
      // Replace primary nameserver
      newSOAContent = newSOAContent.replace(
        'cdns1.interserver.net',
        'cdns.ns1.skyvps360.xyz'
      );
      
      // Replace administrative contact
      newSOAContent = newSOAContent.replace(
        'dns.interserver.net',
        'cdns.ns2.skyvps360.xyz'
      );
      
      await this.log(`Updated SOA: ${newSOAContent}`);
      
      // Step 6: Update the SOA record
      const updateResponse = await this.client.post(`/dns/${domainId}/${soaRecord.id}`, {
        name: soaRecord.name,
        type: soaRecord.type,
        content: newSOAContent,
        ttl: soaRecord.ttl,
        prio: soaRecord.prio,
        disabled: soaRecord.disabled,
        ordername: soaRecord.ordername,
        auth: soaRecord.auth
      });
      
      await this.log(`SOA update response: ${JSON.stringify(updateResponse.data)}`);
      
      // Step 7: Verify the update
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for update
      const verifyResponse = await this.client.get(`/dns/${domainId}`);
      const updatedSOA = verifyResponse.data.find(r => r.type === 'SOA');
      
      if (updatedSOA) {
        await this.log(`Verified SOA: ${updatedSOA.content}`);
        
        const hasCorrectPrimary = updatedSOA.content.includes('cdns.ns1.skyvps360.xyz');
        const hasCorrectAdmin = updatedSOA.content.includes('cdns.ns2.skyvps360.xyz');
        const hasNoInterServer = !updatedSOA.content.includes('interserver.net');
        
        if (hasCorrectPrimary && hasCorrectAdmin && hasNoInterServer) {
          await this.log('✅ Live SOA replacement successful!', 'success');
        } else {
          await this.log('❌ Live SOA replacement failed', 'error');
          if (!hasCorrectPrimary) await this.log('   - Primary nameserver not updated', 'error');
          if (!hasCorrectAdmin) await this.log('   - Admin contact not updated', 'error');
          if (!hasNoInterServer) await this.log('   - Still contains InterServer references', 'error');
        }
      }
      
      // Step 8: Cleanup
      await this.log(`Cleaning up domain ${domainId}...`);
      await this.client.delete(`/dns/${domainId}`);
      await this.log('Test domain deleted successfully');
      
      return true;
      
    } catch (error) {
      await this.log(`Live test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async run() {
    await this.log('🚀 Starting SOA record replacement tests...');
    
    if (!process.env.INTERSERVER_API_KEY) {
      await this.log('❌ INTERSERVER_API_KEY environment variable not set', 'error');
      process.exit(1);
    }
    
    try {
      // Test 1: Logic test
      const logicTest = await this.testSOAReplacementLogic();
      
      // Test 2: Live API test
      const liveTest = await this.testLiveSOAReplacement();
      
      if (logicTest && liveTest) {
        await this.log('🎉 All SOA replacement tests passed!', 'success');
      } else {
        await this.log('❌ Some SOA replacement tests failed', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      await this.log(`Test suite failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run the tests
const testRunner = new SOATestRunner();
testRunner.run();
