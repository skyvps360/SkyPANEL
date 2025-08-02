import 'dotenv/config';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function debugGoogleAnalyticsSettings() {
  console.log('🔍 Debugging Google Analytics settings...');

  try {
    // Check all Google Analytics related settings
    const gaSettings = [
      'google_analytics_enabled',
      'google_analytics_measurement_id',
      'google_analytics_api_key',
      'google_analytics_enhanced_ecommerce',
      'google_analytics_debug_mode',
      'google_analytics_enabled_pages'
    ];

    console.log('📋 Current Google Analytics settings:');
    for (const settingKey of gaSettings) {
      const setting = await db.select()
        .from(settings)
        .where(eq(settings.key, settingKey))
        .limit(1);

      if (setting.length > 0) {
        console.log(`   • ${settingKey}: "${setting[0].value}"`);
        
        // Special handling for enabled pages
        if (settingKey === 'google_analytics_enabled_pages') {
          try {
            const pages = JSON.parse(setting[0].value);
            console.log(`     Parsed as: ${JSON.stringify(pages, null, 2)}`);
          } catch (error) {
            console.log(`     Failed to parse as JSON: ${error.message}`);
            console.log(`     Raw value: "${setting[0].value}"`);
          }
        }
      } else {
        console.log(`   • ${settingKey}: NOT SET`);
      }
    }

    console.log('');
    console.log('🔧 Testing API endpoint...');
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/settings/google-analytics');
    if (response.ok) {
      const data = await response.json();
      console.log('API Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('API Error:', response.status, response.statusText);
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugGoogleAnalyticsSettings()
  .then(() => {
    console.log('✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  }); 