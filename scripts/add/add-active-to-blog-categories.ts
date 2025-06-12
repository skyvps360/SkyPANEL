/**
 * Script to add active column to blog_categories table
 * 
 * Usage: npx tsx scripts/add-active-to-blog-categories.ts
 */

import { db } from '../../server/db';
import { sql } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

async function addActiveColumn() {
  try {
    console.log('Adding active column to blog_categories table...');
    
    // Check if the column already exists
    const checkColumnSql = sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'blog_categories' AND column_name = 'active'
      );
    `;
    
    const columnExists = await db.execute(checkColumnSql);
    
    if (columnExists?.[0]?.exists) {
      console.log('Column active already exists in blog_categories table');
      return;
    }
    
    // Add the column
    await db.execute(sql`
      ALTER TABLE blog_categories
      ADD COLUMN active BOOLEAN NOT NULL DEFAULT TRUE;
    `);
    
    console.log('Successfully added active column to blog_categories table');
  } catch (error) {
    console.error('Error adding active column to blog_categories table:', error);
    throw error;
  }
}

async function main() {
  try {
    await addActiveColumn();
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();