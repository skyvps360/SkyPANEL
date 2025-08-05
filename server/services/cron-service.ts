import * as cron from 'node-cron';
import { serverUptimeService } from './infrastructure/server-uptime-service';
import { dnsBillingService } from './dns-billing-service';
import { storage } from '../storage';
import { eq, sql, and } from 'drizzle-orm';
import { serverHourlyBillingSettings } from '../../shared/schemas/server-uptime-schema';
import { dnsBillingSettings } from '../../shared/schemas/dns-billing-schema';
import { 
  virtfusionCronSettings,
  virtfusionHourlyBilling,
  virtfusionHourlyTransactions,
  type VirtfusionCronSettings
} from '../../shared/schemas/virtfusion-billing-schema';
import { users } from '../../shared/schemas/user-schema';
import { packagePricing } from '../../shared/schemas/package-schema';
import { transactions } from '../../shared/schemas/transaction-schema';
import { virtFusionApi } from '../virtfusion-api';

export class CronService {
  private hourlyBillingJob: cron.ScheduledTask | null = null;
  private dnsBillingJob: cron.ScheduledTask | null = null;
  private virtfusionHourlyJob: cron.ScheduledTask | null = null;
  private virtfusionMonthlyJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeCronJobs();
  }

  /**
   * Initialize all cron jobs
   */
  private async initializeCronJobs() {
    try {
      await this.initializeHourlyBillingJob();
      await this.initializeDnsBillingJob();
      await this.initializeVirtFusionCronJobs();
      console.log('✅ Cron jobs initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing cron jobs:', error);
    }
  }

  /**
   * Initialize hourly billing cron job
   */
  private async initializeHourlyBillingJob() {
    try {
      // Get billing settings
      const settings = await storage.db.select()
        .from(serverHourlyBillingSettings)
        .limit(1);

      if (settings.length === 0) {
        console.log('No hourly billing settings found, using defaults');
        return;
      }

      const setting = settings[0];
      
      if (!setting.cronEnabled) {
        console.log('Hourly billing cron is disabled');
        return;
      }

      // Create cron job
      this.hourlyBillingJob = cron.schedule(
        setting.cronSchedule, // Default: '0 * * * *' (every hour)
        async () => {
          await this.runHourlyBilling();
        },
        {
          timezone: 'UTC'
        }
      );

      // Start the job
      this.hourlyBillingJob.start();
      console.log(`✅ Hourly billing cron job started with schedule: ${setting.cronSchedule}`);

    } catch (error) {
      console.error('Error initializing hourly billing cron job:', error);
    }
  }

  /**
   * Run hourly billing process
   */
  private async runHourlyBilling() {
    console.log('🕐 Starting hourly billing process...');
    
    try {
      const startTime = Date.now();
      
      const result = await serverUptimeService.processHourlyBilling();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ Hourly billing completed in ${duration}ms`);
      console.log(`📊 Results: ${result.processedServers} servers processed, $${result.totalBilled.toFixed(4)} total billed`);
      
      if (result.errors.length > 0) {
        console.error(`❌ Errors encountered: ${result.errors.length}`);
        result.errors.forEach(error => console.error(`  - ${error}`));
      }

    } catch (error) {
      console.error('❌ Error in hourly billing process:', error);
    }
  }

  /**
   * Manually trigger hourly billing
   */
  async triggerHourlyBilling() {
    console.log('🔄 Manually triggering hourly billing...');
    await this.runHourlyBilling();
  }

  /**
   * Initialize DNS billing cron job
   */
  private async initializeDnsBillingJob() {
    try {
      // Get DNS billing settings
      const settings = await storage.db.select()
        .from(dnsBillingSettings)
        .limit(1);

      if (settings.length === 0) {
        console.log('No DNS billing settings found, creating default settings');
        // Create default settings
        await storage.db.insert(dnsBillingSettings).values({
          cronEnabled: false,
          cronSchedule: '0 2 1 * *'
        });
        return;
      }

      const setting = settings[0];
      
      if (!setting.cronEnabled) {
        console.log('DNS billing cron is disabled');
        return;
      }

      // Create cron job
      this.dnsBillingJob = cron.schedule(
        setting.cronSchedule,
        async () => {
          await this.runDnsBilling();
        },
        {
          timezone: 'UTC'
        }
      );

      // Start the job
      this.dnsBillingJob.start();
      console.log(`✅ DNS billing cron job started with schedule: ${setting.cronSchedule}`);

    } catch (error) {
      console.error('Error initializing DNS billing cron job:', error);
    }
  }

  /**
   * Update cron schedule
   */
  async updateCronSchedule(schedule: string, enabled: boolean) {
    try {
      // Stop existing job
      if (this.hourlyBillingJob) {
        this.hourlyBillingJob.stop();
        this.hourlyBillingJob.destroy();
        this.hourlyBillingJob = null;
      }

      // Update settings in database
      await storage.db.update(serverHourlyBillingSettings)
        .set({
          cronSchedule: schedule,
          cronEnabled: enabled,
          updatedAt: new Date()
        })
        .where(eq(serverHourlyBillingSettings.cronEnabled, true));

      // Restart job if enabled
      if (enabled) {
        this.hourlyBillingJob = cron.schedule(
          schedule,
          async () => {
            await this.runHourlyBilling();
          },
          {
            timezone: 'UTC'
          }
        );

        this.hourlyBillingJob.start();
        console.log(`✅ Cron schedule updated to: ${schedule}`);
      } else {
        console.log('✅ Cron job disabled');
      }

    } catch (error) {
      console.error('Error updating cron schedule:', error);
      throw error;
    }
  }

  /**
   * Get cron job status
   */
  async getCronStatus() {
    // Get DNS billing settings from database
    const dnsSettings = await storage.db.select()
      .from(dnsBillingSettings)
      .limit(1);
    
    const dnsBillingSetting = dnsSettings[0];
    
    // Get VirtFusion cron settings from database
    const virtfusionSettings = await storage.db.select()
      .from(virtfusionCronSettings)
      .orderBy(sql`${virtfusionCronSettings.id} DESC`)
      .limit(1);
    
    const virtfusionSetting = virtfusionSettings[0];
    
    return {
      hourlyBilling: {
        isRunning: this.hourlyBillingJob !== null,
        nextRun: null // node-cron doesn't provide nextDate method
      },
      dnsBilling: {
        isRunning: this.dnsBillingJob !== null,
        enabled: dnsBillingSetting?.cronEnabled || false,
        schedule: dnsBillingSetting?.cronSchedule || '0 2 1 * *',
        nextRun: null // node-cron doesn't provide nextDate method
      },
      virtfusionHourly: {
        isRunning: this.virtfusionHourlyJob !== null,
        enabled: virtfusionSetting?.enabled && virtfusionSetting?.hourlyBillingEnabled || false,
        schedule: '0 * * * *',
        nextRun: null // node-cron doesn't provide nextDate method
      },
      virtfusionMonthly: {
        isRunning: this.virtfusionMonthlyJob !== null,
        enabled: virtfusionSetting?.enabled && virtfusionSetting?.billingOnFirstEnabled || false,
        schedule: '0 3 1 * *',
        nextRun: null // node-cron doesn't provide nextDate method
      }
    };
  }

  /**
   * Get cron job logs
   */
  getCronLogs() {
    return {
      hourlyBilling: {
        lastRun: null, // We can add logging later if needed
        logs: []
      },
      dnsBilling: {
        lastRun: null, // We can add logging later if needed
        logs: []
      }
    };
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): boolean {
    try {
      return cron.validate(expression);
    } catch (error) {
      return false;
    }
  }

  /**
   * Update DNS billing cron schedule
   */
  async updateDnsBillingCron(enabled: boolean, schedule?: string): Promise<void> {
    try {
      // Get current settings or use defaults
      const currentSettings = await storage.db.select()
        .from(dnsBillingSettings)
        .limit(1);
      
      const currentSchedule = currentSettings[0]?.cronSchedule || '0 2 1 * *';
      const finalSchedule = schedule || currentSchedule;
      
      // Validate schedule if provided
      if (schedule && !this.validateCronExpression(schedule)) {
        throw new Error('Invalid cron expression');
      }

      // Stop existing DNS billing job
      if (this.dnsBillingJob) {
        this.dnsBillingJob.stop();
        this.dnsBillingJob.destroy();
        this.dnsBillingJob = null;
      }

      // Update settings in database
      if (currentSettings.length > 0) {
        await storage.db.update(dnsBillingSettings)
          .set({
            cronEnabled: enabled,
            cronSchedule: finalSchedule,
            updatedAt: new Date()
          })
          .where(eq(dnsBillingSettings.id, currentSettings[0].id));
      } else {
        // Create new settings if none exist
        await storage.db.insert(dnsBillingSettings).values({
          cronEnabled: enabled,
          cronSchedule: finalSchedule
        });
      }

      // Start new job if enabled
      if (enabled) {
        this.dnsBillingJob = cron.schedule(
          finalSchedule,
          async () => {
            await this.runDnsBilling();
          },
          {
            timezone: 'UTC'
          }
        );

        this.dnsBillingJob.start();
        console.log(`✅ DNS billing cron job started with schedule: ${finalSchedule}`);
      } else {
        console.log('✅ DNS billing cron job disabled');
      }

    } catch (error) {
      console.error('Error updating DNS billing cron:', error);
      throw error;
    }
  }

  /**
   * Run DNS billing process
   */
  private async runDnsBilling() {
    console.log('🕐 Starting DNS billing process...');
    
    try {
      const startTime = Date.now();
      
      const result = await dnsBillingService.processMonthlyRenewals();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ DNS billing completed in ${duration}ms`);
      console.log(`📊 Results: ${result.processed} subscriptions processed, ${result.successful} successful, ${result.failed} failed`);
      
      if (result.errors.length > 0) {
        console.error(`❌ Errors encountered: ${result.errors.length}`);
        result.errors.forEach(error => console.error(`  - User ${error.userId} (${error.planName}): ${error.error}`));
      }
      
    } catch (error) {
      console.error('❌ Error in DNS billing process:', error);
    }
  }

  /**
   * Manually trigger DNS billing
   */
  async triggerDnsBillingManually() {
    console.log('🔄 Manually triggering DNS billing...');
    const result = await dnsBillingService.processMonthlyRenewals();
    return result;
  }

  /**
   * Initialize VirtFusion cron jobs (hourly and monthly)
   */
  private async initializeVirtFusionCronJobs() {
    try {
      // Get VirtFusion cron settings
      const settings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);

      if (settings.length === 0) {
        console.log('No VirtFusion cron settings found, creating default settings');
        await storage.db.insert(virtfusionCronSettings).values({
          enabled: false,
          hoursPerMonth: 730,
          billingOnFirstEnabled: true,
          hourlyBillingEnabled: true
        });
        return;
      }

      const setting = settings[0];
      
      if (!setting.enabled) {
        console.log('VirtFusion cron is disabled');
        return;
      }

      // Initialize hourly billing job (runs every hour)
              if (setting.hourlyBillingEnabled) {
        this.virtfusionHourlyJob = cron.schedule(
          '0 * * * *', // Every hour at minute 0
          async () => {
            await this.runVirtFusionHourlyBilling();
          },
          {
            timezone: 'UTC'
          }
        );
        this.virtfusionHourlyJob.start();
        console.log('✅ VirtFusion hourly billing cron job started (every hour)');
      }

      // Initialize monthly billing job (runs on 1st of every month at 3 AM UTC)
              if (setting.billingOnFirstEnabled) {
        this.virtfusionMonthlyJob = cron.schedule(
          '0 3 1 * *', // 1st day of month at 3 AM UTC
          async () => {
            await this.runVirtFusionMonthlyBilling();
          },
          {
            timezone: 'UTC'
          }
        );
        this.virtfusionMonthlyJob.start();
        console.log('✅ VirtFusion monthly billing cron job started (1st of month at 3 AM UTC)');
      }

    } catch (error) {
      console.error('Error initializing VirtFusion cron jobs:', error);
    }
  }

  /**
   * Update VirtFusion cron settings
   */
  async updateVirtFusionCron(enabled: boolean, hourlyEnabled?: boolean, monthlyEnabled?: boolean, hoursPerMonth?: number): Promise<void> {
    try {
      // Stop existing jobs
      if (this.virtfusionHourlyJob) {
        this.virtfusionHourlyJob.stop();
        this.virtfusionHourlyJob.destroy();
        this.virtfusionHourlyJob = null;
      }
      
      if (this.virtfusionMonthlyJob) {
        this.virtfusionMonthlyJob.stop();
        this.virtfusionMonthlyJob.destroy();
        this.virtfusionMonthlyJob = null;
      }

      // Get current settings to update
      const currentSettings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);

      if (currentSettings.length > 0) {
        // Update existing settings
        await storage.db.update(virtfusionCronSettings)
          .set({
            enabled,
            ...(hourlyEnabled !== undefined && { hourlyBillingEnabled: hourlyEnabled }),
            ...(monthlyEnabled !== undefined && { billingOnFirstEnabled: monthlyEnabled }),
            ...(hoursPerMonth !== undefined && { hoursPerMonth }),
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(virtfusionCronSettings.id, currentSettings[0].id));
      } else {
        // Create new settings
        await storage.db.insert(virtfusionCronSettings).values({
          enabled,
          hourlyBillingEnabled: hourlyEnabled ?? true,
          billingOnFirstEnabled: monthlyEnabled ?? true,
          hoursPerMonth: hoursPerMonth ?? 730
        });
      }

      if (enabled) {
        // Reinitialize jobs with new settings
        await this.initializeVirtFusionCronJobs();
        console.log('✅ VirtFusion cron jobs reinitialized and started');
      } else {
        console.log('✅ VirtFusion cron jobs disabled');
      }

    } catch (error) {
      console.error('Error updating VirtFusion cron:', error);
      throw error;
    }
  }

  /**
   * Restart VirtFusion cron jobs
   */
  async restartVirtFusionCronJobs(): Promise<void> {
    try {
      // Stop existing jobs
      if (this.virtfusionHourlyJob) {
        this.virtfusionHourlyJob.stop();
        this.virtfusionHourlyJob.destroy();
        this.virtfusionHourlyJob = null;
      }
      
      if (this.virtfusionMonthlyJob) {
        this.virtfusionMonthlyJob.stop();
        this.virtfusionMonthlyJob.destroy();
        this.virtfusionMonthlyJob = null;
      }

      // Reinitialize jobs
      await this.initializeVirtFusionCronJobs();
      console.log('✅ VirtFusion cron jobs restarted');
    } catch (error) {
      console.error('Error restarting VirtFusion cron jobs:', error);
      throw error;
    }
  }

  /**
   * Run VirtFusion hourly billing process
   */
  private async runVirtFusionHourlyBilling() {
    console.log('🕐 Starting VirtFusion hourly billing process...');
    
    try {
      const startTime = Date.now();
      
      // Get all active billing records using proper Drizzle joins
      const billingRecords = await storage.db.select({
        id: virtfusionHourlyBilling.id,
        userId: virtfusionHourlyBilling.userId,
        serverId: virtfusionHourlyBilling.serverId,
        virtfusionServerId: virtfusionHourlyBilling.virtfusionServerId,
        packageId: virtfusionHourlyBilling.packageId,
        packageName: virtfusionHourlyBilling.packageName,
        monthlyPrice: virtfusionHourlyBilling.monthlyPrice,
        hourlyRate: virtfusionHourlyBilling.hourlyRate,
        hoursInMonth: virtfusionHourlyBilling.hoursInMonth,
        userActive: users.isActive,
        packagePrice: packagePricing.price
      })
      .from(virtfusionHourlyBilling)
      .innerJoin(users, eq(virtfusionHourlyBilling.userId, users.id))
      .innerJoin(packagePricing, eq(virtfusionHourlyBilling.packageId, packagePricing.virtFusionPackageId))
      .where(and(
        eq(virtfusionHourlyBilling.billingEnabled, true),
        eq(users.isActive, true),
        sql`${virtfusionHourlyBilling.monthlyPrice} IS NOT NULL`
      ));

      let processed = 0;
      let successful = 0;
      let failed = 0;
      const errors: any[] = [];

      for (const record of billingRecords) {
        try {
          processed++;
          
          // Validate required fields
          if (!record.monthlyPrice) {
            console.warn(`⚠️ Skipping record ${record.id} - missing monthly price`);
            continue;
          }
          
          // CRITICAL: Verify server still exists in VirtFusion before charging
          console.log(`🔍 Verifying server ${record.virtfusionServerId} exists for user ${record.userId}...`);
          
          const serverExists = await virtFusionApi.verifyServerOwnership(
            record.virtfusionServerId, 
            record.userId
          );
          
          if (!serverExists) {
            console.warn(`⚠️ Server ${record.virtfusionServerId} no longer exists or user ${record.userId} is not the owner. Disabling billing.`);
            
            // Disable billing for this server
            await storage.db.update(virtfusionHourlyBilling)
              .set({
                billingEnabled: false,
                updatedAt: sql`now()`
              })
              .where(eq(virtfusionHourlyBilling.id, record.id));
            
            console.log(`✅ Disabled billing for server ${record.virtfusionServerId}`);
            continue;
          }
          
          // Calculate hourly charge
          const monthlyPrice = parseFloat(record.monthlyPrice.toString());
          const hoursInMonth = record.hoursInMonth || 730;
          const hourlyRate = monthlyPrice / hoursInMonth;
          const hourlyTokens = Math.ceil(hourlyRate * 100); // Convert to tokens (cents), round up

          console.log(`💰 Charging user ${record.userId} ${hourlyTokens} tokens (${hourlyRate.toFixed(6)} dollars) for server ${record.virtfusionServerId}`);

          // Create transaction record first to get transaction ID
          const createdTransaction = await storage.createTransaction({
            userId: record.userId,
            amount: -Math.abs(hourlyRate), // Negative amount for debit
            description: `VirtFusion Server ${record.serverId} - Hourly Billing (1 hour)`,
            type: "debit",
            status: "pending",
            paymentMethod: "virtfusion_tokens"
          });

          // Prepare VirtFusion API token deduction data
          const tokenData = {
            tokens: hourlyTokens, // Use hourly tokens
            reference_1: createdTransaction.id, // Use transaction ID as reference
            reference_2: `Hourly billing for server ${record.serverId} - User ID: ${record.userId}`
          };

          console.log(`🌐 Sending to VirtFusion API with extRelationId=${record.userId}:`, tokenData);

          try {
            // ACTUALLY DEDUCT VirtFusion tokens (this was missing before!)
            const virtFusionResult = await virtFusionApi.removeCreditFromUserByExtRelationId(
              record.userId, // Use SkyPANEL user ID as extRelationId
              tokenData
            );

            console.log("✅ VirtFusion token deduction result:", virtFusionResult);

            // Update transaction status to completed
            await storage.updateTransaction(createdTransaction.id, { status: "completed" });

            // Create hourly billing transaction record
            await storage.db.insert(virtfusionHourlyTransactions).values({
              billingId: record.id,
              userId: record.userId,
              serverId: record.serverId,
              transactionId: createdTransaction.id,
              hoursBilled: '1.0',
              amountCharged: hourlyRate.toString(),
              billingPeriodStart: sql`now() - interval '1 hour'`,
              billingPeriodEnd: sql`now()`,
              status: 'completed'
            });

            // Update last billed timestamp
            await storage.db.update(virtfusionHourlyBilling)
              .set({
                lastBilledAt: sql`now()`
              })
              .where(eq(virtfusionHourlyBilling.id, record.id));

            console.log(`✅ Successfully charged user ${record.userId} ${hourlyTokens} tokens for server ${record.virtfusionServerId}`);
            successful++;

          } catch (virtFusionError: any) {
            console.error(`❌ VirtFusion token deduction failed for user ${record.userId}:`, virtFusionError);
            
            // Update transaction status to failed
            await storage.updateTransaction(createdTransaction.id, { status: "failed" });
            
            // Create failed hourly billing transaction record
            await storage.db.insert(virtfusionHourlyTransactions).values({
              billingId: record.id,
              userId: record.userId,
              serverId: record.serverId,
              transactionId: createdTransaction.id,
              hoursBilled: '1.0',  
              amountCharged: hourlyRate.toString(),
              billingPeriodStart: sql`now() - interval '1 hour'`,
              billingPeriodEnd: sql`now()`,
              status: 'failed'
            });
            
            errors.push({
              userId: record.userId,
              serverId: record.serverId,
              error: `VirtFusion API error: ${virtFusionError.message}`
            });
            failed++;
          }
          
        } catch (error: any) {
          console.error(`❌ Error processing hourly billing for user ${record.userId}:`, error);
          errors.push({
            userId: record.userId,
            serverId: record.serverId,
            error: error.message
          });
          failed++;
        }
      }
      
      // Update last hourly billing timestamp
      const currentSettings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);
      
      if (currentSettings.length > 0) {
        await storage.db.update(virtfusionCronSettings)
          .set({
            lastHourlyBilling: sql`now()`
          })
          .where(eq(virtfusionCronSettings.id, currentSettings[0].id));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`✅ VirtFusion hourly billing completed in ${duration}ms`);
      console.log(`📊 Results: ${processed} records processed, ${successful} successful, ${failed} failed`);
      
      if (errors.length > 0) {
        console.error(`❌ Errors encountered: ${errors.length}`);
        errors.forEach(error => console.error(`  - User ${error.userId} Server ${error.serverId}: ${error.error}`));
      }
      
    } catch (error) {
      console.error('❌ Error in VirtFusion hourly billing process:', error);
    }
  }

  /**
   * Run VirtFusion monthly billing process (1st of month)
   */
  private async runVirtFusionMonthlyBilling() {
    console.log('🗓️ Starting VirtFusion monthly billing process...');
    
    try {
      // Update last monthly billing timestamp
      const currentSettings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);
      
      if (currentSettings.length > 0) {
        await storage.db.update(virtfusionCronSettings)
          .set({
            lastMonthlyBilling: sql`now()`
          })
          .where(eq(virtfusionCronSettings.id, currentSettings[0].id));
      }
      
      // Here you could add any special monthly billing logic
      // For now, just log that monthly billing ran
      console.log('✅ VirtFusion monthly billing process completed');
      
    } catch (error) {
      console.error('❌ Error in VirtFusion monthly billing process:', error);
    }
  }

  /**
   * Manually trigger VirtFusion hourly billing
   */
  async triggerVirtFusionHourlyBilling() {
    console.log('🔄 Manually triggering VirtFusion hourly billing...');
    await this.runVirtFusionHourlyBilling();
  }

  /**
   * Manually trigger VirtFusion monthly billing
   */
  async triggerVirtFusionMonthlyBilling() {
    console.log('🔄 Manually triggering VirtFusion monthly billing...');
    await this.runVirtFusionMonthlyBilling();
  }

  /**
   * Stop all cron jobs
   */
  stopAllJobs() {
    if (this.hourlyBillingJob) {
      this.hourlyBillingJob.stop();
      this.hourlyBillingJob.destroy();
      console.log('✅ Hourly billing cron job stopped');
    }
    
    if (this.dnsBillingJob) {
      this.dnsBillingJob.stop();
      this.dnsBillingJob.destroy();
      console.log('✅ DNS billing cron job stopped');
    }
    
    if (this.virtfusionHourlyJob) {
      this.virtfusionHourlyJob.stop();
      this.virtfusionHourlyJob.destroy();
      console.log('✅ VirtFusion hourly billing cron job stopped');
    }
    
    if (this.virtfusionMonthlyJob) {
      this.virtfusionMonthlyJob.stop();
      this.virtfusionMonthlyJob.destroy();
      console.log('✅ VirtFusion monthly billing cron job stopped');
    }
  }
}

export const cronService = new CronService();
