import { db } from '../db';
import { coupons, couponUsage, users, transactions } from '../../shared/schema';
import { eq, and, desc, sql, ne } from 'drizzle-orm';
import { VirtFusionApi } from '../virtfusion-api';
import type {
  Coupon,
  CouponUsage,
  CreateCouponRequest,
  CouponWithUsage,
  CouponClaimResult,
  GenerateCouponCodeRequest
} from '../../shared/schema';

/**
 * Service class for managing coupon operations
 * Handles coupon creation, validation, claiming, and tracking
 */
export class CouponService {
  private virtFusionApi: VirtFusionApi;

  constructor() {
    this.virtFusionApi = new VirtFusionApi();
  }

  /**
   * Generate a random coupon code
   * @param options - Code generation options
   * @returns Generated coupon code
   */
  generateCouponCode(options: GenerateCouponCodeRequest = { length: 8 }): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const { length = 8, prefix = '' } = options;

    let result = prefix;
    const remainingLength = length - prefix.length;

    for (let i = 0; i < remainingLength; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return result;
  }

  /**
   * Create a new coupon
   * @param couponData - Coupon creation data
   * @param adminUserId - ID of the admin creating the coupon
   * @returns Created coupon
   */
  async createCoupon(couponData: CreateCouponRequest, adminUserId: number): Promise<Coupon> {
    try {
      // Check if coupon code already exists
      const existingCoupon = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, couponData.code))
        .limit(1);

      if (existingCoupon.length > 0) {
        throw new Error('Coupon code already exists');
      }

      // Create the coupon
      const [newCoupon] = await db
        .insert(coupons)
        .values({
          code: couponData.code,
          description: couponData.description,
          tokensAmount: couponData.tokensAmount,
          maxUses: couponData.maxUses,
          createdBy: adminUserId,
        })
        .returning();

