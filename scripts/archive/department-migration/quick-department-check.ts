import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function quickDepartmentCheck() {
  console.log('🔍 Quick department check and synchronization...\n');

  try {
    // Check current state
    const supportDepts = await db.execute(sql`
      SELECT id, name, is_active, requires_vps FROM support_departments ORDER BY id
    `);
    
    const ticketDepts = await db.execute(sql`
      SELECT id, name, is_active, requires_vps FROM ticket_departments ORDER BY id
    `);

    console.log('📊 Current state:');
    console.log('Support departments (unified):');
    supportDepts.rows.forEach((dept: any) => {
      console.log(`  ID: ${dept.id} | Name: "${dept.name}" | Active: ${dept.is_active} | Requires VPS: ${dept.requires_vps}`);
    });
    
    console.log('\nTicket departments (legacy):');
    ticketDepts.rows.forEach((dept: any) => {
      console.log(`  ID: ${dept.id} | Name: "${dept.name}" | Active: ${dept.is_active} | Requires VPS: ${dept.requires_vps}`);
    });

    // Check for any tickets that might be using the wrong department IDs
    const ticketsByDept = await db.execute(sql`
      SELECT department_id, COUNT(*) as count 
      FROM tickets 
      WHERE department_id IS NOT NULL 
      GROUP BY department_id 
      ORDER BY department_id
    `);

    console.log('\n📋 Tickets by department_id:');
    if (ticketsByDept.rows.length > 0) {
      ticketsByDept.rows.forEach((row: any) => {
        const supportDept = supportDepts.rows.find((d: any) => d.id === row.department_id);
        const status = supportDept ? '✅' : '❌';
        console.log(`  ${status} dept_id: ${row.department_id}, tickets: ${row.count}${supportDept ? ` ("${supportDept.name}")` : ' (NOT FOUND in support_departments)'}`);
      });
    } else {
      console.log('  No tickets found');
    }

    // Create a mapping based on name matching
    console.log('\n🔄 Department name mapping:');
    for (const ticketDept of ticketDepts.rows) {
      const matchingSupportDept = supportDepts.rows.find((supportDept: any) => 
        supportDept.name.toLowerCase() === ticketDept.name.toLowerCase()
      );
      
      if (matchingSupportDept) {
        console.log(`  "${ticketDept.name}": legacy_id=${ticketDept.id} → support_id=${matchingSupportDept.id}`);
      } else {
        console.log(`  ❌ "${ticketDept.name}": legacy_id=${ticketDept.id} → NO MATCH`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

quickDepartmentCheck();
