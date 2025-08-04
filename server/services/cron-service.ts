import cron from 'node-cron';
import { serverUptimeService } from './infrastructure/server-uptime-service';
import { storage } from '../storage';
import { eq } from 'drizzle-orm';
import { serverHourlyBillingSettings } from '../../shared/schemas/server-uptime-schema';

export class CronService {
  private hourlyBillingJob: cron.ScheduledTask | null = null;

  constructor() {
    this.initializeCronJobs();
  }

  /**
   * Initialize all cron jobs
   */
  private async initializeCronJobs() {
    try {
      await this.initializeHourlyBillingJob();
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
  getCronStatus() {
    return {
      hourlyBilling: {
        isRunning: this.hourlyBillingJob?.running || false,
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
      }
    };
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
  }
}

export const cronService = new CronService();
