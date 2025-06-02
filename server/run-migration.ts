import { pool } from './db';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    console.log('Running chat-to-ticket conversion migration...');
    
    // Read the migration SQL file
    const migrationSQL = readFileSync(join(__dirname, 'migrations', 'add-chat-to-ticket-conversion.sql'), 'utf8');
    
    // Get a client from the pool
    const client = await pool.connect();
    
    try {
      // Execute the migration
      await client.query(migrationSQL);
      console.log('Migration completed successfully!');
    } finally {
      // Always release the client back to the pool
      client.release();
    }
    
    // Close the pool
    await pool.end();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
