import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Check the actual database schema for user_awards table
 */
async function checkAwardsSchema() {
  try {
    console.log('Checking user_awards table schema...');
    
    // Check if the table exists and get its structure
    const result = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_awards' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current user_awards table structure:');
    console.log('Result type:', typeof result);
    console.log('Result:', result);
    
    // Handle different result formats
    const rows = Array.isArray(result) ? result : result.rows || [];
    
    rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    // Check if award_type_id column exists
    const awardTypeIdExists = rows.some((row: any) => row.column_name === 'award_type_id');
    const awardSettingIdExists = rows.some((row: any) => row.column_name === 'award_setting_id');
    
    console.log(`\naward_type_id exists: ${awardTypeIdExists}`);
    console.log(`award_setting_id exists: ${awardSettingIdExists}`);
    
    if (awardTypeIdExists && !awardSettingIdExists) {
      console.log('\n⚠️  Found award_type_id but not award_setting_id. This suggests a schema mismatch.');
      console.log('Attempting to rename column...');
      
      await db.execute(sql`
        ALTER TABLE user_awards 
        RENAME COLUMN award_type_id TO award_setting_id;
      `);
      
      console.log('✅ Successfully renamed award_type_id to award_setting_id');
    } else if (!awardTypeIdExists && !awardSettingIdExists) {
      console.log('\n❌ Neither award_type_id nor award_setting_id found. Table structure is incorrect.');
    } else {
      console.log('\n✅ Table structure looks correct.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking schema:', error);
    process.exit(1);
  }
}

// Run the check
checkAwardsSchema();