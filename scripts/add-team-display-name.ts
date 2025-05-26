import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function addDisplayNameColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();

    try {
      // Check if the display_name column already exists
      const checkColumnQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'team_members' 
        AND column_name = 'display_name'
      `;
      
      const columnExists = await client.query(checkColumnQuery);
      
      if (columnExists.rows.length > 0) {
        console.log('display_name column already exists in team_members table');
        return;
      }

      console.log('Adding display_name column to team_members table...');
      
      // Add the display_name column
      const addColumnQuery = `
        ALTER TABLE team_members 
        ADD COLUMN display_name TEXT
      `;
      
      await client.query(addColumnQuery);
      
      console.log('Successfully added display_name column to team_members table');
      
      // Optional: Set display_name to discord_username for existing records
      // This provides a smooth transition where existing team members keep their current display
      const updateExistingQuery = `
        UPDATE team_members 
        SET display_name = discord_username 
        WHERE display_name IS NULL
      `;
      
      const result = await client.query(updateExistingQuery);
      console.log(`Updated ${result.rowCount} existing team members with their Discord usernames as display names`);
      
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding display_name column:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  addDisplayNameColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { addDisplayNameColumn };
