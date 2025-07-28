import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function listTables() {
  try {
    console.log('Listing all tables in the database...');
    
    const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Tables in the database:');
    result.rows.forEach((row: any) => {
      console.log(`- ${row.table_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to list tables:', error);
    process.exit(1);
  }
}

// Run the function
listTables();
