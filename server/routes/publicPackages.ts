import type { Express, Request, Response } from "express";
import { db } from "../db";
import { virtFusionApi } from "../virtfusion-api";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";

const router = (app: Express) => {
  app.get("/api/public/packages", async (req: Request, res: Response) => {
    try {
      console.log("Getting all packages for public display");

      // Check if environment variables are set
      if (!process.env.VIRTFUSION_API_URL || !process.env.VIRTFUSION_API_TOKEN) {
        console.warn("IMPORTANT: VIRTFUSION_API_URL and/or VIRTFUSION_API_TOKEN environment variables are not set!");
        console.warn("For better security, please set these environment variables instead of using database settings.");
      }

      await virtFusionApi.updateSettings();

      try {
        await virtFusionApi.testConnection();
      } catch (connError: any) {
        console.error("VirtFusion API connection test failed:", connError);
        return res.status(503).json({
          error: "VirtFusion API is currently unavailable. Please try again later.",
        });
      }

      const packagesData = await virtFusionApi.getPackages();

      // Handle different response formats
      let packages;
      if (Array.isArray(packagesData)) {
        packages = packagesData;
      } else if (packagesData.data && Array.isArray(packagesData.data)) {
        packages = packagesData.data;
      } else {
        packages = [];
      }

      // Get pricing records with category and SLA information
      const pricingRecords = await db
        .select({
          pricing: schema.packagePricing,
          category: schema.packageCategories,
          sla: schema.slaPlans
        })
        .from(schema.packagePricing)
        .leftJoin(schema.packageCategories, eq(schema.packagePricing.categoryId, schema.packageCategories.id))
        .leftJoin(schema.slaPlans, eq(schema.packagePricing.slaPlanId, schema.slaPlans.id));

      // Create a map of VirtFusion package ID to our pricing records with category and SLA info
      const pricingMap = pricingRecords.reduce((acc, record) => {
        acc[record.pricing.virtFusionPackageId] = {
          ...record.pricing,
          category: record.category || null,
          sla: record.sla || null
        };
        return acc;
      }, {} as Record<number, any>);

      // Include ALL packages (both enabled and disabled) with category and SLA information and sort by memory size
      const allPackages = packages
        .map(pkg => {
          const pricingRecord = pricingMap[pkg.id];
          return {
            ...pkg,
            pricing: pricingRecord || null,
            category: pricingRecord?.category || null,
            sla: pricingRecord?.sla || null,
            sla_plan: pricingRecord?.sla || null // Add alternative property name for backward compatibility
          };
        })
        .sort((a: any, b: any) => a.memory - b.memory);

      console.log(`Returning ${allPackages.length} packages from VirtFusion API with category information`);
      res.json(allPackages);
    } catch (error: any) {
      console.error("Error fetching public packages:", error);
      res.status(500).json({
        error: "Failed to load available packages. Please try again later."
      });
    }
  });
};

export default router;
