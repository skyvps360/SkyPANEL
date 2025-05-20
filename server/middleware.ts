import { Request, Response, NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { Session } from 'express-session';
import { emailQueueManager } from './email-queue';
import path from 'path';
import { ApiKeyService } from './api-key-service';

// Extend the Session type to include our custom properties
declare module 'express-session' {
  interface Session {
    maintenanceBypass?: boolean;
    user?: any; // Already being used in the code
  }
}

// Maintenance configuration stored in memory but loaded from database
// Default values just for initialization
let MAINTENANCE_TOKEN = nanoid(16);
let MAINTENANCE_ENABLED = false;

// Initialize the maintenance token and mode from database on server start
(async function initializeMaintenanceSettings() {
  try {
    // Load maintenance token
    const tokenSetting = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_token')
    });
    
    if (tokenSetting) {
      // If a token exists in the database, use it
      MAINTENANCE_TOKEN = tokenSetting.value;
      console.log('Maintenance token loaded from database');
    } else {
      // If no token exists, create one and store it
      const { settings } = await import('@shared/schema');
      await db.insert(settings)
        .values({ key: 'maintenance_token', value: MAINTENANCE_TOKEN });
      console.log('New maintenance token created and stored in database');
    }
    
    // Load maintenance mode status
    const modeSetting = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_mode')
    });
    
    if (modeSetting) {
      // Update the in-memory flag based on database value
      MAINTENANCE_ENABLED = modeSetting.value === 'true';
      console.log(`Maintenance mode loaded from database: ${MAINTENANCE_ENABLED ? 'enabled' : 'disabled'}`);
    } else {
      // If no setting exists, create one with default value (disabled)
      const { settings } = await import('@shared/schema');
      await db.insert(settings)
        .values({ key: 'maintenance_mode', value: MAINTENANCE_ENABLED.toString() });
      console.log('New maintenance mode setting created and stored in database');
    }
  } catch (error) {
    console.error('Error initializing maintenance settings:', error);
    // Continue with the memory-based defaults as fallback
  }
})();

