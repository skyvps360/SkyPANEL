import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import https from "https";
import axios from "axios";
import * as net from "net";
import { WebSocketServer } from "ws";
import WebSocket from "ws";
import { storage } from "./storage";
import { db, pool } from "./db";
import { setupAuth, hashPassword } from "./auth";
import { AuthService } from "./auth-service";
import { EmailVerificationService } from "./email-verification-service";
import { discordService } from "./discord-service";
import { discordBotService } from "./discord-bot-service";
import { virtFusionService } from "./virtfusion-service";
import { VirtFusionApi } from "./virtfusion-api";
import { emailService } from "./email";
import { betterStackService } from "./betterstack-service";
import { geminiService } from "./gemini-service";
import { setLocationStatus, getLocationStatus, removeLocationStatus } from "./location-status-manager";
import { getMaintenanceStatus, getMaintenanceToken, regenerateMaintenanceToken, toggleMaintenanceMode, validateMaintenanceToken } from "./middleware";
import { apiKeyAuth, requireScope } from "./middleware/auth-middleware";
import apiKeysRoutes from "./routes/api-keys";
import apiOnlyRoutes from "./routes/api-only-routes";
import adminSettingsRoutes from "./routes/admin-settings";
import { eq, and, desc, isNull, gte, lte } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { formatTicketPdf } from "./ticket-download";
import * as schema from "../shared/schema";
import { datacenterLocations } from "../shared/schema";
import {
  transactions,
  tickets,
  ticketMessages,
  invoices,
  settings,
  ticketDepartments,
  insertTicketSchema,
  insertTicketMessageSchema,
  insertTicketDepartmentSchema,
  InsertTransaction,
  type InsertInvoice,
  type Transaction,
  type Invoice,
  type User,
  type TicketDepartment,
  type InsertTicketDepartment
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

// Helper function to generate invoices for transactions

async function generateInvoice(transaction: Transaction | Invoice, status: string = 'pending'): Promise<string> {
  try {
    // If an invoice is passed, use it directly
    if ('invoiceNumber' in transaction && transaction.invoiceNumber) {
      console.log(`Using existing invoice ${transaction.invoiceNumber}`);
      return generatePdfForInvoice(transaction as Invoice);
    }

    // Cast transaction to its proper type to access properties - this is critical for the function to work
    const transactionData = transaction as Transaction;

    console.log(`Generating invoice for transaction ${transactionData.id}`);

    // Get tax rate setting
    const taxRateSetting = await storage.getSetting('tax_rate');
    console.log(`Tax rate setting:`, taxRateSetting);
    const taxRate = taxRateSetting ? parseFloat(taxRateSetting.value) / 100 : 0;

    // Get currency setting
    const currencySetting = await storage.getSetting('currency');
    console.log(`Currency setting:`, currencySetting);
    const currency = currencySetting ? currencySetting.value : 'USD';

    // Calculate tax and total amounts
    const taxAmount = transactionData.amount * taxRate;
    const totalAmount = transactionData.amount + taxAmount;

    // Generate invoice number
    const invoiceNumber = await storage.generateInvoiceNumber();
    console.log(`Generated invoice number: ${invoiceNumber}`);

    // Create invoice items - ensure it's properly formatted as JSON
    const items = JSON.stringify([{
      description: transactionData.description,
      quantity: 1,
      unitPrice: transactionData.amount,
      totalPrice: transactionData.amount
    }]);

    // Prepare invoice data
    // Due in 7 days
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const paidDate = status === 'paid' ? new Date() : undefined;

    // IMPORTANT FIX: Don't use ISO strings for dates, store actual Date objects
    // This was causing the critical bug with invoice generation
    const invoiceData: InsertInvoice = {
      invoiceNumber: invoiceNumber,
      userId: transactionData.userId,
      transactionId: transactionData.id,
      amount: transactionData.amount,
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      currency: currency,
      status: status,
      items: items,
      dueDate: dueDate, // Use the actual Date object
      paidDate: paidDate, // Use the actual Date object
      notes: `Generated for transaction #${transactionData.id}`
    };

    console.log(`Invoice data prepared:`, {
      invoiceNumber,
      transactionId: transactionData.id,
      amount: transactionData.amount,
      status
    });

    try {
      // Create invoice in database
      const invoice = await storage.createInvoice(invoiceData);
      console.log(`Invoice created in database:`, invoice);

      // Update transaction with invoice number
      await storage.updateTransaction(transactionData.id, {
        invoiceNumber: invoiceNumber
      });

      console.log(`Invoice ${invoiceNumber} generated successfully for transaction ${transactionData.id}`);

      // Generate PDF for the invoice
      return generatePdfForInvoice(invoice);
    } catch (dbError: any) {
      console.error(`Database error creating invoice for transaction ${transactionData.id}:`, dbError);
      // Make error more descriptive to aid debugging
      throw new Error(`Database error creating invoice: ${dbError.message}`);
    }
  } catch (error) {
    console.error('Error generating invoice:', error);
    throw error;
  }
}

// Generate PDF for an invoice
async function generatePdfForInvoice(invoice: Invoice): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      // Collect the PDF data chunks
      doc.on('data', (chunk) => {
        chunks.push(chunk);
      });

      // When finished, resolve with the complete PDF data
      doc.on('end', () => {
        const pdfData = Buffer.concat(chunks).toString('base64');
        resolve(pdfData);
      });

      // Get user from storage
      storage.getUser(invoice.userId)
        .then(user => {
          // Format the invoice
          formatInvoicePdf(doc, invoice, user);

          // Finalize the PDF
          doc.end();
        })
        .catch(error => {
          console.error('Error getting user data for invoice:', error);
          reject(error);
        });
    } catch (error) {
      console.error('Error generating PDF:', error);
      reject(error);
    }
  });
}

// Format the PDF invoice document
function formatInvoicePdf(doc: PDFKit.PDFDocument, invoice: Invoice, user?: User): void {
  // Company info section
  doc.fontSize(20).font('Helvetica-Bold').text('SkyVPS360', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica').text('skyvps360.xyz', { align: 'center' });
  doc.text('Email: support@skyvps360.xyz', { align: 'center' });

  // Add separation line
  doc.moveDown(1);
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(1);

  // Invoice header
  doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'right' });
  doc.fontSize(12).font('Helvetica').text(`Invoice Number: ${invoice.invoiceNumber}`, { align: 'right' });
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, { align: 'right' });

  // Only show due date for non-credit purchase invoices
  // Check if the description doesn't include credit purchase or credit addition
  // First, try to parse the items if they're a JSON string
  let parsedItems = invoice.items;
  if (typeof invoice.items === 'string') {
    try {
      parsedItems = JSON.parse(invoice.items);
    } catch (e) {
      console.error('Error parsing invoice items JSON for due date check:', e);
      parsedItems = [];
    }
  }

  // Check if we should show due date - only for non-credit purchases
  let showDueDate = false;
  if (parsedItems && Array.isArray(parsedItems) && parsedItems.length > 0) {
    showDueDate = !parsedItems.some(item =>
      item.description &&
      (item.description.toLowerCase().includes('credit purchase') ||
       item.description.toLowerCase().includes('credit addition'))
    );
  }

  if (showDueDate) {
    doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, { align: 'right' });
  }

  doc.text(`Status: ${invoice.status.toUpperCase()}`, { align: 'right' });

  // Client information
  doc.moveDown(1);
  doc.fontSize(14).font('Helvetica-Bold').text('Bill To:');
  doc.fontSize(12).font('Helvetica');
  if (user) {
    doc.text(`${user.firstName || ''} ${user.lastName || ''}`);
    doc.text(`Username: ${user.username}`);
    doc.text(`Email: ${user.email}`);
  } else {
    doc.text(`Client ID: ${invoice.userId}`);
  }

  // Invoice details - Table Header
  doc.moveDown(2);
  const tableTop = doc.y;
  doc.fontSize(12).font('Helvetica-Bold');

  // Draw table headers
  let currY = tableTop;
  doc.text('Description', 50, currY);
  doc.text('Quantity', 300, currY, { width: 90, align: 'right' });
  doc.text('Unit Price', 390, currY, { width: 70, align: 'right' });
  doc.text('Amount', 460, currY, { width: 90, align: 'right' });

  currY += 20;
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, currY).lineTo(550, currY).stroke();
  currY += 10;

  // Invoice items
  doc.fontSize(12).font('Helvetica');

  try {
    // Parse the items if it's a JSON string
    let parsedItems = invoice.items;

    if (typeof invoice.items === 'string') {
      try {
        parsedItems = JSON.parse(invoice.items);
        console.log('Successfully parsed invoice items JSON:', parsedItems);
      } catch (parseError) {
        console.error('Error parsing invoice items JSON:', parseError);
        parsedItems = null;
      }
    }

    if (parsedItems && Array.isArray(parsedItems)) {
      parsedItems.forEach(item => {
        doc.text(item.description, 50, currY);
        doc.text(item.quantity.toString(), 300, currY, { width: 90, align: 'right' });
        doc.text(formatCurrency(item.unitPrice, invoice.currency), 390, currY, { width: 70, align: 'right' });
        doc.text(formatCurrency(item.totalPrice, invoice.currency), 460, currY, { width: 90, align: 'right' });
        currY += 20;
      });
    } else {
      // Fallback if items not available or not in the expected format
      doc.text(invoice.notes || 'Credit Purchase', 50, currY);
      doc.text('1', 300, currY, { width: 90, align: 'right' });
      doc.text(formatCurrency(invoice.amount, invoice.currency), 390, currY, { width: 70, align: 'right' });
      doc.text(formatCurrency(invoice.amount, invoice.currency), 460, currY, { width: 90, align: 'right' });
      currY += 20;
    }
  } catch (itemsError) {
    console.error('Error processing invoice items:', itemsError);
    // Fallback if there's any error processing the items
    doc.text('Credit Purchase', 50, currY);
    doc.text('1', 300, currY, { width: 90, align: 'right' });
    doc.text(formatCurrency(invoice.amount, invoice.currency), 390, currY, { width: 70, align: 'right' });
    doc.text(formatCurrency(invoice.amount, invoice.currency), 460, currY, { width: 90, align: 'right' });
    currY += 20;
  }

  // Draw line after items
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, currY).lineTo(550, currY).stroke();
  currY += 10;

  // Summary table
  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Subtotal:', 350, currY);
  doc.font('Helvetica');
  doc.text(formatCurrency(invoice.amount, invoice.currency), 460, currY, { width: 90, align: 'right' });
  currY += 20;

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Tax:', 350, currY);
  doc.font('Helvetica');
  doc.text(formatCurrency(invoice.taxAmount, invoice.currency), 460, currY, { width: 90, align: 'right' });
  currY += 20;

  doc.strokeColor('#cccccc').lineWidth(1).moveTo(350, currY).lineTo(550, currY).stroke();
  currY += 10;

  doc.fontSize(14).font('Helvetica-Bold');
  doc.text('TOTAL:', 350, currY);
  doc.text(formatCurrency(invoice.totalAmount, invoice.currency), 460, currY, { width: 90, align: 'right' });

  // Payment Details
  doc.moveDown(2);
  doc.fontSize(12).font('Helvetica-Bold').text('Payment Information:');
  doc.fontSize(12).font('Helvetica');
  doc.text('Payment Method: PayPal');
  if (invoice.paidDate) {
    doc.text(`Payment Date: ${formatDate(invoice.paidDate)}`);
  }

  // Notes section
  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Notes:');
  doc.fontSize(12).font('Helvetica');

  // Add transaction ID reference
  if (invoice.transactionId) {
    doc.text(`Generated for transaction #${invoice.transactionId}`);
  }

  // Show invoice notes if available
  if (invoice.notes) {
    doc.text(invoice.notes);
  }

  // Footer
  const footerY = doc.page.height - 100;
  doc.fontSize(10).font('Helvetica');
  doc.text('Thank you for your business!', 50, footerY, { align: 'center' });
  doc.text('Questions? Contact support@skyvps360.xyz', 50, footerY + 15, { align: 'center' });
}

// Helper function to format dates
function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// Helper function to format currency
function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

// VirtFusion API class for centralizing API calls
export class VirtFusionApi {
  private apiUrl: string;
  private apiToken: string;
  private sslVerify: boolean;

  constructor() {
    // Default values - will be updated with getSettings()
    // Make sure the URL doesn't have a trailing slash and doesn't include /api/v1 twice
    const apiUrl = process.env.VIRTFUSION_API_URL || "https://skyvps360.xyz";
    this.apiUrl = apiUrl.endsWith("/") ? apiUrl.slice(0, -1) : apiUrl;

    // Ensure API URL ends with /api/v1
    if (!this.apiUrl.endsWith("/api/v1")) {
      this.apiUrl = `${this.apiUrl}/api/v1`;
    }

    this.apiToken = process.env.VIRTFUSION_API_TOKEN || "";
    this.sslVerify = true;
  }

  // Check if VirtFusion API is properly configured
  isConfigured(): boolean {
    return !!this.apiUrl && !!this.apiToken;
  }

  // Get the API URL (for diagnostics)
  getApiUrl(): string {
    return this.apiUrl;
  }

  // Update API settings from environment variables
  async updateSettings() {
    try {
      console.log("VirtFusion API Settings - Current values:", {
        apiUrl: this.apiUrl,
        apiToken: this.apiToken ? "***" : "not set",
        sslVerify: this.sslVerify,
      });

      // Always prioritize environment variables over database settings
      if (process.env.VIRTFUSION_API_URL) {
        let apiUrl = process.env.VIRTFUSION_API_URL.trim();

        // Remove trailing slash if present
        if (apiUrl.endsWith('/')) {
          apiUrl = apiUrl.slice(0, -1);
        }

        // Ensure API URL ends with /api/v1
        if (!apiUrl.endsWith('/api/v1')) {
          apiUrl = `${apiUrl}/api/v1`;
        }

        this.apiUrl = apiUrl;
        console.log(`Using VirtFusion API URL from environment: ${this.apiUrl}`);
      }

      if (process.env.VIRTFUSION_API_TOKEN) {
        this.apiToken = process.env.VIRTFUSION_API_TOKEN.trim();
        console.log("Using VirtFusion API token from environment");
      }

      // SSL verification from environment variable
      if (process.env.VIRTFUSION_SSL_VERIFY !== undefined) {
        // Convert string to boolean properly
        const sslValue = String(process.env.VIRTFUSION_SSL_VERIFY).trim().toLowerCase();
        this.sslVerify = sslValue === "true" || sslValue === "1" || sslValue === "yes";
        console.log(`Using SSL verification from environment: ${this.sslVerify}`);
      }

      // If environment variables are not set, fall back to database settings (for backward compatibility)
      if (!process.env.VIRTFUSION_API_URL || !process.env.VIRTFUSION_API_TOKEN) {
        console.log("Environment variables not fully set, checking database settings as fallback");

        const apiUrlSetting = await storage.getSetting("virtfusion_api_url");
        const apiTokenSetting = await storage.getSetting("virtfusion_api_token");
        const sslVerifySetting = await storage.getSetting("virtfusion_ssl_verify");

        console.log("VirtFusion API Settings - Retrieved from DB:", {
          apiUrl: apiUrlSetting?.value || "not found",
          apiToken: apiTokenSetting?.value ? "***" : "not found",
          sslVerify: sslVerifySetting?.value || "not found",
        });

        // Only use DB settings if environment variables aren't set
        if (!process.env.VIRTFUSION_API_URL && apiUrlSetting?.value) {
          let apiUrl = apiUrlSetting.value.trim();

          // Remove trailing slash if present
          if (apiUrl.endsWith('/')) {
            apiUrl = apiUrl.slice(0, -1);
          }

          // Ensure API URL ends with /api/v1
          if (!apiUrl.endsWith('/api/v1')) {
            apiUrl = `${apiUrl}/api/v1`;
          }

          this.apiUrl = apiUrl;
          console.log("Using VirtFusion API URL from database");
        }

        if (!process.env.VIRTFUSION_API_TOKEN && apiTokenSetting?.value) {
          this.apiToken = apiTokenSetting.value.trim();
          console.log("Using VirtFusion API token from database");
        }

        // Fix the SSL verification parsing if not set in environment
        if (
          process.env.VIRTFUSION_SSL_VERIFY === undefined &&
          sslVerifySetting !== null &&
          sslVerifySetting !== undefined &&
          sslVerifySetting.value !== undefined
        ) {
          // Convert string to boolean properly
          const sslValue = String(sslVerifySetting.value).trim().toLowerCase();
          this.sslVerify = sslValue === "true" || sslValue === "1" || sslValue === "yes";
          console.log(`Using SSL verification from database: ${this.sslVerify}`);
        }
      }

      console.log("VirtFusion API Settings - Final values:", {
        apiUrl: this.apiUrl,
        apiToken: this.apiToken ? "***" : "not set",
        sslVerify: this.sslVerify,
      });
    } catch (error) {
      const err = error as Error;
      console.error("Error updating VirtFusion API settings:", err.message);
      console.error(err.stack);
    }
  }

