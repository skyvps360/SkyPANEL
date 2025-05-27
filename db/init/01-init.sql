-- SkyPANEL Database Initialization Script
-- This script runs when the PostgreSQL container starts for the first time

-- Create the database if it doesn't exist (handled by POSTGRES_DB env var)
-- Create extensions that might be needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Note: The actual table creation is handled by Drizzle migrations
-- This script just sets up the basic database environment
