import {pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";
import {supportDepartments, tickets} from "./support-schema";

// Chat Departments
export const chatDepartments = pgTable("chat_departments", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    isDefault: boolean("is_default").default(false),
    isActive: boolean("is_active").default(true),
    displayOrder: integer("display_order").default(0),
    color: text("color").default("#3b82f6"), // Brand color for the department
    icon: text("icon").default("MessageCircle"), // Lucide icon name
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatDepartmentSchema = createInsertSchema(chatDepartments).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertChatDepartment = z.infer<typeof insertChatDepartmentSchema>;
export type ChatDepartment = typeof chatDepartments.$inferSelect;

// Legacy Chat Department Admin Assignments (kept for backward compatibility during migration)
export const chatDepartmentAdmins = pgTable("chat_department_admins", {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id").notNull().references(() => chatDepartments.id, {onDelete: 'cascade'}),
    adminId: integer("admin_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    canManage: boolean("can_manage").default(false), // Can manage department settings
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatDepartmentAdminSchema = createInsertSchema(chatDepartmentAdmins).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertChatDepartmentAdmin = z.infer<typeof insertChatDepartmentAdminSchema>;
export type ChatDepartmentAdmin = typeof chatDepartmentAdmins.$inferSelect;

// Live Chat Sessions
export const chatSessions = pgTable("chat_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    assignedAdminId: integer("assigned_admin_id").references(() => users.id, {onDelete: 'set null'}),
    departmentId: integer("department_id").references(() => supportDepartments.id, {onDelete: 'set null'}),
    legacyChatDepartmentId: integer("legacy_chat_department_id").references(() => chatDepartments.id, {onDelete: 'set null'}), // For migration rollback capability
    status: text("status").notNull().default("waiting"), // waiting, active, closed, converted_to_ticket
    priority: text("priority").notNull().default("normal"), // low, normal, high
    subject: text("subject"), // Optional subject for the chat
    department: text("department").default("general"), // Legacy field - will be replaced by departmentId
    convertedToTicketId: integer("converted_to_ticket_id").references(() => tickets.id, {onDelete: 'set null'}), // Track ticket conversion
    convertedAt: timestamp("converted_at"), // When the chat was converted to a ticket
    convertedByAdminId: integer("converted_by_admin_id").references(() => users.id, {onDelete: 'set null'}), // Admin who performed the conversion
    metadata: json("metadata").default({}), // Additional data like browser info, page URL, etc.
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    startedAt: true,
    lastActivityAt: true,
});

export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type ChatSession = typeof chatSessions.$inferSelect;

// Live Chat Messages
export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => chatSessions.id, {onDelete: 'cascade'}),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    message: text("message").notNull(),
    messageType: text("message_type").notNull().default("text"), // text, system, file, image
    isFromAdmin: boolean("is_from_admin").notNull().default(false),
    readAt: timestamp("read_at"), // When the message was read by the recipient
    metadata: json("metadata").default({}), // Additional data like file info, system message details
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
    id: true,
    createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Admin Chat Status
export const adminChatStatus = pgTable("admin_chat_status", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}).unique(),
    status: text("status").notNull().default("offline"), // online, offline
    statusMessage: text("status_message"), // Custom status message
    maxConcurrentChats: integer("max_concurrent_chats").default(5),
    autoAssign: boolean("auto_assign").default(true), // Whether to auto-assign new chats to this admin
    lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminChatStatusSchema = createInsertSchema(adminChatStatus).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastSeenAt: true,
});

export type InsertAdminChatStatus = z.infer<typeof insertAdminChatStatusSchema>;
export type AdminChatStatus = typeof adminChatStatus.$inferSelect;

// Chat Typing Indicators
export const chatTypingIndicators = pgTable("chat_typing_indicators", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").notNull().references(() => chatSessions.id, {onDelete: 'cascade'}),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    isTyping: boolean("is_typing").notNull().default(false),
    lastTypingAt: timestamp("last_typing_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChatTypingIndicatorSchema = createInsertSchema(chatTypingIndicators).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastTypingAt: true,
});

export type InsertChatTypingIndicator = z.infer<typeof insertChatTypingIndicatorSchema>;
export type ChatTypingIndicator = typeof chatTypingIndicators.$inferSelect;