import { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../settings-service';

/**
 * Middleware to check if DNS system is enabled
 * Returns 503 Service Unavailable if DNS system is disabled
 */
export async function requireDnsEnabled(req: Request, res: Response, next: NextFunction) {
  try {
    const isDnsEnabled = await SettingsService.isDnsSystemEnabled();
    
    if (!isDnsEnabled) {
      return res.status(503).json({
        error: 'DNS service unavailable',
        message: 'The DNS management system has been disabled by the administrator'
      });
    }
    
    next();
  } catch (error) {
    console.error('Error checking DNS system status:', error);
    // Default to allowing access if we can't check the setting
    next();
  }
}