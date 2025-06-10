import { pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z } from "./common-imports";

// Plan Features
export const planFeatures = pgTable("plan_features", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // e.g., "SSD Storage", "Dedicated vCPU"
  icon: text("icon").notNull(), // Lucide icon name
  description: text("description").notNull(), // Feature description
  category: text("category").default("general"), // For grouping features
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlanFeatureSchema = createInsertSchema(planFeatures).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlanFeature = z.infer<typeof insertPlanFeatureSchema>;
export type PlanFeature = typeof planFeatures.$inferSelect;