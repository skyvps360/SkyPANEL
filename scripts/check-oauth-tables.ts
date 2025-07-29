import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkOAuthTables() {
  try {
    console.log('Checking OAuth tables structure...');
    
    // Check if oauth_providers table exists and get its columns
    const providersColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'oauth_providers'
      ORDER BY ordinal_position;
    `);
    
    console.log('oauth_providers columns:');
    providersColumns.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check if user_oauth_accounts table exists and get its columns
    const accountsColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_oauth_accounts'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nuser_oauth_accounts columns:');
    accountsColumns.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check if oauth_login_logs table exists and get its columns
    const logsColumns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'oauth_login_logs'
      ORDER BY ordinal_position;
    `);
    
    console.log('\noauth_login_logs columns:');
    logsColumns.rows.forEach((row: any) => {
      console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${row.column_default ? `DEFAULT ${row.column_default}` : ''}`);
    });
    
    // Check existing data
    const providersData = await db.execute(sql`SELECT * FROM oauth_providers LIMIT 5;`);
    console.log('\nExisting oauth_providers data:');
    console.log(providersData.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to check OAuth tables:', error);
    process.exit(1);
  }
}

// Run the check
checkOAuthTables(); 