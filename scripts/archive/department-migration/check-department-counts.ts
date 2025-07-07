import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkDepartmentCounts() {
  console.log('🔍 Checking department counts across all tables...\n');

  try {
    // Check support_departments table
    const supportCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM support_departments
    `);
    console.log(`Support departments: ${supportCount.rows[0]?.count || 0}`);

    // Check ticket_departments table
    const ticketCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM ticket_departments
    `);
    console.log(`Ticket departments: ${ticketCount.rows[0]?.count || 0}`);

    // Check chat_departments table
    const chatCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM chat_departments
    `);
    console.log(`Chat departments: ${chatCount.rows[0]?.count || 0}`);

    // List all departments from each table
    console.log('\n📋 Support departments:');
    const supportDepts = await db.execute(sql`
      SELECT id, name, is_active FROM support_departments ORDER BY id
    `);
    supportDepts.rows.forEach((dept: any) => {
      console.log(`  ${dept.id}: ${dept.name} (${dept.is_active ? 'active' : 'inactive'})`);
    });

    console.log('\n📋 Ticket departments:');
    const ticketDepts = await db.execute(sql`
      SELECT id, name, is_active FROM ticket_departments ORDER BY id
    `);
    ticketDepts.rows.forEach((dept: any) => {
      console.log(`  ${dept.id}: ${dept.name} (${dept.is_active ? 'active' : 'inactive'})`);
    });

    console.log('\n📋 Chat departments:');
    const chatDepts = await db.execute(sql`
      SELECT id, name, is_active FROM chat_departments ORDER BY id
    `);
    chatDepts.rows.forEach((dept: any) => {
      console.log(`  ${dept.id}: ${dept.name} (${dept.is_active ? 'active' : 'inactive'})`);
    });

  } catch (error) {
    console.error('Error checking department counts:', error);
  }

  process.exit(0);
}

checkDepartmentCounts();
