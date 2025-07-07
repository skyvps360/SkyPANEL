import type { Express, Request, Response } from "express";
import { db } from "../db";
import { virtFusionApi } from "../virtfusion-api";
import * as schema from "../../shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "../storage"; // Restored import

// Helper function (copied from routes_new.ts for now)
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

const router = (app: Express) => {
  // Admin routes for package pricing
  app.get('/api/admin/packages', isAdmin, async (req: Request, res: Response) => {
    try {
      // Get all VirtFusion packages directly like the public endpoint
      console.log("Getting all packages for admin pricing page");
      await virtFusionApi.updateSettings();

      // Test connection first
      try {
        await virtFusionApi.testConnection();
      } catch (connError: any) {
        console.error("VirtFusion API connection test failed:", connError);
        return res.status(401).json({
          error: 'VirtFusion API authentication failed',
          errorType: 'auth_error',
          errorDetail: 'The VirtFusion API token is invalid or expired'
        });
      }

      const packagesData = await virtFusionApi.getPackages();

      // Handle different response formats
      if (!packagesData) {
        return res.status(500).json({
          error: 'Failed to get VirtFusion packages',
          errorType: 'api_error',
          errorDetail: 'The VirtFusion API returned no data'
        });
      }

      let packagesArray;
      if (Array.isArray(packagesData)) {
        packagesArray = packagesData;
      } else if (packagesData.data && Array.isArray(packagesData.data)) {
        packagesArray = packagesData.data;
      } else {
        return res.status(500).json({
          error: 'Failed to get VirtFusion packages',
          errorType: 'api_error',
          errorDetail: 'The VirtFusion API returned an invalid response format'
        });
      }

      // Get all our package pricing records with category and SLA information
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

      // For each VirtFusion package, add our pricing data with category and SLA if it exists
      const packages = packagesArray.map(pkg => {
        const pricingRecord = pricingMap[pkg.id];
        return {
          ...pkg,
          pricing: pricingRecord ? {
            ...pricingRecord,
            slaPlan: pricingRecord.sla || null // Include SLA plan data
          } : null
        };
      });

      return res.json(packages);
    } catch (error: any) {
      console.error('Error getting admin packages:', error);

      // Check for specific error types
      if (error.response && error.response.status === 401) {
        return res.status(401).json({
          error: 'VirtFusion API authentication failed',
          errorType: 'auth_error',
          errorDetail: 'The VirtFusion API token is invalid or expired'
        });
      }

      return res.status(500).json({
        error: 'Failed to get packages',
        errorDetail: error.message || 'Unknown error'
      });
    }
  });

  // 🖥️ Admin Hypervisor Management - Get all hypervisors (admin only)
  app.get("/api/admin/hypervisors", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Admin fetching hypervisors from VirtFusion API");
      await virtFusionApi.updateSettings(); // Ensure API client is up-to-date
      const result = await virtFusionApi.getHypervisors();
      console.log("VirtFusion hypervisors response:", JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching hypervisors:", error.message);
      res.status(500).json({
        error: "Failed to fetch hypervisors",
        message: error.message
      });
    }
  });

  // 🖥️ Admin Hypervisor Groups Management - Get all hypervisor groups (admin only)
  app.get("/api/admin/hypervisor-groups", isAdmin, async (req: Request, res: Response) => {
    try {
      console.log("Admin fetching hypervisor groups from VirtFusion API");
      await virtFusionApi.updateSettings(); // Ensure API client is up-to-date
      const result = await virtFusionApi.getHypervisorGroups();
      console.log("VirtFusion hypervisor groups response:", JSON.stringify(result, null, 2));
      res.json(result);
    } catch (error: any) {
      console.error("Error fetching hypervisor groups:", error.message);
      res.status(500).json({
        error: "Failed to fetch hypervisor groups",
        message: error.message
      });
    }
  });

  // Create or update package pricing
  app.post('/api/admin/packages/:id/pricing', isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const virtFusionPackageId = parseInt(id, 10);

      if (isNaN(virtFusionPackageId)) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      const { name, description, price, displayOrder, enabled, categoryId, slaPlanId } = req.body;

      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
      }

      const existingRecord = await db
        .select()
        .from(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
        .limit(1);

      if (existingRecord.length > 0) {
        const updated = await db
          .update(schema.packagePricing)
          .set({
            name,
            description,
            price,
            displayOrder: displayOrder || existingRecord[0].displayOrder,
            enabled: enabled !== undefined ? enabled : existingRecord[0].enabled,
            categoryId: categoryId !== undefined ? categoryId : existingRecord[0].categoryId,
            slaPlanId: slaPlanId !== undefined ? slaPlanId : existingRecord[0].slaPlanId,
            updatedAt: new Date()
          })
          .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
          .returning();
        return res.json(updated[0]);
      } else {
        const inserted = await db
          .insert(schema.packagePricing)
          .values({
            virtFusionPackageId,
            name,
            description,
            price,
            displayOrder: displayOrder || 0,
            enabled: enabled !== undefined ? enabled : true,
            categoryId: categoryId || null,
            slaPlanId: slaPlanId || null,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        return res.json(inserted[0]);
      }
    } catch (error: any) {
      console.error('Error creating/updating package pricing:', error);
      res.status(500).json({ error: 'Failed to save package pricing', details: error.message });
    }
  });

  // Delete package pricing
  app.delete('/api/admin/packages/:id/pricing', isAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const virtFusionPackageId = parseInt(id, 10);

      if (isNaN(virtFusionPackageId)) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      const existingRecord = await db
        .select()
        .from(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
        .limit(1);

      if (existingRecord.length === 0) {
        return res.status(404).json({ error: 'Package pricing not found' });
      }

      await db
        .delete(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId));

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting package pricing:', error);
      res.status(500).json({ error: 'Failed to delete package pricing', details: error.message });
    }
  });

  // Test VirtFusion user creation (admin only)
  // This seems more related to admin user testing than package management,
  // but it was grouped with admin package routes in the original file.
  // Consider moving to an adminUsers.ts or adminTesting.ts later if appropriate.
  app.post("/api/test-virtfusion-user", isAdmin, async (req: Request, res: Response) => {
    try {
      const apiUrl = process.env.VIRTFUSION_API_URL || "";
      const apiToken = process.env.VIRTFUSION_API_TOKEN || "";

      // Get current API settings from database (assuming storage is available)
      const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
      const apiTokenSetting = await storage.getSetting("virtfusion_api_token");
      const finalApiUrl = apiUrlSetting?.value || apiUrl;
      const finalApiToken = apiTokenSetting?.value || apiToken;
      // For now, directly use env variables as storage might not be set up in this isolated context yet.
      // const finalApiUrl = apiUrl; // Replaced by storage logic
      // const finalApiToken = apiToken; // Replaced by storage logic


      if (!finalApiUrl || !finalApiToken) {
        return res.status(400).json({
          success: false,
          error:
            "Missing API URL or token. Please configure VirtFusion API settings first.",
        });
      }

      const testUserData = {
        name: req.body.name || "Test User",
        email: req.body.email || `test-${Date.now()}@example.com`,
        extRelationId: req.body.extRelationId || 999999,
        selfService: req.body.selfService || 1,
        selfServiceHourlyCredit: true,
        sendMail: false,
      };

      console.log("Testing VirtFusion user creation with our API client");
      await virtFusionApi.updateSettings(); // Ensure API client uses latest settings
      const clientResult = await virtFusionApi.createUser(testUserData);
      console.log("API client result:", clientResult);

      res.json({
        success: true,
        apiClientResult: clientResult,
        testData: testUserData,
      });
    } catch (error: any) {
      console.error("Error in test-virtfusion-user route:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Unknown error",
        stack: error.stack,
      });
    }
  });
};

export default router;
