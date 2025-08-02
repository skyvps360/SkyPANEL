import 'dotenv/config';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import { storage } from '../server/storage';

async function addGoogleAnalyticsSettings() {
  console.log('🚀 Adding Google Analytics settings to database...');

  try {
    // Define the Google Analytics settings to add
    const googleAnalyticsSettings = [
      {
        key: 'google_analytics_enabled',
        value: 'false',
        description: 'Enable Google Analytics 4 tracking'
      },
      {
        key: 'google_analytics_measurement_id',
        value: '',
        description: 'Google Analytics 4 Measurement ID (G-XXXXXXXXXX)'
      },
      {
        key: 'google_analytics_api_key',
        value: '',
        description: 'Google Cloud API key for advanced analytics features'
      },
      {
        key: 'google_analytics_custom_code',
        value: '',
        description: 'Custom HTML/JS code for Google Analytics'
      },
      {
        key: 'google_analytics_enhanced_ecommerce',
        value: 'false',
        description: 'Enable enhanced ecommerce tracking'
      },
      {
        key: 'google_analytics_debug_mode',
        value: 'false',
        description: 'Enable debug mode for development and testing'
      }
    ];

    // Add each setting to the database
    for (const setting of googleAnalyticsSettings) {
      try {
        // Check if setting already exists
        const existingSetting = await db.select()
          .from(settings)
          .where(eq(settings.key, setting.key))
          .limit(1);

        if (existingSetting.length === 0) {
          // Insert new setting
          await db.insert(settings).values({
            key: setting.key,
            value: setting.value,
            updatedAt: new Date()
          });
          console.log(`✅ Added setting: ${setting.key} - ${setting.description}`);
        } else {
          console.log(`⏭️  Setting already exists: ${setting.key}`);
        }
      } catch (error) {
        console.error(`❌ Error adding setting ${setting.key}:`, error);
      }
    }

    console.log('🎉 Google Analytics settings migration completed successfully!');
    console.log('');
    console.log('📋 Added settings:');
    console.log('   • google_analytics_enabled - Enable/disable Google Analytics');
    console.log('   • google_analytics_measurement_id - GA4 Measurement ID');
    console.log('   • google_analytics_api_key - Google Cloud API key');
    console.log('   • google_analytics_custom_code - Custom HTML/JS code');
    console.log('   • google_analytics_enhanced_ecommerce - Enhanced ecommerce tracking');
    console.log('   • google_analytics_debug_mode - Debug mode for development');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Go to /admin/settings');
    console.log('   2. Select "Google Analytics" tab');
    console.log('   3. Configure your GA4 Measurement ID');
    console.log('   4. Enable the integration');
    console.log('   5. Test the connection');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Import required dependencies
import { eq } from 'drizzle-orm';

// Run the migration
addGoogleAnalyticsSettings()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }); 