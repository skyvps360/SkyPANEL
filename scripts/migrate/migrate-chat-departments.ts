import 'dotenv/config';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function migrateChatDepartments() {
  try {
    console.log('Starting chat departments migration...');
    
    // Create chat_departments table
    console.log('Creating chat_departments table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_departments" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "is_default" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "display_order" INTEGER DEFAULT 0,
        "color" TEXT DEFAULT '#3b82f6',
        "icon" TEXT DEFAULT 'MessageCircle',
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create chat_department_admins table
    console.log('Creating chat_department_admins table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "chat_department_admins" (
        "id" SERIAL PRIMARY KEY,
        "department_id" INTEGER NOT NULL REFERENCES "chat_departments"("id") ON DELETE CASCADE,
        "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "can_manage" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE("department_id", "admin_id")
      );
    `);

    // Add departmentId column to chat_sessions table
    console.log('Adding department_id column to chat_sessions table...');
    await db.execute(sql`
      ALTER TABLE "chat_sessions" 
      ADD COLUMN IF NOT EXISTS "department_id" INTEGER REFERENCES "chat_departments"("id") ON DELETE SET NULL;
    `);

    // Insert default departments
    console.log('Inserting default chat departments...');
    await db.execute(sql`
      INSERT INTO "chat_departments" ("name", "description", "is_default", "display_order", "color", "icon")
      VALUES 
        ('General Support', 'General inquiries and support requests', true, 1, '#3b82f6', 'MessageCircle'),
        ('Technical Support', 'Technical issues and troubleshooting', false, 2, '#10b981', 'Settings'),
        ('Billing Support', 'Billing questions and VirtFusion token issues', false, 3, '#f59e0b', 'CreditCard'),
        ('VPS Management', 'VPS server management and configuration', false, 4, '#8b5cf6', 'Server'),
        ('Sales Inquiries', 'Pre-sales questions and service information', false, 5, '#ef4444', 'ShoppingCart')
      ON CONFLICT (name) DO NOTHING;
    `);

    // Create indexes for better performance
    console.log('Creating indexes...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_departments_active" ON "chat_departments" ("is_active", "display_order");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_department_admins_department" ON "chat_department_admins" ("department_id", "is_active");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_department_admins_admin" ON "chat_department_admins" ("admin_id", "is_active");
    `);
    
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "idx_chat_sessions_department" ON "chat_sessions" ("department_id", "status");
    `);

    console.log('Chat departments migration completed successfully!');
  } catch (error) {
    console.error('Error during chat departments migration:', error);
    throw error;
  }
}

// Run migration if this file is executed directly
migrateChatDepartments()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

export { migrateChatDepartments };
