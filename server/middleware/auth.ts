import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require user authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

/**
 * Middleware to require admin authentication
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

/**
 * Middleware to optionally authenticate user (doesn't fail if not authenticated)
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Always proceed, authentication is optional
  next();
}

/**
 * Middleware to check if user has specific role
 */
export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated() && req.user?.role === role) {
      return next();
    }
    res.status(403).json({ error: `Forbidden: ${role} access required` });
  };
}

/**
 * Middleware to check if user is verified
 */
export function requireVerified(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isVerified) {
    return next();
  }
  res.status(403).json({ error: "Email verification required" });
}

/**
 * Middleware to check if user is active
 */
export function requireActive(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated() && req.user?.isActive) {
    return next();
  }
  res.status(403).json({ error: "Account is not active" });
}
