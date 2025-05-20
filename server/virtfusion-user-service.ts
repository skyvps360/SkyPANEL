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
      
      console.log(`Creating user in VirtFusion with extRelationId=${user.id}`);
      
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
        selfServiceHourlyResourcePack: settings.selfServiceHourlyResourcePack, // From settings
        sendMail: false // Don't send email notification
      };
      
      console.log(`VirtFusion user data:`, virtFusionUserData);
      
      const virtFusionResponse = await virtFusionApi.createUser(virtFusionUserData);
      console.log(`VirtFusion user created successfully:`, virtFusionResponse);
      
      // Extract the user data from the response based on VirtFusion API format
      const virtFusionUser = virtFusionResponse && virtFusionResponse.data ? virtFusionResponse.data : virtFusionResponse;
      
      // Update local user with VirtFusion ID if available
      if (virtFusionUser && virtFusionUser.id) {
        await storage.updateUser(user.id, { 
          virtFusionId: virtFusionUser.id 
        });
        console.log(`Updated local user with VirtFusion ID ${virtFusionUser.id}`);
        
        // Assign default resource pack to the new user (based on settings)
        try {
          const resourcePackId = settings.defaultResourcePack;
          console.log(`Assigning default resource pack (ID=${resourcePackId}) to new user with extRelationId=${user.id}`);
          
          // Use the addDefaultResourcePackToUser method
          const resourcePackResponse = await virtFusionApi.addDefaultResourcePackToUser(user.id);
          
          console.log(`Resource pack assignment successful:`, resourcePackResponse);
        } catch (resourcePackError) {
          console.error(`Failed to assign default resource pack to user:`, resourcePackError);
        }
        
        return { 
          success: true, 
          message: 'VirtFusion account created successfully', 
          virtFusionId: virtFusionUser.id 
        };
      } else if (virtFusionResponse) {
        console.warn('VirtFusion user created but no ID was returned in expected format', virtFusionResponse);
        
        // Try to retrieve the user using the extRelationId
        try {
          const existingVirtFusionUser = await virtFusionApi.getUserByExtRelationId(user.id);
          const userData = existingVirtFusionUser && existingVirtFusionUser.data ? existingVirtFusionUser.data : existingVirtFusionUser;
          
          if (userData && userData.id) {
            await storage.updateUser(user.id, { 
              virtFusionId: userData.id 
            });
            console.log(`Retrieved and updated local user with VirtFusion ID ${userData.id}`);
            
            return { 
              success: true, 
              message: 'VirtFusion account retrieved successfully', 
              virtFusionId: userData.id 
            };
          }
        } catch (lookupError) {
          console.error('Failed to lookup user by extRelationId:', lookupError);
        }
        
        return { 
          success: false, 
          message: 'VirtFusion user created but failed to retrieve ID' 
        };
      } else {
        console.error('VirtFusion API response is empty or invalid', virtFusionResponse);
        return { 
          success: false, 
          message: 'Failed to create VirtFusion account' 
        };
      }
    } catch (error) {
      console.error('Error creating user in VirtFusion:', error);
      return { 
        success: false, 
        message: 'An error occurred while creating VirtFusion account' 
      };
    }
  }
}