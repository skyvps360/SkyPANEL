const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read the SQL migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add-dns-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running DNS tables migration...');
    await client.query(migrationSQL);
    console.log('✓ DNS tables migration completed successfully!');

  } catch (error) {
    console.error('Error running migration:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
