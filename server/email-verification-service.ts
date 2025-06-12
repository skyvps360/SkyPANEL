import { randomBytes } from 'crypto';
import { storage } from './storage';
import { emailService } from './email';
import { User } from '@shared/schema';
import { VirtFusionUserService } from './virtfusion-user-service';
import { verificationRateLimiter } from './services/auth/verification-rate-limiter';

/**
 * Class to handle email verification operations
 */
export class EmailVerificationService {
  /**
   * Send an email verification code to a new user
   * @param userId The user's ID
   * @param email The user's email address
   * @returns Success status and message
   */
  static async sendVerificationEmail(userId: number, email: string): Promise<{ 
    success: boolean; 
    message: string;
  }> {
    try {
      // Initialize email service if needed
      if (!(await emailService.initialize())) {
        console.error('Email service failed to initialize during verification');
        return { 
          success: false, 
          message: 'Email service is not available. Please contact support.' 
        };
      }
      
      // Generate a random verification code (6 characters)
      const verificationCode = randomBytes(3).toString('hex').toUpperCase();
      console.log(`Generated verification code ${verificationCode} for user ${userId} with email ${email}`);
      
      // Set expiration (24 hours from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      // Save token to database
      const token = await storage.createEmailVerificationToken(userId, verificationCode, expiresAt);
      console.log(`Created verification token with ID ${token.id} for user ${userId}`);
      
      // Send verification email
      console.log(`Attempting to send verification email to ${email} with code ${verificationCode}`);
      const emailSent = await emailService.sendEmailVerificationCode(email, verificationCode);
      
      if (!emailSent) {
        console.error(`Failed to send email verification to ${email}`);
        // Even though we failed to send the email, keep the token in the database
        // so we can manually verify the user if needed
        return { 
          success: false, 
          message: 'Failed to send verification email. Please try again or contact support.' 
        };
      }
      
      console.log(`Successfully sent verification email to ${email}`);
      return { 
        success: true, 
        message: 'Verification email sent successfully. Please check your inbox.' 
      };
    } catch (error) {
      console.error('Error sending verification email:', error);
      return { 
        success: false, 
        message: 'An error occurred while sending verification email.' 
      };
    }
  }
  
  /**
   * Verify an email address with verification code
   * @param userId The user's ID
   * @param verificationCode The verification code
   * @returns Success status and message
   */
  static async verifyEmail(userId: number, verificationCode: string): Promise<{ 
    success: boolean; 
    message: string;
  }> {
    try {
      // Find the verification token
      const token = await storage.getEmailVerificationToken(verificationCode);
      
      // Validate token
      if (!token || token.userId !== userId || token.usedAt) {
        return { 
          success: false, 
          message: 'Invalid or expired verification code.' 
        };
      }
      
      // Check if token is expired
      if (token.expiresAt < new Date()) {
        return { 
          success: false, 
          message: 'Verification code has expired. Please request a new code.' 
        };
      }
      
      // Mark user as verified
      await storage.verifyUserEmail(userId);

      // Mark token as used
      await storage.markEmailVerificationTokenAsUsed(token.id);

      // Invalidate any other verification tokens for this user
      await storage.invalidateEmailVerificationTokens(userId);

      // Clear rate limiting data for this user
      const user = await storage.getUser(userId);
      if (user) {
        try {
          await verificationRateLimiter.clearUserAttempts(user.email, userId);
        } catch (e) {
          // Soft-fail: do not block verification
          console.warn('Rate-limiter cleanup failed:', e);
        }
      }
      
      // Now that the email is verified, create the VirtFusion account
      console.log(`Email verified for user ${userId}, proceeding to create VirtFusion account`);
      const virtFusionResult = await VirtFusionUserService.createVirtFusionUser(userId);
      
      if (virtFusionResult.success) {
        console.log(`VirtFusion account created successfully for user ${userId} with VirtFusion ID ${virtFusionResult.virtFusionId}`);
        return { 
          success: true, 
          message: 'Email verified successfully! Your account is now active.' 
        };
      } else {
        console.error(`Failed to create VirtFusion account for user ${userId}: ${virtFusionResult.message}`);
        // We don't want to fail the email verification just because VirtFusion account creation failed
        // The admin can manually create the account later
        return { 
          success: true, 
          message: 'Email verified successfully! Your account is now active.' 
        };
      }
    } catch (error) {
      console.error('Error verifying email:', error);
      return { 
        success: false, 
        message: 'An error occurred while verifying your email. Please try again later.' 
      };
    }
  }
  
  /**
   * Resend verification email
   * @param userId The user's ID
   * @param email The user's email address
   * @returns Success status and message
   */
  static async resendVerificationEmail(userId: number, email: string): Promise<{ 
    success: boolean; 
    message: string;
  }> {
    try {
      // Invalidate any existing tokens
      await storage.invalidateEmailVerificationTokens(userId);
      
      // Generate and send a new verification code
      return await EmailVerificationService.sendVerificationEmail(userId, email);
    } catch (error) {
      console.error('Error resending verification email:', error);
      return { 
        success: false, 
        message: 'An error occurred while resending verification email.' 
      };
    }
  }
  
  /**
   * Check if a user's email is verified
   * @param userId The user's ID
   * @returns Whether the user is verified
   */
  static async isEmailVerified(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      return user ? user.isVerified : false;
    } catch (error) {
      console.error('Error checking email verification status:', error);
      return false;
    }
  }
}