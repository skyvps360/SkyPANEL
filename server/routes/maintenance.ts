import type { Express, Request, Response } from "express";
import {
  getMaintenanceStatus,
  getMaintenanceToken,
  regenerateMaintenanceToken,
  toggleMaintenanceMode,
  validateMaintenanceToken
} from "../middleware"; // Assuming middleware is in the parent directory
import { isAdmin as adminCheck } from "../middleware/auth"; // Adjusted path

// Middleware to check if the user is an admin
function isAdmin(req: Request, res: Response, next: Function) {
  // Assuming req.user is populated by authentication middleware
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

const router = (app: Express) => {
  // Maintenance mode status endpoint
  app.get("/api/maintenance/status", async (req, res) => {
    try {
      const status = await getMaintenanceStatus();
      return res.json(status);
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
      return res.status(500).json({ error: 'Failed to fetch maintenance status' });
    }
  });

  // Maintenance mode admin endpoints
  app.post("/api/maintenance/toggle", isAdmin, async (req, res) => {
    try {
      const { enabled, message, estimatedCompletion } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Enabled status must be a boolean" });
      }

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get admin user information for email notifications
      const adminUser = req.user ? {
        fullName: (req.user as any).fullName,
        username: (req.user as any).username
      } : undefined;

      const status = await toggleMaintenanceMode(enabled, message, estimatedCompletion, adminUser);

      return res.json({
        success: true,
        ...status,
        message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
      });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      return res.status(500).json({ error: 'Failed to toggle maintenance mode' });
    }
  });

  // Get maintenance token for admin
  app.get("/api/maintenance/token", isAdmin, (req, res) => {
    try {
      const token = getMaintenanceToken();
      return res.json({ token });
    } catch (error) {
      console.error('Error fetching maintenance token:', error);
      return res.status(500).json({ error: 'Failed to fetch maintenance token' });
    }
  });

  // Regenerate maintenance token
  app.post("/api/maintenance/token/regenerate", isAdmin, async (req, res) => {
    try {
      // Since regenerateMaintenanceToken returns a Promise, we need to await it
      const token = await regenerateMaintenanceToken();
      return res.json({
        success: true,
        token
      });
    } catch (error) {
      console.error('Error regenerating maintenance token:', error);
      return res.status(500).json({ error: 'Failed to regenerate maintenance token' });
    }
  });

  // Validate maintenance token and set a cookie to bypass maintenance mode
  // (This endpoint is used by the maintenance page to enable individual access)
  app.post("/api/maintenance/token/validate", (req, res) => {
    try {
      console.log('Maintenance token validation request received');
      console.log('Request body:', req.body);

      const { token } = req.body;

      if (!token) {
        console.log('No token provided in request');
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      console.log('Validating token:', token);
      const isValid = validateMaintenanceToken(token);
      console.log('Token is valid:', isValid);

      if (isValid) {
        // Set both the session and cookie bypass
        (req.session as any).maintenanceBypass = true;
        console.log('Setting maintenance bypass in session');

        // Set cookie for browser-based bypass (lasts 24 hours)
        // Make sure to use a string value for the cookie
        console.log('Setting maintenance_bypass cookie');
        res.cookie('maintenance_bypass', 'true', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/',
          sameSite: 'lax'
        });

        // Save the session explicitly to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to save session state'
            });
          }

          console.log('Session and cookie saved successfully');
          return res.json({
            success: true,
            message: 'Maintenance bypass enabled',
          });
        });
      } else {
        console.log('Invalid token provided');
        return res.status(401).json({
          success: false,
          message: 'Invalid maintenance token'
        });
      }
    } catch (error) {
      console.error('Error validating maintenance token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate maintenance token'
      });
    }
  });
};

export default router;
