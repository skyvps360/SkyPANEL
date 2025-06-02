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

      // Get user for VirtFusion token balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Initialize response with VirtFusion data only
      const response = {
        virtFusionCredits: 0,
        virtFusionTokens: 0,
        currency: 'USD'
      };

      // If user has VirtFusion account linked, fetch their tokens
      if (user.virtFusionId) {
        try {
          const { VirtFusionApi } = await import('../virtfusion-api');
          const virtFusionApi = new VirtFusionApi();
          if (virtFusionApi.isConfigured()) {
            // Use the VirtFusion API to get user hourly stats (which contains credit info)
            const virtFusionData = await virtFusionApi.getUserHourlyStats(user.id);

            if (virtFusionData?.data?.credit?.tokens) {
              const tokenAmount = parseFloat(virtFusionData.data.credit.tokens);
              const dollarAmount = tokenAmount / 100; // 100 tokens = $1.00 USD

              response.virtFusionTokens = tokenAmount || 0;
              response.virtFusionCredits = dollarAmount || 0;
            }
          }
        } catch (virtFusionError) {
          console.error("Error fetching VirtFusion credits:", virtFusionError);
          // Return empty VirtFusion data if API call fails
        }
      }

      return res.json(response);
    } catch (error) {
      console.error('Error retrieving balance information via API:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to retrieve balance information'
      });
    }
});

export default router;