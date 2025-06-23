/**
 * Script to add vps_id column to tickets table
 * 
 * Usage: npx tsx scripts/add-vps-id-column.ts
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a SQL client connection
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function addVpsIdColumn() {
  console.log('Starting tickets table update...');
  const client = await pool.connect();
  
  try {
    // Check if vps_id column exists in tickets table
    try {
      console.log('Checking if vps_id column exists in tickets table...');
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='tickets' AND column_name='vps_id'
      `);
      
      if (result.rows.length === 0) {
        console.log('vps_id column does not exist in tickets table, adding it...');
        // Add vps_id column to tickets table
        await client.query(`
          ALTER TABLE tickets 
          ADD COLUMN vps_id INTEGER
        `);
        console.log('Added vps_id column to tickets table');
        
        // Add vps_data column to tickets table if it doesn't exist
        const vpsDataResult = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name='tickets' AND column_name='vps_data'
        `);
        
        if (vpsDataResult.rows.length === 0) {
          console.log('vps_data column does not exist in tickets table, adding it...');
          // Add vps_data column to tickets table
          await client.query(`
            ALTER TABLE tickets 
            ADD COLUMN vps_data JSONB
          `);
          console.log('Added vps_data column to tickets table');
        } else {
          console.log('vps_data column already exists in tickets table');
        }
      } else {
        console.log('vps_id column already exists in tickets table');
      }
    } catch (error) {
      console.error('Error checking/adding vps_id column:', error);
      throw error;
    }
    
    console.log('Tickets table update completed successfully');
  } catch (error) {
    console.error('Error during tickets table update:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await addVpsIdColumn();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();