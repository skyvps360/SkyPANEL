import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * Migrates ticket department references from legacy ticket departments to the unified support departments.
 *
 * This function analyzes current department data, creates a mapping between legacy and unified departments by name, updates tickets to reference the correct support department, verifies the migration, and logs any remaining inconsistencies. It also outputs the final mapping for use in frontend and API updates.
 *
 * @throws {Error} If any database operation fails during the migration process.
 */
async function fixTicketDepartmentMigration() {
  console.log('🔧 Fixing ticket department migration issue...\n');

  try {
    // 1. Analyze current state
    console.log('📊 Current department state:');
    
    const supportDepts = await db.execute(sql`
      SELECT id, name, is_active FROM support_departments ORDER BY id
    `);
    console.log('Support departments (unified):');
    supportDepts.rows.forEach((dept: unknown) => {
      console.log(`  ID: ${dept.id} | Name: "${dept.name}" | Active: ${dept.is_active}`);
    });
    
    const ticketDepts = await db.execute(sql`
      SELECT id, name, is_active FROM ticket_departments ORDER BY id
    `);
    console.log('\nTicket departments (legacy):');
    ticketDepts.rows.forEach((dept: unknown) => {
      console.log(`  ID: ${dept.id} | Name: "${dept.name}" | Active: ${dept.is_active}`);
    });

    // 2. Check tickets table to see what department_ids are being used
    console.log('\n📋 Checking tickets table...');
    const tickets = await db.execute(sql`
      SELECT department_id, legacy_department_id, COUNT(*) as count 
      FROM tickets 
      WHERE department_id IS NOT NULL OR legacy_department_id IS NOT NULL
      GROUP BY department_id, legacy_department_id
      ORDER BY department_id, legacy_department_id
    `);
    
    if (tickets.rows.length > 0) {
      console.log('Tickets by department:');
      tickets.rows.forEach((row: unknown) => {
        console.log(`  department_id: ${row.department_id}, legacy_department_id: ${row.legacy_department_id}, count: ${row.count}`);
      });
    } else {
      console.log('No tickets found with department assignments');
    }

    // 3. Create mapping between legacy ticket departments and support departments
    console.log('\n🔄 Creating department mapping...');
    const departmentMapping = new Map();
    
    // Map by name (case insensitive)
    for (const ticketDept of ticketDepts.rows) {
      const matchingSupportDept = supportDepts.rows.find((supportDept: unknown) => 
        supportDept.name.toLowerCase() === ticketDept.name.toLowerCase()
      );
      
      if (matchingSupportDept) {
        departmentMapping.set(ticketDept.id, matchingSupportDept.id);
        console.log(`  Mapping: ticket_dept ${ticketDept.id} ("${ticketDept.name}") → support_dept ${matchingSupportDept.id}`);
      } else {
        console.log(`  ❌ No matching support department found for ticket department ${ticketDept.id} ("${ticketDept.name}")`);
      }
    }

    // 4. Update any existing tickets to use the correct department_id
    console.log('\n🔧 Updating existing tickets...');
    for (const [legacyId, supportId] of departmentMapping) {
      const result = await db.execute(sql`
        UPDATE tickets 
        SET department_id = ${supportId}, legacy_department_id = ${legacyId}
        WHERE department_id = ${legacyId} OR (department_id IS NULL AND legacy_department_id = ${legacyId})
      `);
      console.log(`  Updated tickets with legacy department ${legacyId} to use support department ${supportId}`);
    }

    // 5. Verify the fix
    console.log('\n✅ Verification:');
    const updatedTickets = await db.execute(sql`
      SELECT t.department_id, sd.name as support_dept_name, COUNT(*) as count
      FROM tickets t
      LEFT JOIN support_departments sd ON t.department_id = sd.id
      WHERE t.department_id IS NOT NULL
      GROUP BY t.department_id, sd.name
      ORDER BY t.department_id
    `);
    
    if (updatedTickets.rows.length > 0) {
      console.log('Tickets by support department:');
      updatedTickets.rows.forEach((row: unknown) => {
        console.log(`  Support dept ${row.department_id} ("${row.support_dept_name}"): ${row.count} tickets`);
      });
    }

    // 6. Check for any remaining issues
    const problematicTickets = await db.execute(sql`
      SELECT id, department_id, legacy_department_id 
      FROM tickets 
      WHERE department_id IS NOT NULL 
      AND department_id NOT IN (SELECT id FROM support_departments)
    `);
    
    if (problematicTickets.rows.length > 0) {
      console.log('\n⚠️  Remaining problematic tickets:');
      problematicTickets.rows.forEach((ticket: unknown) => {
        console.log(`  Ticket ${ticket.id}: department_id=${ticket.department_id} (not found in support_departments)`);
      });
    } else {
      console.log('\n✅ All tickets now have valid department_id references');
    }

    // 7. Display the final mapping for reference
    console.log('\n📋 Final Department ID Mapping:');
    console.log('For frontend/API usage:');
    console.log('Legacy ticket_departments ID → Current support_departments ID');
    for (const [legacyId, supportId] of departmentMapping) {
      const ticketDept = ticketDepts.rows.find((d: unknown) => d.id === legacyId);
      console.log(`  ${legacyId} ("${ticketDept?.name}") → ${supportId}`);
    }

    console.log('\n🎉 Department migration fix completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('1. Update frontend to use support_departments API instead of ticket_departments');
    console.log('2. Update validation code to check support_departments instead of ticket_departments');
    console.log('3. Test ticket creation with the correct department IDs');

  } catch (error) {
    console.error('💥 Error during department migration fix:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixTicketDepartmentMigration();
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
