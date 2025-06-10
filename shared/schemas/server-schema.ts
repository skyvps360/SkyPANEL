import { pgTable, text, serial, integer, timestamp, json, createInsertSchema, z } from "./common-imports";
import { users } from "./user-schema";

// Server Power Status
export const serverPowerStatus = pgTable("server_power_status", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull().unique(),
  powerState: text("power_state").default("UNKNOWN"),
  lastQueueId: integer("last_queue_id"),
  lastAction: text("last_action"),
  lastActionTime: timestamp("last_action_time").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertServerPowerStatusSchema = createInsertSchema(serverPowerStatus, {
  id: z.number().optional(),
  updatedAt: z.date().optional(),
});
export type InsertServerPowerStatus = z.infer<typeof insertServerPowerStatusSchema>;
export type ServerPowerStatus = typeof serverPowerStatus.$inferSelect;

// Server Action Logs
export const serverLogs = pgTable("server_logs", {
  id: serial("id").primaryKey(),
  serverId: integer("server_id").notNull(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // power_on, power_off, restart, reset_password, vnc_connect, vnc_disconnect, config_change, etc.
  actionType: text("action_type").notNull(), // power, security, network, storage, vnc, config
  status: text("status").notNull().default("success"), // success, failed, pending
  details: text("details"), // Additional details about the action
  metadata: json("metadata").default({}), // Additional structured data (IP addresses, queue IDs, etc.)
  userAgent: text("user_agent"), // Browser/client information
  ipAddress: text("ip_address"), // IP address of the user performing the action
  queueId: integer("queue_id"), // VirtFusion queue ID if applicable
  errorMessage: text("error_message"), // Error message if action failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServerLogSchema = createInsertSchema(serverLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertServerLog = z.infer<typeof insertServerLogSchema>;
export type ServerLog = typeof serverLogs.$inferSelect;