import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Validation schemas
const createAwardSettingSchema = z.object({
  name: z.string().min(1, 'Award name is required'),
  description: z.string().optional(),
  loginDaysRequired: z.number().min(7, 'Login days must be at least 7 days to prevent abuse'),
  virtFusionTokens: z.number().min(0, 'Tokens must be 0 or greater'),
  isActive: z.boolean().default(true),
});

const updateAwardSettingSchema = createAwardSettingSchema.partial();

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * Get all award settings (Admin only)
 */
router.get('/admin/award-settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const awardSettings = await storage.getAllAwardSettings();
    return res.json(awardSettings);
  } catch (error: any) {
    console.error('Error fetching award settings:', error);
    return res.status(500).json({ message: 'Failed to fetch award settings' });
  }
});

/**
 * Get award statistics (Admin only)
 */
router.get('/admin/award-stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await storage.getAwardStatistics();
    return res.json(stats);
  } catch (error: any) {
    console.error('Error fetching award statistics:', error);
    return res.status(500).json({ message: 'Failed to fetch award statistics' });
  }
});

/**
 * Get single award setting by ID (Admin only)
 */
router.get('/admin/award-settings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid award setting ID' });
    }

    const awardSetting = await storage.getAwardSetting(id);
    if (!awardSetting) {
      return res.status(404).json({ message: 'Award setting not found' });
    }

    return res.json(awardSetting);
  } catch (error: any) {
    console.error('Error fetching award setting:', error);
    return res.status(500).json({ message: 'Failed to fetch award setting' });
  }
});

/**
 * Create new award setting (Admin only)
 */
router.post('/admin/award-settings', requireAuth, requireAdmin, async (req, res) => {
  try {
    const validationResult = createAwardSettingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid input',
        errors: validationResult.error.errors,
      });
    }

    const awardSetting = await storage.createAwardSetting(validationResult.data);
    return res.status(201).json(awardSetting);
  } catch (error: any) {
    console.error('Error creating award setting:', error);
    return res.status(500).json({ message: 'Failed to create award setting' });
  }
});

/**
 * Update award setting (Admin only)
 */
router.put('/admin/award-settings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid award setting ID' });
    }

    const validationResult = updateAwardSettingSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid input',
        errors: validationResult.error.errors,
      });
    }

    const awardSetting = await storage.updateAwardSetting(id, validationResult.data);
    if (!awardSetting) {
      return res.status(404).json({ message: 'Award setting not found' });
    }

    return res.json(awardSetting);
  } catch (error: any) {
    console.error('Error updating award setting:', error);
    return res.status(500).json({ message: 'Failed to update award setting' });
  }
});

/**
 * Delete award setting (Admin only)
 */
router.delete('/admin/award-settings/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid award setting ID' });
    }

    const deleted = await storage.deleteAwardSetting(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Award setting not found' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting award setting:', error);
    return res.status(500).json({ message: 'Failed to delete award setting' });
  }
});

/**
 * Get all user login streaks (Admin only)
 */
router.get('/admin/user-streaks', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const { streaks, total } = await storage.getUserLoginStreaks(limit, offset);
    
    return res.json({
      streaks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user streaks:', error);
    return res.status(500).json({ message: 'Failed to fetch user streaks' });
  }
});

/**
 * Get all user awards (Admin only)
 */
router.get('/admin/user-awards', requireAuth, requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status as string;

    const { awards, total } = await storage.getUserAwards(limit, offset, status);
    
    return res.json({
      awards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user awards:', error);
    return res.status(500).json({ message: 'Failed to fetch user awards' });
  }
});

// ============================================================================
// USER ROUTES
// ============================================================================

/**
 * Get user's awards dashboard data
 */
router.get('/user/awards', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const dashboardData = await storage.getUserAwardsDashboard(userId);
    
    return res.json(dashboardData);
  } catch (error: any) {
    console.error('Error fetching user awards dashboard:', error);
    return res.status(500).json({ message: 'Failed to fetch awards data' });
  }
});

/**
 * Get user's login streak
 */
router.get('/user/login-streak', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const loginStreak = await storage.getUserLoginStreak(userId);
    
    return res.json(loginStreak);
  } catch (error: any) {
    console.error('Error fetching user login streak:', error);
    return res.status(500).json({ message: 'Failed to fetch login streak' });
  }
});

/**
 * Get user's awards history
 */
router.get('/user/awards/history', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const { awards, total } = await storage.getUserAwardsHistory(userId, limit, offset);
    
    return res.json({
      awards,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching user awards history:', error);
    return res.status(500).json({ message: 'Failed to fetch awards history' });
  }
});

/**
 * Claim a pending award
 */
router.post('/user/awards/:id/claim', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const awardId = parseInt(req.params.id);
    
    if (isNaN(awardId)) {
      return res.status(400).json({ message: 'Invalid award ID' });
    }

    const result = await storage.claimUserAward(userId, awardId);
    
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      message: 'Award claimed successfully',
      tokensAwarded: result.tokensAwarded,
    });
  } catch (error: any) {
    console.error('Error claiming award:', error);
    return res.status(500).json({ message: 'Failed to claim award' });
  }
});

/**
 * Update user login streak (called on login)
 */
router.post('/user/login-streak/update', requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userId = req.user.id;
    const result = await storage.updateUserLoginStreak(userId);
    
    return res.json({
      success: true,
      loginStreak: result.loginStreak,
      newAwards: result.newAwards,
      message: result.newAwards.length > 0 
        ? `Congratulations! You've earned ${result.newAwards.length} new award(s)!`
        : 'Login streak updated',
    });
  } catch (error: any) {
    console.error('Error updating login streak:', error);
    return res.status(500).json({ message: 'Failed to update login streak' });
  }
});

export default router;