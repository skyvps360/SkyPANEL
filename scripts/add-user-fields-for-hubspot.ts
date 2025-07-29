import { config } from "dotenv";
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { WebSocket } from "ws";
import { sql } from "drizzle-orm";

// Load environment variables from .env file first
config();

// Configure Neon for Node.js environment
neonConfig.webSocketConstructor = WebSocket;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

const db = drizzle({ client: pool });

/**
 * Add phone, company, and address fields to users table for HubSpot integration
 */
async function addUserFieldsForHubSpot() {
  try {
    console.log("Adding phone, company, and address fields to users table...");

    // Add phone field
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone TEXT
    `);
    console.log("✅ Added phone field");

    // Add company field
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS company TEXT
    `);
    console.log("✅ Added company field");

    // Add address field
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS address TEXT
    `);
    console.log("✅ Added address field");

    console.log("🎉 Successfully added all user fields for HubSpot integration!");
    console.log("\nNew fields added:");
    console.log("- phone: Phone number for HubSpot contact sync");
    console.log("- company: Company name for HubSpot contact sync");
    console.log("- address: Address for HubSpot contact sync");

  } catch (error) {
    console.error("❌ Error adding user fields:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
addUserFieldsForHubSpot()
  .then(() => {
    console.log("Migration completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  }); 