import { sql } from 'drizzle-orm';
import { db } from '../server/db';
import 'dotenv/config';

async function addDnsTables() {
  console.log('Adding DNS tables...');

  try {
    // Create dns_domains table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS dns_domains (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        interserver_id INTEGER,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    console.log('✓ Created dns_domains table');

    // Create dns_records table
    await db.execute(sql`
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
      )
    `);

    console.log('✓ Created dns_records table');

    // Create indexes for better performance
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dns_domains_user_id ON dns_domains(user_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dns_domains_name ON dns_domains(name)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dns_records_domain_id ON dns_records(domain_id)
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_dns_records_type ON dns_records(type)
    `);

    console.log('✓ Created indexes');

    console.log('DNS tables migration completed successfully!');
  } catch (error) {
    console.error('Error creating DNS tables:', error);
    process.exit(1);
  }
}

// Run the migration
addDnsTables();
