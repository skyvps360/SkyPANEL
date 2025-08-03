import { pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z } from "./common-imports";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  firstName: text("first_name"), // New field for internal CRM
  lastName: text("last_name"), // New field for internal CRM
  phone: text("phone"), // Phone number for internal CRM
  company: text("company"), // Company name for internal CRM
  address: text("address"), // Address for internal CRM
  role: text("role").notNull().default("client"),
  virtFusionId: integer("virtfusion_id"),
  isVerified: boolean("is_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  role: true,
  virtFusionId: true,
  isActive: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;