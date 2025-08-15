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
    // Initialize VirtFusion billing mode on startup
    this.initializeVirtFusionBillingMode();
  }

  /**
   * Get the admin-configured hours per month setting
   * @returns Promise<number> Hours per month from admin settings, defaults to 730
   */
  private async getHoursPerMonthSetting(): Promise<number> {
    try {
      const setting = await storage.getSetting('server_hours_per_month');
      if (setting?.value) {
        const hours = parseInt(setting.value, 10);
        if (!isNaN(hours) && hours > 0) {
          return hours;
        }
      }
      // Default to 730 hours (30.4 days) if setting not found or invalid
      return 730;
    } catch (error) {
      console.error('Error getting server_hours_per_month setting:', error);
      return 730;
    }
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
   * Initialize VirtFusion billing mode on startup
   * This ensures the correct cron jobs are running based on the current billing mode setting
   */
  private initializeVirtFusionBillingMode(): void {
    // Wait a bit for the database connections to be ready
    setTimeout(() => {
      this.performVirtFusionBillingModeInitialization().catch((error) => {
        console.error('❌ Error initializing VirtFusion billing mode:', error);
      });
    }, 5000); // Wait 5 seconds for startup
  }

  /**
   * Perform the actual VirtFusion billing mode initialization
   */
  private async performVirtFusionBillingModeInitialization(): Promise<void> {
    try {
      console.log('🔧 Initializing VirtFusion billing mode on startup...');
      
      // First check if VirtFusion cron is enabled in database settings
      const virtfusionSettings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);

      const virtfusionSetting = virtfusionSettings[0];
      
      // If cron is disabled, don't start any jobs
      if (!virtfusionSetting || !virtfusionSetting.enabled) {
        console.log('🚫 VirtFusion cron is disabled in database settings. No cron jobs will be started.');
        return;
      }
      
      // Check current billing mode from the Self Service Hourly Credit setting
      const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
      const isHourlyBilling = selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true;
      
      console.log(`💰 Current billing mode: ${isHourlyBilling ? 'HOURLY' : 'MONTHLY'}`);
      
      // Update cron jobs to match current billing mode
      await this.updateVirtFusionCronJobsForBillingMode(isHourlyBilling);
      
      console.log('✅ VirtFusion billing mode initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing VirtFusion billing mode:', error);
      throw error;
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
        schedule: '* * * * *',
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
        console.log('No VirtFusion cron settings found, creating default settings based on current billing mode');
        
        // Check current billing mode from the Self Service Hourly Credit setting
        const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
        const isHourlyBilling = selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true;
        
        // Get admin-configured hours per month
        const adminHoursPerMonth = await this.getHoursPerMonthSetting();
        
        await storage.db.insert(virtfusionCronSettings).values({
          enabled: false, // Default to disabled - admin must explicitly enable
          hoursPerMonth: adminHoursPerMonth,
          billingOnFirstEnabled: !isHourlyBilling, // Enable monthly when hourly is disabled
          hourlyBillingEnabled: isHourlyBilling    // Enable hourly when hourly billing is enabled
        });
        
        console.log(`Created VirtFusion cron settings for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode (DISABLED by default) with ${adminHoursPerMonth} hours per month from admin settings`);
        return;
      }

      const setting = settings[0];
      
      if (!setting.enabled) {
        console.log('VirtFusion cron is disabled');
        return;
      }

      // Check current billing mode from the Self Service Hourly Credit setting
      const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
      const isHourlyBilling = selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true;
      
      // Only start the appropriate job based on billing mode
      if (isHourlyBilling && setting.hourlyBillingEnabled) {
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
      } else if (!isHourlyBilling && setting.billingOnFirstEnabled) {
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
      } else {
        console.log(`ℹ️ No VirtFusion cron job started - billing mode: ${isHourlyBilling ? 'hourly' : 'monthly'}`);
      }

    } catch (error) {
      console.error('Error initializing VirtFusion cron jobs:', error);
    }
  }

  /**
   * Update VirtFusion cron jobs based on billing mode
   * @param isHourlyBilling True for hourly billing, false for monthly billing
   */
  async updateVirtFusionCronJobsForBillingMode(isHourlyBilling: boolean): Promise<void> {
    try {
      console.log(`🔄 Updating VirtFusion cron jobs for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode...`);
      
      // Validate input parameter
      if (typeof isHourlyBilling !== 'boolean') {
        throw new Error('Invalid billing mode parameter: must be boolean');
      }
      
      // Stop existing VirtFusion jobs safely
      this.stopVirtFusionJobs();

      // Get current VirtFusion cron settings
      const settings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);

      let setting = settings[0];
      
      // Create default settings if none exist
      if (!setting) {
        // Get admin-configured hours per month
        const adminHoursPerMonth = await this.getHoursPerMonthSetting();
        
        await storage.db.insert(virtfusionCronSettings).values({
          enabled: false, // Default to disabled
          hourlyBillingEnabled: isHourlyBilling,
          billingOnFirstEnabled: !isHourlyBilling, // Enable monthly when hourly is disabled
          hoursPerMonth: adminHoursPerMonth // Use admin-configured hours per month
        });
        
        // Fetch the newly created settings
        const newSettings = await storage.db.select()
          .from(virtfusionCronSettings)
          .orderBy(sql`${virtfusionCronSettings.id} DESC`)
          .limit(1);
        setting = newSettings[0];
        
        if (!setting) {
          throw new Error('Failed to create VirtFusion cron settings');
        }
      } else {
        // Update existing settings based on billing mode
        await storage.db.update(virtfusionCronSettings)
          .set({
            hourlyBillingEnabled: isHourlyBilling,
            billingOnFirstEnabled: !isHourlyBilling,
            updatedAt: sql`CURRENT_TIMESTAMP`
          })
          .where(eq(virtfusionCronSettings.id, setting.id));
        
        // Update local setting object
        setting.hourlyBillingEnabled = isHourlyBilling;
        setting.billingOnFirstEnabled = !isHourlyBilling;
      }

      // Check if cron is globally enabled before starting any jobs
      if (!setting.enabled) {
        console.log('🚫 VirtFusion cron is disabled in database settings. No cron jobs will be started.');
        return;
      }

      // Start the appropriate cron job based on billing mode
      if (isHourlyBilling && setting.hourlyBillingEnabled) {
        this.startVirtFusionHourlyJob();
      } else if (!isHourlyBilling && setting.billingOnFirstEnabled) {
        this.startVirtFusionMonthlyJob();
      } else {
        console.log('ℹ️ No VirtFusion cron job started based on current configuration');
      }

      console.log(`✅ VirtFusion cron jobs updated for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode`);
    } catch (error) {
      console.error('Error updating VirtFusion cron jobs for billing mode:', error);
      throw error;
    }
  }

  /**
   * Safely stop VirtFusion jobs
   */
  private stopVirtFusionJobs(): void {
    try {
      if (this.virtfusionHourlyJob) {
        this.virtfusionHourlyJob.stop();
        this.virtfusionHourlyJob.destroy();
        this.virtfusionHourlyJob = null;
        console.log('🛑 Stopped VirtFusion hourly job');
      }
      
      if (this.virtfusionMonthlyJob) {
        this.virtfusionMonthlyJob.stop();
        this.virtfusionMonthlyJob.destroy();
        this.virtfusionMonthlyJob = null;
        console.log('🛑 Stopped VirtFusion monthly job');
      }
    } catch (error) {
      console.error('Error stopping VirtFusion jobs:', error);
      // Don't throw here as this is a cleanup operation
    }
  }

  /**
   * Start VirtFusion hourly job
   */
  private startVirtFusionHourlyJob(): void {
    try {
      this.virtfusionHourlyJob = cron.schedule(
        '* * * * *', // Every minute to detect exact aligned hours since creation
        async () => {
          try {
            await this.runVirtFusionHourlyBilling();
          } catch (error) {
            console.error('Error in VirtFusion hourly billing job:', error);
          }
        },
        {
          timezone: 'UTC'
        }
      );
      this.virtfusionHourlyJob.start();
      console.log('✅ VirtFusion hourly billing cron job started (every minute)');
    } catch (error) {
      console.error('Error starting VirtFusion hourly job:', error);
      throw error;
    }
  }

  /**
   * Start VirtFusion monthly job
   */
  private startVirtFusionMonthlyJob(): void {
    try {
      this.virtfusionMonthlyJob = cron.schedule(
        '0 3 1 * *', // 1st day of month at 3 AM UTC
        async () => {
          try {
            await this.runVirtFusionMonthlyBilling();
          } catch (error) {
            console.error('Error in VirtFusion monthly billing job:', error);
          }
        },
        {
          timezone: 'UTC'
        }
      );
      this.virtfusionMonthlyJob.start();
      console.log('✅ VirtFusion monthly billing cron job started (1st of month at 3 AM UTC)');
    } catch (error) {
      console.error('Error starting VirtFusion monthly job:', error);
      throw error;
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
        const defaultHoursPerMonth = hoursPerMonth ?? await this.getHoursPerMonthSetting();
        
        await storage.db.insert(virtfusionCronSettings).values({
          enabled,
          hourlyBillingEnabled: hourlyEnabled ?? true,
          billingOnFirstEnabled: monthlyEnabled ?? true,
          hoursPerMonth: defaultHoursPerMonth
        });
      }

      if (enabled) {
        // Check current billing mode from the Self Service Hourly Credit setting
        const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
        const isHourlyBilling = selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true;
        
        // Only start the appropriate job based on billing mode
        if (isHourlyBilling) {
          this.startVirtFusionHourlyJob();
        } else {
          this.startVirtFusionMonthlyJob();
        }
        
        console.log(`✅ VirtFusion cron jobs updated for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode`);
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

      // Check current billing mode from the Self Service Hourly Credit setting
      const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
      const isHourlyBilling = selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true;
      
      // Only start the appropriate job based on billing mode
      if (isHourlyBilling) {
        this.startVirtFusionHourlyJob();
      } else {
        this.startVirtFusionMonthlyJob();
      }
      
      console.log(`✅ VirtFusion cron jobs restarted for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode`);
    } catch (error) {
      console.error('Error restarting VirtFusion cron jobs:', error);
      throw error;
    }
  }

  /**
   * Run VirtFusion hourly billing process
   */
  private async runVirtFusionHourlyBilling() {
    const currentTime = new Date();
    console.log(`🕐 Starting VirtFusion hourly billing check at ${currentTime.toISOString()}`);
    
    try {
      // First, check if billing is actually enabled
      const settings = await storage.db.select()
        .from(virtfusionCronSettings)
        .orderBy(sql`${virtfusionCronSettings.id} DESC`)
        .limit(1);

      const setting = settings[0];

      if (!setting || !setting.enabled || !setting.hourlyBillingEnabled) {
        console.log('VirtFusion hourly billing is disabled in settings. Skipping.');
        return;
      }

      const startTime = Date.now();
      
      // Get all active billing records using proper Drizzle joins
      const billingRecords = await storage.db.select({
        id: virtfusionHourlyBilling.id,
        userId: virtfusionHourlyBilling.userId,
        serverId: virtfusionHourlyBilling.serverId,
        virtfusionServerId: virtfusionHourlyBilling.virtfusionServerId,
        serverUuid: virtfusionHourlyBilling.serverUuid,
        packageId: virtfusionHourlyBilling.packageId,
        packageName: virtfusionHourlyBilling.packageName,
        monthlyPrice: virtfusionHourlyBilling.monthlyPrice,
        hourlyRate: virtfusionHourlyBilling.hourlyRate,
        hoursInMonth: virtfusionHourlyBilling.hoursInMonth,
        accumulatedAmount: virtfusionHourlyBilling.accumulatedAmount,
        serverCreatedAt: virtfusionHourlyBilling.serverCreatedAt,
        lastBilledAt: virtfusionHourlyBilling.lastBilledAt,
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
          
          // CRITICAL: Verify server still exists in VirtFusion before charging using UUID cross-check
          let serverStillOwned = true;
          if (record.serverUuid) {
            console.log(`🔍 Cross-checking server ownership with VirtFusion API using UUID: ${record.serverUuid} for user ${record.userId}...`);
            serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
              record.serverUuid as string,
              record.userId
            );
          } else {
            console.warn(`⚠️ No server UUID available for server ${record.serverId}; skipping ownership cross-check`);
          }
          
          if (!serverStillOwned) {
            console.warn(`⚠️ Server with UUID ${record.serverUuid} is no longer owned by user ${record.userId}. Disabling billing.`);
            
            // Disable billing for this server
            await storage.db.update(virtfusionHourlyBilling)
              .set({
                billingEnabled: false,
                updatedAt: sql`now()`
              })
              .where(eq(virtfusionHourlyBilling.id, record.id));
            
            console.log(`✅ Disabled billing for server with UUID ${record.serverUuid} (VirtFusion Server ID: ${record.virtfusionServerId})`);
            continue;
          }

          // Determine if server is due for billing aligned to its creation time
          const now = new Date();
          const serverCreatedAt = record.serverCreatedAt ? new Date(record.serverCreatedAt) : null;
          if (!serverCreatedAt) {
            console.warn(`⚠️ Skipping server ${record.serverId} - missing server creation timestamp. Please run migration to populate serverCreatedAt field.`);
            continue;
          }

          // Determine next unbilled start boundary.
          // If we've never billed, the first hour was charged upfront at creation,
          // so the next unbilled start is creation + 1h. Otherwise it's lastBilledAt.
          const oneHourMs = 60 * 60 * 1000;
          
          // Calculate the next billing time
          const nextStart = record.lastBilledAt
            ? new Date(record.lastBilledAt)
            : new Date(serverCreatedAt.getTime() + oneHourMs);

          // Check if server is due for billing
          if (now.getTime() < nextStart.getTime()) {
            const minsLeft = Math.ceil((nextStart.getTime() - now.getTime()) / (60 * 1000));
            const secsLeft = Math.ceil((nextStart.getTime() - now.getTime()) / 1000);
            
            // Only log if server will be due within the next 5 minutes
            if (minsLeft <= 5) {
              console.log(`⏰ Server ${record.serverId} (User ${record.userId}) will be due in ${minsLeft}m ${secsLeft % 60}s at ${nextStart.toISOString()}`);
            }
            continue;
          }

          // Calculate how many hours to bill (catching up if we missed any)
          const hoursToBill = Math.floor((now.getTime() - nextStart.getTime()) / oneHourMs) + 1;
          console.log(`💵 Server ${record.serverId} (User ${record.userId}) is due for ${hoursToBill} hour(s) of billing`);
          console.log(`   Created: ${serverCreatedAt.toISOString()}`);
          console.log(`   Last billed: ${record.lastBilledAt ? new Date(record.lastBilledAt).toISOString() : 'Never (first recurring bill)'}`);
          console.log(`   Billing period starts: ${nextStart.toISOString()}`);
          
          // Calculate hourly rate precisely
          const monthlyPrice = parseFloat(record.monthlyPrice.toString());
          const hoursInMonth = record.hoursInMonth || await this.getHoursPerMonthSetting();
          const hourlyRate = monthlyPrice / hoursInMonth;
          
          // Get current accumulated amount
          let currentAccumulated = parseFloat(record.accumulatedAmount?.toString() || '0');

          for (let i = 0; i < hoursToBill; i++) {
            const periodStart = new Date(nextStart.getTime() + i * oneHourMs);
            const periodEnd = new Date(periodStart.getTime() + oneHourMs);

            // Add this hour's charge to accumulated amount
            currentAccumulated += hourlyRate;
            
            console.log(`💰 Billing hour ${i + 1}/${hoursToBill}:`);
            console.log(`   User: ${record.userId}, Server: ${record.serverId} (VirtFusion ID: ${record.virtfusionServerId})`);
            console.log(`   Period: ${periodStart.toISOString()} → ${periodEnd.toISOString()}`);
            console.log(`   Hourly Rate: $${hourlyRate.toFixed(6)}`);
            console.log(`   Accumulated: $${currentAccumulated.toFixed(6)}`);
            console.log(`   Package: ${record.packageName} (Monthly: $${monthlyPrice.toFixed(2)})`);

            // Check if accumulated amount is enough to bill (>= 1 cent)
            const tokensToCharge = Math.floor(currentAccumulated * 100);
            const shouldBill = tokensToCharge >= 1;
            
            console.log(`   Tokens to charge: ${tokensToCharge} (should bill: ${shouldBill})`);

            let createdTransaction = null;
            let chargedAmount = 0;

            if (shouldBill) {
              // Calculate how much we're actually charging vs accumulated
              chargedAmount = tokensToCharge / 100; // Convert tokens back to dollars
              currentAccumulated -= chargedAmount; // Subtract charged amount from accumulated
              
              console.log(`   💳 Charging ${tokensToCharge} tokens ($${chargedAmount.toFixed(4)})`);
              console.log(`   💰 Remaining accumulated: $${currentAccumulated.toFixed(6)}`);

              // Create transaction record
              createdTransaction = await storage.createTransaction({
                userId: record.userId,
                amount: -Math.abs(chargedAmount), // Negative amount for debit (actual charged amount)
                description: `VirtFusion Server ${record.serverId} - Accumulated Hourly Billing (${tokensToCharge} tokens)`,
                type: "debit",
                status: "pending",
                paymentMethod: "virtfusion_tokens"
              });

              // Prepare VirtFusion API token deduction data
              const tokenData = {
                tokens: tokensToCharge, // Use accumulated tokens
                reference_1: createdTransaction.id, // Use transaction ID as reference
                reference_2: `Accumulated billing for server ${record.serverId} - User ID: ${record.userId}`
              };

              console.log(`🌐 Sending to VirtFusion API with extRelationId=${record.userId}:`, tokenData);

              try {
                const virtFusionResult = await virtFusionApi.removeCreditFromUserByExtRelationId(
                  record.userId,
                  tokenData
                );

                console.log("✅ VirtFusion token deduction result:", virtFusionResult);
                await storage.updateTransaction(createdTransaction.id, { status: "completed" });

              } catch (virtFusionError: any) {
                console.error(`❌ VirtFusion token deduction failed for user ${record.userId}:`, virtFusionError);
                await storage.updateTransaction(createdTransaction.id, { status: "failed" });
                
                // Add the charged amount back to accumulated since the charge failed
                currentAccumulated += chargedAmount;
                chargedAmount = 0; // Reset charged amount since it failed
              }
            } else {
              console.log(`   ⏳ Not billing yet (accumulated < $0.01)`);
            }

            // Always record the transaction entry for audit purposes
            await storage.db.insert(virtfusionHourlyTransactions).values({
              billingId: record.id,
              userId: record.userId,
              serverId: record.serverId,
              transactionId: createdTransaction?.id || null,
              hoursBilled: '1.0',
              amountCharged: chargedAmount.toString(), // Record actual charged amount (0 if not billed)
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              status: shouldBill ? (chargedAmount > 0 ? 'completed' : 'failed') : 'accumulated'
            });

            console.log(`✅ Processed hour ${i + 1}/${hoursToBill} for server ${record.serverId}`);
            successful++;
          }

          // Update the billing record with new accumulated amount and last billed timestamp
          await storage.db.update(virtfusionHourlyBilling)
            .set({ 
              lastBilledAt: new Date(nextStart.getTime() + (hoursToBill - 1) * oneHourMs + oneHourMs),
              accumulatedAmount: currentAccumulated.toFixed(6),
              updatedAt: sql`CURRENT_TIMESTAMP`
            })
            .where(eq(virtfusionHourlyBilling.id, record.id));
            
          console.log(`🔄 Updated accumulated amount for server ${record.serverId}: $${currentAccumulated.toFixed(6)}`);
          
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
      
      console.log(`\n📊 VirtFusion Hourly Billing Summary:`);
      console.log(`   Completed at: ${new Date().toISOString()}`);
      console.log(`   Duration: ${duration}ms`);
      console.log(`   Servers checked: ${billingRecords.length}`);
      console.log(`   Servers billed: ${processed}`);
      console.log(`   Successful charges: ${successful}`);
      console.log(`   Failed charges: ${failed}`);
      
      if (errors.length > 0) {
        console.error(`\n❌ Billing Errors (${errors.length}):`);
        errors.forEach(error => console.error(`   - User ${error.userId}, Server ${error.serverId}: ${error.error}`));
      }
      
      console.log(`✅ Hourly billing check complete\n`);
      
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
      const startTime = Date.now();
      
      // Get all active billing records for monthly billing
      const billingRecords = await storage.db.select({
        id: virtfusionHourlyBilling.id,
        userId: virtfusionHourlyBilling.userId,
        serverId: virtfusionHourlyBilling.serverId,
        virtfusionServerId: virtfusionHourlyBilling.virtfusionServerId,
        serverUuid: virtfusionHourlyBilling.serverUuid,
        packageId: virtfusionHourlyBilling.packageId,
        packageName: virtfusionHourlyBilling.packageName,
        monthlyPrice: virtfusionHourlyBilling.monthlyPrice,
        accumulatedAmount: virtfusionHourlyBilling.accumulatedAmount,
        serverCreatedAt: virtfusionHourlyBilling.serverCreatedAt,
        lastBilledAt: virtfusionHourlyBilling.lastBilledAt,
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
          
          // Verify server still exists in VirtFusion when UUID available
          let serverStillOwned = true;
          if (record.serverUuid) {
            console.log(`🔍 Cross-checking server ownership with VirtFusion API using UUID: ${record.serverUuid} for user ${record.userId}...`);
            serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
              record.serverUuid,
              record.userId
            );
          } else {
            console.warn(`⚠️ No server UUID available for server ${record.serverId}; skipping ownership cross-check`);
          }
          
          if (!serverStillOwned) {
            console.warn(`⚠️ Server with UUID ${record.serverUuid} is no longer owned by user ${record.userId}. Disabling billing.`);
            
            // Disable billing for this server
            await storage.db.update(virtfusionHourlyBilling)
              .set({
                billingEnabled: false,
                updatedAt: sql`now()`
              })
              .where(eq(virtfusionHourlyBilling.id, record.id));
            
            console.log(`✅ Disabled billing for server with UUID ${record.serverUuid}`);
            continue;
          }

          // Check if server is due for monthly billing with catch-up
          const now = new Date();
          const serverCreatedAt = record.serverCreatedAt ? new Date(record.serverCreatedAt) : null;
          if (!serverCreatedAt) {
            console.warn(`⚠️ Skipping server ${record.serverId} - missing server creation timestamp.`);
            continue;
          }

          // Monthly period = 30 days for billing purposes
          const monthMs = 30 * 24 * 60 * 60 * 1000;
          // If we've never billed via cron, the first month after the upfront creation charge
          // becomes due at creation + 30 days. Otherwise due from lastBilledAt.
          const nextStart = record.lastBilledAt
            ? new Date(record.lastBilledAt)
            : new Date(serverCreatedAt.getTime() + monthMs);

          if (now.getTime() < nextStart.getTime()) {
            const daysLeft = ((nextStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)).toFixed(2);
            console.log(`⏰ Server ${record.serverId} not due for monthly billing yet. Next due at ${nextStart.toISOString()} (~${daysLeft} days)`);
            continue;
          }

          // Number of full 30-day periods to bill since nextStart
          const monthsToBill = Math.floor((now.getTime() - nextStart.getTime()) / monthMs) + 1;
          const monthlyPrice = parseFloat(record.monthlyPrice.toString());
          const monthlyTokens = Math.ceil(monthlyPrice * 100); // cents

          console.log(`⏰ Server ${record.serverId} monthly catch-up: billing ${monthsToBill} month(s) starting ${nextStart.toISOString()}`);

          for (let m = 0; m < monthsToBill; m++) {
            const periodStart = new Date(nextStart.getTime() + m * monthMs);
            const periodEnd = new Date(periodStart.getTime() + monthMs);

            console.log(`💰 Charging user ${record.userId} ${monthlyTokens} tokens (${monthlyPrice.toFixed(2)} dollars) for server ${record.virtfusionServerId} [${periodStart.toISOString()} → ${periodEnd.toISOString()}] - MONTHLY`);

            // Create transaction record
            const createdTransaction = await storage.createTransaction({
              userId: record.userId,
              amount: -Math.abs(monthlyPrice),
              description: `VirtFusion Server ${record.serverId} - Monthly Billing (1 month)`,
              type: "debit",
              status: "pending",
              paymentMethod: "virtfusion_tokens"
            });

            const tokenData = {
              tokens: monthlyTokens,
              reference_1: createdTransaction.id,
              reference_2: `Monthly billing for server ${record.serverId} - User ID: ${record.userId}`
            };

            try {
              const virtFusionResult = await virtFusionApi.removeCreditFromUserByExtRelationId(
                record.userId,
                tokenData
              );

              console.log("✅ VirtFusion token deduction result:", virtFusionResult);

              await storage.updateTransaction(createdTransaction.id, { status: "completed" });

              await storage.db.update(virtfusionHourlyBilling)
                .set({ lastBilledAt: periodEnd })
                .where(eq(virtfusionHourlyBilling.id, record.id));

              successful++;
            } catch (virtFusionError: any) {
              console.error(`❌ VirtFusion API error for user ${record.userId}:`, virtFusionError);
              await storage.updateTransaction(createdTransaction.id, { status: "failed" });
              failed++;
              errors.push({
                userId: record.userId,
                serverId: record.serverId,
                error: virtFusionError.message || 'VirtFusion API error'
              });
              // Stop further catch-up for this server on API failure to avoid compounding errors
              break;
            }
          }

        } catch (recordError: any) {
          console.error(`❌ Error processing billing record ${record.id}:`, recordError);
          failed++;
          errors.push({
            recordId: record.id,
            error: recordError.message
          });
        }
      }

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

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
      
      console.log(`✅ VirtFusion monthly billing completed in ${duration}s - Processed: ${processed}, Successful: ${successful}, Failed: ${failed}`);
      
      if (errors.length > 0) {
        console.error('❌ Monthly billing errors:', errors);
      }
      
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
