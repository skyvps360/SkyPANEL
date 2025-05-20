import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to require admin access for a route
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