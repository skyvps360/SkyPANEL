import type {Express, Request, Response} from "express";
import {createServer, type Server} from "http";
import https from "https";
import axios from "axios";
import * as net from "net";
import {WebSocketServer} from "ws";
import {storage} from "./storage";
import {db, pool} from "./db";
import {hashPassword, setupAuth} from "./auth";
import {AuthService} from "./auth-service";
// import {EmailVerificationService} from "./email-verification-service"; // Moved
import {discordService} from "./discord-service";
import {discordBotService} from "./discord-bot-service";
import {virtFusionService} from "./virtfusion-service";
import {VirtFusionApi as ImportedVirtFusionApi, virtFusionApi} from "./virtfusion-api";
import {emailService} from "./email";
import {betterStackService} from "./betterstack-service";
import {geminiService} from "./gemini-service";
import {cacheService} from "./cache-service";
import {serverLoggingService} from "./server-logging-service";
import {
  // getMaintenanceStatus, // Now in server/routes/maintenance.ts
  // getMaintenanceToken, // Now in server/routes/maintenance.ts
  // regenerateMaintenanceToken, // Now in server/routes/maintenance.ts
  // toggleMaintenanceMode, // Now in server/routes/maintenance.ts
  // validateMaintenanceToken // Now in server/routes/maintenance.ts
} from "./middleware";
import {apiKeyAuth, requireScope} from "./middleware/auth-middleware";
import maintenanceRoutes from "./routes/maintenance";
import publicPackagesRoutes from "./routes/publicPackages";
import userProfileRoutes from "./routes/userProfile";
import adminPackagesRoutes from "./routes/adminPackages";
import userServersRoutes from "./routes/userServers";
import legacyServerManagementRoutes from "./routes/legacyServerManagement";
import billingRoutes from "./routes/billing";
import dnsPlansRoutes from "./routes/dnsPlans";
import supportTicketRoutes from "./routes/supportTickets";
import notificationRoutes from "./routes/notifications";
import adminUserRoutes from "./routes/adminUsers";
import adminGeneralRoutes from "./routes/adminGeneral";
import publicContentRoutes from "./routes/publicContent";
import adminContentRoutes from "./routes/adminContent"; // Added import
import apiKeysRoutes from "./routes/api-keys";
import apiOnlyRoutes from "./routes/api-only-routes";
import chatRoutes from "./routes/chat";
import chatDepartmentsRoutes from "./routes/chat-departments";
import dnsRoutes from "./routes/dns";
import adminDnsRoutes from "./routes/admin-dns";
import serverRoutes from "./routes/server-routes";
import publicSlaRoutes from "./routes/public-sla-routes";
// import transactionRoutes from "./routes/transaction-routes"; // Covered by billingRoutes
import userRoutes from "./routes/user-routes";
import settingsRoutes from "./routes/settings-routes";
import monitoringRoutes from "./routes/monitoring-routes";
import {chatService} from "./chat-service";
// import {departmentMigrationService} from "./services/department-migration"; // Moved
// import {cronService} from "./services/cron-service"; // Moved
// import {dnsBillingService} from "./services/dns-billing-service"; // Moved
import {and, desc, eq, inArray, sql} from "drizzle-orm"; // Still used by some remaining routes or setupAuth
// import PDFDocument from "pdfkit"; // Moved
// import {formatTicketPdf} from "./ticket-download"; // Moved
import * as schema from "../shared/schema";
import {
  dnsDomains as dnsDomainsTable,
  dnsPlans as dnsPlansTable,
  dnsPlanSubscriptions as dnsPlanSubscriptionsTable,
  insertTicketDepartmentSchema,
  insertTicketMessageSchema,
  insertTicketSchema,
  InsertTransaction,
  transactions
} from "@shared/schema";
import {z, ZodError} from "zod";
import {fromZodError} from "zod-validation-error";
// Location status manager already imported above

// Handle all ZodError validations consistently
function handleZodError(error: ZodError, res: Response) {
  const validationError = fromZodError(error);
  res.status(400).json({ error: validationError.message });
}

// Verify the user is authenticated
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Check if the user is an admin
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated() && req.user?.role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

// Duplicate VirtFusion API class removed - using imported global instance instead















