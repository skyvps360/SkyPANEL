import 'dotenv/config';
import { pool } from './db';

async function addChatConversionColumns() {
  const client = await pool.connect();
  
  try {
    console.log('Adding chat-to-ticket conversion columns...');
    
    // Add the new columns to chat_sessions table
    await client.query(`
      ALTER TABLE chat_sessions 
      ADD COLUMN IF NOT EXISTS converted_to_ticket_id INTEGER REFERENCES tickets(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS converted_by_admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);
    
    console.log('✅ Successfully added chat-to-ticket conversion columns');
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_to_ticket_id ON chat_sessions(converted_to_ticket_id);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_at ON chat_sessions(converted_at);
      CREATE INDEX IF NOT EXISTS idx_chat_sessions_converted_by_admin_id ON chat_sessions(converted_by_admin_id);
    `);
    
    console.log('✅ Successfully created indexes for conversion tracking');
    
  } catch (error) {
    console.error('❌ Error adding chat conversion columns:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration
addChatConversionColumns()
  .then(() => {
    console.log('🎉 Chat-to-ticket conversion migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
