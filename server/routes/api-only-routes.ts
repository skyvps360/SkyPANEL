import { Router } from 'express';
import { apiKeyAuth, requireScope } from '../middleware';
import { storage } from '../storage';

// Create router for API-only routes (authenticated via API keys)
const router = Router();

// User information endpoint - requires API key with 'read:user' scope
router.get('/me', 
  apiKeyAuth, 
  requireScope('read:user'), 
  async (req, res) => {
    try {
      const { userId } = (req as any).apiKeyUser;
      
      // Get user information but exclude sensitive data like password
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      // Return user information without sensitive fields
      const { password, ...safeUserData } = user;
      
      return res.json(safeUserData);
    } catch (error) {
      console.error('Error retrieving user information via API:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve user information'
      });
    }
});

// Servers endpoint - requires API key with 'read:servers' scope
router.get('/servers', 
  apiKeyAuth, 
  requireScope('read:servers'), 
  async (req, res) => {
    try {
      const { userId } = (req as any).apiKeyUser;
      
      // This endpoint would typically get server data for the user
      // For now, we'll return a simple response
      return res.json({
        servers: [
          {
            id: 1,
            name: 'Server 1',
            status: 'running',
            created: new Date().toISOString()
          }
        ]
      });
    } catch (error) {
      console.error('Error retrieving server information via API:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve server information'
      });
    }
});

// Balance endpoint - requires API key with 'read:billing' scope
router.get('/balance', 
  apiKeyAuth, 
  requireScope('read:billing'), 
  async (req, res) => {
    try {
      const { userId } = (req as any).apiKeyUser;
      
      // Get user for credits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }
      
      // Return user credit balance
      return res.json({
        credits: user.credits,
        currency: 'USD'
      });
    } catch (error) {
      console.error('Error retrieving balance information via API:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve balance information'
      });
    }
});

export default router;