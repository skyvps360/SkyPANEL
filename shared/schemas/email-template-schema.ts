import {pgTable, text, serial, integer, timestamp, json, boolean, createInsertSchema, createSelectSchema, z} from "./common-imports";

// Email Templates
export const emailTemplates = pgTable("email_templates", {
    id: serial("id").primaryKey(),
    name: text("name").notNull().unique(),
    description: text("description"),
    subject: text("subject").notNull(),
    htmlContent: text("htmlContent").notNull(),
    textContent: text("textContent"),
    type: text("type").notNull().unique(), // password_reset, email_verification, welcome_email, etc.
    isActive: boolean("isActive").notNull().default(true),
    variables: json("variables").default([]), // Array of variable names used in the template
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
    createdBy: integer("createdBy"), // User ID who created the template
    updatedBy: integer("updatedBy"), // User ID who last updated the template
});

// Schema for inserting email templates
export const insertEmailTemplateSchema = createInsertSchema(emailTemplates, {
    name: z.string().min(1, "Template name is required").max(255, "Template name is too long"),
    subject: z.string().min(1, "Subject is required").max(998, "Subject is too long"),
    htmlContent: z.string().min(1, "HTML content is required"),
    textContent: z.string().optional(),
    type: z.string().min(1, "Template type is required").max(100, "Template type is too long"),
    isActive: z.boolean().default(true),
    variables: z.array(z.string()).default([]),
    description: z.string().max(1000, "Description is too long").optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Schema for updating email templates
export const updateEmailTemplateSchema = insertEmailTemplateSchema.partial().extend({
    id: z.number().int().positive(),
});

// Schema for selecting email templates
export const selectEmailTemplateSchema = createSelectSchema(emailTemplates);

// Types
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = typeof emailTemplates.$inferInsert;
export type NewEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type UpdateEmailTemplate = z.infer<typeof updateEmailTemplateSchema>;

// Email template types enum for better type safety
export const EMAIL_TEMPLATE_TYPES = {
    PASSWORD_RESET: 'password_reset',
    EMAIL_VERIFICATION: 'email_verification',
    FORGOT_USERNAME: 'forgot_username',
    WELCOME_EMAIL: 'welcome_email',
    MAINTENANCE_NOTIFICATION: 'maintenance_notification',
    PAYMENT_CONFIRMATION: 'payment_confirmation',
    INVOICE_GENERATED: 'invoice_generated',
    SERVER_CREATED: 'server_created',
    SERVER_SUSPENDED: 'server_suspended',
    TICKET_CREATED: 'ticket_created',
    TICKET_REPLIED: 'ticket_replied',
    CUSTOM: 'custom'
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATE_TYPES[keyof typeof EMAIL_TEMPLATE_TYPES];

// Common variables that can be used in email templates
export const COMMON_EMAIL_VARIABLES = [
    'company_name',
    'support_email',
    'frontend_url',
    'dashboard_url',
    'support_url',
    'docs_url',
    'username',
    'user_email',
    'user_id'
] as const;

export type CommonEmailVariable = typeof COMMON_EMAIL_VARIABLES[number];