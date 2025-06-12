/**
 * Rate limiter for email verification to prevent abuse:
 * - 1 resend attempt per 5 minutes
 * - After 3 failed resend attempts, lock user out for 10 minutes
 * - Track attempts by email address and user ID
 */

import { db } from '../../db';
import { emailVerificationAttempts } from '@shared/schema';
import { eq, and, gte, desc, isNull } from 'drizzle-orm';

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
  waitTimeSeconds?: number;
  attemptsRemaining?: number;
}

export class VerificationRateLimiter {
  private static instance: VerificationRateLimiter;
  
  // Rate limiting constants
  private readonly RESEND_COOLDOWN_MINUTES = 5;
  private readonly MAX_RESEND_ATTEMPTS = 3;
  private readonly LOCKOUT_DURATION_MINUTES = 10;
  
  private constructor() {}
  
  public static getInstance(): VerificationRateLimiter {
    if (!VerificationRateLimiter.instance) {
      VerificationRateLimiter.instance = new VerificationRateLimiter();
    }
    return VerificationRateLimiter.instance;
  }
  
  /**
   * Check if a resend attempt is allowed for the given email
   */
  public async checkResendAllowed(email: string, userId?: number): Promise<RateLimitResult> {
    try {
      const now = new Date();
      
      // Check for active lockout
      const lockoutCheck = await this.checkLockout(email, userId);
      if (!lockoutCheck.allowed) {
        return lockoutCheck;
      }
      
      // Get the most recent resend attempt
      const recentAttempt = await this.getRecentAttempt(email, userId, 'resend');

      if (recentAttempt) {
        // If previous lock-out expired, reset the attempt count
        if (recentAttempt.lockoutUntil && recentAttempt.lockoutUntil < now) {
          await db.update(emailVerificationAttempts)
            .set({ attemptCount: 0, lockoutUntil: null, lastAttemptAt: null })
            .where(eq(emailVerificationAttempts.id, recentAttempt.id));
          return { allowed: true };
        }

        // Check cooldown only if not locked out
        if (recentAttempt.lastAttemptAt) {
          const timeSinceLastAttempt = now.getTime() - recentAttempt.lastAttemptAt.getTime();
          const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60 * 1000;

          if (timeSinceLastAttempt < cooldownMs) {
            const waitTimeSeconds = Math.ceil((cooldownMs - timeSinceLastAttempt) / 1000);
            return {
              allowed: false,
              message: `Please wait ${Math.ceil(waitTimeSeconds / 60)} minutes before requesting another verification code.`,
              waitTimeSeconds
            };
          }
        }
      }
      
      return { allowed: true };
    } catch (error) {
      console.error('Error checking resend rate limit:', error);
      return {
        allowed: false,
        message: 'An error occurred while checking rate limits.'
      };
    }
  }
  
  /**
   * Record a resend attempt and check if lockout should be applied
   */
  public async recordResendAttempt(email: string, userId?: number): Promise<RateLimitResult> {
    try {
      const now = new Date();
      
      // Get existing attempt record for today
      const existingAttempt = await this.getRecentAttempt(email, userId, 'resend');
      
      if (existingAttempt) {
        // If previous lock-out expired, start a fresh window
        if (existingAttempt.lockoutUntil && existingAttempt.lockoutUntil < now) {
          await db.update(emailVerificationAttempts)
            .set({ attemptCount: 1, lockoutUntil: null, lastAttemptAt: now })
            .where(eq(emailVerificationAttempts.id, existingAttempt.id));
          return { allowed: true, attemptsRemaining: this.MAX_RESEND_ATTEMPTS - 1 };
        }

        // Update existing record
        const newCount = existingAttempt.attemptCount + 1;
        
        await db.update(emailVerificationAttempts)
          .set({
            attemptCount: newCount,
            lastAttemptAt: now
          })
          .where(eq(emailVerificationAttempts.id, existingAttempt.id));
        
        // Check if we need to apply lockout
        if (newCount >= this.MAX_RESEND_ATTEMPTS) {
          const lockoutUntil = new Date(now.getTime() + (this.LOCKOUT_DURATION_MINUTES * 60 * 1000));
          
          await db.update(emailVerificationAttempts)
            .set({ lockoutUntil })
            .where(eq(emailVerificationAttempts.id, existingAttempt.id));
          
          return {
            allowed: false,
            message: `Too many verification requests. Please wait ${this.LOCKOUT_DURATION_MINUTES} minutes before trying again.`,
            waitTimeSeconds: this.LOCKOUT_DURATION_MINUTES * 60
          };
        }
        
        return {
          allowed: true,
          attemptsRemaining: this.MAX_RESEND_ATTEMPTS - newCount
        };
      } else {
        // Create new attempt record
        const insertData: any = {
          email,
          attemptType: 'resend',
          attemptCount: 1,
          lastAttemptAt: now
        };

        // Only include userId if it's provided
        if (userId !== undefined) {
          insertData.userId = userId;
        }

        await db.insert(emailVerificationAttempts).values(insertData);
        
        return {
          allowed: true,
          attemptsRemaining: this.MAX_RESEND_ATTEMPTS - 1
        };
      }
    } catch (error) {
      console.error('Error recording resend attempt:', error);
      return {
        allowed: false,
        message: 'An error occurred while processing your request.'
      };
    }
  }
  
