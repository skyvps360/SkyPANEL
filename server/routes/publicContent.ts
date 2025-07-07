import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import { betterStackService } from "../betterstack-service"; // For service status/incidents

// Helper function (copied for now, though not strictly needed for public routes if no auth)
// function isAuthenticated(req: Request, res: Response, next: Function) {
//   if (req.isAuthenticated && req.isAuthenticated()) { return next(); }
//   res.status(401).json({ error: "Unauthorized" });
// }

const router = (app: Express) => {
  // Public Blog Categories
  app.get("/api/public/blog-categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllBlogCategories(); // Assuming this filters by active or handles it
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching public blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Blog Posts (all published)
  app.get("/api/public/blog", async (req: Request, res: Response) => {
    try {
      const posts = await storage.getBlogPostsWithCategories(false); // false for published only
      res.json(posts);
    } catch (error: any) {
      console.error("Error fetching public blog posts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Blog Posts by Category
  app.get("/api/public/blog/category/:categoryId", async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }
      const posts = await storage.getBlogPostsByCategory(categoryId, false); // false for published only
      res.json(posts);
    } catch (error: any) {
      console.error(`Error fetching blog posts for category ${req.params.categoryId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Single Blog Post by Slug
  app.get("/api/public/blog/:slug", async (req: Request, res: Response) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      // Ensure only published posts are returned, or that getBlogPostBySlug handles this
      if (!post || !post.published) {
        return res.status(404).json({ error: "Blog post not found or not published" });
      }
      res.json(post);
    } catch (error: any) {
      console.error("Error fetching public blog post by slug:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Doc Categories
  app.get("/api/public/doc-categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllDocCategories(); // Assuming this filters by active or handles it
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching public doc categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Docs (all published, optionally by category)
  app.get("/api/public/docs", async (req: Request, res: Response) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const docs = await storage.getPublishedDocs(categoryId);
      res.json(docs);
    } catch (error: any) {
      console.error("Error fetching public docs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Single Doc by Slug
  app.get("/api/public/docs/:slug", async (req: Request, res: Response) => {
    try {
      const doc = await storage.getDocBySlug(req.params.slug);
      // Ensure only published docs are returned, or that getDocBySlug handles this
      if (!doc || !doc.published) {
        return res.status(404).json({ error: "Document not found or not published" });
      }
      res.json(doc);
    } catch (error: any) {
      console.error("Error fetching public doc by slug:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Legal Content (e.g. /api/legal/tos, /api/legal/privacy)
  // This was already in adminGeneral.ts, but it's a public route.
  // It's better suited here.
  app.get("/api/legal/:type", async (req: Request, res: Response) => {
    try {
      const { type } = req.params;
      const content = await storage.getLegalContent(type);
      if (!content) { // Assuming getLegalContent only returns active/published content
        return res.status(404).json({ error: "Content not found" });
      }
      return res.json(content);
    } catch (error: any) {
      console.error(`Error fetching public legal content (${req.params.type}):`, error);
      return res.status(500).json({ error: error.message || "Error fetching legal content" });
    }
  });


  // Public FAQs
  app.get("/api/faqs", async (req: Request, res: Response) => {
    try {
      const faqs = await storage.getAllFaqItems();
      const activeFaqs = faqs.filter(f => f.isActive); // Ensure only active FAQs
      res.json(activeFaqs);
    } catch (error: any) {
      console.error("Error fetching public FAQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Platform Stats
  app.get("/api/public/platform-stats", async (req: Request, res: Response) => {
    try {
      await virtFusionApi.updateSettings();
      const serverCountSetting = await storage.getSetting("platform_server_count");
      const hypervisorCountSetting = await storage.getSetting("platform_hypervisor_count");
      const additionalCpuSetting = await storage.getSetting("platform_cpu_cores");
      const additionalMemorySetting = await storage.getSetting("platform_memory_gb");

      let realServerCount = 0, realHypervisorCount = 0, realTotalCpuCores = 0, realTotalMemoryGB = 0;
      try {
        const serversResponse = await virtFusionApi.getServers();
        if (Array.isArray(serversResponse)) realServerCount = serversResponse.length;
        else if (serversResponse?.data && Array.isArray(serversResponse.data)) realServerCount = serversResponse.data.length;
        else if (serversResponse && typeof serversResponse.total !== 'undefined') realServerCount = serversResponse.total;
      } catch (e) { console.error("Error fetching server count for stats:", e); }

      try {
        const hypervisorsResponse = await virtFusionApi.getHypervisors();
        let hypervisors = [];
        if (Array.isArray(hypervisorsResponse)) hypervisors = hypervisorsResponse;
        else if (hypervisorsResponse?.data && Array.isArray(hypervisorsResponse.data)) hypervisors = hypervisorsResponse.data;

        realHypervisorCount = hypervisors.length; // Or hypervisorsResponse.total if available and preferred
        for (const hypervisor of hypervisors as any[]) {
            if (hypervisor.maxCpu && !isNaN(hypervisor.maxCpu)) realTotalCpuCores += parseInt(hypervisor.maxCpu, 10);
            if (hypervisor.maxMemory && !isNaN(hypervisor.maxMemory)) realTotalMemoryGB += Math.round(parseInt(hypervisor.maxMemory, 10) / 1024);
        }
      } catch (e) { console.error("Error fetching hypervisor data for stats:", e); }

      const additionalServerCount = parseInt(serverCountSetting?.value || "0", 10) || 0;
      const additionalHypervisorCount = parseInt(hypervisorCountSetting?.value || "0", 10) || 0;
      const additionalCpu = parseInt(additionalCpuSetting?.value || "0", 10) || 0;
      const additionalMemory = parseInt(additionalMemorySetting?.value || "0", 10) || 0;

      res.json({
        serverCount: realServerCount + additionalServerCount,
        hypervisorCount: realHypervisorCount + additionalHypervisorCount,
        maxCPU: realTotalCpuCores + additionalCpu,
        maxMemory: realTotalMemoryGB + additionalMemory
      });
    } catch (error: any) {
      console.error("Error retrieving platform statistics:", error);
      res.status(500).json({ error: "Failed to load platform statistics." });
    }
  });

  // Public Service Status (BetterStack)
  app.get("/api/public/service-status", async (req: Request, res: Response) => {
    try {
      if (!betterStackService.isConfigured()) await betterStackService.initialize();
      const serviceStatus = await betterStackService.getServiceStatuses();
      const overallStatus = await betterStackService.getOverallStatus();
      res.json({ overall: overallStatus, services: serviceStatus }); // Ensure nested structure
    } catch (error: any) {
      console.error("Error in service status endpoint:", error);
      res.json({ overall: 'operational', services: { overall: 'operational', services: [] } }); // Fallback
    }
  });

  // Public Service Incidents (BetterStack)
  app.get("/api/public/service-incidents", async (req: Request, res: Response) => {
    try {
      if (!betterStackService.isConfigured()) await betterStackService.initialize();
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const resolvedOnly = req.query.resolvedOnly === 'true';
      const incidents = await betterStackService.getIncidents(limit, resolvedOnly);
      const formattedIncidents = incidents.map(incident => ({
        ...incident,
        startedAt: incident.startedAt.toISOString(),
        acknowledgedAt: incident.acknowledgedAt ? incident.acknowledgedAt.toISOString() : null,
        resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      }));
      return res.json({ incidents: formattedIncidents });
    } catch (error: any) {
      console.error("Error in service incidents endpoint:", error);
      return res.json({ incidents: [] }); // Fallback
    }
  });
};

export default router;
