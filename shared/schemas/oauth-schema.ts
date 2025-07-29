import { pgTable, text, serial, integer, boolean, timestamp, json, createInsertSchema, createSelectSchema, z } from "./common-imports";
import { users } from "./user-schema";

// OAuth Providers
export const oauthProviders = pgTable("oauth_providers", {
  id: serial("id").primaryKey(),
  providerName: text("provider_name").notNull().unique(),
  displayName: text("display_name").notNull(),
  clientId: text("client_id").notNull(),
  clientSecret: text("client_secret").notNull(),
  redirectUrl: text("redirect_url").notNull(),
  scope: text("scope").default(""),
  enabled: boolean("enabled").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User OAuth Accounts
export const userOAuthAccounts = pgTable("user_oauth_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerName: text("provider_name").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  providerUserEmail: text("provider_user_email"),
  providerUserName: text("provider_user_name"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  providerUsername: text("provider_username"),
  providerEmail: text("provider_email"),
  providerAvatarUrl: text("provider_avatar_url"),
  linkedAt: timestamp("linked_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
});

// OAuth Login Logs
export const oauthLoginLogs = pgTable("oauth_login_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: 'set null' }),
  providerName: text("provider_name").notNull(),
  providerUserId: text("provider_user_id"),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertOAuthProviderSchema = createInsertSchema(oauthProviders);
export const insertUserOAuthAccountSchema = createInsertSchema(userOAuthAccounts);
export const insertOAuthLoginLogSchema = createInsertSchema(oauthLoginLogs);

// Select schemas
export const selectOAuthProviderSchema = createSelectSchema(oauthProviders);
export const selectUserOAuthAccountSchema = createSelectSchema(userOAuthAccounts);
export const selectOAuthLoginLogSchema = createSelectSchema(oauthLoginLogs);

// Zod types
export type OAuthProvider = z.infer<typeof selectOAuthProviderSchema>;
export type UserOAuthAccount = z.infer<typeof selectUserOAuthAccountSchema>;
export type OAuthLoginLog = z.infer<typeof selectOAuthLoginLogSchema>;

// Insert types
export type InsertOAuthProvider = z.infer<typeof insertOAuthProviderSchema>;
export type InsertUserOAuthAccount = z.infer<typeof insertUserOAuthAccountSchema>;
export type InsertOAuthLoginLog = z.infer<typeof insertOAuthLoginLogSchema>; 