  /**
   * Check if user/email is currently locked out
   */
  private async checkLockout(email: string, userId?: number): Promise<RateLimitResult> {
    const now = new Date();
    
    const whereCondition = userId
      ? and(eq(emailVerificationAttempts.userId, userId), eq(emailVerificationAttempts.attemptType, 'resend'))
      : and(eq(emailVerificationAttempts.email, email), isNull(emailVerificationAttempts.userId), eq(emailVerificationAttempts.attemptType, 'resend'));
    
    const [lockoutRecord] = await db.select()
      .from(emailVerificationAttempts)
      .where(whereCondition)
      .orderBy(desc(emailVerificationAttempts.lastAttemptAt))
      .limit(1);
    
    if (lockoutRecord?.lockoutUntil && lockoutRecord.lockoutUntil > now) {
      const waitTimeSeconds = Math.ceil((lockoutRecord.lockoutUntil.getTime() - now.getTime()) / 1000);
      return {
        allowed: false,
        message: `Account temporarily locked. Please wait ${Math.ceil(waitTimeSeconds / 60)} minutes before trying again.`,
        waitTimeSeconds
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * Get the most recent attempt for the given email/user and type
   */
  private async getRecentAttempt(email: string, userId: number | undefined, attemptType: string) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const whereCondition = userId
      ? and(
          eq(emailVerificationAttempts.userId, userId),
          eq(emailVerificationAttempts.attemptType, attemptType),
          gte(emailVerificationAttempts.lastAttemptAt, oneDayAgo)
        )
      : and(
          eq(emailVerificationAttempts.email, email),
          isNull(emailVerificationAttempts.userId),
          eq(emailVerificationAttempts.attemptType, attemptType),
          gte(emailVerificationAttempts.lastAttemptAt, oneDayAgo)
        );
    
    const [attempt] = await db.select()
      .from(emailVerificationAttempts)
      .where(whereCondition)
      .orderBy(desc(emailVerificationAttempts.lastAttemptAt))
      .limit(1);
    
    return attempt;
  }
  
  /**
   * Clear rate limiting data for a user (called after successful verification)
   */
  public async clearUserAttempts(email: string, userId?: number): Promise<void> {
    try {
      const whereCondition = userId
        ? eq(emailVerificationAttempts.userId, userId)
        : and(eq(emailVerificationAttempts.email, email), isNull(emailVerificationAttempts.userId));
      
      await db.delete(emailVerificationAttempts)
        .where(whereCondition);
    } catch (error) {
      console.error('Error clearing user attempts:', error);
    }
  }
  
  /**
   * Get current rate limit status for display purposes
   */
  public async getRateLimitStatus(email: string, userId?: number): Promise<{
    isLocked: boolean;
    waitTimeSeconds?: number;
    attemptsRemaining?: number;
    nextAllowedTime?: Date;
  }> {
    try {
      const lockoutCheck = await this.checkLockout(email, userId);
      if (!lockoutCheck.allowed) {
        return {
          isLocked: true,
          waitTimeSeconds: lockoutCheck.waitTimeSeconds
        };
      }
      
      const recentAttempt = await this.getRecentAttempt(email, userId, 'resend');
      if (recentAttempt && recentAttempt.lastAttemptAt) {
        const now = new Date();
        const cooldownMs = this.RESEND_COOLDOWN_MINUTES * 60 * 1000;
        const nextAllowedTime = new Date(recentAttempt.lastAttemptAt.getTime() + cooldownMs);
        
        if (nextAllowedTime > now) {
          return {
            isLocked: false,
            waitTimeSeconds: Math.ceil((nextAllowedTime.getTime() - now.getTime()) / 1000),
            attemptsRemaining: this.MAX_RESEND_ATTEMPTS - recentAttempt.attemptCount,
            nextAllowedTime
          };
        }
      }
      
      return {
        isLocked: false,
        attemptsRemaining: this.MAX_RESEND_ATTEMPTS
      };
    } catch (error) {
      console.error('Error getting rate limit status:', error);
      return { isLocked: false };
    }
  }
}

export const verificationRateLimiter = VerificationRateLimiter.getInstance();
