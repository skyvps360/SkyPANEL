/**
 * Script to verify VirtFusion hourly billing setup
 * Checks that all servers have proper creation timestamps for accurate hourly billing
 * 
 * Run with: npx tsx scripts/verify-hourly-billing-setup.ts
 */

import 'dotenv/config';
import { db } from '../server/db';
import { sql } from 'drizzle-orm';
import { virtfusionHourlyBilling, virtfusionCronSettings } from '../shared/schemas/virtfusion-billing-schema';

async function verifyHourlyBillingSetup() {
  console.log('🔍 Verifying VirtFusion Hourly Billing Setup...\n');
  
  try {
    // 1. Check cron settings
    console.log('1️⃣ Checking VirtFusion Cron Settings:');
    const cronSettings = await db.select()
      .from(virtfusionCronSettings)
      .orderBy(sql`${virtfusionCronSettings.id} DESC`)
      .limit(1);
    
    if (cronSettings.length === 0) {
      console.log('   ❌ No cron settings found - cron jobs will not run');
    } else {
      const setting = cronSettings[0];
      console.log(`   Cron Enabled: ${setting.enabled ? '✅ Yes' : '❌ No'}`);
      console.log(`   Hourly Billing: ${setting.hourlyBillingEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Monthly Billing: ${setting.billingOnFirstEnabled ? '✅ Enabled' : '❌ Disabled'}`);
      console.log(`   Hours per Month: ${setting.hoursPerMonth}`);
      
      if (setting.lastHourlyBilling) {
        const lastRun = new Date(setting.lastHourlyBilling);
        const minutesAgo = Math.floor((Date.now() - lastRun.getTime()) / (1000 * 60));
        console.log(`   Last Hourly Run: ${lastRun.toISOString()} (${minutesAgo} minutes ago)`);
      } else {
        console.log(`   Last Hourly Run: Never`);
      }
    }
    
    // 2. Check billing records
    console.log('\n2️⃣ Checking Billing Records:');
    const allBillingRecords = await db.select({
      id: virtfusionHourlyBilling.id,
      userId: virtfusionHourlyBilling.userId,
      serverId: virtfusionHourlyBilling.serverId,
      serverUuid: virtfusionHourlyBilling.serverUuid,
      packageName: virtfusionHourlyBilling.packageName,
      monthlyPrice: virtfusionHourlyBilling.monthlyPrice,
      hourlyRate: virtfusionHourlyBilling.hourlyRate,
      billingEnabled: virtfusionHourlyBilling.billingEnabled,
      serverCreatedAt: virtfusionHourlyBilling.serverCreatedAt,
      lastBilledAt: virtfusionHourlyBilling.lastBilledAt,
      createdAt: virtfusionHourlyBilling.createdAt
    })
    .from(virtfusionHourlyBilling)
    .orderBy(virtfusionHourlyBilling.id);
    
    console.log(`   Total billing records: ${allBillingRecords.length}`);
    
    const enabledRecords = allBillingRecords.filter(r => r.billingEnabled);
    const disabledRecords = allBillingRecords.filter(r => !r.billingEnabled);
    const missingCreatedAt = allBillingRecords.filter(r => !r.serverCreatedAt);
    const missingUuid = allBillingRecords.filter(r => !r.serverUuid);
    
    console.log(`   Active (billing enabled): ${enabledRecords.length}`);
    console.log(`   Inactive (billing disabled): ${disabledRecords.length}`);
    console.log(`   Missing serverCreatedAt: ${missingCreatedAt.length} ${missingCreatedAt.length > 0 ? '⚠️' : '✅'}`);
    console.log(`   Missing serverUuid: ${missingUuid.length} ${missingUuid.length > 0 ? '⚠️' : '✅'}`);
    
    // 3. Show upcoming billing schedule
    console.log('\n3️⃣ Upcoming Billing Schedule:');
    const now = new Date();
    const oneHourMs = 60 * 60 * 1000;
    const upcomingBills: Array<{serverId: number, userId: number, nextBill: Date, minutesUntil: number}> = [];
    
    for (const record of enabledRecords) {
      if (!record.serverCreatedAt) continue;
      
      const serverCreatedAt = new Date(record.serverCreatedAt);
      const nextStart = record.lastBilledAt
        ? new Date(record.lastBilledAt)
        : new Date(serverCreatedAt.getTime() + oneHourMs);
      
      const minutesUntil = Math.ceil((nextStart.getTime() - now.getTime()) / (1000 * 60));
      
      if (minutesUntil <= 60 && minutesUntil > 0) { // Show servers due within the next hour
        upcomingBills.push({
          serverId: record.serverId,
          userId: record.userId,
          nextBill: nextStart,
          minutesUntil
        });
      } else if (minutesUntil <= 0) {
        // Server is overdue for billing
        const hoursOverdue = Math.floor(Math.abs(minutesUntil) / 60);
        console.log(`   ⚠️ Server ${record.serverId} (User ${record.userId}) is OVERDUE by ${hoursOverdue}h ${Math.abs(minutesUntil) % 60}m`);
      }
    }
    
    // Sort by next billing time
    upcomingBills.sort((a, b) => a.minutesUntil - b.minutesUntil);
    
    if (upcomingBills.length > 0) {
      console.log('   Servers due for billing in the next hour:');
      for (const bill of upcomingBills) {
        console.log(`   - Server ${bill.serverId} (User ${bill.userId}): Due in ${bill.minutesUntil}m at ${bill.nextBill.toISOString()}`);
      }
    } else {
      console.log('   No servers due for billing in the next hour');
    }
    
    // 4. Show problematic records
    if (missingCreatedAt.length > 0) {
      console.log('\n4️⃣ ⚠️ Servers Missing Creation Timestamp (need migration):');
      for (const record of missingCreatedAt.slice(0, 10)) { // Show first 10
        console.log(`   - Server ${record.serverId} (User ${record.userId}, Package: ${record.packageName})`);
      }
      if (missingCreatedAt.length > 10) {
        console.log(`   ... and ${missingCreatedAt.length - 10} more`);
      }
      console.log('\n   Run: npm run script scripts/populate-missing-server-uuids.ts');
    }
    
    // 5. Calculate revenue
    console.log('\n5️⃣ Revenue Analysis:');
    let totalHourlyRevenue = 0;
    let totalMonthlyRevenue = 0;
    
    for (const record of enabledRecords) {
      const hourlyRate = parseFloat(record.hourlyRate.toString());
      const monthlyPrice = parseFloat(record.monthlyPrice.toString());
      totalHourlyRevenue += hourlyRate;
      totalMonthlyRevenue += monthlyPrice;
    }
    
    console.log(`   Active servers hourly revenue: $${totalHourlyRevenue.toFixed(4)}/hour`);
    console.log(`   Active servers daily revenue: $${(totalHourlyRevenue * 24).toFixed(2)}/day`);
    console.log(`   Active servers monthly revenue: $${totalMonthlyRevenue.toFixed(2)}/month`);
    
    console.log('\n✅ Verification complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error verifying hourly billing setup:', error);
    process.exit(1);
  }
}

// Run the verification
verifyHourlyBillingSetup();