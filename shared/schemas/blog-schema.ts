import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

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
    createdBy: integer("created_by").references(() => users.id, {onDelete: 'set null'}),
    updatedBy: integer("updated_by").references(() => users.id, {onDelete: 'set null'}),
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
    categoryId: integer("category_id").references(() => blogCategories.id, {onDelete: 'set null'}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    createdBy: integer("created_by").references(() => users.id, {onDelete: 'set null'}),
    updatedBy: integer("updated_by").references(() => users.id, {onDelete: 'set null'}),
});

export const insertBlogPostSchema = createInsertSchema(blogPosts).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;