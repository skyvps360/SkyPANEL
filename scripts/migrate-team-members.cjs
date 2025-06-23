/**
 * Script to create team_members table
 * 
 * Usage: node scripts/migrate-team-members.cjs
 */

require('dotenv/config');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a SQL client connection properly
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function migrateTeamMembers() {
  console.log('Starting team members migration...');
  const client = await pool.connect();
  
  try {
    // Check if team_members table exists
    try {
      console.log('Checking if team_members table exists...');
      const result = await client.query('SELECT to_regclass(\'team_members\')');
      const exists = result.rows[0]?.to_regclass;
      
      if (!exists) {
        console.log('team_members table does not exist, creating...');
        // Create team_members table
        await client.query(`
          CREATE TABLE IF NOT EXISTS team_members (
            id SERIAL PRIMARY KEY,
            discord_user_id TEXT NOT NULL UNIQUE,
            discord_username TEXT NOT NULL,
            discord_avatar_url TEXT,
            role TEXT NOT NULL,
            about_me TEXT,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true NOT NULL,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
            created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
            updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        console.log('Created team_members table');
      } else {
        console.log('team_members table already exists');
      }
    } catch (error) {
      console.error('Error checking/creating team_members table:', error);
      throw error;
    }

    console.log('Team members migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
migrateTeamMembers()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
