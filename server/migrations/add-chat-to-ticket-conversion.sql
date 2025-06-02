-- Migration: Add chat-to-ticket conversion tracking fields
-- This migration adds the necessary columns to support chat-to-ticket conversion feature

-- Add conversion tracking columns to chat_sessions table
ALTER TABLE chat_sessions 
ADD COLUMN IF NOT EXISTS converted_to_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS converted_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Update the status column to include the new 'converted_to_ticket' status
-- Note: This is safe as it only adds a new possible value, doesn't change existing data

-- Create index for better query performance on conversion tracking
CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_to_ticket_id ON chat_sessions(converted_to_ticket_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_at ON chat_sessions(converted_at);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_by_admin_id ON chat_sessions(converted_by_admin_id);

-- Add comment to document the new columns
COMMENT ON COLUMN chat_sessions.converted_to_ticket_id IS 'References the ticket ID if this chat session was converted to a ticket';
COMMENT ON COLUMN chat_sessions.converted_at IS 'Timestamp when the chat session was converted to a ticket';
COMMENT ON COLUMN chat_sessions.converted_by_admin_id IS 'ID of the admin who performed the conversion';
