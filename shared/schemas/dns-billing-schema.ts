import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// DNS billing settings table
export const dnsBillingSettings = pgTable('dns_billing_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  cronEnabled: boolean('cron_enabled').notNull().default(false),
  cronSchedule: text('cron_schedule').notNull().default('0 2 1 * *'), // 2 AM on the 1st of each month
  lastCronRun: timestamp('last_cron_run', { withTimezone: true }),
  nextCronRun: timestamp('next_cron_run', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Zod schemas for type safety
export const insertDnsBillingSettingsSchema = createInsertSchema(dnsBillingSettings);
export const selectDnsBillingSettingsSchema = createSelectSchema(dnsBillingSettings);

// TypeScript types
export type DnsBillingSettings = z.infer<typeof selectDnsBillingSettingsSchema>;
export type InsertDnsBillingSettings = z.infer<typeof insertDnsBillingSettingsSchema>;
