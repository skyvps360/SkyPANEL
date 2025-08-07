# Database Scripts Guide

## Overview
This guide covers how to properly create and run database migration/addition scripts in the SkyPANEL project.

## Common Issues and Solutions

### Issue: "DATABASE_URL must be set" Error
When running database scripts with `npx tsx scripts/script-name.ts`, you may encounter:
```
Error: DATABASE_URL must be set. Did you forget to provision a database?
```

**Root Cause:** The script is not loading environment variables from the `.env` file.

**Solution:** Always import `dotenv/config` at the top of your script:

```typescript
#!/usr/bin/env tsx

import 'dotenv/config';  // ← This line is REQUIRED
import { db } from "../server/db";
import { someTable } from "../shared/schema";
```

## Script Template

Use this template for all database scripts:

```typescript
#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { tableName } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function yourScriptFunction() {
  console.log("🚀 Starting your database operation...\n");

  try {
    // Your database operations here
    console.log("✅ Operation completed successfully");
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

// Run the script
yourScriptFunction()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
```

## How to Run Database Scripts

### Method 1: Using npx (Recommended)
```bash
npx tsx scripts/your-script-name.ts
```

### Method 2: Using npm script (if defined in package.json)
```bash
npm run script-name
```

### Method 3: Direct tsx (if tsx is globally installed)
```bash
tsx scripts/your-script-name.ts
```

## Environment Requirements

### Required Environment Variables
Ensure your `.env` file contains at minimum:
```env
DATABASE_URL=postgresql://username:password@host:port/database?sslmode=require
```

### Checking Environment Variables
You can verify your environment is properly loaded by adding this debug line to your script:
```typescript
console.log("Database URL loaded:", !!process.env.DATABASE_URL);
```

## Best Practices

### 1. Always Use Error Handling
```typescript
try {
  await db.transaction(async (tx) => {
    // Your operations here
  });
} catch (error) {
  console.error("Transaction failed:", error);
  throw error;
}
```

### 2. Use Transactions for Multiple Operations
```typescript
await db.transaction(async (tx) => {
  await tx.insert(table1).values(data1);
  await tx.update(table2).set(data2).where(condition);
});
```

### 3. Check for Existing Data
```typescript
const existing = await db.select()
  .from(tableName)
  .where(eq(tableName.field, value))
  .limit(1);

if (existing.length === 0) {
  // Create new record
} else {
  console.log("Record already exists, skipping...");
}
```

### 4. Provide Clear Console Output
```typescript
console.log("🚀 Starting operation...");
console.log("✅ Step 1 completed");
console.log("⏭️  Skipping existing record");
console.log("❌ Error occurred");
console.log("🎉 All operations completed!");
```

## Common Script Types

### 1. Adding New Tables
```typescript
import { sql } from 'drizzle-orm';

await db.execute(sql`
  CREATE TABLE IF NOT EXISTS "new_table" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "created_at" timestamp DEFAULT now()
  );
`);
```

### 2. Adding New Data
```typescript
await db.insert(tableName).values({
  field1: 'value1',
  field2: 'value2',
});
```

### 3. Updating Existing Data
```typescript
await db.update(tableName)
  .set({ field: 'newValue' })
  .where(eq(tableName.id, targetId));
```

### 4. Bulk Operations
```typescript
const users = await db.select().from(usersTable);

for (const user of users) {
  await db.insert(relatedTable).values({
    userId: user.id,
    defaultValue: 'something'
  });
}
```

## Troubleshooting

### Script Hangs or Doesn't Exit
- Ensure you call `process.exit(0)` on success
- Ensure you call `process.exit(1)` on error
- Check for unclosed database connections

### Permission Errors
- Verify database user has necessary permissions
- Check if tables/schemas exist
- Ensure SSL settings match your database configuration

### TypeScript Errors
- Ensure all imports are correct
- Check that schema definitions match your database
- Verify Drizzle ORM types are up to date

## Example: Complete Script

Here's the `add-free-dns-plan.ts` script as a complete example:

```typescript
#!/usr/bin/env tsx

import 'dotenv/config';
import { db } from "../server/db";
import { dnsPlans, dnsPlanSubscriptions, users } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function addFreeDnsPlan() {
  console.log("🆓 Adding Free DNS Plan...\n");

  try {
    // Check if Free plan already exists
    const existingFreePlan = await db.select()
      .from(dnsPlans)
      .where(and(
        eq(dnsPlans.name, 'Free'),
        eq(dnsPlans.price, 0)
      ))
      .limit(1);

    let freePlan;

    if (existingFreePlan.length === 0) {
      console.log("Creating Free DNS plan...");
      
      const [newFreePlan] = await db.insert(dnsPlans).values({
        name: 'Free',
        description: 'Perfect for getting started with DNS management',
        price: 0.00,
        maxDomains: 1,
        maxRecords: 10,
        features: [
          'Basic DNS management',
          'Standard DNS propagation',
          'Community support'
        ],
        isActive: true,
        displayOrder: 0
      }).returning();

      freePlan = newFreePlan;
      console.log("✅ Free DNS plan created successfully");
    } else {
      freePlan = existingFreePlan[0];
      console.log("✅ Free DNS plan already exists");
    }

    console.log(`\n🎉 Free DNS Plan Setup Complete!`);

  } catch (error) {
    console.error("❌ Error adding Free DNS plan:", error);
    throw error;
  }
}

// Run the script
addFreeDnsPlan()
  .then(() => {
    console.log("\n✅ Free DNS Plan script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });
```

## Summary

The key points to remember:
1. **Always** import `'dotenv/config'` first
2. Use `npx tsx scripts/script-name.ts` to run scripts
3. Include proper error handling and console output
4. Use transactions for multiple related operations
5. Always call `process.exit()` to ensure script terminates

This ensures your database scripts will run reliably in the SkyPANEL environment.
