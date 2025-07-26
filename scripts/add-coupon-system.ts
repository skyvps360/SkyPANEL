import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Database migration script to add coupon system tables
 * Creates coupons table and coupon_usage table for tracking
 */
async function addCouponSystemTables() {
  try {
    console.log('Starting coupon system tables migration...');
    
    // Create coupons table
    console.log('Creating coupons table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" serial PRIMARY KEY NOT NULL,
        "code" text NOT NULL UNIQUE,
        "description" text,
        "tokens_amount" real NOT NULL DEFAULT 0,
        "max_uses" integer DEFAULT 0, -- 0 means unlimited
        "current_uses" integer DEFAULT 0,
        "is_active" boolean DEFAULT true,
        "created_by" integer NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);
    
    // Create coupon_usage table for tracking who used which coupons
    console.log('Creating coupon_usage table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "coupon_usage" (
        "id" serial PRIMARY KEY NOT NULL,
        "coupon_id" integer NOT NULL,
        "user_id" integer NOT NULL,
        "tokens_received" real NOT NULL,
        "virtfusion_credit_id" text,
        "transaction_id" integer,
        "used_at" timestamp DEFAULT now() NOT NULL,
        FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE,
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL
      );
    `);
    
    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "coupons_code_idx" ON "coupons" ("code");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "coupons_active_idx" ON "coupons" ("is_active");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "coupon_usage_coupon_id_idx" ON "coupon_usage" ("coupon_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "coupon_usage_user_id_idx" ON "coupon_usage" ("user_id");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "coupon_usage_user_coupon_idx" ON "coupon_usage" ("user_id", "coupon_id");
    `);
    
    console.log('✅ Coupon system tables created successfully!');
    console.log('Tables created:');
    console.log('  - coupons: Stores coupon codes and configuration');
    console.log('  - coupon_usage: Tracks coupon usage by users');
    console.log('Indexes created for optimal performance');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create coupon system tables:', error);
    process.exit(1);
  }
}

// Run the migration
addCouponSystemTables();