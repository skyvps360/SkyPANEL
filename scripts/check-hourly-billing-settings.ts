import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function checkHourlyBillingSettings() {
  try {
    console.log('🔍 Checking hourly billing settings in database...');

    // Check if settings exist in the settings table
    const settings = await db.execute(sql`
      SELECT "key", "value", "updated_at" 
      FROM "settings" 
      WHERE "key" IN (
        'server_hourly_billing_enabled',
        'server_hours_per_month', 
        'server_hourly_billing_cron_schedule'
      )
      ORDER BY "key";
    `);

    console.log('\n📋 Current settings in database:');
    console.log('================================');
    
    if (settings.rows.length === 0) {
      console.log('❌ No hourly billing settings found in database!');
    } else {
      settings.rows.forEach((row: any) => {
        console.log(`${row.key}: ${row.value} (updated: ${row.updated_at})`);
      });
    }

    // Check specifically for server_hours_per_month
    const hoursPerMonth = await db.execute(sql`
      SELECT "key", "value" FROM "settings" WHERE "key" = 'server_hours_per_month';
    `);

    console.log('\n🔍 server_hours_per_month setting:');
    console.log('==================================');
    
    if (hoursPerMonth.rows.length === 0) {
      console.log('❌ server_hours_per_month setting is missing!');
    } else {
      console.log(`✅ server_hours_per_month: ${hoursPerMonth.rows[0].value}`);
    }

    // Check if server_hourly_billing_settings table exists and has data
    const billingSettings = await db.execute(sql`
      SELECT * FROM "server_hourly_billing_settings" LIMIT 1;
    `);

    console.log('\n📊 Server hourly billing settings table:');
    console.log('=========================================');
    
    if (billingSettings.rows.length === 0) {
      console.log('❌ No data in server_hourly_billing_settings table!');
    } else {
      console.log('✅ Data found in server_hourly_billing_settings table:');
      console.log(billingSettings.rows[0]);
    }

    // Check all settings to see what's available
    const allSettings = await db.execute(sql`
      SELECT "key", "value" 
      FROM "settings" 
      WHERE "key" LIKE '%hourly%' OR "key" LIKE '%billing%'
      ORDER BY "key";
    `);

    console.log('\n🔍 All billing-related settings:');
    console.log('================================');
    
    if (allSettings.rows.length === 0) {
      console.log('❌ No billing-related settings found!');
    } else {
      allSettings.rows.forEach((row: any) => {
        console.log(`${row.key}: ${row.value}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking settings:', error);
  }
}

checkHourlyBillingSettings()
  .then(() => {
    console.log('\n✅ Settings check completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Settings check failed:', error);
    process.exit(1);
  }); 