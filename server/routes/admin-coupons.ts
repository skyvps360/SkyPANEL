import { Router } from 'express';
import { CouponService } from '../services/coupon-service';
import { createCouponSchema, claimCouponSchema, generateCouponCodeSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();
const couponService = new CouponService();

/**
 * Middleware to check if user is admin
 */
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

/**
 * Generate a random coupon code
 * POST /api/admin/coupons/generate-code
 */
router.post('/generate-code', isAdmin, async (req, res) => {
  try {
    const validatedData = generateCouponCodeSchema.parse(req.body);
    const code = couponService.generateCouponCode(validatedData);

    res.json({ code });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }
    console.error('Error generating coupon code:', error);
    res.status(500).json({ error: 'Failed to generate coupon code' });
  }
});

/**
 * Create a new coupon
 * POST /api/admin/coupons
 */
router.post('/', isAdmin, async (req, res) => {
  try {
    const validatedData = createCouponSchema.parse(req.body);
    const adminUserId = req.user.id;

    const coupon = await couponService.createCoupon(validatedData, adminUserId);

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    if (error instanceof Error && error.message === 'Coupon code already exists') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }

    console.error('Error creating coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * Get all coupons with usage statistics
 * GET /api/admin/coupons
 */
router.get('/', isAdmin, async (req, res) => {
  try {
    const coupons = await couponService.getAllCoupons();
    res.json(coupons);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

/**
 * Get coupon usage history
 * GET /api/admin/coupons/:id/usage
 */
router.get('/:id/usage', isAdmin, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);

    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const usage = await couponService.getCouponUsageHistory(couponId);
    res.json(usage);
  } catch (error) {
    console.error('Error fetching coupon usage:', error);
    res.status(500).json({ error: 'Failed to fetch coupon usage' });
  }
});

/**
 * Update a coupon
 * PUT /api/admin/coupons/:id
 */
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);

    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const validatedData = createCouponSchema.parse(req.body);
    const updatedCoupon = await couponService.updateCoupon(couponId, validatedData);

    if (!updatedCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({
      message: 'Coupon updated successfully',
      coupon: updatedCoupon
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid input', details: error.errors });
    }

    if (error instanceof Error && error.message === 'Coupon code already exists') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }

    console.error('Error updating coupon:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

/**
 * Update coupon status (activate/deactivate)
 * PATCH /api/admin/coupons/:id/status
 */
router.patch('/:id/status', isAdmin, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);
    const { isActive } = req.body;

    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const updatedCoupon = await couponService.updateCouponStatus(couponId, isActive);

    if (!updatedCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({
      message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
      coupon: updatedCoupon
    });
  } catch (error) {
    console.error('Error updating coupon status:', error);
    res.status(500).json({ error: 'Failed to update coupon status' });
  }
});

/**
 * Delete a coupon
 * DELETE /api/admin/coupons/:id
 */
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const couponId = parseInt(req.params.id);

    if (isNaN(couponId)) {
      return res.status(400).json({ error: 'Invalid coupon ID' });
    }

    const success = await couponService.deleteCoupon(couponId);

    if (!success) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    console.error('Error deleting coupon:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

/**
 * Get coupon by code (for validation)
 * GET /api/admin/coupons/code/:code
 */
router.get('/code/:code', isAdmin, async (req, res) => {
  try {
    const { code } = req.params;

    if (!code) {
      return res.status(400).json({ error: 'Coupon code is required' });
    }

    const coupon = await couponService.getCouponByCode(code);

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    res.json({ coupon });
  } catch (error) {
    console.error('Error fetching coupon by code:', error);
    res.status(500).json({ error: 'Failed to fetch coupon' });
  }
});

export default router;