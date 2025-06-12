import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testSyncButton() {
  console.log('🧪 Testing sync button functionality...\n');

  try {
    // 1. Add a test department to ticket_departments to trigger sync need
    console.log('1️⃣ Adding test department to ticket_departments...');
    await db.execute(sql`
      INSERT INTO ticket_departments (name, description, is_default, requires_vps, is_active, display_order)
      VALUES ('Test Sync Department', 'This department should trigger sync', false, false, true, 999)
      ON CONFLICT (name) DO NOTHING
    `);

    // 2. Add a test department to chat_departments to trigger sync need
    console.log('2️⃣ Adding test department to chat_departments...');
    await db.execute(sql`
      INSERT INTO chat_departments (name, description, is_default, is_active, display_order, color, icon)
      VALUES ('Test Chat Sync', 'This chat department should trigger sync', false, true, 998, '#ff6b6b', 'MessageCircle')
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('✅ Test departments added to legacy tables');
    console.log('🔄 Now check the admin interface - the sync button should appear!');
    console.log('📍 Go to: http://localhost:3000/admin/settings');
    
  } catch (error) {
    console.error('❌ Error setting up sync test:', error);
  }

  process.exit(0);
}

testSyncButton();
