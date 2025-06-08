import 'dotenv/config';
import { validateRecordName } from '../shared/dns-record-types';

console.log('🧪 Testing Frontend Wildcard DNS Record Validation');
console.log('=' .repeat(50));

// Test cases that should work in the frontend forms
const testCases = [
  // Basic wildcard patterns that users might enter
  { input: '*', expected: true, description: 'Basic wildcard (catch-all)' },
  { input: '*.@', expected: true, description: 'Wildcard for root domain' },
  { input: '*@', expected: true, description: 'Wildcard for root domain (alternative)' },
  { input: '*.subdomain', expected: true, description: 'Wildcard for specific subdomain' },
  { input: '*.subdomain.@', expected: true, description: 'Wildcard for subdomain of root domain' },
  { input: '*.www', expected: true, description: 'Wildcard for www subdomain' },
  { input: '*.api', expected: true, description: 'Wildcard for api subdomain' },
  { input: '*.mail', expected: true, description: 'Wildcard for mail subdomain' },
  
  // Regular patterns (should still work)
  { input: '@', expected: true, description: 'Root domain' },
  { input: '', expected: true, description: 'Empty string (root domain)' },
  { input: 'www', expected: true, description: 'Regular subdomain' },
  { input: 'api.v1', expected: true, description: 'Multi-level subdomain' },
  { input: 'subdomain.@', expected: true, description: 'Subdomain with @ notation' },
  { input: 'subdomain@', expected: true, description: 'Subdomain with @ notation (alternative)' },
  
  // Invalid patterns (should be rejected)
  { input: '**', expected: false, description: 'Double wildcard (invalid)' },
  { input: '*invalid', expected: false, description: 'Wildcard with invalid suffix' },
  { input: 'invalid*', expected: false, description: 'Wildcard in middle (invalid)' },
  { input: '*.', expected: true, description: 'Wildcard with dot (valid)' },
  { input: '*..subdomain', expected: false, description: 'Wildcard with double dots (invalid)' },
  { input: '*.subdomain.', expected: false, description: 'Wildcard ending with dot (invalid)' },
  { input: '*.-invalid', expected: false, description: 'Wildcard with invalid subdomain (starts with hyphen)' },
  { input: '*.invalid-', expected: false, description: 'Wildcard with invalid subdomain (ends with hyphen)' },
];

console.log('\n📋 Frontend Validation Tests:');
console.log('-'.repeat(50));

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  const result = validateRecordName(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`${passed ? '✅' : '❌'} ${testCase.description}`);
  console.log(`   Input: "${testCase.input}" | Expected: ${testCase.expected} | Got: ${result}`);
  
  if (passed) passedTests++;
}

console.log('\n📊 Frontend Validation Results:');
console.log(`Passed: ${passedTests}/${totalTests} tests`);
console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

// Test specific wildcard use cases that users might want to create
console.log('\n🎯 Common Wildcard Use Cases:');
console.log('-'.repeat(50));

const useCases = [
  { input: '*', description: 'Catch-all wildcard for any subdomain' },
  { input: '*.@', description: 'Catch-all wildcard for root domain' },
  { input: '*.api', description: 'Wildcard for API versioning (*.api.domain.com)' },
  { input: '*.cdn', description: 'Wildcard for CDN endpoints (*.cdn.domain.com)' },
  { input: '*.staging', description: 'Wildcard for staging environments' },
  { input: '*.dev', description: 'Wildcard for development environments' },
];

for (const useCase of useCases) {
  const result = validateRecordName(useCase.input);
  console.log(`${result ? '✅' : '❌'} ${useCase.description}: "${useCase.input}"`);
}

if (passedTests === totalTests) {
  console.log('\n🎉 All frontend validation tests passed! Users can now create and edit wildcard DNS records.');
} else {
  console.log('\n⚠️  Some frontend validation tests failed. Please review the implementation.');
  process.exit(1);
}
