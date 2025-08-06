import { db } from './db';
import { settings } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Service for managing application settings
 */
export class SettingsService {
  /**
   * Get all settings
   * @returns Array of all settings
   */
  static async getAllSettings() {
    try {
      return await db.query.settings.findMany();
    } catch (error) {
      console.error('Error fetching settings:', error);
      return [];
    }
  }
  
  /**
   * Get a specific setting by key
   * @param key The setting key
   * @returns The setting value or null if not found
   */
  static async getSetting(key: string): Promise<string | null> {
    try {
      const setting = await db.query.settings.findFirst({
        where: eq(settings.key, key)
      });
      
      return setting?.value || null;
    } catch (error) {
      console.error(`Error fetching setting ${key}:`, error);
      return null;
    }
  }
  
  /**
   * Update or create a setting
   * @param key The setting key
   * @param value The setting value
   * @returns Success status
   */
  static async updateSetting(key: string, value: string): Promise<boolean> {
    try {
      // Get the old value for comparison (for VirtFusion billing mode detection)
      const existingSetting = await db.query.settings.findFirst({
        where: eq(settings.key, key)
      });
      
      const oldValue = existingSetting?.value;
      
      if (existingSetting) {
        await db.update(settings)
          .set({ value })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value
        });
      }
      
      // Check if this is the VirtFusion billing mode setting and handle cron job switching
      if (key === 'virtfusion_self_service_hourly_credit' && oldValue !== value) {
        await this.handleVirtFusionBillingModeChange(value === 'true');
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }
  }

  /**
   * Handle VirtFusion billing mode changes
   * @param isHourlyBilling True for hourly billing, false for monthly billing
   */
  private static async handleVirtFusionBillingModeChange(isHourlyBilling: boolean): Promise<void> {
    try {
      console.log(`🔄 VirtFusion billing mode changed to: ${isHourlyBilling ? 'HOURLY' : 'MONTHLY'}`);
      
      // Import cronService here to avoid circular dependencies
      // Using dynamic import in a try-catch to handle potential module loading issues
      const cronServiceModule = await import('./services/cron-service').catch((error) => {
        console.error('Failed to import cron service:', error);
        throw new Error('Cron service unavailable');
      });
      
      if (!cronServiceModule.cronService) {
        throw new Error('Cron service not initialized');
      }
      
      // Update VirtFusion cron jobs based on billing mode
      // When hourly billing is enabled: enable hourly job, disable monthly job
      // When hourly billing is disabled: disable hourly job, enable monthly job
      await cronServiceModule.cronService.updateVirtFusionCronJobsForBillingMode(isHourlyBilling);
      
      console.log(`✅ VirtFusion cron jobs updated for ${isHourlyBilling ? 'hourly' : 'monthly'} billing mode`);
    } catch (error) {
      console.error('Error handling VirtFusion billing mode change:', error);
      // Don't throw the error to prevent settings update from failing
      // Log the issue but allow the settings change to complete
    }
  }
  
  /**
   * Get a boolean setting
   * @param key The setting key
   * @param defaultValue Default value if setting not found
   * @returns The boolean value of the setting
   */
  static async getBooleanSetting(key: string, defaultValue: boolean = false): Promise<boolean> {
    const value = await this.getSetting(key);
    if (value === null) return defaultValue;
    return value.toLowerCase() === 'true';
  }
  
  /**
   * Get a numeric setting
   * @param key The setting key
   * @param defaultValue Default value if setting not found
   * @returns The numeric value of the setting
   */
  static async getNumericSetting(key: string, defaultValue: number = 0): Promise<number> {
    const value = await this.getSetting(key);
    if (value === null) return defaultValue;
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Set a setting value
   * @param key Setting key
   * @param value Setting value
   * @returns Promise<void>
   */
  static async setSetting(key: string, value: string): Promise<void> {
    try {
      await db.insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value, updatedAt: new Date() }
        });
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      throw error;
    }
  }

  /**
   * Check if award system is enabled
   * @returns Promise<boolean>
   */
  static async isAwardSystemEnabled(): Promise<boolean> {
    try {
      const setting = await this.getSetting('award_system_enabled');
      // If no setting exists, default to enabled (true)
      // If setting exists, return the actual value
      return setting === null ? true : setting === 'true';
    } catch (error) {
      console.error('Error checking award system status:', error);
      return true; // Default to enabled on error
    }
  }

  /**
   * Enable or disable the award system
   * @param enabled Whether to enable the award system
   * @returns Promise<void>
   */
  static async setAwardSystemEnabled(enabled: boolean): Promise<void> {
    try {
      await this.setSetting('award_system_enabled', enabled.toString());
    } catch (error) {
      console.error('Error setting award system status:', error);
      throw error;
    }
  }
}