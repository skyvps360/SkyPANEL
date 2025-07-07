import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Public Chat Department Routes (for clients)
 */

// Get active chat departments for client selection
// After migration, this returns unified support departments instead of legacy chat departments
router.get('/departments', requireAuth, async (req, res) => {
  try {
    const departments = await storage.getActiveSupportDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error getting chat departments:', error);
    res.status(500).json({ error: 'Failed to get chat departments' });
  }
});

/**
 * Admin Chat Department Management Routes
 */

// Get all departments for admin (using unified support departments)
router.get('/admin/departments', requireAdmin, async (req, res) => {
  try {
    const departments = await storage.getSupportDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error getting support departments:', error);
    res.status(500).json({ error: 'Failed to get departments' });
  }
});

// Legacy chat department admin CRUD routes removed - use unified department system at /admin/settings

export default router;
