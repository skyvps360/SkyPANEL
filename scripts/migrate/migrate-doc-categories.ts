import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function migrateDocs() {
  try {
    console.log('Starting documentation categories migration...');
    
    // Create doc_categories table
    console.log('Creating doc_categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "doc_categories" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "slug" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "display_order" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "created_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
        "updated_by" INTEGER REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);
    
    // Add the category_id column to docs table if it doesn't exist
    console.log('Adding category_id to docs table...');
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Check if the column exists
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'docs' AND column_name = 'category_id'
        ) THEN
          -- Add the column
          ALTER TABLE "docs" 
          ADD COLUMN "category_id" INTEGER REFERENCES "doc_categories"("id") ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    
    // Add the category column to docs table if it doesn't exist (for backward compatibility)
    console.log('Adding category to docs table if it doesn\'t exist...');
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Check if the column exists
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'docs' AND column_name = 'category'
        ) THEN
          -- Add the column
          ALTER TABLE "docs" 
          ADD COLUMN "category" TEXT;
        END IF;
      END $$;
    `);
    
    console.log('Documentation categories migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateDocs();