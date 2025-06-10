import { pgTable, text, serial, integer, boolean, timestamp, createInsertSchema, z } from "./common-imports";
import { users } from "./user-schema";

// Team Members
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  discordUserId: text("discord_user_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  displayName: text("display_name"), // Optional custom display name for public team page
  discordAvatarUrl: text("discord_avatar_url"),
  role: text("role").notNull(), // e.g., "CEO", "Developer", "Support Manager"
  aboutMe: text("about_me"), // Admin-editable description
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: integer("created_by").references(() => users.id, { onDelete: 'set null' }),
  updatedBy: integer("updated_by").references(() => users.id, { onDelete: 'set null' }),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;