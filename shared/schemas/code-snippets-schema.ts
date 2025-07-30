import { pgTable, text, serial, timestamp, boolean, createInsertSchema, createSelectSchema, z } from "./common-imports";

// Code Snippets
export const codeSnippets = pgTable("code_snippets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull(),
  displayLocation: text("display_location").notNull(), // e.g., "header", "footer", "sidebar", "custom"
  customUrl: text("custom_url"), // For custom display location - specific URL path
  isActive: boolean("is_active").default(true),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCodeSnippetSchema = createInsertSchema(codeSnippets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectCodeSnippetSchema = createSelectSchema(codeSnippets);

export type InsertCodeSnippet = z.infer<typeof insertCodeSnippetSchema>;
export type CodeSnippet = z.infer<typeof selectCodeSnippetSchema>; 