/**
 * Middleware to check if the system is in maintenance mode
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function maintenanceMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip maintenance check for API endpoints related to maintenance itself
  // These endpoints need to be accessible during maintenance
  if (req.path === '/api/maintenance/status' || 
      req.path === '/api/maintenance/token' || 
      req.path === '/api/maintenance/token/regenerate' || 
      req.path === '/api/maintenance/token/validate' || 
      req.path === '/api/maintenance/toggle') {
    return next();
  }

  try {
    // First check our in-memory flag for efficiency
    if (!MAINTENANCE_ENABLED) {
      return next();
    }
    
    // If in-memory flag is enabled, verify with database for consistency
    // This is a fallback in case the in-memory state gets out of sync
    const maintenanceMode = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_mode')
    });

    // If maintenance mode is not enabled in the database, update our in-memory flag and proceed
    if (!maintenanceMode || maintenanceMode.value !== 'true') {
      MAINTENANCE_ENABLED = false;
      return next();
    }

    // Check if it's an admin user
    // Always allow admin users full access during maintenance
    // req.user is populated by Passport.js deserializeUser process
    console.log('User object:', req.user ? JSON.stringify(req.user) : 'undefined');
    if (req.user && (req.user as any).role === 'admin') {
      console.log(`Admin user bypass for maintenance: ${req.path}`);
      return next();
    }

    // Check if the request path contains the bypass token
    // (the token is part of the URL itself)
    const urlPath = req.path;
    if (urlPath.includes(`/${MAINTENANCE_TOKEN}`)) {
      // Store the token in the session to avoid having to use it in every request
      req.session.maintenanceBypass = true;
      
      // Redirect to the same URL without the token
      const redirectPath = urlPath.replace(`/${MAINTENANCE_TOKEN}`, '');
      return res.redirect(redirectPath || '/');
    }

    // Check if the session has a maintenance bypass flag
    if (req.session.maintenanceBypass) {
      return next();
    }
    
    // Check for maintenance_bypass cookie
    // The cookie can be either 'true' or true (boolean)
    if (req.cookies && req.cookies.maintenance_bypass) {
      console.log('Maintenance bypass cookie found:', req.cookies.maintenance_bypass);
      return next();
    }

    // Allow access to specific paths during maintenance mode:
    // - Landing page (/)
    // - Maintenance page (/maintenance)
    // - Legal pages (/tos, /privacy)
    // - Necessary API endpoints for these pages
    // - All necessary static assets and JavaScript modules
    if (urlPath === '/' || 
        urlPath === '/tos' ||
        urlPath === '/privacy' ||
        urlPath === '/maintenance' ||
        urlPath.startsWith('/maintenance') ||
        urlPath === '/api/maintenance/token/validate' ||
        urlPath === '/api/maintenance/status' ||
        urlPath === '/api/admin/legal' ||  // API endpoint needed for legal pages
        urlPath === '/api/settings/public' ||  // Needed for maintenance page styling
        urlPath === '/api/settings/branding' || // Needed for branding during maintenance
        urlPath.startsWith('/assets') ||
        urlPath.startsWith('/public') ||
        urlPath.startsWith('/@vite') ||
        urlPath.startsWith('/@fs') ||
        urlPath.startsWith('/node_modules') ||
        urlPath.startsWith('/src') ||
        urlPath.startsWith('/js/') ||  // Explicitly allow any JS files in the /js directory
        urlPath.startsWith('/public/js/') ||  // Allow JS files in public/js
        urlPath.startsWith('/client/src/') ||  // Allow client source files
        urlPath.includes('share-modal.js') ||  // Explicitly allow the share modal script
        urlPath.includes('.js') ||
        urlPath.includes('.css') ||
        urlPath.includes('.ico') ||
        urlPath.includes('.png') ||
        urlPath.includes('.svg') ||
        urlPath.includes('.json') ||  // Allow JSON files for config
        urlPath.includes('.woff') ||  // Allow font files
        urlPath.includes('.woff2') ||
        urlPath.includes('.ttf')) {
      if (urlPath.includes('share-modal') || urlPath.startsWith('/js/')) {
        console.log(`Allowing access to JS resource during maintenance: ${urlPath}`);
      }
      return next();
    }

    // For API requests, return a JSON response
    // But allow certain API routes needed for public pages
    if (req.path.startsWith('/api/')) {
      // Check if it's an admin user again (for API routes specifically)
      if (req.user && (req.user as any).role === 'admin') {
        console.log(`Admin user API bypass for maintenance: ${req.path}`);
        return next();
      }
      
      // Allow API routes needed for the landing page and other public areas
      if (req.path.startsWith('/api/public/') || 
          req.path.startsWith('/api/company/') ||
          req.path.startsWith('/api/settings/') ||  // All settings endpoints
          req.path.startsWith('/api/user') ||  // Allow user info endpoint for authentication
          req.path.startsWith('/api/admin/') || // Allow admin endpoints for admins
          req.path.startsWith('/api/datacenter-locations') ||
          req.path.startsWith('/api/blog/') ||
          req.path.startsWith('/api/docs/') ||
          req.path.startsWith('/api/auth/') ||  // Allow auth endpoints for login/logout
          req.path.startsWith('/api/ticket-departments') ||  // For ticket department management
          req.path.startsWith('/api/tickets/') ||  // For ticket management
          req.path.startsWith('/api/service-status') ||  // For service status checking
          req.path.startsWith('/api/maintenance/')) {
        console.log(`Allowing API access during maintenance: ${req.path}`);
        return next();
      }
      
      return res.status(503).json({
        error: 'Service Unavailable',
        message: 'System is currently under maintenance',
      });
    }

    // For HTML requests, let the React router handle the rendering 
    // Instead of redirecting, we let the React app handle the route
    if (req.accepts('html')) {
      // Don't redirect, just pass to the next middleware to let Vite/React handle it
      console.log(`Maintenance mode active: Letting React handle ${req.path}`);
      
      // Just pass the request through to the next middleware
      // Vite's middleware will handle serving the React app
      return next();
    }

    // For other requests, return a simple 503 response
    return res.status(503).send('Service Unavailable - System under maintenance');
  } catch (error) {
    console.error('Maintenance middleware error:', error);
    next();
  }
}

/**
 * Get the current maintenance mode status
 * @returns Object with maintenance status details
 */
export async function getMaintenanceStatus() {
  try {
    const enabled = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_mode')
    });
    
    const message = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_message')
    });
    
    const estimatedCompletion = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_estimated_completion')
    });
    
    return {
      enabled: enabled?.value === 'true',
      message: message?.value || 'System is currently under maintenance',
      estimatedCompletion: estimatedCompletion?.value || null
    };
  } catch (error) {
    console.error('Error getting maintenance status:', error);
    return {
      enabled: false,
      message: 'System is currently under maintenance',
      estimatedCompletion: null
    };
  }
}

/**
 * Toggle maintenance mode
 * @param enabled Whether to enable or disable maintenance mode
 * @param message The maintenance message to display
 * @param estimatedCompletion Estimated completion time (ISO string)
 * @param adminUser The admin user who is toggling maintenance mode (for notifications)
 * @returns Updated maintenance status
 */
