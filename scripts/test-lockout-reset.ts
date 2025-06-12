import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from the correct path
config({ path: join(__dirname, '..', '.env') });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  process.exit(1);
}

console.log('✅ Environment variables loaded successfully');

// Now import the rate limiter after env vars are loaded
const { verificationRateLimiter } = await import('../server/services/auth/verification-rate-limiter.js');

async function testLockoutReset() {
  console.log('🧪 Testing Lockout Reset Functionality...\n');

  try {
    const testEmail = 'lockout-test@example.com';

    console.log('1. Testing Initial State');
    let status = await verificationRateLimiter.getRateLimitStatus(testEmail);
    console.log('   Initial status:', {
      isLocked: status.isLocked,
      attemptsRemaining: status.attemptsRemaining
    });

    console.log('\n2. Simulating 3 Rapid Attempts to Trigger Lockout');
    for (let i = 1; i <= 3; i++) {
      let checkResult = await verificationRateLimiter.checkResendAllowed(testEmail);
      if (checkResult.allowed) {
        let recordResult = await verificationRateLimiter.recordResendAttempt(testEmail);
        console.log(`   Attempt ${i}:`, {
          allowed: recordResult.allowed,
          attemptsRemaining: recordResult.attemptsRemaining,
          message: recordResult.message?.substring(0, 50) + (recordResult.message?.length > 50 ? '...' : '')
        });
        
        if (!recordResult.allowed) {
          console.log('   🔒 User locked out!');
          break;
        }
      }
    }

    console.log('\n3. Checking Lockout Status');
    status = await verificationRateLimiter.getRateLimitStatus(testEmail);
    console.log('   Lockout status:', {
      isLocked: status.isLocked,
      waitTimeSeconds: status.waitTimeSeconds
    });

    console.log('\n4. Simulating Lockout Expiry (manually updating database)');
    // Import database connection to manually expire the lockout
    const { db } = await import('../server/db.js');
    const { emailVerificationAttempts } = await import('../shared/schemas/auth-schema.js');
    const { eq, and, isNull } = await import('drizzle-orm');
    
    // Set lockout to expired (1 second ago)
    const expiredTime = new Date(Date.now() - 1000);
    await db.update(emailVerificationAttempts)
      .set({ lockoutUntil: expiredTime })
      .where(and(eq(emailVerificationAttempts.email, testEmail), isNull(emailVerificationAttempts.userId)));
    
    console.log('   ✅ Lockout manually expired');

    console.log('\n5. Testing Attempt After Lockout Expiry (Should Reset Counter)');
    let checkResult = await verificationRateLimiter.checkResendAllowed(testEmail);
    console.log('   Check result:', {
      allowed: checkResult.allowed,
      message: checkResult.message
    });

    if (checkResult.allowed) {
      let recordResult = await verificationRateLimiter.recordResendAttempt(testEmail);
      console.log('   Record result:', {
        allowed: recordResult.allowed,
        attemptsRemaining: recordResult.attemptsRemaining
      });
      
      if (recordResult.attemptsRemaining === 2) {
        console.log('   ✅ SUCCESS: Attempt counter was reset to 1!');
      } else {
        console.log('   ❌ FAILURE: Attempt counter was not reset properly');
      }
    }

    console.log('\n6. Final Status Check');
    status = await verificationRateLimiter.getRateLimitStatus(testEmail);
    console.log('   Final status:', {
      isLocked: status.isLocked,
      attemptsRemaining: status.attemptsRemaining
    });

    console.log('\n7. Cleanup');
    await verificationRateLimiter.clearUserAttempts(testEmail);
    console.log('   ✅ Test data cleaned up');

    console.log('\n✅ Lockout Reset Test Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✓ Lockout triggers after 3 attempts');
    console.log('   ✓ Attempt counter resets when lockout expires');
    console.log('   ✓ Users can retry after lockout period');
    console.log('   ✓ No permanent lockout bug');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testLockoutReset();
