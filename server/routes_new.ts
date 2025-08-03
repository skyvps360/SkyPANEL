import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import https from "https";
import axios from "axios";
import * as net from "net";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { db, pool } from "./db";
import { hashPassword, setupAuth } from "./auth";
import { AuthService } from "./services/auth/auth-service";
import { OAuthService } from "./services/auth/oauth-service";
import { EmailVerificationService } from "./email-verification-service";
import { discordService } from "./discord-service";
import { discordBotService } from "./discord-bot-service";
import { virtFusionService } from "./virtfusion-service";
import { VirtFusionApi as ImportedVirtFusionApi, virtFusionApi, VirtFusionApi } from "./virtfusion-api";
// Remove duplicate import of InsertTransaction
// import { InsertTransaction } from "@shared/schema";
import { emailService } from "./email";
import { betterStackService } from "./betterstack-service";
import { geminiService } from "./gemini-service";
import { cacheService } from "./services/infrastructure/cache-service";
import { serverLoggingService } from "./server-logging-service";
import {
  getMaintenanceStatus,
  getMaintenanceToken,
  regenerateMaintenanceToken,
  toggleMaintenanceMode,
  validateMaintenanceToken
} from "./middleware";
import { apiKeyAuth, requireScope } from "./middleware/auth-middleware";
import apiKeysRoutes from "./routes/api-keys";
import apiOnlyRoutes from "./routes/api-only-routes";

import dnsRoutes from "./routes/dns";
import adminDnsRoutes from "./routes/admin-dns";
import serverRoutes from "./routes/server-routes";
import publicSlaRoutes from "./routes/public-sla-routes";
import transactionRoutes from "./routes/transaction-routes";
import userRoutes from "./routes/user-routes";
import settingsRoutes from "./routes/settings-routes";
import adminSettingsRoutes from "./routes/admin-settings";
import monitoringRoutes from "./routes/monitoring-routes";
import awardsRoutes from "./routes/awards-routes";
import adminCouponsRoutes from "./routes/admin-coupons";
import couponRoutes from "./routes/coupon-routes";
import oauthRoutes from "./routes/oauth-routes";

import codeSnippetsRoutes from "./routes/code-snippets";

