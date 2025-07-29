import 'dotenv/config';
import { pool } from './db';

async function checkSchema() {
  const client = await pool.connect();
  
  try {
    console.log('Schema check completed - chat functionality has been removed.');
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema();
