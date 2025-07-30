import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function addGoogleAnalyticsSettings() {
  try {
    console.log('Starting Google Analytics settings migration...');
    
    // Insert Google Analytics settings into the settings table
    console.log('Adding Google Analytics settings...');
    
    const settings = [
      {
        key: 'google_analytics_enabled',
        value: 'false',
        description: 'Enable Google Analytics tracking'
      },
      {
        key: 'google_analytics_tracking_id',
        value: '',
        description: 'Google Analytics 4 tracking ID (G-XXXXXXXXXX)'
      },
      {
        key: 'google_analytics_code',
        value: '',
        description: 'Custom Google Analytics tracking code'
      },
      {
        key: 'google_analytics_selected_pages',
        value: '["/", "/auth", "/blog", "/docs", "/status", "/plans", "/team", "/tos", "/privacy", "/sla-plans", "/sla"]',
        description: 'Selected pages for Google Analytics tracking (JSON array)'
      }
    ];
    
    for (const setting of settings) {
      console.log(`Adding setting: ${setting.key}`);
      await db.execute(sql`
        INSERT INTO "settings" ("key", "value", "updated_at")
        VALUES (${setting.key}, ${setting.value}, NOW())
        ON CONFLICT ("key") DO UPDATE SET
          "value" = EXCLUDED."value",
          "updated_at" = NOW();
      `);
    }
    
    console.log('✅ Google Analytics settings added successfully!');
    console.log('Settings added:');
    settings.forEach(setting => {
      console.log(`  - ${setting.key}: ${setting.description}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add Google Analytics settings:', error);
    process.exit(1);
  }
}

// Run the migration
addGoogleAnalyticsSettings(); 