import { virtFusionApi } from './virtfusion-api';
import { storage } from './storage';
import { User } from '@shared/schema';

/**
 * Service for handling VirtFusion user operations
 */
export class VirtFusionUserService {
  /**
   * Get VirtFusion user creation settings from database
   * @returns Settings object with user creation parameters
   */
  private static async getUserCreationSettings(): Promise<{
    selfService: number;
    selfServiceHourlyCredit: boolean;
    selfServiceHourlyResourcePack: number;
    defaultResourcePack: number;
  }> {
    // Get settings from database with default fallbacks
    const selfServiceSetting = await storage.getSetting('virtfusion_self_service');
    const selfServiceCreditSetting = await storage.getSetting('virtfusion_self_service_hourly_credit');
    const selfServicePackSetting = await storage.getSetting('virtfusion_self_service_hourly_resource_pack_id');
    const defaultPackSetting = await storage.getSetting('virtfusion_default_resource_pack_id');
    
    // Parse settings with fallbacks to defaults
    return {
      selfService: selfServiceSetting ? parseInt(selfServiceSetting.value, 10) : 1,
      selfServiceHourlyCredit: selfServiceCreditSetting ? selfServiceCreditSetting.value === 'true' : true,
      selfServiceHourlyResourcePack: selfServicePackSetting ? parseInt(selfServicePackSetting.value, 10) : 1,
      defaultResourcePack: defaultPackSetting ? parseInt(defaultPackSetting.value, 10) : 1
    };
  }

  /**
   * Create a user in VirtFusion after email verification
   * @param userId The user's ID in our system
   * @returns Success status and message
   */
  static async createVirtFusionUser(userId: number): Promise<{ 
    success: boolean; 
    message: string;
    virtFusionId?: number;
  }> {
    try {
      // Get user data from our database
      const user = await storage.getUser(userId);
      
      if (!user) {
        return { 
          success: false, 
          message: 'User not found' 
        };
      }
      
      // Check if user already has a VirtFusion ID
      if (user.virtFusionId) {
        return { 
          success: true, 
          message: 'User already has a VirtFusion account', 
          virtFusionId: user.virtFusionId 
        };
      }
      
      // Creating user in VirtFusion with extRelationId
      
      // First, ensure API connection is working
      await virtFusionApi.updateSettings();
      
      // Get user creation settings from database
      const settings = await VirtFusionUserService.getUserCreationSettings();
      
      // Create user in VirtFusion - using the correct format from API docs
      const virtFusionUserData = {
        name: user.fullName || user.username, // Full name of the user (required)
        email: user.email, // Email address (required)
        extRelationId: user.id, // Relation ID (our user ID)
        selfService: settings.selfService, // From settings (1 = hourly enabled)
        selfServiceHourlyCredit: settings.selfServiceHourlyCredit, // From settings
        selfServiceHourlyGroupProfiles: [], // Required array field - empty for default
        selfServiceResourceGroupProfiles: [], // Required array field - empty for default
        selfServiceHourlyResourcePack: settings.selfServiceHourlyResourcePack, // From settings
        sendMail: false // Don't send email notification
      };
      
      // VirtFusion user data prepared
      
      const virtFusionResponse = await virtFusionApi.createUser(virtFusionUserData);
      // VirtFusion user created successfully
      
      // Extract the user data from the response based on VirtFusion API format
      const virtFusionUser = virtFusionResponse && virtFusionResponse.data ? virtFusionResponse.data : virtFusionResponse;
      
      // Update local user with VirtFusion ID if available
      if (virtFusionUser && virtFusionUser.id) {
        await storage.updateUser(user.id, { 
          virtFusionId: virtFusionUser.id 
        });
        // Updated local user with VirtFusion ID
        
        // Assign default resource pack to the new user (based on settings)
        try {
          const resourcePackId = settings.defaultResourcePack;
          // Assigning default resource pack to new user
          
          // Use the addDefaultResourcePackToUser method
          const resourcePackResponse = await virtFusionApi.addDefaultResourcePackToUser(user.id);
          
          // Resource pack assignment successful
          // Resource pack assignment successful
        } catch (resourcePackError) {
          // Failed to assign default resource pack to user
        }
        
        return { 
          success: true, 
          message: 'VirtFusion account created successfully', 
          virtFusionId: virtFusionUser.id 
        };
      } else if (virtFusionResponse) {
        // VirtFusion user created but no ID was returned in expected format
        
        // Try to retrieve the user using the extRelationId
        try {
          const existingVirtFusionUser = await virtFusionApi.getUserByExtRelationId(user.id);
          const userData = existingVirtFusionUser && existingVirtFusionUser.data ? existingVirtFusionUser.data : existingVirtFusionUser;
          
          if (userData && userData.id) {
            await storage.updateUser(user.id, { 
              virtFusionId: userData.id 
            });
            // Retrieved and updated local user with VirtFusion ID
            // Retrieved and updated local user with VirtFusion ID
            
            return { 
              success: true, 
              message: 'VirtFusion account retrieved successfully', 
              virtFusionId: userData.id 
            };
          }
        } catch (lookupError) {
          // Failed to lookup user by extRelationId
        }
        
        return { 
          success: false, 
          message: 'VirtFusion user created but failed to retrieve ID' 
        };
      } else {
        // VirtFusion API response is empty or invalid
        return { 
          success: false, 
          message: 'Failed to create VirtFusion account' 
        };
      }
    } catch (error) {
      // Error creating user in VirtFusion
      return { 
        success: false, 
        message: 'An error occurred while creating VirtFusion account' 
      };
    }
  }
}