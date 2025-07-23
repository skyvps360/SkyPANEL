import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Fix the user_awards table schema by removing old columns and updating constraints
 */
async function fixAwardsSchema() {
  try {
    console.log('Fixing user_awards table schema...');
    
    // First, copy data from award_type_id to award_setting_id if needed
    console.log('Updating award_setting_id from award_type_id where needed...');
    await db.execute(sql`
      UPDATE user_awards 
      SET award_setting_id = award_type_id 
      WHERE award_setting_id IS NULL AND award_type_id IS NOT NULL;
    `);
    
    // Make award_setting_id NOT NULL
    console.log('Making award_setting_id NOT NULL...');
    await db.execute(sql`
      ALTER TABLE user_awards 
      ALTER COLUMN award_setting_id SET NOT NULL;
    `);
    
    // Drop the old columns that are no longer needed
    console.log('Dropping old columns...');
    await db.execute(sql`
      ALTER TABLE user_awards 
      DROP COLUMN IF EXISTS award_type_id,
      DROP COLUMN IF EXISTS credits_awarded,
      DROP COLUMN IF EXISTS awarded_date;
    `);
    
    // Make virtfusion_tokens and streak_day NOT NULL
    console.log('Making virtfusion_tokens and streak_day NOT NULL...');
    await db.execute(sql`
      ALTER TABLE user_awards 
      ALTER COLUMN virtfusion_tokens SET NOT NULL,
      ALTER COLUMN streak_day SET NOT NULL;
    `);
    
    console.log('✅ Successfully fixed user_awards table schema!');
    
    // Verify the final structure
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_awards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\nFinal user_awards table structure:');
    const rows = result.rows || [];
    rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    process.exit(1);
  }
}

// Run the fix
fixAwardsSchema();