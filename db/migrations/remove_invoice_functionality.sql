-- Migration to remove invoice functionality
-- This migration removes the invoices table and the invoiceNumber column from transactions

-- Remove the invoiceNumber column from transactions table
ALTER TABLE transactions DROP COLUMN IF EXISTS "invoiceNumber";

-- Drop the invoices table completely
DROP TABLE IF EXISTS invoices;

-- Note: This migration removes all invoice data permanently
-- Make sure to backup any important invoice data before running this migration
