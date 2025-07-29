import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addFirstLastNameFields() {
  try {
    console.log('Starting first/last name fields migration...');
    
    // Check if the columns already exist
    const existingColumns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('first_name', 'last_name')
    `);
    
    const existingColumnNames = (existingColumns as any).rows?.map((col: any) => col.column_name) || [];
    
    if (!existingColumnNames.includes('first_name')) {
      console.log('Adding first_name column...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN first_name text
      `);
      console.log('✅ Added first_name column');
    } else {
      console.log('⏭️  first_name column already exists');
    }
    
    if (!existingColumnNames.includes('last_name')) {
      console.log('Adding last_name column...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN last_name text
      `);
      console.log('✅ Added last_name column');
    } else {
      console.log('⏭️  last_name column already exists');
    }
    
    // Populate the new fields with data from full_name for existing users
    console.log('Populating first_name and last_name from existing full_name data...');
    await db.execute(sql`
      UPDATE users 
      SET 
        first_name = CASE 
          WHEN full_name ~ '^[^\\s]+\\s' THEN split_part(full_name, ' ', 1)
          ELSE full_name
        END,
        last_name = CASE 
          WHEN full_name ~ '^[^\\s]+\\s' THEN substring(full_name from position(' ' in full_name) + 1)
          ELSE ''
        END
      WHERE first_name IS NULL OR last_name IS NULL
    `);
    
    console.log('✅ First/last name fields migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add first/last name fields:', error);
    process.exit(1);
  }
}

// Run the migration
addFirstLastNameFields(); 