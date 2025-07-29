import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addHubspotSettings() {
  try {
    console.log('Starting HubSpot settings migration...');
    
    // Add HubSpot settings to the settings table
      const hubspotSettings = [
    { key: 'hubspot_enabled', value: 'false', description: 'Enable HubSpot integration' },
    { key: 'hubspot_portal_id', value: '', description: 'HubSpot portal ID' },
    { key: 'hubspot_api_key', value: '', description: 'HubSpot API key' },
    { key: 'hubspot_chat_enabled', value: 'false', description: 'Enable HubSpot live chat' },
    { key: 'hubspot_ticket_enabled', value: 'false', description: 'Enable HubSpot ticket support' },
    { key: 'hubspot_ticket_form_id', value: '', description: 'HubSpot ticket form ID' },
    { key: 'hubspot_contact_form_id', value: '', description: 'HubSpot contact form ID' },
  ];

    console.log('Adding HubSpot settings to database...');
    
    for (const setting of hubspotSettings) {
      console.log(`Adding setting: ${setting.key}`);
      
      // Check if setting already exists
      const existingSetting = await db.execute(sql`
        SELECT id FROM settings WHERE "key" = ${setting.key}
      `);
      
      if (existingSetting.length === 0) {
        // Insert new setting
        await db.execute(sql`
          INSERT INTO settings ("key", "value", "description", "created_at", "updated_at")
          VALUES (${setting.key}, ${setting.value}, ${setting.description}, NOW(), NOW())
        `);
        console.log(`✅ Added setting: ${setting.key}`);
      } else {
        console.log(`⏭️  Setting already exists: ${setting.key}`);
      }
    }
    
    console.log('✅ HubSpot settings migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add HubSpot settings:', error);
    process.exit(1);
  }
}

// Run the migration
addHubspotSettings(); 