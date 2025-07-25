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
      const existingSetting = await db.query.settings.findFirst({
        where: eq(settings.key, key)
      });
      
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
      
      return true;
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
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