/**
 * Rate limiter for Gemini API to enforce Google's rate limits:
 * - 15 requests per minute (RPM)
 * - 1,500 requests per day (RPD)
 * 
 * This service tracks usage on a per-user basis using cookies to identify users
 * and provides methods to check if a user has exceeded their quota.
 */

import { Request, Response } from 'express';

interface UserUsage {
  minuteRequests: number;
  dayRequests: number;
  lastMinuteReset: number;
  lastDayReset: number;
}

export class GeminiRateLimiter {
  private static instance: GeminiRateLimiter;
  
  // Constants for rate limits
  private readonly RPM_LIMIT = 15;       // Requests per minute (15 RPM)
  private readonly RPD_LIMIT = 1500;     // Requests per day (1,500 RPD)
  
  // Time intervals in milliseconds
  private readonly MINUTE_MS = 60 * 1000;
  private readonly DAY_MS = 24 * 60 * 60 * 1000;
  
  // Cookie settings
  private readonly COOKIE_NAME = 'ai_usage_tracking';
  private readonly COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days
  
  // In-memory storage for tracking usage (for authenticated users)
  private userUsage: Map<string, UserUsage> = new Map();
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): GeminiRateLimiter {
    if (!GeminiRateLimiter.instance) {
      GeminiRateLimiter.instance = new GeminiRateLimiter();
    }
    return GeminiRateLimiter.instance;
  }
  
  /**
   * Check if a user can make a request to the Gemini API
   * @param req Express request
   * @param res Express response
   * @returns Object with allowed status and message
   */
  public checkUserAllowed(req: Request, res: Response): { allowed: boolean; message?: string } {
    // First try to get user ID from session (for authenticated users)
    const userId = req.user?.id ? `user_${req.user.id}` : null;
    
    // If no authenticated user, use cookie to track anonymous users
    const trackingId = userId || this.getOrCreateTrackingCookie(req, res);
    
    // Now get or create the usage record
    let usage = this.userUsage.get(trackingId);
    
    if (!usage) {
      // Initialize new user usage
      usage = {
        minuteRequests: 0,
        dayRequests: 0,
        lastMinuteReset: Date.now(),
        lastDayReset: Date.now()
      };
      this.userUsage.set(trackingId, usage);
    }
    
    // Check if we need to reset the counters
    const now = Date.now();
    
    // Reset minute counter if a minute has passed
    if (now - usage.lastMinuteReset > this.MINUTE_MS) {
      usage.minuteRequests = 0;
      usage.lastMinuteReset = now;
    }
    
    // Reset day counter if a day has passed
    if (now - usage.lastDayReset > this.DAY_MS) {
      usage.dayRequests = 0;
      usage.lastDayReset = now;
    }
    
    // Check if user has exceeded limits
    if (usage.minuteRequests >= this.RPM_LIMIT) {
      const resetInSeconds = Math.ceil((this.MINUTE_MS - (now - usage.lastMinuteReset)) / 1000);
      return { 
        allowed: false, 
        message: `Rate limit exceeded: Maximum of ${this.RPM_LIMIT} requests per minute. Please try again in ${resetInSeconds} seconds.` 
      };
    }
    
    if (usage.dayRequests >= this.RPD_LIMIT) {
      const resetInHours = Math.ceil((this.DAY_MS - (now - usage.lastDayReset)) / (60 * 60 * 1000));
      return { 
        allowed: false, 
        message: `Rate limit exceeded: Maximum of ${this.RPD_LIMIT} requests per day. Please try again in ${resetInHours} hours.` 
      };
    }
    
    // User is allowed, increment counters
    usage.minuteRequests++;
    usage.dayRequests++;
    
    return { allowed: true };
  }
  
  /**
   * Get or create a tracking cookie for anonymous users
   * @param req Express request
   * @param res Express response
   * @returns Tracking ID
   */
  private getOrCreateTrackingCookie(req: Request, res: Response): string {
    // Check if cookie exists
    const existingCookie = req.cookies[this.COOKIE_NAME];
    
    if (existingCookie) {
      return existingCookie;
    }
    
    // Create a new tracking ID
    const trackingId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Set the cookie
    res.cookie(this.COOKIE_NAME, trackingId, {
      maxAge: this.COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    return trackingId;
  }
  
  /**
   * Get current usage statistics for a user
   * @param req Express request
   * @param res Express response (needed for cookie operations)
   * @returns Object with usage statistics
   */
  public getUserUsage(req: Request, res: Response): { 
    minuteRequests: number; 
    dayRequests: number;
    minuteLimit: number;
    dayLimit: number;
    minuteRemaining: number;
    dayRemaining: number;
  } {
    // Get tracking ID (same logic as checkUserAllowed)
    const userId = req.user?.id ? `user_${req.user.id}` : null;
    const trackingId = userId || this.getOrCreateTrackingCookie(req, res);
    
    // Get usage data
    const usage = this.userUsage.get(trackingId) || {
      minuteRequests: 0,
      dayRequests: 0,
      lastMinuteReset: Date.now(),
      lastDayReset: Date.now()
    };
    
    // Handle counter resets if needed
    const now = Date.now();
    
    // Recalculate minute counter if needed
    let minuteRequests = usage.minuteRequests;
    if (now - usage.lastMinuteReset > this.MINUTE_MS) {
      minuteRequests = 0;
    }
    
    // Recalculate day counter if needed
    let dayRequests = usage.dayRequests;
    if (now - usage.lastDayReset > this.DAY_MS) {
      dayRequests = 0;
    }
    
    return {
      minuteRequests,
      dayRequests,
      minuteLimit: this.RPM_LIMIT,
      dayLimit: this.RPD_LIMIT,
      minuteRemaining: Math.max(0, this.RPM_LIMIT - minuteRequests),
      dayRemaining: Math.max(0, this.RPD_LIMIT - dayRequests)
    };
  }
}

export const geminiRateLimiter = GeminiRateLimiter.getInstance();