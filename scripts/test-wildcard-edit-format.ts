import 'dotenv/config';

// Import the convertToEditFormat function from the EditRecordDialog
// Since it's a local function, we'll copy it here for testing
function convertToEditFormat(recordName: string, domainName: string): string {
  const trimmed = recordName.trim();

  // Convert domain name to "@" for root domain
  if (trimmed === domainName) {
    return '@';
  }

  // Handle wildcard patterns
  if (trimmed.startsWith('*.')) {
    // Convert "*.domain.com" to "*.@" for wildcard root domain
    if (trimmed === `*.${domainName}`) {
      return '*.@';
    }
    // Convert "*.subdomain.domain.com" to "*.subdomain.@" for wildcard subdomains
    if (trimmed.endsWith(`.${domainName}`)) {
      const subdomain = trimmed.slice(2, -(domainName.length + 1)); // Remove "*." prefix and ".domain.com" suffix
      return `*.${subdomain}.@`;
    }
  }

  // Convert "subdomain.domain.com" to "subdomain.@" for subdomains
  if (trimmed.endsWith(`.${domainName}`)) {
    const subdomain = trimmed.slice(0, -(domainName.length + 1));
    return `${subdomain}.@`;
  }

  // Return as-is if it doesn't match domain patterns (e.g., regular subdomains, wildcards)
  return trimmed;
}

console.log('🧪 Testing Wildcard Edit Format Conversion');
console.log('=' .repeat(50));

const domainName = 'example.com';

// Test cases for edit format conversion
const testCases = [
  // Regular domain conversions
  { input: 'example.com', expected: '@', description: 'Root domain to @' },
  { input: 'www.example.com', expected: 'www.@', description: 'Subdomain to @ notation' },
  { input: 'api.v1.example.com', expected: 'api.v1.@', description: 'Multi-level subdomain to @ notation' },
  
  // Wildcard domain conversions
  { input: '*.example.com', expected: '*.@', description: 'Wildcard root domain to *.@' },
  { input: '*.www.example.com', expected: '*.www.@', description: 'Wildcard subdomain to *.subdomain.@' },
  { input: '*.api.v1.example.com', expected: '*.api.v1.@', description: 'Wildcard multi-level subdomain' },
  
  // Records that should remain unchanged
  { input: 'mail', expected: 'mail', description: 'Simple subdomain (no domain suffix)' },
  { input: '*.mail', expected: '*.mail', description: 'Wildcard subdomain (no domain suffix)' },
  { input: '*', expected: '*', description: 'Basic wildcard' },
  { input: 'external.domain.org', expected: 'external.domain.org', description: 'External domain (different suffix)' },
];

console.log('\n📋 Edit Format Conversion Tests:');
console.log('-'.repeat(50));

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  const result = convertToEditFormat(testCase.input, domainName);
  const passed = result === testCase.expected;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
  console.log(`   Input: "${testCase.input}" | Expected: "${testCase.expected}" | Got: "${result}"`);
  
  if (passed) passedTests++;
}

console.log('\n📊 Edit Format Results:');
console.log(`Passed: ${passedTests}/${totalTests} tests`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All edit format tests passed! Wildcard edit format conversion is working correctly.');
} else {
  console.log('\n⚠️  Some edit format tests failed. Please review the implementation.');
  process.exit(1);
}
