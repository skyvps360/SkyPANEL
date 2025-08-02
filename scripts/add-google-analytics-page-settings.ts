import 'dotenv/config';
import { db } from '../server/db';
import { settings } from '../shared/schema';
import { storage } from '../server/storage';
import { eq } from 'drizzle-orm';

async function addGoogleAnalyticsPageSettings() {
  console.log('🚀 Adding Google Analytics page-specific settings to database...');

  try {
    // Default enabled pages - all major pages enabled by default
    const defaultEnabledPages = [
      '/',
      '/dashboard',
      '/servers',
      '/billing',
      '/dns',
      '/blog',
      '/docs',
      '/plans',
      '/status',
      '/api-docs'
    ];

    // Define the new Google Analytics page settings
    const googleAnalyticsPageSettings = [
      {
        key: 'google_analytics_enabled_pages',
        value: JSON.stringify(defaultEnabledPages),
        description: 'JSON array of page paths where Google Analytics should be enabled'
      }
    ];

    // Add each setting to the database
    for (const setting of googleAnalyticsPageSettings) {
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

    console.log('🎉 Google Analytics page settings migration completed successfully!');
    console.log('');
    console.log('📋 Added settings:');
    console.log('   • google_analytics_enabled_pages - Control which pages have Google Analytics');
    console.log('');
    console.log('📄 Default enabled pages:');
    defaultEnabledPages.forEach(page => {
      console.log(`      - ${page}`);
    });
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Go to /admin/settings');
    console.log('   2. Select "Google Analytics" tab');
    console.log('   3. Configure which pages should have Google Analytics enabled');
    console.log('   4. Save your changes');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
addGoogleAnalyticsPageSettings()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }); 