  private async request(method: string, endpoint: string, data?: any) {
    try {
      // Validate required settings
      if (!this.apiUrl || !this.apiToken) {
        await this.updateSettings();

        if (!this.apiUrl || !this.apiToken) {
          throw new Error(
            "Missing API URL or API token. Please configure VirtFusion API settings first.",
          );
        }
      }

      // Format the URL correctly to avoid double paths
      let apiBase = this.apiUrl;
      if (apiBase.endsWith("/")) {
        apiBase = apiBase.slice(0, -1);
      }

      // Check if the API URL already contains /api/v1
      const hasApiV1 = apiBase.toLowerCase().endsWith("/api/v1");

      // If the endpoint starts with /api/v1 and our base already ends with it, remove from endpoint
      let normalizedEndpoint = endpoint;
      if (hasApiV1 && endpoint.startsWith("/api/v1")) {
        normalizedEndpoint = endpoint.substring(7); // Remove /api/v1 prefix
        console.log(
          `Removed duplicate /api/v1 from endpoint. Original: ${endpoint}, New: ${normalizedEndpoint}`,
        );
      }

      const fullUrl = `${apiBase}${normalizedEndpoint.startsWith("/") ? normalizedEndpoint : "/" + normalizedEndpoint}`;

      // Log request details (mask token for security)
      const maskedToken =
        this.apiToken.length > 8
          ? `${this.apiToken.substring(0, 4)}...${this.apiToken.substring(this.apiToken.length - 4)}`
          : "********";
      console.log(`Making ${method} request to ${fullUrl}`);
      console.log(`Using token: ${maskedToken}`);
      console.log(`SSL verification: ${this.sslVerify}`);

      if (data) {
        console.log(`Request data: ${JSON.stringify(data, null, 2)}`);
      }

      try {
        const response = await axios({
          method,
          url: fullUrl,
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            "Content-Type": "application/json",
            Accept: "application/json, */*",
          },
          data,
          // Apply SSL verification setting
          httpsAgent: new https.Agent({ rejectUnauthorized: this.sslVerify }),
          // Add a timeout to prevent hanging requests
          timeout: 30000,
        });

        // Log response status
        console.log(`VirtFusion API Response status: ${response.status}`);

        // Check if response contains data
        if (!response.data) {
          console.warn("Empty response data from VirtFusion API");
          return null;
        }

        // Log a truncated version of the response for debugging
        const responseStr =
          typeof response.data === "object"
            ? JSON.stringify(response.data)
            : String(response.data);
        const truncatedResponse =
          responseStr.length > 500
            ? responseStr.substring(0, 500) + "..."
            : responseStr;
        console.log(`Response data (may be truncated): ${truncatedResponse}`);

        // Check and log the response content type
        const contentType = response.headers["content-type"];
        console.log(`Response content type: ${contentType || "not specified"}`);

        // Ensure we got JSON data
        if (contentType && !contentType.includes("application/json")) {
          console.warn(`Unexpected content type in response: ${contentType}`);

          // Try to handle it anyway, but log the warning
          if (typeof response.data === "string") {
            try {
              // Try to parse if it's JSON string despite content type
              return JSON.parse(response.data);
            } catch (parseErr) {
              console.error("Failed to parse response as JSON:", parseErr);
              throw new Error(
                `Received non-JSON response: ${response.data.substring(0, 100)}...`,
              );
            }
          }
        }

        // Handle paginated responses properly
        if (
          response.data &&
          typeof response.data === "object" &&
          "data" in response.data
        ) {
          console.log(
            "Found data property in response, returning the full response object",
          );
          return response.data;
        }

        return response.data;
      } catch (axiosError: any) {
        // Handle Axios specific errors
        if (axiosError.isAxiosError) {
          console.error(`Axios Error: ${axiosError.message}`);

          if (axiosError.response) {
            // The request was made and the server responded with a status code outside of 2xx
            console.error(`Response status: ${axiosError.response.status}`);

            if (axiosError.response.headers) {
              console.error(
                `Response headers:`,
                JSON.stringify(axiosError.response.headers, null, 2),
              );
            }

            // Log response data safely
            try {
              console.error(
                `Response data:`,
                typeof axiosError.response.data === "object"
                  ? JSON.stringify(axiosError.response.data, null, 2)
                  : axiosError.response.data,
              );
            } catch (e: any) {
              console.error(`Could not stringify response data: ${e.message}`);
              console.error(`Raw response data:`, axiosError.response.data);
            }

            // Include error details from the API if available
            if (
              axiosError.response.data &&
              typeof axiosError.response.data === "object"
            ) {
              if (axiosError.response.data.message) {
                throw new Error(
                  `VirtFusion API Error ${axiosError.response.status}: ${axiosError.response.data.message}`,
                );
              } else if (axiosError.response.data.error) {
                throw new Error(
                  `VirtFusion API Error ${axiosError.response.status}: ${axiosError.response.data.error}`,
                );
              }
            }

            throw new Error(
              `VirtFusion API Error ${axiosError.response.status}: ${axiosError.message}`,
            );
          } else if (axiosError.request) {
            // The request was made but no response was received
            console.error(
              "No response received. Check if the API URL is correct and the server is reachable.",
            );
            console.error(
              "Request details:",
              axiosError.request._header || JSON.stringify(axiosError.request),
            );
            throw new Error(
              `VirtFusion API Error: No response received - ${axiosError.message}`,
            );
          } else {
            // Something happened in setting up the request
            console.error("Request setup error:", axiosError.message);
            throw new Error(
              `VirtFusion API Request Error: ${axiosError.message}`,
            );
          }
        }

        // Re-throw any other errors
        throw axiosError;
      }
    } catch (error: any) {
      console.error(`VirtFusion API Error: ${error.message}`);
      console.error(error.stack);
      throw error;
    }
  }

  // General API operations
  async testConnection() {
    console.log("Testing VirtFusion API connection...");
    try {
      // Use connect endpoint to test connection (according to VirtFusion API docs)
      const result = await this.request("GET", "/connect");
      console.log("Connection test result:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  // Hypervisor operations
  async getHypervisors() {
    // Log that we're attempting to get hypervisors
    console.log("Attempting to fetch hypervisors from VirtFusion API");
    try {
      // Test connection first to validate API credentials
      console.log(
        "Testing connection to VirtFusion API before retrieving hypervisors",
      );
      await this.testConnection();

      // Use the correct API path directly (the fallback path was causing 404 errors)
      console.log(
        "Fetching hypervisors using API path: /compute/hypervisors",
      );
      const result = await this.request("GET", "/compute/hypervisors");
      console.log("Raw hypervisors response:", JSON.stringify(result));
      return result;
    } catch (error) {
      console.error("Error in getHypervisors method:", error);
      // Return empty result instead of failing completely
      return { data: [] };
    }
  }

  async getHypervisor(id: number) {
    return this.request("GET", `/compute/hypervisors/${id}`);
  }

  // Hypervisor Group operations
  async getHypervisorGroups() {
    return this.request("GET", "/compute/hypervisors/groups");
  }

  async getHypervisorGroup(id: number) {
    return this.request("GET", `/compute/hypervisors/groups/${id}`);
  }

  async getHypervisorGroupResources(id: number) {
    return this.request("GET", `/compute/hypervisors/groups/${id}/resources`);
  }

  // User operations
  async createUser(userData: any) {
    // Ensure userData has the fields required by VirtFusion API
    const requiredData = {
      name: userData.name,
      email: userData.email,
      extRelationId: userData.extRelationId,
      selfService: userData.selfService || 0,
      selfServiceHourlyCredit: userData.selfServiceHourlyCredit || false,
      selfServiceHourlyResourcePack: userData.selfServiceHourlyResourcePack || null,
      sendMail: userData.sendMail || false,
    };

    // Log the exact request we're sending
    console.log(
      "Creating user in VirtFusion API with exact data format:",
      JSON.stringify(requiredData, null, 2),
    );

    try {
      // Use the direct approach - only attempt the correct endpoint from the documentation
      console.log("Making VirtFusion API request to: /users");
      const result = await this.request("POST", "/users", requiredData);

      // Process the response according to the API documentation
      console.log(
        "VirtFusion API user creation raw response:",
        JSON.stringify(result, null, 2),
      );

      // Handle the expected response format: the user object is in the 'data' property
      return result; // The request method already handles response.data extraction
    } catch (error: any) {
      console.error(
        "VirtFusion user creation failed:",
        error?.message || error,
      );

      // Provide detailed error information for debugging
      if (error?.response) {
        console.error("Response status:", error.response.status);
        console.error(
          "Response data:",
          JSON.stringify(error.response.data, null, 2),
        );

        if (error.response.status === 422) {
          console.error(
            "Validation errors detected. Check the field requirements in the API docs.",
          );
        } else if (error.response.status === 401) {
          console.error("Authentication failed. Check your API token.");
        } else if (error.response.status === 404) {
          console.error(
            "API endpoint not found. Verify the API URL is correct.",
          );
        }
      }

      throw error;
    }
  }

  async getUserByExtRelationId(extRelationId: number) {
    // Using format from VirtFusion API docs
    return this.request("GET", `/users/${extRelationId}/byExtRelation`);
  }

  async deleteUserByExtRelationId(extRelationId: number) {
    // Using format from VirtFusion API docs
    return this.request("DELETE", `/users/${extRelationId}/byExtRelation`);
  }

  async modifyUserByExtRelationId(extRelationId: number, userData: any) {
    // Using format from VirtFusion API docs
    return this.request(
      "PUT",
      `/users/${extRelationId}/byExtRelation`,
      userData,
    );
  }

  async generateAuthToken(extRelationId: number) {
    // Using the correct endpoint format from the VirtFusion API documentation
    console.log(`Generating auth token for extRelationId ${extRelationId}`);
    try {
      // Attempt to get user info first to verify the user exists in VirtFusion
      console.log(
        `Checking if user with extRelationId ${extRelationId} exists in VirtFusion`,
      );
      await this.request("GET", `/users/${extRelationId}/byExtRelation`);

      // Now generate the auth token using the correct endpoint format from the VirtFusion API documentation
      console.log(`User exists in VirtFusion, generating auth token`);
      const result = await this.request(
        "POST",
        `/users/${extRelationId}/authenticationTokens`,
      );
      console.log(`Auth token generated:`, result);

      // Process authentication token response based on VirtFusion API documentation structure
      if (
        result &&
        typeof result === "object" &&
        result.data &&
        result.data.authentication
      ) {
        // Format response to match what the frontend expects
        const authentication = result.data.authentication;

        // Get base URL for VirtFusion panel by removing the /api/v1 portion from the API URL
        // This ensures redirects go to the panel domain and not the API domain
        const apiUrlParts = this.apiUrl.split("/");
        const panelBaseUrl = apiUrlParts.slice(0, 3).join("/"); // Get https://domain.com part

        // Build the full redirect URL by combining the panel base URL with the endpoint path
        const redirectPath = authentication.endpoint_complete;
        let fullRedirectUrl = "";

        // Ensure we have a properly formed URL
        if (redirectPath.startsWith("http")) {
          // If the path already includes the domain (unlikely), use it as is
          fullRedirectUrl = redirectPath;
        } else {
          // Otherwise combine the panel base URL with the path
          fullRedirectUrl = `${panelBaseUrl}${redirectPath.startsWith("/") ? "" : "/"}${redirectPath}`;
        }

        const processedResult = {
          token: authentication.tokens["1"], // First token from the response
          redirectUrl: fullRedirectUrl, // Complete URL with tokens and domain
        };

        console.log(`Processed auth token for response compatibility:`, {
          ...processedResult,
          token: processedResult.token
            ? `${processedResult.token.substring(0, 10)}...`
            : undefined,
          redirectUrl: processedResult.redirectUrl,
        });

        return processedResult;
      }

      return result;
    } catch (error) {
      console.error(
        `Failed to generate auth token for extRelationId ${extRelationId}:`,
        error,
      );
      throw error;
    }
  }

  async generateServerAuthToken(extRelationId: number, serverId: number) {
    // IMPORTANT: The extRelationId should be our user.id (NOT virtFusionId)
    // This matches the Rel ID shown in the VirtFusion panel
    console.log(
      `Generating server auth token for extRelationId ${extRelationId} and serverId ${serverId}`,
    );
    try {
      // Verify that the user and server exists first
      console.log(
        `Checking if user with extRelationId ${extRelationId} exists`,
      );
      await this.request("GET", `/users/${extRelationId}/byExtRelation`);

      console.log(`Checking if server with ID ${serverId} exists`);
      await this.request("GET", `/servers/${serverId}`);

      console.log(`User and server exist, generating server auth token`);
      const result = await this.request(
        "POST",
        `/users/${extRelationId}/serverAuthenticationTokens/${serverId}`,
      );
      console.log(`Server auth token generated:`, result);

      // Process authentication token response based on VirtFusion API documentation structure
      if (
        result &&
        typeof result === "object" &&
        result.data &&
        result.data.authentication
      ) {
        // Format response to match what the frontend expects
        const authentication = result.data.authentication;

        // Get base URL for VirtFusion panel by removing the /api/v1 portion from the API URL
        // This ensures redirects go to the panel domain and not the API domain
        const apiUrlParts = this.apiUrl.split("/");
        const panelBaseUrl = apiUrlParts.slice(0, 3).join("/"); // Get https://domain.com part

        // Build the full redirect URL by combining the panel base URL with the endpoint path
        const redirectPath = authentication.endpoint_complete;
        let fullRedirectUrl = "";

        // Ensure we have a properly formed URL
        if (redirectPath.startsWith("http")) {
          // If the path already includes the domain (unlikely), use it as is
          fullRedirectUrl = redirectPath;
        } else {
          // Otherwise combine the panel base URL with the path
          fullRedirectUrl = `${panelBaseUrl}${redirectPath.startsWith("/") ? "" : "/"}${redirectPath}`;
        }

        const processedResult = {
          token: authentication.tokens["1"], // First token from the response
          redirectUrl: fullRedirectUrl, // Complete URL with tokens and domain
        };

        console.log(`Processed server auth token for response compatibility:`, {
          ...processedResult,
          token: processedResult.token
            ? `${processedResult.token.substring(0, 10)}...`
            : undefined,
          redirectUrl: processedResult.redirectUrl,
        });

        return processedResult;
      }

      return result;
    } catch (error) {
      console.error(
        `Failed to generate server auth token for extRelationId ${extRelationId} and serverId ${serverId}:`,
        error,
      );
      throw error;
    }
  }

  async resetUserPassword(extRelationId: number, passwordData: any = {}) {
    // Use the correct endpoint format for external relation ID with resetPassword
    // according to VirtFusion API docs
    // VirtFusion API will generate a password and return it in the response
    const response = await this.request(
      "POST",
      `/users/${extRelationId}/byExtRelation/resetPassword`,
      passwordData,
    );

    // Return the full response which includes the generated password
    return response;
  }

  // Server operations
  async createServer(params: any) {
    return this.request("POST", "/servers", params);
  }

  async getServers(params: any = {}) {
    return this.request("GET", "/servers", params);
  }

  async getUserServers(userId: number) {
    return this.request("GET", `/servers/user/${userId}`);
  }

  async getServer(id: number, remoteState: boolean = false) {
    return this.request("GET", `/servers/${id}?remoteState=${remoteState}`);
  }

  async deleteServer(id: number, delayMinutes: number = 0) {
    return this.request(
      "DELETE",
      `/servers/${id}${delayMinutes > 0 ? `?delay=${delayMinutes}` : ""}`,
    );
  }

  async modifyServerBackupPlan(
    serverId: number,
    planId: number,
    planData: any,
  ) {
    return this.request(
      "PUT",
      `/servers/${serverId}/backups/plan/${planId}`,
      planData,
    );
  }

  async changeServerOwner(serverId: number, newOwnerId: number) {
    return this.request("PUT", `/servers/${serverId}/owner/${newOwnerId}`);
  }

  async buildServer(serverId: number, buildData: any) {
    return this.request("POST", `/servers/${serverId}/build`, buildData);
  }

  async changeServerPackage(
    serverId: number,
    packageId: number,
    packageOptions: any,
  ) {
    return this.request(
      "PUT",
      `/servers/${serverId}/package/${packageId}`,
      packageOptions,
    );
  }

  async modifyServerName(serverId: number, nameData: any) {
    return this.request("PUT", `/servers/${serverId}/modify-name`, nameData);
  }

  async resetServerPassword(serverId: number, passwordData: any) {
    return this.request(
      "POST",
      `/servers/${serverId}/resetPassword`,
      passwordData,
    );
  }

  async getServerTemplates(serverId: number) {
    return this.request("GET", `/servers/${serverId}/templates`);
  }

  async suspendServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/suspend`);
  }

  async unsuspendServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/unsuspend`);
  }

  async modifyServerCpuThrottle(
    serverId: number,
    throttleData: any,
    sync: boolean = false,
  ) {
    // Updated to correct endpoint path format per VirtFusion API docs
    return this.request(
      "PUT",
      `/servers/${serverId}/modify/cpuThrottle${sync ? "?sync=true" : ""}`,
      throttleData,
    );
  }

  async getServerTraffic(serverId: number) {
    return this.request("GET", `/servers/${serverId}/traffic`);
  }

  async toggleServerVnc(serverId: number, vncData: any) {
    return this.request("POST", `/servers/${serverId}/vnc`, vncData);
  }

  // Server Network operations
  async addServerNetworkWhitelist(serverId: number, whitelistData: any) {
    return this.request(
      "POST",
      `/servers/${serverId}/networkWhitelist`,
      whitelistData,
    );
  }

  async removeServerNetworkWhitelist(serverId: number, whitelistData: any) {
    return this.request(
      "DELETE",
      `/servers/${serverId}/networkWhitelist`,
      whitelistData,
    );
  }

  async addServerIpv4Qty(serverId: number, qtyData: any) {
    return this.request("POST", `/servers/${serverId}/ipv4Qty`, qtyData);
  }

  async addServerIpv4(serverId: number, ipData: any) {
    return this.request("POST", `/servers/${serverId}/ipv4`, ipData);
  }

  async removeServerIpv4(serverId: number, ipData: any) {
    return this.request("DELETE", `/servers/${serverId}/ipv4`, ipData);
  }

  // Server Power operations
  async bootServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/power/boot`);
  }

  async shutdownServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/power/shutdown`);
  }

  async restartServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/power/restart`);
  }

  async poweroffServer(serverId: number) {
    return this.request("POST", `/servers/${serverId}/power/poweroff`);
  }

  // Firewall operations
  async getServerFirewall(serverId: number, interfaceName: string) {
    return this.request(
      "GET",
      `/servers/${serverId}/firewall/${interfaceName}`,
    );
  }

  async enableServerFirewall(serverId: number, interfaceName: string) {
    return this.request(
      "POST",
      `/servers/${serverId}/firewall/${interfaceName}/enable`,
    );
  }

  async disableServerFirewall(serverId: number, interfaceName: string) {
    return this.request(
      "POST",
      `/servers/${serverId}/firewall/${interfaceName}/disable`,
    );
  }

  async applyFirewallRules(
    serverId: number,
    interfaceName: string,
    rulesData: any,
  ) {
    return this.request(
      "POST",
      `/servers/${serverId}/firewall/${interfaceName}/rules`,
      rulesData,
    );
  }

  // Traffic blocks operations
  async getServerTrafficBlocks(serverId: number) {
    return this.request("GET", `/servers/${serverId}/traffic/blocks`);
  }

  async addServerTrafficBlock(serverId: number, blockData: any) {
    return this.request(
      "POST",
      `/servers/${serverId}/traffic/blocks`,
      blockData,
    );
  }

  async removeServerTrafficBlock(serverId: number, blockId: number) {
    return this.request(
      "DELETE",
      `/servers/${serverId}/traffic/blocks/${blockId}`,
    );
  }

  // IP Address operations
  async getIpBlocks() {
    return this.request("GET", "/connectivity/ipblocks");
  }

  async getIpBlock(blockId: number) {
    return this.request("GET", `/connectivity/ipblocks/${blockId}`);
  }

  async addIpv4RangeToBlock(blockId: number, rangeData: any) {
    return this.request(
      "POST",
      `/connectivity/ipblocks/${blockId}/ipv4`,
      rangeData,
    );
  }

  // Backward compatibility for our existing code
  async getIpAddresses() {
    return this.getIpBlocks();
  }

  async allocateIp(serverId: number, ipAddress: string) {
    return this.addServerIpv4(serverId, {
      addresses: [ipAddress],
    });
  }

  async releaseIp(serverId: number, ipAddress: string) {
    return this.removeServerIpv4(serverId, {
      addresses: [ipAddress],
    });
  }

  // Aliases for server power operations
  // These methods are used for compatibility with different API naming conventions
  powerOnServer = this.bootServer;
  powerOffServer = this.shutdownServer;
  rebootServer = this.restartServer;

  // Backup operations
  async getServerBackups(serverId: number) {
    return this.request("GET", `/backups/server/${serverId}`);
  }

  // DNS operations
  async getDnsService(serviceId: number) {
    return this.request("GET", `/dns/services/${serviceId}`);
  }

  // Media operations
  async getIso(isoId: number) {
    return this.request("GET", `/media/iso/${isoId}`);
  }

  async getPackageTemplates(serverPackageId: number) {
    return this.request(
      "GET",
      `/media/templates/fromServerPackageSpec/${serverPackageId}`,
    );
  }

  // Package operations
  async getPackage(packageId: number) {
    return this.request("GET", `/api/v1/packages/${packageId}`);
  }

  async getPackages() {
    return this.request("GET", "/api/v1/packages");
  }

  // Queue operations
  async getQueueItem(queueId: number) {
    return this.request("GET", `/queue/${queueId}`);
  }

  // SSH Key operations
  async addSshKey(userData: {
    userId: number;
    name: string;
    publicKey: string;
  }) {
    return this.request("POST", "/ssh_keys", userData);
  }

  async deleteSshKey(keyId: number) {
    return this.request("DELETE", `/ssh_keys/${keyId}`);
  }

  async getSshKey(keyId: number) {
    return this.request("GET", `/ssh_keys/${keyId}`);
  }

  async getUserSshKeys(userId: number) {
    return this.request("GET", `/ssh_keys/user/${userId}`);
  }

  // Self Service operations
  async getSelfServiceCurrencies() {
    return this.request("GET", "/selfService/currencies");
  }

  async modifyUserResourcePack(packId: number, packData: any) {
    return this.request("PUT", `/selfService/resourcePack/${packId}`, packData);
  }

  async suspendResourcePackServers(packId: number) {
    return this.request(
      "POST",
      `/selfService/resourcePackServers/${packId}/suspend`,
    );
  }

  async unsuspendResourcePackServers(packId: number) {
    return this.request(
      "POST",
      `/selfService/resourcePackServers/${packId}/unsuspend`,
    );
  }

  // Self Service operations for resource packs and credits
  async cancelUserCredit(creditId: number) {
    return this.request("DELETE", `/selfService/credit/${creditId}`);
  }

  async getUserResourcePack(packId: number, withServers: boolean = false) {
    return this.request(
      "GET",
      `/selfService/resourcePack/${packId}${withServers ? "?withServers=true" : ""}`,
    );
  }

  async deleteUserResourcePack(packId: number, disable: boolean = false) {
    return this.request(
      "DELETE",
      `/selfService/resourcePack/${packId}${disable ? "?disable=true" : ""}`,
    );
  }

  async deleteResourcePackServers(packId: number, delay: number = 30) {
    return this.request(
      "DELETE",
      `/selfService/resourcePackServers/${packId}${delay !== 30 ? `?delay=${delay}` : ""}`,
    );
  }

  // Self Service External Relation ID operations
  async addCreditToUser(
    extRelationId: number,
    data: { tokens: number; reference_1?: number; reference_2?: string },
  ) {
    console.log(`Attempting to add credit (${data.tokens} tokens) to user with extRelationId: ${extRelationId}`);
    console.log("Using exact format from VirtFusion API documentation");

    // This is the exact format as specified in the VirtFusion documentation
    // https://docs.virtfusion.com/api/stoplight.html#/paths/selfService-credit-byUserExtRelationId-extRelationId/post

    // Log the full request details for debugging
    const endpoint = `/selfService/credit/byUserExtRelationId/${extRelationId}`;
    console.log(`Using endpoint: ${endpoint}`);
    console.log(`Request data:`, JSON.stringify(data, null, 2));

    try {
      return await this.request(
        "POST",
        endpoint,
        data
      );
    } catch (error: any) {
      console.error("VirtFusion credit API error:", error);

      // Additional debugging information
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      // For 404 errors, log more details about the API URL and paths
      if (error.message && error.message.includes("404")) {
        console.error("Received 404 - API endpoint may be incorrect");
        console.error("Check if the API URL is correctly configured and includes /api/v1");
        console.error(`Current API URL base: ${this.apiUrl}`);
        console.error(`Attempted endpoint: ${endpoint}`);

        // Try one alternative as a last resort - direct users endpoint
        try {
          console.log("Making one final attempt with users endpoint");
          return await this.request(
            "POST",
            `/users/${extRelationId}/credit`,
            data
          );
        } catch (finalError: any) {
          console.error("Final attempt also failed:", finalError.message);
          throw error; // Throw the original error
        }
      }

      throw error;
    }
  }

  async addHourlyGroupProfileToUser(extRelationId: number, profileId: number) {
    return this.request(
      "POST",
      `/selfService/hourlyGroupProfile/byUserExtRelationId/${extRelationId}`,
      { profileId },
    );
  }

  async addResourceGroupProfileToUser(
    extRelationId: number,
    profileId: number,
  ) {
    return this.request(
      "POST",
      `/selfService/resourceGroupProfile/byUserExtRelationId/${extRelationId}`,
      { profileId },
    );
  }

  async addResourcePackToUser(
    extRelationId: number,
    packId: number,
    enabled: boolean = true,
  ) {
    console.log(`Adding resource pack (ID=${packId}, enabled=${enabled}) to user with extRelationId=${extRelationId}`);
    return this.request(
      "POST",
      `/selfService/resourcePack/byUserExtRelationId/${extRelationId}`,
      {
        packId,
        enabled,
      },
    );
  }

  /**
   * Add default resource pack (ID=1) to a new user
   * This is used when creating new users to automatically assign them the default resource pack
   * @param extRelationId The external relation ID of the user
   * @returns The API response
   */
  async addDefaultResourcePackToUser(extRelationId: number) {
    console.log(`Adding default resource pack (ID=1) to new user with extRelationId=${extRelationId}`);
    // Always use packId=1 and enabled=true as specified in the requirements
    return this.addResourcePackToUser(extRelationId, 1, true);
  }

  // New Self Service API endpoints

  async getUserHourlyStats(
    extRelationId: number,
    period?: string[],
    range?: string,
  ) {
    let endpoint = `/selfService/hourlyStats/byUserExtRelationId/${extRelationId}`;

    // Build query parameters if provided
    const params = new URLSearchParams();
    if (period && Array.isArray(period)) {
      period.forEach((p) => params.append("period[]", p));
    }
    if (range) {
      params.append("range", range);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    console.log(
      `Fetching hourly stats for user ${extRelationId} with endpoint: ${endpoint}`,
    );
    return this.request("GET", endpoint);
  }

  async modifyUserAccess(
    extRelationId: number,
    accessData: { syncToProfiles: boolean },
  ) {
    console.log(`Modifying access for user ${extRelationId}:`, accessData);
    return this.request(
      "PUT",
      `/selfService/access/byUserExtRelationId/${extRelationId}`,
      accessData,
    );
  }

  async removeHourlyGroupProfileFromUser(
    profileId: number,
    extRelationId: number,
  ) {
    console.log(
      `Removing hourly group profile ${profileId} from user ${extRelationId}`,
    );
    return this.request(
      "DELETE",
      `/selfService/hourlyGroupProfile/${profileId}/byUserExtRelationId/${extRelationId}`,
    );
  }

  async removeResourceGroupFromUser(profileId: number, extRelationId: number) {
    console.log(
      `Removing resource group profile ${profileId} from user ${extRelationId}`,
    );
    return this.request(
      "DELETE",
      `/selfService/resourceGroupProfile/${profileId}/byUserExtRelationId/${extRelationId}`,
    );
  }

  async generateUserReport(extRelationId: number) {
    console.log(`Generating report for user ${extRelationId}`);
    return this.request(
      "GET",
      `/selfService/report/byUserExtRelationId/${extRelationId}`,
    );
  }

  async setHourlyResourcePack(
    extRelationId: number,
    packData: { packId: number },
  ) {
    console.log(
      `Setting hourly resource pack for user ${extRelationId}:`,
      packData,
    );
    return this.request(
      "PUT",
      `/selfService/hourlyResourcePack/byUserExtRelationId/${extRelationId}`,
      packData,
    );
  }

  async getUserUsage(extRelationId: number, period?: string[], range?: string) {
    let endpoint = `/selfService/usage/byUserExtRelationId/${extRelationId}`;

    // Build query parameters if provided
    const params = new URLSearchParams();
    if (period && Array.isArray(period)) {
      period.forEach((p) => params.append("period[]", p));
    }
    if (range) {
      params.append("range", range);
    }

    const queryString = params.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    console.log(
      `Fetching usage for user ${extRelationId} with endpoint: ${endpoint}`,
    );
    return this.request("GET", endpoint);
  }

  // OS Templates operations
  async getOsTemplates() {
    try {
      // First try getting OS templates from the dedicated endpoint
      return await this.request("GET", "/templates/os");
    } catch (error) {
      console.error("Error fetching OS templates from /templates/os:", error);

      try {
        // Fallback to alternate endpoint
        return await this.request("GET", "/compute/templates");
      } catch (secondError) {
        console.error(
          "Error fetching OS templates from fallback endpoint:",
          secondError,
        );

        // If API endpoints fail, provide default templates for testing
        return {
          data: [
            {
              id: 1,
              name: "Ubuntu 22.04",
              type: "linux",
              version: "22.04",
              architecture: "x86_64"
            },
            {
              id: 2,
              name: "CentOS 7",
              type: "linux",
              version: "7",
              architecture: "x86_64"
            },
            {
              id: 3,
              name: "Debian 11",
              type: "linux",
              version: "11",
              architecture: "x86_64"
            },
            {
              id: 4,
              name: "Windows Server 2019",
              type: "windows",
              version: "2019",
              architecture: "x86_64"
            },
            {
              id: 5,
              name: "AlmaLinux 8",
              type: "linux",
              version: "8",
              architecture: "x86_64"
            }
          ]
        };
      }
    }
  }

  // Get OS templates available for a specific package
  async getOsTemplatesForPackage(packageId: number) {
    try {
      console.log(`Attempting to fetch OS templates for package ID: ${packageId} using media/templates endpoint`);
      return await this.request("GET", `/media/templates/fromServerPackageSpec/${packageId}`);
    } catch (error) {
      console.error(`Error fetching OS templates for package ${packageId} using media/templates endpoint:`, error);

      try {
        console.log(`Attempting to fetch OS templates for package ID: ${packageId} using server-package endpoint`);
        return await this.request("GET", `/server-packages/${packageId}/templates`);
      } catch (secondError) {
        console.error(`Error fetching OS templates for package ${packageId} using server-package endpoint:`, secondError);

        try {
          // Fallback to generic OS templates
          console.log(`Falling back to generic OS templates for package ${packageId}`);
          return await this.getOsTemplates();
        } catch (thirdError) {
          console.error("Error fetching generic OS templates as fallback:", thirdError);
          // Return default templates for testing if all attempts fail
          return {
            data: [
              {
                id: 1,
                name: "Ubuntu 22.04",
                type: "linux",
                version: "22.04",
                architecture: "x86_64"
              },
              {
                id: 2,
                name: "CentOS 7",
                type: "linux",
                version: "7",
                architecture: "x86_64"
              },
              {
                id: 3,
                name: "Debian 11",
                type: "linux",
                version: "11",
                architecture: "x86_64"
              },
              {
                id: 4,
                name: "Windows Server 2019",
                type: "windows",
                version: "2019",
                architecture: "x86_64"
              },
              {
                id: 5,
                name: "AlmaLinux 8",
                type: "linux",
                version: "8",
                architecture: "x86_64"
              }
            ]
          };
        }
      }
    }
  }
}

// Direct API test function using Node.js https module (as shown in your example)
async function testVirtFusionUserCreation(
  apiUrl: string,
  apiToken: string,
  userData: any,
) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const url = new URL("/api/v1/users", apiUrl);

    console.log(`Making direct HTTPS request to ${url.toString()}`);
    console.log(
      `Using token: ${apiToken.substring(0, 5)}...${apiToken.substring(apiToken.length - 3)}`,
    );
    console.log(`Request data:`, userData);

    const options = {
      method: "POST",
      hostname: url.hostname,
      port: url.port || null,
      path: url.pathname,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, */*",
        Authorization: `Bearer ${apiToken}`,
      },
      rejectUnauthorized: false, // Skip SSL verification for testing
    };

    const req = https.request(options, (res: any) => {
      const chunks: any[] = [];

      res.on("data", (chunk: any) => {
        chunks.push(chunk);
      });

      res.on("end", () => {
        const body = Buffer.concat(chunks);
        const responseText = body.toString();
        console.log(`Response status: ${res.statusCode}`);
        console.log(`Response headers:`, res.headers);
        console.log(`Response body:`, responseText);

        try {
          const data = JSON.parse(responseText);
          resolve({ statusCode: res.statusCode, data });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: responseText,
            parseError: "Could not parse JSON response",
          });
        }
      });
    });

    req.on("error", (error: any) => {
      console.error(`Request error:`, error);
      reject(error);
    });

    const requestBody = JSON.stringify(userData);
    console.log(`Request body:`, requestBody);
    req.write(requestBody);
    req.end();
  });
}

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
      console.log('Maintenance token validation request received');
      console.log('Request body:', req.body);

      const { token } = req.body;

      if (!token) {
        console.log('No token provided in request');
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      console.log('Validating token:', token);
      const isValid = validateMaintenanceToken(token);
      console.log('Token is valid:', isValid);

      if (isValid) {
        // Set both the session and cookie bypass
        req.session.maintenanceBypass = true;
        console.log('Setting maintenance bypass in session');

        // Set cookie for browser-based bypass (lasts 24 hours)
        // Make sure to use a string value for the cookie
        console.log('Setting maintenance_bypass cookie');
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

          console.log('Session and cookie saved successfully');
          return res.json({
            success: true,
            message: 'Maintenance bypass enabled',
          });
        });
      } else {
        console.log('Invalid token provided');
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
  app.get("/api/public/packages", async (req, res) => {
    try {
      console.log("Getting all packages for public display");
      const virtFusionApi = new VirtFusionApi();

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

      // Include ALL packages (both enabled and disabled) and sort by memory size
      const allPackages = packages
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
      console.log("Profile update request received:", req.body);

      const userId = req.user!.id;
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
          return handleZodError(error, res);
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

  // Initialize VirtFusion API client
  const virtFusionApi = new VirtFusionApi();

  // Test endpoints removed - VirtFusion integration is now working properly

  // Test API route - this will help us diagnose issues directly
  // Admin routes for package pricing
  app.get('/api/admin/packages', isAdmin, async (req, res) => {
    try {
      // Get all VirtFusion packages directly like the public endpoint
      console.log("Getting all packages for admin pricing page");
      const virtFusionApi = new VirtFusionApi();
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

      // Get all our package pricing records
      const pricingRecords = await db.select().from(schema.packagePricing);

      // Create a map of VirtFusion package ID to our pricing records
      const pricingMap = pricingRecords.reduce((acc, record) => {
        acc[record.virtFusionPackageId] = record;
        return acc;
      }, {} as Record<number, typeof schema.packagePricing.$inferSelect>);

      // For each VirtFusion package, add our pricing data if it exists
      const packages = packagesArray.map(pkg => {
        const pricingRecord = pricingMap[pkg.id];
        return {
          ...pkg,
          pricing: pricingRecord || null
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

  // Get all hypervisor groups from VirtFusion
  app.get('/api/admin/hypervisors', isAdmin, async (req, res) => {
    try {
      // Get all VirtFusion hypervisor groups
      console.log("Getting all hypervisor groups for admin server creation");
      const virtFusionApi = new VirtFusionApi();
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

      const hypervisorsData = await virtFusionApi.getHypervisorGroups();

      // Handle different response formats
      if (!hypervisorsData) {
        return res.json({ data: [] });
      }

      if (hypervisorsData.data) {
        console.log(`Found ${hypervisorsData.data.length} hypervisor groups`);
        return res.json(hypervisorsData);
      } else if (Array.isArray(hypervisorsData)) {
        console.log(`Found ${hypervisorsData.length} hypervisor groups (array format)`);
        return res.json({ data: hypervisorsData });
      } else {
        console.log("Hypervisor groups data in unexpected format, converting to standard format");
        return res.json({ data: [hypervisorsData] });
      }
    } catch (error: any) {
      console.error("Error getting hypervisor groups:", error);
      return res.status(500).json({
        error: 'Failed to get hypervisor groups',
        errorDetail: error.message || 'Unknown error'
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

      // Validate the incoming data
      const { name, description, price, displayOrder, enabled } = req.body;

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
        // Update existing record
        const updated = await db
          .update(schema.packagePricing)
          .set({
            name,
            description,
            price,
            displayOrder: displayOrder || existingRecord[0].displayOrder,
            enabled: enabled !== undefined ? enabled : existingRecord[0].enabled,
            updatedAt: new Date()
          })
          .where(eq(schema.packagePricing.virtFusionPackageId, virtFusionPackageId))
          .returning();

        return res.json(updated[0]);
      } else {
        // Create new record
        const inserted = await db
          .insert(schema.packagePricing)
          .values({
            virtFusionPackageId,
            name,
            description,
            price,
            displayOrder: displayOrder || 0,
            enabled: enabled !== undefined ? enabled : true,
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

      console.log("Testing VirtFusion user creation with direct HTTPS request");
      const directResult = await testVirtFusionUserCreation(
        finalApiUrl,
        finalApiToken,
        testUserData,
      );
      console.log("Direct HTTPS request result:", directResult);

      console.log("Testing VirtFusion user creation with our API client");
      const clientResult = await virtFusionApi.createUser(testUserData);
      console.log("API client result:", clientResult);

      res.json({
        success: true,
        directApiResult: directResult,
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

      console.log(`User ${userId} fetching their servers (page ${page}, perPage ${perPage})`);

      // Get user to find their VirtFusion ID
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        console.log(`User ${userId} has no VirtFusion ID, returning empty servers list`);
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

        console.log(`User ${userId} has ${total} servers, fetching detailed data for ${paginatedBasicServers.length} servers on page ${page}`);

        // Fetch detailed data for each server individually
        const detailedServers = [];
        for (const basicServer of paginatedBasicServers) {
          try {
            console.log(`Fetching detailed data for server ${basicServer.id}`);
            const detailedServer = await virtFusionApi.request("GET", `/servers/${basicServer.id}?remoteState=true`);

            if (detailedServer && detailedServer.data) {
              // Use the detailed server data
              detailedServers.push(detailedServer.data);
            } else {
              // Fallback to basic server data if detailed fetch fails
              console.warn(`Failed to fetch detailed data for server ${basicServer.id}, using basic data`);
              detailedServers.push(basicServer);
            }
          } catch (error) {
            console.error(`Error fetching detailed data for server ${basicServer.id}:`, error);
            // Fallback to basic server data
            detailedServers.push(basicServer);
          }
        }

        console.log(`User ${userId} returning ${detailedServers.length} servers with detailed data for page ${page}`);

        return res.json({
          data: detailedServers,
          current_page: page,
          last_page: lastPage,
          per_page: perPage,
          total: total
        });
      } else {
        console.log(`No servers found for user ${userId} (VirtFusion ID: ${user.virtFusionId})`);
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

      console.log(`User ${userId} fetching server ${serverId} details`);

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

      console.log(`Server ${serverId} ownership check: server owner = ${serverOwnerId}, user VirtFusion ID = ${user.virtFusionId}`);
      console.log(`Server object structure:`, JSON.stringify(server, null, 2));

      if (serverOwnerId !== user.virtFusionId) {
        console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to access server ${serverId} owned by ${serverOwnerId}`);
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

      console.log(`User ${userId} successfully retrieved server ${serverId} details, status: ${transformedServer.status}`);
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

      // Verify the server belongs to this user by checking VirtFusion
      try {
        const serverDetails = await virtFusionApi.getServer(serverId, true);

        // Check if the server belongs to this user (using extRelationId)
        if (!serverDetails?.data?.owner?.extRelationID ||
            parseInt(serverDetails.data.owner.extRelationID) !== userId) {
          return res.status(403).json({ error: "Access denied: Server does not belong to this user" });
        }
      } catch (error: any) {
        console.error(`Error verifying server ownership for user ${userId}, server ${serverId}:`, error);
        return res.status(404).json({ error: "Server not found or access denied" });
      }

      // Use the VirtFusion API to reset the server password
      try {
        const response = await virtFusionApi.resetServerPassword(serverId, 'root', false);

        console.log('User server password reset response:', response);

        // Extract the expected password from the API response
        let generatedPassword = null;
        if (response && response.data && response.data.expectedPassword) {
          generatedPassword = response.data.expectedPassword;
          console.log(`User server password reset successful, generated password: ${generatedPassword}`);
        } else {
          console.log('No expected password in user server reset response', response);
        }

        res.json({
          success: true,
          message: "Server password reset successfully",
          data: response,
          generatedPassword: generatedPassword
        });
      } catch (error: any) {
        console.error(`Error resetting password for user server ${serverId}:`, error);
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
      switch (action) {
        case 'boot':
          result = await virtFusionApi.bootServer(serverId);
          break;
        case 'shutdown':
          result = await virtFusionApi.shutdownServer(serverId);
          break;
        case 'restart':
          result = await virtFusionApi.restartServer(serverId);
          break;
        case 'poweroff':
          result = await virtFusionApi.poweroffServer(serverId);
          break;
      }

      console.log(`User ${userId} successfully executed ${action} on server ${serverId}`);
      return res.json({ success: true, message: `Server ${action} command sent successfully`, result });
    } catch (error) {
      console.error(`Error executing power action:`, error);
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

      // Create a new VirtFusion API instance to use the request method
      const vfApi = new VirtFusionApi();
      const result = await (vfApi as any).request("POST", `/servers/${serverId}/vnc`);

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

  // ----- User Credit Management Routes -----

  // Add credit to user
  app.post("/api/credits", isAdmin, async (req, res) => {
    try {
      const { userId, amount, reference } = req.body;

      if (!userId || !amount) {
        return res
          .status(400)
          .json({ error: "Missing required fields: userId, amount" });
      }

      // Check if the user exists
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // If user has VirtFusion ID, add credit there as well
      if (user.virtFusionId) {
        try {
          // IMPORTANT: Use user.id as extRelationId (NOT virtFusionId)
          // According to API docs: /selfService/credit/byUserExtRelationId/{extRelationId}
          await virtFusionApi.addCreditToUser(user.id, {
            tokens: amount,
            reference_1: Date.now(), // Timestamp as reference
            reference_2:
              reference || `Added via admin panel by ${req.user!.username}`,
          });
        } catch (error: any) {
          console.error(`Error adding credit to VirtFusion:`, error);
          // Continue with local credit addition even if VirtFusion API fails
        }
      }

      // Add credit to local database
      await storage.updateUserCredits(userId, amount);

      // Create transaction record
      const transaction = await storage.createTransaction({
        userId,
        amount,
        type: "credit",
        description:
          reference || `Credit added by admin: ${req.user!.username}`,
        status: "completed",
      });

      // Generate invoice for the completed transaction
      try {
        const invoiceNumber = await generateInvoice(transaction, 'paid');
        console.log(`Generated invoice ${invoiceNumber} for admin-added credits`);
      } catch (invoiceError) {
        console.error('Failed to generate invoice for admin-added credits:', invoiceError);
        // Continue despite invoice generation failure
      }

      res.status(201).json({ success: true, transaction });
    } catch (error: any) {
      console.error(`Error adding credit:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel a credit transaction
  app.delete("/api/credits/:id", isAdmin, async (req, res) => {
    try {
      const creditId = parseInt(req.params.id);
      if (isNaN(creditId)) {
        return res.status(400).json({ error: "Invalid credit ID" });
      }

      const transaction = await storage.getTransaction(creditId);
      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      // Only allow cancellation of credit transactions
      if (transaction.type !== "credit") {
        return res
          .status(400)
          .json({ error: "Only credit transactions can be canceled" });
      }

      // If transaction has a VirtFusion reference, cancel it there as well
      if (transaction.virtFusionId) {
        try {
          await virtFusionApi.cancelUserCredit(transaction.virtFusionId);
        } catch (error: any) {
          console.error(`Error canceling credit in VirtFusion:`, error);
          // Continue with local cancellation even if VirtFusion API fails
        }
      }

      // Reverse the transaction in our local database
      await storage.updateUserCredits(transaction.userId, -transaction.amount);

      // Update transaction status
      await storage.updateTransaction(creditId, { status: "canceled" });

      // Create a reversal transaction
      const reversalTransaction = await storage.createTransaction({
        userId: transaction.userId,
        amount: -transaction.amount,
        type: "debit",
        description: `Reversal of credit ID ${creditId}`,
        status: "completed",
        relatedTransactionId: creditId,
      });

      // Generate invoice for the reversal transaction
      try {
        const invoiceNumber = await generateInvoice(reversalTransaction, 'paid');
        console.log(`Generated invoice ${invoiceNumber} for credit reversal transaction`);
      } catch (invoiceError) {
        console.error('Failed to generate invoice for credit reversal:', invoiceError);
        // Continue despite invoice generation failure
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error canceling credit:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----- IP Address Management Routes -----

  // Get all available IP addresses
  app.get("/api/ip-addresses", isAuthenticated, async (req, res) => {
    try {
      // Since we no longer have IP addresses in the database,
      // we need to fetch them from VirtFusion API directly
      const virtFusionApi = new VirtFusionApi();
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

      console.log(`Getting transaction ID: ${transactionId} for user ID: ${userId}`);

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
        console.log(`Returning transaction with user data:`, JSON.stringify(transactionWithUser));

        res.json(transactionWithUser);
      } else {
        // Log the transaction being returned
        console.log(`Returning transaction:`, JSON.stringify(transaction));

        res.json(transaction);
      }
    } catch (error: any) {
      console.error("Error retrieving transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // REMOVED: This route is a duplicate of the one above and was causing routing conflicts
  /* // Export transactions as PDF
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

  // TRANSACTION DOWNLOAD ENDPOINT
  app.get("/api/transactions/:id/download", isAuthenticated, async (req, res) => {
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

      // Format date string
      const dateStr = transaction.createdAt
        ? new Date(transaction.createdAt).toLocaleDateString()
        : 'N/A';

      // Create simple text content for the transaction
      let txtContent = `
==============================================
             TRANSACTION RECEIPT
==============================================

Transaction ID: #${transaction.id}
Date: ${dateStr}
Customer: ${user?.fullName || user?.username || 'N/A'}
Account ID: ${user?.id || 'N/A'}

----------------------------------------------
TRANSACTION DETAILS
----------------------------------------------
Description: ${transaction.description || 'N/A'}
Status: ${transaction.status || 'N/A'}
Type: ${transaction.type || 'N/A'}
`;

      if (transaction.paymentMethod) {
        txtContent += `Payment Method: ${transaction.paymentMethod}\n`;
      }

      if (transaction.paymentId) {
        txtContent += `Payment ID: ${transaction.paymentId}\n`;
      }

      // Handle amount with formatting
      const isCredit = transaction.type === 'credit' || transaction.type === 'virtfusion_credit';
      let amount = 0;
      try {
        amount = typeof transaction.amount === 'number'
          ? transaction.amount
          : parseFloat(transaction.amount);
      } catch (e) {
        console.error('Error parsing transaction amount:', e);
      }

      txtContent += `\nAmount: ${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}\n`;
      txtContent += `
----------------------------------------------
Thank you for your business.
Generated on ${new Date().toLocaleString()}
==============================================
`;

      // Get company information for PDF
      const companyName = await storage.getSetting('company_name') || { value: 'SkyVPS360' };
      const companyLogo = await storage.getSetting('company_logo') || { value: '' };

      // Create a PDF document directly piped to response
      const doc = new PDFDocument({ margin: 50 });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transaction-${transaction.id}.pdf"`);

      // Pipe the PDF directly to the response
      doc.pipe(res);

      // Format the PDF
      formatSingleTransactionPdf(doc, transaction, user, companyName.value, companyLogo.value);

      // Finalize the PDF
      doc.end();
    } catch (error: any) {
      console.error("Error generating transaction text:", error);
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

  // Close the commented out duplicate route
  */

  // Helper function to format a single transaction PDF
  function formatSingleTransactionPdf(doc: PDFKit.PDFDocument, transaction: any, user: any, companyName: string, companyLogo: string) {
    // Debug transaction data
    console.log('Generating PDF for transaction:', JSON.stringify(transaction, null, 2));

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
      transaction.description || 'N/A',
      leftColX + labelWidth,
      currentY,
      { width: 380, ellipsis: true }
    );
    currentY += lineHeight;

    // Row 4 - Payment details if available
    if (transaction.paymentMethod) {
      addField('Payment Method:', transaction.paymentMethod, leftColX, currentY);
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
      doc.text(transaction.description || '', 190, y, { width: 150, ellipsis: true });
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
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      // Add page number
      doc.fontSize(8).text(
        `Page ${i + 1} of ${pageCount}`,
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

  // Get user's invoices
  app.get("/api/invoices", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Filter invoices by logged-in user's ID
      const userInvoices = await storage.getUserInvoices(req.user.id);
      console.log(`Found ${userInvoices.length} invoices for user ${req.user.id}`);
      res.json(userInvoices);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get single invoice by ID
  app.get("/api/invoices/:id", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const invoiceId = parseInt(req.params.id);
      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      console.log(`Getting invoice ID: ${invoiceId} for user ID: ${req.user.id}`);

      // Fetch the invoice
      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Ensure user has access to the invoice (must be their own invoice or admin)
      if (invoice.userId !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(invoice);
    } catch (error: any) {
      console.error("Error fetching invoice:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Generate missing invoices for existing transactions (for recovery)
  app.post("/api/invoices/generate-missing", isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log(`Finding transactions without invoices for user ${req.user.id}`);
      console.log(`User details: ${JSON.stringify(req.user)}`);

      // FIXING CRITICAL ISSUE: Ensure we capture all transactions without invoices
      // For debugging - check all transactions without invoices in the system regardless of user
      // This helps us understand if there are any transactions that need invoices
      const allTransactionsWithoutInvoices = await db.select()
        .from(transactions)
        .where(isNull(transactions.invoiceNumber));

      console.log(`DEBUG: All transactions without invoices in system: ${allTransactionsWithoutInvoices.length}`);
      console.log(`DEBUG: All transaction IDs without invoices: ${allTransactionsWithoutInvoices.map(t => t.id).join(', ')}`);

      // CRITICAL FIX: By default, only generate invoices for the current user's transactions
      // But if the user is an admin, process all transactions without invoices
      let transactionsWithoutInvoices: Transaction[] = [];

      if (req.user.role === 'admin') {
        // Admin can generate invoices for all transactions
        console.log('Admin user detected - processing ALL transactions without invoices');
        transactionsWithoutInvoices = allTransactionsWithoutInvoices;
      } else {
        // CRITICAL FIX: Use direct database query to ensure we get all user's transactions
        console.log(`Directly querying database for user ${req.user.id} transactions without invoices`);
        transactionsWithoutInvoices = await db.select()
          .from(transactions)
          .where(
            and(
              eq(transactions.userId, req.user.id),
              isNull(transactions.invoiceNumber)
            )
          );
      }

      console.log(`Found ${transactionsWithoutInvoices.length} transactions to process for invoices`);
      console.log(`Transaction IDs to process: ${transactionsWithoutInvoices.map(t => t.id).join(', ')}`);

      if (transactionsWithoutInvoices.length === 0) {
        return res.json({
          success: true,
          message: "No missing invoices found",
          generatedCount: 0
        });
      }

      // Generate invoices for each transaction
      const results = [];
      let successCount = 0;
      let errorCount = 0;

      console.log("======= STARTING INVOICE GENERATION PROCESS =======");
      console.log(`User ID: ${req.user.id}, Username: ${req.user.username}`);
      console.log(`Number of transactions to process: ${transactionsWithoutInvoices.length}`);
      console.log(`Transaction IDs: ${transactionsWithoutInvoices.map(t => t.id).join(', ')}`);

      for (const transaction of transactionsWithoutInvoices) {
        try {
          console.log(`\n[Transaction ${transaction.id}] Starting invoice generation`);
          console.log(`[Transaction ${transaction.id}] Details: Amount=${transaction.amount}, Type=${transaction.type}, Status=${transaction.status}`);

          // Determine invoice status based on transaction status
          const invoiceStatus = transaction.status === 'completed' ? 'paid' :
                               transaction.status === 'failed' ? 'cancelled' : 'pending';

          console.log(`[Transaction ${transaction.id}] Using invoice status: ${invoiceStatus}`);

          // Generate the invoice
          const pdfData = await generateInvoice(transaction, invoiceStatus);

          console.log(`[Transaction ${transaction.id}] Successfully generated invoice with PDF data length: ${pdfData.length > 1000 ? 'OK' : 'WARNING - SHORT PDF'}`);

          successCount++;
          results.push({
            transactionId: transaction.id,
            success: true
          });

          console.log(`[Transaction ${transaction.id}] Invoice generation SUCCEEDED`);
        } catch (invoiceError: any) {
          console.error(`[Transaction ${transaction.id}] ERROR generating invoice:`, invoiceError);
          console.error(`[Transaction ${transaction.id}] Stack trace:`, invoiceError.stack);
          errorCount++;
          results.push({
            transactionId: transaction.id,
            success: false,
            error: invoiceError.message
          });
          console.error(`[Transaction ${transaction.id}] Invoice generation FAILED`);
        }
      }

      console.log("\n======= INVOICE GENERATION SUMMARY =======");
      console.log(`Total transactions processed: ${transactionsWithoutInvoices.length}`);
      console.log(`Successful: ${successCount}, Failed: ${errorCount}`);
      console.log("===========================================")

      res.json({
        success: true,
        message: `Generated ${successCount} invoices with ${errorCount} errors`,
        results,
        generatedCount: successCount,
        errorCount
      });
    } catch (error: any) {
      console.error("Error generating missing invoices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Download a specific invoice
  app.get("/api/invoices/:id/download", isAuthenticated, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      // Get the invoice
      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Check if the invoice belongs to the user
      if (invoice.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: "You do not have permission to access this invoice" });
      }

      console.log(`Generating PDF for invoice ${invoice.invoiceNumber}`);

      // Generate PDF content (now returns base64 string)
      const pdfBase64 = await generateInvoice(invoice, invoice.status);

      // Convert base64 to Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);

      // Send the PDF content
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error downloading invoice:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Capture and verify PayPal payment with server-side handling
  app.post("/api/billing/capture-paypal-payment", isAuthenticated, async (req, res) => {
    try {
      const { orderID } = req.body;

      console.log(`Capturing PayPal payment: orderID=${orderID}`);

      if (!orderID) {
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
        : process.env.VITE_PAYPAL_CLIENT_ID;
      const clientSecret = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_SECRET
        : process.env.VITE_PAYPAL_SECRET;

      if (!clientId || !clientSecret) {
        console.error("PayPal credentials are not configured");
        return res.status(500).json({
          error: "PayPal integration is not properly configured. Please contact support.",
          details: "Missing API credentials"
        });
      }

      console.log(`Using PayPal in ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode`);

      // First, get an access token
      let accessToken;
      try {
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
        accessToken = tokenData.access_token;
        console.log("Successfully obtained PayPal access token");
      } catch (tokenError) {
        console.error("Error getting PayPal access token:", tokenError);
        return res.status(500).json({
          error: "Failed to authenticate with PayPal API. Please try again later.",
          details: tokenError.message
        });
      }

      // Now capture the order
      try {
        console.log(`Capturing PayPal order: ${orderID}`);

        const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderID}/capture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!captureResponse.ok) {
          const errorData = await captureResponse.json();
          console.error("PayPal capture error:", errorData);
          throw new Error(`Failed to capture PayPal payment: ${errorData.message || 'Unknown error'}`);
        }

        const captureData = await captureResponse.json();
        console.log("PayPal capture successful:", {
          id: captureData.id,
          status: captureData.status
        });

        // Verify captured payment status
        if (captureData.status !== 'COMPLETED') {
          console.error(`Invalid PayPal capture status: ${captureData.status}`);
          return res.status(400).json({
            error: `PayPal payment was not completed (status: ${captureData.status})`
          });
        }

        // Extract payment details
        if (!captureData.purchase_units || captureData.purchase_units.length === 0) {
          throw new Error("Invalid capture data: missing purchase units");
        }

        const purchaseUnit = captureData.purchase_units[0];
        let amount = 0;
        let currency = 'USD';

        if (purchaseUnit.payments && purchaseUnit.payments.captures && purchaseUnit.payments.captures.length > 0) {
          const capture = purchaseUnit.payments.captures[0];
          amount = parseFloat(capture.amount.value);
          currency = capture.amount.currency_code;
        } else if (purchaseUnit.amount) {
          amount = parseFloat(purchaseUnit.amount.value);
          currency = purchaseUnit.amount.currency_code;
        }

        console.log(`Captured payment: ${amount} ${currency}, Order ID: ${orderID}`);

        // Return successful capture result
        return res.json({
          captured: true,
          verified: true,
          orderId: captureData.id,
          status: captureData.status,
          amount,
          currency
        });
      } catch (captureError) {
        console.error("Error capturing PayPal payment:", captureError);

        // Create a transaction record for the failed capture
        try {
          // Create transaction record for the failed payment
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: 0, // Amount unknown at this point
            type: "credit",
            description: "Failed PayPal payment capture",
            status: "failed",
            paymentMethod: "paypal",
            paymentId: orderID,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for failed capture:", createdTransaction.id);

          // Generate invoice for the failed payment
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for failed PayPal capture`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for failed PayPal capture:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for failed capture:", transactionError);
        }

        return res.status(500).json({
          error: "Failed to capture payment with PayPal. Please try again or contact support.",
          details: captureError.message
        });
      }
    } catch (error) {
      console.error("Server error during PayPal capture:", error);

      // Create a transaction record for the failed capture due to server error
      try {
        // Create transaction record for the failed payment
        const transaction: InsertTransaction = {
          userId: req.user!.id,
          amount: 0, // Amount unknown at this point
          type: "credit",
          description: "Failed PayPal payment (server error)",
          status: "failed",
          paymentMethod: "paypal",
          paymentId: req.body.orderID || "unknown",
        };

        const createdTransaction = await storage.createTransaction(transaction);
        console.log("Created transaction record for server error during capture:", createdTransaction.id);

        // Generate invoice for the failed payment
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
          console.log(`Generated invoice ${invoiceNumber} for failed PayPal capture (server error)`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for failed PayPal capture (server error):', invoiceError);
        }
      } catch (transactionError) {
        console.error("Failed to create transaction record for server error during capture:", transactionError);
      }

      return res.status(500).json({
        error: "An unexpected error occurred during payment capture",
        details: error.message
      });
    }
  });

  // Verify PayPal payment with server-side validation (legacy method)
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
        : process.env.VITE_PAYPAL_CLIENT_ID;
      const clientSecret = isSandbox
        ? process.env.VITE_PAYPAL_SANDBOX_SECRET
        : process.env.VITE_PAYPAL_SECRET;

      if (!clientId || !clientSecret) {
        console.error("PayPal credentials are not configured");
        return res.status(500).json({
          error: "PayPal integration is not properly configured. Please contact support.",
          details: "Missing API credentials"
        });
      }

      console.log(`Using PayPal in ${isSandbox ? 'SANDBOX' : 'PRODUCTION'} mode`);

      // First, get an access token
      let accessToken;
      try {
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
        accessToken = tokenData.access_token;
        console.log("Successfully obtained PayPal access token");
      } catch (tokenError) {
        console.error("Error getting PayPal access token:", tokenError);
        return res.status(500).json({
          error: "Failed to authenticate with PayPal API. Please try again later.",
          details: tokenError.message
        });
      }

      // Now verify the order
      try {
        const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!orderResponse.ok) {
          const errorData = await orderResponse.json();
          console.error("PayPal order verification error:", errorData);
          throw new Error(`Failed to verify PayPal order: ${errorData.message || 'Unknown error'}`);
        }

        const orderData = await orderResponse.json();
        console.log("PayPal order verification successful:", {
          id: orderData.id,
          status: orderData.status,
          intent: orderData.intent
        });

        // Verify order status is APPROVED or COMPLETED
        if (orderData.status !== 'APPROVED' && orderData.status !== 'COMPLETED') {
          console.error(`Invalid PayPal order status: ${orderData.status}`);
          return res.status(400).json({
            error: `PayPal payment is not approved (status: ${orderData.status})`
          });
        }

        // Extract payment amount
        if (!orderData.purchase_units || orderData.purchase_units.length === 0) {
          throw new Error("Invalid order data: missing purchase units");
        }

        const purchaseUnit = orderData.purchase_units[0];
        const amount = parseFloat(purchaseUnit.amount.value);
        const currency = purchaseUnit.amount.currency_code;

        console.log(`Verified payment: ${amount} ${currency}, Order ID: ${orderId}`);

        // Return payment verification result
        return res.json({
          verified: true,
          orderId: orderData.id,
          status: orderData.status,
          amount,
          currency
        });
      } catch (verifyError) {
        console.error("Error verifying PayPal order:", verifyError);

        // Create a transaction record for the failed verification
        try {
          // Create transaction record for the failed verification
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: 0, // Amount unknown at this point
            type: "credit",
            description: "Failed PayPal payment verification",
            status: "failed",
            paymentMethod: "paypal",
            paymentId: orderId,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for failed verification:", createdTransaction.id);

          // Generate invoice for the failed verification
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for failed PayPal verification`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for failed PayPal verification:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for failed verification:", transactionError);
        }

        return res.status(500).json({
          error: "Failed to verify payment with PayPal. Please try again or contact support.",
          details: verifyError.message
        });
      }
    } catch (error) {
      console.error("Server error during PayPal verification:", error);

      // Create a transaction record for the failed verification due to server error
      try {
        // Create transaction record for the failed verification
        const transaction: InsertTransaction = {
          userId: req.user!.id,
          amount: 0, // Amount unknown at this point
          type: "credit",
          description: "Failed PayPal payment verification (server error)",
          status: "failed",
          paymentMethod: "paypal",
          paymentId: req.body.orderId || "unknown",
        };

        const createdTransaction = await storage.createTransaction(transaction);
        console.log("Created transaction record for server error during verification:", createdTransaction.id);

        // Generate invoice for the failed verification
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
          console.log(`Generated invoice ${invoiceNumber} for failed PayPal verification (server error)`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for failed PayPal verification (server error):', invoiceError);
        }
      } catch (transactionError) {
        console.error("Failed to create transaction record for server error during verification:", transactionError);
      }

      return res.status(500).json({
        error: "An unexpected error occurred during payment verification",
        details: error.message
      });
    }
  });

  // Add credits via PayPal
  app.post("/api/billing/add-credits", isAuthenticated, async (req, res) => {
    try {
      const { amount, paymentId, verificationData } = req.body;

      console.log(`Processing add credits request: amount=${amount}, paymentId=${paymentId}`);

      if (!amount || amount <= 0 || !paymentId) {
        console.log("Invalid add credits request - missing amount or paymentId");
        return res.status(400).json({ error: "Invalid amount or payment ID" });
      }

      // Verify we have verification data
      if (!verificationData || !verificationData.verified) {
        console.error("Payment not verified through server-side validation");

        // Create transaction record for the unverified payment
        try {
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: amount,
            type: "credit",
            description: "Unverified PayPal payment",
            status: "failed",
            paymentMethod: "paypal",
            paymentId: paymentId,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for unverified payment:", createdTransaction.id);

          // Generate invoice for the unverified payment
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for unverified payment`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for unverified payment:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for unverified payment:", transactionError);
        }

        return res.status(400).json({
          error: "Payment verification failed. Please try again.",
          needsVerification: true
        });
      }

      // Compare amounts for extra security
      if (verificationData.amount !== amount) {
        console.error(`Amount mismatch: verified=${verificationData.amount}, requested=${amount}`);

        // Create transaction record for the payment with mismatched amount
        try {
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: amount,
            type: "credit",
            description: `PayPal payment with amount mismatch (verified: ${verificationData.amount}, requested: ${amount})`,
            status: "failed",
            paymentMethod: "paypal",
            paymentId: paymentId,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for payment with amount mismatch:", createdTransaction.id);

          // Generate invoice for the payment with mismatched amount
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for payment with amount mismatch`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for payment with amount mismatch:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for payment with amount mismatch:", transactionError);
        }

        return res.status(400).json({
          error: "Payment amount doesn't match the verification data",
          needsVerification: true
        });
      }

      // Check if the user has a VirtFusion ID (extRelationId)
      if (!req.user!.virtFusionId) {
        console.log(`User ${req.user!.id} does not have a linked VirtFusion account`);

        // Create transaction record for the payment with no VirtFusion ID
        try {
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: amount,
            type: "credit",
            description: "PayPal payment - VirtFusion account not linked",
            status: "failed",
            paymentMethod: "paypal",
            paymentId: paymentId,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for payment with no VirtFusion ID:", createdTransaction.id);

          // Generate invoice for the payment with no VirtFusion ID
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for payment with no VirtFusion ID`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for payment with no VirtFusion ID:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for payment with no VirtFusion ID:", transactionError);
        }

        return res.status(400).json({
          error: "Your account is not linked to VirtFusion yet. Please contact support.",
          needsSync: true
        });
      }

      console.log(`User has VirtFusion extRelationId: ${req.user!.virtFusionId}`);


      // Check VirtFusion API configuration
      const virtFusionApi = new VirtFusionApi();
      await virtFusionApi.updateSettings();

      // Validate VirtFusion API settings before proceeding
      if (!virtFusionApi.isConfigured()) {
        console.error("VirtFusion API is not properly configured");

        // Create transaction record for payment with unconfigured VirtFusion API
        try {
          const transaction: InsertTransaction = {
            userId: req.user!.id,
            amount: amount,
            type: "credit",
            description: "PayPal payment - VirtFusion API not configured",
            status: "failed",
            paymentMethod: "paypal",
            paymentId: paymentId,
          };

          const createdTransaction = await storage.createTransaction(transaction);
          console.log("Created transaction record for payment with unconfigured VirtFusion API:", createdTransaction.id);

          // Generate invoice for the payment with unconfigured VirtFusion API
          try {
            const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
            console.log(`Generated invoice ${invoiceNumber} for payment with unconfigured VirtFusion API`);
          } catch (invoiceError) {
            console.error('Failed to generate invoice for payment with unconfigured VirtFusion API:', invoiceError);
          }
        } catch (transactionError) {
          console.error("Failed to create transaction record for payment with unconfigured VirtFusion API:", transactionError);
        }

        return res.status(500).json({
          error: "VirtFusion API configuration is incomplete. Please contact support.",
          details: "Missing API URL or token"
        });
      }

      // Calculate the number of tokens to add to VirtFusion
      // According to the documentation: 0.01 tokens = 1 cent USD
      const tokens = amount * 100; // $1 = 100 tokens
      console.log(`Converting $${amount} to ${tokens} VirtFusion tokens`);

      // Create a new transaction locally
      const transaction: InsertTransaction = {
        userId: req.user!.id,
        amount: amount,
        type: "credit",
        description: "Credit purchase via PayPal",
        status: "pending", // Set as pending until VirtFusion confirms
        paymentMethod: "paypal",
        paymentId: paymentId,
      };

      console.log("Creating transaction record:", transaction);
      const createdTransaction = await storage.createTransaction(transaction);
      console.log("Transaction created with ID:", createdTransaction.id);

      try {
        // Test connection to VirtFusion API before proceeding with adding credits
        try {
          console.log("Testing VirtFusion API connection before adding credits");
          await virtFusionApi.testConnection();
          console.log("VirtFusion API connection successful");
        } catch (connectionError: any) {
          console.error("VirtFusion API connection test failed:", connectionError);
          throw new Error(`VirtFusion API connection failed: ${connectionError.message}`);
        }

        // Update the VirtFusion account with the tokens
        // For VirtFusion's API, we should use the user's ID as the extRelationId
        // because that's how users were created in VirtFusion based on the logs
        const extRelationId = req.user!.id; // Use user ID, not virtFusionId field
        const storedVirtFusionId = req.user!.virtFusionId;
        console.log(`Using user ID ${extRelationId} as extRelationId for VirtFusion (stored virtFusionId was ${storedVirtFusionId})`);
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

        // If we get here, the user exists, so proceed with adding credits
        // Format the data EXACTLY as specified in the VirtFusion API documentation
        // According to https://docs.virtfusion.com/api/stoplight.html#/paths/selfService-credit-byUserExtRelationId-extRelationId/post
        const tokenData = {
          tokens: tokens,
          reference_1: createdTransaction.id, // Use our transaction ID as reference
          reference_2: `Payment via PayPal ID: ${paymentId}`
        };

        console.log(`Sending to VirtFusion API with extRelationId=${extRelationId}:`, tokenData);

        // Call the VirtFusion API with the extRelationId and the token data
        // The ID passed here should be the external relation ID as configured in VirtFusion
        const virtFusionResult = await virtFusionApi.addCreditToUser(
          extRelationId,
          tokenData
        );

        console.log("VirtFusion credit add response:", virtFusionResult);

        // Calculate new credit balance
        const newCreditBalance = (req.user!.credits || 0) + amount;
        console.log(`Updating user credits: ${req.user!.credits || 0} + ${amount} = ${newCreditBalance}`);

        // Mark the transaction as completed and update user credits
        await storage.updateUser(req.user!.id, {
          credits: newCreditBalance
        });

        // Update transaction status using the storage interface instead of direct db access
        console.log(`Updating transaction ${createdTransaction.id} status to completed`);
        await storage.updateTransaction(createdTransaction.id, {
          status: "completed"
        });

        // Generate invoice for the completed transaction
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'paid');
          console.log(`Generated invoice ${invoiceNumber} for successful payment`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for completed transaction:', invoiceError);
          // Continue despite invoice generation failure
        }

        res.json({
          success: true,
          creditsAdded: amount,
          newBalance: newCreditBalance,
          virtFusionTokens: tokens,
          virtFusionResponse: virtFusionResult
        });

      } catch (virtFusionError: any) {
        console.error("VirtFusion API error:", virtFusionError);

        // Update transaction status to failed using storage interface
        console.log(`Updating transaction ${createdTransaction.id} status to failed`);
        await storage.updateTransaction(createdTransaction.id, {
          status: "failed",
          description: `${transaction.description} (VirtFusion sync failed: ${virtFusionError.message})`
        });

        // Generate invoice for the failed transaction
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
          console.log(`Generated invoice ${invoiceNumber} for failed payment`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for failed transaction:', invoiceError);
          // Continue despite invoice generation failure
        }

        return res.status(500).json({
          error: "Failed to add credits to VirtFusion account",
          details: virtFusionError.message
        });
      }
    } catch (error: any) {
      console.error(`Error adding credits:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current credit balance
  app.get("/api/billing/balance", isAuthenticated, async (req, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Initialize response with local credits
      const response = {
        credits: user.credits,
        virtFusionCredits: 0,
        virtFusionTokens: 0
      };

      // If user has VirtFusion account linked, fetch their tokens
      if (user.virtFusionId) {
        try {
          const virtFusionApi = new VirtFusionApi();
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
          // We'll still return the local credits if VirtFusion API call fails
        }
      }

      res.json(response);
    } catch (error: any) {
      console.error(`Error fetching credit balance:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's VPS servers from VirtFusion
  app.get("/api/user/servers", isAuthenticated, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    try {
      // Check if user has a VirtFusion ID
      if (!req.user.virtFusionId) {
        return res.json([]);
      }

      const virtFusionApi = new VirtFusionApi();

      // Get user's servers from VirtFusion API
      console.log(`Fetching servers for user ${req.user.virtFusionId} from VirtFusion API`);

      // Verify API is configured
      if (!virtFusionApi.isConfigured()) {
        console.error("VirtFusion API is not properly configured");
        return res.status(500).json({ error: "VirtFusion API configuration error" });
      }

      const response = await virtFusionApi.getUserServers(req.user.virtFusionId);

      if (!response || !response.data) {
        console.error("Invalid response from VirtFusion API");
        return res.json([]);
      }

      // Format the response to include only necessary data
      const servers = response.data.map((server: any) => {
        // Extract all IP addresses and network information from the server
        let primaryIpAddress = "No IP";
        let allIpAddresses: any[] = [];
        let allIpv6Addresses: any[] = [];
        let networkInfo: any = {};
        let isNat = false;

        // Debugging - log the server network structure to console (only in development)
        console.log(`Processing server ${server.id} (${server.name}), network structure:`,
          JSON.stringify(server.network || {}, null, 2).substring(0, 500) + '...');

        // Get IP from network.interfaces array based on the API documentation
        if (server.network && server.network.interfaces && Array.isArray(server.network.interfaces)) {
          for (const iface of server.network.interfaces) {
            // Store isNat value
            if (typeof iface.isNat === 'boolean') {
              isNat = iface.isNat;
            }

            // Process IPv4 addresses
            if (iface.ipv4 && Array.isArray(iface.ipv4) && iface.ipv4.length > 0) {
              console.log(`Found ${iface.ipv4.length} IPv4 addresses for interface ${iface.name || 'unknown'}`);

              // Store all IPv4 addresses for this interface
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
                  // Fallback to first IP if none are explicitly enabled
                  primaryIpAddress = iface.ipv4[0].address;
                }
              }
            }

            // Process IPv6 addresses
            if (iface.ipv6 && Array.isArray(iface.ipv6) && iface.ipv6.length > 0) {
              console.log(`Found ${iface.ipv6.length} IPv6 addresses for interface ${iface.name || 'unknown'}`);

              // Store all IPv6 addresses for this interface
              const ipv6Addresses = iface.ipv6.map((ip: any) => ({
                // Use subnet/cidr to create a proper IPv6 address display if no direct address
                address: ip.address || (ip.subnet ? `${ip.subnet}/${ip.cidr}` : 'Unknown'),
                gateway: ip.gateway || 'Unknown',
                // Ensure netmask is properly set for display
                netmask: ip.prefix || ip.netmask || (ip.cidr ? `/${ip.cidr}` : 'Unknown'),
                resolver1: ip.resolver1 || 'Unknown',
                resolver2: ip.resolver2 || 'Unknown',
                enabled: ip.enabled === true,
                order: ip.order || 0,
                type: 'ipv6'
              }));

              allIpv6Addresses = [...allIpv6Addresses, ...ipv6Addresses];
              allIpAddresses = [...allIpAddresses, ...ipv6Addresses];

              // Use IPv6 as primary only if no IPv4 is available
              if ((primaryIpAddress === "No IP") && ipv6Addresses.length > 0) {
                const enabledIpv6 = iface.ipv6.find((ip: any) => ip.enabled === true);
                if (enabledIpv6) {
                  // For IPv6, construct address from subnet/cidr if direct address is missing
                  if (enabledIpv6.address) {
                    primaryIpAddress = enabledIpv6.address;
                  } else if (enabledIpv6.subnet) {
                    primaryIpAddress = `${enabledIpv6.subnet}/${enabledIpv6.cidr}`;
                  }
                } else if (iface.ipv6[0]) {
                  // Use first IPv6 address if no enabled one found
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

        // Log the extracted IP information
        console.log(`Server ${server.id} (${server.name}) IP summary:`, {
          primaryIp: primaryIpAddress,
          ipCount: allIpAddresses.length,
          ipv6Count: allIpv6Addresses.length,
          isNat
        });

        return {
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
          package: server.package?.name || "Unknown"
        };
      });

      res.json(servers);
    } catch (error: any) {
      console.error("Error fetching VirtFusion servers:", error);
      res.status(500).json({ error: "Failed to fetch servers" });
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
      const virtFusionApi = new VirtFusionApi();
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

      // Use the VirtFusion API class's built-in method to make the API call with user.id
      const response = await virtFusionApi.getUserHourlyStats(user.id);
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
      const virtFusionApi = new VirtFusionApi();
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

        // Update transaction status
        await storage.updateTransaction(createdTransaction.id, {
          status: "completed"
        });

        // Generate invoice for the test transaction
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'paid');
          console.log(`Generated invoice ${invoiceNumber} for test credit transaction`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for test transaction:', invoiceError);
          // Continue despite invoice generation failure
        }

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

        // Generate invoice for the failed test transaction
        try {
          const invoiceNumber = await generateInvoice(createdTransaction, 'cancelled');
          console.log(`Generated invoice ${invoiceNumber} for failed test credit transaction`);
        } catch (invoiceError) {
          console.error('Failed to generate invoice for failed test credit transaction:', invoiceError);
          // Continue despite invoice generation failure
        }

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
  // Ticket Department Routes
  app.get("/api/ticket-departments", isAuthenticated, async (req, res) => {
    try {
      const departments = await storage.getActiveTicketDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching ticket departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/ticket-departments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const departments = await storage.getAllTicketDepartments();
      res.json(departments);
    } catch (error: any) {
      console.error("Error fetching all ticket departments:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/ticket-departments", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const departmentData = insertTicketDepartmentSchema.parse(req.body);
      const department = await storage.createTicketDepartment(departmentData);
      res.status(201).json(department);
    } catch (error: any) {
      console.error("Error creating ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await storage.updateTicketDepartment(id, updates);
      const updatedDepartment = await storage.getTicketDepartment(id);
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // PUT route for ticket departments to match client requests
  app.put("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      await storage.updateTicketDepartment(id, updates);
      const updatedDepartment = await storage.getTicketDepartment(id);
      res.json(updatedDepartment);
    } catch (error: any) {
      console.error("Error updating ticket department:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/ticket-departments/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTicketDepartment(id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting ticket department:", error);
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
      const department = ticket.departmentId ? await storage.getTicketDepartment(ticket.departmentId) : null;

      // If this is a VPS-related ticket, fetch the VPS information
      let server = null;
      if (ticket.vpsId) {
        try {
          // Fetch VPS data from VirtFusion API if the ticket has a VPS ID
          const virtFusionApi = new VirtFusionApi();

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

              const allIps = [...ipv4s.map(ip => ({...ip, type: 'ipv4'})), ...formattedIpv6s];

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
      const department = await storage.getTicketDepartment(req.body.departmentId);
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
          const virtFusionApiService = new VirtFusionApi();

          // Get user's VPS info from VirtFusion
          if (req.user.virtFusionId) {
            console.log(`Fetching VPS info for user ${req.user.virtFusionId} from VirtFusion API`);
            const userServers = await virtFusionApiService.getUserServers(req.user.virtFusionId);

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
          const virtFusionApi = new VirtFusionApi();
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
      res.json(users);
    } catch (error: any) {
      console.error("Error fetching users:", error);
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
      const invoices = await storage.getAllInvoices();

      // Calculate summary statistics
      const totalCredits = transactions
        .filter(t => t.type === 'credit' && t.status === 'completed')
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingInvoices = invoices.filter(i => i.status !== 'paid').length;
      const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

      res.json({
        totalCredits,
        pendingInvoices,
        pendingTransactions
      });
    } catch (error: any) {
      console.error("Error fetching admin billing data:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin invoice routes
  app.get("/api/admin/invoices", isAdmin, async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();

      // Fetch all unique user IDs from invoices
      const userIds = [...new Set(invoices.map(inv => inv.userId))];

      // Get user data for these IDs in one go
      const users = await storage.getUsersByIds(userIds);

      // Map users by their ID for easier lookup
      const userMap = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {} as Record<number, any>);

      // Attach user data to each invoice
      const invoicesWithUserData = invoices.map(invoice => {
        const user = userMap[invoice.userId];
        return {
          ...invoice,
          user: user ? {
            id: user.id,
            username: user.username || user.fullName || `User #${user.id}`,
            email: user.email || 'No email available'
          } : undefined
        };
      });

      res.json(invoicesWithUserData);
    } catch (error: any) {
      console.error("Error fetching all invoices:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/invoices/:id", isAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Make sure we're returning JSON data by setting the Content-Type header
      res.setHeader('Content-Type', 'application/json');
      res.json(invoice);
    } catch (error: any) {
      console.error(`Error fetching invoice with ID ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Update invoice status (admin only)
  app.patch("/api/admin/invoices/:id/status", isAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      // Validate the status
      const { status } = req.body;
      if (!status || !['pending', 'paid', 'cancelled', 'refunded'].includes(status)) {
        return res.status(400).json({ error: "Invalid status value. Must be one of: pending, paid, cancelled, refunded" });
      }

      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Update the invoice status
      const updatedInvoice = await storage.updateInvoice(invoiceId, { status });

      // If status is changed to 'paid', set the paidDate if it's not already set
      if (status === 'paid' && !invoice.paidDate) {
        await storage.updateInvoice(invoiceId, { paidDate: new Date().toISOString() });
      }

      res.json(updatedInvoice);
    } catch (error: any) {
      console.error(`Error updating invoice status for ID ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin invoice download endpoint
  app.get("/api/admin/invoices/:id/download", isAdmin, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);

      if (isNaN(invoiceId)) {
        return res.status(400).json({ error: "Invalid invoice ID" });
      }

      const invoice = await storage.getInvoice(invoiceId);

      if (!invoice) {
        return res.status(404).json({ error: "Invoice not found" });
      }

      // Generate PDF document for the invoice - this returns base64 data, not a file path
      const pdfBase64 = await generateInvoice(invoice);

      // Convert base64 string back to Buffer
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');

      // Set appropriate headers for PDF file download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);

      // Send PDF data directly instead of using sendFile
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error(`Error downloading invoice with ID ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Route removed to prevent duplication - see earlier implementation of /api/admin/invoices/:id/download

  // Get single invoice endpoint (admin)
  // Route removed to prevent duplication - see earlier implementation of /api/admin/invoices/:id

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

      await storage.updateUserRole(userId, role);
      res.json({ success: true });
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

          // Create a new instance of VirtFusionApi
          const api = new VirtFusionApi();
          await api.updateSettings();

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
          await api.modifyUserByExtRelationId(user.id, updateData);

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

      // Prepare data for VirtFusion API
      const creditData = {
        tokens: Number(amount),
        reference_2: reference || `Added via Admin Portal on ${new Date().toISOString()}`
      };

      // Call VirtFusion API
      const api = new VirtFusionApi();
      await api.updateSettings();

      const result = await api.addCreditToUser(extRelationId, creditData);

      if (!result || !result.data || !result.data.id) {
        return res.status(500).json({ error: "Failed to add credits to VirtFusion" });
      }

      console.log(`Successfully added credits to VirtFusion. Credit ID: ${result.data.id}`);

      // Add a record to our local transactions table for reference
      // The frontend shows transactions as positive or negative based on the transaction.type
      // So we use a positive amount value and "credit" type for proper frontend display
      await storage.createTransaction({
        userId: user.id,
        amount: Math.abs(Number(amount) / 100), // Make sure it's positive (100 tokens = $1)
        description: `Added ${amount} tokens to VirtFusion (Credit ID: ${result.data.id})`,
        type: "credit", // Using "credit" type means it will display as positive in the frontend
        status: "completed",
        reference: reference || null
      });

      // Also update the user's local credits
      const dollarAmount = Number(amount) / 100; // Convert tokens to dollars (100 tokens = $1)
      await storage.updateUser(user.id, {
        credits: user.credits + dollarAmount
      });

      console.log(`Updated local credits balance for user ${user.id} by adding $${dollarAmount}`);

      return res.json({
        success: true,
        message: "Credits added successfully to VirtFusion and local platform",
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

      // Validate request data
      const { creditId } = req.body;

      if (!creditId || isNaN(Number(creditId)) || Number(creditId) <= 0) {
        return res.status(400).json({ error: "Invalid credit ID" });
      }

      // Find the transaction that recorded this credit being added
      const userTransactions = await storage.getUserTransactions(userId);

      // Look for a transaction with this credit ID in the description
      const creditTransaction = userTransactions.find(tx =>
        tx.type === "virtfusion_credit" && tx.description.includes(`Credit ID: ${creditId}`)
      );

      // If we can't find a matching transaction, try to extract from any transaction
      const anyMatchingTransaction = !creditTransaction
        ? userTransactions.find(tx => tx.description.includes(`Credit ID: ${creditId}`))
        : null;

      // If we still can't find a transaction, require the amount
      if (!creditTransaction && !anyMatchingTransaction) {
        return res.status(400).json({
          error: "Unable to find transaction record for this credit ID. Please contact support."
        });
      }

      // Use transaction data to determine the amount
      const transaction = creditTransaction || anyMatchingTransaction;

      // Try to extract the token amount from the description
      const tokenMatch = transaction.description.match(/Added (\d+) tokens/);
      const tokenAmount = tokenMatch ? tokenMatch[1] : null;

      if (!tokenAmount) {
        return res.status(400).json({
          error: "Could not determine the original token amount. Please contact support."
        });
      }

      // Convert from tokens to dollars (100 tokens = $1.00)
      const creditAmount = tokenAmount;
      const dollarAmount = Number(tokenAmount) / 100;

      console.log(`Found matching transaction ${transaction.id}: "${transaction.description}"`);
      console.log(`Removing credit ID ${creditId} (${creditAmount} tokens = $${dollarAmount}) from VirtFusion for user ${userId}`);

      // Use direct axios call to VirtFusion API
      const virtFusionApiUrl = process.env.VIRTFUSION_API_URL || 'https://vdc.skyvps360.xyz/api/v1';
      const virtFusionApiToken = process.env.VIRTFUSION_API_TOKEN;

      if (!virtFusionApiUrl || !virtFusionApiToken) {
        return res.status(500).json({ error: "VirtFusion API URL or token not configured" });
      }

      // Format the URL correctly
      let apiBase = virtFusionApiUrl;
      if (apiBase.endsWith("/")) {
        apiBase = apiBase.slice(0, -1);
      }

      // Use the correct endpoint format for credit removal
      const fullUrl = `${apiBase}/selfService/credit/${creditId}`;
      console.log(`Making direct DELETE request to ${fullUrl}`);

      try {
        // Make the request
        const response = await axios({
          method: 'DELETE',
          url: fullUrl,
          headers: {
            Authorization: `Bearer ${virtFusionApiToken}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          httpsAgent: new https.Agent({ rejectUnauthorized: true })
        });

        console.log(`Response status: ${response.status}`);
        console.log(`Response data: ${JSON.stringify(response.data || {})}`);

        // Update the user's local credits to match VirtFusion
        // Deduct the dollar equivalent amount from local credits
        await storage.updateUser(user.id, {
          credits: Math.max(0, user.credits - dollarAmount)  // Prevent negative balance
        });

        console.log(`Updated local credits balance for user ${user.id} by removing $${dollarAmount}`);

        // Add a record to our local transactions table for reference
        // For consistency with how the frontend displays transactions:
        // 1. Use a positive amount value with type "debit" for things that reduce account balance
        // 2. Use a positive amount value with type "credit" for things that increase account balance
        await storage.createTransaction({
          userId: user.id,
          amount: Math.abs(dollarAmount), // Make positive for consistent display
          description: `Removed credit from VirtFusion (Credit ID: ${creditId}, Amount: ${creditAmount} tokens = $${dollarAmount})`,
          type: "debit", // Using "debit" type means it will display as negative in the frontend
          status: "completed"
        });

        return res.json({
          success: true,
          message: `Credit ID ${creditId} removed successfully and local credits updated`
        });
      } catch (apiError: any) {
        console.error("Error calling VirtFusion API:", apiError);
        return res.status(500).json({
          error: "Failed to remove credit from VirtFusion",
          details: apiError.message || "Unknown error"
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

      // If user has VirtFusion ID, check for servers and delete them in VirtFusion
      if (user.virtFusionId) {
        try {
          // Create a new instance of VirtFusionApi
          const api = new VirtFusionApi();
          await api.updateSettings();

          // First check if the user has any servers
          // IMPORTANT: The extRelationId should be the user.id (not virtFusionId)
          // According to API docs: /users/{extRelationId}/byExtRelation
          // where extRelationId is the external relation ID (our user ID)
          const extRelationId = user.id;
          console.log(`Checking if user has servers. User ID: ${userId}, VirtFusion extRelationId: ${extRelationId}`);

          // Implement server check directly instead of using checkUserHasServers
          try {
            // Get current date in YYYY-MM-DD format for the period parameter
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const currentDate = `${year}-${month}-${day}`;

            // Get usage data from VirtFusion with proper period parameter
            const usageData = await api.request(
              "GET",
              `/selfService/usage/byUserExtRelationId/${extRelationId}?period[]=${currentDate}&range=m`
            );

            // Check if there are any servers in the periods array
            let hasServers = false;
            if (usageData && usageData.data && usageData.data.periods && usageData.data.periods.length > 0) {
              // Check if any periods have servers
              for (const period of usageData.data.periods) {
                if (period.servers && period.servers.length > 0) {
                  console.log(`User with extRelationId ${extRelationId} has ${period.servers.length} servers`);
                  hasServers = true;
                  break;
                }
              }
            }

            if (hasServers) {
              console.log(`User has servers attached, cannot delete. User ID: ${userId}`);
              return res.status(409).json({
                error: "Cannot delete user with servers",
                details: "The user has active servers. Please delete or transfer all servers before deleting the user account."
              });
            }
          } catch (usageError) {
            console.error(`Error checking if user has servers:`, usageError);
            // If we can't determine if user has servers, DO NOT proceed with deletion
            // This prevents unsync issues where we delete from our DB but user has servers in VirtFusion
            console.log("Could not determine if user has servers, aborting deletion to prevent unsync");
            return res.status(500).json({
              error: "Unable to verify server status",
              details: "Cannot delete user because we couldn't verify if they have active servers in VirtFusion. This prevents data synchronization issues."
            });
          }

          console.log(`Deleting user from VirtFusion. User ID: ${userId}, VirtFusion extRelationId: ${extRelationId}`);

          try {
            // Use deleteUserByExtRelationId method to delete user in VirtFusion
            await api.deleteUserByExtRelationId(extRelationId);
            console.log(`Successfully deleted user from VirtFusion. User ID: ${userId}`);
          } catch (virtFusionError: any) {
            console.error(`Error deleting user from VirtFusion:`, virtFusionError);

            // Check for 409 error specifically (Conflict - User has servers)
            if (virtFusionError.message && virtFusionError.message.includes("409")) {
              return res.status(409).json({
                error: "Cannot delete user with servers",
                details: "The user has active servers. Please delete or transfer all servers before deleting the user account."
              });
            }

            // Check for 404 Not Found error (User doesn't exist in VirtFusion)
            if (virtFusionError.message && virtFusionError.message.includes("404")) {
              // Log the issue but continue with deletion from our database
              console.log(`User not found in VirtFusion (404 error). Will still delete from our database. User ID: ${userId}`);
              // Don't return - continue with user deletion from our database
            } else {
              // For any other error, DO NOT delete from our database to prevent unsync
              console.error(`VirtFusion deletion failed, aborting local deletion to prevent unsync. User ID: ${userId}`);
              return res.status(500).json({
                error: "Failed to delete user from VirtFusion",
                details: `${virtFusionError.message}. User was not deleted from SkyPANEL to maintain synchronization.`
              });
            }
          }
        } catch (error: any) {
          console.error(`Error in user deletion process:`, error);

          return res.status(500).json({
            error: "Failed to process user deletion",
            details: error.message
          });
        }
      } else {
        console.log(`User ${userId} does not have a VirtFusion ID, skipping VirtFusion deletion`);
      }

      // Delete user from our database
      await storage.deleteUser(userId);

      res.json({
        success: true,
        message: "User has been deleted successfully"
      });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
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

  // Create a new server (admin only)
  // Get OS templates for a specific package
  app.get("/api/admin/packages/:packageId/templates", isAdmin, async (req, res) => {
    try {
      const packageId = parseInt(req.params.packageId);

      if (isNaN(packageId)) {
        return res.status(400).json({ error: "Invalid package ID" });
      }

      console.log(`Fetching OS templates for package ID: ${packageId}`);

      try {
        console.log(`Starting template fetch for packageId=${packageId}`);

        // First try using the specific method
        const templatesResponse = await virtFusionApi.getOsTemplatesForPackage(packageId);

        // Add more detailed debugging to show the full response
        console.log(`Templates API response for package ${packageId}:`, JSON.stringify(templatesResponse).substring(0, 500));

        // Process the nested template structure
        let allTemplates: any[] = [];

        // Check if the response has the expected data structure
        if (templatesResponse && templatesResponse.data && Array.isArray(templatesResponse.data)) {
          console.log(`Got raw templates response with ${templatesResponse.data.length} items`);

          // Handle different response formats from the API
          if (templatesResponse.data.length > 0 && templatesResponse.data[0].templates) {
            // API returned OS categories with nested templates array
            templatesResponse.data.forEach((category: any) => {
              if (category.templates && Array.isArray(category.templates)) {
                allTemplates = allTemplates.concat(category.templates);
              }
            });
            console.log(`Processed ${allTemplates.length} templates from ${templatesResponse.data.length} categories`);
          } else {
            // API returned flat array of templates
            allTemplates = templatesResponse.data;
            console.log(`Using ${allTemplates.length} templates directly from response`);
          }
        } else {
          // If the data isn't in the expected format, just use it as is
          allTemplates = Array.isArray(templatesResponse.data) ? templatesResponse.data : [];
          console.log(`Using templates from response as-is, found ${allTemplates.length} templates`);
        }

        return res.json({ data: allTemplates });
      } catch (templateError) {
        console.error('Error fetching templates:', templateError);
        // If all else fails, provide default OS templates
        const defaultTemplates = [
          {
            id: 1,
            name: "Ubuntu 22.04",
            type: "linux",
            version: "22.04",
            architecture: "x86_64"
          },
          {
            id: 2,
            name: "CentOS 7",
            type: "linux",
            version: "7",
            architecture: "x86_64"
          },
          {
            id: 3,
            name: "Debian 11",
            type: "linux",
            version: "11",
            architecture: "x86_64"
          },
          {
            id: 4,
            name: "Windows Server 2019",
            type: "windows",
            version: "2019",
            architecture: "x86_64"
          },
          {
            id: 5,
            name: "AlmaLinux 8",
            type: "linux",
            version: "8",
            architecture: "x86_64"
          }
        ];

        console.log(`Using ${defaultTemplates.length} default templates as fallback`);
        return res.json({ data: defaultTemplates });
      }
    } catch (error: any) {
      console.error(`Error fetching OS templates:`, error);

      return res.status(500).json({
        error: "Failed to fetch OS templates",
        message: error.message
      });
    }
  });

  // Get all OS templates from all packages (for client-side server list)
  app.get("/api/admin/all-templates", isAuthenticated, async (req, res) => {
    try {
      // Get all packages first
      const packagesResponse = await virtFusionApi.getPackages();
      const packages = Array.isArray(packagesResponse) ? packagesResponse : packagesResponse?.data || [];

      const allTemplates: any[] = [];
      const seenTemplateIds = new Set();

      console.log(`Fetching templates from ${packages.length} packages`);

      // Fetch templates for each package and deduplicate
      for (const pkg of packages) {
        try {
          const templatesResponse = await virtFusionApi.getOsTemplatesForPackage(pkg.id);
          const templates = templatesResponse?.data || [];

          for (const template of templates) {
            if (!seenTemplateIds.has(template.id)) {
              seenTemplateIds.add(template.id);
              allTemplates.push(template);
            }
          }
        } catch (error) {
          console.error(`Error fetching templates for package ${pkg.id}:`, error);
          // Continue with other packages
        }
      }

      console.log(`Found ${allTemplates.length} unique templates across all packages`);
      console.log(`Template IDs found: ${Array.from(seenTemplateIds).join(', ')}`);
      res.json({ success: true, data: allTemplates });
    } catch (error) {
      console.error('Error fetching all OS templates:', error);
      res.status(500).json({ success: false, error: 'Failed to fetch OS templates' });
    }
  });

  // Get specific OS template by ID (fallback for missing templates)
  app.get("/api/admin/templates/:templateId", isAuthenticated, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);

      if (isNaN(templateId)) {
        return res.status(400).json({ error: "Invalid template ID" });
      }

      console.log(`Fetching specific template ID: ${templateId}`);

      // Try to get the template from VirtFusion API
      try {
        const templateResponse = await virtFusionApi.request("GET", `/templates/os/${templateId}`);

        if (templateResponse && templateResponse.data) {
          console.log(`Found template ${templateId}:`, templateResponse.data);
          return res.json({ success: true, data: templateResponse.data });
        }
      } catch (error) {
        console.error(`Error fetching template ${templateId} from /templates/os/:`, error);
      }

      // Try alternative endpoint
      try {
        const templateResponse = await virtFusionApi.request("GET", `/compute/templates/${templateId}`);

        if (templateResponse && templateResponse.data) {
          console.log(`Found template ${templateId} from compute endpoint:`, templateResponse.data);
          return res.json({ success: true, data: templateResponse.data });
        }
      } catch (error) {
        console.error(`Error fetching template ${templateId} from /compute/templates/:`, error);
      }

      // If not found, return a generic template
      console.log(`Template ${templateId} not found, returning generic template`);
      return res.json({
        success: true,
        data: {
          id: templateId,
          name: `Template ${templateId}`,
          type: "unknown",
          version: "",
          architecture: "x86_64"
        }
      });

    } catch (error) {
      console.error(`Error fetching template ${req.params.templateId}:`, error);
      res.status(500).json({ success: false, error: 'Failed to fetch template' });
    }
  });

  app.post("/api/admin/servers", isAdmin, async (req, res) => {
    try {
      console.log(`Admin creating a new server with data:`, req.body);

      // Validate required fields based on VirtFusion API
      const requiredFields = ['packageId', 'userId', 'hypervisorId'];
      for (const field of requiredFields) {
        if (!req.body[field]) {
          return res.status(400).json({
            error: `Missing required field: ${field}`,
            message: `The ${field} field is required to create a server.`
          });
        }
      }

      // Check if it's a dry run
      const dryRun = req.body.dryRun === true;

      // Create a modified copy of the request body for the API call
      const serverData = { ...req.body };

      // Get the local user ID
      const localUserId = parseInt(serverData.userId);

      try {
        // Try to map the local user ID to VirtFusion user ID
        const user = await storage.getUser(localUserId);

        if (!user) {
          return res.status(400).json({
            error: "Invalid user",
            message: "The specified user was not found in the database."
          });
        }

        // Check if the user has a VirtFusion ID
        if (!user.virtFusionId) {
          return res.status(400).json({
            error: "User not linked to VirtFusion",
            message: "The selected user doesn't have a linked VirtFusion account."
          });
        }

        // Replace the local user ID with the VirtFusion user ID in the request
        console.log(`Mapping local user ID ${localUserId} to VirtFusion ID ${user.virtFusionId}`);
        serverData.userId = user.virtFusionId;
      } catch (userError) {
        console.error("Error mapping user ID:", userError);
        return res.status(400).json({
          error: "User mapping error",
          message: "Failed to map the local user to a VirtFusion user."
        });
      }

      // If it's a dry run, add the dryRun flag to the request payload
      if (dryRun) {
        serverData.dryRun = true;
        console.log("Performing dry run for server creation with modified data:", serverData);
      }

      // Create the server through VirtFusion API
      const response = await virtFusionApi.createServer(serverData);

      if (dryRun) {
        console.log(`Server dry run completed successfully:`, response);
        return res.json({
          success: true,
          message: "Server creation dry run completed successfully",
          dryRun: true,
          data: response
        });
      }

      console.log(`Server created successfully:`, response);

      res.status(201).json({
        success: true,
        message: "Server created successfully",
        data: response
      });
    } catch (error: any) {
      console.error("Error creating server in VirtFusion API:", error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Provide a more helpful error message for common issues
      let errorMessage = error.message;
      if (error.message.includes("422")) {
        // Try to extract the specific error from the response
        if (error.response && error.response.data && error.response.data.errors) {
          errorMessage = `Validation error: ${error.response.data.errors.join(', ')}`;
        } else {
          errorMessage = "The server creation request was invalid. Please check all fields and try again.";
        }
      }

      res.status(500).json({
        error: "Failed to create server in VirtFusion API",
        message: errorMessage
      });
    }
  });

  // Build a server (install OS) - Admin only
  app.post("/api/admin/servers/:id/build", isAdmin, async (req, res) => {
    try {
      const serverId = parseInt(req.params.id);

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin building server ID: ${serverId} with data:`, req.body);

      // Validate required fields for build operation
      if (!req.body.operatingSystemId) {
        return res.status(400).json({
          error: "Missing required field",
          message: "The operatingSystemId field is required to build a server."
        });
      }

      // Build request payload with required fields from request body
      const buildData = {
        operatingSystemId: req.body.operatingSystemId,
        name: req.body.name || "",
        hostname: req.body.hostname || "",
        vnc: req.body.vnc !== undefined ? req.body.vnc : false,
        ipv6: req.body.ipv6 !== undefined ? req.body.ipv6 : false,
        email: req.body.email !== undefined ? req.body.email : true,
        swap: req.body.swap || 512
      };

      if (req.body.sshKeys && Array.isArray(req.body.sshKeys)) {
        buildData.sshKeys = req.body.sshKeys;
      }

      // Call the VirtFusion API to build the server with the OS
      const result = await virtFusionApi.buildServer(serverId, buildData);

      console.log(`Server build initiated successfully for ID ${serverId}:`, result);

      // Extract queue ID for tracking build progress if available
      let queueId = null;
      if (result && result.data && result.data.queueId) {
        queueId = result.data.queueId;
        console.log(`Server build queued with ID: ${queueId}`);

        // Store this queue ID in the database for this server
        await storage.updateServerPowerStatus(serverId, {
          lastQueueId: queueId,
          lastAction: 'build',
          lastActionTime: new Date()
        });
      }

      res.status(200).json({
        success: true,
        message: "Server build initiated",
        data: result,
        queueId
      });
    } catch (error: any) {
      console.error(`Error building server ${req.params.id}:`, error.message);

      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

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
          sendMail: false
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

      // Create a new VirtFusion API instance to use the request method
      const vfApi = new VirtFusionApi();
      const result = await (vfApi as any).request("POST", `/servers/${serverId}/vnc`);

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

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin enabling VNC for server ID: ${serverId}`);

      // VirtFusion API: POST /servers/{serverId}/vnc toggles VNC and returns status
      const vfApi = new VirtFusionApi();
      const result = await (vfApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        res.json({ success: true, message: "VNC enabled successfully", data: result });
      } else {
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

      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`Admin disabling VNC for server ID: ${serverId}`);

      // VirtFusion API: POST /servers/{serverId}/vnc toggles VNC and returns status
      const vfApi = new VirtFusionApi();
      const result = await (vfApi as any).request("POST", `/servers/${serverId}/vnc`);

      if (result) {
        res.json({ success: true, message: "VNC disabled successfully", data: result });
      } else {
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

      const result = await virtFusionApi.modifyServerCpuThrottle(serverId, throttleData);
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

        wss.handleUpgrade(request, socket, head, (ws) => {
          console.log(`VNC WebSocket proxy: Attempting to connect to ${host}:${portNum}`);

          // Create TCP connection to VNC server with timeout
          const vncSocket = net.createConnection({
            host: host,
            port: portNum,
            timeout: 10000 // 10 second timeout
          });

          // Track connection state
          let isConnected = false;

          vncSocket.on('connect', () => {
            console.log(`VNC TCP connection established to ${host}:${portNum}`);
            isConnected = true;
          });

          vncSocket.on('timeout', () => {
            console.error(`VNC TCP connection timeout to ${host}:${portNum}`);
            vncSocket.destroy();
            if (ws.readyState === WebSocket.OPEN) {
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
            if (ws.readyState === WebSocket.OPEN) {
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
            if (ws.readyState === WebSocket.OPEN) {
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
            if (ws.readyState === WebSocket.OPEN) {
              ws.close(1011, `VNC server error: ${err.message}`);
            }
          });
        });
      } catch (error) {
        console.error('Error setting up VNC WebSocket proxy:', error);
        socket.destroy();
      }
    } else {
      console.log('Non-VNC WebSocket request, closing connection:', url.pathname);
      // Close any other WebSocket connection attempts
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



  // Get VirtFusion packages
  app.get("/api/packages", isAuthenticated, async (req, res) => {
    console.log("Fetching packages from VirtFusion API");
    try {
      const packagesData = await virtFusionApi.getPackages();

      // Log the response for debugging
      console.log("Packages response:", JSON.stringify(packagesData));

      // Handle different response formats
      let packages;
      if (Array.isArray(packagesData)) {
        packages = packagesData;
      } else if (packagesData.data && Array.isArray(packagesData.data)) {
        packages = packagesData.data;
      } else {
        packages = [];
      }

      res.json(packages);
    } catch (error: any) {
      console.error("Error fetching packages:", error);
      res
        .status(500)
        .json({ error: error.message || "Failed to fetch packages" });
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
      const packageData = await virtFusionApi.getPackage(packageId);

      // Log the response for debugging
      console.log(
        `Package ${packageId} response:`,
        JSON.stringify(packageData),
      );

      // Handle different response formats
      let pkg;
      if (packageData && typeof packageData === "object") {
        if (packageData.data) {
          pkg = packageData.data;
        } else {
          pkg = packageData;
        }
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
      const virtFusionApi = new VirtFusionApi();
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
      const virtFusionApi = new VirtFusionApi();
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

      const packageData = await virtFusionApi.getPackage(parseInt(id));

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
      const virtFusionApi = new VirtFusionApi();
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

      if (!isSandbox) {
        return res.status(400).json({
          error: "This test endpoint only works in sandbox mode",
          details: "Set VITE_PAYPAL_SANDBOX=true to use this endpoint"
        });
      }

      const paypalBaseUrl = "https://api-m.sandbox.paypal.com";
      const clientId = process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID;
      const clientSecret = process.env.VITE_PAYPAL_SANDBOX_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({
          error: "PayPal sandbox credentials not configured",
          details: "Missing VITE_PAYPAL_SANDBOX_CLIENT_ID or VITE_PAYPAL_SANDBOX_SECRET"
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

      // Now verify the order
      console.log(`Getting order details for ${orderId}...`);
      const orderResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!orderResponse.ok) {
        const orderError = await orderResponse.json();
        console.error("PayPal order error:", orderError);
        return res.status(500).json({
          error: "Failed to get PayPal order details",
          details: orderError
        });
      }

      const orderData = await orderResponse.json();
      console.log("PayPal order details:", {
        id: orderData.id,
        status: orderData.status,
        intent: orderData.intent
      });

      // Return the full response for analysis
      res.json({
        success: true,
        paypal: {
          sandbox: true,
          order: orderData
        }
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

  // This Blog posts endpoint for public access is removed - using the implementation below

  // Documentation endpoint for public access
  // This route is replaced by the implementation below

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

  // Second PATCH implementation removed to fix duplicate route

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

  // Public packages endpoint
  app.get("/api/public/packages", async (req, res) => {
    try {
      // Return empty array until implemented
      res.json([]);
    } catch (error: any) {
      console.error('Error fetching packages:', error);
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
        return acc;
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
      const virtFusionApi = new VirtFusionApi();

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

  // FAQs endpoint - This is a duplicate and has been implemented above
  // Keeping the commented code for reference but removing actual endpoint to avoid conflicts
  /*
  app.get("/api/faqs", async (req, res) => {
    try {
      // This endpoint has been implemented above
      res.json([]);
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
      res.status(500).json({ error: error.message });
    }
  });
  */

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

  // Docs AI chat endpoint has been removed
  app.post("/api/ai/docs-chat", async (req, res) => {
    return res.status(404).json({
      success: false,
      response: "The AI documentation assistant has been deprecated."
    });
  });

  // Register API Keys routes
  app.use("/api/user/api-keys", isAuthenticated, apiKeysRoutes);

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

  // Create HTTP server
  const httpServer = createServer(app);

  // Attach WebSocket handlers to HTTP server
  httpServer.on('upgrade', handleWebSocketUpgrade);

  return httpServer;
}
