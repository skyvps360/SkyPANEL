import { Router, Request, Response } from 'express';
import { apiKeyAuth, requireScope } from '../middleware';
import { db } from '../db';
import { users, servers } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Middleware to authenticate all V1 API requests with API keys
router.use(apiKeyAuth);

/**
 * @route GET /api/v1/me
 * @desc Get current user information
 * @access Private (API Key with read:user scope)
 */
router.get('/me', requireScope('read:user'), async (req: Request, res: Response) => {
  try {
    // The user ID is attached by the apiKeyAuth middleware
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch user data
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        credits: users.credits,
        isVerified: users.isVerified,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/v1/servers
 * @desc Get user's servers
 * @access Private (API Key with read:servers scope)
 */
router.get('/servers', requireScope('read:servers'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch user's servers
    const userServers = await db
      .select()
      .from(servers)
      .where(eq(servers.userId, userId));
    
    return res.json({ servers: userServers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route GET /api/v1/balance
 * @desc Get user's credit balance
 * @access Private (API Key with read:billing scope)
 */
router.get('/balance', requireScope('read:billing'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Fetch user's credit balance
    const [user] = await db
      .select({
        credits: users.credits,
      })
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    return res.json({
      credits: user.credits,
      currency: 'USD' // Assuming USD is the default currency
    });
  } catch (error) {
    console.error('Error fetching user balance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;