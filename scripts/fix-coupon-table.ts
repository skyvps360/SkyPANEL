import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Fix coupon table structure to match the schema expectations
 * The issue is that the current table has incorrect column names
 */
async function fixCouponTable() {
  try {
    console.log('Starting coupon table fix...');
    
    // Drop existing coupons table if it exists
    console.log('Dropping existing coupons table...');
    await db.execute(sql`DROP TABLE IF EXISTS "coupon_usage" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "coupons" CASCADE;`);
    
    // Create coupons table with correct structure
    console.log('Creating coupons table with correct structure...');
    await db.execute(sql`
      CREATE TABLE "coupons" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL UNIQUE,
        "description" text,
        "token_amount" real NOT NULL DEFAULT 0,
        "max_uses" integer DEFAULT 0,
        "current_uses" integer DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "created_by" integer NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    // Create coupon_usage table
    console.log('Creating coupon_usage table...');
    await db.execute(sql`
      CREATE TABLE "coupon_usage" (
        "id" serial PRIMARY KEY NOT NULL,
        "coupon_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "tokens_received" real NOT NULL,
        "virtfusion_credit_id" text,
        "transaction_id" integer,
        "used_at" timestamp DEFAULT now()
      );
    `);
    
    // Add foreign key constraints
    console.log('Adding foreign key constraints...');
    await db.execute(sql`
      ALTER TABLE "coupons" 
      ADD CONSTRAINT "coupons_created_by_users_id_fk" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE cascade;
    `);
    
    await db.execute(sql`
      ALTER TABLE "coupon_usage" 
      ADD CONSTRAINT "coupon_usage_coupon_id_coupons_id_fk" 
      FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE cascade;
    `);
    
    await db.execute(sql`
      ALTER TABLE "coupon_usage" 
      ADD CONSTRAINT "coupon_usage_user_id_users_id_fk" 
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade;
    `);
    
    await db.execute(sql`
      ALTER TABLE "coupon_usage" 
      ADD CONSTRAINT "coupon_usage_transaction_id_transactions_id_fk" 
      FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE set null;
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX "coupons_code_idx" ON "coupons" ("code");
    `);
    
    await db.execute(sql`
      CREATE INDEX "coupon_usage_coupon_id_idx" ON "coupon_usage" ("coupon_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX "coupon_usage_user_id_idx" ON "coupon_usage" ("user_id");
    `);
    
    console.log('✅ Coupon table structure fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix coupon table:', error);
    process.exit(1);
  }
}

// Run the migration
fixCouponTable();