-- Add DNS tables for InterServer integration

-- Create dns_domains table
CREATE TABLE IF NOT EXISTS dns_domains (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interserver_id INTEGER,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create dns_records table
CREATE TABLE IF NOT EXISTS dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES dns_domains(id) ON DELETE CASCADE,
    interserver_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 86400,
    priority INTEGER DEFAULT 0,
    disabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dns_domains_user_id ON dns_domains(user_id);
CREATE INDEX IF NOT EXISTS idx_dns_domains_name ON dns_domains(name);
CREATE INDEX IF NOT EXISTS idx_dns_records_domain_id ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(type);

-- Add unique constraint to prevent duplicate domain names per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_dns_domains_user_name ON dns_domains(user_id, name);