export async function registerRoutes(app: Express): Promise<Server> {

  // Register Maintenance routes
  maintenanceRoutes(app);

  // Register Public Package routes
  publicPackagesRoutes(app);

  // Public endpoint for sla-plans (already modularized)
  app.use("/api/public/sla-plans", publicSlaRoutes);

  // Serve the landing page HTML at the root URL
  app.get('/', (req, res, next) => {
    // Always use the React landing page by passing control to the SPA
    next();
  });

  // Setup authentication routes
  setupAuth(app);

  // Register User Profile, Verification, and Auth-related routes
  userProfileRoutes(app);

  // Use the global VirtFusion API client (imported from virtfusion-api.ts)

  // Test endpoints removed - VirtFusion integration is now working properly

  // Register Admin Package Management routes
  adminPackagesRoutes(app);

  // Register User Server Management Routes
  userServersRoutes(app);

  // Register Legacy Server Management, Resource Pack, Client Server, IP, and Storage Routes
  legacyServerManagementRoutes(app);

  // Register Billing Routes
  billingRoutes(app);

  // Register DNS Plan Management Routes
  dnsPlansRoutes(app);

  // Register Support Ticket Routes (includes admin ticket departments, department migration, unified departments)
  supportTicketRoutes(app);

  // Register Notification Routes
  notificationRoutes(app);

  // Register Admin User Routes
  adminUserRoutes(app);

  // Register Admin General Routes (Cache, Settings, Legal, Cron, VirtFusion Test)
  adminGeneralRoutes(app);

  // Register Public Content Routes (Blog, Docs, FAQs, Platform Stats, Service Status, Public Legal)
  publicContentRoutes(app);

  // Register Admin Content Management Routes (Blog, Docs, FAQs)
  adminContentRoutes(app);

  // Register Miscellaneous Routes
  miscRoutes(app);
  // NOTE: The handleVncWebSocketUpgrade is now exported from miscRoutes and used in httpServer.on('upgrade')

  // ----- Admin Routes (continued) -----
  // The following admin routes are now covered by adminGeneral.ts or adminUsers.ts or supportTickets.ts
  // - /api/admin/transactions (Will be part of a dedicated adminBilling or moved into adminGeneral)
  // - /api/admin/billing (Will be part of a dedicated adminBilling or moved into adminGeneral)
  // - /api/admin/tickets (Covered by supportTickets.ts)
  // - /api/admin/tickets/:id/delete (Covered by supportTickets.ts)


  // ----- SSO Routes ----- // These are now in miscRoutes.ts

  // Generate authentication token for VirtFusion panel access
  // app.post("/api/sso/virtfusion/token", isAuthenticated, async (req, res) => { ... });

  // Generate server-specific authentication token for direct server access
  // app.post("/api/sso/virtfusion/server/:serverId/token", isAuthenticated, async (req, res) => { ... });


  // ----- Admin Server Management (VirtFusion specific) -----
  // These are now in adminPackages.ts or adminGeneral.ts or userServers.ts or misc.ts (VNC)
  // - /api/admin/packages/:packageId/templates (in adminPackages or a new adminVirtFusion.ts)
  // - /api/admin/servers (in adminUsers.ts or a new adminVirtFusion.ts)
  // - /api/admin/os-templates (in adminGeneral.ts or a new adminVirtFusion.ts)
  // - /api/admin/servers/:serverId/build-legacy (in adminPackages.ts or new adminVirtFusion.ts)
  // - /api/admin/queue/:id (in adminPackages.ts or new adminVirtFusion.ts)
  // - /api/admin/servers (POST for create, in adminPackages.ts or new adminVirtFusion.ts)
  // - /api/admin/servers/:id/build (POST for build, in adminPackages.ts or new adminVirtFusion.ts)
  // - /api/admin/servers/:id (GET details, in adminUsers.ts or new adminVirtFusion.ts)
  // - /api/admin/servers/:id/traffic (in adminUsers.ts or new adminVirtFusion.ts)
  // - Power management routes for admin (/api/admin/servers/:id/boot etc.) are in adminServers.ts (which should be created or merged)
  // - /api/admin/servers/:id/vnc (GET status - in misc.ts)
  // - /api/admin/servers/:id/vnc/test (in misc.ts)
  // - /api/admin/servers/:id/vnc/enable & /disable (in misc.ts)
  // - /api/admin/servers/:id/throttle-cpu (in adminServers.ts or new adminVirtFusion.ts)


  // ----- General Server/Package/OS Routes (Authenticated but not admin-specific for all) -----
  // These are now in legacyServerManagement.ts or misc.ts or publicContent.ts
  // - /api/servers/:serverId/vnc/enable (in misc.ts)
  // - /api/servers/:serverId/vnc (GET status - in misc.ts)
  // - /api/packages/:id (GET specific package - in legacyServerManagement.ts)
  // - /api/os-templates (GET all - in legacyServerManagement.ts or public if intended)


  // ----- Datacenter and Plan Features -----
  // These are now in publicContent.ts or adminGeneral.ts or a new adminDatacenter.ts / adminPlans.ts
  // - /api/datacenter-locations (Public - in publicContent.ts)
  // - /api/admin/datacenter-locations (Admin CRUD - in adminGeneral.ts or new adminDatacenter.ts)
  // - /api/plan-features (Public - in publicContent.ts)
  // - /api/admin/plan-features (Admin CRUD - in adminGeneral.ts or new adminPlans.ts)


  // ----- Email Logs ----- // These are now in adminGeneral.ts or a new adminLogging.ts
  // - /api/admin/email-logs
  // - /api/admin/email-logs/:id


  // ----- Maintenance Endpoints ----- // These are in maintenance.ts
  // - /api/maintenance/status
  // - /api/maintenance/toggle
  // - /api/maintenance/token
  // - /api/maintenance/token/regenerate
  // - /api/maintenance/token/validate (this one was not refactored yet, should be in maintenance.ts)


  // ----- Endpoints to be reviewed for final placement or removal -----
  // - /api/billing/usage/last30days (Could go to billing.ts or a userDashboard.ts)
  // - /api/test-virtfusion-credit (Admin test, one in adminPackages.ts, one here commented out - consolidate/remove)
  // - /api/admin/transactions (admin billing - could be new adminBilling.ts or added to billing.ts with admin check)
  // - /api/admin/billing (admin billing summary - same as above)
  // - /api/admin/hypervisors/sync (admin general or new adminVirtFusion.ts)
  // - /api/packages (GET all packages - in legacyServerManagement.ts, but path is generic)
  // - /api/test-paypal-verification (admin general or new adminBilling.ts)
  // - /special-download/transactions/:id/pdf (Should be with billing.ts)
  // - /api/public/package-pricing (public content or billing)
  // - /api/verification-status (auth/userProfile related)
  // - /api/auth/request-password-reset (userProfile)
  // - /api/auth/verify-reset-code (userProfile)
  // - /api/auth/request-username-reminder (userProfile)
  // - /api/auth/change-password (userProfile)

  // Register API Keys routes (already modular)
  app.use("/api/user/api-keys", isAuthenticated, apiKeysRoutes);
  // Register Chat routes (already modular)
  app.use("/api/chat", chatRoutes);
  // Register Chat Departments routes (already modular)
  app.use("/api/chat", chatDepartmentsRoutes); // Note: also uses /api/chat path
  // Register DNS routes (already modular)
  app.use("/api/dns", isAuthenticated, dnsRoutes);
  app.use("/api/admin", isAuthenticated, isAdmin, adminDnsRoutes); // This is a broad prefix
  // Register Server routes (already modular - /api/servers)
  app.use("/api/servers", isAuthenticated, serverRoutes);
  // Register Transaction routes (already modular - /api/transactions)
  // app.use("/api/transactions", isAuthenticated, transactionRoutes); // Covered by billingRoutes now
  // Register User routes (already modular - /api/users)
  app.use("/api/users", userRoutes);
  // Register Settings routes (already modular - /api/settings)
  app.use("/api/settings", settingsRoutes);
  // Register Monitoring routes (already modular)
  app.use("/api/monitoring", monitoringRoutes);
  // Register API-only routes (already modular)
  app.use("/api/v1", apiOnlyRoutes);


  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize chat service (no longer creates its own WebSocket server)
  chatService.initialize(httpServer);

  // Attach WebSocket handlers to HTTP server - Handle routing manually
  httpServer.on('upgrade', (request: any, socket: any, head: any) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    console.log(`WebSocket upgrade request: ${url.pathname}`);

    if (url.pathname === '/vnc-proxy') {
      console.log('Handling VNC WebSocket upgrade via miscRoutes.handleVncWebSocketUpgrade');
      handleVncWebSocketUpgrade(request, socket, head); // Imported from misc.ts
    } else if (url.pathname === '/chat-ws') {
      console.log('Handling chat WebSocket upgrade manually via chatService');
      const chatWss = new WebSocketServer({ noServer: true });
      chatWss.handleUpgrade(request, socket, head, (ws) => {
        chatService.handleWebSocketConnection(ws, request);
      });
    } else if (url.pathname === '/' && process.env.NODE_ENV === 'development') {
      console.log('Vite HMR WebSocket request - allowing passthrough');
      // Let Vite handle its own HMR WebSocket
    } else {
      console.log(`Unknown WebSocket path: ${url.pathname}, closing connection`);
      socket.destroy();
    }
  });

  return httpServer;
}
