import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

interface DepartmentAnalysis {
  ticketDepartments: any[];
  chatDepartments: any[];
  chatSessionsWithDepartmentId: any[];
  mismatches: {
    chatDepartmentIdsNotInTickets: number[];
    ticketDepartmentIdsNotInChat: number[];
  };
  recommendations: string[];
}

async function analyzeDepartmentMismatch(): Promise<DepartmentAnalysis> {
  console.log('🔍 Starting comprehensive department analysis...\n');

  const analysis: DepartmentAnalysis = {
    ticketDepartments: [],
    chatDepartments: [],
    chatSessionsWithDepartmentId: [],
    mismatches: {
      chatDepartmentIdsNotInTickets: [],
      ticketDepartmentIdsNotInChat: []
    },
    recommendations: []
  };

  try {
    // 1. Get all ticket departments
    console.log('📋 Fetching ticket departments...');
    try {
      const ticketDepts = await db.execute(sql`
        SELECT id, name, description, is_default, requires_vps, is_active, display_order, created_at 
        FROM ticket_departments 
        ORDER BY id
      `);
      analysis.ticketDepartments = ticketDepts.rows;
      console.log(`   Found ${analysis.ticketDepartments.length} ticket departments`);
    } catch (error) {
      console.log(`   ❌ Error querying ticket_departments: ${error.message}`);
      analysis.recommendations.push('ticket_departments table may not exist or be accessible');
    }

    // 2. Get all chat departments
    console.log('💬 Fetching chat departments...');
    try {
      const chatDepts = await db.execute(sql`
        SELECT id, name, description, is_default, is_active, display_order, color, icon, created_at, updated_at 
        FROM chat_departments 
        ORDER BY id
      `);
      analysis.chatDepartments = chatDepts.rows;
      console.log(`   Found ${analysis.chatDepartments.length} chat departments`);
    } catch (error) {
      console.log(`   ❌ Error querying chat_departments: ${error.message}`);
      analysis.recommendations.push('chat_departments table may not exist or be accessible');
    }

    // 3. Get chat sessions with department_id
    console.log('🗨️  Fetching chat sessions with department assignments...');
    try {
      const sessions = await db.execute(sql`
        SELECT id, user_id, department_id, status, subject, created_at 
        FROM chat_sessions 
        WHERE department_id IS NOT NULL 
        ORDER BY id
      `);
      analysis.chatSessionsWithDepartmentId = sessions.rows;
      console.log(`   Found ${analysis.chatSessionsWithDepartmentId.length} chat sessions with department_id`);
    } catch (error) {
      console.log(`   ❌ Error querying chat_sessions: ${error.message}`);
      analysis.recommendations.push('chat_sessions table may not exist or be accessible');
    }

    // 4. Analyze mismatches
    console.log('\n🔍 Analyzing department ID mismatches...');
    
    if (analysis.ticketDepartments.length > 0 && analysis.chatDepartments.length > 0) {
      const ticketDeptIds = new Set(analysis.ticketDepartments.map(d => d.id));
      const chatDeptIds = new Set(analysis.chatDepartments.map(d => d.id));

      // Find chat department IDs that don't exist in ticket departments
      analysis.mismatches.chatDepartmentIdsNotInTickets = analysis.chatDepartments
        .filter(d => !ticketDeptIds.has(d.id))
        .map(d => d.id);

      // Find ticket department IDs that don't exist in chat departments
      analysis.mismatches.ticketDepartmentIdsNotInChat = analysis.ticketDepartments
        .filter(d => !chatDeptIds.has(d.id))
        .map(d => d.id);

      console.log(`   Chat department IDs not in tickets: [${analysis.mismatches.chatDepartmentIdsNotInTickets.join(', ')}]`);
      console.log(`   Ticket department IDs not in chat: [${analysis.mismatches.ticketDepartmentIdsNotInChat.join(', ')}]`);

      // Check for the specific error case (department_id=4)
      const problematicSessions = analysis.chatSessionsWithDepartmentId.filter(s => 
        !ticketDeptIds.has(s.department_id)
      );
      
      if (problematicSessions.length > 0) {
        console.log(`   ⚠️  Found ${problematicSessions.length} chat sessions with department_id that don't exist in ticket_departments:`);
        problematicSessions.forEach(session => {
          console.log(`      Session ${session.id}: department_id=${session.department_id} (${session.status})`);
        });
      }
    }

    // 5. Generate recommendations
    console.log('\n💡 Generating recommendations...');
    
    if (analysis.ticketDepartments.length === 0) {
      analysis.recommendations.push('Create ticket_departments table and populate with default departments');
    }
    
    if (analysis.chatDepartments.length === 0) {
      analysis.recommendations.push('Create chat_departments table and populate with default departments');
    }

    if (analysis.mismatches.chatDepartmentIdsNotInTickets.length > 0) {
      analysis.recommendations.push(`Sync missing chat departments to ticket_departments: IDs [${analysis.mismatches.chatDepartmentIdsNotInTickets.join(', ')}]`);
    }

    if (analysis.mismatches.ticketDepartmentIdsNotInChat.length > 0) {
      analysis.recommendations.push(`Sync missing ticket departments to chat_departments: IDs [${analysis.mismatches.ticketDepartmentIdsNotInChat.join(', ')}]`);
    }

    if (analysis.chatSessionsWithDepartmentId.some(s => !new Set(analysis.ticketDepartments.map(d => d.id)).has(s.department_id))) {
      analysis.recommendations.push('Fix chat sessions with invalid department_id references before attempting chat-to-ticket conversion');
    }

    return analysis;

  } catch (error) {
    console.error('❌ Critical error during analysis:', error);
    analysis.recommendations.push(`Critical error: ${error.message}`);
    return analysis;
  }
}

