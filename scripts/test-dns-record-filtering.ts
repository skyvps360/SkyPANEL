import 'dotenv/config';
import { 
  isDefaultInterServerRecord, 
  filterUserCreatedRecords, 
  countUserCreatedRecords,
  getDnsRecordUsageStats 
} from '../shared/dns-record-utils';

// Test data representing typical InterServer default records
const testDomain = 'example.com';

const mockRecords = [
  // Default InterServer records (should be filtered out)
  {
    id: '1',
    name: 'example.com.',
    type: 'SOA',
    content: 'ns1.interserver.net. admin.example.com. 2024010101 10800 3600 604800 86400',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '2',
    name: 'example.com.',
    type: 'NS',
    content: 'ns1.interserver.net.',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '3',
    name: 'example.com.',
    type: 'NS',
    content: 'ns2.interserver.net.',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '4',
    name: 'example.com.',
    type: 'NS',
    content: 'ns3.interserver.net.',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '5',
    name: 'example.com.',
    type: 'A',
    content: '192.168.1.100',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '6',
    name: '*.example.com.',
    type: 'A',
    content: '192.168.1.100',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '7',
    name: 'localhost.example.com.',
    type: 'A',
    content: '192.168.1.100',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '8',
    name: 'example.com.',
    type: 'MX',
    content: 'mail.example.com.',
    ttl: '86400',
    prio: '10',
    disabled: '0'
  },
  {
    id: '9',
    name: 'example.com.',
    type: 'MX',
    content: 'example.com.',
    ttl: '86400',
    prio: '20',
    disabled: '0'
  },
  
  // User-created records (should NOT be filtered out)
  {
    id: '10',
    name: 'www.example.com.',
    type: 'A',
    content: '192.168.1.101',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '11',
    name: 'api.example.com.',
    type: 'A',
    content: '192.168.1.102',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '12',
    name: 'blog.example.com.',
    type: 'CNAME',
    content: 'www.example.com.',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '13',
    name: 'example.com.',
    type: 'TXT',
    content: 'v=spf1 include:_spf.google.com ~all',
    ttl: '86400',
    prio: '0',
    disabled: '0'
  },
  {
    id: '14',
    name: 'custom.example.com.',
    type: 'MX',
    content: 'mail.customdomain.com.',
    ttl: '86400',
    prio: '10',
    disabled: '0'
  }
];

function runTests() {
  console.log('🧪 Testing DNS Record Filtering Logic\n');
  console.log(`Domain: ${testDomain}`);
  console.log(`Total test records: ${mockRecords.length}\n`);

  // Test individual record filtering
  console.log('📋 Individual Record Tests:');
  console.log('=' .repeat(50));
  console.log('Note: SYSTEM records can be edited/deleted but don\'t count toward plan limits\n');

  mockRecords.forEach((record, index) => {
    const isDefault = isDefaultInterServerRecord(record, testDomain);
    const status = isDefault ? '🔒 SYSTEM (No Billing)' : '👤 USER (Billable)';
    console.log(`${status} | ${record.type.padEnd(5)} | ${record.name.padEnd(25)} | ${record.content.substring(0, 30)}`);
  });

  // Test filtering functions
  console.log('\n📊 Filtering Results:');
  console.log('=' .repeat(50));
  
  const userRecords = filterUserCreatedRecords(mockRecords, testDomain);
  const userRecordCount = countUserCreatedRecords(mockRecords, testDomain);
  const usageStats = getDnsRecordUsageStats(mockRecords, testDomain);

  console.log(`Total records: ${mockRecords.length}`);
  console.log(`System records (manageable, no billing): ${usageStats.default}`);
  console.log(`User-created records (billable): ${usageStats.userCreated}`);
  console.log(`User record count (function): ${userRecordCount}`);

  // Verify expected results
  console.log('\n✅ Validation:');
  console.log('=' .repeat(50));

  const expectedSystemRecords = 9; // SOA + 3 NS + 3 A + 2 MX (manageable but not billable)
  const expectedUserRecords = 5;   // www A + api A + blog CNAME + TXT + custom MX (billable)
  
  const systemRecordsCorrect = usageStats.default === expectedSystemRecords;
  const userRecordsCorrect = usageStats.userCreated === expectedUserRecords;
  
  console.log(`System records: ${usageStats.default}/${expectedSystemRecords} ${systemRecordsCorrect ? '✅' : '❌'}`);
  console.log(`User records: ${usageStats.userCreated}/${expectedUserRecords} ${userRecordsCorrect ? '✅' : '❌'}`);
  
  if (systemRecordsCorrect && userRecordsCorrect) {
    console.log('\n🎉 All tests passed! Filtering logic is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please review the filtering logic.');
  }

  // Show user-created records
  console.log('\n👤 User-Created Records:');
  console.log('=' .repeat(50));
  userRecords.forEach(record => {
    console.log(`${record.type.padEnd(5)} | ${record.name.padEnd(25)} | ${record.content}`);
  });
}

// Additional edge case tests
function runEdgeCaseTests() {
  console.log('\n🔬 Edge Case Tests:');
  console.log('=' .repeat(50));

  // Test with domain names that have trailing dots
  const edgeCases = [
    {
      record: { id: '1', name: 'example.com', type: 'A', content: '1.1.1.1', ttl: '86400', prio: '0', disabled: '0' },
      domain: 'example.com.',
      expected: true,
      description: 'Root A record with trailing dot in domain'
    },
    {
      record: { id: '2', name: '*.example.com.', type: 'A', content: '1.1.1.1', ttl: '86400', prio: '0', disabled: '0' },
      domain: 'example.com',
      expected: true,
      description: 'Wildcard A record with trailing dot in record name'
    },
    {
      record: { id: '3', name: 'subdomain.example.com.', type: 'A', content: '1.1.1.1', ttl: '86400', prio: '0', disabled: '0' },
      domain: 'example.com',
      expected: false,
      description: 'Custom subdomain A record (should not be filtered)'
    },
    {
      record: { id: '4', name: 'example.com.', type: 'MX', content: 'mail.otherdomain.com', ttl: '86400', prio: '10', disabled: '0' },
      domain: 'example.com',
      expected: false,
      description: 'MX record pointing to external domain (should not be filtered)'
    }
  ];

  edgeCases.forEach((testCase, index) => {
    const result = isDefaultInterServerRecord(testCase.record, testCase.domain);
    const status = result === testCase.expected ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
  });
}

// Run all tests
runTests();
runEdgeCaseTests();
