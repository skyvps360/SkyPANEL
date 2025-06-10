import {
    pgTable,
    text,
    serial,
    integer,
    boolean,
    timestamp,
    json,
    doublePrecision,
    createInsertSchema,
    z
} from "./common-imports";

// Datacenter Locations
export const datacenterLocations = pgTable("datacenter_locations", {
    id: serial("id").primaryKey(),
    code: text("code").notNull().unique(), // e.g., TEB-2, LON-1, NYC-1
    name: text("name").notNull(), // e.g., Istanbul, London, New York
    regionCode: text("region_code").notNull(), // e.g., EU, NA, AP for Europe, North America, Asia-Pacific
    regionName: text("region_name").notNull(), // e.g., Europe, North America, Asia-Pacific
    country: text("country").notNull(), // e.g., Turkey, UK, USA
    city: text("city").notNull(), // e.g., Istanbul, London, New York
    latitude: doublePrecision("latitude").notNull(), // For map placement
    longitude: doublePrecision("longitude").notNull(), // For map placement
    address: text("address"), // Physical address of datacenter
    provider: text("provider"), // e.g., Equinix, Digital Realty
    tier: text("tier"), // e.g., Tier 3, Tier 4
    isActive: boolean("is_active").default(true).notNull(), // Legacy field - keep for backward compatibility
    status: text("status").default("active"), // 'active', 'coming_soon', 'inactive'
    displayOrder: integer("display_order").default(0), // For controlling display order
    uptime: doublePrecision("uptime").default(99.9), // Uptime percentage
    networkSpeedMbps: integer("network_speed_mbps").default(10000), // Network speed in Mbps
    features: json("features").default([]), // Array of features like "SSD Storage", "10 Gbps Network"
    description: text("description"), // Detailed description of the datacenter
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDatacenterLocationSchema = createInsertSchema(datacenterLocations).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export type InsertDatacenterLocation = z.infer<typeof insertDatacenterLocationSchema>;
export type DatacenterLocation = typeof datacenterLocations.$inferSelect;