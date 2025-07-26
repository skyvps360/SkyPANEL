import { db } from './server/db.ts';

async function checkCouponsTable() {
  try {
    const result = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'coupons' 
      ORDER BY ordinal_position
    `);
    
    console.log('Coupons table columns:');
    result.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
  } catch (error) {
    console.error('Error checking table:', error);
  } finally {
    process.exit(0);
  }
}

checkCouponsTable();