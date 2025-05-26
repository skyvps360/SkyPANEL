import { pgTable, text, serial, integer, boolean, timestamp, json, real, uniqueIndex, foreignKey, doublePrecision, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { and, desc, eq, not } from "drizzle-orm";

// Server Power Status
export const serverPowerStatus = pgTable("server_power_status", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().unique(),
  powerState: text("power_state").default("UNKNOWN"),
  lastQueueId: integer("last_queue_id"),
  lastAction: text("last_action"),
  lastActionTime: timestamp("last_action_time").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServerPowerStatusSchema = createInsertSchema(serverPowerStatus, {
  id: z.number().optional(),
  updatedAt: z.date().optional(),
});
export type InsertServerPowerStatus = z.infer<typeof insertServerPowerStatusSchema>;
export type ServerPowerStatus = typeof serverPowerStatus.$inferSelect;

// Server Action Logs
export const serverLogs = pgTable("server_logs", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // power_on, power_off, restart, reset_password, vnc_connect, vnc_disconnect, config_change, etc.
  actionType: text("action_type").notNull(), // power, security, network, storage, vnc, config
  status: text("status").notNull().default("success"), // success, failed, pending
  details: text("details"), // Additional details about the action
  metadata: json("metadata").default({}), // Additional structured data (IP addresses, queue IDs, etc.)
  userAgent: text("user_agent"), // Browser/client information
  ipAddress: text("ip_address"), // IP address of the user performing the action
  queueId: integer("queue_id"), // VirtFusion queue ID if applicable
  errorMessage: text("error_message"), // Error message if action failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServerLogSchema = createInsertSchema(serverLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogs.$inferSelect;

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("client"),
  credits: real("credits").notNull().default(0),
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
  credits: true,
  role: true,
  virtFusionId: true,
  isActive: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Sessions
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
});

export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;

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
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;



// Ticket Departments
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
  departmentId: integer("department_id").references(() => ticketDepartments.id, { onDelete: 'set null' }),
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

export const insertTicketMessageSchema = createInsertSchema(ticketMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertTicketMessage = z.infer<typeof insertTicketMessageSchema>;
export type TicketMessage = typeof ticketMessages.$inferSelect;



// Settings
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'info', 'warning', 'error', 'success'
  read: boolean("read").notNull().default(false),
  link: text("link"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Email Verification Tokens
export const emailVerificationTokens = pgTable("email_verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  usedAt: timestamp("used_at"),
});

export const insertEmailVerificationTokenSchema = createInsertSchema(emailVerificationTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertEmailVerificationToken = z.infer<typeof insertEmailVerificationTokenSchema>;
export type EmailVerificationToken = typeof emailVerificationTokens.$inferSelect;

// Package Pricing for VirtFusion packages
export const packagePricing = pgTable("package_pricing", {
  id: serial("id").primaryKey(),
  virtFusionPackageId: integer("virtfusion_package_id").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // In dollars (e.g., 250 = $2.50)
  displayOrder: integer("display_order").default(0),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPackagePricingSchema = createInsertSchema(packagePricing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPackagePricing = z.infer<typeof insertPackagePricingSchema>;
export type PackagePricing = typeof packagePricing.$inferSelect;

// Email Logs
export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name"),
  subject: text("subject").notNull(),
  type: text("type").notNull(), // password_reset, email_verification, maintenance_notification, etc.
  status: text("status").notNull().default("sent"), // sent, failed, etc.
  messageId: text("message_id"), // The ID returned by the email provider
  errorMessage: text("error_message"), // If the email failed, this will contain the error message
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }), // Optional, if the email was sent to a user
  metadata: json("metadata").default({}), // Additional data about the email, like tokens, message, etc.
});

export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;

// API Keys
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text("name").notNull(), // A user-friendly name for the key
  key: text("key").notNull().unique(), // The actual API key
  prefix: text("prefix").notNull(), // A prefix for the key (visible to users)
  scopes: text("scopes").array().notNull().default([]), // Array of allowed scopes
  lastUsed: timestamp("last_used"), // When the key was last used
  expiresAt: timestamp("expires_at"), // When the key expires (null for never)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isActive: boolean("is_active").default(true).notNull(), // Whether the key is active
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  lastUsed: true,
});

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Documentation Articles
// Documentation Categories
export const docCategories = pgTable("doc_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // Unique identifier for URL
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertDocCategorySchema = createInsertSchema(docCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDocCategory = z.infer<typeof insertDocCategorySchema>;
export type DocCategory = typeof docCategories.$inferSelect;

// Documentation pages
export const docs = pgTable("docs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(), // Unique identifier for URL
  content: text("content").notNull(),
  category: text("category"),
  categoryId: integer("category_id").references(() => docCategories.id, { onDelete: 'set null' }),
  published: boolean("published").default(true).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertDocSchema = createInsertSchema(docs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDoc = z.infer<typeof insertDocSchema>;
export type Doc = typeof docs.$inferSelect;

// Blog Categories
export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // Unique identifier for URL
  description: text("description"),
  displayOrder: integer("display_order").default(0),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertBlogCategorySchema = createInsertSchema(blogCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;

// Blog Posts
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(), // Unique identifier for URL
  snippet: text("snippet").notNull(), // Short description/preview of the blog post
  content: text("content").notNull(),
  author: text("author"),
  featuredImageUrl: text("featured_image_url"),
  excerpt: text("excerpt"),
  tags: text("tags"),
  date: timestamp("date").defaultNow().notNull(), // Publication date
  published: boolean("published").default(true).notNull(),
  displayOrder: integer("display_order").default(0),
  categoryId: integer("category_id").references(() => blogCategories.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

// Datacenter Locations
export const datacenterLocations = pgTable("datacenter_locations", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g., TEB-2, LON-1, NYC-1
  name: text("name").notNull(), // e.g., Istanbul, London, New York
  regionCode: text("region_code").notNull(), // e.g., EU, NA, AP for Europe, North America, Asia-Pacific
  regionName: text("region_name").notNull(), // e.g., Europe, North America, Asia-Pacific
  country: text("country").notNull(), // e.g., Turkey, UK, USA
  city: text("city").notNull(), // e.g., Istanbul, London, New York
  latitude: doublePrecision("latitude").notNull(), // For map placement
  longitude: doublePrecision("longitude").notNull(), // For map placement
  address: text("address"), // Physical address of datacenter
  provider: text("provider"), // e.g., Equinix, Digital Realty
  tier: text("tier"), // e.g., Tier 3, Tier 4
  isActive: boolean("is_active").default(true).notNull(), // Legacy field - keep for backward compatibility
  status: text("status").default("active"), // 'active', 'coming_soon', 'inactive'
  displayOrder: integer("display_order").default(0), // For controlling display order
  uptime: doublePrecision("uptime").default(99.9), // Uptime percentage
  networkSpeedMbps: integer("network_speed_mbps").default(10000), // Network speed in Mbps
  features: json("features").default([]), // Array of features like "SSD Storage", "10 Gbps Network"
  description: text("description"), // Detailed description of the datacenter
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDatacenterLocationSchema = createInsertSchema(datacenterLocations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDatacenterLocation = z.infer<typeof insertDatacenterLocationSchema>;
export type DatacenterLocation = typeof datacenterLocations.$inferSelect;

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

// FAQ Items
export const faqItems = pgTable("faq_items", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category").default("general"), // For grouping FAQs
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFaqItemSchema = createInsertSchema(faqItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFaqItem = z.infer<typeof insertFaqItemSchema>;
export type FaqItem = typeof faqItems.$inferSelect;

// Legal Content
export const legalContent = pgTable("legal_content", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().unique(), // 'tos', 'privacy', etc.
  title: text("title").notNull(),
  content: text("content").notNull(),
  version: text("version").notNull(),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertLegalContentSchema = createInsertSchema(legalContent).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLegalContent = z.infer<typeof insertLegalContentSchema>;
export type LegalContent = typeof legalContent.$inferSelect;

// Team Members
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  discordAvatarUrl: text("discord_avatar_url"),
  role: text("role").notNull(), // e.g., "CEO", "Developer", "Support Manager"
  aboutMe: text("about_me"), // Admin-editable description
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
