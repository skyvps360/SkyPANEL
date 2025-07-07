import type { Express, Request, Response } from "express";
import { db } from "../db";
import { virtFusionApi } from "../virtfusion-api";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage"; // Added for /api/cloud-pricing

// Helper function (copied from routes_new.ts for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

function isAdmin(req: Request, res: Response, next: Function) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
      return next();
    }
    res.status(403).json({ error: "Forbidden: Admin access required" });
  }

const router = (app: Express) => {
  // ----- Self Service Resource Pack Routes -----
  // Get all available resource packs
  app.get("/api/resource-packs", isAuthenticated, async (req: Request, res: Response) => {
    res.json([]); // Direct VirtFusion integration
  });

  app.get("/api/resource-packs/:id", isAuthenticated, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented - direct VirtFusion integration" });
  });

  app.post("/api/resource-packs", isAdmin, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented - direct VirtFusion integration" });
  });

  app.delete("/api/resource-packs/:id", isAdmin, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented - direct VirtFusion integration" });
  });

  app.post("/api/resource-packs/:id/servers", isAdmin, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Not implemented - direct VirtFusion integration" });
  });

  // ----- Client Server Management Routes -----
  app.post("/api/servers", isAuthenticated, async (req: Request, res: Response) => {
    res.status(501).json({ error: "Server creation functionality has been removed" });
  });

  // Get client-accessible packages with pricing
  app.get("/api/packages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Fetching packages for client");
      await virtFusionApi.updateSettings();
      const packagesResponse = await virtFusionApi.getPackages();

      if (!packagesResponse) {
        return res.json([]);
      }

      const packagesArray = Array.isArray(packagesResponse) ? packagesResponse : packagesResponse.data || [];

      const pricingRecords = await db
        .select({
          pricing: schema.packagePricing,
          category: schema.packageCategories,
          sla: schema.slaPlans
        })
        .from(schema.packagePricing)
        .leftJoin(schema.packageCategories, eq(schema.packagePricing.categoryId, schema.packageCategories.id))
        .leftJoin(schema.slaPlans, eq(schema.packagePricing.slaPlanId, schema.slaPlans.id));

      const pricingMap = pricingRecords.reduce((acc, record) => {
        acc[record.pricing.virtFusionPackageId] = {
          ...record.pricing,
          category: record.category || null,
          sla: record.sla || null
        };
        return acc;
      }, {} as Record<number, any>);

      const clientPackages = packagesArray
        .filter((pkg: any) => pkg.enabled)
        .map((pkg: any) => {
          const pricingRecord = pricingMap[pkg.id];
          return {
            ...pkg,
            price: pricingRecord ? pricingRecord.price / 100 : null,
            pricing: pricingRecord ? {
              price: pricingRecord.price / 100,
              displayOrder: pricingRecord.displayOrder,
              enabled: pricingRecord.enabled
            } : null,
            category: pricingRecord?.category || null,
            sla: pricingRecord?.sla || null,
            sla_plan: pricingRecord?.sla || null
          };
        })
        .filter((pkg: any) => !pkg.pricing || pkg.pricing.enabled)
        .sort((a: any, b: any) => {
          const orderA = a.pricing?.displayOrder || 999;
          const orderB = b.pricing?.displayOrder || 999;
          if (orderA !== orderB) return orderA - orderB;
          return a.name.localeCompare(b.name);
        });

      console.log(`Returning ${clientPackages.length} packages for authenticated client with SLA information`);
      res.json(clientPackages);
    } catch (error: any) {
      console.error("Error fetching packages for client:", error);
      res.status(500).json({ error: "Failed to fetch packages" });
    }
  });

  // Get cloud pricing settings (client-accessible)
  app.get("/api/cloud-pricing", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Fetching cloud pricing settings for client");
      const settingsArray = await storage.getAllSettings();
      const settings = settingsArray.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      const cloudPricing = {
        cpuPricePerCore: parseFloat(settings.cloud_cpu_price_per_core || "0"),
        ramPricePerGB: parseFloat(settings.cloud_ram_price_per_gb || "0"),
        storagePricePerGB: parseFloat(settings.cloud_storage_price_per_gb || "0"),
        networkPricePerMbps: parseFloat(settings.cloud_network_price_per_mbps || "0"),
        natIpv4Price: parseFloat(settings.cloud_nat_ipv4_price || "0"),
        publicIpv4Price: parseFloat(settings.cloud_public_ipv4_price || "0"),
        publicIpv6Price: parseFloat(settings.cloud_public_ipv6_price || "0"),
        cpuPricingEnabled: settings.cloud_cpu_pricing_enabled === "true",
        ramPricingEnabled: settings.cloud_ram_pricing_enabled === "true",
        storagePricingEnabled: settings.cloud_storage_pricing_enabled === "true",
        networkPricingEnabled: settings.cloud_network_pricing_enabled === "true",
        natIpv4PricingEnabled: settings.cloud_nat_ipv4_pricing_enabled === "true",
        publicIpv4PricingEnabled: settings.cloud_public_ipv4_pricing_enabled === "true",
        publicIpv6PricingEnabled: settings.cloud_public_ipv6_pricing_enabled === "true"
      };
      res.json(cloudPricing);
    } catch (error: any) {
      console.error("Error fetching cloud pricing:", error);
      res.status(500).json({ error: "Failed to fetch cloud pricing" });
    }
  });

  // ----- IP Address Management Routes -----
  app.get("/api/ip-addresses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await virtFusionApi.updateSettings();
      const ipBlocksResponse = await virtFusionApi.getIpBlocks();
      const formattedAddresses: any[] = [];

      if (ipBlocksResponse && ipBlocksResponse.data && Array.isArray(ipBlocksResponse.data)) {
        for (const block of ipBlocksResponse.data) {
          if (block.ranges && Array.isArray(block.ranges)) {
            for (const range of block.ranges) {
              if (range.addresses && Array.isArray(range.addresses)) {
                for (const addr of range.addresses) {
                  formattedAddresses.push({
                    id: addr.id || `vf-${block.id}-${addr.address}`,
                    address: addr.address,
                    serverId: addr.serverId || null,
                    blockId: block.id,
                    createdAt: new Date(), // Placeholder
                    updatedAt: new Date(), // Placeholder
                    status: addr.allocated ? "allocated" : "available",
                  });
                }
              }
            }
          }
        }
      }
      res.json(formattedAddresses);
    } catch (error: any) {
      console.error("Error fetching IP addresses from VirtFusion:", error);
      res.json([]); // Return empty array on error
    }
  });

  // ----- Storage Volume Management Routes -----
  app.get("/api/storage-volumes", isAuthenticated, async (req: Request, res: Response) => {
    res.json([]); // Direct VirtFusion integration
  });
};

export default router;
