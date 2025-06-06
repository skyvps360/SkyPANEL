#!/usr/bin/env node

/**
 * Test script for white-labeled nameserver replacement functionality
 * This script tests the new SkyPANEL DNS nameserver replacement system
 */

const axios = require('axios');
require('dotenv').config();

const INTERSERVER_API_KEY = process.env.INTERSERVER_API_KEY;
const BASE_URL = 'https://my.interserver.net/apiv2';

if (!INTERSERVER_API_KEY) {
  console.error('❌ INTERSERVER_API_KEY environment variable is required');
  process.exit(1);
}

// Test domain configuration
const TEST_DOMAIN = 'test-whitelabel-' + Date.now() + '.com';
const TEST_IP = '192.168.1.100';

// Expected nameserver mappings
const EXPECTED_NAMESERVERS = {
  'cdns1.interserver.net': 'cdns.ns1.skyvps360.xyz',
  'cdns2.interserver.net': 'cdns.ns2.skyvps360.xyz',
  'cdns3.interserver.net': 'cdns.ns3.skyvps360.xyz'
};

class WhitelabelTester {
  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        'X-API-KEY': INTERSERVER_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    this.createdDomainId = null;
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async testDirectInterServerAPI() {
    await this.log('Testing direct InterServer API domain creation...');
    
    try {
      // Create domain directly via InterServer API
      const createResponse = await this.client.post('/dns', {
        domain: TEST_DOMAIN,
        ip: TEST_IP
      });

      await this.log(`Domain creation response: ${JSON.stringify(createResponse.data)}`, 'success');

      // Wait for domain to be created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Get domain list to find the created domain
      const listResponse = await this.client.get('/dns');
      const createdDomain = listResponse.data.find(d => d.name === TEST_DOMAIN);

      if (!createdDomain) {
        throw new Error('Created domain not found in domain list');
      }

      this.createdDomainId = createdDomain.id;
      await this.log(`Found created domain with ID: ${this.createdDomainId}`, 'success');

      // Get DNS records for the domain
      const recordsResponse = await this.client.get(`/dns/${this.createdDomainId}`);
      const records = recordsResponse.data;

      await this.log(`Found ${records.length} DNS records for domain ${TEST_DOMAIN}`);

      // Analyze the default records
      const nsRecords = records.filter(r => r.type === 'NS');
      const soaRecords = records.filter(r => r.type === 'SOA');

      await this.log(`NS Records found: ${nsRecords.length}`);
      nsRecords.forEach(record => {
        this.log(`  - ${record.name} NS ${record.content} (ID: ${record.id})`);
      });

      await this.log(`SOA Records found: ${soaRecords.length}`);
      soaRecords.forEach(record => {
        this.log(`  - ${record.name} SOA ${record.content.substring(0, 100)}... (ID: ${record.id})`);
      });

      return {
        domainId: this.createdDomainId,
        nsRecords,
        soaRecords,
        allRecords: records
      };

    } catch (error) {
      await this.log(`Error in direct API test: ${error.message}`, 'error');
      throw error;
    }
  }

