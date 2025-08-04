import { pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z } from "./common-imports";
import { uuid } from "drizzle-orm/pg-core";
import { slaPlans } from "./sla-schema";

// Package Categories for organizing VirtFusion packages
export const packageCategories = pgTable("package_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  });

export const insertPackageCategorySchema = createInsertSchema(packageCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPackageCategory = z.infer<typeof insertPackageCategorySchema>;
export type PackageCategory = typeof packageCategories.$inferSelect;

// Package Pricing for VirtFusion packages
export const packagePricing = pgTable("package_pricing", {
  id: serial("id").primaryKey(),
  virtFusionPackageId: integer("virtfusion_package_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // In dollars (e.g., 250 = $2.50)
  billingCycle: text("billing_cycle").default('monthly'), // 'monthly' or 'hourly'
  displayOrder: integer("display_order").default(0),
  enabled: boolean("enabled").default(true).notNull(),
  categoryId: integer("category_id").references(() => packageCategories.id, { onDelete: 'set null' }), // Optional category assignment
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  slaPlanId: uuid("sla_plan_id").references(() => slaPlans.id, { onDelete: 'set null' }),
});

export const insertPackagePricingSchema = createInsertSchema(packagePricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPackagePricing = z.infer<typeof insertPackagePricingSchema>;
export type PackagePricing = typeof packagePricing.$inferSelect;