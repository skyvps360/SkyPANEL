import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addBillingCycleToPackagePricing() {
  try {
    console.log('Starting migration to add billingCycle to package_pricing...');

    await db.execute(sql`
      ALTER TABLE "package_pricing" ADD COLUMN "billing_cycle" text DEFAULT 'monthly';
    `);

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add billingCycle to package_pricing:', error);
    process.exit(1);
  }
}

addBillingCycleToPackagePricing();
