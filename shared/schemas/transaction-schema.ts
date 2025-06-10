import { pgTable, text, serial, integer, real, timestamp, json, createInsertSchema, z } from "./common-imports";
import { users } from "./user-schema";

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: real("amount").notNull(),
  type: text("type").notNull(), // credit, debit
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  paymentMethod: text("payment_method"),
  paymentId: text("payment_id"),
  virtFusionCreditId: text("virtfusion_credit_id"), // VirtFusion credit ID for tracking
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

// User Credits (Custom Credits System - separate from VirtFusion)
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  balance: real("balance").notNull().default(0), // Balance in USD
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow(),
});

export const insertUserCreditsSchema = createInsertSchema(userCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserCredits = z.infer<typeof insertUserCreditsSchema>;
export type UserCredits = typeof userCredits.$inferSelect;

// Credit Transactions (Audit trail for custom credit operations)
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: real("amount").notNull(), // Positive for credits, negative for debits
  type: text("type").notNull(), // 'purchase', 'admin_add', 'admin_remove', 'dns_plan_purchase', 'refund'
  description: text("description").notNull(),
  status: text("status").notNull().default("completed"), // 'pending', 'completed', 'failed'
  paymentMethod: text("paymentMethod"), // 'paypal', 'admin', etc.
  paymentId: text("paymentId"), // PayPal payment ID or admin reference
  adminUserId: integer("adminUserId").references(() => users.id, { onDelete: 'set null' }), // Admin who performed the action
  adminReason: text("adminReason"), // Reason provided by admin
  balanceBefore: real("balanceBefore").notNull(), // Balance before transaction
  balanceAfter: real("balanceAfter").notNull(), // Balance after transaction
  metadata: json("metadata").default({}), // Additional transaction data
  createdAt: timestamp("createdAt").defaultNow(),
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;