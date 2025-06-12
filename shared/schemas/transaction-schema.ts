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

