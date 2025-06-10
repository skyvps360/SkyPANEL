import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// Documentation Categories
export const docCategories = pgTable("doc_categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(), // Unique identifier for URL
    description: text("description"),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => users.id, {onDelete: 'set null'}),
    updatedBy: integer("updated_by").references(() => users.id, {onDelete: 'set null'}),
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
    categoryId: integer("category_id").references(() => docCategories.id, {onDelete: 'set null'}),
    published: boolean("published").default(true).notNull(),
    displayOrder: integer("display_order").default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => users.id, {onDelete: 'set null'}),
    updatedBy: integer("updated_by").references(() => users.id, {onDelete: 'set null'}),
});

export const insertDocSchema = createInsertSchema(docs).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDoc = z.infer<typeof insertDocSchema>;
export type Doc = typeof docs.$inferSelect;