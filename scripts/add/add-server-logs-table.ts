import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// Create database connection
const client = postgres(databaseUrl);
const db = drizzle(client);

async function addServerLogsTable() {
  try {
    console.log("Adding server_logs table...");

    // Create the server_logs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "server_logs" (
        "id" serial PRIMARY KEY NOT NULL,
        "server_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "action" text NOT NULL,
        "action_type" text NOT NULL,
        "status" text DEFAULT 'success' NOT NULL,
        "details" text,
        "metadata" json DEFAULT '{}',
        "user_agent" text,
        "ip_address" text,
        "queue_id" integer,
        "error_message" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Add foreign key constraint for user_id
    await db.execute(sql`
      ALTER TABLE "server_logs" 
      ADD CONSTRAINT "server_logs_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
    `);

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "server_logs_server_id_idx" ON "server_logs" ("server_id");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "server_logs_user_id_idx" ON "server_logs" ("user_id");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "server_logs_action_type_idx" ON "server_logs" ("action_type");
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "server_logs_created_at_idx" ON "server_logs" ("created_at");
    `);

    console.log("✅ server_logs table created successfully!");
    console.log("✅ Foreign key constraints added!");
    console.log("✅ Indexes created for optimal performance!");

  } catch (error: any) {
    if (error.message.includes('already exists')) {
      console.log("ℹ️  server_logs table already exists, skipping creation");
    } else {
      console.error("❌ Error creating server_logs table:", error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

// Run the migration
addServerLogsTable()
  .then(() => {
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
