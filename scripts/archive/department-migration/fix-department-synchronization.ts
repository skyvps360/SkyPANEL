import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface DepartmentMapping {
  chatId: number;
  chatName: string;
  ticketId?: number;
  ticketName?: string;
  action: 'sync_to_tickets' | 'already_synced' | 'create_mapping';
}

async function fixDepartmentSynchronization() {
  console.log('🔧 Starting department synchronization fix...\n');

  try {
    // 1. Get current state
    console.log('📊 Analyzing current department state...');
    
    const ticketDepts = await db.execute(sql`
      SELECT id, name, description, is_default, requires_vps, is_active, display_order 
      FROM ticket_departments 
      ORDER BY id
    `);
    
    const chatDepts = await db.execute(sql`
      SELECT id, name, description, is_default, is_active, display_order, color, icon 
      FROM chat_departments 
      ORDER BY id
    `);

    console.log(`   Found ${ticketDepts.rows.length} ticket departments`);
    console.log(`   Found ${chatDepts.rows.length} chat departments`);

    // 2. Create mapping strategy
    const mappings: DepartmentMapping[] = [];
    const ticketDeptMap = new Map(ticketDepts.rows.map(d => [d.name.toLowerCase(), d]));

    for (const chatDept of chatDepts.rows) {
      const chatName = chatDept.name.toLowerCase();
      const ticketMatch = ticketDeptMap.get(chatName) || 
                         ticketDeptMap.get(chatName.replace('technical support', 'kvmvps support')) ||
                         ticketDeptMap.get(chatName.replace('vps management', 'kvmvps support'));

      if (ticketMatch) {
        mappings.push({
          chatId: chatDept.id,
          chatName: chatDept.name,
          ticketId: ticketMatch.id,
          ticketName: ticketMatch.name,
          action: 'already_synced'
        });
      } else {
        mappings.push({
          chatId: chatDept.id,
          chatName: chatDept.name,
          action: 'sync_to_tickets'
        });
      }
    }

    // 3. Display synchronization plan
    console.log('\n📋 Department Synchronization Plan:');
    mappings.forEach(mapping => {
      if (mapping.action === 'already_synced') {
        console.log(`   ✅ Chat "${mapping.chatName}" (ID: ${mapping.chatId}) ↔ Ticket "${mapping.ticketName}" (ID: ${mapping.ticketId})`);
      } else {
        console.log(`   🔄 Chat "${mapping.chatName}" (ID: ${mapping.chatId}) → Will create in ticket_departments`);
      }
    });

    // 4. Execute synchronization
    console.log('\n🚀 Executing synchronization...');
    
    const departmentsToSync = mappings.filter(m => m.action === 'sync_to_tickets');
    
    for (const mapping of departmentsToSync) {
      const chatDept = chatDepts.rows.find(d => d.id === mapping.chatId);
      if (!chatDept) continue;

      console.log(`   Creating ticket department: "${chatDept.name}"`);
      
      // Determine if this should be a VPS-related department
      const requiresVps = chatDept.name.toLowerCase().includes('vps') || 
                         chatDept.name.toLowerCase().includes('technical');

      try {
        await db.execute(sql`
          INSERT INTO ticket_departments (name, description, is_default, requires_vps, is_active, display_order)
          VALUES (${chatDept.name}, ${chatDept.description || ''}, ${chatDept.is_default}, ${requiresVps}, ${chatDept.is_active}, ${chatDept.display_order})
        `);
        console.log(`   ✅ Created ticket department: "${chatDept.name}"`);
      } catch (error) {
        console.error(`   ❌ Failed to create ticket department "${chatDept.name}":`, error.message);
      }
    }

    // 5. Verify synchronization
    console.log('\n🔍 Verifying synchronization...');
    
    const updatedTicketDepts = await db.execute(sql`
      SELECT id, name FROM ticket_departments ORDER BY id
    `);
    
    const updatedChatDepts = await db.execute(sql`
      SELECT id, name FROM chat_departments ORDER BY id
    `);

    console.log('\n📊 Updated Department State:');
    console.log('   Ticket Departments:');
    updatedTicketDepts.rows.forEach(dept => {
      console.log(`     ID: ${dept.id} | Name: "${dept.name}"`);
    });
    
    console.log('   Chat Departments:');
    updatedChatDepts.rows.forEach(dept => {
      console.log(`     ID: ${dept.id} | Name: "${dept.name}"`);
    });

    // 6. Check for remaining issues
    console.log('\n🔍 Checking for remaining issues...');
    
    const problematicSessions = await db.execute(sql`
      SELECT cs.id, cs.department_id, cs.status 
      FROM chat_sessions cs
      LEFT JOIN ticket_departments td ON cs.department_id = td.id
      WHERE cs.department_id IS NOT NULL AND td.id IS NULL
    `);

    if (problematicSessions.rows.length > 0) {
      console.log(`   ⚠️  Found ${problematicSessions.rows.length} chat sessions with invalid department_id:`);
      problematicSessions.rows.forEach(session => {
        console.log(`     Session ${session.id}: department_id=${session.department_id} (${session.status})`);
      });
      
      // Fix these sessions by setting them to default department
      const defaultTicketDept = updatedTicketDepts.rows.find(d => d.name === 'General Support');
      if (defaultTicketDept) {
        console.log(`   🔧 Fixing invalid sessions by setting department_id to ${defaultTicketDept.id} (General Support)`);
        
        for (const session of problematicSessions.rows) {
          await db.execute(sql`
            UPDATE chat_sessions 
            SET department_id = ${defaultTicketDept.id}
            WHERE id = ${session.id}
          `);
          console.log(`     ✅ Fixed session ${session.id}`);
        }
      }
    } else {
      console.log('   ✅ No problematic chat sessions found');
    }

    console.log('\n🎉 Department synchronization completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test chat-to-ticket conversion functionality');
    console.log('   2. Verify all departments appear correctly in admin interfaces');
    console.log('   3. Check that new chat sessions can be assigned to all departments');

  } catch (error) {
    console.error('💥 Critical error during department synchronization:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await fixDepartmentSynchronization();
    process.exit(0);
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
