import {pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// API Keys
export const apiKeys = pgTable("api_keys", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
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