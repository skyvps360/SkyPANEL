import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';

async function disableVirtFusionCron() {
  try {
    console.log('Starting VirtFusion cron disable script...');
    
    // Check current VirtFusion cron settings
    console.log('Checking current VirtFusion cron settings...');
    const currentSettings = await db.execute(sql`
      SELECT * FROM "virtfusion_cron_settings" ORDER BY "id" DESC LIMIT 1;
    `);
    
    if (currentSettings.rows.length > 0) {
      const setting = currentSettings.rows[0];
      console.log('Current VirtFusion cron settings:', {
        id: setting.id,
        enabled: setting.enabled,
        hourlyBillingEnabled: setting.hourly_billing_enabled,
        billingOnFirstEnabled: setting.billing_on_first_enabled
      });
      
      // Disable the VirtFusion cron
      console.log('Disabling VirtFusion cron...');
      await db.execute(sql`
        UPDATE "virtfusion_cron_settings" 
        SET "enabled" = false, "updated_at" = CURRENT_TIMESTAMP 
        WHERE "id" = ${setting.id};
      `);
      
      console.log('✅ VirtFusion cron disabled successfully!');
    } else {
      console.log('No VirtFusion cron settings found. Creating disabled settings...');
      await db.execute(sql`
        INSERT INTO "virtfusion_cron_settings" 
          ("enabled", "hours_per_month", "billing_on_first_enabled", "hourly_billing_enabled")
        VALUES (false, 730, true, true);
      `);
      console.log('✅ VirtFusion cron settings created (disabled by default)!');
    }
    
    // Verify the change
    console.log('Verifying changes...');
    const updatedSettings = await db.execute(sql`
      SELECT * FROM "virtfusion_cron_settings" ORDER BY "id" DESC LIMIT 1;
    `);
    
    if (updatedSettings.rows.length > 0) {
      const setting = updatedSettings.rows[0];
      console.log('Updated VirtFusion cron settings:', {
        id: setting.id,
        enabled: setting.enabled,
        hourlyBillingEnabled: setting.hourly_billing_enabled,
        billingOnFirstEnabled: setting.billing_on_first_enabled
      });
    }
    
    console.log('✅ VirtFusion cron disable script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to disable VirtFusion cron:', error);
    process.exit(1);
  }
}

// Run the script
disableVirtFusionCron();
