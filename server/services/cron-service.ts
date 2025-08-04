import cron from 'node-cron';
import { serverUptimeService } from './infrastructure/server-uptime-service';
import { dnsBillingService } from './dns-billing-service';
import { storage } from '../storage';
import { eq } from 'drizzle-orm';
import { serverHourlyBillingSettings } from '../../shared/schemas/server-uptime-schema';
import { dnsBillingSettings } from '../../shared/schemas/dns-billing-schema';

export class CronService {
  private hourlyBillingJob: cron.ScheduledTask | null = null;
  private dnsBillingJob: cron.ScheduledTask | null = null;

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
    
    return {
      hourlyBilling: {
        isRunning: this.hourlyBillingJob?.running || false,
        nextRun: null // node-cron doesn't provide nextDate method
      },
      dnsBilling: {
        isRunning: this.dnsBillingJob?.running || false,
        enabled: dnsBillingSetting?.cronEnabled || false,
        schedule: dnsBillingSetting?.cronSchedule || '0 2 1 * *',
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
  }
}

export const cronService = new CronService();
