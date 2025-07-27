import { pgTable, text, serial, integer, real, timestamp, boolean, createInsertSchema, z, unique } from "./common-imports";
import { users } from "./user-schema";
import { transactions } from "./transaction-schema";

/**
 * Coupons table schema
 * Stores coupon codes that can be redeemed for VirtFusion tokens
 */
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Unique coupon code
  description: text("description"), // Optional description for the coupon
  tokensAmount: real("token_amount").notNull().default(0), // Amount of tokens to give when redeemed
  maxUses: integer("max_uses").default(0), // Maximum number of uses (0 = unlimited)
  currentUses: integer("current_uses").default(0), // Current number of times used
  isActive: boolean("is_active").default(true), // Whether the coupon is active
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: 'cascade' }), // Admin who created it
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

/**
 * Coupon usage tracking table
 * Records each time a coupon is used by a user
 */
export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokensReceived: real("tokens_received").notNull(), // Actual tokens received (for tracking)
  virtfusionCreditId: text("virtfusion_credit_id"), // VirtFusion credit ID from API
  transactionId: integer("transaction_id").references(() => transactions.id, { onDelete: 'set null' }),
  usedAt: timestamp("used_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate coupon usage by the same user
  uniqueUserCoupon: unique().on(table.userId, table.couponId),
}));

// Zod schemas for validation
export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  currentUses: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdBy: true,
  createdAt: true,
}).partial();

export const insertCouponUsageSchema = createInsertSchema(couponUsage).omit({
  id: true,
  usedAt: true,
});

// Coupon claim request schema
export const claimCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50, "Coupon code too long"),
});

// Admin coupon creation schema
export const createCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").max(50, "Coupon code too long"),
  description: z.string().optional(),
  tokensAmount: z.number().min(0.01, "Tokens amount must be greater than 0"),
  maxUses: z.number().min(0, "Max uses cannot be negative").default(0),
});

// Generate random coupon code schema
export const generateCouponCodeSchema = z.object({
  length: z.number().min(6).max(20).default(8),
  prefix: z.string().max(10).optional(),
});

// TypeScript types
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type UpdateCoupon = z.infer<typeof updateCouponSchema>;
export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = z.infer<typeof insertCouponUsageSchema>;
export type ClaimCouponRequest = z.infer<typeof claimCouponSchema>;
export type CreateCouponRequest = z.infer<typeof createCouponSchema>;
export type GenerateCouponCodeRequest = z.infer<typeof generateCouponCodeSchema>;

// Extended types for API responses
export interface CouponWithUsage extends Coupon {
  usageCount?: number;
  recentUsages?: Array<{
    id: number;
    userId: number;
    username: string;
    tokensReceived: number;
    usedAt: Date;
  }>;
}

export interface CouponClaimResult {
  success: boolean;
  message: string;
  tokensReceived?: number;
  virtfusionCreditId?: string;
  transactionId?: number;
}