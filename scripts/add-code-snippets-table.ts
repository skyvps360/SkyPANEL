import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addCodeSnippetsTable() {
  try {
    console.log('Starting code snippets table migration...');
    
    // Create code_snippets table
    console.log('Creating code_snippets table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "code_snippets" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "code" text NOT NULL,
        "display_location" text NOT NULL,
        "custom_url" text,
        "is_active" boolean DEFAULT true,
        "description" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create index for display_location for faster lookups
    console.log('Creating index on display_location...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "code_snippets_display_location_idx" ON "code_snippets" ("display_location");
    `);
    
    // Create index for is_active for faster filtering
    console.log('Creating index on is_active...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "code_snippets_is_active_idx" ON "code_snippets" ("is_active");
    `);
    
    console.log('✅ Code snippets table created successfully!');
    
    // Add some sample snippets
    console.log('Adding sample code snippets...');
    await db.execute(sql`
      INSERT INTO "code_snippets" ("name", "code", "display_location", "description") VALUES

      ('Custom CSS', '<style>.custom-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }</style>', 'header', 'Custom CSS for header styling'),
      ('Footer Script', '<script>console.log("Footer script loaded");</script>', 'footer', 'Sample footer script')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Sample code snippets added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create code snippets table:', error);
    process.exit(1);
  }
}

// Run the migration
addCodeSnippetsTable(); 