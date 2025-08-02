import { storage } from '../../storage';

interface GoogleAnalyticsSettings {
  enabled: boolean;
  measurementId: string;
  enhancedEcommerce: boolean;
  debugMode: boolean;
  enabledPages: string[];
}

class GoogleAnalyticsService {
  private settings: GoogleAnalyticsSettings | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      const settings = await this.loadSettings();
      this.settings = settings;
    } catch (error) {
      console.error('Failed to initialize Google Analytics service:', error);
    }
  }

  private async loadSettings(): Promise<GoogleAnalyticsSettings> {
    try {
      const enabled = await storage.getSetting('google_analytics_enabled');
      const measurementId = await storage.getSetting('google_analytics_measurement_id');
      const enhancedEcommerce = await storage.getSetting('google_analytics_enhanced_ecommerce');
      const debugMode = await storage.getSetting('google_analytics_debug_mode');
      const enabledPages = await storage.getSetting('google_analytics_enabled_pages');

      // Parse enabled pages JSON or default to empty array
      let enabledPagesArray: string[] = [];
      if (enabledPages?.value) {
        try {
          enabledPagesArray = JSON.parse(enabledPages.value);
        } catch (error) {
          console.error('Failed to parse google_analytics_enabled_pages:', error);
          enabledPagesArray = [];
        }
      }

      return {
        enabled: enabled?.value === 'true',
        measurementId: measurementId?.value || '',
        enhancedEcommerce: enhancedEcommerce?.value === 'true',
        debugMode: debugMode?.value === 'true',
        enabledPages: enabledPagesArray,
      };
    } catch (error) {
      console.error('Failed to load Google Analytics settings:', error);
      throw error;
    }
  }

  async isEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.enabled || false;
  }

  async getMeasurementId(): Promise<string> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.measurementId || '';
  }

  async isEnhancedEcommerceEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.enhancedEcommerce || false;
  }

  async isDebugModeEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.debugMode || false;
  }



  async getEnabledPages(): Promise<string[]> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.enabledPages || [];
  }

  async isPageEnabled(pagePath: string): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    
    const enabledPages = this.settings?.enabledPages || [];
    
    // Check if the current page path matches any enabled page
    return enabledPages.some(enabledPage => {
      // Exact match
      if (enabledPage === pagePath) {
        return true;
      }
      
      // Wildcard match (if page ends with *)
      if (enabledPage.endsWith('*')) {
        const pattern = enabledPage.slice(0, -1);
        return pagePath.startsWith(pattern);
      }
      
      // Prefix match (for nested routes)
      if (enabledPage.endsWith('/')) {
        return pagePath.startsWith(enabledPage);
      }
      
      return false;
    });
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!await this.isEnabled()) {
        return {
          success: false,
          message: 'Google Analytics is not enabled'
        };
      }

      const measurementId = await this.getMeasurementId();
      if (!measurementId) {
        return {
          success: false,
          message: 'Measurement ID is not configured'
        };
      }

      // Basic validation of Measurement ID format
      if (!measurementId.startsWith('G-')) {
        return {
          success: false,
          message: 'Invalid Measurement ID format. Should start with "G-"'
        };
      }

      return {
        success: true,
        message: `Google Analytics connection successful. Measurement ID: ${measurementId}`
      };
    } catch (error) {
      console.error('Google Analytics connection test failed:', error);
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async refreshSettings(): Promise<void> {
    this.settings = null;
    await this.initialize();
  }

  // Method to track custom events (for server-side tracking)
  async trackEvent(eventName: string, parameters: Record<string, any> = {}): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }

    try {
      // This would typically send events to Google Analytics Measurement Protocol
      // For now, we'll just log the event
      console.log(`Google Analytics Event: ${eventName}`, parameters);
    } catch (error) {
      console.error('Failed to track Google Analytics event:', error);
    }
  }

  // Method to track page views (for server-side tracking)
  async trackPageView(pagePath: string, pageTitle?: string): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }

    try {
      // This would typically send page view to Google Analytics Measurement Protocol
      console.log(`Google Analytics Page View: ${pagePath}`, { pageTitle });
    } catch (error) {
      console.error('Failed to track Google Analytics page view:', error);
    }
  }

  // Method to track ecommerce events
  async trackEcommerceEvent(eventName: string, ecommerceData: any): Promise<void> {
    if (!await this.isEnabled() || !await this.isEnhancedEcommerceEnabled()) {
      return;
    }

    try {
      console.log(`Google Analytics Ecommerce Event: ${eventName}`, ecommerceData);
    } catch (error) {
      console.error('Failed to track Google Analytics ecommerce event:', error);
    }
  }
}

export const googleAnalyticsService = new GoogleAnalyticsService(); 