  async testNameserverReplacement(domainData) {
    await this.log('Testing nameserver replacement...');

    try {
      const { domainId, nsRecords, soaRecords } = domainData;

      // Test replacing NS records
      for (const nsRecord of nsRecords) {
        const oldNameserver = nsRecord.content;
        const newNameserver = EXPECTED_NAMESERVERS[oldNameserver];

        if (newNameserver) {
          await this.log(`Replacing NS record: ${oldNameserver} → ${newNameserver}`);

          const updateResponse = await this.client.post(`/dns/${domainId}/${nsRecord.id}`, {
            name: nsRecord.name,
            type: nsRecord.type,
            content: newNameserver,
            ttl: nsRecord.ttl,
            prio: nsRecord.prio,
            disabled: nsRecord.disabled,
            ordername: nsRecord.ordername,
            auth: nsRecord.auth
          });

          await this.log(`NS record update response: ${JSON.stringify(updateResponse.data)}`, 'success');
        } else {
          await this.log(`No replacement mapping found for nameserver: ${oldNameserver}`, 'warning');
        }
      }

      // Test replacing SOA record
      for (const soaRecord of soaRecords) {
        if (soaRecord.content.includes('cdns1.interserver.net') || soaRecord.content.includes('dns.interserver.net')) {
          let newSoaContent = soaRecord.content;

          // Replace primary nameserver
          newSoaContent = newSoaContent.replace(
            'cdns1.interserver.net',
            'cdns.ns1.skyvps360.xyz'
          );

          // Replace administrative contact
          newSoaContent = newSoaContent.replace(
            'dns.interserver.net',
            'cdns.ns2.skyvps360.xyz'
          );

          await this.log(`Replacing SOA record with SkyPANEL nameservers (primary and admin contact)`);
          await this.log(`  Old: ${soaRecord.content}`);
          await this.log(`  New: ${newSoaContent}`);

          const updateResponse = await this.client.post(`/dns/${domainId}/${soaRecord.id}`, {
            name: soaRecord.name,
            type: soaRecord.type,
            content: newSoaContent,
            ttl: soaRecord.ttl,
            prio: soaRecord.prio,
            disabled: soaRecord.disabled,
            ordername: soaRecord.ordername,
            auth: soaRecord.auth
          });

          await this.log(`SOA record update response: ${JSON.stringify(updateResponse.data)}`, 'success');
        }
      }

      // Verify the changes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const verifyResponse = await this.client.get(`/dns/${domainId}`);
      const updatedRecords = verifyResponse.data;

      await this.log('Verifying nameserver replacement...');
      
      const updatedNsRecords = updatedRecords.filter(r => r.type === 'NS');
      const updatedSoaRecords = updatedRecords.filter(r => r.type === 'SOA');

      let replacementSuccess = true;

      // Check NS records
      for (const nsRecord of updatedNsRecords) {
        const isSkyPanelNS = Object.values(EXPECTED_NAMESERVERS).includes(nsRecord.content);
        if (isSkyPanelNS) {
          await this.log(`✅ NS record successfully replaced: ${nsRecord.content}`, 'success');
        } else {
          await this.log(`❌ NS record not replaced: ${nsRecord.content}`, 'error');
          replacementSuccess = false;
        }
      }

      // Check SOA records
      for (const soaRecord of updatedSoaRecords) {
        const hasSkyPanelPrimary = soaRecord.content.includes('cdns.ns1.skyvps360.xyz');
        const hasSkyPanelAdmin = soaRecord.content.includes('cdns.ns2.skyvps360.xyz');
        const hasInterServerPrimary = soaRecord.content.includes('cdns1.interserver.net');
        const hasInterServerAdmin = soaRecord.content.includes('dns.interserver.net');

        if (hasSkyPanelPrimary && hasSkyPanelAdmin) {
          await this.log(`✅ SOA record fully replaced with SkyPANEL nameservers (primary and admin contact)`, 'success');
        } else if (hasSkyPanelPrimary && !hasSkyPanelAdmin) {
          await this.log(`⚠️ SOA record partially replaced - primary nameserver updated but admin contact still InterServer`, 'warning');
          replacementSuccess = false;
        } else if (hasInterServerPrimary || hasInterServerAdmin) {
          await this.log(`❌ SOA record not fully replaced, still contains InterServer references`, 'error');
          replacementSuccess = false;
        }
      }

      return replacementSuccess;

    } catch (error) {
      await this.log(`Error in nameserver replacement test: ${error.message}`, 'error');
      throw error;
    }
  }

  async cleanup() {
    if (this.createdDomainId) {
      try {
        await this.log(`Cleaning up test domain (ID: ${this.createdDomainId})...`);
        await this.client.delete(`/dns/${this.createdDomainId}`);
        await this.log('Test domain deleted successfully', 'success');
      } catch (error) {
        await this.log(`Error cleaning up test domain: ${error.message}`, 'warning');
      }
    }
  }

  async runFullTest() {
    await this.log('🚀 Starting white-labeled nameserver replacement test...');
    
    try {
      // Test 1: Create domain and analyze default records
      const domainData = await this.testDirectInterServerAPI();
      
      // Test 2: Replace nameservers
      const replacementSuccess = await this.testNameserverReplacement(domainData);
      
      if (replacementSuccess) {
        await this.log('🎉 All tests passed! White-labeled nameserver replacement is working correctly.', 'success');
      } else {
        await this.log('⚠️ Some tests failed. Please review the nameserver replacement logic.', 'warning');
      }

    } catch (error) {
      await this.log(`Test failed: ${error.message}`, 'error');
    } finally {
      await this.cleanup();
    }
  }
}

// Run the test
const tester = new WhitelabelTester();
tester.runFullTest().catch(console.error);
