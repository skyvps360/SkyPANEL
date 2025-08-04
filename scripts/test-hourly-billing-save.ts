import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function testHourlyBillingSave() {
  try {
    console.log('🧪 Testing hourly billing settings save...');

    // First, let's see what's currently in the database
    console.log('\n📋 Current settings in database:');
    const currentSettings = await db.execute(sql`
      SELECT "key", "value", "updated_at" 
      FROM "settings" 
      WHERE "key" IN (
        'server_hourly_billing_enabled',
        'server_hours_per_month', 
        'server_hourly_billing_cron_schedule'
      )
      ORDER BY "key";
    `);

    console.log('Current settings:', currentSettings.rows);

    // Now let's test updating the setting
    console.log('\n🔄 Testing setting update...');
    await db.execute(sql`
      UPDATE "settings" 
      SET "value" = 'false', "updated_at" = now()
      WHERE "key" = 'server_hourly_billing_enabled';
    `);

    // Check if it was updated
    const updatedSettings = await db.execute(sql`
      SELECT "key", "value", "updated_at" 
      FROM "settings" 
      WHERE "key" = 'server_hourly_billing_enabled';
    `);

    console.log('Updated setting:', updatedSettings.rows[0]);

    // Now let's set it back to true
    await db.execute(sql`
      UPDATE "settings" 
      SET "value" = 'true', "updated_at" = now()
      WHERE "key" = 'server_hourly_billing_enabled';
    `);

    console.log('✅ Test completed - settings can be updated in database');

  } catch (error) {
    console.error('❌ Error testing hourly billing save:', error);
  }
}

testHourlyBillingSave(); 