import {pgTable, text, serial, integer, real, boolean, timestamp, json, createInsertSchema, z} from "./common-imports";
import {users} from "./user-schema";

// DNS Plans (Pricing structure for DNS service tiers)
export const dnsPlans = pgTable("dns_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // 'Basic', 'Pro', 'Enterprise'
    description: text("description").notNull(),
    price: real("price").notNull(), // Monthly price in USD
    maxDomains: integer("maxDomains").notNull(), // Maximum domains allowed
    maxRecords: integer("maxRecords").notNull(), // Maximum DNS records per domain
    features: json("features").default([]), // Array of feature strings
    isActive: boolean("isActive").default(true).notNull(),
    displayOrder: integer("displayOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

export const insertDnsPlanSchema = createInsertSchema(dnsPlans).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDnsPlan = z.infer<typeof insertDnsPlanSchema>;
export type DnsPlan = typeof dnsPlans.$inferSelect;

// DNS Plan Subscriptions (User subscription management)
export const dnsPlanSubscriptions = pgTable("dns_plan_subscriptions", {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull().references(() => users.id, {onDelete: 'cascade'}),
    planId: integer("planId").notNull().references(() => dnsPlans.id, {onDelete: 'cascade'}),
    status: text("status").notNull().default("active"), // 'active', 'cancelled', 'expired'
    startDate: timestamp("startDate").notNull(),
    endDate: timestamp("endDate").notNull(),
    autoRenew: boolean("autoRenew").default(true).notNull(),
    lastPaymentDate: timestamp("lastPaymentDate"),
    nextPaymentDate: timestamp("nextPaymentDate"),
    createdAt: timestamp("createdAt").defaultNow(),
    updatedAt: timestamp("updatedAt").defaultNow(),
});

export const insertDnsPlanSubscriptionSchema = createInsertSchema(dnsPlanSubscriptions).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDnsPlanSubscription = z.infer<typeof insertDnsPlanSubscriptionSchema>;
export type DnsPlanSubscription = typeof dnsPlanSubscriptions.$inferSelect;

// DNS Domains
export const dnsDomains = pgTable("dns_domains", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, {onDelete: 'cascade'}),
    interserverId: integer("interserver_id"), // ID from InterServer API
    name: text("name").notNull(), // Domain name (e.g., example.com)
    status: text("status").notNull().default("active"), // active, inactive, pending
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDnsDomainSchema = createInsertSchema(dnsDomains).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type DnsDomain = typeof dnsDomains.$inferSelect;
export type InsertDnsDomain = z.infer<typeof insertDnsDomainSchema>;

// DNS Records
export const dnsRecords = pgTable("dns_records", {
    id: serial("id").primaryKey(),
    domainId: integer("domain_id").notNull().references(() => dnsDomains.id, {onDelete: 'cascade'}),
    interserverId: text("interserver_id"), // ID from InterServer API
    name: text("name").notNull(), // Record name (e.g., www, mail, @)
    type: text("type").notNull(), // A, AAAA, CNAME, MX, TXT, NS, etc.
    content: text("content").notNull(), // Record content (IP, hostname, etc.)
    ttl: integer("ttl").notNull().default(86400), // Time to live in seconds
    priority: integer("priority").default(0), // For MX records
    disabled: boolean("disabled").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDnsRecordSchema = createInsertSchema(dnsRecords).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type DnsRecord = typeof dnsRecords.$inferSelect;
export type InsertDnsRecord = z.infer<typeof insertDnsRecordSchema>;