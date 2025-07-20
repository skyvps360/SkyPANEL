import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addServerNotesTable() {
  try {
    console.log('Starting server notes table migration...');
    
    // Create server_notes table
    console.log('Creating server_notes table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "server_notes" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "server_id" integer NOT NULL,
        "title" text NOT NULL,
        "content" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes for server_notes table...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_notes_server_id" ON "server_notes" ("server_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_server_notes_user_id" ON "server_notes" ("user_id");
    `);
    
    console.log('✅ Server notes table migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during server notes table migration:', error);
    throw error;
  }
}

// Run the migration
addServerNotesTable()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });