import cron from 'node-cron';
import { storage } from '../storage';
import { dnsBillingService } from './dns-billing-service';

export class CronService {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private isInitialized = false;

  /**
   * Initialize cron service with settings from database
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("Cron service already initialized");
      return;
    }

    console.log("Initializing cron service...");

    try {
      // Load cron settings from database
      await this.loadCronSettings();
      this.isInitialized = true;
      console.log("✅ Cron service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize cron service:", error);
      throw error;
    }
  }

  /**
   * Load cron job settings from database and start jobs
   */
  async loadCronSettings(): Promise<void> {
    try {
      // Get DNS billing cron settings
      const dnsBillingEnabled = await storage.getSetting('dns_billing_cron_enabled');
      const dnsBillingSchedule = await storage.getSetting('dns_billing_cron_schedule');

      // Default schedule: Run at 2 AM on the 1st of every month
      const defaultSchedule = '0 2 1 * *';
      const schedule = dnsBillingSchedule?.value || defaultSchedule;
      const enabled = dnsBillingEnabled?.value === 'true';

      console.log(`DNS billing cron: enabled=${enabled}, schedule="${schedule}"`);

      if (enabled) {
        this.startDnsBillingCron(schedule);
      } else {
        this.stopDnsBillingCron();
      }

    } catch (error) {
      console.error("Error loading cron settings:", error);
      // Start with default settings if database fails
      this.startDnsBillingCron('0 2 1 * *');
    }
  }

  /**
   * Start DNS billing cron job
   */
  startDnsBillingCron(schedule: string): void {
    // Stop existing job if running
    this.stopDnsBillingCron();

    try {
      // Validate cron expression
      if (!cron.validate(schedule)) {
        throw new Error(`Invalid cron schedule: ${schedule}`);
      }

      const task = cron.schedule(schedule, async () => {
        console.log("🔄 Starting scheduled DNS billing renewal process...");
        try {
          const results = await dnsBillingService.processMonthlyRenewals();
          console.log("✅ DNS billing renewal process completed:", results);

          // Log results to database for admin monitoring
          await this.logCronJobResult('dns_billing', 'success', results);
        } catch (error: any) {
          console.error("❌ DNS billing renewal process failed:", error);
          await this.logCronJobResult('dns_billing', 'failed', { error: error.message });
        }
      }, {
        scheduled: false, // Don't start immediately
        timezone: 'UTC' // Use UTC timezone for consistency
      });

      task.start();
      this.jobs.set('dns_billing', task);
      console.log(`✅ DNS billing cron job started with schedule: ${schedule}`);
    } catch (error) {
      console.error("❌ Failed to start DNS billing cron job:", error);
      throw error;
    }
  }

  /**
   * Stop DNS billing cron job
   */
  stopDnsBillingCron(): void {
    const job = this.jobs.get('dns_billing');
    if (job) {
      job.stop();
      job.destroy();
      this.jobs.delete('dns_billing');
      console.log("🛑 DNS billing cron job stopped");
    }
  }

  /**
   * Update DNS billing cron settings
   */
  async updateDnsBillingCron(enabled: boolean, schedule?: string): Promise<void> {
    try {
      // Save settings to database
      await storage.upsertSetting('dns_billing_cron_enabled', enabled.toString());
      if (schedule) {
        // Validate schedule before saving
        if (!cron.validate(schedule)) {
          throw new Error(`Invalid cron schedule: ${schedule}`);
        }
        await storage.upsertSetting('dns_billing_cron_schedule', schedule);
      }

      // Restart cron job with new settings
      if (enabled) {
        const finalSchedule = schedule || (await storage.getSetting('dns_billing_cron_schedule'))?.value || '0 2 1 * *';
        this.startDnsBillingCron(finalSchedule);
      } else {
        this.stopDnsBillingCron();
      }

      console.log(`DNS billing cron updated: enabled=${enabled}, schedule=${schedule || 'unchanged'}`);
    } catch (error) {
      console.error("Error updating DNS billing cron:", error);
      throw error;
    }
  }

  /**
   * Get current cron job status
   */
  async getCronStatus(): Promise<{
    dnsBilling: {
      enabled: boolean;
      schedule: string;
      isRunning: boolean;
      lastRun?: Date;
      nextRun?: Date;
    };
  }> {
    const dnsBillingEnabled = await storage.getSetting('dns_billing_cron_enabled');
    const dnsBillingSchedule = await storage.getSetting('dns_billing_cron_schedule');
    const dnsBillingLastRun = await storage.getSetting('dns_billing_cron_last_run');

    const job = this.jobs.get('dns_billing');
    const schedule = dnsBillingSchedule?.value || '0 2 1 * *';

    // Calculate next run time
    let nextRun: Date | undefined;
    if (job && cron.validate(schedule)) {
      try {
        // This is a simplified calculation - in production you might want to use a more robust library
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 2, 0, 0, 0);
        nextRun = nextMonth;
      } catch (error) {
        console.error("Error calculating next run time:", error);
      }
    }

    return {
      dnsBilling: {
        enabled: dnsBillingEnabled?.value === 'true',
        schedule: schedule,
        isRunning: !!job,
        lastRun: dnsBillingLastRun?.value ? new Date(dnsBillingLastRun.value) : undefined,
        nextRun: nextRun
      }
    };
  }

  /**
   * Manually trigger DNS billing renewal (for testing/admin use)
   */
  async triggerDnsBillingManually(): Promise<any> {
    console.log("🔄 Manually triggering DNS billing renewal process...");
    try {
      const results = await dnsBillingService.processMonthlyRenewals();
      console.log("✅ Manual DNS billing renewal completed:", results);
      
      await this.logCronJobResult('dns_billing_manual', 'success', results);
      return results;
    } catch (error: any) {
      console.error("❌ Manual DNS billing renewal failed:", error);
      await this.logCronJobResult('dns_billing_manual', 'failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Log cron job results for monitoring
   */
  private async logCronJobResult(jobName: string, status: 'success' | 'failed', data: any): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      await storage.upsertSetting(`${jobName}_cron_last_run`, timestamp);
      await storage.upsertSetting(`${jobName}_cron_last_status`, status);
      await storage.upsertSetting(`${jobName}_cron_last_result`, JSON.stringify(data));
    } catch (error) {
      console.error("Error logging cron job result:", error);
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    console.log("🛑 Stopping all cron jobs...");
    for (const [name, job] of this.jobs) {
      job.stop();
      job.destroy();
      console.log(`Stopped cron job: ${name}`);
    }
    this.jobs.clear();
    this.isInitialized = false;
  }

  /**
   * Restart cron service
   */
  async restart(): Promise<void> {
    console.log("🔄 Restarting cron service...");
    this.stopAll();
    await this.initialize();
  }

  /**
   * Validate cron expression
   */
  validateCronExpression(expression: string): boolean {
    return cron.validate(expression);
  }

  /**
   * Get cron job logs for admin dashboard
   */
  async getCronLogs(): Promise<{
    dnsBilling: {
      lastRun?: string;
      lastStatus?: string;
      lastResult?: any;
    };
  }> {
    const dnsBillingLastRun = await storage.getSetting('dns_billing_cron_last_run');
    const dnsBillingLastStatus = await storage.getSetting('dns_billing_cron_last_status');
    const dnsBillingLastResult = await storage.getSetting('dns_billing_cron_last_result');

    let parsedResult;
    try {
      parsedResult = dnsBillingLastResult?.value ? JSON.parse(dnsBillingLastResult.value) : undefined;
    } catch (error) {
      parsedResult = dnsBillingLastResult?.value;
    }

    return {
      dnsBilling: {
        lastRun: dnsBillingLastRun?.value,
        lastStatus: dnsBillingLastStatus?.value,
        lastResult: parsedResult
      }
    };
  }
}

export const cronService = new CronService();
