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
}