import { sql } from "drizzle-orm";
import { db, pool } from "../server/db";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

async function addVirtFusionCreditIdColumn() {
  try {
    console.log("Adding virtfusion_credit_id column to transactions table...");
    
    // Add the column if it doesn't exist
    await db.execute(sql`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS virtfusion_credit_id TEXT;
    `);
    
    console.log("✅ Successfully added virtfusion_credit_id column to transactions table");
    
    // Add a comment to document the column
    await db.execute(sql`
      COMMENT ON COLUMN transactions.virtfusion_credit_id IS 'VirtFusion credit ID returned from VirtFusion API when credits are added';
    `);
    
    console.log("✅ Added column comment");
    
  } catch (error) {
    console.error("❌ Error adding column:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
addVirtFusionCreditIdColumn()
  .then(() => {
    console.log("🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Migration failed:", error);
    process.exit(1);
  });
