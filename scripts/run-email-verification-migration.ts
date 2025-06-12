import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

// Load environment variables
config();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Running email verification rate limiting migration...');

    // Configure Neon for Node.js environment
    neonConfig.webSocketConstructor = ws;

    // Create database connection
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const pool = new Pool({ connectionString });
    const db = drizzle({ client: pool });

    // Read the migration SQL file
    const migrationPath = join(__dirname, '..', 'migrations', 'add-email-verification-rate-limiting.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Split SQL into individual statements and execute them
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        await pool.query(statement.trim());
      }
    }

    console.log('Migration completed successfully!');
    console.log('Email verification rate limiting table created.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
