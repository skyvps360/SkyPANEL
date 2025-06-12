#!/usr/bin/env tsx

/**
 * Test script to verify Discord avatar URL generation
 * This script tests the Discord avatar URL generation logic without database dependencies
 */

// Standalone implementation of the Discord avatar URL function for testing
function getDiscordAvatarUrl(userId: string, avatarHash: string | null, size: number = 128): string {
  if (avatarHash) {
    // User has a custom avatar
    const extension = avatarHash.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${extension}?size=${size}`;
  } else {
    // User is using default avatar
    // Use BigInt to handle large Discord IDs properly
    const defaultAvatarNumber = Number(BigInt(userId) % 5n);
    return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarNumber}.png`;
  }
}

function testDiscordAvatarUrls() {
  console.log('🧪 Testing Discord avatar URL generation...\n');

  // Test cases
  const testCases = [
    {
      name: 'User with custom avatar (PNG)',
      userId: '123456789012345678',
      avatarHash: 'a1b2c3d4e5f6789012345678901234567',
      expected: 'https://cdn.discordapp.com/avatars/123456789012345678/a1b2c3d4e5f6789012345678901234567.png?size=128'
    },
    {
      name: 'User with animated avatar (GIF)',
      userId: '123456789012345678',
      avatarHash: 'a_1b2c3d4e5f6789012345678901234567',
      expected: 'https://cdn.discordapp.com/avatars/123456789012345678/a_1b2c3d4e5f6789012345678901234567.gif?size=128'
    },
    {
      name: 'User with no custom avatar (default)',
      userId: '123456789012345678',
      avatarHash: null,
      expected: 'https://cdn.discordapp.com/embed/avatars/3.png' // 123456789012345678 % 5 = 3
    },
    {
      name: 'User with different ID (default)',
      userId: '987654321098765432',
      avatarHash: null,
      expected: 'https://cdn.discordapp.com/embed/avatars/2.png' // 987654321098765432 % 5 = 2
    },
    {
      name: 'Custom size test',
      userId: '123456789012345678',
      avatarHash: 'a1b2c3d4e5f6789012345678901234567',
      size: 256,
      expected: 'https://cdn.discordapp.com/avatars/123456789012345678/a1b2c3d4e5f6789012345678901234567.png?size=256'
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`  Input: userId="${testCase.userId}", avatarHash="${testCase.avatarHash}", size=${testCase.size || 128}`);
    
    const result = getDiscordAvatarUrl(
      testCase.userId,
      testCase.avatarHash,
      testCase.size || 128
    );
    
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${result}`);
    
    if (result === testCase.expected) {
      console.log(`  ✅ PASS\n`);
      passedTests++;
    } else {
      console.log(`  ❌ FAIL\n`);
    }
  });

  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed!');
    return false;
  }
}

// Run the test
const success = testDiscordAvatarUrls();
process.exit(success ? 0 : 1);
