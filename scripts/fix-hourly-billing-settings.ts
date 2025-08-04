import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function fixHourlyBillingSettings() {
  try {
    console.log('🔧 Fixing hourly billing settings...');

    // Check current state
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

    // Fix missing values
    console.log('\n🔄 Fixing missing values...');
    
    // Fix server_hours_per_month if it has no value
    await db.execute(sql`
      UPDATE "settings" 
      SET "value" = '730', "updated_at" = now()
      WHERE "key" = 'server_hours_per_month' AND ("value" IS NULL OR "value" = '');
    `);

    // Fix server_hourly_billing_cron_schedule if it has no value
    await db.execute(sql`
      UPDATE "settings" 
      SET "value" = '0 * * * *', "updated_at" = now()
      WHERE "key" = 'server_hourly_billing_cron_schedule' AND ("value" IS NULL OR "value" = '');
    `);

    // Ensure server_hourly_billing_enabled has a proper value
    await db.execute(sql`
      UPDATE "settings" 
      SET "value" = 'true', "updated_at" = now()
      WHERE "key" = 'server_hourly_billing_enabled' AND ("value" IS NULL OR "value" = '');
    `);

    // Check final state
    console.log('\n✅ Final settings in database:');
    const finalSettings = await db.execute(sql`
      SELECT "key", "value", "updated_at" 
      FROM "settings" 
      WHERE "key" IN (
        'server_hourly_billing_enabled',
        'server_hours_per_month', 
        'server_hourly_billing_cron_schedule'
      )
      ORDER BY "key";
    `);

    console.log('Final settings:', finalSettings.rows);
    console.log('✅ Hourly billing settings fixed!');

  } catch (error) {
    console.error('❌ Error fixing hourly billing settings:', error);
  }
}

fixHourlyBillingSettings(); 