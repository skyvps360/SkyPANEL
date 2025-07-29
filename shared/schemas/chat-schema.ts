/**
 * @fileoverview Chat system schema definitions
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, z } from "./common-imports";

// Chat Departments - for organizing chat support
export const chatDepartments = pgTable("chat_departments", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    isDefault: boolean("is_default").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    displayOrder: integer("display_order").default(0).notNull(),
    color: text("color").default('#3b82f6').notNull(),
    icon: text("icon").default('MessageCircle').notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Department Admins - linking admins to departments
export const chatDepartmentAdmins = pgTable("chat_department_admins", {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id").references(() => chatDepartments.id).notNull(),
    adminId: integer("admin_id").references(() => import("./user-schema").users.id).notNull(),
    canManage: boolean("can_manage").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Sessions - individual chat conversations
export const chatSessions = pgTable("chat_sessions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => import("./user-schema").users.id).notNull(),
    assignedAdminId: integer("assigned_admin_id").references(() => import("./user-schema").users.id),
    departmentId: integer("department_id").references(() => chatDepartments.id),
    status: text("status").notNull().default("waiting"), // waiting, active, ended, converted_to_ticket
    priority: text("priority").notNull().default("normal"), // low, normal, high, urgent
    subject: text("subject"),
    department: text("department").default("general"),
    convertedToTicketId: integer("converted_to_ticket_id"),
    convertedAt: timestamp("converted_at"),
    convertedByAdminId: integer("converted_by_admin_id").references(() => import("./user-schema").users.id),
    metadata: json("metadata").default({}),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    endedAt: timestamp("ended_at"),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Chat Messages - individual messages in chat sessions
export const chatMessages = pgTable("chat_messages", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
    userId: integer("user_id").references(() => import("./user-schema").users.id).notNull(),
    message: text("message").notNull(),
    messageType: text("message_type").default("text").notNull(),
    isFromAdmin: boolean("is_from_admin").default(false).notNull(),
    readAt: timestamp("read_at"),
    metadata: json("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin Chat Status - tracking which admins are available for chat
export const adminChatStatus = pgTable("admin_chat_status", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => import("./user-schema").users.id).notNull(),
    isOnline: boolean("is_online").default(false).notNull(),
    isAvailable: boolean("is_available").default(false).notNull(),
    currentSessionId: integer("current_session_id").references(() => chatSessions.id),
    lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
    metadata: json("metadata").default({}),
});

// Typing Indicators - for real-time typing status
export const typingIndicators = pgTable("typing_indicators", {
    id: serial("id").primaryKey(),
    sessionId: integer("session_id").references(() => chatSessions.id).notNull(),
    userId: integer("user_id").references(() => import("./user-schema").users.id).notNull(),
    isTyping: boolean("is_typing").default(false).notNull(),
    lastTypingAt: timestamp("last_typing_at").defaultNow().notNull(),
});

// Schema types for TypeScript
export const insertChatDepartmentSchema = createInsertSchema(chatDepartments);
export const insertChatDepartmentAdminSchema = createInsertSchema(chatDepartmentAdmins);
export const insertChatSessionSchema = createInsertSchema(chatSessions);
export const insertChatMessageSchema = createInsertSchema(chatMessages);
export const insertAdminChatStatusSchema = createInsertSchema(adminChatStatus);
export const insertTypingIndicatorSchema = createInsertSchema(typingIndicators);

// Zod schemas for validation
export const chatDepartmentSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().optional(),
    isDefault: z.boolean(),
    isActive: z.boolean(),
    displayOrder: z.number(),
    color: z.string(),
    icon: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const chatSessionSchema = z.object({
    id: z.number(),
    userId: z.number(),
    assignedAdminId: z.number().optional(),
    departmentId: z.number().optional(),
    status: z.string(),
    priority: z.string(),
    subject: z.string().optional(),
    department: z.string(),
    convertedToTicketId: z.number().optional(),
    convertedAt: z.date().optional(),
    convertedByAdminId: z.number().optional(),
    metadata: z.record(z.any()).optional(),
    startedAt: z.date(),
    endedAt: z.date().optional(),
    lastActivityAt: z.date(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const chatMessageSchema = z.object({
    id: z.number(),
    sessionId: z.number(),
    userId: z.number(),
    message: z.string(),
    messageType: z.string(),
    isFromAdmin: z.boolean(),
    readAt: z.date().optional(),
    metadata: z.record(z.any()).optional(),
    createdAt: z.date(),
});

export const adminChatStatusSchema = z.object({
    id: z.number(),
    userId: z.number(),
    isOnline: z.boolean(),
    isAvailable: z.boolean(),
    currentSessionId: z.number().optional(),
    lastActivityAt: z.date(),
    metadata: z.record(z.any()).optional(),
});

export const typingIndicatorSchema = z.object({
    id: z.number(),
    sessionId: z.number(),
    userId: z.number(),
    isTyping: z.boolean(),
    lastTypingAt: z.date(),
});

// Type exports
export type ChatDepartment = z.infer<typeof chatDepartmentSchema>;
export type ChatSession = z.infer<typeof chatSessionSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AdminChatStatus = z.infer<typeof adminChatStatusSchema>;
export type TypingIndicator = z.infer<typeof typingIndicatorSchema>;
export type InsertChatDepartment = z.infer<typeof insertChatDepartmentSchema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertAdminChatStatus = z.infer<typeof insertAdminChatStatusSchema>;
export type InsertTypingIndicator = z.infer<typeof insertTypingIndicatorSchema>; 