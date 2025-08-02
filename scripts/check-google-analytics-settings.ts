import 'dotenv/config';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkGoogleAnalyticsSettings() {
  console.log('🔍 Checking Google Analytics settings in database...');

  try {
    // Define the expected Google Analytics settings
    const expectedSettings = [
      'google_analytics_enabled',
      'google_analytics_measurement_id',
      'google_analytics_api_key',
      'google_analytics_enhanced_ecommerce',
      'google_analytics_debug_mode'
    ];

    console.log('📋 Expected settings:');
    expectedSettings.forEach(setting => console.log(`   • ${setting}`));
    console.log('');

    // Check each setting
    const results = [];
    for (const settingKey of expectedSettings) {
      try {
        const setting = await db.select()
          .from(settings)
          .where(eq(settings.key, settingKey))
          .limit(1);

        if (setting.length > 0) {
          console.log(`✅ Found: ${settingKey} = "${setting[0].value}"`);
          results.push({ key: settingKey, exists: true, value: setting[0].value });
        } else {
          console.log(`❌ Missing: ${settingKey}`);
          results.push({ key: settingKey, exists: false, value: null });
        }
      } catch (error) {
        console.error(`❌ Error checking ${settingKey}:`, error);
        results.push({ key: settingKey, exists: false, value: null, error: true });
      }
    }

    console.log('');
    console.log('📊 Summary:');
    const found = results.filter(r => r.exists).length;
    const missing = results.filter(r => !r.exists).length;
    const errors = results.filter(r => r.error).length;

    console.log(`   ✅ Found: ${found} settings`);
    console.log(`   ❌ Missing: ${missing} settings`);
    if (errors > 0) {
      console.log(`   ⚠️  Errors: ${errors} settings`);
    }

    if (missing === 0 && errors === 0) {
      console.log('');
      console.log('🎉 All Google Analytics settings are properly configured!');
      console.log('');
      console.log('🔧 You can now:');
      console.log('   1. Go to /admin/settings');
      console.log('   2. Select "Google Analytics" tab');
      console.log('   3. Configure your settings');
      console.log('   4. Enable the integration');
    } else {
      console.log('');
      console.log('⚠️  Some settings are missing. Run the migration script:');
      console.log('   npx tsx scripts/add-google-analytics-settings.ts');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }
}

// Run the check
checkGoogleAnalyticsSettings()
  .then(() => {
    console.log('✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  }); 