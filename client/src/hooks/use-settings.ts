/**
 * Custom hook to extract settings from the settings array
 */
export function useSettings(settings: { id: number; key: string; value: string }[] = []) {
  /**
   * Get the company name from settings
   * @returns The company name or a default value
   */
  const getCompanyName = (): string => {
    const companySetting = settings.find(setting => setting.key === 'company_name');
    return companySetting?.value || 'SkyVPS360';
  };

  /**
   * Get the support email from settings
   * @returns The support email or a default value
   */
  const getSupportEmail = (): string => {
    const emailSetting = settings.find(setting => setting.key === 'support_email');
    return emailSetting?.value || 'support@skyvps360.com';
  };

  /**
   * Get any setting by key
   * @param key The setting key to look for
   * @param defaultValue A default value to return if the setting is not found
   * @returns The setting value or the default value
   */
  const getSetting = (key: string, defaultValue: string = ''): string => {
    const setting = settings.find(setting => setting.key === key);
    return setting?.value || defaultValue;
  };

  /**
   * Check if a feature flag is enabled
   * @param flagName The name of the feature flag
   * @returns True if the feature is enabled
   */
  const isFeatureEnabled = (flagName: string): boolean => {
    const flagSetting = settings.find(setting => setting.key === `feature_${flagName}`);
    return flagSetting?.value === 'true';
  };

  return {
    getCompanyName,
    getSupportEmail,
    getSetting,
    isFeatureEnabled,
  };
}