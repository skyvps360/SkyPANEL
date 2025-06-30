-- Migration: Add VirtFusion credit ID field to transactions table
-- This migration adds the virtfusion_credit_id column to track VirtFusion credit IDs for all transactions

-- Add VirtFusion credit ID column to transactions table
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS virtfusion_credit_id TEXT;

-- Add comment to document the purpose of this field
COMMENT ON COLUMN transactions.virtfusion_credit_id IS 'VirtFusion credit ID returned from VirtFusion API when credits are added';
