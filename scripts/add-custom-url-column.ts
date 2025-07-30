import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addCustomUrlColumn() {
  try {
    console.log('Adding custom_url column to code_snippets table...');
    
    // Add custom_url column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE "code_snippets" 
      ADD COLUMN IF NOT EXISTS "custom_url" text;
    `);
    
    console.log('✅ Custom URL column added successfully!');
    
    // Update existing custom snippets to have a default custom URL
    await db.execute(sql`
      UPDATE "code_snippets" 
      SET "custom_url" = '/' 
      WHERE "display_location" = 'custom' AND "custom_url" IS NULL;
    `);
    
    console.log('✅ Updated existing custom snippets with default URL');
    
  } catch (error) {
    console.error('Failed to add custom_url column:', error);
    throw error;
  }
}

addCustomUrlColumn()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 