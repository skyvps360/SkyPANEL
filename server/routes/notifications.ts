import type { Express, Request, Response } from "express";
import { storage } from "../storage";

// Helper function (copied from routes_new.ts for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

const router = (app: Express) => {
  // Get user's notifications
  app.get("/api/notifications", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let notifications = await storage.getUserNotifications(user.id);

      if (user.role === "admin") {
        console.log("Admin user - checking for open tickets to add to notifications");
        const openTickets = await storage.getTicketsByStatus(["open", "in_progress"]);
        if (openTickets.length > 0) {
          console.log(`Found ${openTickets.length} open tickets to notify admin about`);
          const ticketNotifications = await Promise.all(
            openTickets.map(async (ticket) => {
              const ticketUser = await storage.getUser(ticket.userId);
              const userName = ticketUser ? ticketUser.fullName : `User #${ticket.userId}`;
              const statusText = ticket.status === "open" ? "new" : "in progress";
              return {
                id: `ticket-${ticket.id}`, // Virtual ID
                userId: user.id,
                type: "ticket",
                title: `Support ticket ${statusText}`,
                message: `Ticket #${ticket.id} from ${userName}: ${ticket.subject}`,
                read: false, // Admins would need to "read" these virtual notifications
                createdAt: ticket.createdAt,
                additionalData: JSON.stringify({ ticketId: ticket.id, status: ticket.status }),
              };
            })
          );
          notifications = [...ticketNotifications, ...notifications];
          notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }
      }
      res.json(notifications);
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread/count", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = req.user as any;
      let count = await storage.getUnreadNotificationCount(user.id);
      if (user.role === "admin") {
        const openTickets = await storage.getTicketsByStatus(["open", "in_progress"]);
        count += openTickets.length;
      }
      res.json({ count });
    } catch (error: any) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark a notification as read
  app.post("/api/notifications/mark-read/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
      if (isNaN(notificationId)) {
        // If it's a virtual ticket notification, it won't be a number
        if (req.params.id.startsWith("ticket-")) {
          // For admin ticket notifications, "marking as read" might mean navigating to the ticket.
          // No direct DB action here unless a separate tracking for admin "read" status of tickets is implemented.
          return res.json({ success: true, message: "Admin ticket notification acknowledged." });
        }
        return res.status(400).json({ error: "Invalid notification ID" });
      }
      await storage.markNotificationAsRead(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Note: This will only mark real DB notifications as read.
      // Admin "ticket" notifications are virtual and won't be affected by this call.
      await storage.markAllNotificationsAsRead((req.user! as any).id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Delete a notification
  app.delete("/api/notifications/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const notificationId = parseInt(req.params.id);
       if (isNaN(notificationId)) {
        // If it's a virtual ticket notification
        if (req.params.id.startsWith("ticket-")) {
           // No direct DB action for virtual notifications
          return res.json({ success: true, message: "Admin ticket notification dismissed (no DB change)." });
        }
        return res.status(400).json({ error: "Invalid notification ID" });
      }
      await storage.deleteNotification(notificationId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default router;
