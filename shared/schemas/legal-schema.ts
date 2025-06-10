import {pgTable, text, serial, integer, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

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
    createdBy: integer("created_by").references(() => users.id, {onDelete: 'set null'}),
    updatedBy: integer("updated_by").references(() => users.id, {onDelete: 'set null'}),
});

export const insertLegalContentSchema = createInsertSchema(legalContent).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertLegalContent = z.infer<typeof insertLegalContentSchema>;
export type LegalContent = typeof legalContent.$inferSelect;