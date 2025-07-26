import { Router } from 'express';
import { CouponService } from '../services/coupon-service';
import { claimCouponSchema } from '../../shared/schema';
import { z } from 'zod';

const router = Router();
const couponService = new CouponService();

/**
 * Middleware to check if user is authenticated
 */
function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

/**
 * Claim a coupon
 * POST /api/coupons/claim
 */
router.post('/claim', isAuthenticated, async (req, res) => {
  try {
    const validatedData = claimCouponSchema.parse(req.body);
    const userId = req.user.id;
    
    const result = await couponService.claimCoupon(validatedData.code, userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        tokensReceived: result.tokensReceived,
        transactionId: result.transactionId
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid coupon code format', 
        details: error.errors 
      });
    }
    
    console.error('Error claiming coupon:', error);
    res.status(500).json({ 
      success: false,
      error: 'An error occurred while claiming the coupon' 
    });
  }
});

/**
 * Get user's coupon usage history
 * GET /api/coupons/history
 */
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await couponService.getUserCouponHistory(userId);
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching coupon history:', error);
    res.status(500).json({ error: 'Failed to fetch coupon history' });
  }
});

/**
 * Validate a coupon code (check if it exists and is valid)
 * POST /api/coupons/validate
 */
router.post('/validate', isAuthenticated, async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code || typeof code !== 'string') {
      return res.status(400).json({ 
        valid: false,
        error: 'Coupon code is required' 
      });
    }
    
    const coupon = await couponService.getCouponByCode(code);
    
    if (!coupon) {
      return res.json({ 
        valid: false,
        error: 'Invalid coupon code' 
      });
    }
    
    if (!coupon.isActive) {
      return res.json({ 
        valid: false,
        error: 'This coupon is no longer active' 
      });
    }
    
    // Check if user has already used this coupon
    const userId = req.user.id;
    const hasUsed = await couponService.hasUserUsedCoupon(userId, coupon.id);
    
    if (hasUsed) {
      return res.json({ 
        valid: false,
        error: 'You have already used this coupon' 
      });
    }
    
    // Check usage limits
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return res.json({ 
        valid: false,
        error: 'This coupon has reached its usage limit' 
      });
    }
    
    res.json({ 
      valid: true,
      coupon: {
        code: coupon.code,
        description: coupon.description,
        tokensAmount: coupon.tokensAmount,
        maxUses: coupon.maxUses,
        currentUses: coupon.currentUses
      }
    });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ 
      valid: false,
      error: 'An error occurred while validating the coupon' 
    });
  }
});

export default router;