      return newCoupon;
    } catch (error) {
      console.error('Error creating coupon:', error);
      throw error;
    }
  }

  /**
   * Get all coupons with usage statistics
   * @returns Array of coupons with usage data
   */
  async getAllCoupons(): Promise<CouponWithUsage[]> {
    try {
      const couponsWithUsage = await db
        .select({
          id: coupons.id,
          code: coupons.code,
          description: coupons.description,
          tokensAmount: coupons.tokensAmount,
          maxUses: coupons.maxUses,
          currentUses: coupons.currentUses,
          isActive: coupons.isActive,
          createdBy: coupons.createdBy,
          createdAt: coupons.createdAt,
          updatedAt: coupons.updatedAt,
          usageCount: sql<number>`COUNT(${couponUsage.id})`.as('usage_count'),
        })
        .from(coupons)
        .leftJoin(couponUsage, eq(coupons.id, couponUsage.couponId))
        .groupBy(coupons.id)
        .orderBy(desc(coupons.createdAt));

      return couponsWithUsage;
    } catch (error) {
      console.error('Error fetching coupons:', error);
      throw error;
    }
  }

  /**
   * Get coupon by code
   * @param code - Coupon code
   * @returns Coupon if found
   */
  async getCouponByCode(code: string): Promise<Coupon | null> {
    try {
      const [coupon] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, code))
        .limit(1);

      return coupon || null;
    } catch (error) {
      console.error('Error fetching coupon by code:', error);
      throw error;
    }
  }

  /**
   * Get coupon usage history for a specific coupon
   * @param couponId - Coupon ID
   * @returns Array of usage records
   */
  async getCouponUsageHistory(couponId: number) {
    try {
      return await db
        .select({
          id: couponUsage.id,
          userId: couponUsage.userId,
          username: users.username,
          email: users.email,
          tokensReceived: couponUsage.tokensReceived,
          virtfusionCreditId: couponUsage.virtfusionCreditId,
          transactionId: couponUsage.transactionId,
          usedAt: couponUsage.usedAt,
        })
        .from(couponUsage)
        .innerJoin(users, eq(couponUsage.userId, users.id))
        .where(eq(couponUsage.couponId, couponId))
        .orderBy(desc(couponUsage.usedAt));
    } catch (error) {
      console.error('Error fetching coupon usage history:', error);
      throw error;
    }
  }

  /**
   * Check if user has already used a specific coupon
   * @param userId - User ID
   * @param couponId - Coupon ID
   * @returns True if user has used the coupon
   */
  async hasUserUsedCoupon(userId: number, couponId: number): Promise<boolean> {
    try {
      const [usage] = await db
        .select()
        .from(couponUsage)
        .where(and(
          eq(couponUsage.userId, userId),
          eq(couponUsage.couponId, couponId)
        ))
        .limit(1);

      return !!usage;
    } catch (error) {
      console.error('Error checking coupon usage:', error);
      throw error;
    }
  }

  /**
   * Claim a coupon for a user
   * @param code - Coupon code
   * @param userId - User ID claiming the coupon
   * @returns Claim result
   */
  async claimCoupon(code: string, userId: number): Promise<CouponClaimResult> {
    try {
      // Get the coupon
      const coupon = await this.getCouponByCode(code);
      if (!coupon) {
        return {
          success: false,
          message: 'Invalid coupon code'
        };
      }

      // Check if coupon is active
      if (!coupon.isActive) {
        return {
          success: false,
          message: 'This coupon is no longer active'
        };
      }

      // Check if user has already used this coupon
      const hasUsed = await this.hasUserUsedCoupon(userId, coupon.id);
      if (hasUsed) {
        return {
          success: false,
          message: 'You have already used this coupon'
        };
      }

      // Check usage limits
      if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
        return {
          success: false,
          message: 'This coupon has reached its usage limit'
        };
      }

      // Get user for VirtFusion API
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      // Create transaction record first
      const [transaction] = await db
        .insert(transactions)
        .values({
          userId: userId,
          amount: coupon.tokensAmount,
          type: 'credit',
          description: `Coupon redeemed: ${coupon.code}`,
          status: 'pending',
          paymentMethod: 'coupon',
        })
        .returning();

      try {
        // Add credits to VirtFusion account
        const virtFusionResult = await this.virtFusionApi.addCreditToUser(userId, {
          tokens: coupon.tokensAmount,
          reference: `Coupon: ${coupon.code}`,
          reference_2: `Transaction ID: ${transaction.id}`
        });

        const virtfusionCreditId = virtFusionResult?.data?.id;

        // Record coupon usage
        const [usage] = await db
          .insert(couponUsage)
          .values({
            couponId: coupon.id,
            userId: userId,
            tokensReceived: coupon.tokensAmount,
            virtfusionCreditId: virtfusionCreditId ? String(virtfusionCreditId) : null,
            transactionId: transaction.id,
          })
          .returning();

        // Update coupon usage count
        await db
          .update(coupons)
          .set({
            currentUses: sql`${coupons.currentUses} + 1`,
            updatedAt: new Date()
          })
          .where(eq(coupons.id, coupon.id));

        // Update transaction status
        await db
          .update(transactions)
          .set({
            status: 'completed',
            virtFusionCreditId: virtfusionCreditId ? String(virtfusionCreditId) : null,
            description: virtfusionCreditId
              ? `Coupon redeemed: ${coupon.code} (Credit ID: ${virtfusionCreditId})`
              : `Coupon redeemed: ${coupon.code}`
          })
          .where(eq(transactions.id, transaction.id));

        return {
          success: true,
          message: `Successfully redeemed coupon! ${coupon.tokensAmount} tokens added to your account.`,
          tokensReceived: coupon.tokensAmount,
          virtfusionCreditId: virtfusionCreditId ? String(virtfusionCreditId) : undefined,
          transactionId: transaction.id
        };

      } catch (virtFusionError: any) {
        console.error('VirtFusion API error during coupon claim:', virtFusionError);

        // Update transaction to failed status
        await db
          .update(transactions)
          .set({
            status: 'failed',
            description: `Coupon redemption failed: ${coupon.code} (${virtFusionError.message})`
          })
          .where(eq(transactions.id, transaction.id));

        return {
          success: false,
          message: 'Failed to add tokens to your account. Please try again later.'
        };
      }

    } catch (error) {
      console.error('Error claiming coupon:', error);
      return {
        success: false,
        message: 'An error occurred while claiming the coupon'
      };
    }
  }

  /**
   * Update a coupon
   * @param couponId - Coupon ID
   * @param updateData - Data to update
   * @returns Updated coupon
   */
  async updateCoupon(couponId: number, updateData: Partial<CreateCouponRequest>): Promise<Coupon | null> {
    try {
      // Check if coupon code already exists (if code is being updated)
      if (updateData.code) {
        const existingCoupon = await db
          .select()
          .from(coupons)
          .where(and(
            eq(coupons.code, updateData.code),
            ne(coupons.id, couponId)
          ))
          .limit(1);

        if (existingCoupon.length > 0) {
          throw new Error('Coupon code already exists');
        }
      }

      const [updatedCoupon] = await db
        .update(coupons)
        .set({
          ...updateData,
          updatedAt: new Date()
        })
        .where(eq(coupons.id, couponId))
        .returning();

      return updatedCoupon || null;
    } catch (error) {
      console.error('Error updating coupon:', error);
      throw error;
    }
  }

  /**
   * Update coupon status (activate/deactivate)
   * @param couponId - Coupon ID
   * @param isActive - New active status
   * @returns Updated coupon
   */
  async updateCouponStatus(couponId: number, isActive: boolean): Promise<Coupon | null> {
    try {
      const [updatedCoupon] = await db
        .update(coupons)
        .set({
          isActive,
          updatedAt: new Date()
        })
        .where(eq(coupons.id, couponId))
        .returning();

      return updatedCoupon || null;
    } catch (error) {
      console.error('Error updating coupon status:', error);
      throw error;
    }
  }

  /**
   * Delete a coupon
   * @param couponId - Coupon ID
   * @returns True if deleted successfully
   */
  async deleteCoupon(couponId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(coupons)
        .where(eq(coupons.id, couponId));

      return true;
    } catch (error) {
      console.error('Error deleting coupon:', error);
      throw error;
    }
  }

  /**
   * Get user's coupon usage history
   * @param userId - User ID
   * @returns Array of user's coupon usage
   */
  async getUserCouponHistory(userId: number) {
    try {
      return await db
        .select({
          id: couponUsage.id,
          couponCode: coupons.code,
          couponDescription: coupons.description,
          tokensReceived: couponUsage.tokensReceived,
          virtfusionCreditId: couponUsage.virtfusionCreditId,
          transactionId: couponUsage.transactionId,
          usedAt: couponUsage.usedAt,
        })
        .from(couponUsage)
        .innerJoin(coupons, eq(couponUsage.couponId, coupons.id))
        .where(eq(couponUsage.userId, userId))
        .orderBy(desc(couponUsage.usedAt));
    } catch (error) {
      console.error('Error fetching user coupon history:', error);
      throw error;
    }
  }
}