async function printDetailedReport(analysis: DepartmentAnalysis) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DETAILED DEPARTMENT ANALYSIS REPORT');
  console.log('='.repeat(80));

  console.log('\n📋 TICKET DEPARTMENTS:');
  if (analysis.ticketDepartments.length > 0) {
    analysis.ticketDepartments.forEach(dept => {
      console.log(`   ID: ${dept.id} | Name: "${dept.name}" | Default: ${dept.is_default} | Active: ${dept.is_active}`);
    });
  } else {
    console.log('   ❌ No ticket departments found');
  }

  console.log('\n💬 CHAT DEPARTMENTS:');
  if (analysis.chatDepartments.length > 0) {
    analysis.chatDepartments.forEach(dept => {
      console.log(`   ID: ${dept.id} | Name: "${dept.name}" | Default: ${dept.is_default} | Active: ${dept.is_active}`);
    });
  } else {
    console.log('   ❌ No chat departments found');
  }

  console.log('\n🗨️  CHAT SESSIONS WITH DEPARTMENT_ID:');
  if (analysis.chatSessionsWithDepartmentId.length > 0) {
    const deptCounts = analysis.chatSessionsWithDepartmentId.reduce((acc, session) => {
      acc[session.department_id] = (acc[session.department_id] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    Object.entries(deptCounts).forEach(([deptId, count]) => {
      console.log(`   Department ID ${deptId}: ${count} sessions`);
    });
  } else {
    console.log('   ✅ No chat sessions with department_id assignments');
  }

  console.log('\n⚠️  IDENTIFIED MISMATCHES:');
  if (analysis.mismatches.chatDepartmentIdsNotInTickets.length > 0) {
    console.log(`   Chat department IDs missing from tickets: [${analysis.mismatches.chatDepartmentIdsNotInTickets.join(', ')}]`);
  }
  if (analysis.mismatches.ticketDepartmentIdsNotInChat.length > 0) {
    console.log(`   Ticket department IDs missing from chat: [${analysis.mismatches.ticketDepartmentIdsNotInChat.join(', ')}]`);
  }
  if (analysis.mismatches.chatDepartmentIdsNotInTickets.length === 0 && analysis.mismatches.ticketDepartmentIdsNotInChat.length === 0) {
    console.log('   ✅ No ID mismatches found between department tables');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  if (analysis.recommendations.length > 0) {
    analysis.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  } else {
    console.log('   ✅ No issues found - departments are properly synchronized');
  }

  console.log('\n' + '='.repeat(80));
}

// Main execution
async function main() {
  try {
    const analysis = await analyzeDepartmentMismatch();
    await printDetailedReport(analysis);
    
    // Exit with appropriate code
    const hasIssues = analysis.recommendations.length > 0;
    process.exit(hasIssues ? 1 : 0);
    
  } catch (error) {
    console.error('💥 Fatal error during department analysis:', error);
    process.exit(1);
  }
}

main().catch(console.error);
