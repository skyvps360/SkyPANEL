import { pgTable, uuid, integer, text, timestamp, decimal, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Server uptime logs table
export const serverUptimeLogs = pgTable('server_uptime_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  serverId: integer('server_id').notNull(),
  virtfusionServerId: integer('virtfusion_server_id').notNull(),
  userId: integer('user_id').notNull(),
  status: text('status').notNull().default('running'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull().defaultNow(),
  endTime: timestamp('end_time', { withTimezone: true }),
  totalHours: decimal('total_hours', { precision: 10, scale: 2 }).default('0'),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 4 }).notNull().default('0'),
  totalCost: decimal('total_cost', { precision: 10, scale: 4 }).default('0'),
  billingCycle: text('billing_cycle').notNull().default('hourly'),
  isBilled: boolean('is_billed').notNull().default(false),
  billingTransactionId: uuid('billing_transaction_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Server hourly billing settings table
export const serverHourlyBillingSettings = pgTable('server_hourly_billing_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  hoursPerMonth: integer('hours_per_month').notNull().default(730),
  cronEnabled: boolean('cron_enabled').notNull().default(true),
  cronSchedule: text('cron_schedule').notNull().default('0 * * * *'),
  lastCronRun: timestamp('last_cron_run', { withTimezone: true }),
  nextCronRun: timestamp('next_cron_run', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Server package hourly rates table
export const serverPackageHourlyRates = pgTable('server_package_hourly_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageId: integer('package_id').notNull(),
  packageName: text('package_name').notNull(),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 4 }).notNull(),
  monthlyRate: decimal('monthly_rate', { precision: 10, scale: 4 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Zod schemas for type safety
export const insertServerUptimeLogSchema = createInsertSchema(serverUptimeLogs);
export const selectServerUptimeLogSchema = createSelectSchema(serverUptimeLogs);

export const insertServerHourlyBillingSettingsSchema = createInsertSchema(serverHourlyBillingSettings);
export const selectServerHourlyBillingSettingsSchema = createSelectSchema(serverHourlyBillingSettings);

export const insertServerPackageHourlyRatesSchema = createInsertSchema(serverPackageHourlyRates);
export const selectServerPackageHourlyRatesSchema = createSelectSchema(serverPackageHourlyRates);

// TypeScript types
export type ServerUptimeLog = z.infer<typeof selectServerUptimeLogSchema>;
export type InsertServerUptimeLog = z.infer<typeof insertServerUptimeLogSchema>;

export type ServerHourlyBillingSettings = z.infer<typeof selectServerHourlyBillingSettingsSchema>;
export type InsertServerHourlyBillingSettings = z.infer<typeof insertServerHourlyBillingSettingsSchema>;

export type ServerPackageHourlyRates = z.infer<typeof selectServerPackageHourlyRatesSchema>;
export type InsertServerPackageHourlyRates = z.infer<typeof insertServerPackageHourlyRatesSchema>; 