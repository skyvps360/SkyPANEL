import { pgTable, serial, integer, text, decimal, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// VirtFusion Hourly Billing Configuration Table
export const virtfusionHourlyBilling = pgTable('virtfusion_hourly_billing', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(), 
  serverId: integer('server_id').notNull(),
  virtfusionServerId: integer('virtfusion_server_id').notNull(),
  serverUuid: text('server_uuid'), // VirtFusion server UUID for accurate identification
  packageId: integer('package_id').notNull(),
  packageName: text('package_name').notNull(),
  monthlyPrice: decimal('monthly_price', { precision: 10, scale: 4 }).notNull(),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 6 }).notNull(),
  hoursInMonth: integer('hours_in_month').notNull().default(730),
  billingEnabled: boolean('billing_enabled').notNull().default(true),
  serverCreatedAt: timestamp('server_created_at'), // VirtFusion server creation timestamp for accurate hourly billing
  lastBilledAt: timestamp('last_billed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// VirtFusion Hourly Transactions Table
export const virtfusionHourlyTransactions = pgTable('virtfusion_hourly_transactions', {
  id: serial('id').primaryKey(),
  billingId: integer('billing_id').notNull().references(() => virtfusionHourlyBilling.id, { onDelete: 'cascade' }),
  userId: integer('user_id').notNull(),
  serverId: integer('server_id').notNull(),
  transactionId: integer('transaction_id'),
  hoursBilled: decimal('hours_billed', { precision: 4, scale: 2 }).notNull().default('1.0'),
  amountCharged: decimal('amount_charged', { precision: 10, scale: 4 }).notNull(),
  billingPeriodStart: timestamp('billing_period_start').notNull(),
  billingPeriodEnd: timestamp('billing_period_end').notNull(),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at').notNull().defaultNow()
});

// VirtFusion Cron Settings Table
export const virtfusionCronSettings = pgTable('virtfusion_cron_settings', {
  id: serial('id').primaryKey(),
  enabled: boolean('enabled').notNull().default(false),
  hoursPerMonth: integer('hours_per_month').notNull().default(730),
  billingOnFirstEnabled: boolean('billing_on_first_enabled').notNull().default(true),
  hourlyBillingEnabled: boolean('hourly_billing_enabled').notNull().default(true),
  lastMonthlyBilling: timestamp('last_monthly_billing'),
  lastHourlyBilling: timestamp('last_hourly_billing'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Zod schemas for validation
export const insertVirtfusionHourlyBillingSchema = createInsertSchema(virtfusionHourlyBilling);
export const selectVirtfusionHourlyBillingSchema = createSelectSchema(virtfusionHourlyBilling);

export const insertVirtfusionHourlyTransactionSchema = createInsertSchema(virtfusionHourlyTransactions);
export const selectVirtfusionHourlyTransactionSchema = createSelectSchema(virtfusionHourlyTransactions);

export const insertVirtfusionCronSettingsSchema = createInsertSchema(virtfusionCronSettings);
export const selectVirtfusionCronSettingsSchema = createSelectSchema(virtfusionCronSettings);

// Update schema for cron settings
export const updateVirtfusionCronSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  hoursPerMonth: z.number().min(1).max(8760).optional(),
  billingOnFirstEnabled: z.boolean().optional(),
  hourlyBillingEnabled: z.boolean().optional()
});

export type VirtfusionHourlyBilling = typeof virtfusionHourlyBilling.$inferSelect;
export type NewVirtfusionHourlyBilling = typeof virtfusionHourlyBilling.$inferInsert;

export type VirtfusionHourlyTransaction = typeof virtfusionHourlyTransactions.$inferSelect;
export type NewVirtfusionHourlyTransaction = typeof virtfusionHourlyTransactions.$inferInsert;

export type VirtfusionCronSettings = typeof virtfusionCronSettings.$inferSelect;
export type NewVirtfusionCronSettings = typeof virtfusionCronSettings.$inferInsert;
