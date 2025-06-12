import { db } from '../server/db';
import { datacenterLocations, planFeatures, faqItems } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function createTables() {
  try {
    console.log('Starting database migration...');
    
    // Create datacenter_locations table
    console.log('Creating datacenter_locations table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "datacenter_locations" (
        "id" SERIAL PRIMARY KEY,
        "code" TEXT NOT NULL UNIQUE,
        "name" TEXT NOT NULL,
        "region_code" TEXT NOT NULL,
        "region_name" TEXT NOT NULL,
        "country" TEXT NOT NULL,
        "city" TEXT NOT NULL,
        "latitude" DOUBLE PRECISION NOT NULL,
        "longitude" DOUBLE PRECISION NOT NULL,
        "address" TEXT,
        "provider" TEXT,
        "tier" TEXT,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "features" JSONB DEFAULT '[]',
        "description" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create plan_features table
    console.log('Creating plan_features table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "plan_features" (
        "id" SERIAL PRIMARY KEY,
        "title" TEXT NOT NULL,
        "icon" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "display_order" INTEGER DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Create faq_items table
    console.log('Creating faq_items table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "faq_items" (
        "id" SERIAL PRIMARY KEY,
        "question" TEXT NOT NULL,
        "answer" TEXT NOT NULL,
        "category" TEXT DEFAULT 'general',
        "display_order" INTEGER DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

createTables();