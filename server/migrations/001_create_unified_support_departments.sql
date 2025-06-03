-- Migration: Create unified support departments system
-- This migration creates the new unified support department tables
-- and adds compatibility columns to existing tables

-- Create the unified support_departments table
CREATE TABLE IF NOT EXISTS "support_departments" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "is_default" BOOLEAN DEFAULT false,
  "requires_vps" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "display_order" INTEGER DEFAULT 0,
  "color" TEXT DEFAULT '#3b82f6',
  "icon" TEXT DEFAULT 'MessageCircle',
  "created_at" TIMESTAMP DEFAULT NOW(),
  "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Create the unified support_department_admins table
CREATE TABLE IF NOT EXISTS "support_department_admins" (
  "id" SERIAL PRIMARY KEY,
  "department_id" INTEGER NOT NULL REFERENCES "support_departments"("id") ON DELETE CASCADE,
  "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "can_manage" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE("department_id", "admin_id")
);

-- Add migration compatibility columns to existing tables
-- These columns will help during the migration process and maintain backward compatibility

-- Add legacy department reference to tickets table
ALTER TABLE "tickets" 
ADD COLUMN IF NOT EXISTS "legacy_department_id" INTEGER REFERENCES "ticket_departments"("id") ON DELETE SET NULL;

-- Add legacy department reference to chat_sessions table
ALTER TABLE "chat_sessions" 
ADD COLUMN IF NOT EXISTS "legacy_chat_department_id" INTEGER REFERENCES "chat_departments"("id") ON DELETE SET NULL;

-- Update tickets table to reference unified support departments
-- Note: This will be populated during the migration process
ALTER TABLE "tickets" 
ADD COLUMN IF NOT EXISTS "department_id_new" INTEGER REFERENCES "support_departments"("id") ON DELETE SET NULL;

-- Update chat_sessions table to reference unified support departments
-- Note: This will be populated during the migration process
ALTER TABLE "chat_sessions" 
ADD COLUMN IF NOT EXISTS "department_id_new" INTEGER REFERENCES "support_departments"("id") ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_support_departments_active" ON "support_departments"("is_active");
CREATE INDEX IF NOT EXISTS "idx_support_departments_default" ON "support_departments"("is_default");
CREATE INDEX IF NOT EXISTS "idx_support_departments_display_order" ON "support_departments"("display_order");

CREATE INDEX IF NOT EXISTS "idx_support_department_admins_department" ON "support_department_admins"("department_id");
CREATE INDEX IF NOT EXISTS "idx_support_department_admins_admin" ON "support_department_admins"("admin_id");
CREATE INDEX IF NOT EXISTS "idx_support_department_admins_active" ON "support_department_admins"("is_active");

CREATE INDEX IF NOT EXISTS "idx_tickets_legacy_department" ON "tickets"("legacy_department_id");
CREATE INDEX IF NOT EXISTS "idx_tickets_department_new" ON "tickets"("department_id_new");

CREATE INDEX IF NOT EXISTS "idx_chat_sessions_legacy_department" ON "chat_sessions"("legacy_chat_department_id");
CREATE INDEX IF NOT EXISTS "idx_chat_sessions_department_new" ON "chat_sessions"("department_id_new");

-- Add comments for documentation
COMMENT ON TABLE "support_departments" IS 'Unified department system for both tickets and live chat';
COMMENT ON TABLE "support_department_admins" IS 'Admin assignments for unified support departments';

COMMENT ON COLUMN "support_departments"."color" IS 'Hex color code for department branding';
COMMENT ON COLUMN "support_departments"."icon" IS 'Lucide icon name for department display';
COMMENT ON COLUMN "support_departments"."requires_vps" IS 'Whether this department requires VPS selection';

COMMENT ON COLUMN "tickets"."legacy_department_id" IS 'Reference to old ticket_departments table for migration compatibility';
COMMENT ON COLUMN "tickets"."department_id_new" IS 'Reference to new unified support_departments table';

COMMENT ON COLUMN "chat_sessions"."legacy_chat_department_id" IS 'Reference to old chat_departments table for migration compatibility';
COMMENT ON COLUMN "chat_sessions"."department_id_new" IS 'Reference to new unified support_departments table';
