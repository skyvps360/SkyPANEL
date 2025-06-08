import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addDualBillingSystem() {
  try {
    console.log('Starting dual billing system migration...');
    
    // Create user_credits table
    console.log('Creating user_credits table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "user_credits" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL UNIQUE,
        "balance" real DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "user_credits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      );
    `);
    
    // Create index for user_id for faster lookups
    console.log('Creating index on user_credits.user_id...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "user_credits_user_id_idx" ON "user_credits" ("user_id");
    `);
    
    // Create credit_transactions table
    console.log('Creating credit_transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "credit_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "amount" real NOT NULL,
        "type" text NOT NULL,
        "description" text NOT NULL,
        "status" text DEFAULT 'completed' NOT NULL,
        "payment_method" text,
        "payment_id" text,
        "adminUserId" integer,
        "adminReason" text,
        "balance_before" real NOT NULL,
        "balance_after" real NOT NULL,
        "metadata" json DEFAULT '{}',
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
        CONSTRAINT "credit_transactions_adminUserId_users_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE set null
      );
    `);
    
    // Create indexes for credit_transactions
    console.log('Creating indexes on credit_transactions...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "credit_transactions_user_id_idx" ON "credit_transactions" ("user_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "credit_transactions_type_idx" ON "credit_transactions" ("type");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "credit_transactions_status_idx" ON "credit_transactions" ("status");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "credit_transactions_created_at_idx" ON "credit_transactions" ("created_at");
    `);
    
    // Create dns_plans table
    console.log('Creating dns_plans table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dns_plans" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "price" real NOT NULL,
        "max_domains" integer NOT NULL,
        "max_records" integer NOT NULL,
        "features" json DEFAULT '[]',
        "is_active" boolean DEFAULT true NOT NULL,
        "display_order" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `);
    
    // Create dns_plan_subscriptions table
    console.log('Creating dns_plan_subscriptions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "dns_plan_subscriptions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "plan_id" integer NOT NULL,
        "status" text DEFAULT 'active' NOT NULL,
        "start_date" timestamp NOT NULL,
        "end_date" timestamp NOT NULL,
        "auto_renew" boolean DEFAULT true NOT NULL,
        "last_payment_date" timestamp,
        "next_payment_date" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "dns_plan_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade,
        CONSTRAINT "dns_plan_subscriptions_plan_id_dns_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "dns_plans"("id") ON DELETE cascade
      );
    `);
    
    // Create indexes for dns_plan_subscriptions
    console.log('Creating indexes on dns_plan_subscriptions...');
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "dns_plan_subscriptions_user_id_idx" ON "dns_plan_subscriptions" ("user_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "dns_plan_subscriptions_plan_id_idx" ON "dns_plan_subscriptions" ("plan_id");
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS "dns_plan_subscriptions_status_idx" ON "dns_plan_subscriptions" ("status");
    `);
    
    // Insert default DNS plans
    console.log('Inserting default DNS plans...');
    await db.execute(sql`
      INSERT INTO "dns_plans" ("name", "description", "price", "max_domains", "max_records", "features")
      VALUES
        ('Basic', 'Perfect for personal websites and small projects', 5.00, 5, 100, '["5 Domains", "100 DNS Records per Domain", "Basic Support", "99.9% Uptime SLA"]'),
        ('Pro', 'Ideal for growing businesses and multiple websites', 15.00, 25, 500, '["25 Domains", "500 DNS Records per Domain", "Priority Support", "99.95% Uptime SLA", "Advanced DNS Features"]'),
        ('Enterprise', 'For large organizations with complex DNS needs', 50.00, 100, 2000, '["100 Domains", "2000 DNS Records per Domain", "24/7 Premium Support", "99.99% Uptime SLA", "Advanced DNS Features", "Custom DNS Solutions"]')
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Dual billing system tables created successfully!');
    console.log('📋 Summary:');
    console.log('   - user_credits: Custom credit balances (separate from VirtFusion)');
    console.log('   - credit_transactions: Audit trail for all custom credit operations');
    console.log('   - dns_plans: DNS service pricing tiers (Basic: $5, Pro: $15, Enterprise: $50)');
    console.log('   - dns_plan_subscriptions: User DNS plan subscription management');
    console.log('');
    console.log('🔄 Next steps:');
    console.log('   1. Update backend API endpoints to support custom credits');
    console.log('   2. Refactor billing page to show both VirtFusion tokens and custom credits');
    console.log('   3. Add custom credits management to admin user edit page');
    console.log('   4. Implement PayPal integration for custom credit purchases');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create dual billing system tables:', error);
    process.exit(1);
  }
}

// Run the migration
addDualBillingSystem();
