import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../api-key-service';

/**
 * Middleware to authenticate token-based requests
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Middleware to require admin authentication
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

/**
 * Middleware to require authentication for a route
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Middleware to authenticate an API key
 * @param req Request object
 * @param res Response object
 * @param next Next function
 */
export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  // Get the API key from the request headers
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required'
    });
  }
  
  // Validate the API key
  ApiKeyService.validateApiKey(apiKey)
    .then(keyInfo => {
      if (!keyInfo) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid API key'
        });
      }
      
      // Add the API key user ID to the request for use in route handlers
      (req as any).apiKeyUser = {
        userId: keyInfo.userId,
        keyId: keyInfo.id,
        scopes: keyInfo.scopes || []
      };
      
      next();
    })
    .catch(error => {
      console.error('API key validation error:', error);
      res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication failed'
      });
    });
}

/**
 * Middleware to require specific scopes for API key access
 * @param requiredScope The scope required for access
 */
export function requireScope(requiredScope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKeyUser = (req as any).apiKeyUser;
    
    if (!apiKeyUser) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key authentication required'
      });
    }
    
    const { scopes } = apiKeyUser;
    
    // Check if the user has the required scope
    if (Array.isArray(scopes) && (scopes.includes(requiredScope) || scopes.includes('*'))) {
      return next();
    }
    
    res.status(403).json({
      error: 'Forbidden',
      message: `Missing required scope: ${requiredScope}`
    });
  };
}