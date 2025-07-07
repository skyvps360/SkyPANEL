import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import { EmailVerificationService } from "../email-verification-service"; // For /api/verification-status (if distinct)
import { AuthService } from "../auth-service"; // For /api/auth/reset-password etc.
import { geminiService } from "../gemini-service";
import { WebSocketServer } from "ws"; // For VNC
import * as net from "net"; // For VNC
import { db } from "../db"; // For package categories
import * as schema from "../../shared/schema"; // For package categories schema
import { eq } from "drizzle-orm"; // For package categories
import { serverLoggingService } from "../server-logging-service"; // For VNC logging

// Helper functions (copied for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) { return next(); }
  res.status(401).json({ error: "Unauthorized" });
}

function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") { return next(); }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

// VNC WebSocket Handler - to be exported and attached in routes_new.ts
export const handleVncWebSocketUpgrade = (request: any, socket: any, head: any) => {
    console.log('VNC WebSocket upgrade request received in misc routes:', { url: request.url });
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (url.pathname === '/vnc-proxy') { // Ensure this matches the path used in routes_new.ts server.on('upgrade')
      const host = url.searchParams.get('host');
      const port = url.searchParams.get('port');
      if (!host || !port) {
        console.error('VNC Proxy: Missing host or port parameters.');
        socket.destroy();
        return;
      }
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        console.error('VNC Proxy: Invalid port number.');
        socket.destroy();
        return;
      }

      const wss = new WebSocketServer({ noServer: true });
      wss.handleUpgrade(request, socket, head, (ws) => {
        console.log(`VNC Proxy: Upgraded. Connecting to ${host}:${portNum}`);
        const vncSocket = net.createConnection({ host: host, port: portNum, timeout: 10000 });
        let isConnected = false;

        vncSocket.on('connect', () => { isConnected = true; console.log(`VNC TCP connected to ${host}:${portNum}`); });
        vncSocket.on('timeout', () => { console.error(`VNC TCP timeout ${host}:${portNum}`); vncSocket.destroy(); if (ws.readyState === ws.OPEN) ws.close(1011, 'VNC timeout'); });

        ws.on('message', (data) => {
          if (isConnected && vncSocket.writable) {
            try { vncSocket.write(Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)); }
            catch (error) { console.error('VNC: Error writing to TCP socket:', error); }
          }
        });
        vncSocket.on('data', (data) => { if (ws.readyState === ws.OPEN) try { ws.send(data); } catch(e){console.error('VNC: Error sending to WS', e)} });
        ws.on('close', () => { console.log('VNC WS closed.'); if (vncSocket && !vncSocket.destroyed) vncSocket.destroy(); });
        vncSocket.on('close', () => { console.log('VNC TCP closed.'); if (ws.readyState === ws.OPEN) ws.close(1000, 'VNC connection closed'); });
        ws.on('error', (err) => { console.error('VNC WS error:', err); if (vncSocket && !vncSocket.destroyed) vncSocket.destroy(); });
        vncSocket.on('error', (err) => { console.error(`VNC TCP error ${host}:${portNum}:`, err); if (ws.readyState === ws.OPEN) ws.close(1011, `VNC server error: ${err.message}`);});
      });
    } else {
      console.log('Non-VNC WebSocket request in VNC handler (misc.ts), destroying socket.');
      socket.destroy(); // Should be handled by the main 'upgrade' handler in routes_new.ts
    }
};


