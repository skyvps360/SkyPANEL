import { randomBytes } from 'crypto';
import { storage } from '../../storage';
import { emailService } from '../../email';
import { hashPassword, comparePasswords } from '../../auth';
import { User } from '@shared/schema';
import { virtFusionService } from '../../services/integration/virtfusion-service';
import { virtFusionApi } from '../../services/integration/virtfusion-api';

// Initialize the VirtFusion API settings
(async function initializeVirtFusionApi() {
  try {
    await virtFusionApi.updateSettings();
    console.log("VirtFusion API settings initialized successfully in auth-service");
  } catch (error) {
    console.error("Failed to initialize VirtFusion API settings in auth-service:", error);
  }
})();

/**
 * Class to handle authentication-related operations
 */
export class AuthService {
  /**
   * Request a password reset
   * @param email The user's email address
   * @returns Success status and message
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security reasons
        return { 
          success: true, 
          message: 'If your email is registered, you will receive a password reset code shortly.' 
        };
      }

      // Generate a random token (6-digit code)
      const resetCode = randomBytes(3).toString('hex').toUpperCase();
      
      // Set expiration (5 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      
      // Save token to database
      await storage.createPasswordResetToken(user.id, resetCode, expiresAt);
      
      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(user.email, resetCode);
      
      if (!emailSent) {
        console.error(`Failed to send password reset email to ${user.email}`);
        return { 
          success: false, 
          message: 'Failed to send password reset email. Please try again later or contact support.' 
        };
      }
      
      return { 
        success: true, 
        message: 'If your email is registered, you will receive a password reset code shortly.' 
      };
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      };
    }
  }
  
  /**
   * Verify a password reset code
   * @param email The user's email address
   * @param resetCode The password reset code
   * @returns Success status and message
   */
  static async verifyPasswordResetCode(email: string, resetCode: string): Promise<{ 
    success: boolean; 
    message: string;
    userId?: number;
  }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return { 
          success: false, 
          message: 'Invalid email or reset code.' 
        };
      }
      
      // Find the token
      const token = await storage.getPasswordResetToken(resetCode);
      
      // Validate token
      if (!token || token.userId !== user.id || token.usedAt) {
        return { 
          success: false, 
          message: 'Invalid or expired reset code.' 
        };
      }
      
      // Check if token is expired
      if (token.expiresAt < new Date()) {
        return { 
          success: false, 
          message: 'Reset code has expired. Please request a new code.' 
        };
      }
      
      return { 
        success: true, 
        message: 'Reset code verified successfully.',
        userId: user.id
      };
    } catch (error) {
      console.error('Error verifying password reset code:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      };
    }
  }
  
  /**
   * Reset a user's password
   * @param userId User ID
   * @param resetCode Reset code
   * @returns Success status and message
   */
  static async resetPassword(
    userId: number, 
    resetCode: string
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string }> {
    try {
      // Find the token
      const token = await storage.getPasswordResetToken(resetCode);
      
      // Validate token
      if (!token || token.userId !== userId || token.usedAt) {
        return { 
          success: false, 
          message: 'Invalid or expired reset code.' 
        };
      }
      
      // Check if token is expired
      if (token.expiresAt < new Date()) {
        return { 
          success: false, 
          message: 'Reset code has expired. Please request a new code.' 
        };
      }
      
      // Get the user to check if they have a VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user) {
        return {
          success: false,
          message: 'User not found.'
        };
      }
      
      // Initialize temporary password
      let temporaryPassword = '';
      let virtFusionError = null;
      
      // If user has VirtFusion ID, reset the password through VirtFusion API
      if (user.virtFusionId) {
        try {
          // Make sure VirtFusion API settings are up to date
          await virtFusionApi.updateSettings();
          
          // Call VirtFusion API to reset the password
          console.log(`Attempting to reset password via VirtFusion API for user with extRelationId: ${userId}`);
          const response = await virtFusionApi.resetUserPassword(userId);
          console.log("VirtFusion password reset API response:", response);
          
          // Extract the password from the VirtFusion response
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
            console.log("Successfully obtained VirtFusion-generated password");
          } else {
            // If we didn't get a password, generate a fallback password
            console.warn("VirtFusion response didn't contain expected password field, falling back to generated password");
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            virtFusionError = 'VirtFusion API response did not contain a password.';
          }
        } catch (error: any) {
          console.error("Error resetting password through VirtFusion API:", error);
          
          // If VirtFusion API call failed, generate a fallback password
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          virtFusionError = error.message || 'VirtFusion API error';
        }
      } else {
        // For non-VirtFusion users, generate a random password
        temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }
      
      // Hash the temporary password
      const hashedPassword = await hashPassword(temporaryPassword);
      
      // Update the user's password in our system
      await storage.updateUser(userId, { password: hashedPassword });
      
      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token.id);
      
      // Invalidate any other tokens for this user
      await storage.invalidatePasswordResetTokens(userId);
      
      // Email the user about the password change
      try {
        await emailService.sendAdminPasswordResetEmail(
          user.email,
          temporaryPassword,
          "You" // This indicates the user changed their own password
        );
        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send password reset email to ${user.email}:`, emailError);
      }
      
      // Set message based on VirtFusion integration status
      let message = 'Your password has been reset successfully.';
      if (virtFusionError) {
        message += ' Note: VirtFusion API call failed, but your password has been reset in our system.';
        console.warn(`Warning: Password reset locally but VirtFusion API call failed for user ${userId}. Passwords may be out of sync.`);
      }
      
      return { 
        success: true, 
        message,
        temporaryPassword
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      };
    }
  }
  
  /**
   * Request a username reminder
   * @param email The user's email address
   * @returns Success status and message
   */
  static async requestUsernameReminder(email: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security reasons
        return { 
          success: true, 
          message: 'If your email is registered, you will receive a username reminder shortly.' 
        };
      }
      
      // Send username reminder email
      const emailSent = await emailService.sendForgotUsernameEmail(user.email, user.username);
      
      if (!emailSent) {
        console.error(`Failed to send username reminder email to ${user.email}`);
        return { 
          success: false, 
          message: 'Failed to send username reminder email. Please try again later or contact support.' 
        };
      }
      
      return { 
        success: true, 
        message: 'If your email is registered, you will receive a username reminder shortly.' 
      };
    } catch (error) {
      console.error('Error requesting username reminder:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      };
    }
  }
  
  /**
   * Change user password (when user is logged in)
   * @param userId The user's ID
   * @param currentPassword The current password
   * @param newPassword The new password
   * @returns Success status and message
   */
  static async changePassword(
    userId: number, 
    currentPassword: string, 
    newPassword: string = '' // newPassword is optional - if not provided, we'll use VirtFusion generated password
  ): Promise<{ success: boolean; message: string; temporaryPassword?: string; virtFusionWarning?: string; virtFusionError?: string }> {
    try {
      // Get the user
      const user = await storage.getUser(userId);
      if (!user) {
        return { 
          success: false, 
          message: 'User not found.' 
        };
      }
      
      // Verify current password
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return { 
          success: false, 
          message: 'Current password is incorrect.' 
        };
      }
      
      let temporaryPassword = '';
      let virtFusionError = null;
      
      // User clicked reset, we ALWAYS want to get a new password from VirtFusion
      // regardless of whether user provided a new password
      if (user.virtFusionId) {
        try {
          // IMPORTANT: Use userId as extRelationId (NOT virtFusionId)
          // According to API docs: /users/{extRelationId}/byExtRelation/resetPassword
          console.log(`Attempting to reset password via VirtFusion API for user with extRelationId: ${userId}`);
          
          // Make sure VirtFusion API settings are up to date first
          await virtFusionApi.updateSettings();
          
          // Call VirtFusion API to reset password
          const response = await virtFusionApi.resetUserPassword(userId);
          console.log("VirtFusion password reset API response:", response);
          
          // Extract the password from the VirtFusion response according to API docs
          // Example: {"data":{"email":"jon@doe.com","password":"zD2VqFKO554tdfWKOmGhw"}}
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
            console.log("Successfully obtained VirtFusion-generated password");
          } else {
            // If we didn't get a password, fall back to local password generation
            console.warn("VirtFusion response didn't contain expected password field, falling back to local password generation");
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            virtFusionError = 'VirtFusion API response did not contain a password.';
          }
        } catch (error: any) {
          console.error("Error resetting password through VirtFusion API:", error);
          
          // If VirtFusion failed, generate a password
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          virtFusionError = error.message || 'VirtFusion API error';
        }
      } else {
        // For non-VirtFusion users, use provided or generate a password
        temporaryPassword = newPassword || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }
      
      // Validate password strength
      if (temporaryPassword.length < 8) {
        return {
          success: false,
          message: 'Password must be at least 8 characters long.'
        };
      }
      
      // Hash the new password
      const hashedPassword = await hashPassword(temporaryPassword);
      
      // Update the user's password in our system
      await storage.updateUser(userId, { password: hashedPassword });
      
      // Email the user about the password change
      try {
        await emailService.sendAdminPasswordResetEmail(
          user.email,
          temporaryPassword,
          "You" // This indicates the user changed their own password
        );
        console.log(`Password change email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send password change email to ${user.email}:`, emailError);
      }
      
      // Prepare response message
      const response: { 
        success: boolean;
        message: string;
        temporaryPassword: string;
        virtFusionWarning?: string;
        virtFusionError?: string;
      } = { 
        success: true, 
        message: 'Password changed successfully. A confirmation email has been sent.',
        temporaryPassword
      };
      
      // Add VirtFusion warning if applicable
      if (user.virtFusionId && virtFusionError) {
        response.virtFusionWarning = "Password was reset locally but VirtFusion API call failed";
        response.virtFusionError = virtFusionError;
        console.warn(`Warning: Password reset locally but VirtFusion API call failed for user ${userId}. Passwords may be out of sync.`);
      }
      
      return response;
    } catch (error) {
      console.error('Error changing password:', error);
      return { 
        success: false, 
        message: 'An error occurred. Please try again later.' 
      };
    }
  }
}