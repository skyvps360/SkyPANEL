#!/usr/bin/env tsx

/**
 * Test script for nameserver replacement functionality
 * This script demonstrates how the automated nameserver replacement works
 */

import { interServerApi } from '../server/interserver-api';

// White-labeled nameservers
const SKYPANEL_NAMESERVERS = [
  'cdns.ns1.skyvps360.xyz',
  'cdns.ns2.skyvps360.xyz', 
  'cdns.ns3.skyvps360.xyz'
];

// InterServer default nameservers to replace
const INTERSERVER_NAMESERVERS = [
  'cdns1.interserver.net',
  'cdns2.interserver.net',
  'cdns3.interserver.net'
];

/**
 * Replace InterServer nameservers with white-labeled SkyPANEL nameservers
 */
async function replaceNameservers(domainId: number, domainName: string): Promise<void> {
  try {
    console.log(`\n🔄 Starting nameserver replacement for domain: ${domainName} (ID: ${domainId})`);
    
    // Get current DNS records
    console.log('📋 Fetching current DNS records...');
    const records = await interServerApi.getDnsDomain(domainId);
    
    // Find and delete InterServer NS records
    console.log('🗑️  Removing InterServer nameservers...');
    for (const record of records) {
      if (record.type === 'NS' && INTERSERVER_NAMESERVERS.includes(record.content)) {
        try {
          await interServerApi.deleteDnsRecord(domainId, parseInt(record.id));
          console.log(`   ✅ Deleted: ${record.content}`);
        } catch (error) {
          console.error(`   ❌ Failed to delete: ${record.content}`, error.message);
        }
      }
    }
    
    // Add white-labeled nameservers
    console.log('➕ Adding SkyPANEL nameservers...');
    for (const nameserver of SKYPANEL_NAMESERVERS) {
      try {
        await interServerApi.addDnsRecord(domainId, {
          name: domainName,
          type: 'NS',
          content: nameserver,
          ttl: '86400',
          prio: '0',
          disabled: '0',
          ordername: '',
          auth: '1'
        });
        console.log(`   ✅ Added: ${nameserver}`);
      } catch (error) {
        console.error(`   ❌ Failed to add: ${nameserver}`, error.message);
      }
    }
    
    // Update SOA record to use SkyPANEL nameserver
    console.log('🔧 Updating SOA record...');
    const soaRecord = records.find(r => r.type === 'SOA');
    if (soaRecord) {
      try {
        // SOA format: primary-ns email serial refresh retry expire minimum
        const soaParts = soaRecord.content.split(' ');
        if (soaParts.length >= 7) {
          const originalSoa = soaRecord.content;
          
          // Replace primary nameserver with our white-labeled one
          soaParts[0] = SKYPANEL_NAMESERVERS[0];
          // Replace email with SkyPANEL domain
          soaParts[1] = `admin.skyvps360.xyz`;
          
          await interServerApi.updateDnsRecord(domainId, parseInt(soaRecord.id), {
            name: soaRecord.name,
            type: 'SOA',
            content: soaParts.join(' '),
            ttl: soaRecord.ttl,
            prio: soaRecord.prio,
            disabled: soaRecord.disabled,
            ordername: soaRecord.ordername || '',
            auth: soaRecord.auth || '1'
          });
          
          console.log(`   ✅ SOA updated:`);
          console.log(`      Before: ${originalSoa}`);
          console.log(`      After:  ${soaParts.join(' ')}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to update SOA record:`, error.message);
      }
    } else {
      console.log(`   ⚠️  No SOA record found`);
    }
    
    console.log(`\n✅ Nameserver replacement completed for ${domainName}`);
  } catch (error) {
    console.error(`\n❌ Error replacing nameservers for domain ${domainName}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 SkyPANEL Nameserver Replacement Test');
  console.log('=====================================');
  
  try {
    // Get list of domains to test with
    const domains = await interServerApi.getDnsList();
    
    if (domains.length === 0) {
      console.log('❌ No domains found to test with');
      return;
    }
    
    console.log(`📋 Found ${domains.length} domain(s):`);
    domains.forEach((domain, index) => {
      console.log(`   ${index + 1}. ${domain.name} (ID: ${domain.id})`);
    });
    
    // Test with the first domain
    const testDomain = domains[0];
    console.log(`\n🎯 Testing with domain: ${testDomain.name}`);
    
    await replaceNameservers(testDomain.id, testDomain.name);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { replaceNameservers };
