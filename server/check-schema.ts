import 'dotenv/config';
import { pool } from './db';

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Checking chat_sessions table schema...');
    
    // Check table structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'chat_sessions' 
      ORDER BY ordinal_position;
    `);
    
    console.log('chat_sessions columns:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if the new columns exist
    const conversionColumns = result.rows.filter(row => 
      row.column_name.includes('converted')
    );
    
    console.log('\nConversion-related columns:');
    if (conversionColumns.length === 0) {
      console.log('  ❌ No conversion columns found!');
    } else {
      conversionColumns.forEach(col => {
        console.log(`  ✅ ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