import { cronService } from "./services/cron-service";
import { dnsBillingService } from "./services/dns-billing-service";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { formatTicketPdf } from "./ticket-download";
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
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
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

  // Maintenance mode status endpoint
  app.get("/api/maintenance/status", async (req, res) => {
    try {
      const status = await getMaintenanceStatus();
      return res.json(status);
    } catch (error) {
      console.error('Error fetching maintenance status:', error);
      return res.status(500).json({ error: 'Failed to fetch maintenance status' });
    }
  });

  // Maintenance mode admin endpoints
  app.post("/api/maintenance/toggle", isAdmin, async (req, res) => {
    try {
      const { enabled, message, estimatedCompletion } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Enabled status must be a boolean" });
      }

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Get admin user information for email notifications
      const adminUser = req.user ? {
        fullName: req.user.fullName,
        username: req.user.username
      } : undefined;

      const status = await toggleMaintenanceMode(enabled, message, estimatedCompletion, adminUser);

      return res.json({
        success: true,
        ...status,
        message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled'
      });
    } catch (error) {
      console.error('Error toggling maintenance mode:', error);
      return res.status(500).json({ error: 'Failed to toggle maintenance mode' });
    }
  });

  // Get maintenance token for admin
  app.get("/api/maintenance/token", isAdmin, (req, res) => {
    try {
      const token = getMaintenanceToken();
      return res.json({ token });
    } catch (error) {
      console.error('Error fetching maintenance token:', error);
      return res.status(500).json({ error: 'Failed to fetch maintenance token' });
    }
  });

  // Regenerate maintenance token
  app.post("/api/maintenance/token/regenerate", isAdmin, async (req, res) => {
    try {
      // Since regenerateMaintenanceToken returns a Promise, we need to await it
      const token = await regenerateMaintenanceToken();
      return res.json({
        success: true,
        token
      });
    } catch (error) {
      console.error('Error regenerating maintenance token:', error);
      return res.status(500).json({ error: 'Failed to regenerate maintenance token' });
    }
  });

  // Validate maintenance token and set a cookie to bypass maintenance mode
  // (This endpoint is used by the maintenance page to enable individual access)
  app.post("/api/maintenance/token/validate", (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      const isValid = validateMaintenanceToken(token);

      if (isValid) {
        // Set both the session and cookie bypass
        req.session.maintenanceBypass = true;

        // Set cookie for browser-based bypass (lasts 24 hours)
        // Make sure to use a string value for the cookie
        res.cookie('maintenance_bypass', 'true', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000,
          path: '/',
          sameSite: 'lax'
        });

        // Save the session explicitly to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error('Error saving session:', err);
            return res.status(500).json({
              success: false,
              message: 'Failed to save session state'
            });
          }

          return res.json({
            success: true,
            message: 'Maintenance bypass enabled',
          });
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid maintenance token'
        });
      }
    } catch (error) {
      console.error('Error validating maintenance token:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate maintenance token'
      });
    }
  });
  // Public endpoint for packages (no authentication required)
  app.use("/api/public/sla-plans", publicSlaRoutes);
  app.get("/api/public/packages", async (req, res) => {
    try {

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

      // Filter out disabled packages and include only enabled ones with category and SLA information
      const allPackages = packages
        .filter(pkg => pkg.enabled === true) // Only include enabled packages
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


      res.json(allPackages);
    } catch (error: any) {
      console.error("Error fetching public packages:", error);
      res.status(500).json({
        error: "Failed to load available packages. Please try again later."
      });
    }
  });

  // Serve the landing page HTML at the root URL
  app.get('/', (req, res, next) => {
    // Always use the React landing page by passing control to the SPA
    next();
  });

  // Setup authentication routes
  setupAuth(app);

  // Update user profile
  app.patch("/api/user/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate the request body
      const updateSchema = z.object({
        fullName: z.string().min(1).optional(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        address: z.string().optional(),
      });

      let validatedData;
      try {
        validatedData = updateSchema.parse(req.body);

      } catch (error) {
        console.error("Validation error:", error);
        if (error instanceof ZodError) {
          return handleZodError(error, res);
        }
        throw error;
      }

      // If email is changing, check if the new email is already in use
      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
  
          return res.status(400).json({ error: "Email is already in use" });
        }
      }

      // Update user in database
      await storage.updateUser(userId, validatedData);

      // If user is linked to VirtFusion, sync the changes
      if (user.virtFusionId) {
        try {
          // Use the VirtFusion API to update profile using external relation ID (same as admin endpoint)
          await virtFusionApi.modifyUserByExtRelationId(userId, {
            name: validatedData.fullName || user.fullName,
            email: validatedData.email || user.email,
          });
        } catch (virtFusionError: any) {
          console.error("Error syncing with VirtFusion:", virtFusionError);
          // We don't fail the request if VirtFusion sync fails, just log the error
        }
      }

      // Get the updated user to return
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Email verification status endpoint
  // Note: The actual verify-email and resend-verification endpoints are in auth.ts

  // Check email verification status
  app.get("/api/verification-status", isAuthenticated, async (req, res) => {
    try {
      const isVerified = await EmailVerificationService.isEmailVerified(req.user!.id);
      res.json({
        isVerified,
        email: req.user!.email
      });
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while checking verification status."
      });
    }
  });

  // Password reset and forgot username routes

  // Request password reset (forgotten password)
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await AuthService.requestPasswordReset(email);
      res.json(result);
    } catch (error: any) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while processing your request."
      });
    }
  });

  // Verify password reset code
  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, resetCode } = req.body;

      if (!email || !resetCode) {
        return res.status(400).json({
          success: false,
          message: "Email and reset code are required"
        });
      }

      const result = await AuthService.verifyPasswordResetCode(email, resetCode);
      res.json(result);
    } catch (error: any) {
      console.error("Error verifying reset code:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while verifying the reset code."
      });
    }
  });

  // Deprecated: Password reset moved to a more comprehensive implementation below

  // Request username reminder (forgotten username)
  app.post("/api/auth/request-username", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await AuthService.requestUsernameReminder(email);
      res.json(result);
    } catch (error: any) {
      console.error("Error requesting username reminder:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while processing your request."
      });
    }
  });

  // Change password (for logged-in users)
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Current password is still required, but we'll make newPassword optional
      // to support "reset" functionality that gets a new password from VirtFusion
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required"
        });
      }

      // Determine if this is a password change or reset
      const isReset = req.body.reset === true || !newPassword;

      // If it's a regular change, we need the new password
      if (!isReset && !newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required"
        });
      }

      // Call the AuthService with or without the new password
      const result = await AuthService.changePassword(
        req.user!.id,
        currentPassword,
        isReset ? '' : newPassword // If reset mode, don't pass a new password
      );

      res.json(result);
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while changing your password."
      });
    }
  });

  // Use the global VirtFusion API client (imported from virtfusion-api.ts)

  // Test endpoints removed - VirtFusion integration is now working properly

  // Test API route - this will help us diagnose issues directly
  // Admin routes for package pricing
  app.get('/api/admin/packages', isAdmin, async (req, res) => {
    try {
      // Get all VirtFusion packages directly like the public endpoint

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

      // Filter out disabled packages
      packagesArray = packagesArray.filter((pkg: any) => pkg.enabled !== false);

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
  app.get("/api/admin/hypervisors", isAdmin, async (req, res) => {
    try {


      // Get hypervisors from VirtFusion API
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
  app.get("/api/admin/hypervisor-groups", isAdmin, async (req, res) => {
    try {
      // Get hypervisor groups from VirtFusion API (required for server creation)
      const result = await virtFusionApi.getHypervisorGroups();

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
  app.post('/api/admin/packages/:id/pricing', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const virtFusionPackageId = parseInt(id, 10);

      if (isNaN(virtFusionPackageId)) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      // Validate the incoming data (ENHANCED: Added categoryId and slaPlanId support)
      const { name, description, price, displayOrder, enabled, categoryId, slaPlanId } = req.body;

      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({ error: 'Price must be a positive number' });
      }

      // Check if the pricing record exists
      const existingRecord = await db
        .select()
        .from(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
        .limit(1);

      if (existingRecord.length > 0) {
        // Update existing record (ENHANCED: Added categoryId and slaPlanId support)
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
        // Create new record (ENHANCED: Added categoryId and slaPlanId support)
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
  app.delete('/api/admin/packages/:id/pricing', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const virtFusionPackageId = parseInt(id, 10);

      if (isNaN(virtFusionPackageId)) {
        return res.status(400).json({ error: 'Invalid package ID' });
      }

      // Check if the pricing record exists
      const existingRecord = await db
        .select()
        .from(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
        .limit(1);

      if (existingRecord.length === 0) {
        return res.status(404).json({ error: 'Package pricing not found' });
      }

      // Delete the record
      await db
        .delete(schema.packagePricing)
        .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId));

      return res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting package pricing:', error);
      res.status(500).json({ error: 'Failed to delete package pricing', details: error.message });
    }
  });

  app.post("/api/test-virtfusion-user", isAdmin, async (req, res) => {
    try {
      const apiUrl = process.env.VIRTFUSION_API_URL || "";
      const apiToken = process.env.VIRTFUSION_API_TOKEN || "";

      // Get current API settings from database
      const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
      const apiTokenSetting = await storage.getSetting("virtfusion_api_token");

      // Use the settings from the database if available
      const finalApiUrl = apiUrlSetting?.value || apiUrl;
      const finalApiToken = apiTokenSetting?.value || apiToken;

      if (!finalApiUrl || !finalApiToken) {
        return res.status(400).json({
          success: false,
          error:
            "Missing API URL or token. Please configure VirtFusion API settings first.",
        });
      }

      // Create a test user with the format from the VirtFusion docs
      const testUserData = {
        name: req.body.name || "Test User",
        email: req.body.email || `test-${Date.now()}@example.com`,
        extRelationId: req.body.extRelationId || 999999, // Use a high number unlikely to conflict
        selfService: req.body.selfService || 1, // Default to hourly only (1)
        selfServiceHourlyCredit: true, // Enable credit balance billing for hourly self service
        sendMail: false,
      };

      console.log("Testing VirtFusion user creation with our API client");
      await virtFusionApi.updateSettings();
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

  // Test VirtFusion API connection (admin only)
  app.post(
    "/api/admin/virtfusion/test-connection",
    isAdmin,
    async (req, res) => {
      try {
        console.log("Testing VirtFusion API connection...");

        // Get the latest API settings
        console.log("Fetching latest VirtFusion API settings from database");
        const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
        const apiTokenSetting = await storage.getSetting(
          "virtfusion_api_token",
        );
        const sslVerifySetting = await storage.getSetting(
          "virtfusion_ssl_verify",
        );

        console.log("API settings retrieved from database:", {
          apiUrl: apiUrlSetting?.value || "not set",
          apiToken: apiTokenSetting?.value ? "***" : "not set",
          sslVerify: sslVerifySetting?.value || "not set",
        });

        // Validate the settings
        if (!apiUrlSetting?.value || !apiTokenSetting?.value) {
          console.log("Missing API settings - cannot test connection");
          return res.status(400).json({
            success: false,
            error:
              "Missing API settings. Please configure API URL and token first.",
          });
        }

        // Force the API client to use the latest settings
        console.log("Updating VirtFusion API client with latest settings");
        await virtFusionApi.updateSettings();

        // Test the connection
        try {
          console.log("Making test request to VirtFusion API");
          const result = await virtFusionApi.testConnection();
          console.log(
            "Connection test successful, response:",
            JSON.stringify(result),
          );

          res.json({
            success: true,
            message: "Successfully connected to VirtFusion API",
            data: result,
          });
        } catch (error: any) {
          console.error("Connection test failed:", error);

          res.status(500).json({
            success: false,
            error: "Failed to connect to VirtFusion API",
            details: error.message || "Unknown error",
            stack: error.stack,
          });
        }
      } catch (error: any) {
        console.error("Error testing VirtFusion connection:", error);
        res.status(500).json({
          success: false,
          error: error.message || "Unknown error",
          stack: error.stack,
        });
      }
    },
  );



  // ----- User Server Management Routes -----

  // Get user's servers
  app.get("/api/user/servers", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 10;



      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {

        return res.json({
          data: [],
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: 0
        });
      }

      // Get user's servers from VirtFusion (basic list first)
      const result = await virtFusionApi.getUserServers(user.virtFusionId);

      if (result && result.data) {
        const basicServers = Array.isArray(result.data) ? result.data : [];
        const total = basicServers.length;
        const lastPage = Math.ceil(total / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedBasicServers = basicServers.slice(startIndex, endIndex);



        // Fetch detailed data for each server individually and process IP information
        const detailedServers = [];
        for (const basicServer of paginatedBasicServers) {
          try {

            const detailedServer = await virtFusionApi.request("GET", `/servers/${basicServer.id}?remoteState=true`);

            if (detailedServer && detailedServer.data) {
              // Process the detailed server data to extract IP information
              const server = detailedServer.data;
              let primaryIpAddress = "No IP";
              let allIpAddresses: any[] = [];
              let networkInfo: any = {};
              let isNat = false;

              // Process network interfaces to extract IP information
              if (server.network && server.network.interfaces && Array.isArray(server.network.interfaces)) {
                for (const iface of server.network.interfaces) {
                  // Store isNat value
                  if (typeof iface.isNat === 'boolean') {
                    isNat = iface.isNat;
                  }

                  // Process IPv4 addresses
                  if (iface.ipv4 && Array.isArray(iface.ipv4) && iface.ipv4.length > 0) {
                    const ipv4Addresses = iface.ipv4.map((ip: any) => ({
                      address: ip.address || 'Unknown',
                      gateway: ip.gateway || 'Unknown',
                      netmask: ip.netmask || 'Unknown',
                      resolver1: ip.resolver1 || 'Unknown',
                      resolver2: ip.resolver2 || 'Unknown',
                      enabled: ip.enabled === true,
                      order: ip.order || 0,
                      type: 'ipv4'
                    }));

                    allIpAddresses = [...allIpAddresses, ...ipv4Addresses];

                    // Set the primary IP address as the first enabled one
                    const enabledIp = iface.ipv4.find((ip: any) => ip.enabled === true);
                    if (!primaryIpAddress || primaryIpAddress === "No IP") {
                      if (enabledIp && enabledIp.address) {
                        primaryIpAddress = enabledIp.address;
                      } else if (iface.ipv4[0].address) {
                        primaryIpAddress = iface.ipv4[0].address;
                      }
                    }
                  }

                  // Process IPv6 addresses
                  if (iface.ipv6 && Array.isArray(iface.ipv6) && iface.ipv6.length > 0) {
                    const ipv6Addresses = iface.ipv6.map((ip: any) => ({
                      address: ip.address || (ip.subnet ? `${ip.subnet}/${ip.cidr}` : 'Unknown'),
                      gateway: ip.gateway || 'Unknown',
                      netmask: ip.prefix || ip.netmask || (ip.cidr ? `/${ip.cidr}` : 'Unknown'),
                      resolver1: ip.resolver1 || 'Unknown',
                      resolver2: ip.resolver2 || 'Unknown',
                      enabled: ip.enabled === true,
                      order: ip.order || 0,
                      type: 'ipv6'
                    }));

                    allIpAddresses = [...allIpAddresses, ...ipv6Addresses];

                    // Use IPv6 as primary only if no IPv4 is available
                    if ((primaryIpAddress === "No IP") && ipv6Addresses.length > 0) {
                      const enabledIpv6 = iface.ipv6.find((ip: any) => ip.enabled === true);
                      if (enabledIpv6) {
                        if (enabledIpv6.address) {
                          primaryIpAddress = enabledIpv6.address;
                        } else if (enabledIpv6.subnet) {
                          primaryIpAddress = `${enabledIpv6.subnet}/${enabledIpv6.cidr}`;
                        }
                      } else if (iface.ipv6[0]) {
                        if (iface.ipv6[0].address) {
                          primaryIpAddress = iface.ipv6[0].address;
                        } else if (iface.ipv6[0].subnet) {
                          primaryIpAddress = `${iface.ipv6[0].subnet}/${iface.ipv6[0].cidr}`;
                        }
                      }
                    }
                  }

                  // Collect interface details
                  networkInfo = {
                    name: iface.name || 'eth0',
                    mac: iface.mac || 'Unknown',
                    isNat: iface.isNat || false,
                    enabled: iface.enabled || false
                  };
                }
              }

              // If we still don't have an IP, try other possible fields
              if (primaryIpAddress === "No IP") {
                primaryIpAddress = server.ipAddresses?.[0]?.address || server.ip || "No IP";
              }

              // Get package category information if available
              let packageCategory = null;
              let packageCategoryName = "Unknown";

              if (server.package?.id) {
                try {
                  // Import database and schema
                  const { db } = await import('../db');
                  const { packagePricing, packageCategories } = await import('../../shared/schema');
                  const { eq } = await import('drizzle-orm');

                  // Look up package pricing and category
                  const packageInfo = await db
                    .select({
                      categoryId: packagePricing.categoryId,
                      categoryName: packageCategories.name
                    })
                    .from(packagePricing)
                    .leftJoin(packageCategories, eq(packagePricing.categoryId, packageCategories.id))
                    .where(eq(packagePricing.virtFusionPackageId, server.package.id))
                    .limit(1);

                  if (packageInfo.length > 0 && packageInfo[0].categoryName) {
                    packageCategory = packageInfo[0].categoryId;
                    packageCategoryName = packageInfo[0].categoryName;
                  }
                } catch (categoryError) {
                  console.warn(`Failed to fetch category for package ${server.package.id}:`, categoryError);
                }
              }

              // Create processed server object with IP information and package category
              const processedServer = {
                ...server,
                id: server.id,
                name: server.name || `Server #${server.id}`,
                hostname: server.hostname || "Unknown",
                ip: primaryIpAddress,
                allIps: allIpAddresses,
                ipv4s: allIpAddresses.filter(ip => ip.type === 'ipv4'),
                ipv6s: allIpAddresses.filter(ip => ip.type === 'ipv6'),
                network: networkInfo,
                hypervisorId: server.hypervisorId || null,
                isNat: isNat,
                status: server.state?.name || server.state || server.status || "Unknown",
                os: server.os?.name || "Unknown",
                package: server.package?.name || "Unknown",
                packageCategory: packageCategory,
                packageCategoryName: packageCategoryName
              };

              detailedServers.push(processedServer);
            } else {
              // Fallback to basic server data if detailed fetch fails
              console.warn(`Failed to fetch detailed data for server ${basicServer.id}, using basic data`);
              detailedServers.push({
                ...basicServer,
                allIps: [],
                ipv4s: [],
                ipv6s: [],
                network: {},
                isNat: false
              });
            }
          } catch (error) {
            console.error(`Error fetching detailed data for server ${basicServer.id}:`, error);
            // Fallback to basic server data with empty IP arrays
            detailedServers.push({
              ...basicServer,
              allIps: [],
              ipv4s: [],
              ipv6s: [],
              network: {},
              isNat: false
            });
          }
        }



        return res.json({
          data: detailedServers,
          current_page: page,
          last_page: lastPage,
          per_page: perPage,
          total: total
        });
      } else {

        return res.json({
          data: [],
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: 0
        });
      }
    } catch (error) {
      console.error('Error fetching user servers:', error);
      return res.status(500).json({ error: 'Failed to fetch servers' });
    }
  });

  // Get specific server details for user
  app.get("/api/user/servers/:id", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      

      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // Get server details from VirtFusion with real-time state
      const server = await virtFusionApi.request("GET", `/servers/${serverId}?remoteState=true`);

      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Check if the server belongs to this user
      // VirtFusion API returns server data in different formats depending on endpoint
      // For individual server details, check both data.ownerId and data.owner.id
      let serverOwnerId;
      if (server.data) {
        // Individual server endpoint returns data wrapped in 'data' property
        serverOwnerId = server.data.ownerId || server.data.owner?.id || server.data.owner;
      } else {
        // Other endpoints may return server data directly
        serverOwnerId = server.ownerId || server.owner?.id || server.owner;
      }

      

      if (serverOwnerId !== user.virtFusionId) {
        
        return res.status(403).json({ error: "Access denied - server does not belong to you" });
      }

      // Transform the server data to ensure consistent status mapping
      const transformedServer = {
        ...server,
        // Add our own status mapping for consistency
        status: server.data?.state || server.data?.status || server.status || 'unknown',
        // Ensure we have the VirtFusion data structure
        data: server.data ? {
          ...server.data,
          // Normalize the state field for client consistency
          state: server.data.state || server.data.status || 'unknown'
        } : null
      };

      
      return res.json(transformedServer);
    } catch (error) {
      console.error('Error fetching server details:', error);
      return res.status(500).json({ error: 'Failed to fetch server details' });
    }
  });

  // User server password reset
  app.post("/api/user/servers/:id/reset-password", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} resetting password for server ID: ${serverId}`);

      // Get user to verify they have VirtFusion access
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // Verify the server belongs to this user using the same method as VNC endpoint
      try {
        // Get user's servers to verify ownership
        const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
        if (!userServers || !userServers.data) {
          return res.status(404).json({ error: "No servers found for user" });
        }

        // Check if the server belongs to the user
        const serverExists = userServers.data.some((server: any) => server.id === serverId);
        if (!serverExists) {
          console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to reset password for server ${serverId} which they don't own`);
          return res.status(403).json({ error: "Access denied: Server does not belong to this user" });
        }
      } catch (error: any) {
        console.error(`Error verifying server ownership for user ${userId}, server ${serverId}:`, error);
        return res.status(404).json({ error: "Server not found or access denied" });
      }

      // Use the VirtFusion API to reset the server password
      try {
        // Use the global VirtFusion API instance
        await virtFusionApi.updateSettings();
        const response = await virtFusionApi.resetServerPassword(serverId, 'root', true);

        console.log('User server password reset response:', response);

        // Extract the expected password from the API response
        let generatedPassword = null;
        if (response && response.data && response.data.expectedPassword) {
          generatedPassword = response.data.expectedPassword;
          console.log(`User server password reset successful, generated password: ${generatedPassword}`);
        } else {
          console.log('No expected password in user server reset response', response);
        }

        // Log the successful password reset action
        await serverLoggingService.logPasswordReset(
          serverId,
          userId,
          'success',
          response?.data?.queueId,
          undefined,
          req
        );

        res.json({
          success: true,
          message: "Server password reset successfully",
          data: response,
          generatedPassword: generatedPassword
        });
      } catch (error: any) {
        console.error(`Error resetting password for user server ${serverId}:`, error);

        // Log the failed password reset action
        await serverLoggingService.logPasswordReset(
          serverId,
          userId,
          'failed',
          undefined,
          error.message || "An error occurred while resetting the server password",
          req
        );

        res.status(500).json({
          error: "Failed to reset server password",
          message: error.message || "An error occurred while resetting the server password"
        });
      }
    } catch (error: any) {
      console.error(`Error in user server password reset for server ${req.params.id}:`, error);
      res.status(500).json({
        error: "Failed to reset server password",
        message: error.message || "An internal error occurred"
      });
    }
  });

  // User server power control
  app.post("/api/user/servers/:id/power/:action", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const serverId = parseInt(req.params.id);
      const action = req.params.action;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const validActions = ['boot', 'shutdown', 'restart', 'poweroff'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid power action" });
      }

      console.log(`User ${userId} requesting ${action} for server ${serverId}`);

      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // First verify the server belongs to this user
      const server = await virtFusionApi.getServer(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      // Check ownership using the same logic as the details endpoint
      let serverOwnerId;
      if (server.data) {
        serverOwnerId = server.data.ownerId || server.data.owner?.id || server.data.owner;
      } else {
        serverOwnerId = server.ownerId || server.owner?.id || server.owner;
      }

      if (serverOwnerId !== user.virtFusionId) {
        console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to control server ${serverId} owned by ${serverOwnerId}`);
        return res.status(403).json({ error: "Access denied - server does not belong to you" });
      }

      // Execute the power action
      let result;
      let powerAction: 'power_on' | 'power_off' | 'restart' | 'poweroff';

      switch (action) {
        case 'boot':
          result = await virtFusionApi.bootServer(serverId);
          powerAction = 'power_on';
          break;
        case 'shutdown':
          result = await virtFusionApi.shutdownServer(serverId);
          powerAction = 'power_off';
          break;
        case 'restart':
          result = await virtFusionApi.restartServer(serverId);
          powerAction = 'restart';
          break;
        case 'poweroff':
          result = await virtFusionApi.powerOffServer(serverId);
          powerAction = 'poweroff';
          break;
      }

      // Log the successful power action
      await serverLoggingService.logPowerAction(
        serverId,
        userId,
        powerAction,
        'success',
        result?.data?.queueId,
        undefined,
        req
      );

      console.log(`User ${userId} successfully executed ${action} on server ${serverId}`);
      return res.json({ success: true, message: `Server ${action} command sent successfully`, result });
    } catch (error: any) {
      console.error(`Error executing power action:`, error);

      // Log the failed power action if we have the necessary info
      const serverId = parseInt(req.params.id);
      const userId = req.user?.id;
      const action = req.params.action;

      if (!isNaN(serverId) && userId) {
        let powerAction: 'power_on' | 'power_off' | 'restart' | 'poweroff';
        switch (action) {
          case 'boot':
            powerAction = 'power_on';
            break;
          case 'shutdown':
            powerAction = 'power_off';
            break;
          case 'restart':
            powerAction = 'restart';
            break;
          case 'poweroff':
            powerAction = 'poweroff';
            break;
          default:
            powerAction = 'power_on'; // fallback
        }

        await serverLoggingService.logPowerAction(
          serverId,
          userId,
          powerAction,
          'failed',
          undefined,
          error.message || `Failed to execute ${action} command`,
          req
        );
      }

      return res.status(500).json({ error: `Failed to execute ${req.params.action} command` });
    }
  });

  // Get VNC status for a user's server
  app.get("/api/user/servers/:id/vnc", isAuthenticated, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} getting VNC status for server ID: ${serverId}`);

      // Get user from database
      const user = await storage.getUser(userId);

      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // Get user's servers to verify ownership
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }

      // Check if the server belongs to the user
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      // VirtFusion API only supports POST /servers/{id}/vnc (no GET)
      // This endpoint toggles VNC state and returns current status
      // WARNING: This will toggle the VNC state!
      console.log(`Making VNC API call - this will toggle VNC state for server ${serverId}`);

      // Use the global VirtFusion API instance
      await virtFusionApi.updateSettings();
      const result = await (virtFusionApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        // NOTE: This endpoint unfortunately toggles VNC state due to VirtFusion API limitations
        // We don't log this as a VNC action since it's meant to be a status check, not an intentional toggle
        // Only log VNC actions when they are intentionally triggered by user actions

        res.json({ success: true, data: result });
      } else {
        res.status(500).json({ error: "Failed to get VNC status" });
      }
    } catch (error: any) {
      console.error("Error getting VNC status:", error);
      res.status(500).json({ error: error.message });
    }
  });



  // Get server traffic statistics for user
  app.get("/api/user/servers/:id/traffic", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} fetching traffic statistics for server ${serverId}`);

      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // Get user's servers to verify ownership
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }

      // Check if the server belongs to the user
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      // Get traffic data from VirtFusion
      const trafficData = await virtFusionApi.getServerTraffic(serverId);

      if (!trafficData || !trafficData.data) {
        return res.status(404).json({ error: "Traffic data not found" });
      }

      return res.json(trafficData);
    } catch (error: any) {
      console.error(`Error fetching traffic data for server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server traffic data from VirtFusion",
        message: error.message
      });
    }
  });

  // Get server logs for user
  app.get("/api/user/servers/:id/logs", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} fetching logs for server ${serverId}`);

      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      // Get user's servers to verify ownership
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }

      // Check if the server belongs to the user
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      // Parse query parameters for filtering
      const actionType = req.query.actionType as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      // Get server logs with user information
      const logs = await storage.getServerLogsWithUser(serverId, {
        actionType,
        startDate,
        endDate,
        limit,
        offset
      });

      // Get total count for pagination
      const totalCount = await storage.getServerLogCount(serverId, {
        actionType,
        startDate,
        endDate
      });

      return res.json({
        logs,
        totalCount,
        hasMore: offset + limit < totalCount
      });
    } catch (error: any) {
      console.error(`Error fetching server logs for server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server logs",
        message: error.message
      });
    }
  });

  // ----- Server Management Routes -----
  // All servers are now managed directly through VirtFusion, these routes now just return empty data

  // All server endpoints have been removed as requested

  // ----- Self Service Resource Pack Routes -----

  // Get all available resource packs
  app.get("/api/resource-packs", isAuthenticated, async (req, res) => {
    // Return empty array - direct VirtFusion integration
    res.json([]);
  });

  // Get a specific resource pack
  app.get("/api/resource-packs/:id", isAuthenticated, async (req, res) => {
    // Direct VirtFusion integration
    res
      .status(501)
      .json({ error: "Not implemented - direct VirtFusion integration" });
  });

  // Create a new resource pack
  app.post("/api/resource-packs", isAdmin, async (req, res) => {
    // Direct VirtFusion integration
    res
      .status(501)
      .json({ error: "Not implemented - direct VirtFusion integration" });
  });

  // Delete a resource pack
  app.delete("/api/resource-packs/:id", isAdmin, async (req, res) => {
    // Direct VirtFusion integration
    res
      .status(501)
      .json({ error: "Not implemented - direct VirtFusion integration" });
  });

  // Add server to resource pack or delete servers in a pack
  app.post("/api/resource-packs/:id/servers", isAdmin, async (req, res) => {
    // Direct VirtFusion integration
    res
      .status(501)
      .json({ error: "Not implemented - direct VirtFusion integration" });
  });

  // ----- Client Server Management Routes -----

  // Client-facing server creation endpoint removed
  app.post("/api/servers", isAuthenticated, async (req, res) => {
    // Client server creation functionality removed
    res.status(501).json({ error: "Server creation functionality has been removed" });
  });

  // Client build server endpoint removed

  // Get client-accessible packages with pricing
  app.get("/api/packages", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching packages for client");

      // Get packages from VirtFusion
      const packagesResponse = await virtFusionApi.getPackages();

      if (!packagesResponse) {
        return res.json([]);
      }

      // Convert to array if it's not already
      const packagesArray = Array.isArray(packagesResponse) ? packagesResponse : packagesResponse.data || [];

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

      // Filter enabled packages and add pricing data with SLA information
      const clientPackages = packagesArray
        .filter(pkg => pkg.enabled) // Only show enabled packages to clients
        .map(pkg => {
          const pricingRecord = pricingMap[pkg.id];
          return {
            ...pkg,
            price: pricingRecord ? pricingRecord.price / 100 : null, // Add direct price property for backward compatibility
            pricing: pricingRecord ? {
              price: pricingRecord.price / 100, // Convert cents to dollars
              displayOrder: pricingRecord.displayOrder,
              enabled: pricingRecord.enabled
            } : null,
            category: pricingRecord?.category || null,
            sla: pricingRecord?.sla || null,
            sla_plan: pricingRecord?.sla || null // Add alternative property name for backward compatibility
          };
        })
        .filter(pkg => !pkg.pricing || pkg.pricing.enabled) // Only show packages with enabled pricing
        .sort((a, b) => {
          // Sort by display order if available, otherwise by name
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

  // Client hypervisor endpoint removed

  // Client template endpoint removed

  // Get cloud pricing settings (client-accessible)
  app.get("/api/cloud-pricing", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching cloud pricing settings for client");

      // Get cloud pricing settings from database
      const settingsArray = await storage.getAllSettings();

      // Convert settings array to object for easier access
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
        // Enable/disable flags
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

  // ----- VirtFusion Token Management Routes -----
  // Note: Legacy credit management has been removed.
  // All billing is now handled exclusively through VirtFusion tokens.

  // ----- IP Address Management Routes -----

  // Get all available IP addresses
  app.get("/api/ip-addresses", isAuthenticated, async (req, res) => {
    try {
      // Since we no longer have IP addresses in the database,
      // we need to fetch them from VirtFusion API directly
      await virtFusionApi.updateSettings();
      const ipBlocksResponse = await virtFusionApi.getIpBlocks();

      // Format the response to match what the frontend expects
      const formattedAddresses = [];

      if (
        ipBlocksResponse &&
        ipBlocksResponse.data &&
        Array.isArray(ipBlocksResponse.data)
      ) {
        // Transform VirtFusion IP data to the format our frontend expects
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
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
      // Return an empty array instead of an error to prevent frontend issues
      res.json([]);
    }
  });

  // All server IP management endpoints have been removed as requested

  // ----- Storage Volume Management Routes -----

  // Get all storage volumes
  app.get("/api/storage-volumes", isAuthenticated, async (req, res) => {
    // Direct VirtFusion integration - return empty array
    res.json([]);
  });

  // Storage-related endpoints not needed - direct VirtFusion integration

  // ----- Billing Routes -----

  // Get user's transactions
  app.get("/api/transactions", isAuthenticated, async (req, res) => {
    try {
      const transactions = await storage.getUserTransactions(req.user!.id);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // IMPORTANT: Static routes must come before dynamic routes with parameters
  // Export transactions as PDF
  app.get("/api/transactions/export", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const user = req.user!;

      // Get transactions for the user or all transactions for admin
      let transactions;
      if (isAdmin && req.query.all === 'true') {
        // Get transactions with search parameters for admin
        transactions = await storage.searchTransactions({
          userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          status: req.query.status as string | undefined,
          type: req.query.type as string | undefined,
          search: req.query.search as string | undefined,
        });
      } else {
        // Get only user's transactions
        transactions = await storage.getUserTransactions(userId);
      }

      // Get company settings for branding
      const companyName = await storage.getSetting('company_name');
      const companyNameValue = companyName?.value || 'Your Company';
      const companyLogo = await storage.getSetting('company_logo');
      const companyLogoValue = companyLogo?.value || '';



      // Generate PDF
      const doc = new PDFDocument({ margin: 50 });

      // Buffer to store PDF data
      let buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));

      // Format the document with transaction data
      formatTransactionsPdf(doc, transactions, user, companyNameValue, companyLogoValue);

      // Finalize the PDF and convert to base64
      doc.end();

      // Generate a promise from the events
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
      });

      // Get the completed PDF data
      const pdfBuffer = await pdfPromise;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.pdf"`);

      // Send the PDF content
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific transaction by ID - must come after specific static routes
  app.get("/api/transactions/:id", isAuthenticated, async (req, res) => {
    try {
      // Validate transaction ID
      const transactionIdStr = req.params.id;
      if (!transactionIdStr || isNaN(parseInt(transactionIdStr))) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }

      const transactionId = parseInt(transactionIdStr);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';



      // Get the specific transaction
      const transaction = await storage.getTransaction(transactionId);

      // Check if transaction exists and belongs to the user (or user is admin)
      if (!transaction || (!isAdmin && transaction.userId !== userId)) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // If admin is requesting, include user data
      if (isAdmin) {
        const transactionUser = await storage.getUser(transaction.userId);
        const transactionWithUser = {
          ...transaction,
          user: transactionUser ? {
            id: transactionUser.id,
            username: transactionUser.username || transactionUser.fullName || `User #${transactionUser.id}`,
            email: transactionUser.email || 'No email available'
          } : undefined
        };

        // Log the transaction being returned


        res.json(transactionWithUser);
      } else {
        // Log the transaction being returned


        res.json(transaction);
      }
    } catch (error: any) {
      console.error("Error retrieving transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Helper function to format transaction descriptions
  function formatTransactionDescriptionForPdf(description: string): string {
    if (!description) return 'N/A';

    let formattedDescription = description;

    // Fix arrow symbol formatting issues in PDF generation
    // Replace corrupted arrow symbols with proper directional arrows
    formattedDescription = formattedDescription.replace(/\s*!\'\s*/g, ' → '); // Fix corrupted upgrade arrow
    formattedDescription = formattedDescription.replace(/\s*'!\s*/g, ' ← '); // Fix corrupted downgrade arrow

    // Also handle other potential corrupted arrow variations
    formattedDescription = formattedDescription.replace(/\s*[!'"]+\s*/g, ' → '); // Generic corrupted arrow fix

    // Ensure proper spacing around arrows
    formattedDescription = formattedDescription.replace(/\s*→\s*/g, ' → ');
    formattedDescription = formattedDescription.replace(/\s*←\s*/g, ' ← ');

    return formattedDescription;
  }

  // Helper function to format payment methods
  function formatPaymentMethodForPdf(paymentMethod: string): string {
    if (!paymentMethod) return 'N/A';

    // Handle payment methods
    switch (paymentMethod.toLowerCase()) {
      case 'paypal':
        return 'PayPal';
      case 'virtfusion_tokens':
        return 'VirtFusion Tokens';
      case 'credit':
        return 'VirtFusion Credits';
      case 'stripe':
        return 'Credit Card (Stripe)';
      default:
        return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
    }
  }

  // Helper function to format a single transaction PDF
  function formatSingleTransactionPdf(doc: PDFKit.PDFDocument, transaction: any, user: any, companyName: string, companyLogo: string) {
    // Debug transaction data
    

    // Add logo if available
    if (companyLogo) {
      try {
        // If logo is a data URL (base64)
        if (companyLogo.startsWith('data:image')) {
          const base64Data = companyLogo.split(',')[1];
          if (base64Data) {
            const logoBuffer = Buffer.from(base64Data, 'base64');
            doc.image(logoBuffer, 50, 45, { width: 150 });
          }
        } else {
          // If logo is a URL
          doc.image(companyLogo, 50, 45, { width: 150 });
        }
      } catch (err) {
        console.error('Error adding logo to PDF:', err);
        // Continue without logo if there's an error
      }
    }

    // Document title
    doc.fontSize(20).text(companyName, 50, companyLogo ? 130 : 50);
    doc.fontSize(15).text('Transaction Receipt', 50, doc.y + 10);

    // Customer details
    doc.moveDown();
    doc.fontSize(10).text(`Customer: ${user.fullName || user.username || 'Customer'}`);
    doc.text(`Account ID: ${user.id}`);
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`);

    // Add horizontal line
    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Transaction details header
    doc.fontSize(12).font('Helvetica-Bold').text('Transaction Details', 50, doc.y + 10);
    doc.font('Helvetica').moveDown();

    // Ensure transaction.createdAt exists and can be parsed
    let dateStr = 'N/A';
    if (transaction.createdAt) {
      try {
        dateStr = new Date(transaction.createdAt).toLocaleDateString();
      } catch (e) {
        console.error('Error formatting date:', e);
      }
    }

    // Transaction information in a more structured layout with appropriate spacing
    const labelWidth = 120;  // Increased width for labels
    const valueWidth = 170;  // Fixed width for values to prevent overlap
    const leftColX = 50;
    const rightColX = 300;
    const lineHeight = 25;   // Increased line height to avoid overlap
    let currentY = doc.y;

    // Create helper function to add a field with proper wrapping
    const addField = (label: string, value: string, x: number, y: number) => {
      doc.fontSize(10).font('Helvetica-Bold').text(label, x, y);
      doc.font('Helvetica').text(
        value || 'N/A',
        x + labelWidth,
        y,
        { width: valueWidth, ellipsis: true }
      );
    };

    // Row 1
    addField('Transaction ID:', `#${transaction.id || 'Unknown'}`, leftColX, currentY);
    addField('Date:', dateStr, rightColX, currentY);
    currentY += lineHeight;

    // Row 2
    addField('Type:', transaction.type || 'N/A', leftColX, currentY);
    addField('Status:', transaction.status || 'N/A', rightColX, currentY);
    currentY += lineHeight;

    // Row 3 - For description, use the full width
    doc.fontSize(10).font('Helvetica-Bold').text('Description:', leftColX, currentY);
    doc.font('Helvetica').text(
      formatTransactionDescriptionForPdf(transaction.description),
      leftColX + labelWidth,
      currentY,
      { width: 380, ellipsis: true }
    );
    currentY += lineHeight;

    // Row 4 - Payment details if available
    if (transaction.paymentMethod) {
      addField('Payment Method:', formatPaymentMethodForPdf(transaction.paymentMethod), leftColX, currentY);
      currentY += lineHeight;
    }

    if (transaction.paymentId) {
      addField('Payment ID:', transaction.paymentId, leftColX, currentY);
      currentY += lineHeight;
    }

    // Add amount with appropriate color - carefully handle type and ensure amount is a number
    const isCredit = transaction.type === 'credit' || transaction.type === 'virtfusion_credit';
    let amount = 0;
    try {
      amount = typeof transaction.amount === 'number'
        ? transaction.amount
        : parseFloat(transaction.amount);
    } catch (e) {
      console.error('Error parsing transaction amount:', e);
    }

    doc.moveDown(2);
    doc.fontSize(14).font('Helvetica-Bold').text('Amount:', 50, doc.y);
    doc.fillColor(isCredit ? '#4CAF50' : '#FF5252')
      .fontSize(16)
      .text(
        `${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`,
        150, doc.y - 14
      );

    // Reset fill color
    doc.fillColor('#000000');

    // Add line and footer
    doc.moveDown(2);
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Footer with thank you note
    doc.fontSize(10).text('Thank you for your business.', 50, doc.y);
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, 50, doc.y + 5);
  }

  // Helper function to format transactions PDF
  function formatTransactionsPdf(doc: PDFKit.PDFDocument, transactions: any[], user: any, companyName: string, companyLogo: string) {
    // Add logo if available
    if (companyLogo) {
      try {
        // If logo is a data URL (base64)
        if (companyLogo.startsWith('data:image')) {
          const base64Data = companyLogo.split(',')[1];
          if (base64Data) {
            const logoBuffer = Buffer.from(base64Data, 'base64');
            doc.image(logoBuffer, 50, 45, { width: 150 });
          }
        } else {
          // If logo is a URL
          doc.image(companyLogo, 50, 45, { width: 150 });
        }
      } catch (err) {
        console.error('Error adding logo to PDF:', err);
        // Continue without logo if there's an error
      }
    }

    // Document title
    doc.fontSize(20).text(companyName, 50, companyLogo ? 130 : 50);
    doc.fontSize(15).text('Transaction Statement', 50, doc.y + 10);

    // Customer details
    doc.moveDown();
    doc.fontSize(10).text(`Customer: ${user.fullName || user.username || 'Customer'}`);
    doc.text(`Account ID: ${user.id}`);
    doc.text(`Statement Date: ${new Date().toLocaleDateString()}`);

    // Add horizontal line
    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // If no transactions
    if (transactions.length === 0) {
      doc.fontSize(12).text('No transactions found for this account.', 50, doc.y + 10);
      return;
    }

    // Table headers
    const tableTop = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Transaction ID', 50, tableTop);
    doc.text('Date', 130, tableTop);
    doc.text('Description', 190, tableTop);
    doc.text('Type', 350, tableTop);
    doc.text('Status', 420, tableTop);
    doc.text('Amount', 490, tableTop, { width: 60, align: 'right' });

    // Reset font
    doc.font('Helvetica');

    // Draw line under headers
    doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();

    // Table rows
    let y = doc.y + 10;
    let totalCredit = 0;
    let totalDebit = 0;

    transactions.forEach((transaction, i) => {
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        y = 50;

        // Add headers on new page
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Transaction ID', 50, y);
        doc.text('Date', 130, y);
        doc.text('Description', 190, y);
        doc.text('Type', 350, y);
        doc.text('Status', 420, y);
        doc.text('Amount', 490, y, { width: 60, align: 'right' });

        // Reset font
        doc.font('Helvetica');

        // Draw line under headers
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, y + 15).lineTo(550, y + 15).stroke();

        y += 25;
      }

      // Format date
      const date = transaction.createdAt
        ? new Date(transaction.createdAt).toLocaleDateString()
        : 'N/A';

      // Format amount
      const amount = parseFloat(transaction.amount);
      const isCredit = transaction.type === 'credit' || transaction.type === 'virtfusion_credit';

      // Track totals
      if (isCredit) {
        totalCredit += amount;
      } else {
        totalDebit += Math.abs(amount);
      }

      // Alternating row background for readability
      if (i % 2 === 1) {
        doc.rect(50, y - 3, 500, 20).fill('#f6f6f6');
      }

      // Draw row content
      doc.fillColor('#000000');
      doc.fontSize(8).text(transaction.id ? `#${transaction.id}` : 'N/A', 50, y);
      doc.text(date, 130, y);
      doc.text(formatTransactionDescriptionForPdf(transaction.description), 190, y, {
        width: 150,
        ellipsis: true
      });
      doc.text(transaction.type || '', 350, y);
      doc.text(transaction.status || '', 420, y);

      // Amount with color based on type
      doc.fillColor(isCredit ? '#4CAF50' : '#FF5252')
        .text(
          `${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`,
          490, y,
          { width: 60, align: 'right' }
        );

      doc.fillColor('#000000'); // Reset color

      y += 20;
    });

    // Summary section
    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    doc.fontSize(10);
    doc.font('Helvetica-Bold').text('Summary', 50, doc.y);
    doc.font('Helvetica');
    doc.moveDown(0.5);

    doc.text(`Total Credits: $${totalCredit.toFixed(2)}`, 50, doc.y);
    doc.text(`Total Debits: $${totalDebit.toFixed(2)}`, 50, doc.y + 15);
    doc.font('Helvetica-Bold').text(`Net Balance: $${(totalCredit - totalDebit).toFixed(2)}`, 50, doc.y + 30);

    // Footer
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);

      // Add page number
      doc.fontSize(8).text(
        `Page ${i - range.start + 1} of ${range.count}`,
        50, 780,
        { align: 'center', width: 500 }
      );

      // Add footer text
      doc.fontSize(8).text(
        `This statement was generated on ${new Date().toLocaleString()}. For questions, please contact support.`,
        50, 795,
        { align: 'center', width: 500 }
      );
    }
  }

  // Get current balance (VirtFusion tokens only)
  app.get("/api/billing/balance", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Initialize response with VirtFusion data only
      const response = {
        virtFusionCredits: 0,
        virtFusionTokens: 0
      };

      // If user has VirtFusion account linked, fetch their tokens
      if (user.virtFusionId) {
        try {
          await virtFusionApi.updateSettings();
          if (virtFusionApi.isConfigured()) {
            // Use the VirtFusion API to get user hourly stats (which contains credit info)
            const virtFusionData = await virtFusionApi.getUserHourlyStats(user.id);

            if (virtFusionData?.data?.credit?.tokens) {
              const tokenAmount = parseFloat(virtFusionData.data.credit.tokens);
              const dollarAmount = tokenAmount / 100; // 100 tokens = $1.00 USD

              response.virtFusionTokens = tokenAmount || 0;
              response.virtFusionCredits = dollarAmount || 0;
            }
          }
        } catch (virtFusionError) {
          console.error("Error fetching VirtFusion credits:", virtFusionError);
          // Return empty VirtFusion data if API call fails
        }
      }

      res.json(response);
    } catch (error: any) {
      console.error(`Error fetching balance:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add VirtFusion tokens via PayPal
  app.post("/api/billing/add-credits", isAuthenticated, async (req, res) => {
    try {
      const { amount, paymentId, verificationData } = req.body;

      if (!amount || amount <= 0 || !paymentId) {
        return res.status(400).json({ error: "Invalid amount or payment ID" });
      }

      // Validate amount limits (minimum $1, maximum $1000)
      if (amount < 1) {
        return res.status(400).json({ error: "Minimum amount is $1.00" });
      }

      if (amount > 1000) {
        return res.status(400).json({ error: "Maximum amount is $1000.00" });
      }

      // Verify we have verification data
      if (!verificationData || !verificationData.verified) {
        console.error("Payment not verified through server-side validation");
        return res.status(400).json({
          error: "Payment verification failed. Please try again.",
          needsVerification: true
        });
      }

      // Compare amounts for extra security
      if (verificationData.amount !== amount) {
        console.error(`Amount mismatch: verified=${verificationData.amount}, requested=${amount}`);
        return res.status(400).json({
          error: "Payment amount doesn't match the verification data",
          needsVerification: true
        });
      }

      // Check if the user has a VirtFusion ID
      if (!req.user!.virtFusionId) {
        return res.status(400).json({
          error: "Your account is not linked to VirtFusion yet. Please contact support.",
          needsSync: true
        });
      }

      // Check VirtFusion API configuration
      await virtFusionApi.updateSettings();

      // Validate VirtFusion API settings before proceeding
      if (!virtFusionApi.isConfigured()) {
        console.error("VirtFusion API is not properly configured");
        return res.status(500).json({
          error: "VirtFusion API configuration is incomplete. Please contact support.",
          details: "Missing API URL or token"
        });
      }

      // Calculate the number of tokens to add to VirtFusion
      const tokens = amount * 100; // $1 = 100 tokens
      console.log(`Converting $${amount} to ${tokens} VirtFusion tokens`);

      // Get user's balance BEFORE adding tokens (to detect negative balance)
      let initialBalance = 0;
      try {
        console.log("Fetching user's initial VirtFusion balance");
        const balanceData = await virtFusionApi.getUserHourlyStats(req.user!.id);

        if (balanceData?.data?.credit?.tokens) {
          const tokenAmount = parseFloat(balanceData.data.credit.tokens);
          const dollarAmount = tokenAmount / 100; // Convert tokens to dollars
          initialBalance = dollarAmount;
          console.log(`User's initial balance: ${initialBalance.toFixed(2)} USD (${tokenAmount} tokens)`);
        } else {
          console.log("Could not determine user's initial balance, defaulting to 0");
        }
      } catch (balanceError) {
        console.error("Error fetching initial balance:", balanceError);
        // Continue with initial balance of 0 if we can't fetch it
      }

      // Create a new transaction locally for record keeping
      const transaction: InsertTransaction = {
        userId: req.user!.id,
        amount: amount,
        type: "virtfusion_credit",
        description: "VirtFusion token purchase via PayPal",
        status: "pending",
        paymentMethod: "paypal",
        paymentId: paymentId,
      };

      console.log("Creating transaction record:", transaction);
      const createdTransaction = await storage.createTransaction(transaction);
      console.log("Transaction created with ID:", createdTransaction.id);

      try {
        // Test connection to VirtFusion API before proceeding
        try {
          console.log("Testing VirtFusion API connection before adding tokens");
          await virtFusionApi.testConnection();
          console.log("VirtFusion API connection successful");
        } catch (connectionError: any) {
          console.error("VirtFusion API connection test failed:", connectionError);
          throw new Error(`VirtFusion API connection failed: ${connectionError.message}`);
        }

        // Add tokens to VirtFusion account
        const extRelationId = req.user!.id; // Use user ID as extRelationId
        console.log(`Adding ${tokens} tokens to VirtFusion user with extRelationId: ${extRelationId}`);

        // First check if the user exists in VirtFusion
        console.log(`Verifying user exists in VirtFusion with extRelationId: ${extRelationId}`);
        try {
          const userCheckResult = await virtFusionApi.getUserByExtRelationId(extRelationId);
          console.log("User verification successful:", userCheckResult);
        } catch (verifyError: any) {
          console.error("User verification failed:", verifyError);
          throw new Error(`Failed to verify user in VirtFusion: ${verifyError.message}`);
        }

        // Format the data for VirtFusion API
        const tokenData = {
          tokens: tokens,
          reference_1: createdTransaction.id,
          reference_2: `PayPal payment ID: ${paymentId}`
        };

        console.log(`Sending to VirtFusion API with extRelationId=${extRelationId}:`, tokenData);

        // Call the VirtFusion API to add tokens
        const virtFusionResult = await virtFusionApi.addCreditToUser(
          extRelationId,
          tokenData
        );

        console.log("VirtFusion token add response:", virtFusionResult);

        // Extract VirtFusion credit ID from the response
        const virtFusionCreditId = virtFusionResult?.data?.id;
        console.log("VirtFusion credit ID:", virtFusionCreditId);

        // Mark the transaction as completed and store the VirtFusion credit ID
        console.log(`Updating transaction ${createdTransaction.id} status to completed with credit ID: ${virtFusionCreditId}`);
        await storage.updateTransaction(createdTransaction.id, {
          status: "completed",
          virtFusionCreditId: virtFusionCreditId ? String(virtFusionCreditId) : null,
          description: virtFusionCreditId
            ? `VirtFusion token purchase via PayPal (Credit ID: ${virtFusionCreditId})`
            : "VirtFusion token purchase via PayPal"
        });

        // Get user's balance AFTER adding tokens to detect negative balance deduction
        try {
          console.log("Fetching user's updated VirtFusion balance");
          const updatedBalanceData = await virtFusionApi.getUserHourlyStats(req.user!.id);

          if (updatedBalanceData?.data?.credit?.tokens) {
            const updatedTokens = parseFloat(updatedBalanceData.data.credit.tokens);
            const updatedBalance = updatedTokens / 100; // Convert tokens to dollars
            console.log(`User's updated balance: ${updatedBalance.toFixed(2)} USD (${updatedTokens} tokens)`);

            // Calculate the expected balance increase
            const expectedBalance = initialBalance + amount;
            console.log(`Expected balance after adding $${amount}: $${expectedBalance.toFixed(2)}`);
            // Check if there was a negative balance deduction
            if (initialBalance < 0) {
              // When initial balance is negative, calculate how much was actually deducted
              // If the user had -$3.50 and added $5.00, they should have $1.50
              // But if VirtFusion deducted the negative balance, they might have less
              const expectedBalance = initialBalance + amount;

              // Force the deduction amount to be at least the absolute value of the negative balance
              // This ensures we always show the proper amount that was deducted to cover the negative balance
              const deductionAmount = Math.abs(initialBalance); // Use the actual negative balance amount

              console.log(`Initial balance: $${initialBalance.toFixed(2)}`);
              console.log(`Added amount: $${amount.toFixed(2)}`);
              console.log(`Expected balance: $${expectedBalance.toFixed(2)}`);
              console.log(`Actual balance: $${updatedBalance.toFixed(2)}`);
              console.log(`Deduction amount: $${deductionAmount.toFixed(2)}`);

              // Always create the deduction transaction when there was a negative balance
              if (deductionAmount > 0) {
                const deductionTransaction: InsertTransaction = {
                  userId: req.user!.id,
                  amount: deductionAmount * -1, // Store as negative amount
                  type: "virtfusion_deduction",
                  description: `Automatic deduction to cover negative balance (linked to transaction #${createdTransaction.id})`,
                  status: "completed", // This is an automatic process that's already completed
                  paymentMethod: "paypal", // Same as the original transaction
                  paymentId: paymentId, // Same as the original transaction
                };

                console.log("Creating deduction transaction record:", deductionTransaction);
                const createdDeductionTransaction = await storage.createTransaction(deductionTransaction);
                console.log("Deduction transaction created with ID:", createdDeductionTransaction.id);
              } else {
                console.log("No significant negative balance deduction detected");
              }
            } else {
              console.log("No negative balance deduction detected");
            }
          } else {
            console.log("Could not determine user's updated balance");
          }
        } catch (balanceError) {
          console.error("Error fetching updated balance:", balanceError);
          // Continue without creating deduction record if we can't fetch the updated balance
        }

        res.json({
          success: true,
          tokensAdded: tokens,
          amountPaid: amount,
          virtFusionResponse: virtFusionResult
        });

      } catch (virtFusionError: any) {
        console.error("VirtFusion API error:", virtFusionError);

        // Update transaction status to failed
        console.log(`Updating transaction ${createdTransaction.id} status to failed`);
        await storage.updateTransaction(createdTransaction.id, {
          status: "failed",
          description: `${transaction.description} (VirtFusion sync failed: ${virtFusionError.message})`
        });

        return res.status(500).json({
          error: "Failed to add tokens to VirtFusion account",
          details: virtFusionError.message
        });
      }
    } catch (error: any) {
      console.error(`Error processing VirtFusion token purchase:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify PayPal payment with server-side validation
  app.post("/api/billing/verify-paypal-payment", isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.body;

      console.log(`Verifying PayPal payment: orderId=${orderId}`);

      if (!orderId) {
        console.log("Missing PayPal order ID");
        return res.status(400).json({ error: "PayPal order ID is required" });
      }

      // Check if we're in sandbox mode
      const isSandbox = process.env.VITE_PAYPAL_SANDBOX === "true";
      const paypalBaseUrl = isSandbox
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      // Get credentials
      const clientId = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
        : (process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
      const clientSecret = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_SECRET
        : (process.env.VITE_PAYPAL_SECRET || process.env.PAYPAL_SECRET);

      if (!clientId || !clientSecret) {
        console.error("PayPal credentials are not configured");
        return res.status(500).json({
          error: "PayPal integration is not properly configured. Please contact support.",
          details: "Missing API credentials"
        });
      }

      // Get access token
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error("PayPal token error:", errorData);
        throw new Error(`Failed to get PayPal access token: ${errorData.error_description || 'Unknown error'}`);
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Capture the payment from the order
      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureResponse.ok) {
        const errorData = await captureResponse.json();
        console.error("PayPal payment capture error:", errorData);
        throw new Error(`Failed to capture PayPal payment: ${errorData.details?.[0]?.description || errorData.message || 'Unknown error'}`);
      }

      const captureData = await captureResponse.json();
      console.log("PayPal payment capture successful:", {
        id: captureData.id,
        status: captureData.status,
      });

      // Verify that the payment status is COMPLETED
      if (captureData.status !== 'COMPLETED') {
        console.error(`PayPal payment not completed. Status: ${captureData.status}`);
        return res.status(400).json({
          error: `PayPal payment could not be completed (status: ${captureData.status}). Please try again or contact support.`,
        });
      }

      // Extract payment amount from the captured data
      if (!captureData.purchase_units || captureData.purchase_units.length === 0) {
        throw new Error("Invalid capture data: missing purchase units");
      }

      const purchaseUnit = captureData.purchase_units[0];
      const capture = purchaseUnit.payments?.captures?.[0];

      if (!capture) {
        throw new Error("Invalid capture data: missing payment capture information");
      }

      const amount = parseFloat(capture.amount.value);
      const currency = capture.amount.currency_code;

      console.log(`Captured payment: ${amount} ${currency}, Order ID: ${orderId}`);

      // Return payment verification result
      return res.json({
        verified: true,
        orderId: captureData.id,
        status: captureData.status,
        amount,
        currency,
      });
    } catch (error: any) {
      console.error("Error verifying PayPal order:", error);
      return res.status(500).json({
        error: "Failed to verify payment with PayPal. Please try again or contact support.",
        details: error.message
      });
    }
  });

  // Custom Credits System Endpoints

  // DNS Plans Management Endpoints

  // Get all available DNS plans
  app.get("/api/dns-plans", async (req, res) => {
    try {
      const plans = await db.select()
        .from(dnsPlansTable)
        .where(eq(dnsPlansTable.isActive, true))
        .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.price);

      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching DNS plans:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's DNS plan subscriptions
  app.get("/api/dns-plans/subscriptions", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      const subscriptions = await db.select({
        id: dnsPlanSubscriptionsTable.id,
        planId: dnsPlanSubscriptionsTable.planId,
        status: dnsPlanSubscriptionsTable.status,
        startDate: dnsPlanSubscriptionsTable.startDate,
        endDate: dnsPlanSubscriptionsTable.endDate,
        autoRenew: dnsPlanSubscriptionsTable.autoRenew,
        lastPaymentDate: dnsPlanSubscriptionsTable.lastPaymentDate,
        nextPaymentDate: dnsPlanSubscriptionsTable.nextPaymentDate,
        createdAt: dnsPlanSubscriptionsTable.createdAt,
        plan: {
          id: dnsPlansTable.id,
          name: dnsPlansTable.name,
          description: dnsPlansTable.description,
          price: dnsPlansTable.price,
          maxDomains: dnsPlansTable.maxDomains,
          maxRecords: dnsPlansTable.maxRecords,
          features: dnsPlansTable.features
        }
      })
        .from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(eq(dnsPlanSubscriptionsTable.userId, userId))
        .orderBy(desc(dnsPlanSubscriptionsTable.createdAt));

      res.json(subscriptions);
    } catch (error: any) {
      console.error("Error fetching DNS plan subscriptions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase a DNS plan using custom credits
  app.post("/api/dns-plans/purchase", isAuthenticated, async (req, res) => {
    try {
      const { planId } = req.body;
      const userId = req.user!.id;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      // Get the DNS plan
      const [plan] = await db.select()
        .from(dnsPlansTable)
        .where(and(eq(dnsPlansTable.id, planId), eq(dnsPlansTable.isActive, true)))
        .limit(1);

      if (!plan) {
        return res.status(404).json({ error: "DNS plan not found or inactive" });
      }

      // ENFORCE SINGLE-PLAN-PER-USER: Check if user has ANY active DNS plan subscription
      const existingActiveSubscriptions = await db.select()
        .from(dnsPlanSubscriptionsTable)
        .where(and(
          eq(dnsPlanSubscriptionsTable.userId, userId),
          eq(dnsPlanSubscriptionsTable.status, 'active')
        ));

      if (existingActiveSubscriptions.length > 0) {
        // Check if they already have this specific plan
        const hasThisPlan = existingActiveSubscriptions.some(sub => sub.planId === planId);
        if (hasThisPlan) {
          return res.status(400).json({ error: "You already have an active subscription for this plan" });
        } else {
          // They have a different plan - redirect to change endpoint
          return res.status(400).json({
            error: "You already have an active DNS plan. Use the plan change feature to upgrade or downgrade.",
            shouldUseChangeEndpoint: true,
            currentPlans: existingActiveSubscriptions.map(sub => sub.planId)
          });
        }
      }

      // Get user for VirtFusion integration
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.virtFusionId) {
        return res.status(400).json({ error: "User is not linked to VirtFusion" });
      }

      // Check VirtFusion token balance
      await virtFusionApi.updateSettings();

      if (!virtFusionApi.isConfigured()) {
        return res.status(500).json({ error: "VirtFusion API not configured" });
      }

      // Get user's VirtFusion balance
      let virtFusionBalance = 0;
      try {
        const balanceResponse = await virtFusionApi.getUserBalance(user.virtFusionId);
        virtFusionBalance = balanceResponse?.data?.balance || 0;
      } catch (error: any) {
        console.error("Error fetching VirtFusion balance:", error);
        return res.status(500).json({ error: "Failed to check VirtFusion balance" });
      }

      // Convert plan price to tokens (assuming 1 USD = 100 tokens)
      const tokensRequired = plan.price * 100;

      if (virtFusionBalance < tokensRequired) {
        return res.status(400).json({
          error: "Insufficient VirtFusion tokens",
          required: tokensRequired,
          available: virtFusionBalance
        });
      }
      const now = new Date();

      // Calculate billing cycle end date - always end on the 1st of the next month
      // This ensures monthly billing cycles align with calendar months starting on the 1st
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0); // 1st of next month
      const endDate = new Date(nextFirstOfMonth.getTime() - 1); // End of current billing cycle (last millisecond before next 1st)
      const nextPaymentDate = nextFirstOfMonth; // Next billing date is always the 1st of next month

      // Create transaction record in main transactions table
      const transaction: InsertTransaction = {
        userId: userId,
        amount: -plan.price, // Negative for debit
        type: "dns_plan_purchase",
        description: `DNS Plan Purchase: ${plan.name} using VirtFusion tokens`,
        status: "completed",
        paymentMethod: "virtfusion_tokens"
      };

      const createdTransaction = await storage.createTransaction(transaction);

      // Deduct tokens from VirtFusion using the correct method
      try {
        await virtFusionApi.removeCreditFromUserByExtRelationId(userId, {
          tokens: tokensRequired,
          reference_1: createdTransaction.id,
          reference_2: `DNS Plan Purchase: ${plan.name}`
        });
      } catch (error: any) {
        console.error("Error deducting VirtFusion tokens:", error);
        // Update transaction status to failed
        await storage.updateTransaction(createdTransaction.id, {
          status: "failed",
          description: `DNS Plan Purchase: ${plan.name} using VirtFusion tokens (Failed to deduct tokens)`
        });
        return res.status(500).json({ error: "Failed to deduct VirtFusion tokens" });
      }

      // Create DNS plan subscription
      await db.insert(dnsPlanSubscriptionsTable).values({
        userId: userId,
        planId: plan.id,
        status: 'active',
        startDate: now,
        endDate: endDate,
        autoRenew: true,
        lastPaymentDate: now,
        nextPaymentDate: nextPaymentDate
      });

      console.log(`User ${userId} purchased DNS plan ${plan.name} for ${tokensRequired} VirtFusion tokens`);

      res.json({
        success: true,
        message: `Successfully purchased ${plan.name} plan`,
        subscription: {
          planId: plan.id,
          planName: plan.name,
          startDate: now,
          endDate: endDate,
          nextPaymentDate: nextPaymentDate
        },
        tokensDeducted: tokensRequired
      });

    } catch (error: any) {
      console.error("Error purchasing DNS plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Change DNS plan (upgrade/downgrade) with prorated billing
  app.post("/api/dns-plans/change", isAuthenticated, async (req, res) => {
    try {
      const { planId, selectedDomainIds } = req.body;
      const userId = req.user!.id;

      console.log(`=== DNS PLAN CHANGE REQUEST ===`);
      console.log(`User ID: ${userId}`);
      console.log(`Target Plan ID: ${planId}`);
      console.log(`Selected Domain IDs:`, selectedDomainIds);

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      // Get the new plan
      const [newPlan] = await db.select()
        .from(dnsPlansTable)
        .where(and(
          eq(dnsPlansTable.id, planId),
          eq(dnsPlansTable.isActive, true)
        ))
        .limit(1);

      if (!newPlan) {
        return res.status(404).json({ error: "DNS plan not found or inactive" });
      }

      // Get ALL user's current active subscriptions (enforce single plan system)
      const activeSubscriptions = await db.select({
        id: dnsPlanSubscriptionsTable.id,
        planId: dnsPlanSubscriptionsTable.planId,
        endDate: dnsPlanSubscriptionsTable.endDate,
        plan: {
          id: dnsPlansTable.id,
          name: dnsPlansTable.name,
          price: dnsPlansTable.price,
          maxDomains: dnsPlansTable.maxDomains,  // CRITICAL FIX: Include maxDomains for downgrade logic
          maxRecords: dnsPlansTable.maxRecords
        }
      })
        .from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(and(
          eq(dnsPlanSubscriptionsTable.userId, userId),
          eq(dnsPlanSubscriptionsTable.status, 'active')
        ));

      if (activeSubscriptions.length === 0) {
        return res.status(404).json({ error: "No active DNS plan subscription found" });
      }

      // Check if user already has the target plan
      const hasTargetPlan = activeSubscriptions.some(sub => sub.planId === planId);
      if (hasTargetPlan) {
        return res.status(400).json({ error: "You are already subscribed to this plan" });
      }

      // For billing calculation, use the highest-tier current plan
      const currentSubscription = activeSubscriptions.sort((a, b) => b.plan!.price - a.plan!.price)[0];

      const currentPlan = currentSubscription.plan!;

      // Calculate prorated amount based on proper monthly billing cycle
      // All plans should bill on the 1st of every month, so calculate days until next 1st
      const now = new Date();
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0); // 1st of next month
      const billingCycleEndDate = new Date(nextFirstOfMonth.getTime() - 1); // End of current billing cycle

      // For Free plans with far-future endDate, use the calculated monthly cycle
      // For paid plans, also use the calculated monthly cycle to ensure consistency
      const daysRemaining = Math.max(0, Math.ceil((nextFirstOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const proratedAmount = (newPlan.price - currentPlan.price) * (daysRemaining / 30);

      const isUpgrade = newPlan.price > currentPlan.price;
      const isDowngrade = newPlan.price < currentPlan.price;
      const isFreeDowngrade = newPlan.price === 0;

      // For upgrades, check if user has sufficient VirtFusion tokens
      if (isUpgrade && proratedAmount > 0) {
        // Get user for VirtFusion integration
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        if (!user.virtFusionId) {
          return res.status(400).json({ error: "User is not linked to VirtFusion" });
        }

        // Check VirtFusion token balance
        await virtFusionApi.updateSettings();

        if (!virtFusionApi.isConfigured()) {
          return res.status(500).json({ error: "VirtFusion API not configured" });
        }

        // Get user's VirtFusion balance using the same method as dashboard
        let virtFusionBalance = 0;
        try {
          const balanceResponse = await virtFusionApi.getUserHourlyStats(user.id);
          if (balanceResponse?.data?.credit?.tokens) {
            virtFusionBalance = parseFloat(balanceResponse.data.credit.tokens);
          }
        } catch (error: any) {
          console.error("Error fetching VirtFusion balance:", error);
          return res.status(500).json({ error: "Failed to check VirtFusion balance" });
        }

        // Convert prorated amount to tokens (assuming 1 USD = 100 tokens)
        const tokensRequired = proratedAmount * 100;

        if (virtFusionBalance < tokensRequired) {
          return res.status(400).json({
            error: "Insufficient VirtFusion tokens for upgrade",
            required: tokensRequired,
            available: virtFusionBalance,
            shortfall: tokensRequired - virtFusionBalance
          });
        }
      }

      // Use the calculated billing cycle end date for the new subscription
      const endDate = billingCycleEndDate;
      const nextPaymentDate = newPlan.price === 0 ? endDate : nextFirstOfMonth; // Next billing date is always the 1st of next month

      // Track domain deletion results for user feedback (declare outside transaction scope)
      let domainDeletionResults = {
        successful: [] as string[],
        failed: [] as { name: string; error: string }[],
        skippedNoInterServerId: [] as string[]
      };

      // Start database transaction
      await db.transaction(async (tx) => {
        // Handle VirtFusion token transactions for upgrades/downgrades
        if (Math.abs(proratedAmount) > 0.01) { // Only process if amount is significant
          // Get user for VirtFusion integration
          const user = await storage.getUser(userId);
          if (!user || !user.virtFusionId) {
            throw new Error("User not found or not linked to VirtFusion");
          }

          // Create main transaction record
          const transactionType = isUpgrade ? 'dns_plan_upgrade' : 'dns_plan_downgrade';
          const transactionDescription = isUpgrade
            ? `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name} using VirtFusion tokens`
            : `DNS Plan Downgrade: ${currentPlan.name} → ${newPlan.name} using VirtFusion tokens`;

          const createdTransaction = await tx.insert(transactions).values({
            userId: userId,
            amount: -proratedAmount, // Negative for debit (upgrade), positive for credit (downgrade)
            type: transactionType,
            description: transactionDescription,
            status: 'completed',
            paymentMethod: 'virtfusion_tokens'
          }).returning();

          // Handle VirtFusion token deduction/refund outside the database transaction
          // We'll do this after the database transaction completes successfully
        }

        // Handle domain removal for downgrades
        console.log(`=== DOWNGRADE CONDITION CHECK ===`);
        console.log(`isDowngrade: ${isDowngrade}`);
        console.log(`newPlan.maxDomains: ${newPlan.maxDomains}`);
        console.log(`currentPlan.maxDomains: ${currentPlan.maxDomains}`);
        console.log(`selectedDomainIds:`, selectedDomainIds);

        if (isDowngrade && newPlan.maxDomains < currentPlan.maxDomains) {
          console.log(`DOWNGRADE CONDITION MET - proceeding with domain check`);

          // Get current user domains
          const userDomains = await tx.select()
            .from(dnsDomainsTable)
            .where(eq(dnsDomainsTable.userId, userId));

          const currentDomainCount = userDomains.length;
          console.log(`Current domain count: ${currentDomainCount}, New plan max: ${newPlan.maxDomains}`);

          if (currentDomainCount > newPlan.maxDomains) {
            console.log(`DOMAIN REMOVAL REQUIRED - user has ${currentDomainCount} domains, plan allows ${newPlan.maxDomains}`);
            if (!selectedDomainIds || selectedDomainIds.length !== newPlan.maxDomains) {
              throw new Error(`Domain selection required. Please select exactly ${newPlan.maxDomains} domain(s) to keep.`);
            }

            // Validate that all selected domain IDs belong to the user
            const validSelectedDomains = userDomains.filter(domain => selectedDomainIds.includes(domain.id));
            if (validSelectedDomains.length !== selectedDomainIds.length) {
              throw new Error("Invalid domain selection. Some domains don't belong to your account.");
            }

            // Get domains to remove (not in selectedDomainIds)
            const domainsToRemove = userDomains.filter(domain => !selectedDomainIds.includes(domain.id));

            console.log(`=== DOMAIN DELETION ANALYSIS ===`);
            console.log(`All user domains:`, userDomains.map(d => `${d.name} (ID: ${d.id}, InterServer: ${d.interserverId})`));
            console.log(`Selected domain IDs to KEEP:`, selectedDomainIds);
            console.log(`Domains to KEEP:`, userDomains.filter(d => selectedDomainIds.includes(d.id)).map(d => `${d.name} (ID: ${d.id})`));
            console.log(`Domains to REMOVE (${domainsToRemove.length}):`, domainsToRemove.map(d => `${d.name} (ID: ${d.id}, InterServer: ${d.interserverId})`));

            // Import InterServer API for domain operations
            const { interServerApi } = await import('./interserver-api');

            // CRITICAL FIX: Also fetch all domains from InterServer to ensure we delete domains
            // that might exist in InterServer but not in our local database
            let interServerDomains: any[] = [];
            try {
              console.log(`=== FETCHING ALL DOMAINS FROM INTERSERVER ===`);
              interServerDomains = await interServerApi.getDnsList();
              console.log(`Found ${interServerDomains.length} domains in InterServer:`, interServerDomains.map(d => `${d.name} (ID: ${d.id})`));
            } catch (interServerError) {
              console.error('Failed to fetch domains from InterServer:', interServerError);
              // Continue with local domains only if InterServer fetch fails
            }

            // Create a comprehensive list of domains to delete from InterServer
            // This includes both local domains and any InterServer domains not in our selected list
            const selectedDomainNames = userDomains
              .filter(d => selectedDomainIds.includes(d.id))
              .map(d => d.name);

            console.log(`Selected domain NAMES to KEEP:`, selectedDomainNames);

            // Find InterServer domains that should be deleted (not in selected names)
            const interServerDomainsToDelete = interServerDomains.filter(
              interServerDomain => !selectedDomainNames.includes(interServerDomain.name)
            );

            console.log(`=== COMPREHENSIVE DELETION PLAN ===`);
            console.log(`InterServer domains to DELETE (${interServerDomainsToDelete.length}):`,
              interServerDomainsToDelete.map(d => `${d.name} (InterServer ID: ${d.id})`));
            console.log(`Local domains to DELETE (${domainsToRemove.length}):`,
              domainsToRemove.map(d => `${d.name} (Local ID: ${d.id}, InterServer: ${d.interserverId})`));

            // STEP 1: Delete ALL InterServer domains that are not in the selected list
            // This ensures we delete domains from InterServer even if they don't exist in our local database
            for (const interServerDomain of interServerDomainsToDelete) {
              try {
                console.log(`=== DELETING FROM INTERSERVER: ${interServerDomain.name} (ID: ${interServerDomain.id}) ===`);

                try {
                  const interServerResult = await interServerApi.deleteDnsDomain(interServerDomain.id);
                  console.log(`✅ Successfully removed domain ${interServerDomain.name} from InterServer:`, interServerResult);
                  domainDeletionResults.successful.push(interServerDomain.name);
                } catch (interServerError) {
                  console.error(`❌ Failed to remove domain ${interServerDomain.name} from InterServer:`, interServerError);
                  domainDeletionResults.failed.push({
                    name: interServerDomain.name,
                    error: `InterServer deletion failed: ${interServerError.message}`
                  });
                }

              } catch (domainError) {
                console.error(`❌ Failed to process InterServer domain ${interServerDomain.name}:`, domainError);
                domainDeletionResults.failed.push({
                  name: interServerDomain.name,
                  error: `InterServer domain processing failed: ${domainError.message}`
                });
              }
            }

            // STEP 2: Delete local database entries for domains that should be removed
            // This handles cleanup of our local database records
            for (const domain of domainsToRemove) {
              try {
                console.log(`=== CLEANING UP LOCAL DATABASE: ${domain.name} (Local ID: ${domain.id}) ===`);

                // Remove from local database
                const deleteResult = await tx.delete(dnsDomainsTable)
                  .where(eq(dnsDomainsTable.id, domain.id))
                  .returning();

                console.log(`✅ Successfully removed domain ${domain.name} from local database. Deleted rows:`, deleteResult.length);

                // Note: InterServer deletion was already handled in Step 1, so we don't need to do it again here
                // We only track local database cleanup success here if the domain wasn't already processed above

                const wasAlreadyProcessed = interServerDomainsToDelete.some(isd => isd.name === domain.name);
                if (!wasAlreadyProcessed) {
                  // This domain was only in local database, not in InterServer
                  console.log(`ℹ️  Domain ${domain.name} was only in local database (no InterServer ID: ${domain.interserverId})`);
                  if (!domain.interserverId) {
                    domainDeletionResults.skippedNoInterServerId.push(domain.name);
                  }
                }

              } catch (domainError) {
                console.error(`❌ Failed to remove domain ${domain.name} from local database:`, domainError);
                console.error(`Local database deletion error details:`, {
                  domainId: domain.id,
                  domainName: domain.name,
                  interserverId: domain.interserverId,
                  error: domainError
                });

                // Only add to failed list if it wasn't already added during InterServer deletion
                const wasAlreadyFailed = domainDeletionResults.failed.some(f => f.name === domain.name);
                if (!wasAlreadyFailed) {
                  domainDeletionResults.failed.push({
                    name: domain.name,
                    error: `Local database deletion failed: ${domainError.message}`
                  });
                }
              }
            }

            console.log(`=== DOMAIN DELETION SUMMARY ===`);
            console.log(`✅ Successfully deleted: ${domainDeletionResults.successful.length} domains`);
            console.log(`❌ Failed to delete: ${domainDeletionResults.failed.length} domains`);
            console.log(`⚠️  Skipped (no InterServer ID): ${domainDeletionResults.skippedNoInterServerId.length} domains`);
            console.log(`📊 Total InterServer domains processed: ${interServerDomainsToDelete.length}`);
            console.log(`📊 Total local domains processed: ${domainsToRemove.length}`);
            console.log(`Domain deletion results:`, domainDeletionResults);
          }
        }

        // CRITICAL FIX: Cancel ALL existing active subscriptions to enforce single-plan-per-user
        const activeSubscriptionIds = activeSubscriptions.map(sub => sub.id);
        await tx.update(dnsPlanSubscriptionsTable)
          .set({
            status: 'cancelled',
            autoRenew: false,
            updatedAt: now
          })
          .where(inArray(dnsPlanSubscriptionsTable.id, activeSubscriptionIds));

        // Create a new subscription for the target plan
        await tx.insert(dnsPlanSubscriptionsTable).values({
          userId: userId,
          planId: newPlan.id,
          status: 'active',
          startDate: now,
          endDate: endDate,
          autoRenew: true,
          lastPaymentDate: now,
          nextPaymentDate: nextPaymentDate
        });
      });

      // Handle VirtFusion token deduction/refund after successful database transaction
      if (Math.abs(proratedAmount) > 0.01) {
        const user = await storage.getUser(userId);
        if (user && user.virtFusionId) {
          await virtFusionApi.updateSettings();

          if (virtFusionApi.isConfigured()) {
            try {
              const tokensAmount = Math.abs(proratedAmount) * 100; // Convert to tokens

              if (isUpgrade) {
                // Deduct tokens for upgrade using correct method
                await virtFusionApi.removeCreditFromUserByExtRelationId(userId, {
                  tokens: tokensAmount,
                  reference_1: Date.now(),
                  reference_2: `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name}`
                });
                console.log(`Deducted ${tokensAmount} VirtFusion tokens for DNS plan upgrade`);
              } else {
                // Add tokens for downgrade (refund) using correct method
                await virtFusionApi.addCreditToUser(userId, {
                  tokens: tokensAmount,
                  reference_1: Date.now(),
                  reference_2: `DNS Plan Downgrade Refund: ${currentPlan.name} → ${newPlan.name}`
                });
                console.log(`Refunded ${tokensAmount} VirtFusion tokens for DNS plan downgrade`);
              }
            } catch (virtFusionError: any) {
              console.error("Error handling VirtFusion tokens for DNS plan change:", virtFusionError);
              // Don't fail the entire operation, but log the error
            }
          }
        }
      }

      const actionType = isUpgrade ? 'upgraded' : 'downgraded';
      console.log(`DNS plan ${actionType} successfully: ${currentPlan.name} → ${newPlan.name} for user ${userId}`);

      // Calculate domains removed for response message and include detailed results
      let domainsRemovedCount = 0;
      let domainDeletionSummary = null;

      if (isDowngrade && newPlan.maxDomains < currentPlan.maxDomains && selectedDomainIds) {
        const userDomains = await db.select()
          .from(dnsDomainsTable)
          .where(eq(dnsDomainsTable.userId, userId));

        const originalDomainCount = userDomains.length + (selectedDomainIds ? userDomains.length - selectedDomainIds.length : 0);
        domainsRemovedCount = Math.max(0, originalDomainCount - newPlan.maxDomains);

        // Include domain deletion results if any domains were processed
        if (domainDeletionResults.successful.length > 0 ||
          domainDeletionResults.failed.length > 0 ||
          domainDeletionResults.skippedNoInterServerId.length > 0) {
          domainDeletionSummary = domainDeletionResults;
        }
      }

      let message = `Successfully ${actionType} to ${newPlan.name}`;
      if (Math.abs(proratedAmount) > 0.01) {
        message += ` (${isUpgrade ? 'charged' : 'refunded'} $${Math.abs(proratedAmount).toFixed(2)} prorated)`;
      }
      if (domainsRemovedCount > 0) {
        message += ` and removed ${domainsRemovedCount} domain${domainsRemovedCount !== 1 ? 's' : ''}`;

        // Add warnings for failed deletions
        if (domainDeletionSummary?.failed?.length > 0) {
          message += ` (${domainDeletionSummary.failed.length} domain${domainDeletionSummary.failed.length !== 1 ? 's' : ''} had deletion issues)`;
        }
      }

      res.json({
        success: true,
        action: actionType,
        oldPlan: currentPlan,
        newPlan: newPlan,
        proratedAmount: Math.abs(proratedAmount),
        isUpgrade: isUpgrade,
        isDowngrade: isDowngrade,
        daysRemaining: daysRemaining,
        domainsRemoved: domainsRemovedCount,
        domainDeletionResults: domainDeletionSummary,
        message: message
      });

    } catch (error: any) {
      console.error("Error changing DNS plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel a DNS plan subscription
  app.post("/api/dns-plans/cancel", isAuthenticated, async (req, res) => {
    try {
      const { subscriptionId } = req.body;
      const userId = req.user!.id;

      if (!subscriptionId) {
        return res.status(400).json({ error: "Subscription ID is required" });
      }

      // Get the subscription
      const [subscription] = await db.select()
        .from(dnsPlanSubscriptionsTable)
        .where(and(
          eq(dnsPlanSubscriptionsTable.id, subscriptionId),
          eq(dnsPlanSubscriptionsTable.userId, userId),
          eq(dnsPlanSubscriptionsTable.status, 'active')
        ))
        .limit(1);

      if (!subscription) {
        return res.status(404).json({ error: "Active subscription not found" });
      }

      // Update subscription status to cancelled
      await db.update(dnsPlanSubscriptionsTable)
        .set({
          status: 'cancelled',
          autoRenew: false,
          updatedAt: new Date()
        })
        .where(eq(dnsPlanSubscriptionsTable.id, subscriptionId));

      console.log(`DNS plan subscription cancelled: ${subscriptionId} for user ${userId}`);

      res.json({
        success: true,
        message: "DNS plan subscription cancelled successfully"
      });

    } catch (error: any) {
      console.error("Error cancelling DNS plan subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's DNS plan limits and usage
  app.get("/api/dns-plans/limits", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;

      // Get user's active DNS plan subscriptions
      const activeSubscriptions = await db.select({
        planId: dnsPlanSubscriptionsTable.planId,
        plan: {
          id: dnsPlansTable.id,
          name: dnsPlansTable.name,
          maxDomains: dnsPlansTable.maxDomains,
          maxRecords: dnsPlansTable.maxRecords
        }
      })
        .from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(and(
          eq(dnsPlanSubscriptionsTable.userId, userId),
          eq(dnsPlanSubscriptionsTable.status, 'active')
        ));

      // Since we enforce single-plan-per-user, get limits from the active plan
      let totalMaxDomains = 0;
      let totalMaxRecords = 0;

      if (activeSubscriptions.length > 0 && activeSubscriptions[0].plan) {
        // Use the first (and should be only) active plan
        const activePlan = activeSubscriptions[0].plan;
        totalMaxDomains = activePlan.maxDomains;
        totalMaxRecords = activePlan.maxRecords;
      }

      // Get current domain count
      const domainCount = await db.select({ count: sql<number>`count(*)` })
        .from(dnsDomainsTable)
        .where(eq(dnsDomainsTable.userId, userId));

      const currentDomains = domainCount[0]?.count || 0;

      // Get current DNS record usage (excluding default InterServer records)
      let totalUserRecords = 0;
      let totalSystemRecords = 0;
      let totalRecords = 0;

      try {
        const userDomains = await db.select()
          .from(dnsDomainsTable)
          .where(eq(dnsDomainsTable.userId, userId));

        // Import InterServer API and DNS utilities
        const { interServerApi } = await import('./interserver-api');
        const { getDnsRecordUsageStats } = await import('../shared/dns-record-utils');

        for (const domain of userDomains) {
          if (domain.interserverId) {
            try {
              const records = await interServerApi.getDnsDomain(domain.interserverId);

              // Get detailed usage statistics for this domain
              const usageStats = getDnsRecordUsageStats(records, domain.name);

              totalUserRecords += usageStats.userCreated;
              totalSystemRecords += usageStats.default;
              totalRecords += usageStats.total;

              console.log(`Domain ${domain.name}: Total: ${usageStats.total}, System: ${usageStats.default}, User: ${usageStats.userCreated}`);
            } catch (recordError) {
              console.warn(`Could not fetch records for domain ${domain.name}:`, recordError);
            }
          }
        }

        console.log(`User ${userId} DNS usage summary: Total records: ${totalRecords}, System records: ${totalSystemRecords}, User records: ${totalUserRecords}`);
      } catch (recordCountError) {
        console.warn('Could not fetch DNS record usage:', recordCountError);
      }

      res.json({
        hasActivePlan: activeSubscriptions.length > 0,
        limits: {
          maxDomains: totalMaxDomains,
          maxRecords: totalMaxRecords
        },
        usage: {
          domains: currentDomains,
          records: totalUserRecords
        },
        canAddDomain: activeSubscriptions.length === 0 || currentDomains < totalMaxDomains,
        activePlans: activeSubscriptions.map(sub => sub.plan).filter(Boolean)
      });

    } catch (error: any) {
      console.error("Error fetching DNS plan limits:", error);
      res.status(500).json({ error: error.message });
    }
  });





  // Get VirtFusion usage for the last 30 days
  app.get("/api/billing/usage/last30days", isAuthenticated, async (req, res) => {
    try {
      console.log("Fetching VirtFusion usage data for user:", req.user!.id);

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        console.log("User not found in database:", req.user!.id);
        return res.status(404).json({ error: "User not found", usage: 0 });
      }

      if (!user.virtFusionId) {
        console.log("User has no VirtFusion ID linked:", user.id);
        return res.status(404).json({
          error: "VirtFusion account not linked",
          usage: 0
        });
      }

      console.log("User found:", user.id, "VirtFusion ID:", user.virtFusionId);

      // Make sure VirtFusion API is configured
      await virtFusionApi.updateSettings();
      console.log("VirtFusion API configuration:", {
        isConfigured: virtFusionApi.isConfigured(),
        apiUrl: virtFusionApi.getApiUrl()
      });

      if (!virtFusionApi.isConfigured()) {
        console.log("VirtFusion API not configured");
        return res.status(500).json({
          error: "VirtFusion API not configured",
          usage: 0
        });
      }

      // Use the getUserHourlyStats method with the user.id as extRelationId (NOT virtFusionId)
      // VirtFusion expects the user's ID from our system as extRelationId
      console.log("Calling VirtFusion API hourly stats with extRelationId (user.id):", user.id);

      // Debug: Check if the method exists
      console.log("Available VirtFusion API methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(virtFusionApi)));
      console.log("getUserHourlyStats method exists:", typeof virtFusionApi.getUserHourlyStats);

      let response;

      // Check if the method exists, if not use fallback
      if (typeof virtFusionApi.getUserHourlyStats === 'function') {
        console.log("Using getUserHourlyStats method");
        response = await virtFusionApi.getUserHourlyStats(user.id);
      } else {
        console.log("getUserHourlyStats method not found, using fallback request");
        // Fallback: Use direct request method
        const period = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const endpoint = `/selfService/hourlyStats/byUserExtRelationId/${user.id}?period[]=${period}&range=m`;

        try {
          response = await virtFusionApi.request("GET", endpoint);
        } catch (firstError) {
          console.log("HourlyStats endpoint failed, trying usage endpoint");
          const usageEndpoint = `/selfService/usage/byUserExtRelationId/${user.id}?period[]=${period}&range=m`;

          try {
            response = await virtFusionApi.request("GET", usageEndpoint);
          } catch (secondError) {
            console.log("Both endpoints failed, returning empty data");
            response = {
              data: {
                monthlyTotal: {
                  value: "0.00",
                  hours: 0,
                  tokens: false
                }
              }
            };
          }
        }
      }

      console.log("VirtFusion API raw response:", response);

      if (!response || !response.data) {
        console.log("No data returned from VirtFusion API");
        return res.status(500).json({
          error: "Failed to fetch VirtFusion usage data",
          usage: 0
        });
      }

      // Extract the monthly total value from the response
      let totalUsage = 0;  // Default to 0 if not found
      console.log("VirtFusion hourly stats response:", response);

      // Parse the monthlyTotal.value from the response data based on API documentation
      if (response.data &&
        response.data.monthlyTotal &&
        response.data.monthlyTotal.value) {
        // The value might be returned as a string, so we parse it as a float
        const monthlyValue = parseFloat(response.data.monthlyTotal.value);
        if (!isNaN(monthlyValue)) {
          totalUsage = monthlyValue;
          console.log(`Using monthly total value from API: $${totalUsage}`);
        } else {
          console.log(`Invalid monthly total value from API: ${response.data.monthlyTotal.value}`);
        }
      } else {
        console.log("Monthly total value not found in API response, using default value of 0");
      }

      console.log("Returning usage data:", { usage: totalUsage });
      res.json({
        usage: totalUsage,
        rawData: response.data
      });
    } catch (error: any) {
      console.error("Error fetching VirtFusion usage:", error);
      res.status(500).json({
        error: error.message || "Failed to fetch usage data",
        usage: 0
      });
    }
  });

  // Test VirtFusion credit addition - for admin testing only
  app.post("/api/test-virtfusion-credit", isAdmin, async (req, res) => {
    try {
      // For testing, we'll accept the externally provided extRelationId
      // but add a warning about using userId as extRelationId in your app
      const { extRelationId, tokens } = req.body;

      if (!extRelationId || !tokens) {
        return res.status(400).json({ error: "External relation ID and tokens are required" });
      }

      // Add a hint for the administrator
      console.log(`IMPORTANT: For normal users, the extRelationId should be their user ID, not the virtFusionId field.`);

      console.log(`Admin test: Adding ${tokens} tokens to VirtFusion user with extRelationId: ${extRelationId}`);

      // Check VirtFusion API configuration
      await virtFusionApi.updateSettings();

      // Validate VirtFusion API settings
      if (!virtFusionApi.isConfigured()) {
        return res.status(500).json({
          error: "VirtFusion API configuration is incomplete",
          details: "Missing API URL or token"
        });
      }

      // Test connection to VirtFusion API
      try {
        console.log("Testing VirtFusion API connection before test credit addition");
        await virtFusionApi.testConnection();
        console.log("VirtFusion API connection successful");
      } catch (connectionError: any) {
        console.error("VirtFusion API connection test failed:", connectionError);
        return res.status(500).json({
          error: "VirtFusion API connection failed",
          details: connectionError.message
        });
      }

      // Create transaction record for reference
      const transaction: InsertTransaction = {
        userId: req.user!.id,
        amount: tokens / 100, // Convert tokens back to dollar amount
        type: "credit",
        description: "Admin test credit via VirtFusion API",
        status: "pending",
        paymentMethod: "test",
        paymentId: `test-${Date.now()}`,
      };

      console.log("Creating test transaction record:", transaction);
      const createdTransaction = await storage.createTransaction(transaction);
      console.log("Test transaction created with ID:", createdTransaction.id);

      // Check if user exists in VirtFusion
      console.log(`Verifying user exists in VirtFusion with extRelationId: ${extRelationId}`);
      try {
        const userCheckResult = await virtFusionApi.getUserByExtRelationId(extRelationId);
        console.log("User verification successful:", userCheckResult);
      } catch (userCheckError: any) {
        console.error("User verification failed:", userCheckError);
        await storage.updateTransaction(createdTransaction.id, {
          status: "failed",
          description: `${transaction.description} (User verification failed: ${userCheckError.message})`
        });
        return res.status(400).json({
          error: "Failed to verify user in VirtFusion",
          details: userCheckError.message
        });
      }

      // Add credits via VirtFusion API
      // Format the data EXACTLY as specified in the VirtFusion API documentation
      const tokenData = {
        tokens: tokens,
        reference_1: createdTransaction.id,
        reference_2: `Admin test credit - Transaction ID: ${createdTransaction.id}`
      };

      console.log(`Sending to VirtFusion API with extRelationId=${extRelationId}:`, tokenData);
      try {
        // The ID passed here should be the external relation ID as configured in VirtFusion
        const virtFusionResult = await virtFusionApi.addCreditToUser(
          extRelationId,
          tokenData
        );

        console.log("VirtFusion credit add response:", virtFusionResult);

        // Extract VirtFusion credit ID from the response
        const virtFusionCreditId = virtFusionResult?.data?.id;
        console.log("VirtFusion credit ID:", virtFusionCreditId);

        // Update transaction status and store the VirtFusion credit ID
        await storage.updateTransaction(createdTransaction.id, {
          status: "completed",
          virtFusionCreditId: virtFusionCreditId ? String(virtFusionCreditId) : null,
          description: virtFusionCreditId
            ? `Admin test credit via VirtFusion API (Credit ID: ${virtFusionCreditId})`
            : "Admin test credit via VirtFusion API"
        });



        res.json({
          success: true,
          message: `Successfully added ${tokens} tokens to VirtFusion user ${extRelationId}`,
          transactionId: createdTransaction.id,
          virtFusionResponse: virtFusionResult
        });
      } catch (creditError: any) {
        console.error("VirtFusion credit API error:", creditError);

        // Update transaction status to failed
        await storage.updateTransaction(createdTransaction.id, {
          status: "failed",
          description: `${transaction.description} (Credit addition failed: ${creditError.message})`
        });



        return res.status(500).json({
          error: "Failed to add credits to VirtFusion account",
          details: creditError.message
        });
      }
    } catch (error: any) {
      console.error(`Error in test credit API:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Support Ticket Routes -----

  // Get user's tickets
  // Ticket Department Routes (now using unified support departments)
  app.get("/api/ticket-departments", isAuthenticated, async (req, res) => {
    try {
      // Use unified support departments instead of legacy ticket departments
      const departments = await storage.getSupportDepartments();
      // Filter to only active departments
      const activeDepartments = departments.filter(dept => dept.isActive);
      res.json(activeDepartments);
    } catch (error: any) {
      console.error("Error fetching support departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Legacy ticket department admin routes removed - use unified department system at /admin/settings

  // Department Migration Routes - DEPRECATED (migration completed)
  app.get("/api/admin/department-migration/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // Migration is complete - all departments are now unified
      res.json({
        needsMigration: false,
        ticketDepartmentCount: 0,
        supportDepartmentCount: 0,
        message: "Department migration completed - all departments unified in support_departments"
      });
    } catch (error: any) {
      console.error("Error checking migration status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint to check department counts
  app.get("/api/admin/department-counts", isAuthenticated, isAdmin, async (req, res) => {
    try {
      // After migration cleanup: All departments are now unified in support_departments
      const supportDepts = await storage.getSupportDepartments();

      res.json({
        supportDepartments: {
          count: supportDepts.length,
          departments: supportDepts.map(d => ({ id: d.id, name: d.name, isActive: d.isActive }))
        },
        // Legacy tables are no longer actively used - all departments are unified
        ticketDepartments: {
          count: 0,
          departments: [],
          note: "Legacy table - all departments unified in support_departments"
        },

      });
    } catch (error: any) {
      console.error("Error checking department counts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manual migration finalization endpoint
  app.post("/api/admin/department-migration/finalize-columns", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('Starting manual migration finalization...');

      // Check current foreign key constraints
      const constraintsResult = await db.execute(sql`
        SELECT constraint_name, table_name, column_name
        FROM information_schema.key_column_usage
        WHERE table_name IN ('tickets')
        AND constraint_name LIKE '%department%'
        ORDER BY table_name, constraint_name
      `);

      console.log('Current department-related constraints:', constraintsResult.rows);

      await db.transaction(async (tx) => {
        // Step 1: Drop ALL existing department-related foreign key constraints
        console.log('Dropping all existing department foreign key constraints...');

        await tx.execute(sql`
          ALTER TABLE "tickets"
          DROP CONSTRAINT IF EXISTS "tickets_department_id_ticket_departments_id_fk"
        `);

        await tx.execute(sql`
          ALTER TABLE "tickets"
          DROP CONSTRAINT IF EXISTS "tickets_department_id_new_fkey"
        `);

        await tx.execute(sql`
          ALTER TABLE "tickets"
          DROP CONSTRAINT IF EXISTS "tickets_department_id_support_departments_id_fk"
        `);



        // Step 2: Check if department_id_new column exists and handle column swap
        const ticketsTableInfo = await tx.execute(sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'tickets' AND column_name = 'department_id_new'
        `);

        if (ticketsTableInfo.rows.length > 0) {
          console.log('Found department_id_new column, performing column swap...');

          await tx.execute(sql`
            ALTER TABLE "tickets"
            RENAME COLUMN "department_id" TO "legacy_department_id_temp"
          `);

          await tx.execute(sql`
            ALTER TABLE "tickets"
            RENAME COLUMN "department_id_new" TO "department_id"
          `);

          // Update legacy_department_id with old values if not already set
          await tx.execute(sql`
            UPDATE "tickets"
            SET "legacy_department_id" = "legacy_department_id_temp"
            WHERE "legacy_department_id" IS NULL AND "legacy_department_id_temp" IS NOT NULL
          `);

          // Drop the temporary column
          await tx.execute(sql`
            ALTER TABLE "tickets"
            DROP COLUMN IF EXISTS "legacy_department_id_temp"
          `);
        } else {
          console.log('No department_id_new column found, columns already swapped');
        }

        // Step 3: Add correct foreign key constraints pointing to support_departments
        console.log('Adding new foreign key constraints for unified departments...');

        await tx.execute(sql`
          ALTER TABLE "tickets"
          ADD CONSTRAINT "tickets_department_id_support_departments_id_fk"
          FOREIGN KEY ("department_id") REFERENCES "support_departments"("id") ON DELETE SET NULL
        `);



        console.log('Migration finalization completed successfully');
      });

      res.json({
        success: true,
        message: 'Migration finalization completed successfully - all tables now reference support_departments'
      });
    } catch (error: any) {
      console.error("Error finalizing migration:", error);
      res.status(500).json({ error: error.message });
    }
  });



  // Unified Department Management Routes
  app.get("/api/admin/unified-departments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const departments = await storage.getSupportDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching unified departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/unified-departments", isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getActiveSupportDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching active unified departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/unified-departments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const department = await storage.createSupportDepartment(req.body);
      res.status(201).json(department);
    } catch (error: any) {
      console.error("Error creating unified department:", error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({ error: 'Department name already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.put("/api/admin/unified-departments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.updateSupportDepartment(id, req.body);
      const updatedDepartment = await storage.getSupportDepartment(id);
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating unified department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/unified-departments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteSupportDepartment(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting unified department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Ticket Routes
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string; // 'open', 'closed', or undefined for all

      // Get total count for pagination (with status filter)
      const totalTickets = await storage.getUserTicketsCount(req.user!.id, status);

      // Get paginated tickets (with status filter)
      const tickets = await storage.getUserTicketsPaginated(req.user!.id, limit, offset, status);

      res.json({
        data: tickets,
        pagination: {
          total: totalTickets,
          pages: Math.ceil(totalTickets / limit),
          current: page,
          perPage: limit
        }
      });
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Notification Routes -----

  // Get user's notifications
  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    try {
      let notifications = await storage.getUserNotifications(req.user!.id);

      // For admin users, check for open tickets and add them as notifications
      if (req.user!.role === "admin") {
        console.log(
          "Admin user - checking for open tickets to add to notifications",
        );
        const openTickets = await storage.getTicketsByStatus([
          "open",
          "in_progress",
        ]);

        if (openTickets.length > 0) {
          console.log(
            `Found ${openTickets.length} open tickets to notify admin about`,
          );

          // Create notification objects for each open ticket
          const ticketNotifications = await Promise.all(
            openTickets.map(async (ticket) => {
              const user = await storage.getUser(ticket.userId);
              const userName = user ? user.fullName : `User #${ticket.userId}`;

              // Format based on status
              const statusText =
                ticket.status === "open" ? "new" : "in progress";

              return {
                id: `ticket-${ticket.id}`, // Virtual ID for frontend processing
                userId: req.user!.id,
                type: "ticket",
                title: `Support ticket ${statusText}`,
                message: `Ticket #${ticket.id} from ${userName}: ${ticket.subject}`,
                read: false,
                createdAt: ticket.createdAt,
                additionalData: JSON.stringify({
                  ticketId: ticket.id,
                  status: ticket.status,
                }),
              };
            }),
          );

          // Combine with regular notifications
          notifications = [...ticketNotifications, ...notifications];

          // Sort by date (newest first)
          notifications.sort((a, b) => {
            const dateA = new Date(a.createdAt).getTime();
            const dateB = new Date(b.createdAt).getTime();
            return dateB - dateA;
          });
        }
      }

      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get unread notification count
  app.get(
    "/api/notifications/unread/count",
    isAuthenticated,
    async (req, res) => {
      try {
        let count = await storage.getUnreadNotificationCount(req.user!.id);

        // For admin users, add open tickets to the count
        if (req.user!.role === "admin") {
          const openTickets = await storage.getTicketsByStatus([
            "open",
            "in_progress",
          ]);
          count += openTickets.length;
        }

        res.json({ count });
      } catch (error: any) {
        console.error("Error fetching unread notification count:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Mark a notification as read
  app.post(
    "/api/notifications/mark-read/:id",
    isAuthenticated,
    async (req, res) => {
      try {
        const notificationId = parseInt(req.params.id);

        if (isNaN(notificationId)) {
          return res.status(400).json({ error: "Invalid notification ID" });
        }

        await storage.markNotificationAsRead(notificationId);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Mark all notifications as read
  app.post(
    "/api/notifications/mark-all-read",
    isAuthenticated,
    async (req, res) => {
      try {
        await storage.markAllNotificationsAsRead(req.user!.id);
        res.json({ success: true });
      } catch (error: any) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Delete a notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);

      if (isNaN(notificationId)) {
        return res.status(400).json({ error: "Invalid notification ID" });
      }

      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific ticket with messages
  app.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (
        !ticket ||
        (ticket.userId !== req.user!.id && req.user!.role !== "admin")
      ) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Get ticket messages
      const messages = await storage.getTicketMessages(ticketId);

      // Get department info
      const department = ticket.departmentId ? await storage.getSupportDepartment(ticket.departmentId) : null;

      // Attach basic user info to ticket for easier display in admin UI
      try {
        const ticketUser = await storage.getUser(ticket.userId);
        if (ticketUser) {
          // Only expose necessary fields to the client
          (ticket as any).user = {
            id: ticketUser.id,
            fullName: ticketUser.fullName,
            email: ticketUser.email,
          };
        }
      } catch (err) {
        console.error(`Error fetching user for ticket ${ticketId}:`, err);
      }

      // If this is a VPS-related ticket, fetch the VPS information
      let server = null;
      if (ticket.vpsId) {
        try {
          // Fetch VPS data from VirtFusion API if the ticket has a VPS ID
          await virtFusionApi.updateSettings();

          // Get VPS info
          if (req.user.virtFusionId) {
            console.log(`Fetching VPS info for ticket ${ticketId} (VPS ID: ${ticket.vpsId})`);
            // Fetch server details from VirtFusion
            const serverData = await virtFusionApi.getServer(ticket.vpsId);

            if (serverData && serverData.data) {
              // Extract network info (if available)
              const networkInterface = serverData.data.network?.interfaces?.[0] || {};
              const ipv4s = networkInterface.ipv4 || [];
              const ipv6s = networkInterface.ipv6 || [];

              // Properly format IPv6 addresses by combining subnet/cidr
              const formattedIpv6s = ipv6s.map(ip => ({
                ...ip,
                // Use subnet/cidr to create a proper IPv6 address display
                address: ip.address || (ip.subnet ? `${ip.subnet}/${ip.cidr}` : 'Unknown'),
                // Ensure netmask is properly set for display
                netmask: ip.prefix || ip.netmask || (ip.cidr ? `/${ip.cidr}` : 'Unknown'),
                type: 'ipv6'
              }));

              const allIps = [...ipv4s.map(ip => ({ ...ip, type: 'ipv4' })), ...formattedIpv6s];

              // Format server data
              server = {
                id: serverData.data.id,
                name: serverData.data.name,
                hostname: serverData.data.hostname,
                ip: ipv4s[0]?.address,
                status: serverData.data.state,
                isNat: networkInterface.isNat || false,
                hypervisorId: serverData.data.hypervisorId,
                allIps,
                ipv4s,
                ipv6s,
                network: networkInterface ? {
                  name: networkInterface.name,
                  mac: networkInterface.mac,
                  isNat: networkInterface.isNat,
                  enabled: networkInterface.enabled
                } : undefined,
                os: serverData.data.os?.name,
                package: serverData.data.package?.name
              };
            }
          }
        } catch (error) {
          console.error(`Error fetching VPS data for ticket ${ticketId}:`, error);
          // Don't fail the whole request if VPS data retrieval fails
        }
      }

      res.json({ ticket, messages, server, department });
    } catch (error: any) {
      console.error(`Error fetching ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new support ticket
  app.post("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      console.log("Creating ticket with request body:", {
        ...req.body,
        // Don't log message content to avoid cluttering logs with potentially sensitive info
        message: req.body.message ? "[message content redacted]" : undefined,
      });

      // Make sure user is authenticated and we have their ID
      if (!req.user || !req.user.id) {
        console.error(
          "User not properly authenticated for ticket creation:",
          req.user,
        );
        return res.status(401).json({ error: "User authentication required" });
      }

      // Department is required for ticket creation
      if (!req.body.departmentId) {
        return res.status(400).json({ error: "Department selection is required" });
      }

      // Check if department exists and is active
      const department = await storage.getSupportDepartment(req.body.departmentId);
      if (!department) {
        return res.status(404).json({ error: "Selected department not found" });
      }

      if (!department.isActive) {
        return res.status(400).json({ error: "Selected department is not available" });
      }

      // If department requires VPS, fetch VPS data from VirtFusion
      let vpsData = null;
      let vpsId = req.body.vpsId || null;

      if (department.requiresVps) {
        if (!vpsId) {
          return res.status(400).json({ error: "VPS selection is required for this department" });
        }

        try {
          // Fetch VPS data from VirtFusion API
          await virtFusionApi.updateSettings();

          // Get user's VPS info from VirtFusion
          if (req.user.virtFusionId) {
            console.log(`Fetching VPS info for user ${req.user.virtFusionId} from VirtFusion API`);
            const userServers = await virtFusionApi.getUserServers(req.user.virtFusionId);

            // Check if requested VPS belongs to user
            const server = userServers.data.find((s: any) => s.id === vpsId);
            if (!server) {
              return res.status(404).json({ error: "VPS not found or not accessible" });
            }

            // Store relevant VPS data
            vpsData = {
              id: server.id,
              name: server.name,
              hostname: server.hostname,
              ip: server.ip,
              status: server.status,
              os: server.os?.name || "Unknown",
              package: server.package?.name || "Unknown"
            };

            console.log(`VPS data retrieved for ID ${vpsId}:`, {
              name: vpsData.name,
              hostname: vpsData.hostname,
              ip: vpsData.ip,
              status: vpsData.status
            });
          } else {
            console.warn(`User ${req.user.id} doesn't have a VirtFusion ID but trying to create a VPS ticket`);
            return res.status(400).json({ error: "Your account is not linked to VirtFusion" });
          }
        } catch (vpsError: any) {
          console.error("Error fetching VPS data from VirtFusion:", vpsError);
          return res.status(500).json({ error: "Error accessing VPS information: " + vpsError.message });
        }
      }

      // Parse and validate the ticket data
      const ticketData = insertTicketSchema.parse({
        ...req.body,
        // Explicitly set userId from the authenticated user
        userId: req.user.id,
        // Include VPS data if it was retrieved
        vpsData: vpsData,
        vpsId: vpsId
      });

      console.log("Validated ticket data:", {
        ...ticketData,
        // Don't show subject to protect privacy
        subject: "[redacted for privacy]",
        departmentId: req.body.departmentId
      });

      // Create the ticket in the database
      const ticket = await storage.createTicket(ticketData);
      console.log("Ticket created with ID:", ticket.id);

      // Also create the first message if provided
      if (req.body.message) {
        console.log(`Adding initial message to ticket ${ticket.id}`);
        await storage.createTicketMessage({
          ticketId: ticket.id,
          userId: req.user.id,
          message: req.body.message,
        });
      }

      // Send Discord webhook notification
      try {
        const user = await storage.getUser(req.user.id);
        const userName = user ? `${user.fullName} (${user.email})` : `User #${req.user.id}`;

        // Get department info for the notification
        const deptName = department ? department.name : "Unknown Department";

        // Add VPS info to the notification if available
        let additionalInfo = `Department: ${deptName}`;
        if (vpsData) {
          additionalInfo += `\nVPS: ${vpsData.name} (${vpsData.hostname}, ${vpsData.ip})`;
          additionalInfo += `\nOS: ${vpsData.os}`;
          additionalInfo += `\nPackage: ${vpsData.package}`;
          additionalInfo += `\nStatus: ${vpsData.status}`;
        }

        // Send webhook notification (for backward compatibility)
        await discordService.sendNewTicketNotification(
          ticket.id,
          ticket.subject,
          `${req.body.message || "(No message provided)"}\n\n${additionalInfo}`,
          userName
        );

        // Create Discord thread for the ticket (if bot is enabled)
        await discordBotService.createThreadForTicket(
          ticket.id,
          ticket.subject,
          `${req.body.message || "(No message provided)"}\n\n${additionalInfo}`,
          user?.fullName || `User #${req.user.id}`
        );
      } catch (webhookError: any) {
        // Log but don't fail the request if webhook fails
        console.error("Error sending Discord notification for new ticket:", webhookError.message);
      }



      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error("Validation error for ticket creation:", error);
        return handleZodError(error, res);
      }
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  // Get all messages for a ticket
  app.get("/api/tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (
        !ticket ||
        (ticket.userId !== req.user!.id && req.user!.role !== "admin")
      ) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Get the messages for this ticket
      const messages = await storage.getTicketMessages(ticketId);

      // For each message, enrich with user information
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const user = await storage.getUser(message.userId);
          return {
            ...message,
            user: user
              ? {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
              }
              : undefined,
          };
        }),
      );

      res.json(enrichedMessages);
    } catch (error: any) {
      console.error(`Error fetching ticket messages:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add a message to a ticket
  app.post("/api/tickets/:id/messages", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (
        !ticket ||
        (ticket.userId !== req.user!.id && req.user!.role !== "admin")
      ) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messageData = insertTicketMessageSchema.parse({
        ...req.body,
        ticketId,
        userId: req.user!.id,
      });

      const message = await storage.createTicketMessage(messageData);

      // Update ticket status if admin replies
      if (req.user!.role === "admin" && ticket.status === "open") {
        await storage.updateTicket(ticketId, { status: "in-progress" });
      }

      // Send Discord notifications
      try {
        const user = await storage.getUser(req.user!.id);
        const userName = user ? `${user.fullName} (${user.email})` : `User #${req.user!.id}`;
        const isAdmin = req.user!.role === "admin";

        // Send webhook notification (for backward compatibility)
        await discordService.sendTicketReplyNotification(
          ticketId,
          ticket.subject,
          messageData.message,
          userName,
          isAdmin
        );

        // Send reply to Discord thread (if bot is enabled)
        await discordBotService.sendReplyToThread(
          ticketId,
          messageData.message,
          user?.fullName || `User #${req.user!.id}`,
          isAdmin
        );
      } catch (webhookError: any) {
        // Log but don't fail the request if webhook fails
        console.error("Error sending Discord notification for ticket reply:", webhookError.message);
      }

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      console.error("Error adding message:", error);
      res.status(500).json({ error: "Failed to add message" });
    }
  });

  // Close a ticket
  app.post("/api/tickets/:id/close", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (
        !ticket ||
        (ticket.userId !== req.user!.id && req.user!.role !== "admin")
      ) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      await storage.updateTicket(ticketId, { status: "closed" });

      // Send Discord notifications
      const isAdmin = req.user!.role === "admin";
      const userName = req.user!.fullName || req.user!.username;

      // Webhook notification (for backward compatibility)
      discordService.sendTicketStatusNotification(
        ticketId,
        ticket.subject,
        userName,
        "closed",
        isAdmin
      );

      // Update Discord thread (if bot is enabled)
      try {
        if (typeof discordBotService.updateThreadStatus === 'function') {
          await discordBotService.updateThreadStatus(
            ticketId,
            "closed",
            userName
          );
        } else {
          console.error("Discord bot service updateThreadStatus is not available");
        }
      } catch (error) {
        console.error("Error updating Discord thread status:", error);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error closing ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reopen a ticket
  app.post("/api/tickets/:id/reopen", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (
        !ticket ||
        (ticket.userId !== req.user!.id && req.user!.role !== "admin")
      ) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Make sure ticket is closed
      if (ticket.status !== "closed") {
        return res.status(400).json({ error: "Ticket is already open" });
      }

      await storage.updateTicket(ticketId, { status: "open" });

      // Send Discord notifications
      const isAdmin = req.user!.role === "admin";
      const userName = req.user!.fullName || req.user!.username;

      // Webhook notification (for backward compatibility)
      discordService.sendTicketStatusNotification(
        ticketId,
        ticket.subject,
        userName,
        "reopened",
        isAdmin
      );

      // Update Discord thread (if bot is enabled)
      try {
        if (typeof discordBotService.updateThreadStatus === 'function') {
          await discordBotService.updateThreadStatus(
            ticketId,
            "open",
            userName
          );
        } else {
          console.error("Discord bot service updateThreadStatus is not available");
        }
      } catch (error) {
        console.error("Error updating Discord thread status:", error);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error reopening ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Download a ticket as PDF
  app.get("/api/tickets/:id/download", isAuthenticated, async (req, res) => {
    try {
      // Validate ticket ID
      const ticketIdStr = req.params.id;
      if (!ticketIdStr || isNaN(parseInt(ticketIdStr))) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticketId = parseInt(ticketIdStr);
      console.log(`Downloading ticket ID: ${ticketId} for user: ${req.user!.id}`);

      // Get ticket from storage
      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        console.error(`Ticket ID ${ticketId} not found in database`);
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Check permission - only ticket owner or admin can download
      if (ticket.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to access this ticket" });
      }

      // Get user data for the report
      const user = await storage.getUser(ticket.userId);

      // Get ticket messages
      const messages = await storage.getTicketMessages(ticketId);

      // If the ticket is VPS-related, fetch the server details
      let server = null;
      if (ticket.vpsId) {
        try {
          console.log(`Fetching VPS info for ticket ${ticketId} (VPS ID: ${ticket.vpsId})`);
          await virtFusionApi.updateSettings();
          const serverResponse = await virtFusionApi.getServer(ticket.vpsId, false);

          if (serverResponse && serverResponse.data) {
            server = serverResponse.data;
            console.log(`Successfully fetched VPS server data for PDF, VPS ID: ${ticket.vpsId}, Name: ${server.name}`);

            // Debug the server data structure
            console.log('Server network info available:',
              server.network &&
                server.network.interfaces &&
                server.network.interfaces.length > 0 ? 'Yes' : 'No'
            );

            if (server.network && server.network.interfaces) {
              console.log(`Found ${server.network.interfaces.length} network interfaces`);

              // Process the network interfaces to ensure IPv6 addresses are properly formatted
              server.network.interfaces.forEach((iface: any) => {
                if (iface && iface.ipv6 && Array.isArray(iface.ipv6)) {
                  // Process each IPv6 address
                  iface.ipv6 = iface.ipv6.map((ip: any) => {
                    if (!ip) return ip;

                    // Create a formatted address if missing
                    if (!ip.address && ip.subnet) {
                      ip.address = `${ip.subnet}/${ip.cidr}`;
                    }

                    // Ensure netmask is properly set
                    if (!ip.netmask && !ip.prefix && ip.cidr) {
                      ip.netmask = `/${ip.cidr}`;
                    }

                    return ip;
                  });
                }
              });
            }
          } else {
            console.error(`Error: No server data returned for VPS ID ${ticket.vpsId}`);
          }
        } catch (err) {
          console.error(`Error fetching VPS info for ticket ${ticketId}:`, err);
          // Don't fail if we can't get server info, just continue without it
        }
      } else {
        console.log(`Note: Ticket ${ticketId} does not have a VPS ID associated with it.`);
      }

      // For VPS-related tickets, we don't need to include user credits
      // as they're not relevant to the support issue
      let creditsInfo = null;

      // Get company information for PDF
      const companyNameSetting = await storage.getSetting('company_name');
      const companyName = companyNameSetting ? companyNameSetting.value : 'SkyVPS360';
      const companyLogoSetting = await storage.getSetting('company_logo');
      const companyLogo = companyLogoSetting ? companyLogoSetting.value : '';

      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.pdf"`);

      // Pipe the PDF document to the response
      doc.pipe(res);

      // Format the PDF with ticket data
      formatTicketPdf(doc, ticket, messages, user, companyName, companyLogo, server, creditsInfo);

      // Finalize the PDF
      doc.end();
    } catch (error: any) {
      console.error("Error generating ticket PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to generate ticket download",
          details: error.message
        });
      } else {
        res.end();
      }
    }
  });

  // Update ticket status or other properties
  app.put("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { status } = req.body;

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Only the ticket owner or an admin can update tickets
      if (ticket.userId !== req.user!.id && req.user!.role !== "admin") {
        return res
          .status(403)
          .json({ error: "Not authorized to update this ticket" });
      }

      // Validate status if provided
      if (status && !["open", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      // Update ticket
      await storage.updateTicket(ticketId, { status, updatedAt: new Date() });

      // Get the updated ticket
      const updatedTicket = await storage.getTicket(ticketId);

      // Send Discord notifications for status changes
      if (status && status !== ticket.status) {
        const isAdmin = req.user!.role === "admin";
        const userName = req.user!.fullName || req.user!.username;

        // Webhook notification (for backward compatibility)
        discordService.sendTicketStatusNotification(
          ticketId,
          ticket.subject,
          userName,
          status,
          isAdmin
        );

        // Update Discord thread (if bot is enabled)
        try {
          if (typeof discordBotService.updateThreadStatus === 'function') {
            await discordBotService.updateThreadStatus(
              ticketId,
              status,
              userName
            );
          } else {
            console.error("Discord bot service updateThreadStatus is not available");
          }
        } catch (error) {
          console.error("Error updating Discord thread status:", error);
        }
      }

      res.json(updatedTicket);
    } catch (error: any) {
      console.error(`Error updating ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Admin Routes -----

  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const localOAuthService = new OAuthService();
      
      // Fetch OAuth accounts for all users to include profile pictures
      const usersWithOAuth = await Promise.all(
        users.map(async (user) => {
          try {
            const oauthAccounts = await localOAuthService.getUserOAuthAccounts(user.id);
            return {
              ...user,
              oauthAccounts
            };
          } catch (error) {
            console.warn(`Failed to fetch OAuth accounts for user ${user.id}:`, error);
            return {
              ...user,
              oauthAccounts: []
            };
          }
        })
      );
      
      res.json(usersWithOAuth);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new user (admin only)
  app.post("/api/admin/users", isAdmin, async (req, res) => {
    try {
      const { username, email, password, fullName, firstName, lastName, phone, company, address, role } = req.body;

      // Validate required fields
      if (!username || !email || !password || !fullName) {
        return res.status(400).json({ error: "Username, email, password, and full name are required" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
      }

      // Check if username or email already exists
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername) {
        return res.status(409).json({ error: "Username already exists" });
      }

      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail) {
        return res.status(409).json({ error: "Email already exists" });
      }

      // Hash the password
      const hashedPassword = await hashPassword(password);

      // Create the user
      const newUser = await storage.createUser({
        username,
        email,
        password: hashedPassword,
        fullName,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        company: company || null,
        address: address || null,
        role: role || "client",
        isVerified: true,
        isActive: true
      });

      // Send welcome email
      try {
        await emailService.sendTemplatedEmail('welcome_email', email, {
          username,
          password,
          fullName
        });
        console.log(`Welcome email sent to ${email}`);
      } catch (emailError: any) {
        console.error("Error sending welcome email:", emailError);
        // Continue with the response even if email sending fails
      }

      res.status(201).json({
        success: true,
        message: "User created successfully",
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role
        }
      });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all transactions (admin only)
  app.get("/api/admin/transactions", isAdmin, async (req, res) => {
    try {
      const transactions = await storage.getAllTransactions();

      // Fetch all unique user IDs from transactions
      const userIds = [...new Set(transactions.map(t => t.userId))];

      // Get user data for these IDs in one go
      const users = await storage.getUsersByIds(userIds);

      // Map users by their ID for easier lookup
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<number, any>);

      // Attach user data to each transaction
      const transactionsWithUserData = transactions.map(transaction => {
        const user = userMap[transaction.userId];
        return {
          ...transaction,
          user: user ? {
            id: user.id,
            username: user.username || user.fullName || `User #${user.id}`,
            email: user.email || 'No email available'
          } : undefined
        };
      });

      res.json(transactionsWithUserData);
    } catch (error: any) {
      console.error("Error fetching all transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin billing page data
  app.get("/api/admin/billing", isAdmin, async (req, res) => {
    try {
      // Get summary data
      const transactions = await storage.getAllTransactions();

      // Calculate summary statistics
      const totalCredits = transactions
        .filter(t => t.type === 'credit' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

      res.json({
        totalCredits,
        pendingTransactions
      });
    } catch (error: any) {
      console.error("Error fetching admin billing data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Cache Management Routes (Admin Only) -----

  // Get cache status
  app.get("/api/admin/cache/status", isAdmin, async (req, res) => {
    try {
      const cacheStatus = await cacheService.getCacheStatus();
      res.json({
        success: true,
        data: cacheStatus
      });
    } catch (error: any) {
      console.error("Error getting cache status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear all caches
  app.post("/api/admin/cache/clear", isAdmin, async (req, res) => {
    try {
      const result = await cacheService.clearAllCaches();

      if (result.success) {
        res.json({
          success: true,
          message: "All caches cleared successfully",
          clearedCaches: result.clearedCaches
        });
      } else {
        res.status(207).json({
          success: false,
          message: "Some caches could not be cleared",
          clearedCaches: result.clearedCaches,
          errors: result.errors
        });
      }
    } catch (error: any) {
      console.error("Error clearing caches:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Clear specific cache type
  app.post("/api/admin/cache/clear/:type", isAdmin, async (req, res) => {
    try {
      const cacheType = req.params.type as 'betterstack' | 'gemini' | 'modules';

      if (!['betterstack', 'gemini', 'modules'].includes(cacheType)) {
        return res.status(400).json({ error: "Invalid cache type" });
      }

      await cacheService.clearSpecificCache(cacheType);

      res.json({
        success: true,
        message: `${cacheType} cache cleared successfully`
      });
    } catch (error: any) {
      console.error(`Error clearing ${req.params.type} cache:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single user by ID (admin only)
  app.get("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        console.log(`[ADMIN] Invalid user ID provided: ${req.params.id}`);
        return res.status(400).json({ error: "Invalid user ID" });
      }

      console.log(`[ADMIN] Fetching user data for ID: ${userId}`);

      const user = await storage.getUser(userId);

      if (!user) {
        console.log(`[ADMIN] User with ID ${userId} not found in database`);
        return res.status(404).json({ error: "User not found" });
      }

      // Sanitize password before sending to client
      const sanitizedUser = { ...user, password: undefined };

      console.log(
        `[ADMIN] Successfully retrieved user: ${sanitizedUser.username} (ID: ${sanitizedUser.id})`,
      );
      res.json(sanitizedUser);
    } catch (error: any) {
      console.error(
        `[ADMIN] Error fetching user with ID ${req.params.id}:`,
        error,
      );
      res
        .status(500)
        .json({ error: error.message || "Failed to retrieve user" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Validate the request body
      const updateSchema = z.object({
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "client"]).optional(),
        credits: z.number().min(0).optional(),
      });

      const validatedData = updateSchema.parse(req.body);

      // If email is changing, check if the new email is already in use
      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email is already in use" });
        }
      }

      // Update user
      await storage.updateUser(userId, validatedData);

      // If user has VirtFusion ID, sync changes to VirtFusion
      if (
        user.virtFusionId &&
        (validatedData.fullName || validatedData.email)
      ) {
        try {
          // IMPORTANT: Use user.id as extRelationId (NOT virtFusionId)
          // According to API docs: /users/{extRelationId}/byExtRelation
          await virtFusionApi.modifyUserByExtRelationId(user.id, {
            name: validatedData.fullName || user.fullName,
            email: validatedData.email || user.email,
          });
        } catch (error: any) {
          console.error("Error updating user in VirtFusion:", error);
          // Continue with the response even if VirtFusion update fails
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof ZodError) {
        return handleZodError(error, res);
      }
      console.error("Error updating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all tickets (admin only)
  app.get("/api/admin/tickets", isAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string; // 'open', 'closed', or undefined for all

      // Get total count for pagination (with status filter)
      const totalTickets = await storage.getAllTicketsCount(status);

      // Get paginated tickets (with status filter)
      const allTickets = await storage.getAllTicketsPaginated(limit, offset, status);

      // Enrich tickets with user information
      const enrichedTickets = await Promise.all(
        allTickets.map(async (ticket) => {
          const user = await storage.getUser(ticket.userId);
          return {
            ...ticket,
            user: user
              ? {
                id: user.id,
                fullName: user.fullName,
                email: user.email,
              }
              : undefined,
          };
        }),
      );

      res.json({
        data: enrichedTickets,
        pagination: {
          total: totalTickets,
          pages: Math.ceil(totalTickets / limit),
          current: page,
          perPage: limit
        }
      });
    } catch (error: any) {
      console.error("Error fetching all tickets:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a ticket (admin only)
  app.delete("/api/admin/tickets/:id", isAdmin, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);

      if (isNaN(ticketId)) {
        return res.status(400).json({ error: "Invalid ticket ID" });
      }

      const ticket = await storage.getTicket(ticketId);

      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Send Discord notifications before deleting the ticket
      const adminName = req.user!.fullName || req.user!.username;

      // Webhook notification (for backward compatibility)
      discordService.sendTicketDeletedNotification(
        ticketId,
        ticket.subject,
        adminName
      );

      // Notify Discord thread (if bot is enabled)
      try {
        if (typeof discordBotService.handleTicketDeletion === 'function') {
          await discordBotService.handleTicketDeletion(
            ticketId,
            adminName
          );
        } else {
          console.error("Discord bot service handleTicketDeletion is not available");
        }
      } catch (error) {
        console.error("Error notifying Discord thread about ticket deletion:", error);
      }

      // Delete the ticket and all associated messages
      await storage.deleteTicket(ticketId);

      console.log(`Admin deleted ticket ${ticketId}`);
      res.json({ success: true, message: "Ticket deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting ticket ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:id/role", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;

      if (isNaN(userId) || !role) {
        return res.status(400).json({ error: "Invalid user ID or role" });
      }

      if (!["admin", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is trying to modify their own account
      if (req.user && (req.user as any).id === userId) {
        return res.status(403).json({ error: "You cannot modify your own account role" });
      }

      // Update role in local database
      await storage.updateUserRole(userId, role);
      console.log(`Successfully updated user role in local database. User ID: ${userId}, New Role: ${role}`);

      // VirtFusion API Integration Note:
      // The VirtFusion API does not support changing admin/client roles via API.
      // The PUT /users/{extRelationId}/byExtRelation endpoint only supports:
      // - name, email, selfService, selfServiceHourlyCredit, enabled, etc.
      // - but does NOT include an 'admin' field in the request body schema
      // Therefore, role changes are only applied to the local SkyPANEL database.

      if (user.virtFusionId) {
        console.log(`Note: User ${userId} has VirtFusion ID ${user.virtFusionId}, but VirtFusion API does not support role changes.`);
        console.log(`Role change from '${user.role}' to '${role}' applied locally only.`);

        // Send notification email about role change
        try {
          const adminUser = req.user as any;
          const adminName = adminUser?.fullName || 'System Administrator';

          if (role === 'admin') {
            // User promoted to admin
            await emailService.sendNotificationEmail(
              user.email,
              "Your Account Role Has Been Updated",
              `<p>Hello ${user.fullName},</p>
              <p>Your account role has been updated to <strong>Administrator</strong> by ${adminName}.</p>
              <p>You now have full access to all administrative features and settings.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>The Support Team</p>`
            );
          } else {
            // User demoted to client
            await emailService.sendNotificationEmail(
              user.email,
              "Your Account Role Has Been Updated",
              `<p>Hello ${user.fullName},</p>
              <p>Your account role has been updated to <strong>Client</strong> by ${adminName}.</p>
              <p>Your access has been adjusted accordingly. If you believe this is in error, please contact our support team.</p>
              <p>Best regards,<br>The Support Team</p>`
            );
          }
          console.log(`Role change notification email sent to user ${userId}`);
        } catch (emailError) {
          console.error(`Error sending role change notification email:`, emailError);
          // Continue anyway since this is just a notification
        }
      }

      res.json({
        success: true,
        message: "Role updated successfully",
        virtFusionNote: user.virtFusionId ? "Role change applied locally only - VirtFusion API does not support role modifications" : undefined
      });
    } catch (error: any) {
      console.error(`Error updating user role:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let temporaryPassword = "";
      let useVirtFusion = true;
      let virtFusionError = null;

      // For users with VirtFusion ID, try to reset password via VirtFusion API first
      if (user.virtFusionId && useVirtFusion) {
        try {
          // IMPORTANT: Use user.id as extRelationId (NOT virtFusionId)
          // According to API docs: /users/{extRelationId}/byExtRelation/resetPassword
          console.log(`Attempting to reset password via VirtFusion API for user with extRelationId: ${user.id}`);

          const response = await virtFusionApi.resetUserPassword(user.id);
          console.log("VirtFusion password reset API response:", response);

          // Extract the password from the VirtFusion response according to API docs
          // Example: {"data":{"email":"jon@doe.com","password":"zD2VqFKO554tdfWKOmGhw"}}
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
            console.log("Successfully obtained VirtFusion-generated password");
          } else {
            // If we didn't get a password, fall back to local password generation
            console.warn("VirtFusion response didn't contain expected password field, falling back to local password generation");
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          }
        } catch (error: any) {
          virtFusionError = error;
          console.warn("VirtFusion password reset failed, falling back to local password generation", error.message);

          // If VirtFusion API call failed, generate a local password
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        }
      } else {
        // For non-VirtFusion users, generate a local password
        temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }

      // Hash the password (whether from VirtFusion or locally generated)
      const hashedPassword = await hashPassword(temporaryPassword);

      // Update user's password in our database
      await storage.updateUser(userId, { password: hashedPassword });

      // Send email notification to the user
      try {
        // Get admin name for the email
        const adminUser = req.user as any;
        const adminName = adminUser?.fullName || 'System Administrator';

        await emailService.sendAdminPasswordResetEmail(
          user.email,
          temporaryPassword,
          adminName
        );
        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError: any) {
        console.error("Error sending password reset email:", emailError);
        // Continue with the response even if email sending fails
      }

      // Return the result with warning if VirtFusion API failed
      const response: any = { success: true, temporaryPassword };

      if (user.virtFusionId && virtFusionError) {
        response.virtFusionWarning = "Password was reset locally but VirtFusion API call failed";
        response.virtFusionError = virtFusionError.message;
        console.warn("Warning: Password reset locally but VirtFusion API call failed. Passwords may be out of sync.");
      }

      return res.json(response);
    } catch (error: any) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Suspend/Enable user (admin only)
  app.patch("/api/admin/users/:id/status", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { enabled } = req.body;

      if (isNaN(userId) || enabled === undefined) {
        return res.status(400).json({ error: "Invalid user ID or status parameter" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is trying to modify their own account
      if (req.user && (req.user as any).id === userId) {
        return res.status(403).json({ error: "You cannot modify your own account status" });
      }

      // If user has VirtFusion ID, update their status in VirtFusion
      if (user.virtFusionId) {
        try {
          console.log(`Updating user status in VirtFusion. User ID: ${userId}, Enabled: ${enabled}`);

          // Use the global VirtFusion API instance
          await virtFusionApi.updateSettings();

          // For VirtFusion, we need to set selfService parameter:
          // 0 = disabled (suspended)
          // 1 = hourly billing (enabled)
          const selfServiceValue = enabled ? 1 : 0;

          // Prepare the update data
          const updateData = {
            name: user.fullName, // Required by the VirtFusion API
            email: user.email,   // Required by the VirtFusion API
            selfService: selfServiceValue, // This controls whether user can access the system
            selfServiceHourlyCredit: true, // Always true as per our app's default
            selfServiceHourlyResourcePack: 1, // Default resource pack ID
            enabled: enabled // Controls whether VirtFusion emails the user
          };

          console.log(`Sending VirtFusion update data:`, JSON.stringify(updateData, null, 2));

          // Use the modifyUserByExtRelationId method to update the user's status in VirtFusion
          await virtFusionApi.modifyUserByExtRelationId(user.id, updateData);

          console.log(`Successfully updated user status in VirtFusion. User ID: ${userId}`);

          // Send notification email via email service about status change
          try {
            if (enabled) {
              // User account activated
              await emailService.sendNotificationEmail(
                user.email,
                "Your Account Has Been Activated",
                `<p>Hello ${user.fullName},</p>
                <p>Your account has been activated. You can now log in and use all the features of our platform.</p>
                <p>If you have any questions, please contact our support team.</p>
                <p>Best regards,<br>The Support Team</p>`
              );
            } else {
              // User account suspended
              await emailService.sendNotificationEmail(
                user.email,
                "Your Account Has Been Suspended",
                `<p>Hello ${user.fullName},</p>
                <p>Your account has been suspended. If you believe this is in error, please contact our support team.</p>
                <p>Best regards,<br>The Support Team</p>`
              );
            }
            console.log(`Status notification email sent to user ${userId}`);
          } catch (emailError) {
            console.error(`Error sending status notification email:`, emailError);
            // Continue anyway since this is just a notification
          }
        } catch (error: any) {
          console.error(`Error updating user status in VirtFusion:`, error);
          return res.status(500).json({
            error: "Failed to update user status in VirtFusion",
            details: error.message
          });
        }
      } else {
        console.log(`User ${userId} does not have a VirtFusion ID, skipping VirtFusion status update`);
      }

      // Update user in our database to keep track of their status
      await storage.updateUser(userId, { isActive: enabled });

      res.json({
        success: true,
        message: enabled ? "User has been enabled" : "User has been suspended"
      });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get VirtFusion user usage data (admin only)
  app.get("/api/admin/users/:id/usage", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only allow for users that have a VirtFusion ID
      if (!user.virtFusionId) {
        return res.status(400).json({ error: "User is not linked to VirtFusion" });
      }

      try {
        // IMPORTANT: VirtFusion uses our user.id as the "extRelationId", not the virtFusionId
        const extRelationId = userId; // Use userId, not virtFusionId!
        console.log(`Fetching usage data for user. User ID: ${userId}, VirtFusion extRelationId: ${extRelationId}`);

        // Use direct axios call to VirtFusion API
        const virtFusionApiUrl = process.env.VIRTFUSION_API_URL || 'https://vdc.skyvps360.xyz/api/v1';
        const virtFusionApiToken = process.env.VIRTFUSION_API_TOKEN;

        if (!virtFusionApiUrl || !virtFusionApiToken) {
          throw new Error("VirtFusion API URL or token not configured");
        }

        // Get current date in YYYY-MM-DD format for the period parameter
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const currentDate = `${year}-${month}-${day}`;

        // Format the URL correctly
        let apiBase = virtFusionApiUrl;
        if (apiBase.endsWith("/")) {
          apiBase = apiBase.slice(0, -1);
        }

        // We must use virtFusionId as the external relation ID for the usage API
        // This is different from their documentation, as we need to use the actual VirtFusion user ID
        // It's not the extRelationId stored on the VirtFusion side
        const fullUrl = `${apiBase}/selfService/hourlyStats/byUserExtRelationId/${extRelationId}`;
        console.log(`Making direct GET request to ${fullUrl}`);

        // Make the request
        const response = await axios({
          method: 'GET',
          url: fullUrl,
          headers: {
            Authorization: `Bearer ${virtFusionApiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: true })
        });

        console.log(`Response status: ${response.status}`);

        console.log(`Successfully fetched usage data from VirtFusion. User ID: ${userId}`);

        // Extract credit info and transform to match the format used in billing endpoint
        let tokens = 0;
        let value = 0;

        if (response.data && response.data.credit && response.data.credit.tokens) {
          tokens = parseFloat(response.data.credit.tokens);
          value = tokens / 100; // Convert to USD value (100 tokens = $1)
        }

        // Return in the same format as the billing endpoint
        res.json({
          success: true,
          data: {
            ...response.data,
            virtFusionTokens: tokens,
            virtFusionCredits: value
          }
        });
      } catch (error: any) {
        console.error(`Error fetching user usage data from VirtFusion:`, error);
        return res.status(500).json({
          error: "Failed to fetch user usage data from VirtFusion",
          details: error.message
        });
      }
    } catch (error: any) {
      console.error("Error fetching user usage data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add VirtFusion credits to a user (admin only)
  app.post("/api/admin/users/:id/virtfusion-credit", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.virtFusionId) {
        return res.status(400).json({ error: "User is not linked to VirtFusion" });
      }

      // Validate request data
      const { amount, reference } = req.body;

      if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        return res.status(400).json({ error: "Invalid credit amount" });
      }

      // Important: VirtFusion needs user ID as the extRelationId for adding credits
      const extRelationId = userId; // Use userId instead of virtFusionId!
      console.log(`Adding ${amount} tokens to VirtFusion for user ${userId} (extRelationId: ${extRelationId})`);

      // Call VirtFusion API
      await virtFusionApi.updateSettings();

      // Get user's balance BEFORE adding tokens (to detect negative balance)
      let initialBalance = 0;
      try {
        console.log("Fetching user's initial VirtFusion balance");
        const balanceData = await virtFusionApi.getUserHourlyStats(userId);

        if (balanceData?.data?.credit?.tokens) {
          const tokenAmount = parseFloat(balanceData.data.credit.tokens);
          const dollarAmount = tokenAmount / 100; // Convert tokens to dollars
          initialBalance = dollarAmount;
          console.log(`User's initial balance: ${initialBalance.toFixed(2)} USD (${tokenAmount} tokens)`);
        } else {
          console.log("Could not determine user's initial balance, defaulting to 0");
        }
      } catch (balanceError) {
        console.error("Error fetching initial balance:", balanceError);
        // Continue with initial balance of 0 if we can't fetch it
      }

      // Prepare data for VirtFusion API
      const creditData = {
        tokens: Number(amount),
        reference_2: reference || `Added via Admin Portal on ${new Date().toISOString()}`
      };

      const result = await virtFusionApi.addCreditToUser(extRelationId, creditData);

      if (!result || !result.data || !result.data.id) {
        return res.status(500).json({ error: "Failed to add credits to VirtFusion" });
      }

      console.log(`Successfully added credits to VirtFusion. Credit ID: ${result.data.id}`);

      // Add a record to our local transactions table for reference
      // The frontend shows transactions as positive or negative based on the transaction.type
      // So we use a positive amount value and "credit" type for proper frontend display
      const createdTransaction = await storage.createTransaction({
        userId: user.id,
        amount: Math.abs(Number(amount) / 100), // Make sure it's positive (100 tokens = $1)
        description: `Added ${amount} tokens to VirtFusion (Credit ID: ${result.data.id})`,
        type: "credit", // Using "credit" type means it will display as positive in the frontend
        status: "completed",
        virtFusionCreditId: String(result.data.id), // Store the VirtFusion credit ID
        reference: reference || null
      });

      // Get user's balance AFTER adding tokens to detect negative balance deduction
      try {
        console.log("Fetching user's updated VirtFusion balance");
        const updatedBalanceData = await virtFusionApi.getUserHourlyStats(userId);

        if (updatedBalanceData?.data?.credit?.tokens) {
          const updatedTokens = parseFloat(updatedBalanceData.data.credit.tokens);
          const updatedBalance = updatedTokens / 100; // Convert tokens to dollars
          console.log(`User's updated balance: ${updatedBalance.toFixed(2)} USD (${updatedTokens} tokens)`);

          // Calculate the expected balance increase
          const addedAmount = Number(amount) / 100; // Convert tokens to dollars
          const expectedBalance = initialBalance + addedAmount;
          console.log(`Expected balance after adding $${addedAmount}: $${expectedBalance.toFixed(2)}`);

          // Check if there was a negative balance deduction
          if (initialBalance < 0) {
            // Force the deduction amount to be at least the absolute value of the negative balance
            // This ensures we always show the proper amount that was deducted to cover the negative balance
            const deductionAmount = Math.abs(initialBalance); // Use the actual negative balance amount
            console.log(`Detected negative balance deduction: $${deductionAmount.toFixed(2)}`);

            // Create a second transaction to record the automatic deduction
            if (deductionAmount > 0) {
              const deductionTransaction = {
                userId: user.id,
                amount: deductionAmount * -1, // Store as negative amount
                type: "virtfusion_deduction",
                description: `Automatic deduction to cover negative balance (linked to transaction #${createdTransaction.id})`,
                status: "completed", // This is an automatic process that's already completed
                paymentMethod: null, // No payment method for automatic deductions
                paymentId: null, // No payment ID for automatic deductions
              };

              console.log("Creating deduction transaction record:", deductionTransaction);
              const createdDeductionTransaction = await storage.createTransaction(deductionTransaction);
              console.log("Deduction transaction created with ID:", createdDeductionTransaction.id);
            }
          } else {
            console.log("No negative balance deduction detected");
          }
        } else {
          console.log("Could not determine user's updated balance");
        }
      } catch (balanceError) {
        console.error("Error fetching updated balance:", balanceError);
        // Continue without creating deduction record if we can't fetch the updated balance
      }

      // Legacy local credit update removed. VirtFusion tokens are the source of truth.
      // If needed, you can trigger a frontend refresh or re-fetch VirtFusion balance here.

      return res.json({
        success: true,
        message: "Credits added successfully to VirtFusion.",
        creditId: result.data.id
      });

    } catch (error) {
      console.error("Error adding VirtFusion credits:", error);
      return res.status(500).json({
        error: "Failed to add credits to VirtFusion",
        details: error.message
      });
    }
  });

  // Remove VirtFusion credits from a user (admin only)
  app.delete("/api/admin/users/:id/virtfusion-credit", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.virtFusionId) {
        return res.status(400).json({ error: "User is not linked to VirtFusion" });
      }

      // Check if this is a legacy credit ID removal or new token amount removal
      const { creditId, tokens, reference } = req.body;

      if (creditId) {
        // Legacy method: Remove by Credit ID
        if (isNaN(Number(creditId)) || Number(creditId) <= 0) {
          return res.status(400).json({ error: "Invalid credit ID" });
        }

        console.log(`Removing credit ID ${creditId} from VirtFusion for user ${userId} (legacy method)`);

        // Call VirtFusion API using legacy method
        await virtFusionApi.updateSettings();

        if (!virtFusionApi.isConfigured()) {
          return res.status(500).json({
            error: "VirtFusion API configuration is incomplete. Please contact support.",
            details: "Missing API URL or token"
          });
        }

        try {
          const virtFusionResult = await virtFusionApi.removeCreditFromUser(Number(creditId));
          console.log("VirtFusion legacy credit removal result:", virtFusionResult);

          // Log a transaction for history (amount unknown for legacy method)
          await storage.createTransaction({
            userId: user.id,
            amount: 0, // Amount unknown for legacy removals
            description: `Removed VirtFusion credit (Legacy Credit ID: ${creditId})`,
            type: "debit",
            status: "completed"
          });

          return res.json({
            success: true,
            message: "VirtFusion credit removed successfully (legacy method).",
            creditId: creditId
          });
        } catch (apiError: any) {
          console.error("Error calling VirtFusion API (legacy method):", apiError);
          return res.status(500).json({
            error: "Failed to remove credit from VirtFusion",
            details: apiError.message || "Unknown error"
          });
        }
      } else if (tokens) {
        // New method: Remove by token amount using extRelationId
        if (isNaN(Number(tokens)) || Number(tokens) <= 0) {
          return res.status(400).json({ error: "Invalid token amount" });
        }

        const tokenAmount = Number(tokens);
        const dollarAmount = tokenAmount / 100; // 100 tokens = $1.00
        const extRelationId = userId; // Use userId as extRelationId

        console.log(`Removing ${tokenAmount} tokens from VirtFusion for user ${userId} (extRelationId: ${extRelationId})`);

        // Call VirtFusion API
        await virtFusionApi.updateSettings();

        if (!virtFusionApi.isConfigured()) {
          return res.status(500).json({
            error: "VirtFusion API configuration is incomplete. Please contact support.",
            details: "Missing API URL or token"
          });
        }

        // Format the data for VirtFusion API
        const tokenData = {
          tokens: tokenAmount,
          reference_1: undefined, // Will be set after transaction creation
          reference_2: reference || `Admin token removal - User ID: ${userId}`
        };

        try {
          // Create a transaction record first to get the transaction ID
          const createdTransaction = await storage.createTransaction({
            userId: user.id,
            amount: -Math.abs(dollarAmount),
            description: `Removed ${tokenAmount} tokens from VirtFusion${reference ? ` (${reference})` : ''}`,
            type: "debit",
            status: "pending"
          });

          // Update the reference with the transaction ID
          tokenData.reference_1 = createdTransaction.id;

          console.log(`Sending to VirtFusion API with extRelationId=${extRelationId}:`, tokenData);

          // Call the VirtFusion API to remove tokens
          const virtFusionResult = await virtFusionApi.removeCreditFromUserByExtRelationId(
            extRelationId,
            tokenData
          );

          console.log("VirtFusion token removal result:", virtFusionResult);

          // Update transaction status to completed
          await storage.updateTransaction(createdTransaction.id, { status: "completed" });

          return res.json({
            success: true,
            message: "VirtFusion tokens removed successfully.",
            tokens: tokenAmount,
            dollarAmount: dollarAmount,
            transactionId: createdTransaction.id
          });
        } catch (apiError: any) {
          console.error("Error calling VirtFusion API:", apiError);

          // Update transaction status to failed if it was created
          if (tokenData.reference_1) {
            await storage.updateTransaction(tokenData.reference_1, { status: "failed" });
          }

          return res.status(500).json({
            error: "Failed to remove tokens from VirtFusion",
            details: apiError.message || "Unknown error"
          });
        }
      } else {
        return res.status(400).json({
          error: "Either creditId (legacy) or tokens (new method) is required"
        });
      }
    } catch (error: any) {
      console.error("Error removing VirtFusion credit:", error);
      return res.status(500).json({
        error: "Failed to remove credit from VirtFusion",
        details: error.message
      });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is trying to delete themselves
      if (req.user && (req.user as any).id === userId) {
        return res.status(403).json({ error: "You cannot delete your own account" });
      }

      // If user has VirtFusion ID, check for servers FIRST before any deletion attempts
      if (user.virtFusionId) {
        try {
          // Use the same approach as the working user servers page
          console.log(`Getting user servers for VirtFusion user ID: ${user.virtFusionId}`);

          // Use the global virtFusionApi instance and the proven getUserServers method
          const serversResponse = await virtFusionApi.getUserServers(user.virtFusionId);

          console.log(`getUserServers response:`, JSON.stringify(serversResponse, null, 2));

          let hasServers = false;
          let serverCount = 0;

          if (serversResponse && serversResponse.data) {
            if (Array.isArray(serversResponse.data)) {
              serverCount = serversResponse.data.length;
              hasServers = serverCount > 0;
            } else if (serversResponse.data.servers && Array.isArray(serversResponse.data.servers)) {
              serverCount = serversResponse.data.servers.length;
              hasServers = serverCount > 0;
            }
          }

          console.log(`=== SERVER CHECK RESULT ===`);
          console.log(`hasServers: ${hasServers}, serverCount: ${serverCount}`);

          if (hasServers) {
            console.log(`CRITICAL: User has ${serverCount} active servers, ABORTING DELETION COMPLETELY. User ID: ${userId}`);
            return res.status(409).json({
              error: "Cannot delete user with active servers",
              details: `This user has ${serverCount} active server${serverCount > 1 ? 's' : ''} in VirtFusion. All servers must be deleted or transferred to another user before the account can be removed. Please manage the user's servers first, then try deleting the account again.`,
              serverCount: serverCount
            });
          }

          console.log(`Server check passed: User has no servers, safe to proceed with deletion. User ID: ${userId}`);

          // At this point, either:
          // 1. User has no servers (safe to delete)
          // 2. User doesn't exist in VirtFusion (orphaned user, safe to delete from our DB)

          // Now attempt VirtFusion user deletion (only if user exists there)
          const extRelationId = user.id; // Use local user ID as extRelationId per README
          let skipVirtFusionDeletion = false;

          if (!skipVirtFusionDeletion) {
            console.log(`Attempting VirtFusion user deletion. User ID: ${userId}, VirtFusion extRelationId: ${extRelationId}`);

            try {
              await virtFusionApi.deleteUserByExtRelationId(extRelationId);
              console.log(`Successfully deleted user from VirtFusion. User ID: ${userId}`);
            } catch (virtFusionDeleteError: any) {
              console.error(`Error deleting user from VirtFusion:`, virtFusionDeleteError);

              const deleteErrorMessage = virtFusionDeleteError.message || '';
              let statusCode = null;

              // Extract status code
              if (virtFusionDeleteError.response && virtFusionDeleteError.response.status) {
                statusCode = virtFusionDeleteError.response.status;
              } else if (virtFusionDeleteError.status) {
                statusCode = virtFusionDeleteError.status;
              } else {
                const statusMatch = deleteErrorMessage.match(/(\d{3})/);
                if (statusMatch) {
                  statusCode = parseInt(statusMatch[1]);
                }
              }

              console.log(`VirtFusion deletion error status code: ${statusCode}, message: ${deleteErrorMessage}`);

              // Handle specific VirtFusion deletion errors
              if (statusCode === 409 || deleteErrorMessage.includes("409") || deleteErrorMessage.toLowerCase().includes("conflict")) {
                // User still has servers (this shouldn't happen after our check, but be safe)
                console.log("CRITICAL: VirtFusion reports user still has servers during deletion, ABORTING ALL DELETION");
                return res.status(409).json({
                  error: "Cannot delete user with servers",
                  details: "The user has active servers. Please delete or transfer all servers before deleting the user account."
                });
              }

              if (statusCode === 404 || deleteErrorMessage.includes("404") || deleteErrorMessage.toLowerCase().includes("not found")) {
                console.log(`User not found in VirtFusion during deletion (404 error). Continuing with database deletion. User ID: ${userId}`);
                // Continue - user doesn't exist in VirtFusion anyway
              } else if (statusCode === 400 || deleteErrorMessage.includes("400") || deleteErrorMessage.toLowerCase().includes("bad request")) {
                console.log(`Bad request error from VirtFusion during deletion (400 error). Continuing with database deletion. User ID: ${userId}`);
                // Continue - likely corrupted user data
              } else if (statusCode >= 500 || deleteErrorMessage.toLowerCase().includes("internal server error") || deleteErrorMessage.toLowerCase().includes("timeout")) {
                // VirtFusion server error - don't delete from our database to prevent desync
                console.error(`VirtFusion server error (${statusCode}) during deletion, ABORTING database deletion to prevent desync. User ID: ${userId}`);
                return res.status(500).json({
                  error: "VirtFusion server error",
                  details: `VirtFusion is experiencing server issues (${statusCode}). Please try again later. User was not deleted from SkyPANEL to maintain synchronization.`
                });
              } else {
                // Unknown error - log and continue (assume orphaned user)
                console.log(`Unknown VirtFusion deletion error (${statusCode}): ${deleteErrorMessage}. Assuming orphaned user, continuing with database deletion. User ID: ${userId}`);
              }
            }
          } else {
            console.log(`Skipping VirtFusion deletion for user ${userId} - user doesn't exist in VirtFusion (orphaned user)`);
          }
        } catch (serverCheckError: any) {
          console.error(`Error during server check:`, serverCheckError);

          // Check if this is a 404 error (user not found in VirtFusion)
          const errorMessage = serverCheckError.message || '';
          const is404Error = errorMessage.includes('404') || errorMessage.toLowerCase().includes('user not found');

          if (is404Error) {
            console.log(`User ${userId} not found in VirtFusion (404 error during server check). This is expected for orphaned users - proceeding with deletion.`);
            // User doesn't exist in VirtFusion, so no servers to check - safe to delete from our database
          } else {
            // For other errors (network issues, API problems), be cautious and abort ALL deletion
            console.log("CRITICAL: Could not determine if user has servers due to API error, ABORTING ALL DELETION to prevent data loss");
            return res.status(500).json({
              error: "Unable to verify server status",
              details: "Cannot delete user because we couldn't verify if they have active servers in VirtFusion. This prevents data synchronization issues."
            });
          }
        }
      } else {
        console.log(`User ${userId} does not have a VirtFusion ID, skipping VirtFusion operations`);
      }

      // Delete user from our database
      console.log(`Deleting user from SkyPANEL database. User ID: ${userId}`);
      try {
        await storage.deleteUser(userId);
        console.log(`Successfully deleted user from SkyPANEL database. User ID: ${userId}`);
      } catch (dbError: any) {
        console.error(`Database error deleting user ${userId}:`, dbError);
        return res.status(500).json({
          error: "Database deletion failed",
          details: `Failed to delete user from SkyPANEL database: ${dbError.message}. The user may have related data that needs to be cleaned up first.`
        });
      }

      res.json({
        success: true,
        message: "User has been deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        error: "User deletion failed",
        details: error.message || "An unexpected error occurred during user deletion"
      });
    }
  });

  // Sync user with VirtFusion (admin only)
  app.post(
    "/api/admin/users/:id/sync-virtfusion",
    isAdmin,
    async (req, res) => {
      try {
        const userId = parseInt(req.params.id);

        if (isNaN(userId)) {
          return res.status(400).json({ error: "Invalid user ID" });
        }

        const user = await storage.getUser(userId);

        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        // Check if user is already linked to VirtFusion
        if (user.virtFusionId) {
          return res
            .status(400)
            .json({ error: "User is already linked to VirtFusion" });
        }

        // Create user in VirtFusion
        try {
          const response = await virtFusionApi.createUser({
            name: user.fullName,
            email: user.email,
            extRelationId: user.id,
            selfService: 1, // 1 = hourly billing enabled
            selfServiceHourlyCredit: true, // Enable credit balance billing for hourly self service
            selfServiceHourlyResourcePack: 1, // Setting the hourly resource pack to ID 1 (default pack)
            userData: {
              emails: [user.email],
            },
          });

          // Check response structure and get virtFusionId
          console.log(
            "VirtFusion create user response:",
            JSON.stringify(response),
          );

          let virtFusionId: number | undefined;

          if (response && typeof response === "object") {
            if (
              response.data &&
              typeof response.data === "object" &&
              typeof response.data.id === "number"
            ) {
              virtFusionId = response.data.id;
            } else if (typeof response.id === "number") {
              virtFusionId = response.id;
            }
          }

          if (!virtFusionId) {
            throw new Error("Failed to get user ID from VirtFusion response");
          }

          // Update user with VirtFusion ID
          await storage.updateUser(userId, { virtFusionId });

          res.json({ success: true, virtFusionId });
        } catch (error: any) {
          console.error("Error creating user in VirtFusion:", error);
          return res.status(500).json({
            error: "Failed to create user in VirtFusion",
            details: error.message || "Unknown error",
          });
        }
      } catch (error: any) {
        console.error("Error syncing user with VirtFusion:", error);
        res.status(500).json({ error: error.message });
      }
    },
  );

  // Edit existing VirtFusion user (admin only)
  app.put("/api/admin/users/:id/virtfusion", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if user is linked to VirtFusion
      if (!user.virtFusionId) {
        return res
          .status(400)
          .json({ error: "User is not linked to VirtFusion" });
      }

      // Prepare update data
      const updateData = {
        ...req.body,
        // Ensure these fields are always present with correct values
        name: user.fullName,
        email: user.email,
      };

      // Make sure selfService and selfServiceHourlyCredit are always set properly
      if (updateData.selfService === undefined) {
        updateData.selfService = 1; // 1 = hourly enabled
      }

      if (updateData.selfServiceHourlyCredit === undefined) {
        updateData.selfServiceHourlyCredit = true; // Enable credit balance billing for hourly self service
      }

      // Always set the hourly resource pack to ID 1 if not specified
      if (updateData.selfServiceHourlyResourcePack === undefined) {
        updateData.selfServiceHourlyResourcePack = 1; // Default pack
      }

      console.log(
        "Updating VirtFusion user with data:",
        JSON.stringify(updateData, null, 2),
      );

      try {
        // Update user in VirtFusion using modifyUserByExtRelationId
        // IMPORTANT: The extRelationId should be the user.id (not virtFusionId)
        // According to API docs: /users/{extRelationId}/byExtRelation
        // where extRelationId is the external relation ID (our user ID)
        const response = await virtFusionApi.modifyUserByExtRelationId(
          user.id, // Use user.id as extRelationId, NOT virtFusionId
          updateData,
        );

        console.log(
          "VirtFusion update user response:",
          JSON.stringify(response),
        );

        res.json({
          success: true,
          message: "User updated successfully in VirtFusion",
          data: response,
        });
      } catch (error: any) {
        console.error("Error updating user in VirtFusion:", error);
        return res.status(500).json({
          error: "Failed to update user in VirtFusion",
          details: error.message || "Unknown error",
        });
      }
    } catch (error: any) {
      console.error("Error updating VirtFusion user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- SSO Routes -----

  // Generate authentication token for VirtFusion panel access
  app.post("/api/sso/virtfusion/token", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.virtFusionId) {
        return res.status(400).json({
          error: "User is not linked to VirtFusion yet",
          needsSync: true,
        });
      }

      // IMPORTANT: The extRelationId is our internal user.id (NOT virtFusionId)
      // This matches the Rel ID shown in the VirtFusion panel
      // Per docs: https://docs.virtfusion.com/api/stoplight.html#/paths/users-extRelationId--authenticationTokens/post
      const extRelationId = user.id; // Use the internal user.id for this specific API call per documentation
      console.log(
        `Generating VirtFusion authentication token for user ${user.id} (using user.id as extRelationId: ${extRelationId})`,
      );
      const authResponse = await virtFusionApi.generateAuthToken(extRelationId);

      console.log(
        "VirtFusion authentication token raw response:",
        JSON.stringify(authResponse),
      );

      // Handle all possible VirtFusion API response formats
      let authToken: string | undefined;
      let redirectUrl: string | undefined;

      if (authResponse && typeof authResponse === "object") {
        // Format 1: { data: { token: "...", redirectUrl: "..." } }
        if (authResponse.data && typeof authResponse.data === "object") {
          console.log("Response format: { data: { token, redirectUrl } }");
          authToken = authResponse.data.token;
          redirectUrl = authResponse.data.redirectUrl;
        }
        // Format 2: { token: "...", redirectUrl: "..." }
        else if (authResponse.token && authResponse.redirectUrl) {
          console.log("Response format: { token, redirectUrl }");
          authToken = authResponse.token;
          redirectUrl = authResponse.redirectUrl;
        }
        // Format 3: VirtFusion might wrap in a meta property
        else if (authResponse.meta && typeof authResponse.meta === "object") {
          if (authResponse.meta.token && authResponse.meta.redirectUrl) {
            console.log("Response format: { meta: { token, redirectUrl } }");
            authToken = authResponse.meta.token;
            redirectUrl = authResponse.meta.redirectUrl;
          }
        }
      }

      // If we still couldn't find the token, try to identify what we did receive
      if (!authToken || !redirectUrl) {
        console.error(
          "Could not extract token and redirectUrl from response:",
          authResponse,
        );
        console.error("Response keys:", Object.keys(authResponse || {}));

        if (authResponse && typeof authResponse === "object") {
          // Check if data exists but has different property names
          if (authResponse.data && typeof authResponse.data === "object") {
            console.error("Data keys:", Object.keys(authResponse.data));
          }
        }

        return res.status(500).json({
          error: "Failed to get authentication token from VirtFusion",
          response: JSON.stringify(authResponse),
        });
      }

      console.log("Successfully extracted token and redirect URL");
      console.log(`Token: ${authToken.substring(0, 10)}...`);
      console.log(`Redirect URL: ${redirectUrl}`);

      // Return token and redirect URL for client-side redirection
      res.json({
        success: true,
        token: authToken,
        redirectUrl: redirectUrl,
      });
    } catch (error: any) {
      console.error("Error generating VirtFusion authentication token:", error);
      res.status(500).json({
        error: "Failed to generate authentication token",
        details: error.message || "Unknown error",
      });
    }
  });

  // Generate server-specific authentication token for direct server access
  // All server-related functionality has been removed
  app.post(
    "/api/sso/virtfusion/server/:serverId/token",
    isAuthenticated,
    async (req, res) => {
      res.status(404).json({ error: "This functionality has been removed" });
    },
  );

  // 🖥️ Admin Server Management - Get OS templates for specific package (admin only)
  app.get("/api/admin/packages/:packageId/templates", isAdmin, async (req, res) => {
    try {
      const packageId = parseInt(req.params.packageId);

      if (isNaN(packageId)) {
        return res.status(400).json({ error: "Invalid package ID" });
      }

      console.log(`Admin fetching OS templates for package ID: ${packageId}`);

      // Get OS templates for the specific package from VirtFusion API
      const result = await virtFusionApi.getOsTemplatesForPackage(packageId);

      console.log(`VirtFusion OS templates response for package ${packageId}:`, JSON.stringify(result, null, 2));

      // Handle different response formats and group templates by OS family
      let templates = [];
      if (result && result.data) {
        templates = Array.isArray(result.data) ? result.data : [result.data];
      } else if (Array.isArray(result)) {
        templates = result;
      }

      // VirtFusion already groups templates by distro (Debian, Ubuntu, Windows, etc.).
      // Pass the data straight through so the frontend sees full sub-distro structure.

      res.json({
        success: true,
        data: templates
      });

    } catch (error: any) {
      console.error(`Error fetching OS templates for package ${req.params.packageId}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch OS templates",
        message: error.message
      });
    }
  });

  // Admin server endpoints have been removed as requested
  app.get("/api/admin/servers", isAdmin, async (req, res) => {
    try {
      // Get pagination parameters from request
      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 10;

      console.log(`Admin fetching servers (page ${page}, perPage ${perPage})`);

      // VirtFusion API already supports pagination
      const result = await virtFusionApi.getServers(page, perPage, {});

      // Return the paginated response from VirtFusion
      // This includes data array, current_page, last_page, total, etc.
      if (result) {
        res.json(result);
      } else {
        // Return empty paginated response
        res.json({
          data: [],
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: 0
        });
      }
    } catch (error: any) {
      console.error("Error fetching servers from VirtFusion:", error.message);
      res.status(500).json({ error: "Failed to fetch servers from VirtFusion" });
    }
  });

  // 🖥️ Admin Server Management - Get OS templates (admin only)
  app.get("/api/admin/os-templates", isAdmin, async (req, res) => {
    try {
      console.log("Admin fetching OS templates");

      // Get OS templates via VirtFusion API
      const result = await virtFusionApi.getOsTemplates();

      console.log("VirtFusion OS templates response:", JSON.stringify(result, null, 2));

      res.json({
        success: true,
        data: result.data || []
      });

    } catch (error: any) {
      console.error("Error fetching OS templates:", error.message);
      res.status(500).json({
        error: "Failed to fetch OS templates",
        message: error.message
      });
    }
  });

  // 🔑 Admin SSH Keys Management - Get SSH keys for a user (admin only)
  app.get("/api/admin/ssh-keys/user/:userId", isAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);

      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      console.log(`Admin fetching SSH keys for user ${userId}`);

      // First get the user to find their VirtFusion user ID
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.virtFusionId) {
        return res.status(400).json({ error: "User does not have a VirtFusion account" });
      }

      // Get SSH keys via VirtFusion API
      const result = await virtFusionApi.getUserSshKeys(user.virtFusionId);

      console.log(`VirtFusion SSH keys response for user ${userId}:`, JSON.stringify(result, null, 2));

      res.json({
        success: true,
        data: result.data || []
      });

    } catch (error: any) {
      console.error(`Error fetching SSH keys for user ${req.params.userId}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch SSH keys",
        message: error.message
      });
    }
  });

  // 🖥️ Admin Server Management - Build server with OS (LEGACY, renamed to avoid conflict)
  app.post("/api/admin/servers/:serverId/build-legacy", isAdmin, async (req, res) => {
    try {
      const { serverId } = req.params;
      const {
        operatingSystemId,
        name,
        hostname,
        sshKeys = [],
        vnc = false,
        ipv6 = false,
        email = true,
        swap = 512
      } = req.body;

      console.log(`Admin building server ${serverId} with OS ${operatingSystemId}`);

      // Build the server using VirtFusion API
      const result = await virtFusionApi.buildServer(parseInt(serverId), {
        operatingSystemId,
        name,
        hostname: hostname || name,
        sshKeys,
        vnc,
        ipv6,
        email,
        swap
      });

      console.log("VirtFusion build server response:", JSON.stringify(result, null, 2));

      res.json({
        success: true,
        data: result.data,
        message: "Server build initiated successfully"
      });

      // -------------------------
      // Admin Queue Inspection
      // -------------------------

      // Note: we insert the queue route immediately after the build route definition so it's easy to locate

      // 📝 Admin Queue Management - Get queue item details (admin only)
      app.get("/api/admin/queue/:id", isAdmin, async (req, res) => {
        try {
          const queueId = parseInt(req.params.id);

          if (isNaN(queueId)) {
            return res.status(400).json({ error: "Invalid queue ID" });
          }

          console.log(`Admin fetching VirtFusion queue item ${queueId}`);

          // Fetch queue item details via VirtFusion API wrapper
          const result = await virtFusionApi.getQueueItem(queueId);

          res.json(result);
        } catch (error: any) {
          console.error(`Error fetching queue item ${req.params.id}:`, error.message);
          res.status(500).json({
            error: "Failed to fetch queue item",
            message: error.message
          });
        }
      });

    } catch (error: any) {
      console.error("Error building server:", error.message);
      res.status(500).json({
        error: "Failed to build server",
        message: error.message
      });
    }
  });

  // 🖥️ Admin Server Management - Create new server (admin only)
  app.post("/api/admin/servers", isAdmin, async (req, res) => {
    try {
      console.log("Admin creating new server:", JSON.stringify(req.body, null, 2));

      // Validation schema for server creation
      const createServerSchema = z.object({
        packageId: z.number().int().positive("Package ID must be a positive integer"),
        userId: z.number().int().positive("User ID must be a positive integer"),
        hypervisorId: z.number().int().positive("Hypervisor Group ID must be a positive integer"),
        ipv4: z.number().int().min(0).default(1),
        storage: z.number().int().positive("Storage must be a positive integer"),
        traffic: z.number().int().min(0, "Traffic must be a non-negative integer (0 = unlimited)"),
        memory: z.number().int().positive("Memory must be a positive integer"),
        cpuCores: z.number().int().positive("CPU cores must be a positive integer"),
        networkSpeedInbound: z.number().int().positive().default(1000),
        networkSpeedOutbound: z.number().int().positive().default(1000),
        storageProfile: z.number().int().min(0).default(0),
        networkProfile: z.number().int().optional().default(0),
        firewallRulesets: z.array(z.number().int()).default([]),
        hypervisorAssetGroups: z.array(z.number().int()).default([]),
        additionalStorage1Enable: z.boolean().default(false),
        additionalStorage2Enable: z.boolean().default(false),
        additionalStorage1Profile: z.number().int().positive().optional(),
        additionalStorage2Profile: z.number().int().positive().optional(),
        additionalStorage1Capacity: z.number().int().positive().optional(),
        additionalStorage2Capacity: z.number().int().positive().optional()
      });

      // Validate request body
      const validationResult = createServerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const validatedData = validationResult.data;

      // Get the SkyPANEL user to obtain their VirtFusion user ID
      const skyPanelUser = await storage.getUser(validatedData.userId);
      if (!skyPanelUser) {
        return res.status(400).json({
          error: "Invalid user ID",
          message: "The specified user does not exist"
        });
      }

      if (!skyPanelUser.virtFusionId) {
        return res.status(400).json({
          error: "User not linked to VirtFusion",
          message: "The specified user does not have a VirtFusion account associated"
        });
      }

      // Prepare server creation data for VirtFusion API
      const serverData = {
        packageId: validatedData.packageId,
        userId: skyPanelUser.virtFusionId, // Use VirtFusion user ID, not local SkyPANEL user ID
        hypervisorId: validatedData.hypervisorId,
        ipv4: validatedData.ipv4,
        storage: validatedData.storage,
        traffic: validatedData.traffic,
        memory: validatedData.memory,
        cpuCores: validatedData.cpuCores,
        networkSpeedInbound: validatedData.networkSpeedInbound,
        networkSpeedOutbound: validatedData.networkSpeedOutbound,
        storageProfile: validatedData.storageProfile,
        networkProfile: validatedData.networkProfile,
        firewallRulesets: validatedData.firewallRulesets,
        hypervisorAssetGroups: validatedData.hypervisorAssetGroups,
        additionalStorage1Enable: validatedData.additionalStorage1Enable,
        additionalStorage2Enable: validatedData.additionalStorage2Enable,
        // Self-service server configuration for hourly billing
        selfService: 1, // 1 = hourly self-service enabled
        selfServiceHourlyCredit: true, // Enable credit balance billing for hourly self-service
        selfServiceHourlyGroupProfiles: [], // Required array field - empty for default
        selfServiceResourceGroupProfiles: [], // Required array field - empty for default
        selfServiceHourlyResourcePack: 1 // Default hourly resource pack
      };

      // Add additional storage configurations if enabled
      if (validatedData.additionalStorage1Enable && validatedData.additionalStorage1Profile && validatedData.additionalStorage1Capacity) {
        serverData.additionalStorage1Profile = validatedData.additionalStorage1Profile;
        serverData.additionalStorage1Capacity = validatedData.additionalStorage1Capacity;
      }

      if (validatedData.additionalStorage2Enable && validatedData.additionalStorage2Profile && validatedData.additionalStorage2Capacity) {
        serverData.additionalStorage2Profile = validatedData.additionalStorage2Profile;
        serverData.additionalStorage2Capacity = validatedData.additionalStorage2Capacity;
      }

      // 🔍 Clean out optional fields that are empty or have sentinel values VirtFusion rejects
      Object.keys(serverData).forEach((key) => {
        const value: any = (serverData as any)[key];
        if (value === undefined || value === null) {
          delete (serverData as any)[key];
        }
        if (Array.isArray(value) && value.length === 0) {
          delete (serverData as any)[key];
        }
        // Remove networkProfile when 0 as VirtFusion expects a valid profile id
        if ((key === "networkProfile" || key === "storageProfile") && value === 0) {
          delete (serverData as any)[key];
        }
      });

      console.log("Sending server creation request to VirtFusion API:", JSON.stringify(serverData, null, 2));

      // Create server via VirtFusion API
      const result = await virtFusionApi.createServer(serverData);

      console.log("VirtFusion server creation response:", JSON.stringify(result, null, 2));

      // Log server creation action
      if (result && result.data && result.data.id) {
        try {
          await serverLoggingService.logServerAction(
            result.data.id,
            req.user!.id,
            'create',
            'Server created via admin panel',
            {
              packageId: validatedData.packageId,
              hypervisorId: validatedData.hypervisorId,
              memory: validatedData.memory,
              storage: validatedData.storage,
              cpuCores: validatedData.cpuCores,
              adminUser: req.user!.username
            }
          );
        } catch (logError) {
          console.error("Error logging server creation:", logError);
          // Don't fail the request if logging fails
        }
      }

      res.status(201).json({
        success: true,
        message: "Server created successfully",
        data: result.data || result
      });

    } catch (error: any) {
      console.error("Error creating server:", error.message);
      res.status(500).json({
        error: "Failed to create server",
        message: error.message
      });
    }
  });

  // 🖥️ Admin Server Management - Build server with OS template (admin only)
  app.post("/api/admin/servers/:id/build", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin building server ${serverId}:`, JSON.stringify(req.body, null, 2));

      // Validation schema for server build
      const buildServerSchema = z.object({
        operatingSystemId: z.number().int().positive("Operating System ID must be a positive integer"),
        name: z.string().min(1, "Server name is required").max(255, "Server name too long"),
        hostname: z.string().min(1, "Hostname is required").max(255, "Hostname too long").optional(),
        sshKeys: z.array(z.number().int()).default([]),
        vnc: z.boolean().default(false),
        ipv6: z.boolean().default(false),
        email: z.boolean().default(true),
        swap: z.number().int().min(0).max(8192).default(512)
      });

      // Validate request body
      const validationResult = buildServerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const validatedData = validationResult.data;

      // Prepare build data for VirtFusion API
      const buildData = {
        operatingSystemId: validatedData.operatingSystemId,
        name: validatedData.name,
        hostname: validatedData.hostname || validatedData.name,
        sshKeys: validatedData.sshKeys,
        vnc: validatedData.vnc,
        ipv6: validatedData.ipv6,
        email: validatedData.email,
        swap: validatedData.swap
      };

      // Clean out optional fields just like server creation
      Object.keys(buildData).forEach((key) => {
        const value: any = (buildData as any)[key];
        if (value === undefined || value === null) {
          delete (buildData as any)[key];
        }
        if (Array.isArray(value) && value.length === 0) {
          delete (buildData as any)[key];
        }
        if (typeof value === 'string' && value.trim() === '') {
          delete (buildData as any)[key];
        }
        if (key === 'hostname' && typeof value === 'string' && !value.includes('.')) {
          // Hostname must be FQDN; remove if invalid so VirtFusion can set automatically
          delete (buildData as any)[key];
        }
      });

      console.log("Sending server build request to VirtFusion API:", JSON.stringify(buildData, null, 2));

      // Build server via VirtFusion API
      const result = await virtFusionApi.buildServer(serverId, buildData);

      console.log("VirtFusion server build response:", JSON.stringify(result, null, 2));

      // Log server build action
      try {
        await serverLoggingService.logServerAction(
          serverId,
          req.user!.id,
          'build',
          'Server build initiated via admin panel',
          {
            operatingSystemId: validatedData.operatingSystemId,
            name: validatedData.name,
            hostname: validatedData.hostname,
            vnc: validatedData.vnc,
            ipv6: validatedData.ipv6,
            email: validatedData.email,
            swap: validatedData.swap,
            adminUser: req.user!.username
          }
        );
      } catch (logError) {
        console.error("Error logging server build:", logError);
        // Don't fail the request if logging fails
      }

      res.json({
        success: true,
        message: "Server build initiated successfully",
        data: result.data || result
      });

    } catch (error: any) {
      console.error(`Error building server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to build server",
        message: error.message
      });
    }
  });

  // Get server details by ID (admin only)
  app.get("/api/admin/servers/:id", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin fetching server details for ID: ${serverId}`);

      // Create a new instance and use request method directly with remoteState parameter
      // This will query real-time server state from the hypervisor
      const result = await virtFusionApi.request("GET", `/servers/${serverId}?remoteState=true`);

      // Log the raw API response to see what remoteState returns
      console.log(`VirtFusion API response with remoteState=true for server ${serverId}:`,
        JSON.stringify(result, null, 2).substring(0, 1000) + '...');

      if (result) {
        // Check if we have power status information for this server
        let powerStatus = await storage.getServerPowerStatus(serverId);

        // If we have a last queue ID, check its status to determine real power state
        if (powerStatus && powerStatus.lastQueueId) {
          try {
            console.log(`Checking queue item ${powerStatus.lastQueueId} for server power status`);
            const queueResult = await virtFusionApi.getQueueItem(powerStatus.lastQueueId);

            if (queueResult && queueResult.data) {
              // Debug log full queue response structure
              console.log(`Full queue response for ID ${powerStatus.lastQueueId}:`, JSON.stringify(queueResult.data, null, 2));

              // Extract status from the finished field (true/false/null) and action field
              const queueFinished = queueResult.data.finished !== null && queueResult.data.finished !== undefined;
              const queueStatus = queueFinished ? "completed" : "pending";
              const queueType = queueResult.data.action || "";
              const progress = queueResult.data.progress || 0;
              const failed = queueResult.data.failed || false;

              console.log(`Queue item ${powerStatus.lastQueueId} status: ${queueStatus}, type: ${queueType}, finished: ${queueFinished}, progress: ${progress}, failed: ${failed}`);

              // If the queue operation is completed (has a "finished" timestamp) and didn't fail,
              // we can determine the power state
              if (queueFinished && !failed) {
                if (queueType.includes("boot") || queueType.includes("start") || queueType === "powerOn") {
                  // Server was booted/started successfully
                  await storage.upsertServerPowerStatus(serverId, "RUNNING");
                } else if (queueType.includes("shutdown") || queueType.includes("stop") ||
                  queueType === "powerOff" || queueType === "restart") {
                  // For restart, we initially mark as STOPPED (the next boot command will update to RUNNING)
                  await storage.upsertServerPowerStatus(serverId, "STOPPED");
                }

                // Refresh our power status after the update
                powerStatus = await storage.getServerPowerStatus(serverId);
              }
            }
          } catch (queueError) {
            console.error(`Error checking queue status: ${queueError}`);
          }
        }

        // Add the power status information to the result
        const responseData = {
          ...result,
          powerStatus: powerStatus || { powerState: "UNKNOWN" }
        };

        // Return the enhanced result
        res.json(responseData);
      } else {
        res.status(404).json({ error: "Server not found" });
      }
    } catch (error: any) {
      console.error(`Error fetching server ${req.params.id} from VirtFusion:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server details from VirtFusion",
        message: error.message
      });
    }
  });

  // Get server traffic statistics (admin only)
  app.get("/api/admin/servers/:id/traffic", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin fetching traffic statistics for server ID: ${serverId}`);

      // Call our new method to get server traffic data
      const trafficData = await virtFusionApi.getServerTraffic(serverId);

      if (!trafficData || !trafficData.data) {
        return res.status(404).json({ error: "Traffic data not found" });
      }

      return res.json(trafficData);
    } catch (error) {
      console.error(`Error fetching traffic data for server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server traffic data from VirtFusion",
        message: error.message
      });
    }
  });

  // Get VNC details for a server (admin only)
  // VNC details endpoint removed

  // Server power management routes

  // Boot server
  app.post("/api/admin/servers/:id/boot", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin booting server ID: ${serverId}`);

      const result = await virtFusionApi.bootServer(serverId);

      // Extract the queue ID from the response
      let queueId = null;
      if (result && result.data && result.data.queueId) {
        queueId = result.data.queueId;
        console.log(`Boot operation queued with ID: ${queueId}`);

        // Store this queueId in the database for this server
        // This allows us to check the server state via the queue later
        await storage.updateServerPowerStatus(serverId, {
          lastQueueId: queueId,
          lastAction: 'boot',
          lastActionTime: new Date()
        });
      }

      res.json({
        success: true,
        message: "Server boot initiated",
        data: result,
        queueId
      });
    } catch (error: any) {
      console.error(`Error booting server ${req.params.id}:`, error.message);

      // Special handling for 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks"
        });
      }

      res.status(500).json({
        error: "Failed to boot server",
        message: error.message
      });
    }
  });

  // Shutdown server
  app.post("/api/admin/servers/:id/shutdown", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin shutting down server ID: ${serverId}`);

      const result = await virtFusionApi.shutdownServer(serverId);

      // Extract the queue ID from the response
      let queueId = null;
      if (result && result.data && result.data.queueId) {
        queueId = result.data.queueId;
        console.log(`Shutdown operation queued with ID: ${queueId}`);

        // Store this queueId in the database for this server
        await storage.updateServerPowerStatus(serverId, {
          lastQueueId: queueId,
          lastAction: 'shutdown',
          lastActionTime: new Date()
        });
      }

      res.json({
        success: true,
        message: "Server shutdown initiated",
        data: result,
        queueId
      });
    } catch (error: any) {
      console.error(`Error shutting down server ${req.params.id}:`, error.message);

      // Special handling for 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks"
        });
      }

      res.status(500).json({
        error: "Failed to shutdown server",
        message: error.message
      });
    }
  });

  // Restart server
  app.post("/api/admin/servers/:id/restart", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin restarting server ID: ${serverId}`);

      const result = await virtFusionApi.restartServer(serverId);

      // Extract the queue ID from the response
      let queueId = null;
      if (result && result.data && result.data.queueId) {
        queueId = result.data.queueId;
        console.log(`Restart operation queued with ID: ${queueId}`);

        // Store this queueId in the database for this server
        await storage.updateServerPowerStatus(serverId, {
          lastQueueId: queueId,
          lastAction: 'restart',
          lastActionTime: new Date()
        });
      }

      res.json({
        success: true,
        message: "Server restart initiated",
        data: result,
        queueId
      });
    } catch (error: any) {
      console.error(`Error restarting server ${req.params.id}:`, error.message);

      // Special handling for 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks"
        });
      }

      res.status(500).json({
        error: "Failed to restart server",
        message: error.message
      });
    }
  });

  // Power off server
  app.post("/api/admin/servers/:id/power-off", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin powering off server ID: ${serverId}`);

      const result = await virtFusionApi.powerOffServer(serverId);

      // Extract the queue ID from the response
      let queueId = null;
      if (result && result.data && result.data.queueId) {
        queueId = result.data.queueId;
        console.log(`Power off operation queued with ID: ${queueId}`);

        // Store this queueId in the database for this server
        await storage.updateServerPowerStatus(serverId, {
          lastQueueId: queueId,
          lastAction: 'poweroff',
          lastActionTime: new Date()
        });
      }

      res.json({
        success: true,
        message: "Server power off initiated",
        data: result,
        queueId
      });
    } catch (error: any) {
      console.error(`Error powering off server ${req.params.id}:`, error.message);

      // Special handling for 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks"
        });
      }

      res.status(500).json({
        error: "Failed to power off server",
        message: error.message
      });
    }
  });

  // Suspend server
  app.post("/api/admin/servers/:id/suspend", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin suspending server ID: ${serverId}`);

      const result = await virtFusionApi.suspendServer(serverId);
      res.json({ success: true, message: "Server suspended", data: result });
    } catch (error: any) {
      console.error(`Error suspending server ${req.params.id}:`, error.message);

      // Special handling for 409 "action is currently scheduled" and 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('409') ||
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue') ||
        error.message.toLowerCase().includes('action is currently scheduled')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks",
          details: error.message
        });
      }

      res.status(500).json({
        error: "Failed to suspend server",
        message: error.message
      });
    }
  });

  // Reset server password
  app.post("/api/admin/servers/:id/reset-password", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin resetting password for server ID: ${serverId}`);

      // Use axios directly to make the API call with the correct format exactly as specified in VirtFusion API docs
      const apiUrl = process.env.VIRTFUSION_API_URL || "https://vdc.skyvps360.xyz";
      const apiToken = process.env.VIRTFUSION_API_TOKEN;

      if (!apiToken) {
        return res.status(500).json({ error: "VirtFusion API token not configured" });
      }

      // Use the API URL directly since it already includes the /api/v1 path
      let apiBase = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

      const resetUrl = `${apiBase}/servers/${serverId}/resetPassword`;
      console.log(`Making direct POST request to: ${resetUrl}`);

      // Match the EXACT format in the VirtFusion API documentation
      const response = await axios({
        method: 'POST',
        url: resetUrl,
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, */*'
        },
        data: {
          user: 'root',
          sendMail: true
        },
        // Apply SSL verification setting
        httpsAgent: new https.Agent({ rejectUnauthorized: true }),
        // Add a timeout to prevent hanging requests
        timeout: 30000
      });

      console.log('Password reset response:', response.status, response.data);

      // Extract the expected password from the API response
      let generatedPassword = null;
      if (response.data && response.data.data && response.data.data.expectedPassword) {
        generatedPassword = response.data.data.expectedPassword;
        console.log(`Password reset successful, generated password: ${generatedPassword}`);
      } else {
        console.log('No expected password in response', response.data);
      }

      res.json({
        success: true,
        message: "Server password reset",
        data: response.data,
        generatedPassword: generatedPassword
      });
    } catch (error: any) {
      console.error(`Error resetting password for server ${req.params.id}:`, error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
      }

      res.status(500).json({
        error: "Failed to reset server password",
        message: error.message
      });
    }
  });

  // Unsuspend server
  app.post("/api/admin/servers/:id/unsuspend", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin unsuspending server ID: ${serverId}`);

      const result = await virtFusionApi.unsuspendServer(serverId);
      res.json({ success: true, message: "Server unsuspended", data: result });
    } catch (error: any) {
      console.error(`Error unsuspending server ${req.params.id}:`, error.message);

      // Special handling for 409 "action is currently scheduled" and 423 "pending tasks in queue" responses
      if (error.message && (
        error.message.includes('409') ||
        error.message.includes('423') ||
        error.message.toLowerCase().includes('pending tasks in queue') ||
        error.message.toLowerCase().includes('action is currently scheduled') ||
        error.message.toLowerCase().includes('suspend action is currently scheduled')
      )) {
        return res.json({
          success: true,
          pending: true,
          message: "Operation queued - server has pending tasks",
          details: error.message
        });
      }

      res.status(500).json({
        error: "Failed to unsuspend server",
        message: error.message
      });
    }
  });

  // Delete server
  app.delete("/api/admin/servers/:id", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin deleting server ID: ${serverId}`);

      // Schedule deletion after 24 hours by default (if supported by VirtFusion)
      // Otherwise, it will be immediately deleted
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const scheduleAt = tomorrow.toISOString();

      const result = await virtFusionApi.deleteServer(serverId, scheduleAt);
      res.json({ success: true, message: "Server deletion initiated", scheduledTime: scheduleAt, data: result });
    } catch (error: any) {
      console.error(`Error deleting server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to delete server",
        message: error.message
      });
    }
  });

  // VNC Management Endpoints

  // Get VNC status for a server
  app.get("/api/admin/servers/:id/vnc", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin getting VNC status for server ID: ${serverId}`);

      // VirtFusion API only supports POST /servers/{id}/vnc (no GET)
      // This endpoint toggles VNC state and returns current status
      // WARNING: This will toggle the VNC state!
      console.log(`Making VNC API call - this will toggle VNC state for server ${serverId}`);

      // Use the global VirtFusion API instance
      await virtFusionApi.updateSettings();
      const result = await (virtFusionApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        res.json({ success: true, data: result });
      } else {
        res.status(500).json({ error: "Failed to get VNC status" });
      }
    } catch (error: any) {
      console.error("Error getting VNC status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test VNC connectivity (admin only)
  app.get("/api/admin/servers/:id/vnc/test", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      const host = req.query.host as string;
      const port = parseInt(req.query.port as string);

      if (!host || !port) {
        return res.status(400).json({ error: "Missing host or port parameters" });
      }

      console.log(`Testing VNC connectivity to ${host}:${port}`);

      const net = require('net');

      const testConnection = () => {
        return new Promise((resolve, reject) => {
          const socket = net.createConnection({
            host: host,
            port: port,
            timeout: 5000
          });

          socket.on('connect', () => {
            console.log(`Successfully connected to VNC server ${host}:${port}`);
            socket.destroy();
            resolve({ success: true, message: 'VNC server is reachable' });
          });

          socket.on('timeout', () => {
            console.log(`Connection timeout to VNC server ${host}:${port}`);
            socket.destroy();
            reject(new Error('Connection timeout'));
          });

          socket.on('error', (error) => {
            console.log(`Connection error to VNC server ${host}:${port}:`, error.message);
            reject(error);
          });
        });
      };

      const result = await testConnection();
      res.json(result);
    } catch (error: any) {
      console.error(`Error testing VNC connectivity:`, error);
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'Failed to connect to VNC server'
      });
    }
  });

  // Enable VNC for a server
  app.post("/api/admin/servers/:id/vnc/enable", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log(`Admin enabling VNC for server ID: ${serverId}`);

      // VirtFusion API: POST /servers/{serverId}/vnc toggles VNC and returns status
      await virtFusionApi.updateSettings();
      const result = await (virtFusionApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        // Log VNC enable action (this is an intentional admin action)
        await serverLoggingService.logVncAction(
          serverId,
          userId,
          'vnc_enable',
          'success',
          'VNC enabled by administrator',
          undefined,
          req
        );

        res.json({ success: true, message: "VNC enabled successfully", data: result });
      } else {
        // Log failed VNC enable action
        await serverLoggingService.logVncAction(
          serverId,
          userId,
          'vnc_enable',
          'failed',
          undefined,
          'Failed to enable VNC',
          req
        );

        res.status(500).json({ error: "Failed to enable VNC" });
      }
    } catch (error: any) {
      console.error("Error enabling VNC:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Disable VNC for a server
  app.post("/api/admin/servers/:id/vnc/disable", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log(`Admin disabling VNC for server ID: ${serverId}`);

      // VirtFusion API: POST /servers/{serverId}/vnc toggles VNC and returns status
      await virtFusionApi.updateSettings();
      const result = await (virtFusionApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        // Log VNC disable action (this is an intentional admin action)
        await serverLoggingService.logVncAction(
          serverId,
          userId,
          'vnc_disable',
          'success',
          'VNC disabled by administrator',
          undefined,
          req
        );

        res.json({ success: true, message: "VNC disabled successfully", data: result });
      } else {
        // Log failed VNC disable action
        await serverLoggingService.logVncAction(
          serverId,
          userId,
          'vnc_disable',
          'failed',
          undefined,
          'Failed to disable VNC',
          req
        );

        res.status(500).json({ error: "Failed to disable VNC" });
      }
    } catch (error: any) {
      console.error("Error disabling VNC:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Throttle CPU for a server
  app.post("/api/admin/servers/:id/throttle-cpu", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      // Validate request body - requires a percent value
      if (req.body.percent === undefined || req.body.percent < 0 || req.body.percent > 99) {
        return res.status(400).json({
          error: "Invalid throttle value",
          message: "Throttle value must be between 0 and 99 percent"
        });
      }

      console.log(`Admin applying CPU throttle for server ID: ${serverId}, percent: ${req.body.percent}`);

      // Check for pending tasks first to avoid race conditions
      try {
        const serverResponse = await virtFusionApi.getServer(serverId);

        // If server has pending tasks, return 423 status
        if (serverResponse.pendingQueue && serverResponse.pendingQueue.length > 0) {
          console.log(`Server ${serverId} has pending tasks, returning 423 status`);
          return res.status(423).json({
            success: true,
            pending: true,
            msg: `Server has ${serverResponse.pendingQueue.length} pending tasks in queue`,
            pendingQueue: serverResponse.pendingQueue
          });
        }
      } catch (checkError) {
        console.log(`Error checking server pending tasks: ${checkError.message}`);
        // Continue even if this fails
      }

      // Create a throttle data object with the percent value
      // Per VirtFusion API docs: must use "percent" field (not "throttle")
      const throttleData = {
        percent: req.body.percent
      };
      const result = await virtFusionApi.throttleServerCpu(serverId, throttleData);
      res.json({
        success: true,
        message: `CPU throttled to ${req.body.percent}%`,
        data: result
      });
    } catch (error: any) {
      console.error(`Error throttling CPU for server ${req.params.id}:`, error.message);

      // Special handling for pending tasks errors
      if (error.message && (error.message.includes("pending tasks") || error.status === 423)) {
        return res.status(423).json({
          success: true,
          pending: true,
          msg: error.message || "Server has pending tasks in queue"
        });
      }

      res.status(500).json({
        error: "Failed to throttle CPU",
        message: error.message
      });
    }
  });

  // Enable VNC for a server
  app.post("/api/servers/:serverId/vnc/enable", isAuthenticated, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Enabling VNC for server ${serverId}`);
      const vncResponse = await virtFusionApi.toggleVnc(serverId);

      console.log('VNC enable response:', JSON.stringify(vncResponse));
      res.json(vncResponse);
    } catch (error: any) {
      console.error(`Error enabling VNC for server ${req.params.serverId}:`, error);
      res.status(500).json({
        error: error.message || "Failed to enable VNC",
        details: error.response?.data || "Unknown error"
      });
    }
  });

  // Get VNC status for a server
  app.get("/api/servers/:serverId/vnc", isAuthenticated, async (req, res) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Getting VNC status for server ${serverId}`);
      const vncStatus = await virtFusionApi.getVncStatus(serverId);

      console.log('VNC status response:', JSON.stringify(vncStatus));
      res.json(vncStatus);
    } catch (error: any) {
      console.error(`Error getting VNC status for server ${req.params.serverId}:`, error);
      res.status(500).json({
        error: error.message || "Failed to get VNC status",
        details: error.response?.data || "Unknown error"
      });
    }
  });

  // WebSocket handler for VNC proxy
  const handleWebSocketUpgrade = (request: any, socket: any, head: any) => {
    console.log('WebSocket upgrade request received:', {
      url: request.url,
      headers: request.headers,
      method: request.method
    });

    const url = new URL(request.url, `http://${request.headers.host}`);

    // Check if this is a VNC WebSocket request
    if (url.pathname === '/vnc-proxy') {
      const host = url.searchParams.get('host');
      const port = url.searchParams.get('port');

      console.log('VNC WebSocket proxy request:', { host, port });

      if (!host || !port) {
        console.error('Missing host or port parameters for VNC proxy');
        socket.destroy();
        return;
      }

      // Validate port number
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error('Invalid port number for VNC proxy:', port);
        socket.destroy();
        return;
      }

      // Use static imports (already imported at top of file)

      try {
        console.log('Creating WebSocket server for VNC proxy...');

        // Create WebSocket server for this connection
        const wss = new WebSocketServer({ noServer: true });

        console.log('WebSocket server created, attempting upgrade...');

        // Add error handling for the WebSocket server
        wss.on('error', (error) => {
          console.error('WebSocket server error during upgrade:', error);
          socket.destroy();
        });

        // Handle the upgrade with proper error handling
        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log('WebSocket upgrade successful');
          console.log(`VNC WebSocket proxy: Successfully upgraded WebSocket connection`);
          console.log(`VNC WebSocket proxy: Attempting to connect to ${host}:${portNum}`);

          // Create TCP connection to VNC server with timeout
          const vncSocket = net.createConnection({
            host: host,
            port: portNum,
            timeout: 10000 // 10 second timeout
          });

          console.log(`VNC TCP connection created for ${host}:${portNum}`);

          // Track connection state
          let isConnected = false;

          vncSocket.on('connect', () => {
            console.log(`VNC TCP connection established to ${host}:${portNum}`);
            isConnected = true;
          });

          vncSocket.on('timeout', () => {
            console.error(`VNC TCP connection timeout to ${host}:${portNum}`);
            vncSocket.destroy();
            if (ws.readyState === ws.OPEN) {
              ws.close(1011, 'VNC server connection timeout');
            }
          });

          // Forward data between WebSocket and VNC TCP socket
          ws.on('message', (data) => {
            if (isConnected && vncSocket.writable) {
              try {
                // Convert WebSocket data to Buffer for TCP socket
                const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
                vncSocket.write(buffer);
              } catch (error) {
                console.error('Error writing to VNC socket:', error);
              }
            } else {
              console.warn('Attempted to write to disconnected VNC socket');
            }
          });

          vncSocket.on('data', (data) => {
            if (ws.readyState === ws.OPEN) {
              try {
                ws.send(data);
              } catch (error) {
                console.error('Error sending data to WebSocket:', error);
              }
            }
          });

          // Handle connection close
          ws.on('close', (code, reason) => {
            console.log(`VNC WebSocket closed: ${code} - ${reason}`);
            if (vncSocket && !vncSocket.destroyed) {
              vncSocket.destroy();
            }
          });

          vncSocket.on('close', (hadError) => {
            console.log(`VNC TCP socket closed, hadError: ${hadError}`);
            if (ws.readyState === 1) {
              ws.close(1000, 'VNC connection closed');
            }
          });

          // Handle errors
          ws.on('error', (err) => {
            console.error('VNC WebSocket error:', err);
            if (vncSocket && !vncSocket.destroyed) {
              vncSocket.destroy();
            }
          });

          vncSocket.on('error', (err) => {
            console.error(`VNC TCP socket error connecting to ${host}:${portNum}:`, err);
            if (ws.readyState === ws.OPEN) {
              ws.close(1011, `VNC server error: ${err.message}`);
            }
          });
        });

      } catch (error) {
        console.error('Error setting up VNC WebSocket proxy:', error);
        socket.destroy();
      }
    } else {
      console.log('Non-VNC WebSocket request in VNC handler, closing connection:', url.pathname);
      // This should not happen since we're routing at the server level now
      socket.destroy();
    }
  };

  // Sync hypervisors from VirtFusion (admin only)
  app.post("/api/admin/hypervisors/sync", isAdmin, async (req, res) => {
    try {
      console.log("Starting hypervisor sync...");

      // Retrieve current API settings and log them
      const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
      const apiTokenSetting = await storage.getSetting("virtfusion_api_token");
      const sslVerifySetting = await storage.getSetting(
        "virtfusion_ssl_verify",
      );

      console.log("API Settings for hypervisor sync:", {
        apiUrl: apiUrlSetting?.value || "not set",
        apiToken: apiTokenSetting?.value ? "***" : "not set",
        sslVerify: sslVerifySetting?.value || "not set",
      });

      // First test connection to make sure API is working
      console.log("Testing API connection before retrieving hypervisors");
      try {
        await virtFusionApi.testConnection();
        console.log("API connection test successful");
      } catch (error: any) {
        console.error("API connection test failed:", error);
        return res.status(500).json({
          error:
            "Failed to connect to VirtFusion API. Please check your API settings.",
          details: error.message || "Unknown error",
        });
      }

      // Retrieve hypervisors using correct path
      console.log("Retrieving hypervisors from VirtFusion API");
      const hypervisorsResponse = await virtFusionApi.getHypervisors();

      // Check what structure we've received
      console.log(
        "Hypervisor raw response:",
        JSON.stringify(hypervisorsResponse),
      );

      // Handle different possible response formats
      let hypervisors = [];

      if (Array.isArray(hypervisorsResponse)) {
        console.log(
          "Response is an array with length:",
          hypervisorsResponse.length,
        );
        hypervisors = hypervisorsResponse;
      } else if (
        hypervisorsResponse &&
        typeof hypervisorsResponse === "object"
      ) {
        console.log(
          "Response is an object with keys:",
          Object.keys(hypervisorsResponse),
        );
        if (
          hypervisorsResponse.data &&
          Array.isArray(hypervisorsResponse.data)
        ) {
          console.log(
            "Using data array with length:",
            hypervisorsResponse.data.length,
          );
          hypervisors = hypervisorsResponse.data;
        }
      }

      if (hypervisors.length === 0) {
        console.log("No hypervisors found to sync");
        return res.json({
          success: true,
          count: 0,
          message: "No hypervisors found in VirtFusion",
        });
      }

      console.log(
        `Processing ${hypervisors.length} hypervisors from VirtFusion`,
      );

      // Clear existing hypervisors to avoid stale data
      await storage.clearHypervisors();
      console.log("Cleared existing hypervisors from database");

      // Process each hypervisor
      for (const hypervisor of hypervisors) {
        console.log(`Processing hypervisor:`, hypervisor);

        // Extract CPU and Memory from the hypervisor object
        // VirtFusion API can return data in multiple different formats
        console.log(
          `Processing hypervisor resource information - raw data:`,
          JSON.stringify({
            id: hypervisor.id,
            name: hypervisor.name,
            cpu: hypervisor.cpu,
            maxCpu: hypervisor.maxCpu,
            memory: hypervisor.memory,
            maxMemory: hypervisor.maxMemory,
            resources: hypervisor.resources,
            stats: hypervisor.stats,
          }),
        );

        let maxCpu = 0;
        let maxMemory = 0;

        // For CPU processing - try all possible paths in priority order
        if (typeof hypervisor.maxCpu === "number") {
          maxCpu = hypervisor.maxCpu;
        } else if (
          typeof hypervisor.maxCpu === "string" &&
          !isNaN(parseInt(hypervisor.maxCpu, 10))
        ) {
          maxCpu = parseInt(hypervisor.maxCpu, 10);
        } else if (typeof hypervisor.cpu === "number") {
          maxCpu = hypervisor.cpu;
        } else if (
          typeof hypervisor.cpu === "string" &&
          !isNaN(parseInt(hypervisor.cpu, 10))
        ) {
          maxCpu = parseInt(hypervisor.cpu, 10);
        } else if (
          hypervisor.resources &&
          typeof hypervisor.resources.cpu === "number"
        ) {
          maxCpu = hypervisor.resources.cpu;
        } else if (
          hypervisor.resources &&
          typeof hypervisor.resources.cpu === "string" &&
          !isNaN(parseInt(hypervisor.resources.cpu, 10))
        ) {
          maxCpu = parseInt(hypervisor.resources.cpu, 10);
        } else if (
          hypervisor.stats &&
          typeof hypervisor.stats.cpu_count === "number"
        ) {
          maxCpu = hypervisor.stats.cpu_count;
        } else if (
          hypervisor.stats &&
          typeof hypervisor.stats.cpu_count === "string" &&
          !isNaN(parseInt(hypervisor.stats.cpu_count, 10))
        ) {
          maxCpu = parseInt(hypervisor.stats.cpu_count, 10);
        } else if (hypervisor.specs && hypervisor.specs.cpu) {
          // Some hypervisors may return CPU info in the specs object
          const cpuValue = hypervisor.specs.cpu;
          if (typeof cpuValue === "number") {
            maxCpu = cpuValue;
          } else if (
            typeof cpuValue === "string" &&
            !isNaN(parseInt(cpuValue, 10))
          ) {
            maxCpu = parseInt(cpuValue, 10);
          }
        }

        // For Memory processing - try all possible paths in priority order
        // Memory might be in various units (MB, GB, or bytes)
        if (typeof hypervisor.maxMemory === "number") {
          maxMemory = hypervisor.maxMemory;
          console.log("Using hypervisor.maxMemory (number):", maxMemory);
        } else if (
          typeof hypervisor.maxMemory === "string" &&
          !isNaN(parseInt(hypervisor.maxMemory, 10))
        ) {
          maxMemory = parseInt(hypervisor.maxMemory, 10);
          console.log("Using hypervisor.maxMemory (string):", maxMemory);
        } else if (typeof hypervisor.memory === "number") {
          maxMemory = hypervisor.memory;
          console.log("Using hypervisor.memory (number):", maxMemory);
        } else if (
          typeof hypervisor.memory === "string" &&
          !isNaN(parseInt(hypervisor.memory, 10))
        ) {
          maxMemory = parseInt(hypervisor.memory, 10);
          console.log("Using hypervisor.memory (string):", maxMemory);
        } else if (
          hypervisor.resources &&
          typeof hypervisor.resources.memory === "number"
        ) {
          maxMemory = hypervisor.resources.memory;
          console.log("Using hypervisor.resources.memory (number):", maxMemory);
        } else if (
          hypervisor.resources &&
          typeof hypervisor.resources.memory === "string" &&
          !isNaN(parseInt(hypervisor.resources.memory, 10))
        ) {
          maxMemory = parseInt(hypervisor.resources.memory, 10);
          console.log("Using hypervisor.resources.memory (string):", maxMemory);
        } else if (hypervisor.stats && hypervisor.stats.memory_total) {
          // Memory total might be in bytes, need to convert to MB
          const memVal = hypervisor.stats.memory_total;
          console.log("Found hypervisor.stats.memory_total:", memVal);
          if (typeof memVal === "number") {
            // Assume it's in bytes if it's a very large number
            if (memVal > 1000000) {
              maxMemory = Math.round(memVal / (1024 * 1024)); // Convert to MB
              console.log(
                "Converting large number from bytes to MB:",
                memVal,
                "->",
                maxMemory,
              );
            } else {
              maxMemory = memVal; // Assume already in MB
              console.log(
                "Using memory_total as is (already in MB):",
                maxMemory,
              );
            }
          } else if (
            typeof memVal === "string" &&
            !isNaN(parseInt(memVal, 10))
          ) {
            const parsedVal = parseInt(memVal, 10);
            // Assume it's in bytes if it's a very large number
            if (parsedVal > 1000000) {
              maxMemory = Math.round(parsedVal / (1024 * 1024)); // Convert to MB
              console.log(
                "Converting large string from bytes to MB:",
                parsedVal,
                "->",
                maxMemory,
              );
            } else {
              maxMemory = parsedVal; // Assume already in MB
              console.log(
                "Using memory_total string as is (already in MB):",
                maxMemory,
              );
            }
          }
        } else if (hypervisor.specs && hypervisor.specs.memory) {
          // Some hypervisors may return memory info in the specs object
          const memValue = hypervisor.specs.memory;
          console.log("Found hypervisor.specs.memory:", memValue);
          if (typeof memValue === "number") {
            maxMemory = memValue;
            console.log("Using hypervisor.specs.memory (number):", maxMemory);
          } else if (
            typeof memValue === "string" &&
            !isNaN(parseInt(memValue, 10))
          ) {
            maxMemory = parseInt(memValue, 10);
            console.log("Using hypervisor.specs.memory (string):", maxMemory);
          }
        }

        // Apply sanity checks and defaults
        if (maxCpu <= 0) {
          console.warn(
            `Warning: Invalid CPU value (${maxCpu}) for hypervisor ${hypervisor.name}, defaulting to 4`,
          );
          maxCpu = 4; // Default to 4 cores if we get an invalid value
        }

        if (maxMemory <= 0) {
          console.warn(
            `Warning: Invalid Memory value (${maxMemory}) for hypervisor ${hypervisor.name}, defaulting to 16384MB`,
          );
          maxMemory = 16384; // Default to 16GB if we get an invalid value
        }

        // Convert memory values if needed - VirtFusion sometimes reports in GB but we need MB
        // If memory is suspiciously low (less than 1000MB), assume it's in GB and convert
        if (maxMemory > 0 && maxMemory < 1000) {
          console.log(
            `Memory value ${maxMemory} seems to be in GB, converting to MB`,
          );
          maxMemory = maxMemory * 1024;
        }

        // Debug output for CPU and memory
        console.log(
          `FINAL CPU: ${maxCpu}, Memory: ${maxMemory}MB for hypervisor ${hypervisor.name}`,
        );

        await storage.upsertHypervisor({
          virtFusionId: hypervisor.id,
          name: hypervisor.name || `Hypervisor ${hypervisor.id}`,
          ip: hypervisor.ip || "Unknown",
          port: hypervisor.port || 0,
          maxCpu: maxCpu,
          maxMemory: maxMemory,
          enabled:
            typeof hypervisor.enabled === "boolean" ? hypervisor.enabled : true,
        });
      }

      res.json({
        success: true,
        count: hypervisors.length,
        message: `Successfully synced ${hypervisors.length} hypervisors from VirtFusion`,
      });
    } catch (error: any) {
      console.error("Error syncing hypervisors:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific package
  app.get("/api/packages/:id", isAuthenticated, async (req, res) => {
    try {
      const packageId = parseInt(req.params.id);
      if (isNaN(packageId)) {
        return res.status(400).json({ error: "Invalid package ID" });
      }

      console.log(`Fetching package with ID ${packageId} from VirtFusion API`);
      // VirtFusionApi does not have getPackage, so fetch all and filter
      const allPackagesResponse = await virtFusionApi.getPackages();
      let packageData = null;
      if (allPackagesResponse && Array.isArray(allPackagesResponse.data)) {
        packageData = allPackagesResponse.data.find((pkg: any) => pkg.id === packageId);
      }

      // Log the response for debugging
      console.log(
        `Package ${packageId} response:`,
        JSON.stringify(packageData),
      );

      let pkg;
      if (packageData && typeof packageData === "object") {
        pkg = packageData;
      } else {
        return res.status(404).json({ error: "Package not found" });
      }

      res.json(pkg);
    } catch (error: any) {
      console.error(`Error fetching package ${req.params.id}:`, error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch package" });
    }
  });

  // Get OS templates
  app.get("/api/os-templates", isAuthenticated, async (req, res) => {
    try {
      // Try to get from VirtFusion first
      try {
        const templatesData = await virtFusionApi.getOsTemplates();

        // Log the response for debugging
        console.log("OS Templates response:", JSON.stringify(templatesData));

        // Handle different response formats
        let templates;
        if (Array.isArray(templatesData)) {
          templates = templatesData;
        } else if (templatesData.data && Array.isArray(templatesData.data)) {
          templates = templatesData.data;
        } else if (
          templatesData &&
          typeof templatesData === "object" &&
          Object.keys(templatesData).length > 0
        ) {
          // VirtFusion might return a nested structure we need to process
          // Create a flat list from the nested categories
          templates = [];

          // Check if it's the structure with categories and template groups
          if (Array.isArray(templatesData.categories)) {
            // Process categories format
            templatesData.categories.forEach((category) => {
              if (category.templates && Array.isArray(category.templates)) {
                templates = [...templates, ...category.templates];
              }
            });
          } else {
            // Check if we have a collection of template groups
            Object.keys(templatesData).forEach((key) => {
              const group = templatesData[key];
              if (group && group.templates && Array.isArray(group.templates)) {
                templates = [...templates, ...group.templates];
              }
            });
          }
        } else {
          throw new Error("Unexpected API response format");
        }

        // If we got templates, return them in the expected format
        if (templates && templates.length > 0) {
          return res.json({ data: templates });
        }

        // Fall through to error if no templates were found
        throw new Error("No templates found in API response");
      } catch (error) {
        console.error("Error fetching OS templates from API:", error);
        return res.status(500).json({
          error:
            "Failed to retrieve operating system templates from VirtFusion API. Please check API connectivity.",
        });
      }
    } catch (error: any) {
      console.error("Error fetching OS templates:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- System Settings Routes -----

  // Get system settings (admin only)
  app.get("/api/admin/settings", isAdmin, async (req, res) => {
    try {
      const allSettings = await storage.getAllSettings();
      res.json(allSettings);
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update a specific setting - admin only
  app.post("/api/admin/settings/:key", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      if (!key || value === undefined) {
        return res.status(400).json({ error: 'Key and value are required' });
      }

      await storage.upsertSetting(key, String(value));
      const success = true;

      if (!success) {
        return res.status(500).json({ error: 'Failed to update setting' });
      }

      return res.json({ success: true, key, value });
    } catch (error: any) {
      console.error('Error updating setting:', error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Public settings endpoint - accessible to all authenticated users
  app.get("/api/settings/public", (req, res) => {
    // This endpoint should be accessible without authentication
    // for public pages that need footer settings

    try {
      storage.getAllSettings().then(settings => {
        // Filter settings to only include public ones
        const publicSettings = settings.filter(setting =>
          [
            // Company branding
            'company_name', 'company_logo', 'primary_color',

            // Footer settings
            'footer_description',
            'footer_social_icons_enabled',
            'footer_github_url',
            'footer_twitter_url',
            'footer_facebook_url',
            'footer_discord_url',
            'footer_linkedin_url',
            'footer_youtube_url',
            'footer_instagram_url',
            'footer_contact_email',
            'footer_contact_support_text',
            'footer_contact_phone',

            // Loading screen settings - these are safe to expose publicly
            'loading_screen_enabled',
            'loading_screen_animation_duration',
            'loading_screen_min_duration',
            'loading_screen_show_on_all_pages',

            // VirtFusion URL for maintenance page direct access
            'virtfusion_api_url',

            // Enterprise features settings
            'enterprise_features_heading',
            'enterprise_features_subheading',
            'enterprise_feature_icon_1',
            'enterprise_feature_title_1',
            'enterprise_feature_description_1',
            'enterprise_feature_icon_2',
            'enterprise_feature_title_2',
            'enterprise_feature_description_2',
            'enterprise_feature_icon_3',
            'enterprise_feature_title_3',
            'enterprise_feature_description_3',
            'enterprise_feature_icon_4',
            'enterprise_feature_title_4',
            'enterprise_feature_description_4',

            // Support new format for enterprise feature cards
            'enterpriseFeatureCards.0.icon',
            'enterpriseFeatureCards.0.title',
            'enterpriseFeatureCards.0.description',
            'enterpriseFeatureCards.1.icon',
            'enterpriseFeatureCards.1.title',
            'enterpriseFeatureCards.1.description',
            'enterpriseFeatureCards.2.icon',
            'enterpriseFeatureCards.2.title',
            'enterpriseFeatureCards.2.description',
            'enterpriseFeatureCards.3.icon',
            'enterpriseFeatureCards.3.title',
            'enterpriseFeatureCards.3.description'
          ].includes(setting.key)
        );

        // Convert to object format for easier consumption
        const publicSettingsObject = publicSettings.reduce((obj, setting) => {
          obj[setting.key] = setting.value;
          return obj;
        }, {} as Record<string, string>);

        res.json(publicSettingsObject);
      });
    } catch (error: any) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public branding settings endpoint - accessible without authentication
  // This is used for the login page and public pages
  app.get("/api/settings/branding", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      // Only return specific branding settings that are safe for public access
      const brandingSettings = settings.filter(setting =>
        [
          // Basic branding
          'company_name', 'company_logo',
          // Brand colors - new system
          'primary_color', 'secondary_color', 'accent_color',
          // Legacy color (for backward compatibility)
          'company_color',

          // Loading screen settings
          'loading_screen_enabled', 'loading_screen_animation_duration',
          'loading_screen_min_duration', 'loading_screen_show_on_all_pages'
        ].includes(setting.key)
      );

      // Convert to object format for easier consumption
      const brandingObject = brandingSettings.reduce((obj, setting) => {
        obj[setting.key] = setting.value;
        return obj;
      }, {} as Record<string, string>);

      // Add default company name if not set
      if (!brandingObject.company_name) {
        brandingObject.company_name = 'VirtFusion';
      }

      // Set default brand colors if not set
      if (!brandingObject.primary_color) {
        brandingObject.primary_color = '2563eb'; // Default blue
      }

      if (!brandingObject.secondary_color) {
        brandingObject.secondary_color = '10b981'; // Default green
      }

      if (!brandingObject.accent_color) {
        brandingObject.accent_color = 'f59e0b'; // Default amber
      }

      // For backward compatibility, ensure company_color is set
      // (will be removed in future versions)
      if (!brandingObject.company_color) {
        brandingObject.company_color = brandingObject.primary_color;
      }

      res.json(brandingObject);
    } catch (error: any) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public Google Analytics settings endpoint - accessible without authentication
  // This is used by the GoogleAnalytics component on all pages
  app.get("/api/settings/google-analytics", async (req, res) => {
    try {
      const settings = await storage.getAllSettings();
      // Only return Google Analytics settings that are safe for public access
      const googleAnalyticsSettings = settings.filter(setting =>
        [
          'google_analytics_enabled',
          'google_analytics_measurement_id',
          'google_analytics_enhanced_ecommerce',
          'google_analytics_enabled_pages'
        ].includes(setting.key)
      );

      // Convert to object format for easier consumption
      const googleAnalyticsObject = googleAnalyticsSettings.reduce((obj, setting) => {
        obj[setting.key] = setting.value;
        return obj;
      }, {} as Record<string, string>);

      // Parse enabled pages JSON or default to empty array
      let enabledPages: string[] = [];
      if (googleAnalyticsObject.google_analytics_enabled_pages) {
        try {
          enabledPages = JSON.parse(googleAnalyticsObject.google_analytics_enabled_pages);
        } catch (error) {
          console.error('Failed to parse google_analytics_enabled_pages:', error);
          enabledPages = [];
        }
      }

      // Return the settings in the format expected by the GoogleAnalytics component
      res.json({
        enabled: googleAnalyticsObject.google_analytics_enabled === 'true',
        measurementId: googleAnalyticsObject.google_analytics_measurement_id || '',
        enhancedEcommerce: googleAnalyticsObject.google_analytics_enhanced_ecommerce === 'true',

        enabledPages: enabledPages,
      });
    } catch (error: any) {
      console.error("Error fetching Google Analytics settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get cloud pricing settings (accessible to authenticated users)
  app.get("/api/settings/cloud-pricing", isAuthenticated, async (req, res) => {
    try {
      const cloudPricingKeys = [
        'cloud_cpu_price_per_core',
        'cloud_ram_price_per_gb',
        'cloud_storage_price_per_gb',
        'cloud_network_price_per_mbps'
      ];

      const cloudPricing: Record<string, string> = {};

      for (const key of cloudPricingKeys) {
        const setting = await storage.getSetting(key);
        cloudPricing[key] = setting?.value || '0.00';
      }

      return res.json(cloudPricing);
    } catch (error: any) {
      console.error('Error fetching cloud pricing settings:', error);
      return res.status(500).json({ error: 'Failed to fetch cloud pricing settings' });
    }
  });

  // Legal Content Routes
  app.get("/api/legal/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const content = await storage.getLegalContent(type);
      if (!content) {
        return res.status(404).json({ error: "Content not found" });
      }
      return res.json(content);
    } catch (error: any) {
      console.error(`Error fetching legal content (${req.params.type}):`, error);
      return res.status(500).json({ error: error.message || "Error fetching legal content" });
    }
  });

  app.get("/api/admin/legal", isAdmin, async (req, res) => {
    try {
      const content = await storage.getAllLegalContent();
      return res.json(content);
    } catch (error: any) {
      console.error("Error fetching all legal content:", error);
      return res.status(500).json({ error: error.message || "Error fetching legal content" });
    }
  });

  app.post("/api/admin/legal", isAdmin, async (req, res) => {
    try {
      const { type, title, content, version } = req.body;

      if (!type || !title || !content || !version) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if content with this type already exists
      const existingContent = await storage.getLegalContent(type);

      if (existingContent) {
        // Update existing content
        await storage.updateLegalContent(existingContent.id, {
          title,
          content,
          version,
          effectiveDate: new Date(),
          updatedAt: new Date(),
          updatedBy: req.user?.id
        });

        return res.json({
          success: true,
          message: "Legal content updated successfully",
          content: await storage.getLegalContent(type)
        });
      } else {
        // Create new content
        const newContent = await storage.createLegalContent({
          type,
          title,
          content,
          version,
          effectiveDate: new Date(),
          createdBy: req.user?.id,
          updatedBy: req.user?.id
        });

        return res.json({
          success: true,
          message: "Legal content created successfully",
          content: newContent
        });
      }
    } catch (error: any) {
      console.error("Error saving legal content:", error);
      return res.status(500).json({ error: error.message || "Error saving legal content" });
    }
  });

  // Update system setting (admin only)
  app.put("/api/admin/settings/:key", isAdmin, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;

      console.log(
        `Updating setting: ${key} = ${key.includes("token") ? "***" : value}`,
      );

      if (!key || value === undefined) {
        console.log(
          `Invalid setting update request - key: ${key}, value: ${value === undefined ? "undefined" : "provided"}`,
        );
        return res.status(400).json({ error: "Invalid key or value" });
      }

      // Get the current value for comparison
      const currentSetting = await storage.getSetting(key);
      console.log(
        `Current value for ${key}: ${currentSetting ? (key.includes("token") ? "***" : currentSetting.value) : "not set"}`,
      );

      // Save the new value
      await storage.upsertSetting(key, value);
      console.log(`Successfully updated setting: ${key}`);

      // Verify it was saved
      const updatedSetting = await storage.getSetting(key);
      console.log(
        `Verified new value for ${key}: ${updatedSetting ? "exists" : "not found"}`,
      );

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error updating setting:`, error);
      console.error(error.stack); // Log the full stack trace
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Cron Job Management Routes -----

  // Update DNS billing cron settings (admin only)
  app.post("/api/admin/cron/dns-billing", isAdmin, async (req, res) => {
    try {
      const { enabled, schedule } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }

      if (schedule && !cronService.validateCronExpression(schedule)) {
        return res.status(400).json({ error: "Invalid cron schedule expression" });
      }

      await cronService.updateDnsBillingCron(enabled, schedule);

      res.json({
        success: true,
        message: "DNS billing cron settings updated successfully",
        enabled,
        schedule: schedule || 'unchanged'
      });
    } catch (error: any) {
      console.error("Error updating DNS billing cron:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Manually trigger DNS billing renewal (admin only)
  app.post("/api/admin/cron/dns-billing/trigger", isAdmin, async (req, res) => {
    try {
      const results = await cronService.triggerDnsBillingManually();
      res.json({
        success: true,
        message: "DNS billing renewal triggered successfully",
        results
      });
    } catch (error: any) {
      console.error("Error triggering DNS billing renewal:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get cron job status (admin only)
  app.get("/api/admin/cron/status", isAdmin, async (req, res) => {
    try {
      const status = await cronService.getCronStatus();
      const logs = await cronService.getCronLogs();
      const dnsStats = await dnsBillingService.getRenewalStats();

      res.json({
        success: true,
        cronStatus: status,
        cronLogs: logs,
        dnsStats
      });
    } catch (error: any) {
      console.error("Error fetching cron status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Test VirtFusion API connection (admin only)
  app.post(
    "/api/admin/virtfusion/test-connection",
    isAdmin,
    async (req, res) => {
      try {
        console.log("Testing VirtFusion API connection...");

        // Get the latest API settings
        console.log("Fetching latest VirtFusion API settings from database");
        const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
        const apiTokenSetting = await storage.getSetting(
          "virtfusion_api_token",
        );
        const sslVerifySetting = await storage.getSetting(
          "virtfusion_ssl_verify",
        );

        console.log("API settings retrieved from database:", {
          apiUrl: apiUrlSetting?.value || "not set",
          apiToken: apiTokenSetting?.value ? "***" : "not set",
          sslVerify: sslVerifySetting?.value || "not set",
        });

        // Validate the settings
        if (!apiUrlSetting?.value || !apiTokenSetting?.value) {
          console.log("Missing API settings - cannot test connection");
          return res.status(400).json({
            success: false,
            error:
              "Missing API settings. Please configure API URL and token first.",
          });
        }

        // Force the API client to use the latest settings
        console.log("Updating VirtFusion API client with latest settings");
        await virtFusionApi.updateSettings();

        // Test the connection
        try {
          console.log("Making test request to VirtFusion API");
          const result = await virtFusionApi.testConnection();
          console.log(
            "Connection test successful, response:",
            JSON.stringify(result),
          );

          res.json({
            success: true,
            message: "Successfully connected to VirtFusion API",
            data: result,
          });
        } catch (error: any) {
          console.error("Connection test failed:", error);

          res.status(500).json({
            success: false,
            error: "Failed to connect to VirtFusion API",
            details: error.message || "Unknown error",
            stack: error.stack,
          });
        }
      } catch (error: any) {
        console.error("Error testing VirtFusion connection:", error);
        res.status(500).json({
          success: false,
          error: error.message || "Unknown error",
          stack: error.stack,
        });
      }
    },
  );

  // Helper function to sync storage volumes from VirtFusion
  async function syncStorageVolumesFromVirtFusion(
    userId: number,
    virtFusionApi: VirtFusionApi,
  ): Promise<boolean> {
    try {
      console.log("Syncing storage volumes from VirtFusion...");

      // Get user's servers
      const userServers = await storage.getUserServers(userId);

      for (const server of userServers) {
        if (!server.virtFusionId) continue;

        await syncServerStorageFromVirtFusion(
          server.id,
          server.virtFusionId,
          virtFusionApi,
        );
      }

      console.log("Storage volumes sync completed");
      return true;
    } catch (error) {
      console.error("Error syncing storage volumes:", error);
      throw error;
    }
  }

  // Helper function to sync storage for a specific server
  async function syncServerStorageFromVirtFusion(
    serverId: number,
    virtFusionId: number,
    virtFusionApi: VirtFusionApi,
  ): Promise<boolean> {
    try {
      console.log(`Syncing storage for server ${serverId} from VirtFusion...`);

      // Get server details including storage from VirtFusion
      const serverDetails = await virtFusionApi.getServer(virtFusionId, true);

      if (
        serverDetails &&
        serverDetails.storage &&
        Array.isArray(serverDetails.storage)
      ) {
        console.log(
          `Processing ${serverDetails.storage.length} storage volumes for server ${serverId}`,
        );

        for (const volume of serverDetails.storage) {
          const volumeData: InsertStorageVolume = {
            name: volume.name || `Volume ${volume.id}`,
            size: volume.capacity || 0,
            used: Math.floor((volume.capacity || 0) * 0.4), // Estimate usage if not provided
            serverId: serverId,
            type: volume.type || "Unknown",
            status: volume.enabled ? "online" : "offline",
            virtFusionId: volume.id,
            poolId: volume.profile || null,
            hypervisorId: serverDetails.hypervisor_id,
          };

          // Check if volume already exists
          const existingVolumes =
            await storage.getServerStorageVolumes(serverId);
          const existingVolume = existingVolumes.find(
            (v) => v.virtFusionId === volume.id,
          );

          if (existingVolume) {
            // Update existing volume
            await storage.updateStorageVolume(existingVolume.id, volumeData);
          } else {
            // Create new volume
            await storage.createStorageVolume(volumeData);
          }
        }
      }

      console.log(`Storage sync completed for server ${serverId}`);
      return true;
    } catch (error) {
      console.error(`Error syncing storage for server ${serverId}:`, error);
      throw error;
    }
  }

  // ----- Package Routes -----

  // Get all packages
  app.get("/api/packages", isAuthenticated, async (req, res) => {
    try {
      console.log("Getting all packages");
      await virtFusionApi.updateSettings();

      // Test the connection first to make sure API is reachable
      try {
        await virtFusionApi.testConnection();
      } catch (connError: any) {
        console.error("VirtFusion API connection test failed:", connError);
        return res.status(503).json({
          error:
            "There was an error connecting to the VirtFusion API. Please check your connection settings.",
          details: connError.message,
        });
      }

      // Now get the packages
      const packages = await virtFusionApi.getPackages();

      // Validate the response before sending
      if (!packages || (!Array.isArray(packages) && !packages.data)) {
        console.error("Invalid packages response:", packages);
        return res.status(500).json({
          error: "Received invalid response from VirtFusion API",
          details: "The response format was not as expected",
        });
      }

      res.json(packages);
    } catch (error: any) {
      console.error("Error getting packages:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to get packages",
        details: error.message || "Unknown error",
      });
    }
  });

  // Get package by ID
  app.get("/api/packages/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Getting package with ID: ${id}`);
      await virtFusionApi.updateSettings();

      // Test connection first
      try {
        await virtFusionApi.testConnection();
      } catch (connError: any) {
        console.error("VirtFusion API connection test failed:", connError);
        return res.status(503).json({
          error:
            "There was an error connecting to the VirtFusion API. Please check your connection settings.",
          details: connError.message,
        });
      }

      // VirtFusionApi does not have getPackage, so fetch all and filter
      const allPackagesResponse = await virtFusionApi.getPackages();
      let packageData = null;
      if (allPackagesResponse && Array.isArray(allPackagesResponse.data)) {
        packageData = allPackagesResponse.data.find((pkg: any) => pkg.id === parseInt(id));
      }

      if (!packageData) {
        return res.status(404).json({ error: "Package not found" });
      }

      res.json(packageData);
    } catch (error: any) {
      console.error(`Error getting package with ID: ${req.params.id}`, error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to get package",
        details: error.message || "Unknown error",
      });
    }
  });

  // Test adding credits via VirtFusion API (for admin testing only)
  app.post("/api/test-virtfusion-credit", isAdmin, async (req, res) => {
    try {
      const { extRelationId, tokens } = req.body;

      if (!extRelationId || !tokens) {
        return res.status(400).json({ error: "External relation ID and tokens are required" });
      }

      console.log(`Testing VirtFusion credit API with extRelationId=${extRelationId}, tokens=${tokens}`);

      // Update API settings first
      await virtFusionApi.updateSettings();

      // Test VirtFusion connection
      console.log("Testing VirtFusion API connection");
      await virtFusionApi.testConnection();

      // Verify the user exists in VirtFusion
      console.log(`Verifying user exists in VirtFusion with extRelationId: ${extRelationId}`);
      const userCheckResult = await virtFusionApi.getUserByExtRelationId(extRelationId);
      console.log("User verification successful:", userCheckResult);

      // Prepare data for credit API
      const tokenData = {
        tokens: Number(tokens),
        reference_1: Date.now(), // Use timestamp as reference
        reference_2: `API test from admin panel`
      };

      console.log("Sending to VirtFusion API:", tokenData);
      const result = await virtFusionApi.addCreditToUser(
        Number(extRelationId),
        tokenData
      );

      console.log("VirtFusion credit API test result:", result);

      res.json({
        success: true,
        message: `Successfully added ${tokens} tokens to user with extRelationId ${extRelationId}`,
        result
      });
    } catch (error: any) {
      console.error("VirtFusion credit API test failed:", error);

      // Provide detailed error information for debugging
      let errorDetails = {
        message: error.message
      };

      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.data = error.response.data;
      }

      res.status(500).json({
        error: "VirtFusion credit API test failed",
        message: error.message,
        details: errorDetails
      });
    }
  });

  // Test PayPal sandbox verification (admin only)
  app.post("/api/test-paypal-verification", isAdmin, async (req, res) => {
    try {
      const { orderId } = req.body;

      console.log(`Testing PayPal verification for order ID: ${orderId}`);

      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      // Check if we're in sandbox mode
      const isSandbox = process.env.VITE_PAYPAL_SANDBOX === "true";
      const paypalBaseUrl = isSandbox
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

      // Get credentials with debug logging
      console.log(`PayPal Mode: ${isSandbox ? 'SANDBOX' : 'PRODUCTION'}`);

      const clientId = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
        : (process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
      const clientSecret = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_SECRET
        : (process.env.VITE_PAYPAL_SECRET || process.env.PAYPAL_SECRET);

      console.log(`PayPal Client ID exists: ${!!clientId}`);
      console.log(`PayPal Client Secret exists: ${!!clientSecret}`);

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: "PayPal credentials are not configured",
          details: "Missing API credentials"
        });
      }

      // Get an access token
      console.log("Getting PayPal access token...");
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        const tokenError = await tokenResponse.json();
        console.error("PayPal token error:", tokenError);
        return res.status(500).json({
          error: "Failed to get PayPal access token",
          details: tokenError
        });
      }

      const tokenData = await tokenResponse.json();
      console.log("PayPal token obtained");

      // Capture the payment from the order
      console.log(`Capturing payment for order ${orderId}...`);
      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!captureResponse.ok) {
        const captureError = await captureResponse.json();
        console.error("PayPal capture error:", captureError);
        return res.status(500).json({
          error: "Failed to capture PayPal payment",
          details: captureError,
        });
      }

      const captureData = await captureResponse.json();
      console.log("PayPal capture successful:", {
        id: captureData.id,
        status: captureData.status,
      });

      // Return the full response for analysis
      res.json({
        success: true,
        paypal: {
          sandbox: isSandbox,
          order: captureData, // Return captured data instead of original order
        },
      });
    } catch (error) {
      console.error("Error testing PayPal verification:", error);
      res.status(500).json({
        error: "Failed to test PayPal verification",
        details: error.message
      });
    }
  });

  // Special route for transaction downloads that won't be intercepted by Vite
  // This route is explicitly added before the HTTP server is created
  // and will be accessible via a different URL structure
  app.get("/special-download/transactions/:id/pdf", isAuthenticated, async (req, res) => {
    try {
      // Validate transaction ID
      const transactionIdStr = req.params.id;
      if (!transactionIdStr || isNaN(parseInt(transactionIdStr))) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }

      const transactionId = parseInt(transactionIdStr);
      console.log(`Downloading transaction ID: ${transactionId} for user: ${req.user!.id}`);

      // Get transaction from storage
      const transaction = await storage.getTransaction(transactionId);

      if (!transaction) {
        console.error(`Transaction ID ${transactionId} not found in database`);
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Double check the permission
      if (transaction.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to access this transaction" });
      }

      // Get user data for the report
      const user = await storage.getUser(transaction.userId);

      // Get company information for PDF
      const companyName = await storage.getSetting('company_name') || { value: 'SkyVPS360' };
      const companyLogo = await storage.getSetting('company_logo') || { value: '' };

      // Get custom credits branding
      const customCreditsName = await storage.getSetting('custom_credits_name') || { value: 'Custom Credits' };

      // Create a new buffer array to collect PDF data
      const chunks: Buffer[] = [];

      // Create a PDF document
      const doc = new PDFDocument({ margin: 50 });

      // Pipe PDF data to the buffer array
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

      // Create a promise that resolves when the PDF is finished
      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
      });

      // Format the PDF
      formatSingleTransactionPdf(doc, transaction, user, companyName.value, companyLogo.value);

      // Finalize the PDF
      doc.end();

      // Wait for the PDF to be generated
      const pdfBuffer = await pdfPromise;

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transaction-${transaction.id}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store');

      // Send the PDF buffer
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error generating transaction PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to generate transaction download",
          details: error.message
        });
      } else {
        res.end();
      }
    }
  });

  // Datacenter Locations API Endpoints
  // Public endpoint for active datacenter locations
  app.get("/api/datacenter-locations", async (req, res) => {
    try {
      // Execute raw query to ensure we only select columns that exist
      const selectSQL = `
        SELECT id, code, name, region_code, region_name, country, city,
               latitude, longitude, address, provider, tier, is_active,
               features, description, created_at, updated_at, status
        FROM datacenter_locations
        WHERE is_active = true OR status = 'coming_soon'
        ORDER BY region_code, name
      `;

      console.log('Fetching public datacenter locations');
      const result = await pool.query(selectSQL);

      // Map database results to expected format with appropriate defaults
      const locations = result.rows.map((loc: any) => {
        return {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          city: loc.city,
          country: loc.country,
          regionName: loc.region_name,
          regionCode: loc.region_code,
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          provider: loc.provider,
          tier: loc.tier,
          displayOrder: 0, // Virtual field (not in database)
          isActive: loc.is_active,
          status: loc.status || (loc.is_active ? 'active' : 'inactive'),
          isComingSoon: loc.status === 'coming_soon',
          uptime: 99.9, // Virtual field (not in database)
          networkSpeedMbps: 10000, // Virtual field (not in database)
          description: loc.description || '',
          features: loc.features || [],
          createdAt: loc.created_at,
          updatedAt: loc.updated_at
        };
      });

      res.json(locations);
    } catch (error: any) {
      console.error("Error fetching datacenter locations:", error);
      res.status(500).json({ error: "Failed to fetch datacenter locations", details: error.message });
    }
  });

  // Admin endpoint for all datacenter locations
  app.get("/api/admin/datacenter-locations", isAdmin, async (req, res) => {
    try {
      // Execute raw query to ensure we only select columns that exist
      const selectSQL = `
        SELECT id, code, name, region_code, region_name, country, city,
               latitude, longitude, address, provider, tier, is_active,
               features, description, created_at, updated_at, status
        FROM datacenter_locations
        ORDER BY region_code, name
      `;

      console.log('Fetching datacenter locations');
      const result = await pool.query(selectSQL);

      // Map database results to expected format with appropriate defaults
      const locations = result.rows.map((loc: any) => {
        return {
          id: loc.id,
          name: loc.name,
          code: loc.code,
          city: loc.city,
          country: loc.country,
          regionName: loc.region_name,
          regionCode: loc.region_code,
          latitude: loc.latitude,
          longitude: loc.longitude,
          address: loc.address,
          provider: loc.provider,
          tier: loc.tier,
          displayOrder: 0, // Virtual field (not in database)
          isActive: loc.is_active,
          status: loc.status || (loc.is_active ? 'active' : 'inactive'),
          uptime: 99.9, // Virtual field (not in database)
          networkSpeedMbps: 10000, // Virtual field (not in database)
          description: loc.description || '',
          features: loc.features || [],
          createdAt: loc.created_at,
          updatedAt: loc.updated_at
        };
      });

      res.json(locations);
    } catch (error: any) {
      console.error("Error fetching all datacenter locations:", error);
      res.status(500).json({ error: "Failed to fetch datacenter locations", details: error.message });
    }
  });

  // Create new datacenter location
  app.post("/api/admin/datacenter-locations", isAdmin, async (req, res) => {
    try {
      // Get form data from request body
      const formData = req.body;

      // Set isActive based on status
      let isActive = true;

      // Only set to false if status is explicitly 'inactive'
      // For both 'active' and 'coming_soon', isActive should be true in the database
      if (formData.status === 'inactive') {
        isActive = false;
      }

      // Features need special handling - convert array to JSON string
      const featuresJson = JSON.stringify(formData.features || []);

      // Execute a raw SQL insert query with all appropriate columns
      const insertSQL = `
        INSERT INTO datacenter_locations
        (
          name,
          code,
          city,
          country,
          region_name,
          region_code,
          latitude,
          longitude,
          is_active,
          description,
          features,
          address,
          provider,
          tier,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, $14, $15, NOW(), NOW())
        RETURNING *
      `;

      const insertParams = [
        formData.name,
        formData.code,
        formData.city,
        formData.country,
        formData.regionName,
        formData.regionCode,
        formData.latitude,
        formData.longitude,
        isActive,
        formData.description || '',
        featuresJson,  // Use the JSON string instead of array directly
        formData.address || '',
        formData.provider || '',
        formData.tier || '',
        formData.status || 'active'  // Store status directly in database
      ];

      console.log('Creating datacenter location with params:', JSON.stringify(insertParams));
      const result = await pool.query(insertSQL, insertParams);

      // Map the result to the expected format - add virtual fields that don't exist in DB yet
      if (result.rows.length === 0) {
        return res.status(500).json({ error: "Failed to create datacenter location" });
      }

      const location = result.rows[0];

      const mappedLocation = {
        id: location.id,
        name: location.name,
        code: location.code,
        city: location.city,
        country: location.country,
        regionName: location.region_name,
        regionCode: location.region_code,
        latitude: location.latitude,
        longitude: location.longitude,
        displayOrder: 0, // Not in database yet, use default
        isActive: location.is_active,
        status: formData.status || (location.is_active ? 'active' : 'inactive'),
        uptime: formData.uptime || 99.9,
        networkSpeedMbps: formData.networkSpeedMbps || 10000,
        description: location.description || '',
        address: location.address || '',
        provider: location.provider || '',
        tier: location.tier || '',
        features: location.features || [],
        createdAt: location.created_at,
        updatedAt: location.updated_at
      };

      res.status(201).json(mappedLocation);
    } catch (error: any) {
      console.error("Error creating datacenter location:", error);
      res.status(500).json({ error: "Failed to create datacenter location", details: error.message });
    }
  });

  // Update datacenter location
  app.put("/api/admin/datacenter-locations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const formData = req.body;

      // Handle the status field correctly to ensure it's preserved
      let isActive = true;

      // Set isActive based on status
      // Only set to false if status is explicitly 'inactive'
      // For both 'active' and 'coming_soon', isActive should be true in the database
      if (formData.status === 'inactive') {
        isActive = false;
      }

      // Now we can directly update the status in the database
      console.log(`Updated status for location ${id} to "${formData.status}"`);

      // Execute a raw SQL update query with all columns including status
      // Features need special handling - convert array to JSON string
      const featuresJson = JSON.stringify(formData.features || []);

      const updateSQL = `
        UPDATE datacenter_locations
        SET
          name = $1,
          code = $2,
          city = $3,
          country = $4,
          region_name = $5,
          region_code = $6,
          latitude = $7,
          longitude = $8,
          is_active = $9,
          description = $10,
          features = $11::jsonb,
          address = $12,
          provider = $13,
          tier = $14,
          status = $15,
          updated_at = NOW()
        WHERE id = $16
        RETURNING *
      `;

      const updateParams = [
        formData.name,
        formData.code,
        formData.city,
        formData.country,
        formData.regionName,
        formData.regionCode,
        formData.latitude,
        formData.longitude,
        isActive,
        formData.description || '',
        featuresJson,  // Use the JSON string instead of array directly
        formData.address || '',
        formData.provider || '',
        formData.tier || '',
        formData.status || 'active',
        id
      ];

      console.log('Updating datacenter location with params:', JSON.stringify(updateParams));
      const result = await pool.query(updateSQL, updateParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Datacenter location not found" });
      }

      // Map the result to the expected format - derive status and other missing fields
      const location = result.rows[0];
      const mappedLocation = {
        id: location.id,
        name: location.name,
        code: location.code,
        city: location.city,
        country: location.country,
        regionName: location.region_name,
        regionCode: location.region_code,
        latitude: location.latitude,
        longitude: location.longitude,
        displayOrder: 0, // Not in database yet, use default
        isActive: location.is_active,
        status: formData.status || (location.is_active ? 'active' : 'inactive'),
        uptime: formData.uptime || 99.9,
        networkSpeedMbps: formData.networkSpeedMbps || 10000,
        description: location.description || '',
        address: location.address || '',
        provider: location.provider || '',
        tier: location.tier || '',
        features: location.features || [],
        createdAt: location.created_at,
        updatedAt: location.updated_at
      };

      res.json(mappedLocation);
    } catch (error: any) {
      console.error(`Error updating datacenter location:`, error);
      res.status(500).json({ error: "Failed to update datacenter location", details: error.message });
    }
  });

  // Delete datacenter location
  app.delete("/api/admin/datacenter-locations/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Check if the location exists first
      const checkSQL = `SELECT id FROM datacenter_locations WHERE id = $1`;
      const checkResult = await pool.query(checkSQL, [id]);

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "Datacenter location not found" });
      }

      // Delete using raw SQL
      const deleteSQL = `DELETE FROM datacenter_locations WHERE id = $1`;
      await pool.query(deleteSQL, [id]);

      console.log(`Deleted datacenter location ${id}`);
      res.status(204).send();
    } catch (error: any) {
      console.error(`Error deleting datacenter location:`, error);
      res.status(500).json({ error: "Failed to delete datacenter location", details: error.message });
    }
  });

  // Plan features endpoint - Public fetch all plan features
  app.get("/api/plan-features", async (req, res) => {
    try {
      console.log('Fetching all plan features for public display');
      // Get all active plan features from database
      const planFeatures = await storage.getAllPlanFeatures();
      const activeFeatures = planFeatures.filter(f => f.isActive);
      console.log(`Returning ${activeFeatures.length} active plan features of ${planFeatures.length} total`);
      res.json(activeFeatures);
    } catch (error: any) {
      console.error('Error fetching plan features:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin plan features endpoints
  app.get("/api/admin/plan-features", isAdmin, async (req, res) => {
    try {
      // Get all plan features from the database
      const features = await storage.getAllPlanFeatures();
      res.json(features);
    } catch (error: any) {
      console.error('Error fetching admin plan features:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/plan-features", isAdmin, async (req, res) => {
    try {
      const { title, description, category, icon, isActive, displayOrder } = req.body;

      console.log("Creating plan feature with data:", req.body);

      if (!title) {
        return res.status(400).json({ error: "Feature title is required" });
      }

      const newFeature = await storage.createPlanFeature({
        title: title,
        description: description || '',
        category: category || 'general',
        icon: icon || 'check',
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder !== undefined ? displayOrder : 0
      });

      console.log("Created new feature:", newFeature);
      res.status(201).json(newFeature);
    } catch (error: any) {
      console.error("Error creating plan feature:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/plan-features/:id", isAdmin, async (req, res) => {
    try {
      const featureId = parseInt(req.params.id);
      if (isNaN(featureId)) {
        return res.status(400).json({ error: "Invalid feature ID" });
      }

      console.log(`Updating plan feature ID ${featureId} with data:`, req.body);

      // Extract all the fields from the request body
      const { title, description, category, icon, isActive, displayOrder } = req.body;

      // Check if the feature exists before updating
      const existingFeature = await storage.getPlanFeatureById(featureId);
      if (!existingFeature) {
        console.error(`Plan feature with ID ${featureId} not found during update`);
        return res.status(404).json({ error: "Feature not found" });
      }

      // Create update object with the correct field names
      const updateData: Partial<schema.PlanFeature> = {};

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (icon !== undefined) updateData.icon = icon;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

      // Actually update the feature in the database
      console.log(`Applying update to plan feature ${featureId}:`, updateData);
      await storage.updatePlanFeature(featureId, updateData);

      // Get the updated feature and return it
      const updatedFeature = await storage.getPlanFeatureById(featureId);

      if (!updatedFeature) {
        console.error(`Failed to retrieve updated plan feature ${featureId} after update`);
        return res.status(404).json({ error: "Feature not found after update" });
      }

      console.log(`Successfully updated plan feature ${featureId}:`, updatedFeature);
      res.json(updatedFeature);
    } catch (error: any) {
      console.error("Error updating plan feature:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/plan-features/:id", isAdmin, async (req, res) => {
    try {
      const featureId = parseInt(req.params.id);
      if (isNaN(featureId)) {
        return res.status(400).json({ error: "Invalid feature ID" });
      }

      // Check if the feature exists
      const feature = await storage.getPlanFeatureById(featureId);
      if (!feature) {
        return res.status(404).json({ error: "Feature not found" });
      }

      // Actually delete the feature from the database
      await storage.deletePlanFeature(featureId);

      res.json({ success: true, message: "Feature deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting plan feature:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Blog Category API endpoints - Administrator
  app.get("/api/admin/blog-categories", isAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get all blog categories
  app.get("/api/admin/blog/categories", isAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/blog-categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const category = await storage.getBlogCategoryById(id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json(category);
    } catch (error: any) {
      console.error(`Error fetching blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blog-categories", isAdmin, async (req, res) => {
    try {
      const userId = req.user!.id; // Get user ID from the authenticated user

      // Extract the fields we need
      const { name, slug, description, displayOrder } = req.body;

      // Validation
      if (!name || !slug) {
        return res.status(400).json({ error: "Name and slug are required" });
      }

      // Create the category with current user as creator
      const category = await storage.createBlogCategory({
        name,
        slug,
        description,
        displayOrder: displayOrder || 0,
        createdBy: userId,
        updatedBy: userId
      });

      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating blog category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/blog-categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const userId = req.user!.id;

      const category = await storage.getBlogCategoryById(id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Extract fields to update
      const { name, slug, description, displayOrder, active } = req.body;

      const updates: any = { updatedBy: userId };
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug;
      if (description !== undefined) updates.description = description;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
      if (active !== undefined) updates.active = active;

      await storage.updateBlogCategory(id, updates);

      // Get the updated category and return it
      const updatedCategory = await storage.getBlogCategoryById(id);
      res.json(updatedCategory);
    } catch (error: any) {
      console.error(`Error updating blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/blog-categories/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const category = await storage.getBlogCategoryById(id);
      if (!category) {
        return res.status(404).json({ error: "Category not found" });
      }

      // First update any blog posts with this category to have no category
      const postsInCategory = await storage.getBlogPostsByCategory(id);
      for (const post of postsInCategory) {
        await storage.updateBlogPost(post.id, { categoryId: null });
      }

      // Now delete the category
      await storage.deleteBlogCategory(id);

      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Blog API endpoints - Blog Categories
  app.get("/api/admin/blog-categories", isAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/blog-categories", async (req, res) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blog-categories", isAdmin, async (req, res) => {
    try {
      const { name, description, displayOrder } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      // Generate a slug from the name
      let baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug exists and add suffix if needed
      let existingCategory = await storage.getBlogCategoryBySlug(baseSlug);
      let slug = baseSlug;

      if (existingCategory) {
        // Add a random suffix for uniqueness
        const randomSuffix = Math.floor(Math.random() * 10000);
        slug = `${baseSlug}-${randomSuffix}`;
      }

      // Create the category
      const newCategory = await storage.createBlogCategory({
        name,
        slug,
        description: description || '',
        displayOrder: displayOrder || 0,
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      });

      res.status(201).json(newCategory);
    } catch (error: any) {
      console.error("Error creating blog category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/blog-categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      // Check if the category exists
      const existingCategory = await storage.getBlogCategoryById(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Delete the category
      await storage.deleteBlogCategory(categoryId);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting blog category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Blog API endpoints - Blog Posts
  app.get("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      // Get all blog posts with categories, including unpublished ones (for admin)
      const posts = await storage.getBlogPostsWithCategories(true);
      res.json(posts);
    } catch (error: any) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }

      const post = await storage.getBlogPostById(postId);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error: any) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blog", isAdmin, async (req, res) => {
    try {
      // Validate required fields
      const { title, content, snippet } = req.body;

      if (!title || !content || !snippet) {
        return res.status(400).json({ error: "Title, content, and snippet are required" });
      }

      // Generate a slug from the title
      let baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug exists and add suffix if needed
      let existingPost = await storage.getBlogPostBySlug(baseSlug);
      let slug = baseSlug;

      if (existingPost) {
        // Add a random suffix for uniqueness
        const randomSuffix = Math.floor(Math.random() * 10000);
        slug = `${baseSlug}-${randomSuffix}`;
      }

      // Create the blog post
      // Ensure date is a proper Date object
      let postDate: Date;
      try {
        postDate = req.body.date ? new Date(req.body.date) : new Date();
        // Validate that the date is valid
        if (isNaN(postDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (err) {
        console.error("Invalid date format, using current date:", err);
        postDate = new Date();
      }

      // Extract optional fields
      const {
        author,
        featuredImageUrl,
        excerpt,
        tags,
        categoryId,
        displayOrder,
        published
      } = req.body;

      const newPost = await storage.createBlogPost({
        title,
        slug,
        content,
        snippet,
        author: author || null,
        featuredImageUrl: featuredImageUrl || null,
        excerpt: excerpt || null,
        tags: tags || null,
        categoryId: categoryId || null,
        date: postDate,
        published: published === undefined ? false : published,
        displayOrder: displayOrder || 0,
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      });

      res.status(201).json(newPost);
    } catch (error: any) {
      console.error("Error creating blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }

      // Check if the post exists
      const existingPost = await storage.getBlogPostById(postId);
      if (!existingPost) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Process the request body
      const updates = { ...req.body };

      // Handle date properly if it's included in the update
      if (updates.date) {
        try {
          const updatedDate = new Date(updates.date);
          // Validate the date
          if (isNaN(updatedDate.getTime())) {
            throw new Error("Invalid date format");
          }
          updates.date = updatedDate;
        } catch (err) {
          console.error("Invalid date format in update, using existing date:", err);
          updates.date = existingPost.date;
        }
      }

      // Update the post
      await storage.updateBlogPost(postId, {
        ...updates,
        updatedBy: req.user!.id
      });

      // Fetch the updated post
      const updatedPost = await storage.getBlogPostById(postId);

      res.json(updatedPost);
    } catch (error: any) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/blog/:id", isAdmin, async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) {
        return res.status(400).json({ error: "Invalid post ID" });
      }

      // Check if the post exists
      const existingPost = await storage.getBlogPostById(postId);
      if (!existingPost) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      // Delete the post
      await storage.deleteBlogPost(postId);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Doc Categories API endpoints
  app.get("/api/admin/doc-categories", isAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllDocCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching doc categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/doc-categories", async (req, res) => {
    try {
      const categories = await storage.getAllDocCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching doc categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/doc-categories", isAdmin, async (req, res) => {
    try {
      const { name, description, displayOrder } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      // Generate a slug from the name
      let baseSlug = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Check if slug exists and add suffix if needed
      let existingCategory = await storage.getDocCategoryBySlug(baseSlug);
      let slug = baseSlug;

      if (existingCategory) {
        // Add a random suffix for uniqueness
        const randomSuffix = Math.floor(Math.random() * 10000);
        slug = `${baseSlug}-${randomSuffix}`;
      }

      // Create the category
      const newCategory = await storage.createDocCategory({
        name,
        slug,
        description: description || '',
        displayOrder: displayOrder || 0,
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      });

      res.status(201).json(newCategory);
    } catch (error: any) {
      console.error("Error creating doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/doc-categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const { name, description, displayOrder } = req.body;

      // Check if the category exists
      const existingCategory = await storage.getDocCategoryById(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Update the category
      await storage.updateDocCategory(categoryId, {
        name,
        description,
        displayOrder,
        updatedBy: req.user!.id
      });

      // Fetch the updated category
      const updatedCategory = await storage.getDocCategoryById(categoryId);

      res.json(updatedCategory);
    } catch (error: any) {
      console.error("Error updating doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/doc-categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      // Check if the category exists
      const existingCategory = await storage.getDocCategoryById(categoryId);
      if (!existingCategory) {
        return res.status(404).json({ error: "Category not found" });
      }

      // Delete the category (this also removes category_id from all docs)
      await storage.deleteDocCategory(categoryId);

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Docs API endpoints
  app.get("/api/admin/docs", isAdmin, async (req, res) => {
    try {
      // For admin routes, always include unpublished docs
      // Check if category filter is applied
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;

      const docs = await storage.getAllDocs(true, categoryId);
      console.log("Retrieved docs:", docs);
      res.json(docs || []);
    } catch (error: any) {
      console.error("Error fetching docs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/docs/:id", isAdmin, async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid doc ID" });
      }

      // Return a placeholder doc
      res.json({
        id: docId,
        title: "Sample Doc",
        content: "Sample content",
        created_at: new Date()
      });
    } catch (error: any) {
      console.error("Error fetching doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/docs", isAdmin, async (req, res) => {
    try {
      const { title, content, published, displayOrder, categoryId } = req.body;

      if (!title || !content) {
        return res.status(400).json({ error: "Title and content are required" });
      }

      // Generate a base slug from the title
      let baseSlug = title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      // Add a random suffix to avoid slug collisions
      const randomSuffix = Math.floor(Math.random() * 10000);
      const slug = `${baseSlug}-${randomSuffix}`;

      console.log("Creating doc with categoryId:", categoryId);

      // Create the doc in the database
      const newDoc = await storage.createDoc({
        title,
        content,
        slug,
        categoryId, // Include the categoryId in the document creation
        published: published || false,
        displayOrder: displayOrder || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: req.user!.id,
        updatedBy: req.user!.id
      });

      console.log("Created doc:", newDoc);
      res.status(201).json(newDoc);
    } catch (error: any) {
      console.error("Error creating doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/docs/:id", isAdmin, async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid doc ID" });
      }

      const { title, content, published, displayOrder, categoryId } = req.body;

      console.log("Updating doc with categoryId:", categoryId);

      // Check if the doc exists
      const existingDoc = await storage.getDocById(docId);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Generate a new slug if title changed
      let slug = existingDoc.slug;
      if (title && title !== existingDoc.title) {
        // Generate a base slug from the title
        let baseSlug = title.toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        // Add a random suffix to avoid slug collisions
        const randomSuffix = Math.floor(Math.random() * 10000);
        slug = `${baseSlug}-${randomSuffix}`;
      }

      // Update the doc in the database
      await storage.updateDoc(docId, {
        title,
        content,
        slug,
        categoryId, // Include the categoryId in document updates
        published,
        displayOrder,
        updatedAt: new Date(),
        updatedBy: req.user!.id
      });

      // Fetch the updated doc to return
      const updatedDoc = await storage.getDocById(docId);

      console.log("Updated doc:", updatedDoc);
      res.json(updatedDoc);
    } catch (error: any) {
      console.error("Error updating doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/docs/:id", isAdmin, async (req, res) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) {
        return res.status(400).json({ error: "Invalid doc ID" });
      }

      // Check if the doc exists
      const existingDoc = await storage.getDocById(docId);
      if (!existingDoc) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Delete the doc
      await storage.deleteDoc(docId);

      console.log(`Deleted doc with ID: ${docId}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // FAQs API endpoints
  app.get("/api/faqs", async (req, res) => {
    try {
      console.log('Fetching all FAQs for public display');
      // Get all active FAQs from database
      const faqs = await storage.getAllFaqItems();
      const activeFaqs = faqs.filter(f => f.isActive);
      console.log(`Returning ${activeFaqs.length} active FAQs of ${faqs.length} total`);
      res.json(activeFaqs);
    } catch (error: any) {
      console.error("Error fetching FAQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/faqs", isAdmin, async (req, res) => {
    try {
      console.log('Fetching all FAQs for admin display');
      // Get all FAQs from the database (including inactive ones)
      const faqs = await storage.getAllFaqItems();
      console.log(`Returning ${faqs.length} total FAQs to admin`);
      res.json(faqs);
    } catch (error: any) {
      console.error("Error fetching FAQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faqs", isAdmin, async (req, res) => {
    try {
      const { question, answer, category, displayOrder } = req.body;

      if (!question || !answer) {
        return res.status(400).json({ error: "Question and answer are required" });
      }

      // Create the new FAQ
      const newFaq = await storage.createFaqItem({
        question,
        answer,
        category: category || 'general',
        displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
        isActive: true
      });

      console.log('Created new FAQ:', newFaq);
      res.status(201).json(newFaq);
    } catch (error: any) {
      console.error("Error creating FAQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/faqs/:id", isAdmin, async (req, res) => {
    try {
      console.log('[FAQ][PATCH] Request body:', req.body);
      const faqId = parseInt(req.params.id);
      if (isNaN(faqId)) {
        return res.status(400).json({ error: "Invalid FAQ ID" });
      }

      const { question, answer, category, displayOrder, isActive } = req.body;

      // Get the existing FAQ
      const existingFaq = await storage.getFaqItemById(faqId);
      if (!existingFaq) {
        return res.status(404).json({ error: "FAQ not found" });
      }

      // Update the FAQ
      const updateData: any = {
        updatedAt: new Date()
      };

      if (question !== undefined) updateData.question = question;
      if (answer !== undefined) updateData.answer = answer;
      if (category !== undefined) updateData.category = category;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      try {
        // Update the FAQ and get the updated record directly
        const updatedFaq = await storage.updateFaqItem(faqId, updateData);
        console.log('[FAQ][PATCH] Successfully updated FAQ:', updatedFaq);

        // Make sure we return a valid JSON response
        return res.status(200).json(updatedFaq || { success: true });
      } catch (dbError: any) {
        console.error("[FAQ][PATCH] Database error:", dbError);
        return res.status(500).json({ error: dbError.message });
      }
    } catch (error: any) {
      console.error("[FAQ][PATCH] Unexpected error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/faqs/:id", isAdmin, async (req, res) => {
    try {
      const faqId = parseInt(req.params.id);
      if (isNaN(faqId)) {
        return res.status(400).json({ error: "Invalid FAQ ID" });
      }

      // Get the existing FAQ
      const existingFaq = await storage.getFaqItemById(faqId);
      if (!existingFaq) {
        return res.status(404).json({ error: "FAQ not found" });
      }

      // Delete the FAQ
      await storage.deleteFaqItem(faqId);
      console.log(`FAQ ${faqId} deleted by admin ${req.user?.id}`);

      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting FAQ:", error);
      res.status(500).json({ error: error.message });
    }
  });



  // Public package pricing endpoint
  app.get("/api/public/package-pricing", async (req, res) => {
    try {
      console.log("Fetching package pricing from database");

      // Get all pricing data from our database
      const pricingRecords = await db.select().from(schema.packagePricing);
      console.log("Retrieved pricing records:", pricingRecords);

      // Convert to the expected format: { packageId: price, packageName: price }
      const pricing = pricingRecords.reduce((acc, record) => {
        // Include both by ID and by name for flexibility
        acc[record.virtFusionPackageId] = record.price / 100; // Convert from cents to dollars
        if (record.name) {
          acc[record.name] = record.price / 100;
        }
        return acc as Record<string | number, number>;
      }, {} as Record<string | number, number>);

      console.log("Formatted pricing data:", pricing);

      // Add fallback pricing for common packages if we don't have custom pricing
      const fallbackPricing = {
        'KVMStorage100': 2.50,  // 250 tokens = $2.50
        'KVMStorage200': 5.00,  // 500 tokens = $5.00
        'KVMStorage400': 10.00, // 1000 tokens = $10.00
        'KVMStorage800': 20.00, // 2000 tokens = $20.00
        'KVMStorage1600': 40.00, // 4000 tokens = $40.00
      };

      // Only use fallbacks if we don't have custom pricing
      Object.keys(fallbackPricing).forEach(key => {
        if (!pricing[key]) {
          pricing[key] = fallbackPricing[key as keyof typeof fallbackPricing];
        }
      });

      console.log("Final pricing data with fallbacks:", pricing);
      return res.json(pricing);
    } catch (error: any) {
      console.error('Error fetching package pricing:', error);
      // Return empty object on error to prevent breaking client display
      res.json({});
    }
  });

  // Platform stats endpoint
  // Service status endpoint (BetterStack integration)
  app.get("/api/public/service-status", async (req, res) => {
    try {
      console.log("Getting service status from BetterStack");
      // Import here to avoid circular dependencies
      const { betterStackService } = await import('./betterstack-service');

      // Initialize BetterStack service
      const isConfigured = await betterStackService.initialize();

      if (!isConfigured) {
        console.log("BetterStack API not configured, returning default status");
        return res.json({
          overall: 'operational',
          services: []
        });
      }

      // Get service statuses from BetterStack
      const services = await betterStackService.getServiceStatuses();
      const overall = await betterStackService.getOverallStatus();

      res.json({
        overall,
        services
      });
    } catch (error) {
      console.error("Error retrieving service status:", error);
      res.status(500).json({
        error: "Failed to load service status. Please try again later."
      });
    }
  });

  app.get("/api/public/platform-stats", async (req, res) => {
    try {
      console.log("Getting platform statistics");

      // Update VirtFusion API settings
      await virtFusionApi.updateSettings();

      // Get manual override values from settings (will be added to real counts)
      const serverCountSetting = await storage.getSetting("platform_server_count");
      const hypervisorCountSetting = await storage.getSetting("platform_hypervisor_count");
      const additionalCpuSetting = await storage.getSetting("platform_cpu_cores");
      const additionalMemorySetting = await storage.getSetting("platform_memory_gb");

      // Initialize real counts from API (default to 0)
      let realServerCount = 0;
      let realHypervisorCount = 0;
      let realTotalCpuCores = 0;
      let realTotalMemoryGB = 0;

      // Additional counts from manual settings (default to 0)
      let additionalServerCount = 0;
      let additionalHypervisorCount = 0;
      let additionalCpuCores = 0;
      let additionalMemoryGB = 0;

      // Try to get real counts from VirtFusion API
      try {
        console.log("Fetching server count from VirtFusion API");
        const serversResponse = await virtFusionApi.getServers();

        // Handle different response formats
        if (Array.isArray(serversResponse)) {
          realServerCount = serversResponse.length;
        } else if (serversResponse?.data && Array.isArray(serversResponse.data)) {
          realServerCount = serversResponse.data.length;
        } else if (serversResponse && typeof serversResponse.total !== 'undefined') {
          realServerCount = serversResponse.total;
        } else if (serversResponse?.data) {
          // Fallback to length of data array if total not available
          realServerCount = serversResponse.data.length || 0;
        }

        console.log(`Got real server count from API: ${realServerCount}`);
      } catch (error) {
        console.error("Error fetching server count from VirtFusion:", error);
      }

      // Try to get hypervisor data from API and calculate resource totals
      try {
        console.log("Fetching hypervisor data from VirtFusion API");
        const hypervisorsResponse = await virtFusionApi.getHypervisors();

        // Log the raw hypervisors response for debugging
        console.log("Raw hypervisors response:", JSON.stringify(hypervisorsResponse).substring(0, 1000) + "...");

        // Extract hypervisors array
        let hypervisors = [];
        if (Array.isArray(hypervisorsResponse)) {
          hypervisors = hypervisorsResponse;
          realHypervisorCount = hypervisors.length;
        } else if (hypervisorsResponse?.data && Array.isArray(hypervisorsResponse.data)) {
          hypervisors = hypervisorsResponse.data;
          realHypervisorCount = hypervisors.length;
        } else if (hypervisorsResponse?.total) {
          realHypervisorCount = hypervisorsResponse.total;
        }

        console.log(`Got real hypervisor count from API: ${realHypervisorCount}`);

        // Calculate total CPU cores and memory from all hypervisors
        if (hypervisors.length > 0) {
          for (const hypervisor of hypervisors) {
            console.log(`Processing hypervisor ${hypervisor.id}: maxCpu=${hypervisor.maxCpu}, maxMemory=${hypervisor.maxMemory}`);

            // Add CPU cores
            if (hypervisor.maxCpu && !isNaN(hypervisor.maxCpu)) {
              realTotalCpuCores += parseInt(hypervisor.maxCpu, 10);
            }

            // Add memory (convert from MB to GB)
            if (hypervisor.maxMemory && !isNaN(hypervisor.maxMemory)) {
              // Convert memory from MB to GB and round to nearest integer
              const memoryGB = Math.round(parseInt(hypervisor.maxMemory, 10) / 1024);
              realTotalMemoryGB += memoryGB;
            }
          }
        }

        console.log(`Total real CPU cores from API: ${realTotalCpuCores}`);
        console.log(`Total real memory (GB) from API: ${realTotalMemoryGB}`);
      } catch (error) {
        console.error("Error fetching hypervisor data from VirtFusion:", error);
      }

      // Get additional counts from settings
      if (serverCountSetting && serverCountSetting.value) {
        additionalServerCount = parseInt(serverCountSetting.value, 10);
        if (!isNaN(additionalServerCount)) {
          console.log(`Adding manual server count: ${additionalServerCount}`);
        } else {
          console.log("Invalid manual server count, ignoring");
          additionalServerCount = 0;
        }
      }

      if (hypervisorCountSetting && hypervisorCountSetting.value) {
        additionalHypervisorCount = parseInt(hypervisorCountSetting.value, 10);
        if (!isNaN(additionalHypervisorCount)) {
          console.log(`Adding manual hypervisor count: ${additionalHypervisorCount}`);
        } else {
          console.log("Invalid manual hypervisor count, ignoring");
          additionalHypervisorCount = 0;
        }
      }

      if (additionalCpuSetting && additionalCpuSetting.value) {
        additionalCpuCores = parseInt(additionalCpuSetting.value, 10);
        if (!isNaN(additionalCpuCores)) {
          console.log(`Adding manual CPU cores: ${additionalCpuCores}`);
        } else {
          console.log("Invalid manual CPU cores, ignoring");
          additionalCpuCores = 0;
        }
      }

      if (additionalMemorySetting && additionalMemorySetting.value) {
        additionalMemoryGB = parseInt(additionalMemorySetting.value, 10);
        if (!isNaN(additionalMemoryGB)) {
          console.log(`Adding manual memory (GB): ${additionalMemoryGB}`);
        } else {
          console.log("Invalid manual memory (GB), ignoring");
          additionalMemoryGB = 0;
        }
      }

      // Calculate the total counts (real + additional)
      const totalServerCount = realServerCount + additionalServerCount;
      const totalHypervisorCount = realHypervisorCount + additionalHypervisorCount;
      const totalCpuCores = realTotalCpuCores + additionalCpuCores;
      const totalMemoryGB = realTotalMemoryGB + additionalMemoryGB;

      console.log(`Total server count: ${totalServerCount} (real: ${realServerCount} + additional: ${additionalServerCount})`);
      console.log(`Total hypervisor count: ${totalHypervisorCount} (real: ${realHypervisorCount} + additional: ${additionalHypervisorCount})`);
      console.log(`Total CPU cores: ${totalCpuCores} (real: ${realTotalCpuCores} + additional: ${additionalCpuCores})`);
      console.log(`Total memory (GB): ${totalMemoryGB} (real: ${realTotalMemoryGB} + additional: ${additionalMemoryGB})`);

      res.json({
        serverCount: totalServerCount,
        hypervisorCount: totalHypervisorCount,
        maxCPU: totalCpuCores,
        maxMemory: totalMemoryGB
      });
    } catch (error) {
      console.error("Error retrieving platform statistics:", error);
      res.status(500).json({
        error: "Failed to load platform statistics. Please try again later."
      });
    }
  });

  // Service status endpoint using BetterStack
  app.get("/api/public/service-status", async (req, res) => {
    try {
      console.log("Getting service status data from BetterStack service");

      // Make sure BetterStack service is initialized
      if (!betterStackService.isConfigured()) {
        await betterStackService.initialize();
      }

      // Get the service status from BetterStack
      const serviceStatus = await betterStackService.getServiceStatuses();
      const overallStatus = await betterStackService.getOverallStatus();

      // Return the status in a nested format that the frontend now handles
      const result = {
        overall: overallStatus,
        services: serviceStatus // This creates the nested structure
      };

      console.log(`Returning status data with ${serviceStatus.services.length} services`);
      return res.json(result);
    } catch (error) {
      console.error("Error in service status endpoint:", error);

      // Last resort fallback response
      return res.json({
        overall: 'operational',
        services: {
          overall: 'operational',
          services: [
            {
              name: 'API Services',
              status: 'operational',
              uptimePercentage: 99.98
            },
            {
              name: 'Network',
              status: 'operational',
              uptimePercentage: 99.99
            },
            {
              name: 'Storage Services',
              status: 'operational',
              uptimePercentage: 99.95
            },
            {
              name: 'Compute',
              status: 'operational',
              uptimePercentage: 99.97
            },
            {
              name: 'Database',
              status: 'operational',
              uptimePercentage: 99.99
            },
            {
              name: 'Cloud Services',
              status: 'operational',
              uptimePercentage: 99.96
            }
          ]
        }
      });
    }
  });

  // Get recent incidents from BetterStack
  app.get("/api/public/service-incidents", async (req, res) => {
    try {
      console.log("Getting recent incidents from BetterStack service");

      // Make sure BetterStack service is initialized
      if (!betterStackService.isConfigured()) {
        await betterStackService.initialize();
      }

      // Parse query parameters
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const resolvedOnly = req.query.resolvedOnly === 'true';

      // Get incidents from BetterStack
      const incidents = await betterStackService.getIncidents(limit, resolvedOnly);

      console.log(`Returning ${incidents.length} incidents`);
      console.log('Incident data sample:', incidents.length > 0 ? incidents[0] : 'No incidents');

      // Transform dates to ISO strings for consistent JSON serialization
      const formattedIncidents = incidents.map(incident => ({
        ...incident,
        startedAt: incident.startedAt.toISOString(),
        acknowledgedAt: incident.acknowledgedAt ? incident.acknowledgedAt.toISOString() : null,
        resolvedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      }));

      return res.json({
        incidents: formattedIncidents
      });
    } catch (error) {
      console.error("Error in service incidents endpoint:", error);

      // Return empty incidents array on error
      return res.json({
        incidents: []
      });
    }
  });

  // Helper function to map BetterStack status to our format
  function mapBetterStackStatus(status: string): 'operational' | 'degraded' | 'outage' | 'maintenance' {
    switch (status) {
      case 'up':
        return 'operational';
      case 'down':
        return 'outage';
      case 'maintenance':
        return 'maintenance';
      default:
        return 'degraded';
    }
  }

  // Current authenticated user endpoint
  app.get("/api/user", (req, res) => {
    try {
      if (req.isAuthenticated() && req.user) {
        // Return user data without sensitive information
        const user = req.user;
        res.json(user);
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } catch (error: any) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Email logs endpoints
  app.get("/api/admin/email-logs", isAdmin, async (req, res) => {
    try {
      const { type, status, search, startDate, endDate, userId, page, limit } = req.query;

      // Parse pagination parameters
      const currentPage = page ? parseInt(page as string) : 1;
      const itemsPerPage = limit ? parseInt(limit as string) : 10;

      console.log('Fetching email logs with filters:', {
        type, status, search, startDate, endDate, userId, page: currentPage, limit: itemsPerPage
      });

      // Use the searchEmailLogs method from storage with pagination
      const result = await storage.searchEmailLogs({
        type: type as string | undefined,
        status: status as string | undefined,
        userId: userId ? parseInt(userId as string) : undefined,
        recipient: search as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        search: search as string | undefined,
        page: currentPage,
        limit: itemsPerPage
      });

      console.log(`Found ${result.logs.length} email logs to return (page ${currentPage} of ${result.totalPages})`);

      // Return paginated results
      res.json({
        logs: result.logs,
        pagination: {
          totalItems: result.totalCount,
          totalPages: result.totalPages,
          currentPage: currentPage,
          itemsPerPage: itemsPerPage
        }
      });
    } catch (error: any) {
      console.error("Error fetching email logs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/email-logs/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid email log ID" });
      }

      const log = await storage.getEmailLog(id);
      if (!log) {
        return res.status(404).json({ error: "Email log not found" });
      }

      res.json(log);
    } catch (error: any) {
      console.error("Error fetching email log:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Email Template Management Endpoints (Admin Only)
  
  // Get all email templates
  app.get("/api/admin/email-templates", isAdmin, async (req, res) => {
    try {
      const templates = await storage.getEmailTemplates();
      res.json(templates);
    } catch (error: any) {
      console.error("Error fetching email templates:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single email template by ID
  app.get("/api/admin/email-templates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await storage.getEmailTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error fetching email template:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get email template by type
  app.get("/api/admin/email-templates/type/:type", isAdmin, async (req, res) => {
    try {
      const type = req.params.type;
      const template = await storage.getEmailTemplateByType(type);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("Error fetching email template by type:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create new email template
  app.post("/api/admin/email-templates", isAdmin, async (req, res) => {
    try {
      const { insertEmailTemplateSchema } = await import('@shared/schema');
      
      // Validate request body
      const validationResult = insertEmailTemplateSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const templateData = {
        ...validationResult.data,
        createdBy: req.user?.id,
        updatedBy: req.user?.id
      };

      const newTemplate = await storage.createEmailTemplate(templateData);
      res.status(201).json(newTemplate);
    } catch (error: any) {
      console.error("Error creating email template:", error);
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.constraint?.includes('name')) {
          return res.status(409).json({ error: "Template name already exists" });
        }
        if (error.constraint?.includes('type')) {
          return res.status(409).json({ error: "Template type already exists" });
        }
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Update email template
  app.put("/api/admin/email-templates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const { updateEmailTemplateSchema } = await import('@shared/schema');
      
      // Validate request body
      const validationResult = updateEmailTemplateSchema.safeParse({ id, ...req.body });
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          details: validationResult.error.errors
        });
      }

      const templateData = {
        ...validationResult.data,
        updatedBy: req.user?.id,
        updatedAt: new Date()
      };

      const updatedTemplate = await storage.updateEmailTemplate(id, templateData);
      if (!updatedTemplate) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error updating email template:", error);
      if (error.code === '23505') {
        // Unique constraint violation
        if (error.constraint?.includes('name')) {
          return res.status(409).json({ error: "Template name already exists" });
        }
        if (error.constraint?.includes('type')) {
          return res.status(409).json({ error: "Template type already exists" });
        }
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Delete email template
  app.delete("/api/admin/email-templates/:id", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const deleted = await storage.deleteEmailTemplate(id);
      if (!deleted) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting email template:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Toggle email template active status
  app.patch("/api/admin/email-templates/:id/toggle", isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await storage.getEmailTemplate(id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      const updatedTemplate = await storage.updateEmailTemplate(id, {
        isActive: !template.isActive,
        updatedBy: req.user?.id,
        updatedAt: new Date()
      });

      res.json(updatedTemplate);
    } catch (error: any) {
      console.error("Error toggling email template status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Preview email template with variables
  app.post("/api/admin/email-templates/:id/preview", isAdmin, async (req, res) => {
    try {
      console.log('Preview request received for template ID:', req.params.id);
      console.log('Preview variables:', req.body.variables);
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        console.error('Invalid template ID provided:', req.params.id);
        return res.status(400).json({ error: "Invalid template ID" });
      }

      const template = await storage.getEmailTemplate(id);
      if (!template) {
        console.error('Template not found with ID:', id);
        return res.status(404).json({ error: "Template not found" });
      }

      console.log('Found template:', template.name, 'type:', template.type);
      
      const variables = req.body.variables || {};
      console.log('Rendering template with variables:', variables);
      
      // Render template with provided variables
      const renderedTemplate = await emailService.renderTemplate(template, variables);
      
      console.log('Template rendered successfully');

      const response = {
        subject: renderedTemplate.subject,
        htmlContent: renderedTemplate.htmlContent,
        textContent: renderedTemplate.textContent
      };
      
      console.log('Sending preview response');
      res.json(response);
    } catch (error: any) {
      console.error("Error previewing email template:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        error: error.message || 'Internal server error during template preview',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Get available template variables
  app.get("/api/admin/email-templates/variables/common", isAdmin, async (req, res) => {
    try {
      const { COMMON_EMAIL_VARIABLES } = await import('@shared/schema');
      res.json({ variables: COMMON_EMAIL_VARIABLES });
    } catch (error: any) {
      console.error("Error fetching common email variables:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Maintenance endpoints
  app.get("/api/maintenance/status", async (req, res) => {
    try {
      // Use the function from middleware.ts directly
      const status = await getMaintenanceStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error fetching maintenance status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance/toggle", isAdmin, async (req, res) => {
    try {
      const { enabled, message, estimatedCompletion } = req.body;

      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "Enabled flag must be a boolean" });
      }

      // Use the function from middleware.ts directly
      const status = await toggleMaintenanceMode(
        enabled,
        message || "System is undergoing maintenance",
        estimatedCompletion,
        req.user
      );

      res.json(status);
    } catch (error: any) {
      console.error("Error toggling maintenance mode:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/maintenance/token", isAdmin, (req, res) => {
    try {
      // Use the function from middleware.ts directly
      const token = getMaintenanceToken();
      res.json({ token });
    } catch (error: any) {
      console.error("Error fetching maintenance token:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/maintenance/token/regenerate", isAdmin, async (req, res) => {
    try {
      // Use the async function from middleware.ts directly
      const token = await regenerateMaintenanceToken();
      res.json({ token });
    } catch (error: any) {
      console.error("Error regenerating maintenance token:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Token validation endpoint is defined above at line ~1742

  // API endpoints for public blog, docs, and FAQs
  app.get("/api/public/blog-categories", async (req, res) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/blog", async (req, res) => {
    try {
      // Get only published blog posts with categories
      const posts = await storage.getBlogPostsWithCategories(false);
      res.json(posts);
    } catch (error: any) {
      console.error("Error fetching blog posts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/blog/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      // Get posts for the specified category
      const posts = await storage.getBlogPostsByCategory(categoryId, false);
      res.json(posts);
    } catch (error: any) {
      console.error(`Error fetching blog posts for category ${req.params.categoryId}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/blog/:slug", async (req, res) => {
    try {
      const post = await storage.getBlogPostBySlug(req.params.slug);
      if (!post) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.json(post);
    } catch (error: any) {
      console.error("Error fetching blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/doc-categories", async (req, res) => {
    try {
      const categories = await storage.getAllDocCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching doc categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/docs", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const docs = await storage.getPublishedDocs(categoryId);
      res.json(docs);
    } catch (error: any) {
      console.error("Error fetching docs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/public/docs/:slug", async (req, res) => {
    try {
      const doc = await storage.getDocBySlug(req.params.slug);
      if (!doc) {
        return res.status(404).json({ error: "Doc not found" });
      }

      res.json(doc);
    } catch (error: any) {
      console.error("Error fetching doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verification status endpoint
  app.get("/api/verification-status", isAuthenticated, async (req, res) => {
    try {
      const verified = await EmailVerificationService.isEmailVerified(req.user!.id);
      res.json({ verified });
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Password reset endpoints
  app.post("/api/auth/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await AuthService.requestPasswordReset(email);
      res.json(result);
    } catch (error: any) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/verify-reset-code", async (req, res) => {
    try {
      const { email, resetCode } = req.body;
      if (!email || !resetCode) {
        return res.status(400).json({ error: "Email and reset code are required" });
      }

      const result = await AuthService.verifyPasswordResetCode(email, resetCode);
      res.json(result);
    } catch (error: any) {
      console.error("Error verifying reset code:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { userId, resetCode } = req.body;
      if (!userId || !resetCode) {
        return res.status(400).json({
          success: false,
          message: "User ID and reset code are required"
        });
      }

      // Get the user first
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Find the reset token
      const token = await storage.getPasswordResetToken(resetCode);

      // Validate token
      if (!token || token.userId !== userId || token.usedAt) {
        return res.status(400).json({
          success: false,
          message: "Invalid or expired reset code."
        });
      }

      // Check if token is expired
      if (token.expiresAt < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Reset code has expired. Please request a new code."
        });
      }

      let temporaryPassword = "";
      let virtFusionError = null;

      // If user has VirtFusion ID, reset the password through VirtFusion API
      if (user.virtFusionId) {
        try {
          // Make sure VirtFusion API settings are up to date
          await virtFusionApi.updateSettings();

          // Call VirtFusion API to reset the password
          // IMPORTANT: We use userId as extRelationId (NOT virtFusionId)
          console.log(`Attempting to reset password via VirtFusion API for user with extRelationId: ${userId}`);
          const response = await virtFusionApi.resetUserPassword(userId);
          console.log("VirtFusion password reset API response:", response);

          // Extract the password from the VirtFusion response
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
            console.log("Successfully obtained VirtFusion-generated password");
          } else {
            // If we didn't get a password, generate a fallback password
            console.warn("VirtFusion response didn't contain expected password field, falling back to generated password");
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            virtFusionError = 'VirtFusion API response did not contain a password.';
          }
        } catch (error: any) {
          console.error("Error resetting password through VirtFusion API:", error);

          // If VirtFusion API call failed, generate a fallback password
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
          virtFusionError = error.message || 'VirtFusion API error';
        }
      } else {
        // For non-VirtFusion users, generate a random password
        temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }

      // Hash the temporary password
      const hashedPassword = await hashPassword(temporaryPassword);

      // Update the user's password in our system
      await storage.updateUser(userId, { password: hashedPassword });

      // Mark token as used
      await storage.markPasswordResetTokenAsUsed(token.id);

      // Invalidate any other tokens for this user
      await storage.invalidatePasswordResetTokens(userId);

      // Email the user about the password change
      try {
        await emailService.sendAdminPasswordResetEmail(
          user.email,
          temporaryPassword,
          "You" // This indicates the user changed their own password
        );
        console.log(`Password reset email sent to ${user.email}`);
      } catch (emailError) {
        console.error(`Failed to send password reset email to ${user.email}:`, emailError);
      }

      // Set message based on VirtFusion integration status
      let message = 'Your password has been reset successfully.';
      if (virtFusionError) {
        message += ' Note: VirtFusion API call failed, but your password has been reset in our system.';
        console.warn(`Warning: Password reset locally but VirtFusion API call failed for user ${userId}. Passwords may be out of sync.`);
      }

      res.json({
        success: true,
        message,
        temporaryPassword
      });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while resetting your password."
      });
    }
  });

  // Username reminder endpoint
  app.post("/api/auth/request-username-reminder", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await AuthService.requestUsernameReminder(email);
      res.json(result);
    } catch (error: any) {
      console.error("Error requesting username reminder:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Change password endpoint (when logged in)
  app.post("/api/auth/change-password", isAuthenticated, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      const result = await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
      res.json(result);
    } catch (error: any) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Gemini AI Routes -----

  // Check Gemini AI status
  app.get("/api/ai/status", async (req, res) => {
    try {
      const isReady = geminiService.isReady();
      res.json({
        enabled: isReady,
        message: isReady
          ? "Gemini AI service is ready"
          : "Gemini AI service is not configured. Add GOOGLE_AI_API_KEY to enable AI features."
      });
    } catch (error: any) {
      console.error("Error checking Gemini AI status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current AI usage limits for the user
  app.get("/api/ai/usage", async (req, res) => {
    try {
      const { geminiRateLimiter } = await import('./gemini-rate-limiter');
      const usage = geminiRateLimiter.getUserUsage(req, res);
      res.json(usage);
    } catch (error: any) {
      console.error("Error getting AI usage data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate AI ticket response suggestion (admin only)
  app.post("/api/admin/ai/ticket-response", isAdmin, async (req, res) => {
    try {
      const { ticketId, additionalContext } = req.body;

      if (!ticketId) {
        return res.status(400).json({ error: "Ticket ID is required" });
      }

      // Get ticket details
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      // Get ticket messages
      const messages = await storage.getTicketMessages(ticketId);
      if (!messages || messages.length === 0) {
        return res.status(404).json({ error: "No messages found for this ticket" });
      }

      // Format messages for AI
      const formattedMessages = await Promise.all(messages.map(async (msg) => {
        const user = msg.userId ? await storage.getUser(msg.userId) : null;
        return {
          message: msg.message,
          userId: msg.userId,
          user: user ? {
            fullName: user.fullName,
            role: user.role
          } : undefined
        };
      }));

      // Generate response using Gemini with rate limiting
      const response = await geminiService.generateTicketResponse(
        ticket.subject,
        formattedMessages,
        additionalContext,
        req,
        res
      );

      res.json(response);
    } catch (error: any) {
      console.error("Error generating AI ticket response:", error);
      res.status(500).json({
        success: false,
        response: `Error generating response: ${error.message}`
      });
    }
  });



  // Register API Keys routes
  app.use("/api/user/api-keys", isAuthenticated, apiKeysRoutes);



  // Register DNS routes
  app.use("/api/dns", isAuthenticated, dnsRoutes);
  app.use("/api/admin", isAuthenticated, isAdmin, adminDnsRoutes);

  // Register Server routes
  app.use("/api/servers", isAuthenticated, serverRoutes);

  // Register Transaction routes
  app.use("/api/transactions", isAuthenticated, transactionRoutes);

  // Register User routes
  app.use("/api/users", userRoutes);

  // Register Settings routes
  app.use("/api/settings", settingsRoutes);

  // Register Admin Settings routes
  app.use("/api/admin", adminSettingsRoutes);

  // Awards routes
  app.use("/api/awards", awardsRoutes);

  // Monitoring routes
  app.use("/api/monitoring", monitoringRoutes);

  // Coupon routes
  app.use("/api/coupons", isAuthenticated, couponRoutes);
  app.use("/api/admin/coupons", isAuthenticated, isAdmin, adminCouponsRoutes);

  // OAuth routes
  app.use("/api/oauth", oauthRoutes);



  // Code snippets routes
  app.use("/api/admin/code-snippets", isAuthenticated, isAdmin, codeSnippetsRoutes);



  // Admin settings routes are defined directly in this file instead of using the separate router

  // Register API-only routes (authenticated via API keys)
  // Use both /api/v1 endpoints for backward compatibility and new direct API endpoints
  app.use("/api/v1", apiOnlyRoutes);

  // Register new API endpoints directly in the main router
  // These mirror the functionality in api-only-routes.ts but with better paths

  // User information endpoint - /api/user/me (avoiding conflict with the existing /api/user route)
  app.get("/api/user/me",
    apiKeyAuth,
    requireScope('read:user'),
    async (req, res) => {
      try {
        const { userId } = (req as any).apiKeyUser;

        // Get user information but exclude sensitive data like password
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'User not found'
          });
        }

        // Return user information without sensitive fields
        const { password, ...safeUserData } = user;

        return res.json(safeUserData);
      } catch (error) {
        console.error('Error retrieving user information via API:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve user information'
        });
      }
    });

  // Servers endpoint
  app.get("/api/servers",
    apiKeyAuth,
    requireScope('read:servers'),
    async (req, res) => {
      try {
        const { userId } = (req as any).apiKeyUser;

        // This endpoint would return server data for the user
        // For now, we'll return a simple response
        // In a real implementation, this would call VirtFusion API to get server data
        return res.json({
          servers: [
            {
              id: 1,
              name: 'Server 1',
              status: 'running',
              created: new Date().toISOString()
            }
          ]
        });
      } catch (error) {
        console.error('Error retrieving server information via API:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve server information'
        });
      }
    });

  // Balance endpoint
  app.get("/api/balance",
    apiKeyAuth,
    requireScope('read:billing'),
    async (req, res) => {
      try {
        const { userId } = (req as any).apiKeyUser;

        // Get user for credits
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({
            error: 'Not Found',
            message: 'User not found'
          });
        }

        // Return user credit balance
        return res.json({
          credits: user.credits,
          currency: 'USD'
        });
      } catch (error) {
        console.error('Error retrieving balance information via API:', error);
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to retrieve balance information'
        });
      }
    });

  // ----- Team Management Routes -----

  // Public endpoint to get active team members
  app.get("/api/team", async (req, res) => {
    try {
      const teamMembers = await storage.getActiveTeamMembers();
      res.json(teamMembers);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  // Admin endpoints for team management
  app.get("/api/admin/team", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const teamMembers = await storage.getAllTeamMembers();
      res.json(teamMembers);
    } catch (error: any) {
      console.error("Error fetching all team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.post("/api/admin/team", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { discordUserId, discordUsername, discordAvatarUrl, role, aboutMe, displayOrder, displayName } = req.body;

      if (!discordUserId || !discordUsername || !role) {
        return res.status(400).json({ error: "Discord user ID, username, and role are required" });
      }

      // Check if team member already exists
      const existingMember = await storage.getTeamMemberByDiscordId(discordUserId);
      if (existingMember) {
        return res.status(400).json({ error: "Team member with this Discord ID already exists" });
      }

      const newMember = await storage.createTeamMember({
        discordUserId,
        discordUsername,
        displayName: displayName || null, // Optional display name
        discordAvatarUrl,
        role,
        aboutMe,
        displayOrder: displayOrder || 0,
        isActive: true,
        createdBy: req.user!.id,
        updatedBy: req.user!.id,
      });

      res.status(201).json(newMember);
    } catch (error: any) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.put("/api/admin/team/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }

      const { role, aboutMe, displayOrder, isActive, displayName } = req.body;

      // Check if team member exists
      const existingMember = await storage.getTeamMemberById(id);
      if (!existingMember) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.updateTeamMember(id, {
        role,
        aboutMe,
        displayOrder,
        isActive,
        displayName: displayName || null, // Optional display name
        updatedBy: req.user!.id,
      });

      const updatedMember = await storage.getTeamMemberById(id);
      res.json(updatedMember);
    } catch (error: any) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/admin/team/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid team member ID" });
      }

      // Check if team member exists
      const existingMember = await storage.getTeamMemberById(id);
      if (!existingMember) {
        return res.status(404).json({ error: "Team member not found" });
      }

      await storage.deleteTeamMember(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Discord user search endpoint for admin
  app.get("/api/admin/discord/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Discord user search endpoint called");
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;

      console.log(`Search parameters: query="${query}", limit=${limit}`);

      if (!query || query.trim().length < 2) {
        console.log("Query too short, returning 400");
        return res.status(400).json({ error: "Search query must be at least 2 characters" });
      }

      console.log("Importing Discord bot service...");
      const { discordBotService } = await import('./discord-bot-service');

      // Check if Discord bot is enabled and ready
      console.log("Checking if Discord bot is enabled...");
      const isEnabled = await discordBotService.isEnabled();
      if (!isEnabled) {
        console.log("Discord bot is disabled");
        return res.status(503).json({
          error: "Discord bot is disabled",
          details: "Please enable the Discord bot in admin settings"
        });
      }

      console.log("Discord bot is enabled, calling searchDiscordUsers...");
      const users = await discordBotService.searchDiscordUsers(query.trim(), limit);

      console.log(`Search completed, returning ${users.length} users`);
      res.json(users);
    } catch (error: any) {
      console.error("Error searching Discord users:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to search Discord users",
        details: error.message
      });
    }
  });

  // Get specific Discord user by ID
  app.get("/api/admin/discord/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Discord user fetch endpoint called");
      const userId = req.params.id;

      console.log(`Fetch parameters: userId="${userId}"`);

      if (!userId) {
        console.log("User ID missing, returning 400");
        return res.status(400).json({ error: "Discord user ID is required" });
      }

      console.log("Importing Discord bot service...");
      const { discordBotService } = await import('./discord-bot-service');

      // Check if Discord bot is enabled and ready
      console.log("Checking if Discord bot is enabled...");
      const isEnabled = await discordBotService.isEnabled();
      if (!isEnabled) {
        console.log("Discord bot is disabled");
        return res.status(503).json({
          error: "Discord bot is disabled",
          details: "Please enable the Discord bot in admin settings"
        });
      }

      console.log("Discord bot is enabled, calling getDiscordUser...");
      const user = await discordBotService.getDiscordUser(userId);

      if (!user) {
        console.log("User not found, returning 404");
        return res.status(404).json({ error: "Discord user not found" });
      }

      console.log(`User fetch completed, returning user: ${user.username}`);
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching Discord user:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({
        error: "Failed to fetch Discord user",
        details: error.message
      });
    }
  });

  // Discord bot status endpoint for debugging
  app.get("/api/admin/discord/status", isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log("Discord bot status endpoint called");

      const { discordBotService } = await import('./discord-bot-service');
      const { discordBotCore } = await import('./discord/discord-bot-core');

      // Check bot configuration
      const isEnabled = await discordBotService.isEnabled();
      const botToken = await storage.getSetting('discord_bot_token');
      const guildId = await storage.getSetting('discord_guild_id');
      const channelId = await storage.getSetting('discord_channel_id');

      // Check bot connection status
      const client = discordBotCore.getClient();
      const isReady = discordBotCore.isReady();

      const status = {
        enabled: isEnabled,
        configured: {
          botToken: !!botToken?.value,
          guildId: !!guildId?.value,
          channelId: !!channelId?.value
        },
        connection: {
          clientExists: !!client,
          isReady: isReady,
          clientStatus: client?.readyAt ? 'Connected' : 'Disconnected'
        },
        settings: {
          guildId: guildId?.value || 'Not configured',
          channelId: channelId?.value || 'Not configured'
        }
      };

      console.log("Discord bot status:", status);
      res.json(status);
    } catch (error: any) {
      console.error("Error getting Discord bot status:", error);
      res.status(500).json({
        error: "Failed to get Discord bot status",
        details: error.message
      });
    }
  });

  // ----- Package Categories Routes (NEW - ADDITIVE ONLY) -----

  // Get all package categories (public endpoint for filtering)
  app.get("/api/public/package-categories", async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(schema.packageCategories)
        .where(eq(schema.packageCategories.isActive, true))
        .orderBy(schema.packageCategories.displayOrder, schema.packageCategories.name);

      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching package categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Get all package categories
  app.get("/api/admin/package-categories", isAdmin, async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(schema.packageCategories)
        .orderBy(schema.packageCategories.displayOrder, schema.packageCategories.name);

      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching package categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Create package category
  app.post("/api/admin/package-categories", isAdmin, async (req, res) => {
    try {
      const { name, description, displayOrder, isActive } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Category name is required" });
      }

      const newCategory = await db
        .insert(schema.packageCategories)
        .values({
          name,
          description,
          displayOrder: displayOrder || 0,
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      res.json(newCategory[0]);
    } catch (error: any) {
      console.error("Error creating package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Update package category
  app.put("/api/admin/package-categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      const { name, description, displayOrder, isActive } = req.body;

      const updatedCategory = await db
        .update(schema.packageCategories)
        .set({
          name,
          description,
          displayOrder,
          isActive,
          updatedAt: new Date(),
        })
        .where(eq(schema.packageCategories.id, categoryId))
        .returning();

      if (updatedCategory.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json(updatedCategory[0]);
    } catch (error: any) {
      console.error("Error updating package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Delete package category
  app.delete("/api/admin/package-categories/:id", isAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ error: "Invalid category ID" });
      }

      // Check if any packages are using this category
      const packagesUsingCategory = await db
        .select()
        .from(schema.packagePricing)
        .where(eq(schema.packagePricing.categoryId, categoryId))
        .limit(1);

      if (packagesUsingCategory.length > 0) {
        return res.status(400).json({
          error: "Cannot delete category that is assigned to packages. Please reassign or remove packages first."
        });
      }

      const deletedCategory = await db
        .delete(schema.packageCategories)
        .where(eq(schema.packageCategories.id, categoryId))
        .returning();

      if (deletedCategory.length === 0) {
        return res.status(404).json({ error: "Category not found" });
      }

      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);



  // Create a manual WebSocket server for VNC
  const vncWebSocketServer = new WebSocketServer({ noServer: true });

  // Attach WebSocket handlers to HTTP server - Handle routing manually
  httpServer.on('upgrade', (request: any, socket: any, head: any) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    console.log(`WebSocket upgrade request: ${url.pathname}`);
    console.log(`Full WebSocket upgrade URL: ${request.url}`);
    console.log(`WebSocket upgrade headers:`, request.headers);

    // Handle VNC WebSocket requests
    if (url.pathname === '/vnc-proxy') {
      console.log('Handling VNC WebSocket upgrade directly');
      handleWebSocketUpgrade(request, socket, head);



    } else if (url.pathname === '/' && process.env.NODE_ENV === 'development') {
      // Allow Vite HMR WebSocket connections in development
      console.log('Vite HMR WebSocket request - allowing passthrough');
      // Don't handle this - let Vite handle its own HMR WebSocket
    } else {
      // Close any other WebSocket connection attempts
      console.log(`Unknown WebSocket path: ${url.pathname}, closing connection`);
      socket.destroy();
    }
  });

  return httpServer;
}