const router = (app: Express) => {
  // ----- Public Settings Routes -----
  app.get("/api/settings/public", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      const publicKeys = [
        'company_name', 'company_logo', 'primary_color', 'footer_description',
        'footer_social_icons_enabled', 'footer_github_url', 'footer_twitter_url',
        'footer_facebook_url', 'footer_discord_url', 'footer_linkedin_url',
        'footer_youtube_url', 'footer_instagram_url', 'footer_contact_email',
        'footer_contact_support_text', 'footer_contact_phone', 'loading_screen_enabled',
        'loading_screen_animation_duration', 'loading_screen_min_duration',
        'loading_screen_show_on_all_pages', 'virtfusion_api_url',
        'enterprise_features_heading', 'enterprise_features_subheading',
        'enterprise_feature_icon_1', 'enterprise_feature_title_1', 'enterprise_feature_description_1',
        // ... (include all enterprise feature keys explicitly if needed)
      ];
      // Add enterprise feature cards keys dynamically
      for(let i=0; i<4; ++i) {
        publicKeys.push(`enterpriseFeatureCards.${i}.icon`);
        publicKeys.push(`enterpriseFeatureCards.${i}.title`);
        publicKeys.push(`enterpriseFeatureCards.${i}.description`);
      }

      const publicSettingsObject = settings
        .filter(setting => publicKeys.includes(setting.key))
        .reduce((obj, setting) => { obj[setting.key] = setting.value; return obj; }, {} as Record<string, string>);
      res.json(publicSettingsObject);
    } catch (error: any) {
      console.error("Error fetching public settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/branding", async (req: Request, res: Response) => {
    try {
      const settings = await storage.getAllSettings();
      const brandingKeys = [
        'company_name', 'company_logo', 'primary_color', 'secondary_color', 'accent_color',
        'company_color', 'loading_screen_enabled', 'loading_screen_animation_duration',
        'loading_screen_min_duration', 'loading_screen_show_on_all_pages'
      ];
      const brandingObject = settings
        .filter(setting => brandingKeys.includes(setting.key))
        .reduce((obj, setting) => { obj[setting.key] = setting.value; return obj; }, {} as Record<string, string>);

      brandingObject.company_name = brandingObject.company_name || 'VirtFusion';
      brandingObject.primary_color = brandingObject.primary_color || '2563eb';
      brandingObject.secondary_color = brandingObject.secondary_color || '10b981';
      brandingObject.accent_color = brandingObject.accent_color || 'f59e0b';
      brandingObject.company_color = brandingObject.company_color || brandingObject.primary_color;
      res.json(brandingObject);
    } catch (error: any) {
      console.error("Error fetching branding settings:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/settings/cloud-pricing", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const cloudPricingKeys = [
        'cloud_cpu_price_per_core', 'cloud_ram_price_per_gb',
        'cloud_storage_price_per_gb', 'cloud_network_price_per_mbps'
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

  // ----- Auth Routes (remaining ones not in userProfile.ts) -----
  // The main /api/auth/reset-password for completing the reset process
  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { userId, resetCode } = req.body; // Assuming newPassword is not sent here, but a temporary one is generated
      if (!userId || !resetCode) {
        return res.status(400).json({ success: false, message: "User ID and reset code are required" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });

      const token = await storage.getPasswordResetToken(resetCode);
      if (!token || token.userId !== userId || token.usedAt || token.expiresAt < new Date()) {
        return res.status(400).json({ success: false, message: "Invalid or expired reset code." });
      }

      let temporaryPassword = "";
      let virtFusionError = null;
      await virtFusionApi.updateSettings();

      if (user.virtFusionId) {
        try {
          const response = await virtFusionApi.resetUserPassword(user.id); // extRelationId is user.id
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
          } else {
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            virtFusionError = 'VirtFusion API response did not contain a password.';
          }
        } catch (error: any) {
          virtFusionError = error.message || 'VirtFusion API error during password reset.';
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        }
      } else {
        temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }

      const hashedPassword = await hashPassword(temporaryPassword); // Make sure hashPassword is importable
      await storage.updateUser(userId, { password: hashedPassword });
      await storage.markPasswordResetTokenAsUsed(token.id);
      await storage.invalidatePasswordResetTokens(userId);

      try {
        await emailService.sendAdminPasswordResetEmail(user.email, temporaryPassword, "You");
      } catch (emailError:any) { console.error(`Failed to send password reset email to ${user.email}:`, emailError); }

      let message = 'Your password has been reset successfully.';
      if (virtFusionError) message += ' Note: VirtFusion API call failed, but your password has been reset in our system.';

      res.json({ success: true, message, temporaryPassword });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ success: false, message: "An error occurred while resetting your password." });
    }
  });

  // Note: /api/auth/request-username-reminder is in userProfile.ts as /api/auth/request-username
  // Note: /api/auth/change-password (logged in) is in userProfile.ts

  // ----- Gemini AI Routes -----
  app.get("/api/ai/status", async (req: Request, res: Response) => {
    try {
      const isReady = geminiService.isReady();
      res.json({
        enabled: isReady,
        message: isReady ? "Gemini AI service is ready" : "Gemini AI service is not configured."
      });
    } catch (error: any) {
      console.error("Error checking Gemini AI status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ai/usage", async (req: Request, res: Response) => { // Assuming rate limiter is middleware
    try {
      const { geminiRateLimiter } = await import('../gemini-rate-limiter'); // Dynamic import
      const usage = geminiRateLimiter.getUserUsage(req, res); // This might need to be actual middleware
      res.json(usage);
    } catch (error: any) {
      console.error("Error getting AI usage data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/ai/ticket-response", isAdmin, async (req: Request, res: Response) => {
    try {
      const { ticketId, additionalContext } = req.body;
      if (!ticketId) return res.status(400).json({ error: "Ticket ID is required" });
      const ticket = await storage.getTicket(ticketId);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      const messages = await storage.getTicketMessages(ticketId);
      if (!messages || messages.length === 0) return res.status(404).json({ error: "No messages for this ticket" });

      const formattedMessages = await Promise.all(messages.map(async (msg) => {
        const user = msg.userId ? await storage.getUser(msg.userId) : null;
        return { message: msg.message, userId: msg.userId, user: user ? { fullName: user.fullName, role: user.role } : undefined };
      }));
      const response = await geminiService.generateTicketResponse(ticket.subject, formattedMessages, additionalContext, req, res);
      res.json(response);
    } catch (error: any) {
      console.error("Error generating AI ticket response:", error);
      res.status(500).json({ success: false, response: `Error: ${error.message}` });
    }
  });

  app.post("/api/ai/docs-chat", async (req: Request, res: Response) => {
    return res.status(404).json({ success: false, response: "The AI documentation assistant has been deprecated." });
  });

  // Current authenticated user endpoint
  app.get("/api/user", (req: Request, res: Response) => { // This one is distinct from /api/user/profile
    try {
      if (req.isAuthenticated && req.isAuthenticated() && req.user) {
        res.json(req.user); // req.user should already be sanitized by passport/auth setup
      } else {
        res.status(401).json({ error: "Unauthorized" });
      }
    } catch (error: any) {
      console.error('Error fetching current user data:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- Team Management Routes -----
  app.get("/api/team", async (req: Request, res: Response) => {
    try {
      const teamMembers = await storage.getActiveTeamMembers();
      res.json(teamMembers);
    } catch (error: any) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.get("/api/admin/team", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const teamMembers = await storage.getAllTeamMembers();
      res.json(teamMembers);
    } catch (error: any) {
      console.error("Error fetching all team members for admin:", error);
      res.status(500).json({ error: "Failed to fetch team members" });
    }
  });

  app.post("/api/admin/team", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { discordUserId, discordUsername, discordAvatarUrl, role, aboutMe, displayOrder, displayName } = req.body;
      if (!discordUserId || !discordUsername || !role) {
        return res.status(400).json({ error: "Discord user ID, username, and role are required" });
      }
      const existingMember = await storage.getTeamMemberByDiscordId(discordUserId);
      if (existingMember) return res.status(400).json({ error: "Team member with this Discord ID already exists" });

      const newMember = await storage.createTeamMember({
        discordUserId, discordUsername, displayName: displayName || null, discordAvatarUrl, role,
        aboutMe, displayOrder: displayOrder || 0, isActive: true,
        createdBy: (req.user! as any).id, updatedBy: (req.user! as any).id,
      });
      res.status(201).json(newMember);
    } catch (error: any) {
      console.error("Error creating team member:", error);
      res.status(500).json({ error: "Failed to create team member" });
    }
  });

  app.put("/api/admin/team/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid team member ID" });
      const existingMember = await storage.getTeamMemberById(id);
      if (!existingMember) return res.status(404).json({ error: "Team member not found" });

      const { role, aboutMe, displayOrder, isActive, displayName } = req.body;
      await storage.updateTeamMember(id, {
        role, aboutMe, displayOrder, isActive, displayName: displayName || null,
        updatedBy: (req.user! as any).id, updatedAt: new Date()
      });
      const updatedMember = await storage.getTeamMemberById(id);
      res.json(updatedMember);
    } catch (error: any) {
      console.error("Error updating team member:", error);
      res.status(500).json({ error: "Failed to update team member" });
    }
  });

  app.delete("/api/admin/team/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid team member ID" });
      const existingMember = await storage.getTeamMemberById(id);
      if (!existingMember) return res.status(404).json({ error: "Team member not found" });
      await storage.deleteTeamMember(id);
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting team member:", error);
      res.status(500).json({ error: "Failed to delete team member" });
    }
  });

  // Admin Discord User Search
  app.get("/api/admin/discord/users", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 10;
      if (!query || query.trim().length < 2) return res.status(400).json({ error: "Search query must be at least 2 characters" });

      const { discordBotService } = await import('../discord-bot-service'); // Dynamic import
      if (!await discordBotService.isEnabled()) return res.status(503).json({ error: "Discord bot is disabled" });

      const users = await discordBotService.searchDiscordUsers(query.trim(), limit);
      res.json(users);
    } catch (error: any) {
      console.error("Error searching Discord users:", error);
      res.status(500).json({ error: "Failed to search Discord users", details: error.message });
    }
  });

  app.get("/api/admin/discord/users/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = req.params.id;
      if (!userId) return res.status(400).json({ error: "Discord user ID is required" });

      const { discordBotService } = await import('../discord-bot-service'); // Dynamic import
      if (!await discordBotService.isEnabled()) return res.status(503).json({ error: "Discord bot is disabled" });

      const user = await discordBotService.getDiscordUser(userId);
      if (!user) return res.status(404).json({ error: "Discord user not found" });
      res.json(user);
    } catch (error: any) {
      console.error("Error fetching Discord user:", error);
      res.status(500).json({ error: "Failed to fetch Discord user", details: error.message });
    }
  });

  app.get("/api/admin/discord/status", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const { discordBotService } = await import('../discord-bot-service');
      const { discordBotCore } = await import('../discord/discord-bot-core');
      const isEnabled = await discordBotService.isEnabled();
      const settings = await storage.getSettings(['discord_bot_token', 'discord_guild_id', 'discord_channel_id']);
      const client = discordBotCore.getClient();
      res.json({
        enabled: isEnabled,
        configured: { botToken: !!settings.discord_bot_token, guildId: !!settings.discord_guild_id, channelId: !!settings.discord_channel_id },
        connection: { clientExists: !!client, isReady: discordBotCore.isReady(), clientStatus: client?.readyAt ? 'Connected' : 'Disconnected' },
        settings: { guildId: settings.discord_guild_id || 'N/A', channelId: settings.discord_channel_id || 'N/A' }
      });
    } catch (error: any) {
      console.error("Error getting Discord bot status:", error);
      res.status(500).json({ error: "Failed to get Discord bot status", details: error.message });
    }
  });

  // ----- Package Categories Routes ----- (These were separate in routes_new.ts)
  app.get("/api/public/package-categories", async (req: Request, res: Response) => {
    try {
      const categories = await db.select().from(schema.packageCategories)
        .where(eq(schema.packageCategories.isActive, true))
        .orderBy(schema.packageCategories.displayOrder, schema.packageCategories.name);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching public package categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/package-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const categories = await db.select().from(schema.packageCategories)
        .orderBy(schema.packageCategories.displayOrder, schema.packageCategories.name);
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching admin package categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/package-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, displayOrder, isActive } = req.body;
      if (!name) return res.status(400).json({ error: "Category name is required" });
      const newCategory = await db.insert(schema.packageCategories).values({
        name, description, displayOrder: displayOrder || 0, isActive: isActive !== undefined ? isActive : true,
      }).returning();
      res.json(newCategory[0]);
    } catch (error: any) {
      console.error("Error creating admin package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/package-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });
      const { name, description, displayOrder, isActive } = req.body;
      const updatedCategory = await db.update(schema.packageCategories).set({
        name, description, displayOrder, isActive, updatedAt: new Date(),
      }).where(eq(schema.packageCategories.id, categoryId)).returning();
      if (updatedCategory.length === 0) return res.status(404).json({ error: "Category not found" });
      res.json(updatedCategory[0]);
    } catch (error: any) {
      console.error("Error updating admin package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/package-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });
      const packagesUsingCategory = await db.select().from(schema.packagePricing)
        .where(eq(schema.packagePricing.categoryId, categoryId)).limit(1);
      if (packagesUsingCategory.length > 0) {
        return res.status(400).json({ error: "Cannot delete category assigned to packages." });
      }
      const deletedCategory = await db.delete(schema.packageCategories)
        .where(eq(schema.packageCategories.id, categoryId)).returning();
      if (deletedCategory.length === 0) return res.status(404).json({ error: "Category not found" });
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting admin package category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // VNC Related HTTP routes (if any beyond the WebSocket proxy)
  // Example: Enable VNC (if not already covered by userServers or adminServers)
  app.post("/api/servers/:serverId/vnc/enable", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) return res.status(400).json({ error: "Invalid server ID" });

      // Add permission check: user owns server or is admin
      const user = req.user as any;
      let serverOwner = false;
      if(user.role !== 'admin'){
        const serverDetails = await virtFusionApi.getServer(serverId);
        if(serverDetails && serverDetails.data && (serverDetails.data.ownerId === user.virtFusionId || serverDetails.data.owner?.id === user.virtFusionId)){
            serverOwner = true;
        }
        if(!serverOwner) return res.status(403).json({error: "Permission denied"});
      }

      await virtFusionApi.updateSettings();
      const vncResponse = await virtFusionApi.toggleVnc(serverId); // toggleVnc might need to exist or use request("POST",...)

      // Log VNC enable action
      await serverLoggingService.logVncAction(serverId, user.id, 'vnc_enable', 'success', 'VNC enabled.', undefined, req);

      res.json(vncResponse);
    } catch (error: any) {
      console.error(`Error enabling VNC for server ${req.params.serverId}:`, error);
      await serverLoggingService.logVncAction(parseInt(req.params.serverId), (req.user as any).id, 'vnc_enable', 'failed', undefined, error.message, req);
      res.status(500).json({ error: error.message || "Failed to enable VNC" });
    }
  });

  // Get VNC status for a server (if not already covered)
   app.get("/api/servers/:serverId/vnc", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const serverId = parseInt(req.params.serverId);
      if (isNaN(serverId)) return res.status(400).json({ error: "Invalid server ID" });

      // Add permission check
      const user = req.user as any;
      let serverOwner = false;
      if(user.role !== 'admin'){
        const serverDetails = await virtFusionApi.getServer(serverId);
         if(serverDetails && serverDetails.data && (serverDetails.data.ownerId === user.virtFusionId || serverDetails.data.owner?.id === user.virtFusionId)){
            serverOwner = true;
        }
        if(!serverOwner) return res.status(403).json({error: "Permission denied"});
      }

      await virtFusionApi.updateSettings();
      // VirtFusion API might only have a POST to toggle and return status.
      // This GET might be a conceptual "get status" that internally does a POST if that's how VF API works.
      // For now, assuming getVncStatus exists or it's a POST toggle.
      const vncStatus = await virtFusionApi.getVncStatus(serverId); // or toggleVnc
      res.json(vncStatus);
    } catch (error: any) {
      console.error(`Error getting VNC status for server ${req.params.serverId}:`, error);
      res.status(500).json({ error: error.message || "Failed to get VNC status" });
    }
  });

};

export default router;
