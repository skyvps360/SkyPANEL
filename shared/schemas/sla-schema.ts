import { pgTable, uuid, varchar, text, timestamp, boolean, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const slaPlans = pgTable("sla_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 256 }).notNull().unique(),
  description: text("description"),
  response_time_hours: integer("response_time_hours").notNull(),
  resolution_time_hours: integer("resolution_time_hours").notNull(),
  uptime_guarantee_percentage: real("uptime_guarantee_percentage").notNull(),
  is_active: boolean("is_active").default(true).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSlaPlanSchema = createInsertSchema(slaPlans);
export const selectSlaPlanSchema = createSelectSchema(slaPlans);

export type SlaPlan = z.infer<typeof selectSlaPlanSchema>;
export type NewSlaPlan = z.infer<typeof insertSlaPlanSchema>;
