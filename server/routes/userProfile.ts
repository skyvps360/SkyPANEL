import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { storage } from "../storage";
import { AuthService } from "../auth-service";
import { EmailVerificationService } from "../email-verification-service";
import { virtFusionService } from "../virtfusion-service";

// Helper functions (copied from routes_new.ts for now)
function handleZodError(error: ZodError, res: Response) {
  const validationError = fromZodError(error);
  res.status(400).json({ error: validationError.message });
}

function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

const router = (app: Express) => {
  // Update user profile
  app.patch("/api/user/profile", isAuthenticated, async (req: Request, res: Response) => {
    try {
      console.log("Profile update request received:", req.body);

      const userId = (req.user! as any).id;
      console.log("User ID:", userId);

      const user = await storage.getUser(userId);

      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(404).json({ error: "User not found" });
      }

      console.log("Found user:", user);

      // Validate the request body
      const updateSchema = z.object({
        fullName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      });

      let validatedData;
      try {
        validatedData = updateSchema.parse(req.body);
        console.log("Validated data:", validatedData);
      } catch (error) {
        console.error("Validation error:", error);
        if (error instanceof ZodError) {
          return handleZodError(error as ZodError, res);
        }
        throw error;
      }

      // If email is changing, check if the new email is already in use
      if (validatedData.email && validatedData.email !== user.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== userId) {
          console.log("Email already in use:", validatedData.email);
          return res.status(400).json({ error: "Email is already in use" });
        }
      }

      // Update user in database
      console.log("Updating user in database:", validatedData);
      await storage.updateUser(userId, validatedData);

      // If user is linked to VirtFusion, sync the changes
      if (user.virtFusionId) {
        try {
          console.log(`Syncing user ${userId} with VirtFusion ID ${user.virtFusionId}`);

          // Use the VirtFusion service to update profile (username and email only)
          const result = await virtFusionService.updateUserProfile(
            user.virtFusionId,
            validatedData.fullName || user.fullName,
            validatedData.email || user.email
          );

          if (result.success) {
            console.log(`Successfully synced user ${userId} with VirtFusion`);
          } else {
            console.error(`Failed to sync user with VirtFusion: ${result.message}`);
          }
        } catch (virtFusionError: any) {
          console.error("Error syncing with VirtFusion:", virtFusionError);
          // We don't fail the request if VirtFusion sync fails, just log the error
        }
      }

      // Get the updated user to return
      const updatedUser = await storage.getUser(userId);
      console.log("Updated user:", updatedUser);
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Check email verification status
  app.get("/api/verification-status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const isVerified = await EmailVerificationService.isEmailVerified((req.user! as any).id);
      res.json({
        isVerified,
        email: (req.user! as any).email
      });
    } catch (error: any) {
      console.error("Error checking verification status:", error);
      res.status(500).json({
        success: false,
        message: "An error occurred while checking verification status."
      });
    }
  });

  // Request password reset (forgotten password)
  app.post("/api/auth/request-password-reset", async (req: Request, res: Response) => {
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
  app.post("/api/auth/verify-reset-code", async (req: Request, res: Response) => {
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

  // Request username reminder (forgotten username)
  app.post("/api/auth/request-username", async (req: Request, res: Response) => {
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
  app.post("/api/auth/change-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required"
        });
      }

      const isReset = req.body.reset === true || !newPassword;

      if (!isReset && !newPassword) {
        return res.status(400).json({
          success: false,
          message: "New password is required"
        });
      }

      const result = await AuthService.changePassword(
        (req.user! as any).id,
        currentPassword,
        isReset ? '' : newPassword
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
};

export default router;
