import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDiscordTodosTable() {
  console.log('Adding discord_todos table...');

  try {
    // Create discord_todos table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS discord_todos (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        discord_user_id TEXT NOT NULL,
        discord_username TEXT NOT NULL,
        task TEXT NOT NULL,
        description TEXT,
        priority TEXT NOT NULL DEFAULT 'medium',
        category TEXT DEFAULT 'general',
        due_date TIMESTAMP,
        completed BOOLEAN NOT NULL DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✓ Created discord_todos table');

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_discord_todos_user_id ON discord_todos(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_discord_todos_discord_user_id ON discord_todos(discord_user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_discord_todos_completed ON discord_todos(completed)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_discord_todos_priority ON discord_todos(priority)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_discord_todos_due_date ON discord_todos(due_date)
    `);

    console.log('✓ Created indexes for discord_todos table');

    console.log('Discord todos table migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addDiscordTodosTable();
