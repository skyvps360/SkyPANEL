import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { db, pool } from "../db"; // Assuming pool might be used by formatTicketPdf or other helpers
import { storage } from "../storage";
import { discordService } from "../discord-service";
import { discordBotService } from "../discord-bot-service";
import { departmentMigrationService } from "../services/department-migration";
import { virtFusionApi } from "../virtfusion-api"; // For fetching VPS info
import { formatTicketPdf as formatTicketPdfHelper } from "../ticket-download"; // Assuming this path
import * as schema from "../../shared/schema";
import { insertTicketDepartmentSchema, insertTicketMessageSchema, insertTicketSchema } from "../../shared/schema";
import { sql } from "drizzle-orm"; // For raw SQL if needed by helpers

// Helper functions (copied from routes_new.ts for now)
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

function handleZodError(error: ZodError, res: Response) {
  const validationError = fromZodError(error);
  res.status(400).json({ error: validationError.message });
}


const router = (app: Express) => {
  // Ticket Department Routes (now using unified support departments)
  app.get("/api/ticket-departments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const departments = await storage.getSupportDepartments();
      const activeDepartments = departments.filter(dept => dept.isActive);
      res.json(activeDepartments);
    } catch (error: any) {
      console.error("Error fetching support departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/ticket-departments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const departments = await storage.getAllTicketDepartments(); // This might be legacy
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching all ticket departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/ticket-departments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const departmentData = insertTicketDepartmentSchema.parse(req.body);
      const department = await storage.createTicketDepartment(departmentData); // Legacy?
      res.status(201).json(department);
    } catch (error: any) {
      console.error("Error creating ticket department:", error);
      if (error instanceof ZodError) return handleZodError(error, res);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await storage.updateTicketDepartment(id, updates); // Legacy?
      const updatedDepartment = await storage.getTicketDepartment(id); // Legacy?
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await storage.updateTicketDepartment(id, updates); // Legacy?
      const updatedDepartment = await storage.getTicketDepartment(id); // Legacy?
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTicketDepartment(id); // Legacy?
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Department Migration Routes
  app.get("/api/admin/department-migration/status", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const status = await departmentMigrationService.checkMigrationStatus();
      res.json(status);
    } catch (error: any) {
      console.error("Error checking migration status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/department-counts", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const supportDepts = await storage.getSupportDepartments();
      const ticketDepts = await storage.getAllTicketDepartments(); // Legacy
      const chatDepts = await storage.getChatDepartments(); // Legacy
      res.json({
        supportDepartments: { count: supportDepts.length, departments: supportDepts.map(d => ({ id: d.id, name: d.name, isActive: d.isActive })) },
        ticketDepartments: { count: ticketDepts.length, departments: ticketDepts.map(d => ({ id: d.id, name: d.name, isActive: d.isActive })) },
        chatDepartments: { count: chatDepts.length, departments: chatDepts.map(d => ({ id: d.id, name: d.name, isActive: d.isActive })) }
      });
    } catch (error: any) {
      console.error("Error checking department counts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/department-migration/finalize-columns", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    // This route involves direct SQL execution and schema alterations.
    // It's kept as is from the original file due to its complexity and potential impact.
    try {
        console.log('Starting manual migration finalization...');
        const constraintsResult = await db.execute(sql`
          SELECT constraint_name, table_name, column_name
          FROM information_schema.key_column_usage
          WHERE table_name IN ('tickets', 'chat_sessions') AND constraint_name LIKE '%department%'
          ORDER BY table_name, constraint_name`);
        console.log('Current department-related constraints:', constraintsResult.rows);

        await db.transaction(async (tx) => {
          console.log('Dropping all existing department foreign key constraints...');
          await tx.execute(sql`ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_department_id_ticket_departments_id_fk"`);
          await tx.execute(sql`ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_department_id_new_fkey"`);
          await tx.execute(sql`ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_department_id_support_departments_id_fk"`);
          await tx.execute(sql`ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_department_id_chat_departments_id_fk"`);
          await tx.execute(sql`ALTER TABLE "chat_sessions" DROP CONSTRAINT IF EXISTS "chat_sessions_department_id_support_departments_id_fk"`);

          const ticketsTableInfo = await tx.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'tickets' AND column_name = 'department_id_new'`);
          if (ticketsTableInfo.rows.length > 0) {
            console.log('Found department_id_new column, performing column swap...');
            await tx.execute(sql`ALTER TABLE "tickets" RENAME COLUMN "department_id" TO "legacy_department_id_temp"`);
            await tx.execute(sql`ALTER TABLE "tickets" RENAME COLUMN "department_id_new" TO "department_id"`);
            await tx.execute(sql`UPDATE "tickets" SET "legacy_department_id" = "legacy_department_id_temp" WHERE "legacy_department_id" IS NULL AND "legacy_department_id_temp" IS NOT NULL`);
            await tx.execute(sql`ALTER TABLE "tickets" DROP COLUMN IF EXISTS "legacy_department_id_temp"`);
          } else {
            console.log('No department_id_new column found, columns already swapped');
          }

          console.log('Adding new foreign key constraints for unified departments...');
          await tx.execute(sql`ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_support_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "support_departments"("id") ON DELETE SET NULL`);
          await tx.execute(sql`ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_department_id_support_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "support_departments"("id") ON DELETE SET NULL`);
          console.log('Migration finalization completed successfully');
        });

        res.json({ success: true, message: 'Migration finalization completed successfully - all tables now reference support_departments' });
      } catch (error: any) {
        console.error("Error finalizing migration:", error);
        res.status(500).json({ error: error.message });
      }
  });

  app.post("/api/admin/department-migration/migrate", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await departmentMigrationService.migrateDepartments();
      res.json(result.success ? result : { ...result, status: 500 });
    } catch (error: any) {
      console.error("Error performing migration:", error);
      res.status(500).json({ success: false, message: `Migration failed: ${error.message}`, details: { conflicts: [] } });
    }
  });

  app.post("/api/admin/department-migration/sync", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const result = await departmentMigrationService.syncNewDepartments();
      res.json(result.success ? result : { ...result, status: 500 });
    } catch (error: any) {
      console.error("Error performing department sync:", error);
      res.status(500).json({ success: false, message: `Department sync failed: ${error.message}`, details: { conflicts: [] } });
    }
  });

  // Unified Department Management Routes
  app.get("/api/admin/unified-departments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const departments = await storage.getSupportDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching unified departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/unified-departments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const departments = await storage.getActiveSupportDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching active unified departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/unified-departments", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
    try {
      const department = await storage.createSupportDepartment(req.body);
      res.status(201).json(department);
    } catch (error: any) {
      console.error("Error creating unified department:", error);
      if ((error as any).code === '23505') { // Unique constraint violation
        res.status(400).json({ error: 'Department name already exists' });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  });

  app.put("/api/admin/unified-departments/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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

  app.delete("/api/admin/unified-departments/:id", isAuthenticated, isAdmin, async (req: Request, res: Response) => {
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
  app.get("/api/tickets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      const totalTickets = await storage.getUserTicketsCount((req.user! as any).id, status);
      const tickets = await storage.getUserTicketsPaginated((req.user! as any).id, limit, offset, status);
      res.json({ data: tickets, pagination: { total: totalTickets, pages: Math.ceil(totalTickets / limit), current: page, perPage: limit } });
    } catch (error: any) {
      console.error("Error fetching tickets:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin")) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messages = await storage.getTicketMessages(ticketId);
      const department = ticket.departmentId ? await storage.getSupportDepartment(ticket.departmentId) : null;
      let server = null;
      if (ticket.vpsId) {
        try {
          await virtFusionApi.updateSettings();
          if ((req.user! as any).virtFusionId) {
            const serverData = await virtFusionApi.getServer(ticket.vpsId); // Ensure this returns the expected structure
            if (serverData && serverData.data) {
                const sd = serverData.data;
                const netIface = sd.network?.interfaces?.[0] || {};
                server = {
                    id: sd.id, name: sd.name, hostname: sd.hostname, ip: (netIface.ipv4 || [])[0]?.address,
                    status: sd.state, isNat: netIface.isNat || false, hypervisorId: sd.hypervisorId,
                    allIps: [...(netIface.ipv4 || []).map((ip:any) => ({...ip, type: 'ipv4'})), ...(netIface.ipv6 || []).map((ip:any) => ({...ip, type: 'ipv6', address: ip.address || `${ip.subnet}/${ip.cidr}`}))],
                    ipv4s: (netIface.ipv4 || []), ipv6s: (netIface.ipv6 || []).map((ip:any) => ({...ip, address: ip.address || `${ip.subnet}/${ip.cidr}`})),
                    network: netIface ? { name: netIface.name, mac: netIface.mac, isNat: netIface.isNat, enabled: netIface.enabled} : undefined,
                    os: sd.os?.name, package: sd.package?.name
                };
            }
          }
        } catch (error) { console.error(`Error fetching VPS data for ticket ${ticketId}:`, error); }
      }
      res.json({ ticket, messages, server, department });
    } catch (error: any) {
      console.error(`Error fetching ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      if (!user || !user.id) return res.status(401).json({ error: "User authentication required" });
      if (!req.body.departmentId) return res.status(400).json({ error: "Department selection is required" });

      const department = await storage.getSupportDepartment(req.body.departmentId);
      if (!department || !department.isActive) return res.status(department ? 400 : 404).json({ error: department ? "Selected department is not available" : "Selected department not found" });

      let vpsData = null;
      let vpsId = req.body.vpsId || null;
      if (department.requiresVps) {
        if (!vpsId) return res.status(400).json({ error: "VPS selection is required for this department" });
        try {
          await virtFusionApi.updateSettings();
          if (user.virtFusionId) {
            const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
            const serverInfo = userServers.data.find((s: any) => s.id === vpsId);
            if (!serverInfo) return res.status(404).json({ error: "VPS not found or not accessible" });
            vpsData = { id: serverInfo.id, name: serverInfo.name, hostname: serverInfo.hostname, ip: serverInfo.ip, status: serverInfo.status, os: serverInfo.os?.name || "Unknown", package: serverInfo.package?.name || "Unknown" };
          } else {
            return res.status(400).json({ error: "Your account is not linked to VirtFusion" });
          }
        } catch (vpsError: any) { return res.status(500).json({ error: "Error accessing VPS information: " + vpsError.message }); }
      }

      const ticketData = insertTicketSchema.parse({ ...req.body, userId: user.id, vpsData: vpsData, vpsId: vpsId });
      const ticket = await storage.createTicket(ticketData);
      if (req.body.message) {
        await storage.createTicketMessage({ ticketId: ticket.id, userId: user.id, message: req.body.message });
      }

      try {
        const dbUser = await storage.getUser(user.id);
        const userName = dbUser ? `${dbUser.fullName} (${dbUser.email})` : `User #${user.id}`;
        let additionalInfo = `Department: ${department.name}`;
        if (vpsData) additionalInfo += `\nVPS: ${vpsData.name} (${vpsData.hostname}, ${vpsData.ip})\nOS: ${vpsData.os}\nPackage: ${vpsData.package}\nStatus: ${vpsData.status}`;

        await discordService.sendNewTicketNotification(ticket.id, ticket.subject, `${req.body.message || "(No message)"}\n\n${additionalInfo}`, userName);
        await discordBotService.createThreadForTicket(ticket.id, ticket.subject, `${req.body.message || "(No message)"}\n\n${additionalInfo}`, dbUser?.fullName || `User #${user.id}`);
      } catch (webhookError: any) { console.error("Error sending Discord notification for new ticket:", webhookError.message); }

      res.status(201).json(ticket);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(error, res);
      console.error("Error creating ticket:", error);
      res.status(500).json({ error: "Failed to create ticket" });
    }
  });

  app.get("/api/tickets/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin")) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messages = await storage.getTicketMessages(ticketId);
      const enrichedMessages = await Promise.all(messages.map(async (message) => {
        const msgUser = await storage.getUser(message.userId);
        return { ...message, user: msgUser ? { id: msgUser.id, fullName: msgUser.fullName, email: msgUser.email, role: msgUser.role } : undefined };
      }));
      res.json(enrichedMessages);
    } catch (error: any) {
      console.error(`Error fetching ticket messages:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/messages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin")) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const messageData = insertTicketMessageSchema.parse({ ...req.body, ticketId, userId: (req.user! as any).id });
      const message = await storage.createTicketMessage(messageData);

      if ((req.user! as any).role === "admin" && ticket.status === "open") {
        await storage.updateTicket(ticketId, { status: "in-progress" });
      }

      try {
        const msgUser = await storage.getUser((req.user! as any).id);
        const userName = msgUser ? `${msgUser.fullName} (${msgUser.email})` : `User #${(req.user! as any).id}`;
        const isAdminUser = (req.user! as any).role === "admin";
        await discordService.sendTicketReplyNotification(ticketId, ticket.subject, messageData.message, userName, isAdminUser);
        await discordBotService.sendReplyToThread(ticketId, messageData.message, msgUser?.fullName || `User #${(req.user! as any).id}`, isAdminUser);
      } catch (webhookError: any) { console.error("Error sending Discord notification for ticket reply:", webhookError.message); }

      res.status(201).json(message);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(error, res);
      console.error("Error adding message:", error);
      res.status(500).json({ error: "Failed to add message" });
    }
  });

  app.post("/api/tickets/:id/close", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin")) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      await storage.updateTicket(ticketId, { status: "closed" });

      const isAdminUser = (req.user! as any).role === "admin";
      const userName = (req.user! as any).fullName || (req.user! as any).username;
      discordService.sendTicketStatusNotification(ticketId, ticket.subject, userName, "closed", isAdminUser);
      try {
        if (typeof discordBotService.updateThreadStatus === 'function') {
          await discordBotService.updateThreadStatus(ticketId, "closed", userName);
        }
      } catch (error) { console.error("Error updating Discord thread status:", error); }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error closing ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tickets/:id/reopen", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin")) {
        return res.status(404).json({ error: "Ticket not found" });
      }
      if (ticket.status !== "closed") return res.status(400).json({ error: "Ticket is already open" });

      await storage.updateTicket(ticketId, { status: "open" });
      const isAdminUser = (req.user! as any).role === "admin";
      const userName = (req.user! as any).fullName || (req.user! as any).username;
      discordService.sendTicketStatusNotification(ticketId, ticket.subject, userName, "reopened", isAdminUser);
      try {
        if (typeof discordBotService.updateThreadStatus === 'function') {
          await discordBotService.updateThreadStatus(ticketId, "open", userName);
        }
      } catch (error) { console.error("Error updating Discord thread status:", error); }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error reopening ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/:id/download", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketIdStr = req.params.id;
      if (!ticketIdStr || isNaN(parseInt(ticketIdStr))) return res.status(400).json({ error: "Invalid ticket ID" });
      const ticketId = parseInt(ticketIdStr);

      const ticket = await storage.getTicket(ticketId);
      if (!ticket || (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== 'admin')) {
        return res.status(ticket ? 403 : 404).json({ error: ticket ? "Permission denied" : "Ticket not found" });
      }

      const user = await storage.getUser(ticket.userId);
      const messages = await storage.getTicketMessages(ticketId);
      let server = null;
      if (ticket.vpsId) {
        try {
          await virtFusionApi.updateSettings();
          const serverResponse = await virtFusionApi.getServer(ticket.vpsId, false); // remoteState false
          if (serverResponse && serverResponse.data) {
            // Simplified server data for PDF
             const sd = serverResponse.data;
             const netIface = sd.network?.interfaces?.[0] || {};
             server = {
                 id: sd.id, name: sd.name, hostname: sd.hostname,
                 ip: (netIface.ipv4 || [])[0]?.address, status: sd.state,
                 os: sd.os?.name, package: sd.package?.name
             };
          }
        } catch (err) { console.error(`Error fetching VPS info for ticket PDF ${ticketId}:`, err); }
      }

      const companyNameSetting = await storage.getSetting('company_name');
      const companyName = companyNameSetting?.value || 'SkyVPS360';
      const companyLogoSetting = await storage.getSetting('company_logo');
      const companyLogo = companyLogoSetting?.value || '';

      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticket.id}.pdf"`);
      doc.pipe(res);
      formatTicketPdfHelper(doc, ticket, messages, user, companyName, companyLogo, server, null); // creditsInfo null
      doc.end();
    } catch (error: any) {
      console.error("Error generating ticket PDF:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate ticket download", details: error.message });
      } else {
        res.end();
      }
    }
  });

  app.put("/api/tickets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const ticketId = parseInt(req.params.id);
      const { status } = req.body;
      if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

      const ticket = await storage.getTicket(ticketId);
      if (!ticket) return res.status(404).json({ error: "Ticket not found" });
      if (ticket.userId !== (req.user! as any).id && (req.user! as any).role !== "admin") {
        return res.status(403).json({ error: "Not authorized to update this ticket" });
      }
      if (status && !["open", "in_progress", "closed"].includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      await storage.updateTicket(ticketId, { status, updatedAt: new Date() });
      const updatedTicket = await storage.getTicket(ticketId);

      if (status && status !== ticket.status) {
        const isAdminUser = (req.user! as any).role === "admin";
        const userName = (req.user! as any).fullName || (req.user! as any).username;
        discordService.sendTicketStatusNotification(ticketId, ticket.subject, userName, status, isAdminUser);
        try {
          if (typeof discordBotService.updateThreadStatus === 'function') {
            await discordBotService.updateThreadStatus(ticketId, status, userName);
          }
        } catch (error) { console.error("Error updating Discord thread status:", error); }
      }
      res.json(updatedTicket);
    } catch (error: any) {
      console.error(`Error updating ticket:`, error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default router;