export async function toggleMaintenanceMode(
  enabled: boolean,
  message: string,
  estimatedCompletion?: string,
  adminUser?: { fullName?: string; username?: string }
) {
  try {
    console.log(`Toggling maintenance mode: enabled=${enabled}, message=${message}, estimatedCompletion=${estimatedCompletion || 'none'}`);
    
    // Update the in-memory flag immediately
    MAINTENANCE_ENABLED = enabled;
    
    // Import settings from schema
    const { settings } = await import('@shared/schema');
    
    // Check if the settings already exist
    const modeExists = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_mode')
    });
    
    const messageExists = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_message')
    });
    
    const completionExists = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_estimated_completion')
    });
    
    // For maintenance_mode setting
    if (modeExists) {
      await db.update(settings)
        .set({ value: enabled.toString() })
        .where(eq(settings.key, 'maintenance_mode'));
    } else {
      await db.insert(settings)
        .values({ key: 'maintenance_mode', value: enabled.toString() });
    }
    
    // For maintenance_message setting
    if (messageExists) {
      await db.update(settings)
        .set({ value: message })
        .where(eq(settings.key, 'maintenance_message'));
    } else {
      await db.insert(settings)
        .values({ key: 'maintenance_message', value: message });
    }
    
    // For maintenance_estimated_completion setting
    const completionValue = estimatedCompletion || '';
    if (completionExists) {
      await db.update(settings)
        .set({ value: completionValue })
        .where(eq(settings.key, 'maintenance_estimated_completion'));
    } else {
      await db.insert(settings)
        .values({ key: 'maintenance_estimated_completion', value: completionValue });
    }
    
    console.log('Maintenance mode settings updated successfully');
    
    // If maintenance is being enabled, send notifications to all admin users
    if (enabled) {
      try {
        const adminName = adminUser?.fullName || adminUser?.username || 'System';
        
        // Queue emails in the background to all admin users
        emailQueueManager.queueMaintenanceNotifications(
          adminName,
          message,
          estimatedCompletion
        ).catch(err => {
          console.error('Error queuing maintenance notifications:', err);
        });
        
        console.log(`Queued maintenance notifications to admin users, enabled by: ${adminName}`);
      } catch (notifyError) {
        // Log error but don't fail the operation
        console.error('Error queueing admin notifications for maintenance mode:', notifyError);
      }
    }
    
    return {
      enabled,
      message,
      estimatedCompletion: estimatedCompletion || null
    };
  } catch (error) {
    console.error('Error toggling maintenance mode:', error);
    throw new Error('Failed to update maintenance settings');
  }
}

/**
 * Get the current maintenance bypass token
 * @returns The current token
 */
export function getMaintenanceToken() {
  return MAINTENANCE_TOKEN;
}

/**
 * Regenerate the maintenance bypass token and save it to the database
 * @returns The new token
 */
export async function regenerateMaintenanceToken() {
  try {
    // Generate a new token
    MAINTENANCE_TOKEN = nanoid(16);
    
    // Import settings from schema
    const { settings } = await import('@shared/schema');
    
    // Check if the setting already exists
    const tokenSetting = await db.query.settings.findFirst({
      where: (settings, { eq }) => eq(settings.key, 'maintenance_token')
    });
    
    // Update or insert the new token in the database
    if (tokenSetting) {
      await db.update(settings)
        .set({ value: MAINTENANCE_TOKEN })
        .where(eq(settings.key, 'maintenance_token'));
    } else {
      await db.insert(settings)
        .values({ key: 'maintenance_token', value: MAINTENANCE_TOKEN });
    }
    
    console.log('Maintenance token regenerated and saved to database');
    return MAINTENANCE_TOKEN;
  } catch (error) {
    console.error('Error regenerating maintenance token:', error);
    // If database operation fails, still return the new token
    // to ensure the admin can access the site
    return MAINTENANCE_TOKEN;
  }
}

/**
 * Validate if the provided token matches the maintenance bypass token
 * @param token The token to validate 
 * @returns True if the token is valid, false otherwise
 */
export function validateMaintenanceToken(token: string): boolean {
  // Compare with the in-memory token (which should be in sync with the database)
  return token === MAINTENANCE_TOKEN;
}

/**
 * Middleware to authenticate API requests using an API key
 * This extracts the API key from the Authorization header and validates it
 * @param req Express request
 * @param res Express response
 * @param next Express next function
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required'
      });
    }
    
    // Extract API key - should be in format "Bearer API_KEY"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      console.error('API key authentication failed: Invalid Authorization header format');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format. Use format: Bearer YOUR_API_KEY'
      });
    }
    
    const apiKey = parts[1];
    
    // Validate the API key
    const result = await ApiKeyService.validateApiKey(apiKey);
    if (!result) {
      console.error('API key authentication failed: Invalid API key');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }
    
    // Add user ID and scopes to request for use in route handlers
    (req as any).apiKeyUser = {
      userId: result.userId,
      scopes: result.scopes
    };
    
    // Check if the API key has the required scope (if specified)
    if ((req as any).requiredScope && (!result.scopes.includes((req as any).requiredScope) && !result.scopes.includes('*'))) {
      console.error(`API key authentication failed: Missing required scope '${(req as any).requiredScope}'`);
      return res.status(403).json({
        error: 'Forbidden',
        message: `API key is missing required scope: ${(req as any).requiredScope}`
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in API key authentication:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred during API key authentication'
    });
  }
}

/**
 * Helper middleware to require a specific scope for an API endpoint
 * @param scope The required scope for accessing the endpoint
 * @returns Middleware function
 */
export function requireScope(scope: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    (req as any).requiredScope = scope;
    next();
  };
}