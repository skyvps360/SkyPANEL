import axios from 'axios';
import { storage } from './storage';
import { virtFusionApi } from './virtfusion-api';

/**
 * Service for interacting with the VirtFusion API
 */
export class VirtFusionService {
  private static instance: VirtFusionService;
  private baseUrl: string = '';
  private apiKey: string = '';
  private initialized: boolean = false;

  private constructor() {}

  /**
   * Get the singleton instance of VirtFusionService
   * @returns The VirtFusionService instance
   */
  public static getInstance(): VirtFusionService {
    if (!VirtFusionService.instance) {
      VirtFusionService.instance = new VirtFusionService();
    }
    return VirtFusionService.instance;
  }

  /**
   * Initialize the VirtFusion service with settings from env or database
   */
  public async initialize(): Promise<boolean> {
    try {
      // First check if we have environment variables
      const envApiUrl = process.env.VIRTFUSION_API_URL;
      const envApiKey = process.env.VIRTFUSION_API_KEY;

      if (envApiUrl && envApiKey) {
        this.baseUrl = envApiUrl;
        this.apiKey = envApiKey;
        this.initialized = true;
        return true;
      }

      // Fallback to database settings
      const apiUrlSetting = await storage.getSetting('virtfusion_api_url');
      const apiKeySetting = await storage.getSetting('virtfusion_api_key');

      if (apiUrlSetting && apiKeySetting) {
        this.baseUrl = apiUrlSetting.value;
        this.apiKey = apiKeySetting.value;
        this.initialized = true;
        return true;
      }

      console.warn('VirtFusion API settings not found in environment variables or database.');
      return false;
    } catch (error) {
      console.error('Error initializing VirtFusion service:', error);
      return false;
    }
  }

  /**
   * Check if VirtFusion integration is enabled
   * @returns True if API URL and API key are configured
   */
  public isEnabled(): boolean {
    return this.initialized && !!this.baseUrl && !!this.apiKey;
  }

  /**
   * Get all packages from VirtFusion
   * @returns Array of packages or null if error
   */
  public async getAllPackages(): Promise<any[]> {
    try {
      // Initialize virtFusionApi if needed
      await virtFusionApi.updateSettings();
      
      // Get packages from VirtFusion API
      const response = await virtFusionApi.getPackages();
      
      // Handle different response formats
      let packages;
      if (Array.isArray(response)) {
        packages = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        packages = response.data;
      } else {
        console.error('Unexpected response format from VirtFusion getPackages:', response);
        return [];
      }
      
      return packages;
    } catch (error) {
      console.error('Error getting packages from VirtFusion:', error);
      return [];
    }
  }

  /**
   * Update a user's profile in VirtFusion
   * @param virtFusionId The user's VirtFusion ID
   * @param name The user's name (username)
   * @param email The user's email address
   * @returns Success status and details
   */
  public async updateUserProfile(virtFusionId: number, name: string, email: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      if (!this.isEnabled()) {
        await this.initialize();
        if (!this.isEnabled()) {
          return {
            success: false,
            message: 'VirtFusion integration is not enabled'
          };
        }
      }

      // Validate inputs
      if (!virtFusionId || !name || !email) {
        return {
          success: false,
          message: 'Missing required parameters'
        };
      }

      // Make API request to VirtFusion
      // Based on the API docs, PUT /users/{id} is used to update a user's profile
      const endpoint = `${this.baseUrl}/users/${virtFusionId}`;
      const response = await axios.put(
        endpoint,
        { 
          name,
          email
          // Note: Password updates are not supported by VirtFusion API
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      if (response.status === 200) {
        return {
          success: true,
          message: 'User profile updated successfully in VirtFusion',
          data: response.data
        };
      } else {
        console.error('Unexpected response from VirtFusion API:', response.status, response.data);
        return {
          success: false,
          message: 'Failed to update user profile in VirtFusion'
        };
      }
    } catch (error: any) {
      console.error('Error updating VirtFusion user profile:', error);
      
      // Parse the error message from VirtFusion if available
      let errorMessage = 'An error occurred while updating the user profile in VirtFusion';
      if (error.response && error.response.data) {
        errorMessage = `VirtFusion error: ${JSON.stringify(error.response.data)}`;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Get OS templates available for a specific server
   * @param serverId The server ID to get templates for
   * @returns Array of templates or empty array if error
   */
  public async getServerTemplates(serverId: number): Promise<any[]> {
    try {
      if (!this.isEnabled()) {
        await this.initialize();
        if (!this.isEnabled()) {
          console.warn('VirtFusion integration is not enabled');
          return [];
        }
      }

      // Validate input
      if (!serverId || isNaN(serverId)) {
        console.error('Invalid server ID provided:', serverId);
        return [];
      }

      // Use the VirtFusion API to get templates for the specific server
      const response = await virtFusionApi.request("GET", `/servers/${serverId}/templates`);
      
      // Handle different response formats
      let templates;
      if (Array.isArray(response)) {
        templates = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        templates = response.data;
      } else {
        console.error('Unexpected response format from VirtFusion getServerTemplates:', response);
        return [];
      }
      
      return templates;
    } catch (error) {
      console.error(`Error getting server templates for server ${serverId}:`, error);
      return [];
    }
  }
}

export const virtFusionService = VirtFusionService.getInstance();