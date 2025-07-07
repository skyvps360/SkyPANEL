import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { cacheService } from "../cache-service";
import { cronService } from "../services/cron-service";
import { dnsBillingService } from "../services/dns-billing-service"; // For cron status
import { virtFusionApi } from "../virtfusion-api";

// Helper functions (copied for now)
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

const router = (app: Express) => {
  // ----- Cache Management Routes (Admin Only) -----
  app.get("/api/admin/cache/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const cacheStatus = await cacheService.getCacheStatus();
      res.json({ success: true, data: cacheStatus });
    } catch (error: any) {
      console.error("Error getting cache status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/cache/clear", isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await cacheService.clearAllCaches();
      if (result.success) {
        res.json({ success: true, message: "All caches cleared successfully", clearedCaches: result.clearedCaches });
      } else {
        res.status(207).json({ success: false, message: "Some caches could not be cleared", clearedCaches: result.clearedCaches, errors: result.errors });
      }
    } catch (error: any) {
      console.error("Error clearing caches:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/cache/clear/:type", isAdmin, async (req: Request, res: Response) => {
    try {
      const cacheType = req.params.type as 'betterstack' | 'gemini' | 'modules';
      if (!['betterstack', 'gemini', 'modules'].includes(cacheType)) {
        return res.status(400).json({ error: "Invalid cache type" });
      }
      await cacheService.clearSpecificCache(cacheType);
      res.json({ success: true, message: `${cacheType} cache cleared successfully` });
    } catch (error: any) {
      console.error(`Error clearing ${req.params.type} cache:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- System Settings Routes (Admin Only) -----
  // Get system settings (admin only) - main admin settings page
  app.get("/api/admin/settings", isAdmin, async (req: Request, res: Response) => {
    try {
      const allSettings = await storage.getAllSettings();
      res.json(allSettings);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update a specific setting - admin only
  app.post("/api/admin/settings/:key", isAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }
      await storage.upsertSetting(key, String(value));
      res.json({ success: true, key, value });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // PUT (update) system setting (admin only) - for compatibility with some admin UI
   app.put("/api/admin/settings/:key", isAdmin, async (req: Request, res: Response) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      console.log(`Updating setting: ${key} = ${key.includes("token") || key.includes("secret") ? "***" : value}`);
      if (!key || value === undefined) {
        return res.status(400).json({ error: "Invalid key or value" });
      }
      await storage.upsertSetting(key, String(value)); // Ensure value is string
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error updating setting via PUT:`, error);
      res.status(500).json({ error: error.message });
    }
  });


  // Legal Content Routes (Admin)
  app.get("/api/admin/legal", isAdmin, async (req: Request, res: Response) => {
    try {
      const content = await storage.getAllLegalContent();
      return res.json(content);
    } catch (error: any) {
      console.error("Error fetching all legal content:", error);
      return res.status(500).json({ error: error.message || "Error fetching legal content" });
    }
  });

  app.post("/api/admin/legal", isAdmin, async (req: Request, res: Response) => {
    try {
      const { type, title, content, version } = req.body;
      const userId = (req.user as any)?.id;

      if (!type || !title || !content || !version) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const existingContent = await storage.getLegalContent(type);
      if (existingContent) {
        await storage.updateLegalContent(existingContent.id, { title, content, version, effectiveDate: new Date(), updatedAt: new Date(), updatedBy: userId });
        return res.json({ success: true, message: "Legal content updated successfully", content: await storage.getLegalContent(type) });
      } else {
        const newContent = await storage.createLegalContent({ type, title, content, version, effectiveDate: new Date(), createdBy: userId, updatedBy: userId });
        return res.json({ success: true, message: "Legal content created successfully", content: newContent });
      }
    } catch (error: any) {
      console.error("Error saving legal content:", error);
      return res.status(500).json({ error: error.message || "Error saving legal content" });
    }
  });

  // Note: Public legal route /api/legal/:type is in publicContent.ts (or will be)

  // ----- Cron Job Management Routes -----
  app.post("/api/admin/cron/dns-billing", isAdmin, async (req: Request, res: Response) => {
    try {
      const { enabled, schedule } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }
      if (schedule && !cronService.validateCronExpression(schedule)) {
        return res.status(400).json({ error: "Invalid cron schedule expression" });
      }
      await cronService.updateDnsBillingCron(enabled, schedule);
      res.json({ success: true, message: "DNS billing cron settings updated successfully", enabled, schedule: schedule || 'unchanged' });
    } catch (error: any) {
      console.error("Error updating DNS billing cron:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/cron/dns-billing/trigger", isAdmin, async (req: Request, res: Response) => {
    try {
      const results = await cronService.triggerDnsBillingManually();
      res.json({ success: true, message: "DNS billing renewal triggered successfully", results });
    } catch (error: any) {
      console.error("Error triggering DNS billing renewal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/cron/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const status = await cronService.getCronStatus();
      const logs = await cronService.getCronLogs();
      const dnsStats = await dnsBillingService.getRenewalStats(); // Assuming this service is available
      res.json({ success: true, cronStatus: status, cronLogs: logs, dnsStats });
    } catch (error: any) {
      console.error("Error fetching cron status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test VirtFusion API connection (admin only)
  app.post("/api/admin/virtfusion/test-connection", isAdmin, async (req: Request, res: Response) => {
    try {
      await virtFusionApi.updateSettings(); // Ensure latest settings are used
      const result = await virtFusionApi.testConnection();
      res.json({ success: true, message: "Successfully connected to VirtFusion API", data: result });
    } catch (error: any) {
      console.error("Connection test failed:", error);
      res.status(500).json({ success: false, error: "Failed to connect to VirtFusion API", details: error.message || "Unknown error", stack: error.stack });
    }
  });
};

export default router;
