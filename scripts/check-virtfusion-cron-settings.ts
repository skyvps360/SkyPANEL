#!/usr/bin/env tsx
import { storage } from '../server/storage';
import { virtfusionCronSettings } from '../shared/schemas/virtfusion-billing-schema';
import { sql } from 'drizzle-orm';

async function checkVirtFusionCronSettings() {
  try {
    console.log('🔍 Checking VirtFusion cron settings in database...\n');

    const settings = await storage.db.select()
      .from(virtfusionCronSettings)
      .orderBy(sql`${virtfusionCronSettings.id} DESC`);

    if (settings.length === 0) {
      console.log('❌ No VirtFusion cron settings found in database');
    } else {
      console.log(`✅ Found ${settings.length} VirtFusion cron setting(s):\n`);
      
      settings.forEach((setting, index) => {
        console.log(`Setting ${index + 1}:`);
        console.log(`  ID: ${setting.id}`);
        console.log(`  Enabled: ${setting.enabled ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`  Hourly Billing Enabled: ${setting.hourlyBillingEnabled ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`  Monthly Billing Enabled: ${setting.billingOnFirstEnabled ? '✅ TRUE' : '❌ FALSE'}`);
        console.log(`  Hours Per Month: ${setting.hoursPerMonth}`);
        console.log(`  Last Monthly Billing: ${setting.lastMonthlyBilling || 'Never'}`);
        console.log(`  Last Hourly Billing: ${setting.lastHourlyBilling || 'Never'}`);
        console.log(`  Created At: ${setting.createdAt}`);
        console.log(`  Updated At: ${setting.updatedAt}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('Error checking VirtFusion cron settings:', error);
    process.exit(1);
  }
}

checkVirtFusionCronSettings();
