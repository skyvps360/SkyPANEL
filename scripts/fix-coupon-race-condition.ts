import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Fix coupon race condition by adding unique constraint
 * This prevents users from using the same coupon multiple times
 */
async function fixCouponRaceCondition() {
  try {
    console.log('Starting coupon race condition fix...');
    
    // First, remove any duplicate entries that might exist
    console.log('Removing duplicate coupon usage entries...');
    await db.execute(sql`
      DELETE FROM coupon_usage 
      WHERE id NOT IN (
        SELECT MIN(id) 
        FROM coupon_usage 
        GROUP BY user_id, coupon_id
      );
    `);
    
    // Add unique constraint to prevent duplicate coupon usage
    console.log('Adding unique constraint to prevent duplicate coupon usage...');
    await db.execute(sql`
      ALTER TABLE coupon_usage 
      ADD CONSTRAINT coupon_usage_user_coupon_unique 
      UNIQUE (user_id, coupon_id);
    `);
    
    console.log('✅ Coupon race condition fix completed successfully!');
    console.log('The system now prevents users from using the same coupon multiple times.');
    
  } catch (error: any) {
    console.error('❌ Error fixing coupon race condition:', error);
    
    // Check if constraint already exists
    if (error.message?.includes('already exists')) {
      console.log('✅ Unique constraint already exists - no action needed.');
    } else {
      throw error;
    }
  }
}

// Run the fix
fixCouponRaceCondition()
  .then(() => {
    console.log('Migration completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });