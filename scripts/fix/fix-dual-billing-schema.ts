import 'dotenv/config';
import { db } from '../../server/db';
import { sql } from 'drizzle-orm';

async function fixDualBillingSchema() {
  try {
    console.log('🔧 Fixing dual billing system schema...');
    
    // Drop existing tables in correct order (due to foreign keys)
    console.log('Dropping existing tables...');
    await db.execute(sql`DROP TABLE IF EXISTS "dns_plan_subscriptions" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "credit_transactions" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "user_credits" CASCADE;`);
    await db.execute(sql`DROP TABLE IF EXISTS "dns_plans" CASCADE;`);
    
    // Create user_credits table with correct schema
    console.log('Creating user_credits table...');
    await db.execute(sql`
      CREATE TABLE "user_credits" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" integer NOT NULL UNIQUE,
        "balance" real DEFAULT 0 NOT NULL,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "user_credits_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade
      );
    `);
    
    // Create index for userId for faster lookups
    console.log('Creating index on user_credits.userId...');
    await db.execute(sql`
      CREATE INDEX "user_credits_userId_idx" ON "user_credits" ("userId");
    `);
    
    // Create credit_transactions table with correct schema
    console.log('Creating credit_transactions table...');
    await db.execute(sql`
      CREATE TABLE "credit_transactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" integer NOT NULL,
        "amount" real NOT NULL,
        "type" text NOT NULL,
        "description" text NOT NULL,
        "status" text DEFAULT 'completed' NOT NULL,
        "paymentMethod" text,
        "paymentId" text,
        "adminUserId" integer,
        "adminReason" text,
        "balanceBefore" real NOT NULL,
        "balanceAfter" real NOT NULL,
        "metadata" json DEFAULT '{}',
        "createdAt" timestamp DEFAULT now(),
        CONSTRAINT "credit_transactions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade,
        CONSTRAINT "credit_transactions_adminUserId_users_id_fk" FOREIGN KEY ("adminUserId") REFERENCES "users"("id") ON DELETE set null
      );
    `);
    
    // Create indexes for credit_transactions
    console.log('Creating indexes on credit_transactions...');
    await db.execute(sql`
      CREATE INDEX "credit_transactions_userId_idx" ON "credit_transactions" ("userId");
    `);
    await db.execute(sql`
      CREATE INDEX "credit_transactions_type_idx" ON "credit_transactions" ("type");
    `);
    await db.execute(sql`
      CREATE INDEX "credit_transactions_status_idx" ON "credit_transactions" ("status");
    `);
    await db.execute(sql`
      CREATE INDEX "credit_transactions_createdAt_idx" ON "credit_transactions" ("createdAt");
    `);
    
    // Create dns_plans table
    console.log('Creating dns_plans table...');
    await db.execute(sql`
      CREATE TABLE "dns_plans" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text NOT NULL,
        "price" real NOT NULL,
        "maxDomains" integer NOT NULL,
        "maxRecords" integer NOT NULL,
        "features" json DEFAULT '[]',
        "isActive" boolean DEFAULT true NOT NULL,
        "displayOrder" integer DEFAULT 0,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      );
    `);
    
    // Create dns_plan_subscriptions table
    console.log('Creating dns_plan_subscriptions table...');
    await db.execute(sql`
      CREATE TABLE "dns_plan_subscriptions" (
        "id" serial PRIMARY KEY NOT NULL,
        "userId" integer NOT NULL,
        "planId" integer NOT NULL,
        "status" text DEFAULT 'active' NOT NULL,
        "startDate" timestamp NOT NULL,
        "endDate" timestamp NOT NULL,
        "autoRenew" boolean DEFAULT true NOT NULL,
        "lastPaymentDate" timestamp,
        "nextPaymentDate" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        CONSTRAINT "dns_plan_subscriptions_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE cascade,
        CONSTRAINT "dns_plan_subscriptions_planId_dns_plans_id_fk" FOREIGN KEY ("planId") REFERENCES "dns_plans"("id") ON DELETE cascade
      );
    `);
    
    // Create indexes for dns_plan_subscriptions
    console.log('Creating indexes on dns_plan_subscriptions...');
    await db.execute(sql`
      CREATE INDEX "dns_plan_subscriptions_userId_idx" ON "dns_plan_subscriptions" ("userId");
    `);
    await db.execute(sql`
      CREATE INDEX "dns_plan_subscriptions_planId_idx" ON "dns_plan_subscriptions" ("planId");
    `);
    await db.execute(sql`
      CREATE INDEX "dns_plan_subscriptions_status_idx" ON "dns_plan_subscriptions" ("status");
    `);
    
    // Insert default DNS plans
    console.log('Inserting default DNS plans...');
    await db.execute(sql`
      INSERT INTO "dns_plans" ("name", "description", "price", "maxDomains", "maxRecords", "features")
      VALUES 
        ('Basic', 'Perfect for personal websites and small projects', 5.00, 5, 100, '["5 Domains", "100 DNS Records per Domain", "Basic Support", "99.9% Uptime SLA"]'),
        ('Pro', 'Ideal for growing businesses and multiple websites', 15.00, 25, 500, '["25 Domains", "500 DNS Records per Domain", "Priority Support", "99.95% Uptime SLA", "Advanced DNS Features"]'),
        ('Enterprise', 'For large organizations with complex DNS needs', 50.00, 100, 2000, '["100 Domains", "2000 DNS Records per Domain", "24/7 Premium Support", "99.99% Uptime SLA", "Advanced DNS Features", "Custom DNS Solutions"]');
    `);
    
    console.log('✅ Dual billing system schema fixed successfully!');
    console.log('📋 Summary:');
    console.log('   - user_credits: Custom credit balances (camelCase columns)');
    console.log('   - credit_transactions: Audit trail for all custom credit operations');
    console.log('   - dns_plans: DNS service pricing tiers (Basic: $5, Pro: $15, Enterprise: $50)');
    console.log('   - dns_plan_subscriptions: User DNS plan subscription management');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fix dual billing system schema:', error);
    process.exit(1);
  }
}

// Run the fix
fixDualBillingSchema();
