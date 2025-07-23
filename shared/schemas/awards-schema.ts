import { pgTable, text, serial, integer, real, boolean, timestamp, createInsertSchema, z } from "./common-imports";
import { users } from "./user-schema";

// Award Settings - Admin configurable daily login rewards
export const awardSettings = pgTable("award_settings", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Daily Login Reward"
  description: text("description"),
  loginDaysRequired: integer("login_days_required").notNull().default(1), // Days user needs to login consecutively
  virtFusionTokens: real("virtfusion_tokens").notNull().default(0), // VirtFusion tokens to award
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Login Streaks - Track consecutive login days
export const userLoginStreaks = pgTable("user_login_streaks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer("current_streak").notNull().default(0), // Current consecutive login days
  longestStreak: integer("longest_streak").notNull().default(0), // Longest streak achieved
  lastLoginDate: timestamp("last_login_date"), // Last login date for streak calculation
  totalLoginDays: integer("total_login_days").notNull().default(0), // Total days logged in
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Awards - Track awarded rewards
export const userAwards = pgTable("user_awards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  awardSettingId: integer("award_setting_id").notNull().references(() => awardSettings.id, { onDelete: 'cascade' }),
  virtFusionTokens: real("virtfusion_tokens").notNull(), // Tokens awarded
  streakDay: integer("streak_day").notNull(), // Which streak day this award was for
  status: text("status").notNull().default("pending"), // pending, claimed, expired
  claimedAt: timestamp("claimed_at"),
  expiresAt: timestamp("expires_at"), // Optional expiration date
  createdAt: timestamp("created_at").defaultNow(),
});

// Coupons - General coupon system
export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // Coupon code
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull(), // percentage, fixed_amount, virtfusion_tokens
  value: real("value").notNull(), // Discount value or token amount
  minAmount: real("min_amount").default(0), // Minimum order amount
  maxUses: integer("max_uses"), // Maximum number of uses (null = unlimited)
  currentUses: integer("current_uses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  validFrom: timestamp("valid_from").defaultNow(),
  validUntil: timestamp("valid_until"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Coupon Usage - Track coupon usage by users
export const userCouponUsage = pgTable("user_coupon_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  couponId: integer("coupon_id").notNull().references(() => coupons.id, { onDelete: 'cascade' }),
  usedAt: timestamp("used_at").defaultNow(),
});

// Schema exports for validation
export const insertAwardSettingSchema = createInsertSchema(awardSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserLoginStreakSchema = createInsertSchema(userLoginStreaks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAwardSchema = createInsertSchema(userAwards).omit({
  id: true,
  createdAt: true,
});

export const insertCouponSchema = createInsertSchema(coupons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentUses: true,
});

export const insertUserCouponUsageSchema = createInsertSchema(userCouponUsage).omit({
  id: true,
  usedAt: true,
});

// Type exports
export type InsertAwardSetting = z.infer<typeof insertAwardSettingSchema>;
export type AwardSetting = typeof awardSettings.$inferSelect;

export type InsertUserLoginStreak = z.infer<typeof insertUserLoginStreakSchema>;
export type UserLoginStreak = typeof userLoginStreaks.$inferSelect;

export type InsertUserAward = z.infer<typeof insertUserAwardSchema>;
export type UserAward = typeof userAwards.$inferSelect;

export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;

export type InsertUserCouponUsage = z.infer<typeof insertUserCouponUsageSchema>;
export type UserCouponUsage = typeof userCouponUsage.$inferSelect;