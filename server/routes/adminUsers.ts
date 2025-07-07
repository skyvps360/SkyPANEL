import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import { hashPassword } from "../auth"; // For password hashing
import { emailService } from "../email"; // For sending reset password email
import https from "https"; // For VirtFusion direct API call in usage endpoint
import axios from "axios"; // For VirtFusion direct API call in usage endpoint

// Helper functions (copied from routes_new.ts for now)
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
  // Get all users (admin only)
  app.get("/api/admin/users", isAdmin, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users.map(u => ({...u, password: undefined }))); // Exclude passwords
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single user by ID (admin only)
  app.get("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, ...sanitizedUser } = user; // Exclude password
      res.json(sanitizedUser);
    } catch (error: any) {
      console.error(`Error fetching user with ID ${req.params.id}:`, error);
      res.status(500).json({ error: error.message || "Failed to retrieve user" });
    }
  });

  // Update user (admin only)
  app.patch("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      const updateSchema = z.object({
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "client"]).optional(),
        credits: z.number().min(0).optional(), // Assuming credits might still be part of user object locally
        // Add other updatable fields from your user schema if necessary
        isActive: z.boolean().optional(), // If you have an isActive field
        virtFusionId: z.number().int().optional(), // If admin can set/change this
      });

      const validatedData = updateSchema.parse(req.body);

      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ error: "Email is already in use" });
        }
      }

      await storage.updateUser(userId, validatedData);

      if (user.virtFusionId && (validatedData.fullName || validatedData.email)) {
        try {
          await virtFusionApi.updateSettings();
          await virtFusionApi.modifyUserByExtRelationId(user.id, { // Use user.id as extRelationId
            name: validatedData.fullName || user.fullName,
            email: validatedData.email || user.email,
          });
        } catch (error: any) {
          console.error("Error updating user in VirtFusion:", error);
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof ZodError) return handleZodError(error, res);
      console.error("Error updating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:id/role", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      if (isNaN(userId) || !role || !["admin", "client"].includes(role)) {
        return res.status(400).json({ error: "Invalid user ID or role" });
      }
      await storage.updateUserRole(userId, role);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error updating user role:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Reset user password (admin only)
  app.post("/api/admin/users/:id/reset-password", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      let temporaryPassword = "";
      let virtFusionError = null;
      await virtFusionApi.updateSettings();

      if (user.virtFusionId) {
        try {
          console.log(`Attempting to reset password via VirtFusion API for user with extRelationId: ${user.id}`);
          const response = await virtFusionApi.resetUserPassword(user.id); // extRelationId is user.id
          if (response && response.data && response.data.password) {
            temporaryPassword = response.data.password;
          } else {
            temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            virtFusionError = 'VirtFusion response did not contain expected password field.';
          }
        } catch (error: any) {
          virtFusionError = error.message || 'VirtFusion API error during password reset.';
          temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
        }
      } else {
        temporaryPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }

      const hashedPassword = await hashPassword(temporaryPassword);
      await storage.updateUser(userId, { password: hashedPassword });

      try {
        const adminUser = req.user as any;
        const adminName = adminUser?.fullName || 'System Administrator';
        await emailService.sendAdminPasswordResetEmail(user.email, temporaryPassword, adminName);
      } catch (emailError: any) { console.error("Error sending password reset email:", emailError); }

      const responseObj: any = { success: true, temporaryPassword };
      if (user.virtFusionId && virtFusionError) {
        responseObj.virtFusionWarning = "Password was reset locally but VirtFusion API call failed or had issues.";
        responseObj.virtFusionError = virtFusionError;
      }
      return res.json(responseObj);
    } catch (error: any) {
      console.error("Error resetting user password:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Suspend/Enable user (admin only)
  app.patch("/api/admin/users/:id/status", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      const { enabled } = req.body;
      if (isNaN(userId) || enabled === undefined) {
        return res.status(400).json({ error: "Invalid user ID or status parameter" });
      }
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if ((req.user! as any).id === userId) return res.status(403).json({ error: "You cannot modify your own account status" });

      if (user.virtFusionId) {
        try {
          await virtFusionApi.updateSettings();
          const selfServiceValue = enabled ? 1 : 0;
          const updateData = { name: user.fullName, email: user.email, selfService: selfServiceValue, selfServiceHourlyCredit: true, selfServiceHourlyResourcePack: 1, enabled: enabled };
          await virtFusionApi.modifyUserByExtRelationId(user.id, updateData); // Use user.id as extRelationId

          const emailSubject = enabled ? "Your Account Has Been Activated" : "Your Account Has Been Suspended";
          const emailBody = enabled ? `<p>Hello ${user.fullName},</p><p>Your account has been activated...</p>` : `<p>Hello ${user.fullName},</p><p>Your account has been suspended...</p>`;
          await emailService.sendNotificationEmail(user.email, emailSubject, emailBody);

        } catch (error: any) {
          console.error(`Error updating user status in VirtFusion:`, error);
          return res.status(500).json({ error: "Failed to update user status in VirtFusion", details: error.message });
        }
      }
      await storage.updateUser(userId, { isActive: enabled });
      res.json({ success: true, message: enabled ? "User has been enabled" : "User has been suspended" });
    } catch (error: any) {
      console.error("Error updating user status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get VirtFusion user usage data (admin only)
  app.get("/api/admin/users/:id/usage", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.virtFusionId) return res.status(400).json({ error: "User is not linked to VirtFusion" });

      try {
        await virtFusionApi.updateSettings();
        // VirtFusion expects our user.id as "extRelationId" for this
        const extRelationId = user.id;
        const virtFusionApiUrl = process.env.VIRTFUSION_API_URL || 'https://vdc.skyvps360.xyz/api/v1';
        const virtFusionApiToken = process.env.VIRTFUSION_API_TOKEN;
        if (!virtFusionApiUrl || !virtFusionApiToken) throw new Error("VirtFusion API URL or token not configured");

        let apiBase = virtFusionApiUrl.endsWith("/") ? virtFusionApiUrl.slice(0, -1) : virtFusionApiUrl;
        const fullUrl = `${apiBase}/selfService/hourlyStats/byUserExtRelationId/${extRelationId}`;

        const response = await axios({
          method: 'GET', url: fullUrl,
          headers: { Authorization: `Bearer ${virtFusionApiToken}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          httpsAgent: new https.Agent({ rejectUnauthorized: true }) // Ensure SSL verification
        });

        let tokens = 0; let value = 0;
        if (response.data && response.data.credit && response.data.credit.tokens) {
          tokens = parseFloat(response.data.credit.tokens);
          value = tokens / 100;
        }
        res.json({ success: true, data: { ...response.data, virtFusionTokens: tokens, virtFusionCredits: value } });
      } catch (error: any) {
        console.error(`Error fetching user usage data from VirtFusion:`, error);
        return res.status(500).json({ error: "Failed to fetch user usage data from VirtFusion", details: error.message });
      }
    } catch (error: any) {
      console.error("Error fetching user usage data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add VirtFusion credits to a user (admin only)
  app.post("/api/admin/users/:id/virtfusion-credit", isAdmin, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.virtFusionId) return res.status(400).json({ error: "User is not linked to VirtFusion" });

        const { amount, reference } = req.body;
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return res.status(400).json({ error: "Invalid credit amount (must be positive number of tokens)" });
        }

        const extRelationId = user.id; // Use local user.id as extRelationId
        await virtFusionApi.updateSettings();

        let initialBalance = 0;
        try {
            const balanceData = await virtFusionApi.getUserHourlyStats(extRelationId);
            if (balanceData?.data?.credit?.tokens) {
                initialBalance = parseFloat(balanceData.data.credit.tokens) / 100; // In dollars
            }
        } catch (balanceError) { console.error("Error fetching initial balance for credit addition:", balanceError); }

        const creditData = { tokens: Number(amount), reference_2: reference || `Added via Admin Portal on ${new Date().toISOString()}` };
        const result = await virtFusionApi.addCreditToUser(extRelationId, creditData);
        if (!result || !result.data || !result.data.id) {
            return res.status(500).json({ error: "Failed to add credits to VirtFusion (no result ID)" });
        }

        const createdTransaction = await storage.createTransaction({
            userId: user.id, amount: Math.abs(Number(amount) / 100),
            description: `Added ${amount} tokens to VirtFusion (Credit ID: ${result.data.id})`,
            type: "credit", status: "completed",
            virtFusionCreditId: String(result.data.id), reference: reference || null
        });

        try {
            const updatedBalanceData = await virtFusionApi.getUserHourlyStats(extRelationId);
            if (updatedBalanceData?.data?.credit?.tokens) {
                const updatedBalance = parseFloat(updatedBalanceData.data.credit.tokens) / 100; // In dollars
                if (initialBalance < 0) {
                    const deductionAmount = Math.abs(initialBalance);
                    if (deductionAmount > 0) {
                        await storage.createTransaction({
                            userId: user.id, amount: deductionAmount * -1, type: "virtfusion_deduction",
                            description: `Automatic deduction for negative balance (linked to tx #${createdTransaction.id})`,
                            status: "completed"
                        });
                    }
                }
            }
        } catch (balanceError) { console.error("Error fetching updated balance after credit addition:", balanceError); }

        return res.json({ success: true, message: "Credits added successfully to VirtFusion.", creditId: result.data.id });
    } catch (error:any) {
        console.error("Error adding VirtFusion credits:", error);
        return res.status(500).json({ error: "Failed to add credits to VirtFusion", details: error.message });
    }
});

  // Remove VirtFusion credits from a user (admin only)
  app.delete("/api/admin/users/:id/virtfusion-credit", isAdmin, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        if (!user.virtFusionId) return res.status(400).json({ error: "User is not linked to VirtFusion" });

        const { creditId, tokens, reference } = req.body;
        await virtFusionApi.updateSettings();

        if (creditId) { // Legacy: Remove by Credit ID (VirtFusion's internal credit record ID)
            if (isNaN(Number(creditId)) || Number(creditId) <= 0) return res.status(400).json({ error: "Invalid VirtFusion Credit ID" });
            await virtFusionApi.removeCreditFromUser(Number(creditId)); // This takes VirtFusion's credit record ID
            await storage.createTransaction({ userId: user.id, amount: 0, description: `Removed VirtFusion credit (Legacy VF Credit ID: ${creditId})`, type: "debit", status: "completed" });
            return res.json({ success: true, message: "VirtFusion credit removed (legacy method)." });
        } else if (tokens) { // New: Remove by token amount using extRelationId
            if (isNaN(Number(tokens)) || Number(tokens) <= 0) return res.status(400).json({ error: "Invalid token amount" });

            const tokenAmount = Number(tokens);
            const dollarAmount = tokenAmount / 100;
            const extRelationId = user.id; // Use local user.id as extRelationId

            const tempTransaction = await storage.createTransaction({ userId: user.id, amount: -Math.abs(dollarAmount), description: `Removing ${tokenAmount} tokens...`, type: "debit", status: "pending" });
            const tokenData = { tokens: tokenAmount, reference_1: tempTransaction.id, reference_2: reference || `Admin token removal - User ID: ${userId}` };

            try {
                await virtFusionApi.removeCreditFromUserByExtRelationId(extRelationId, tokenData);
                await storage.updateTransaction(tempTransaction.id, { status: "completed", description: `Removed ${tokenAmount} tokens from VirtFusion${reference ? ` (${reference})` : ''}` });
                return res.json({ success: true, message: "VirtFusion tokens removed.", tokens: tokenAmount });
            } catch (apiError: any) {
                await storage.updateTransaction(tempTransaction.id, { status: "failed", description: `Failed to remove ${tokenAmount} tokens: ${apiError.message}` });
                throw apiError; // Rethrow to be caught by outer catch
            }
        } else {
            return res.status(400).json({ error: "Either creditId (legacy) or tokens (new method) is required" });
        }
    } catch (error: any) {
        console.error("Error removing VirtFusion credit:", error);
        return res.status(500).json({ error: "Failed to remove credit/tokens from VirtFusion", details: error.message });
    }
  });

  // Delete user (admin only)
  app.delete("/api/admin/users/:id", isAdmin, async (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ error: "User not found" });
        if ((req.user! as any).id === userId) return res.status(403).json({ error: "You cannot delete your own account" });

        await virtFusionApi.updateSettings();
        if (user.virtFusionId) {
            try {
                const serversResponse = await virtFusionApi.getUserServers(user.virtFusionId);
                let serverCount = 0;
                if (serversResponse && serversResponse.data) {
                    serverCount = Array.isArray(serversResponse.data) ? serversResponse.data.length : (serversResponse.data.servers && Array.isArray(serversResponse.data.servers) ? serversResponse.data.servers.length : 0);
                }
                if (serverCount > 0) {
                    return res.status(409).json({ error: "Cannot delete user with active servers", details: `User has ${serverCount} server(s).`});
                }
                // If no servers, or if user not found in VirtFusion (404 during server check), proceed to delete from VirtFusion
                try {
                    await virtFusionApi.deleteUserByExtRelationId(user.id); // Use local user.id as extRelationId
                } catch (vfDeleteError: any) {
                     // If 404 from VirtFusion, it means user doesn't exist there, which is fine for deletion.
                    if (!(vfDeleteError.response && vfDeleteError.response.status === 404) && !(vfDeleteError.message && vfDeleteError.message.includes("404"))) {
                        throw vfDeleteError; // Rethrow if not a 404
                    }
                    console.warn(`User ${user.id} not found in VirtFusion for deletion, or other non-critical VF error: ${vfDeleteError.message}`);
                }
            } catch (serverCheckError: any) {
                 // If 404 from VirtFusion (user not found), proceed with local deletion.
                if (!(serverCheckError.response && serverCheckError.response.status === 404) && !(serverCheckError.message && serverCheckError.message.includes("404"))) {
                    console.error("Critical error checking VirtFusion servers, aborting deletion:", serverCheckError.message);
                    return res.status(500).json({ error: "Unable to verify server status in VirtFusion.", details: serverCheckError.message });
                }
                 console.warn(`User ${user.id} not found in VirtFusion during server check, or other non-critical VF error: ${serverCheckError.message}`);
            }
        }
        await storage.deleteUser(userId); // Delete from local DB
        res.json({ success: true, message: "User has been deleted successfully" });
    } catch (error: any) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "User deletion failed", details: error.message });
    }
});


  // Sync user with VirtFusion (admin only)
  app.post("/api/admin/users/:id/sync-virtfusion", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.virtFusionId) return res.status(400).json({ error: "User is already linked to VirtFusion" });

      try {
        await virtFusionApi.updateSettings();
        const response = await virtFusionApi.createUser({
          name: user.fullName, email: user.email, extRelationId: user.id, // Use local user.id as extRelationId
          selfService: 1, selfServiceHourlyCredit: true, selfServiceHourlyResourcePack: 1,
          userData: { emails: [user.email] }, // Ensure emails is an array
        });

        let virtFusionId: number | undefined;
        if (response && typeof response === "object") {
            if (response.data && typeof response.data === "object" && typeof response.data.id === "number") virtFusionId = response.data.id;
            else if (typeof (response as any).id === "number") virtFusionId = (response as any).id;
        }
        if (!virtFusionId) throw new Error("Failed to get user ID from VirtFusion response");

        await storage.updateUser(userId, { virtFusionId });
        res.json({ success: true, virtFusionId });
      } catch (error: any) {
        console.error("Error creating user in VirtFusion:", error);
        return res.status(500).json({ error: "Failed to create user in VirtFusion", details: error.message });
      }
    } catch (error: any) {
      console.error("Error syncing user with VirtFusion:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Edit existing VirtFusion user (admin only)
  app.put("/api/admin/users/:id/virtfusion", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.id);
      if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (!user.virtFusionId) return res.status(400).json({ error: "User is not linked to VirtFusion" });

      const updateData = { ...req.body, name: user.fullName, email: user.email }; // Ensure name and email are present
      if (updateData.selfService === undefined) updateData.selfService = 1;
      if (updateData.selfServiceHourlyCredit === undefined) updateData.selfServiceHourlyCredit = true;
      if (updateData.selfServiceHourlyResourcePack === undefined) updateData.selfServiceHourlyResourcePack = 1;

      try {
        await virtFusionApi.updateSettings();
        // Use local user.id as extRelationId
        const response = await virtFusionApi.modifyUserByExtRelationId(user.id, updateData);
        res.json({ success: true, message: "User updated successfully in VirtFusion", data: response });
      } catch (error: any) {
        console.error("Error updating user in VirtFusion:", error);
        return res.status(500).json({ error: "Failed to update user in VirtFusion", details: error.message });
      }
    } catch (error: any) {
      console.error("Error updating VirtFusion user:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default router;
