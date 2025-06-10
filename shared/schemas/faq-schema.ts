import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";

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