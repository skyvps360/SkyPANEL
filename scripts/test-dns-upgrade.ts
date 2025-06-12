import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { virtFusionApi } from '../server/virtfusion-api';

async function testDnsUpgrade() {
  try {
    console.log('🧪 Testing DNS Plan Upgrade Balance Retrieval...');

    // Initialize VirtFusion API
    await virtFusionApi.updateSettings();

    if (!virtFusionApi.isConfigured()) {
      throw new Error('VirtFusion API is not configured');
    }

    // Get test user
    const [user] = await db.select().from(users).where(eq(users.id, 1)).limit(1);
    if (!user) {
      throw new Error('User ID 1 not found');
    }

    console.log(`Testing with user: ${user.email}`);

    // Test the balance retrieval method that was failing
    console.log('Testing getUserHourlyStats method...');
    const balanceResponse = await virtFusionApi.getUserHourlyStats(user.id);

    if (balanceResponse?.data?.credit?.tokens) {
      const tokens = parseFloat(balanceResponse.data.credit.tokens);
      console.log(`✅ SUCCESS: User balance: ${tokens} tokens ($${(tokens / 100).toFixed(2)})`);
    } else {
      console.log('⚠️  No balance data found');
      console.log('Response:', JSON.stringify(balanceResponse, null, 2));
    }

    console.log('✅ Test completed successfully!');
    process.exit(0);

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDnsUpgrade();
