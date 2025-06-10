import { pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, z } from "./common-imports";
import { users } from "./user-schema";

// Unified Support Departments (for both tickets and chat)
export const supportDepartments = pgTable("support_departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  requiresVps: boolean("requires_vps").default(false), // If true, VPS info will be fetched for this department
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  color: text("color").default("#3b82f6"), // Brand color for the department
  icon: text("icon").default("MessageCircle"), // Lucide icon name
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSupportDepartmentSchema = createInsertSchema(supportDepartments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportDepartment = z.infer<typeof insertSupportDepartmentSchema>;
export type SupportDepartment = typeof supportDepartments.$inferSelect;

// Legacy Ticket Departments (kept for backward compatibility during migration)
export const ticketDepartments = pgTable("ticket_departments", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  isDefault: boolean("is_default").default(false),
  requiresVps: boolean("requires_vps").default(false), // If true, VPS info will be fetched for this department
  isActive: boolean("is_active").default(true),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketDepartmentSchema = createInsertSchema(ticketDepartments).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketDepartment = z.infer<typeof insertTicketDepartmentSchema>;
export type TicketDepartment = typeof ticketDepartments.$inferSelect;

// Support Tickets
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  departmentId: integer("department_id").references(() => supportDepartments.id, { onDelete: 'set null' }),
  legacyDepartmentId: integer("legacy_department_id").references(() => ticketDepartments.id, { onDelete: 'set null' }), // For migration rollback capability
  subject: text("subject").notNull(),
  status: text("status").notNull().default("open"), // open, in-progress, closed
  priority: text("priority").notNull().default("medium"), // low, medium, high
  vpsId: integer("vps_id"), // VirtFusion VPS ID, if the ticket is about a specific VPS
  vpsData: json("vps_data"), // Cached VPS data from VirtFusion
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  vpsData: true, // This will be populated by the server
});

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Ticket Messages
export const ticketMessages = pgTable("ticket_messages", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;

// Discord Ticket Threads
export const discordTicketThreads = pgTable("discord_ticket_threads", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => tickets.id, { onDelete: 'cascade' }).unique(),
  threadId: text("thread_id").notNull(),
  channelId: text("channel_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDiscordTicketThreadSchema = createInsertSchema(discordTicketThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDiscordTicketThread = z.infer<typeof insertDiscordTicketThreadSchema>;
export type DiscordTicketThread = typeof discordTicketThreads.$inferSelect;

// Support Department Admin Assignments (unified for both tickets and chat)
export const supportDepartmentAdmins = pgTable("support_department_admins", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => supportDepartments.id, { onDelete: 'cascade' }),
  adminId: integer("admin_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  canManage: boolean("can_manage").default(false), // Can manage department settings
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSupportDepartmentAdminSchema = createInsertSchema(supportDepartmentAdmins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportDepartmentAdmin = z.infer<typeof insertSupportDepartmentAdminSchema>;
export type SupportDepartmentAdmin = typeof supportDepartmentAdmins.$inferSelect;