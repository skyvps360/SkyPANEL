import { Express, Request, Response } from "express";
import { isAuthenticated } from "../auth";
import { IStorage } from "../storage";
import { formatTicketPdf } from "../ticket-download";
import PDFDocument from "pdfkit";

export function setupTicketDownloadRoutes(app: Express, storage: IStorage) {
  // Download a ticket as PDF
  app.get("/api/tickets/:id/download", isAuthenticated, async (req: Request, res: Response) => {
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
      
      // Double check the permission
      if (ticket.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "You don't have permission to access this ticket" });
      }
      
      // Get user data for the report
      const user = await storage.getUser(ticket.userId);
      
      // Get ticket messages
      const messages = await storage.getTicketMessages(ticketId);
      
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
      formatTicketPdf(doc, ticket, messages, user, companyName, companyLogo);
      
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
}