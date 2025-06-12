/**
 * Script to create ticket department tables and update tickets schema
 * 
 * Usage: npx tsx scripts/migrate-ticket-departments.ts
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a SQL client connection properly
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function migrateDepartments() {
  console.log('Starting ticket department migration...');
  const client = await pool.connect();
  
  try {
    // Check if ticket_departments table exists
    try {
      console.log('Checking if ticket_departments table exists...');
      const result = await client.query('SELECT to_regclass(\'ticket_departments\')');
      const exists = result.rows[0]?.to_regclass;
      
      if (!exists) {
        console.log('ticket_departments table does not exist, creating...');
        // Create ticket_departments table
        await client.query(`
          CREATE TABLE IF NOT EXISTS ticket_departments (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT,
            is_default BOOLEAN DEFAULT false,
            requires_vps BOOLEAN DEFAULT false,
            is_active BOOLEAN DEFAULT true,
            display_order INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `);
        console.log('Created ticket_departments table');
        
        // Create default departments
        await client.query(`
          INSERT INTO ticket_departments (name, description, is_default, requires_vps, is_active, display_order)
          VALUES 
          ('General', 'General questions and inquiries', true, false, true, 1),
          ('Billing', 'Billing and payment related inquiries', false, false, true, 2),
          ('Technical Support', 'Technical issues and assistance', false, false, true, 3),
          ('VPS Support', 'Issues related to your VPS servers', false, true, true, 4)
        `);
        console.log('Created default ticket departments');
      } else {
        console.log('ticket_departments table already exists');
      }
    } catch (error) {
      console.error('Error checking/creating ticket_departments table:', error);
      throw error;
    }
    
    // Now check if department_id column exists in tickets table
    try {
      console.log('Checking if department_id column exists in tickets table...');
      const result = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name='tickets' AND column_name='department_id'
      `);
      
      if (result.rows.length === 0) {
        console.log('department_id column does not exist in tickets table, adding it...');
        // Add department_id column to tickets table
        await client.query(`
          ALTER TABLE tickets 
          ADD COLUMN department_id INTEGER REFERENCES ticket_departments(id) ON DELETE SET NULL
        `);
        console.log('Added department_id column to tickets table');
        
        // Set all existing tickets to the default department
        const defaultDept = await client.query(`
          SELECT id FROM ticket_departments WHERE is_default=true LIMIT 1
        `);
        
        if (defaultDept.rows.length > 0) {
          const defaultDeptId = defaultDept.rows[0].id;
          await client.query(`
            UPDATE tickets SET department_id = ${defaultDeptId} WHERE department_id IS NULL
          `);
          console.log(`Updated existing tickets to use default department ID ${defaultDeptId}`);
        }
      } else {
        console.log('department_id column already exists in tickets table');
      }
    } catch (error) {
      console.error('Error checking/adding department_id column:', error);
      throw error;
    }
    
    console.log('Ticket department migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await migrateDepartments();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();