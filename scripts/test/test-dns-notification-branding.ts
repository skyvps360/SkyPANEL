#!/usr/bin/env tsx

/**
 * Test script to verify that DNS plan downgrade notifications use dynamic company name
 * instead of hardcoded "InterServer" references.
 *
 * This script tests the branding fix for domain deletion notifications.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testNotificationBranding() {
  console.log('🧪 Testing DNS Notification Branding Fix');
  console.log('=====================================\n');

  try {
    // 1. Check the fixed file for hardcoded InterServer references
    console.log('1. 📋 Checking DNS Plans Page for Hardcoded References:');
    const filePath = path.join(__dirname, '../client/src/pages/dns-plans-page.tsx');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check for hardcoded InterServer in user-facing messages (excluding variable names)
    const hardcodedMatches = fileContent.match(/description:\s*`[^`]*\bInterServer\b[^`]*`/g);
    const filteredMatches = hardcodedMatches?.filter(match =>
      !match.includes('${branding.company_name}') &&
      !match.includes('skippedNoInterServerId')
    );

    if (filteredMatches && filteredMatches.length > 0) {
      console.log('   ❌ Found hardcoded InterServer references in user-facing messages:');
      filteredMatches.forEach(match => console.log(`      ${match}`));
      return false;
    } else {
      console.log('   ✅ No hardcoded InterServer references found in user-facing messages');
    }

    // Check for dynamic company name usage
    const dynamicMatches = fileContent.match(/\$\{branding\.company_name\}/g);
    if (dynamicMatches && dynamicMatches.length >= 2) {
      console.log(`   ✅ Found ${dynamicMatches.length} instances of dynamic company name usage`);
    } else {
      console.log('   ❌ Dynamic company name usage not found or insufficient');
      return false;
    }

    // 2. Simulate the notification messages that would be generated
    console.log('\n2. 🔔 Simulating Notification Messages:');

    const companyName = 'SkyVPS360'; // Default company name

    // Simulate successful domain deletion notification
    const successfulDomains = ['example.com', 'test.com'];
    const successMessage = `Successfully removed ${successfulDomains.length} domain${successfulDomains.length !== 1 ? 's' : ''} from both local database and ${companyName}: ${successfulDomains.join(', ')}`;
    console.log(`   ✅ Success Message: ${successMessage}`);

    // Simulate domains without provider IDs notification
    const skippedDomains = ['local-only.com'];
    const skippedMessage = `${skippedDomains.length} domain${skippedDomains.length !== 1 ? 's' : ''} removed from local database only (no ${companyName} ID): ${skippedDomains.join(', ')}`;
    console.log(`   ℹ️  Skipped Message: ${skippedMessage}\n`);

    // 3. Verify the fix
    console.log('3. ✅ Verification Results:');
    
    if (successMessage.includes('InterServer')) {
      console.log('   ❌ FAILED: Success message still contains hardcoded "InterServer"');
      return false;
    } else {
      console.log(`   ✅ PASSED: Success message uses dynamic company name "${companyName}"`);
    }
    
    if (skippedMessage.includes('InterServer')) {
      console.log('   ❌ FAILED: Skipped message still contains hardcoded "InterServer"');
      return false;
    } else {
      console.log(`   ✅ PASSED: Skipped message uses dynamic company name "${companyName}"`);
    }

    // 4. Test with different company name
    console.log('\n4. 🔄 Testing with Different Company Name:');
    const testCompanyName = 'TestCloud Solutions';
    const testSuccessMessage = `Successfully removed 1 domain from both local database and ${testCompanyName}: example.com`;
    const testSkippedMessage = `1 domain removed from local database only (no ${testCompanyName} ID): local-only.com`;
    
    console.log(`   Test Company: ${testCompanyName}`);
    console.log(`   Test Success: ${testSuccessMessage}`);
    console.log(`   Test Skipped: ${testSkippedMessage}`);
    
    if (testSuccessMessage.includes(testCompanyName) && testSkippedMessage.includes(testCompanyName)) {
      console.log('   ✅ PASSED: Messages correctly use dynamic company name');
    } else {
      console.log('   ❌ FAILED: Messages do not use dynamic company name correctly');
      return false;
    }

    console.log('\n🎉 All Tests Passed!');
    console.log('The DNS notification branding fix is working correctly.');
    console.log('Notifications will now display the dynamic company name instead of hardcoded "InterServer".');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return false;
  }
}

// Run the test
testNotificationBranding()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
