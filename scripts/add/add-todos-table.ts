import 'dotenv/config';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function addTodosTable() {
  try {
    console.log('Starting todos table migration...');
    
    // Create todos table
    console.log('Creating todos table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "todos" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "task" text NOT NULL,
        "is_completed" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    // Create index for user_id for faster lookups
    console.log('Creating index on user_id...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "todos_user_id_idx" ON "todos" ("user_id");
    `);
    
    console.log('✅ Todos table created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create todos table:', error);
    process.exit(1);
  }
}

// Run the migration
addTodosTable(); 