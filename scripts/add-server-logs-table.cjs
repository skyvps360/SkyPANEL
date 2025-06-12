const { drizzle } = require("drizzle-orm/node-postgres");
const { Pool } = require("pg");
const { sql } = require("drizzle-orm");

// Load environment variables
require("dotenv").config();

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

// Create database connection
const pool = new Pool({
  connectionString: databaseUrl,
});
const db = drizzle(pool);

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

    console.log("✅ server_logs table created successfully!");

    // Add foreign key constraint for user_id (only if it doesn't exist)
    try {
      await db.execute(sql`
        ALTER TABLE "server_logs"
        ADD CONSTRAINT "server_logs_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
      `);
      console.log("✅ Foreign key constraint added!");
    } catch (fkError) {
      if (fkError.message.includes('already exists')) {
        console.log("ℹ️  Foreign key constraint already exists, skipping");
      } else {
        console.log("⚠️  Could not add foreign key constraint:", fkError.message);
      }
    }

    // Create indexes for better performance
    const indexes = [
      { name: "server_logs_server_id_idx", column: "server_id" },
      { name: "server_logs_user_id_idx", column: "user_id" },
      { name: "server_logs_action_type_idx", column: "action_type" },
      { name: "server_logs_created_at_idx", column: "created_at" }
    ];

    for (const index of indexes) {
      try {
        await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS "${index.name}" ON "server_logs" ("${index.column}");`));
        console.log(`✅ Index ${index.name} created!`);
      } catch (indexError) {
        console.log(`⚠️  Could not create index ${index.name}:`, indexError.message);
      }
    }

    console.log("✅ Indexes created for optimal performance!");

  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log("ℹ️  server_logs table already exists, skipping creation");
    } else {
      console.error("❌ Error creating server_logs table:", error);
      throw error;
    }
  } finally {
    await pool.end();
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
