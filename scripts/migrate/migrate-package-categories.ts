import 'dotenv/config';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function migratePackageCategories() {
  try {
    console.log('Starting package categories migration...');
    
    // Create package_categories table
    console.log('Creating package_categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "package_categories" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "description" TEXT,
        "display_order" INTEGER DEFAULT 0,
        "is_active" BOOLEAN DEFAULT true NOT NULL,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Add category_id column to package_pricing table (nullable for backward compatibility)
    console.log('Adding category_id column to package_pricing table...');
    await db.execute(sql`
      ALTER TABLE "package_pricing" 
      ADD COLUMN IF NOT EXISTS "category_id" INTEGER 
      REFERENCES "package_categories"("id") ON DELETE SET NULL;
    `);
    
    // Create some default categories
    console.log('Creating default package categories...');
    await db.execute(sql`
      INSERT INTO "package_categories" ("name", "description", "display_order", "is_active")
      VALUES 
        ('KVM VPS', 'High-performance KVM virtual private servers', 1, true),
        ('DKVM', 'Dedicated KVM servers with full isolation', 2, true),
        ('Storage VPS', 'Storage-optimized virtual private servers', 3, true),
        ('Game Servers', 'Optimized servers for gaming applications', 4, true)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('Package categories migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Package categories migration failed:', error);
    process.exit(1);
  }
}

migratePackageCategories();
