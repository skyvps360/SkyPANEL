/**
 * Script to remove legacy credit system from SkyPANEL
 * 
 * This script:
 * 1. Removes the credits column from the users table
 * 2. Archives legacy credit transactions for audit purposes
 * 3. Preserves VirtFusion-related transactions
 * 
 * Usage: npx tsx scripts/remove-legacy-credits.ts
 */

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Create a SQL client connection
const pool = new Pool({
  connectionString: DATABASE_URL
});

async function removeLegacyCredits() {
  console.log('Starting legacy credit system removal...');
  const client = await pool.connect();
  
  try {
    // Begin transaction
    await client.query('BEGIN');
    
    // Step 1: Check if credits column exists
    console.log('Checking if credits column exists in users table...');
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'credits'
      );
    `);
    
    const creditsColumnExists = columnCheck.rows[0]?.exists;
    
    if (!creditsColumnExists) {
      console.log('Credits column does not exist in users table. Migration may have already been run.');
      await client.query('ROLLBACK');
      return;
    }
    
    // Step 2: Archive users with non-zero credit balances for audit purposes
    console.log('Archiving users with non-zero credit balances...');
    const usersWithCredits = await client.query(`
      SELECT id, username, email, credits, created_at
      FROM users 
      WHERE credits > 0
      ORDER BY credits DESC;
    `);
    
    if (usersWithCredits.rows.length > 0) {
      console.log(`Found ${usersWithCredits.rows.length} users with credit balances:`);
      usersWithCredits.rows.forEach(user => {
        console.log(`  - User ${user.username} (ID: ${user.id}): $${user.credits}`);
      });
      
      // Create audit log table if it doesn't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS legacy_credit_audit (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          username TEXT NOT NULL,
          email TEXT NOT NULL,
          legacy_credit_balance REAL NOT NULL,
          archived_at TIMESTAMP DEFAULT NOW(),
          notes TEXT DEFAULT 'Archived during legacy credit system removal'
        );
      `);
      
      // Insert audit records
      for (const user of usersWithCredits.rows) {
        await client.query(`
          INSERT INTO legacy_credit_audit (user_id, username, email, legacy_credit_balance)
          VALUES ($1, $2, $3, $4);
        `, [user.id, user.username, user.email, user.credits]);
      }
      
      console.log('Credit balances archived to legacy_credit_audit table');
    } else {
      console.log('No users found with credit balances');
    }
    
    // Step 3: Archive legacy credit transactions
    console.log('Archiving legacy credit transactions...');
    const legacyTransactions = await client.query(`
      SELECT COUNT(*) as count
      FROM transactions 
      WHERE description LIKE '%Credit purchase%' 
         OR description LIKE '%credit%'
         OR payment_method = 'paypal'
         OR type = 'credit';
    `);
    
    const legacyTransactionCount = legacyTransactions.rows[0]?.count || 0;
    console.log(`Found ${legacyTransactionCount} legacy credit transactions`);
    
    if (legacyTransactionCount > 0) {
      // Create legacy transaction audit table
      await client.query(`
        CREATE TABLE IF NOT EXISTS legacy_transaction_audit (
          id SERIAL PRIMARY KEY,
          original_transaction_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          description TEXT NOT NULL,
          status TEXT NOT NULL,
          payment_method TEXT,
          payment_id TEXT,
          original_created_at TIMESTAMP,
          archived_at TIMESTAMP DEFAULT NOW()
        );
      `);
      
      // Archive legacy transactions
      await client.query(`
        INSERT INTO legacy_transaction_audit (
          original_transaction_id, user_id, amount, type, description, 
          status, payment_method, payment_id, original_created_at
        )
        SELECT 
          id, user_id, amount, type, description, 
          status, payment_method, payment_id, created_at
        FROM transactions 
        WHERE description LIKE '%Credit purchase%' 
           OR description LIKE '%credit%'
           OR payment_method = 'paypal'
           OR type = 'credit';
      `);
      
      console.log('Legacy transactions archived to legacy_transaction_audit table');
    }
    
    // Step 4: Remove the credits column from users table
    console.log('Removing credits column from users table...');
    await client.query(`
      ALTER TABLE users DROP COLUMN IF EXISTS credits;
    `);
    
    console.log('Credits column removed from users table');
    
    // Step 5: Clean up legacy credit transactions (optional - keep for audit trail)
    console.log('Marking legacy transactions as archived...');
    await client.query(`
      UPDATE transactions 
      SET description = CONCAT('[ARCHIVED] ', description)
      WHERE description LIKE '%Credit purchase%' 
         OR description LIKE '%credit%'
         OR payment_method = 'paypal'
         OR type = 'credit';
    `);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('Legacy credit system removal completed successfully!');
    console.log('\nSummary:');
    console.log(`- Removed credits column from users table`);
    console.log(`- Archived ${usersWithCredits.rows.length} user credit balances`);
    console.log(`- Archived ${legacyTransactionCount} legacy transactions`);
    console.log(`- All data preserved in audit tables for compliance`);
    
  } catch (error) {
    console.error('Error during migration:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await removeLegacyCredits();
    console.log('\nMigration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
