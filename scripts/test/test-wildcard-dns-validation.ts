import 'dotenv/config';
import { validateRecordName, processRecordName } from '../shared/dns-record-types';

console.log('🧪 Testing Wildcard DNS Record Validation');
console.log('=' .repeat(50));

// Test cases for wildcard validation
const testCases = [
  // Basic wildcard patterns
  { input: '*', expected: true, description: 'Basic wildcard' },
  { input: '*.@', expected: true, description: 'Wildcard with @ symbol' },
  { input: '*@', expected: true, description: 'Wildcard with @ symbol (alternative)' },
  { input: '*.subdomain', expected: true, description: 'Wildcard with subdomain' },
  { input: '*.subdomain.@', expected: true, description: 'Wildcard with subdomain and @' },
  
  // Regular subdomains (should still work)
  { input: 'www', expected: true, description: 'Regular subdomain' },
  { input: 'api.v1', expected: true, description: 'Multi-level subdomain' },
  { input: '@', expected: true, description: 'Root domain (@)' },
  { input: 'subdomain.@', expected: true, description: 'Subdomain with @' },
  
  // Invalid patterns
  { input: '**', expected: false, description: 'Double wildcard (invalid)' },
  { input: '*invalid', expected: false, description: 'Wildcard with invalid suffix' },
  { input: 'invalid*', expected: false, description: 'Wildcard in middle (invalid)' },
  { input: '', expected: true, description: 'Empty string (root domain)' },
];

console.log('\n📋 Validation Tests:');
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

console.log('\n📊 Validation Results:');
console.log(`Passed: ${passedTests}/${totalTests} tests`);

// Test record name processing
console.log('\n🔄 Testing Record Name Processing:');
console.log('-'.repeat(50));

const domainName = 'example.com';
const processingTests = [
  { input: '*', expected: '*' },
  { input: '*.@', expected: '*.example.com' },
  { input: '*@', expected: '*.example.com' },
  { input: '*.subdomain.@', expected: '*.subdomain.example.com' },
  { input: '@', expected: 'example.com' },
  { input: 'www.@', expected: 'www.example.com' },
  { input: 'api', expected: 'api' },
];

let passedProcessingTests = 0;
let totalProcessingTests = processingTests.length;

for (const test of processingTests) {
  const result = processRecordName(test.input, domainName);
  const passed = result === test.expected;
  
  console.log(`${passed ? '✅' : '❌'} Processing "${test.input}"`);
  console.log(`   Expected: "${test.expected}" | Got: "${result}"`);
  
  if (passed) passedProcessingTests++;
}

console.log('\n📊 Processing Results:');
console.log(`Passed: ${passedProcessingTests}/${totalProcessingTests} tests`);

console.log('\n🎯 Overall Results:');
console.log(`Total Tests: ${totalTests + totalProcessingTests}`);
console.log(`Total Passed: ${passedTests + passedProcessingTests}`);
console.log(`Success Rate: ${Math.round(((passedTests + passedProcessingTests) / (totalTests + totalProcessingTests)) * 100)}%`);

if (passedTests === totalTests && passedProcessingTests === totalProcessingTests) {
  console.log('\n🎉 All tests passed! Wildcard DNS validation is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.');
  process.exit(1);
}
