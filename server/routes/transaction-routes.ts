import { Router } from 'express';
import { storage } from "../storage";
import { z } from 'zod';
import PDFDocument from "pdfkit";
import { transactions, InsertTransaction } from "@shared/schema";

const router = Router();

// Helper function to format transaction description for PDF
function formatTransactionDescriptionForPdf(description: string): string {
  if (description.includes('VirtFusion Credits')) {
    return description.replace('VirtFusion Credits', 'Credits');
  }
  return description;
}

// Helper function to format payment method for PDF
function formatPaymentMethodForPdf(paymentMethod: string): string {
  if (paymentMethod === 'VirtFusion Credits') {
    return 'Credits';
  }
  return paymentMethod;
}

// Format a single transaction for PDF
function formatSingleTransactionPdf(
  doc: PDFKit.PDFDocument,
  transaction: any,
  user: any,
  companyName: string,
  companyLogo: string | null
) {
  // Set up the document
  doc.font('Helvetica');
  
  // Add company logo if available
  if (companyLogo) {
    try {
      doc.image(companyLogo, 50, 45, { width: 150 });
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  } else {
    doc.fontSize(24).text(companyName || 'SkyPANEL', 50, 50);
  }
  
  // Add invoice header
  doc.fontSize(20).text('RECEIPT', 50, companyLogo ? 130 : 100);
  doc.moveDown();
  
  // Add transaction details
  doc.fontSize(12);
  
  // Helper function to add a field with label and value
  function addField(label: string, value: string, x: number, y: number) {
    doc.font('Helvetica-Bold').text(label, x, y);
    doc.font('Helvetica').text(value, x, y + 20);
    return y + 40;
  }
  
  let y = companyLogo ? 180 : 150;
  
  // Left column
  y = addField('Receipt #:', transaction.id.toString(), 50, y);
  y = addField('Date:', new Date(transaction.createdAt).toLocaleDateString(), 50, y);
  y = addField('Payment Method:', formatPaymentMethodForPdf(transaction.paymentMethod), 50, y);
  
  // Right column
  let rightY = companyLogo ? 180 : 150;
  rightY = addField('Customer:', user.name || user.email, 300, rightY);
  rightY = addField('Email:', user.email, 300, rightY);
  
  // Transaction details
  y = Math.max(y, rightY) + 20;
  doc.font('Helvetica-Bold').fontSize(14).text('Transaction Details', 50, y);
  doc.moveDown();
  
  // Add table headers
  y += 30;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Description', 50, y);
  doc.text('Amount', 400, y, { align: 'right' });
  
  // Add line
  y += 20;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 20;
  
  // Add transaction item
  doc.font('Helvetica').fontSize(12);
  doc.text(formatTransactionDescriptionForPdf(transaction.description), 50, y);
  doc.text(`$${transaction.amount.toFixed(5)}`, 400, y, { align: 'right' });
  
  // Add total
  y += 40;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 20;
  doc.font('Helvetica-Bold').text('Total', 50, y);
  doc.text(`$${transaction.amount.toFixed(5)}`, 400, y, { align: 'right' });
  
  // Add footer
  doc.fontSize(10).text(`Thank you for your business with ${companyName || 'SkyPANEL'}`, 50, 700);
}

// Format multiple transactions for PDF
function formatTransactionsPdf(
  doc: PDFKit.PDFDocument,
  transactions: any[],
  user: any,
  companyName: string,
  companyLogo: string | null
) {
  // Set up the document
  doc.font('Helvetica');
  
  // Add company logo if available
  if (companyLogo) {
    try {
      doc.image(companyLogo, 50, 45, { width: 150 });
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  } else {
    doc.fontSize(24).text(companyName || 'SkyPANEL', 50, 50);
  }
  
  // Add statement header
  doc.fontSize(20).text('TRANSACTION STATEMENT', 50, companyLogo ? 130 : 100);
  doc.moveDown();
  
  // Add user details
  doc.fontSize(12);
  doc.font('Helvetica-Bold').text('Customer:', 50, companyLogo ? 180 : 150);
  doc.font('Helvetica').text(user.name || user.email, 120, companyLogo ? 180 : 150);
  doc.font('Helvetica-Bold').text('Email:', 50, companyLogo ? 200 : 170);
  doc.font('Helvetica').text(user.email, 120, companyLogo ? 200 : 170);
  doc.font('Helvetica-Bold').text('Date:', 50, companyLogo ? 220 : 190);
  doc.font('Helvetica').text(new Date().toLocaleDateString(), 120, companyLogo ? 220 : 190);
  
  // Add table headers
  let y = companyLogo ? 270 : 240;
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Date', 50, y);
  doc.text('Description', 150, y);
  doc.text('Payment Method', 350, y);
  doc.text('Amount', 500, y, { align: 'right' });
  
  // Add line
  y += 20;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 10;
  
  // Add transactions
  doc.font('Helvetica').fontSize(10);
  
  transactions.forEach((transaction, i) => {
    // Check if we need a new page
    if (y > 700) {
      doc.addPage();
      y = 50;
      
      // Add table headers to new page
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Date', 50, y);
      doc.text('Description', 150, y);
      doc.text('Payment Method', 350, y);
      doc.text('Amount', 500, y, { align: 'right' });
      
      // Add line
      y += 20;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;
      
      doc.font('Helvetica').fontSize(10);
    }
    
    const date = new Date(transaction.createdAt).toLocaleDateString();
    const description = formatTransactionDescriptionForPdf(transaction.description);
    const paymentMethod = formatPaymentMethodForPdf(transaction.paymentMethod);
    const amount = `$${transaction.amount.toFixed(5)}`;
    
    doc.text(date, 50, y);
    doc.text(description, 150, y, { width: 190 });
    doc.text(paymentMethod, 350, y);
    doc.text(amount, 500, y, { align: 'right' });
    
    y += 20;
    
    // Add a light line between transactions
    if (i < transactions.length - 1) {
      doc.moveTo(50, y - 5).lineTo(550, y - 5).lineWidth(0.5).stroke();
    }
  });
  
  // Add total
  y += 10;
  doc.moveTo(50, y).lineTo(550, y).lineWidth(1).stroke();
  y += 20;
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text('Total', 350, y);
  doc.text(`$${total.toFixed(5)}`, 500, y, { align: 'right' });
  
  // Add footer
  doc.fontSize(10).text(`Thank you for your business with ${companyName || 'SkyPANEL'}`, 50, 750);
}

// Format admin transactions for PDF (all clients)
function formatAdminTransactionsPdf(
  doc: PDFKit.PDFDocument,
  transactions: any[],
  companyName: string,
  companyLogo: string | null
) {
  // Set up the document
  doc.font('Helvetica');
  
  // Add company logo if available
  if (companyLogo) {
    try {
      doc.image(companyLogo, 50, 45, { width: 150 });
    } catch (error) {
      console.error('Error adding logo to PDF:', error);
    }
  } else {
    doc.fontSize(24).text(companyName || 'SkyPANEL', 50, 50);
  }
  
  // Add report header with proper centering
  doc.fontSize(22).font('Helvetica-Bold');
  const headerText = 'ALL CLIENTS TRANSACTION REPORT';
  const headerWidth = doc.widthOfString(headerText);
  const centerX = (doc.page.width - headerWidth) / 2;
  doc.text(headerText, centerX, companyLogo ? 130 : 100);
  
  // Add spacing after header
  doc.moveDown(3);
  
  // Add report details with consistent alignment
  doc.fontSize(12).font('Helvetica');
  let detailsY = companyLogo ? 180 : 150;
  
  // Create a details box with proper alignment
  doc.font('Helvetica-Bold').text('Report Generated:', 50, detailsY);
  doc.font('Helvetica').text(new Date().toLocaleDateString(), 180, detailsY);
  
  detailsY += 25;
  doc.font('Helvetica-Bold').text('Total Transactions:', 50, detailsY);
  doc.font('Helvetica').text(transactions.length.toString(), 180, detailsY);
  
  // Add separator line after details
  detailsY += 35;
  doc.moveTo(50, detailsY).lineTo(550, detailsY).lineWidth(0.5).stroke();
  
  // Add table headers with proper alignment and spacing
  let y = detailsY + 25;
  doc.font('Helvetica-Bold').fontSize(12);
  
  // Define column positions for consistent alignment with proper spacing
  const cols = {
    date: 50,
    client: 130,
    description: 240,
    payment: 400,
    amount: 480
  };
  
  // Define column widths for proper text wrapping
  const colWidths = {
    date: 75,
    client: 105,
    description: 155,
    payment: 75,
    amount: 70
  };
  
  doc.text('Date', cols.date, y, { width: colWidths.date });
  doc.text('Client', cols.client, y, { width: colWidths.client });
  doc.text('Description', cols.description, y, { width: colWidths.description });
  doc.text('Payment Method', cols.payment, y, { width: colWidths.payment });
  doc.text('Amount', cols.amount, y, { width: colWidths.amount, align: 'right' });
  
  // Add header underline
  y += 20;
  doc.moveTo(50, y).lineTo(550, y).lineWidth(1).stroke();
  y += 15;
  
  // Add transactions with consistent alignment
  doc.font('Helvetica').fontSize(10);
  
  transactions.forEach((transaction, i) => {
    // Check if we need a new page
    if (y > 680) {
      doc.addPage();
      y = 50;
      
      // Add table headers to new page with consistent positioning
      doc.font('Helvetica-Bold').fontSize(12);
      doc.text('Date', cols.date, y, { width: colWidths.date });
      doc.text('Client', cols.client, y, { width: colWidths.client });
      doc.text('Description', cols.description, y, { width: colWidths.description });
      doc.text('Payment Method', cols.payment, y, { width: colWidths.payment });
      doc.text('Amount', cols.amount, y, { width: colWidths.amount, align: 'right' });
      
      // Add header underline
      y += 20;
      doc.moveTo(50, y).lineTo(550, y).lineWidth(1).stroke();
      y += 15;
      
      doc.font('Helvetica').fontSize(10);
    }
    
    const date = new Date(transaction.createdAt).toLocaleDateString();
    const clientName = transaction.user ? (transaction.user.username || transaction.user.email) : 'Unknown';
    const description = formatTransactionDescriptionForPdf(transaction.description);
    const paymentMethod = formatPaymentMethodForPdf(transaction.paymentMethod);
    const amount = `$${transaction.amount.toFixed(5)}`;
    
    // Use consistent column positioning with proper text wrapping
    doc.text(date, cols.date, y, { width: colWidths.date, ellipsis: true });
    doc.text(clientName, cols.client, y, { width: colWidths.client, ellipsis: true });
    doc.text(description, cols.description, y, { width: colWidths.description, ellipsis: true });
    doc.text(paymentMethod, cols.payment, y, { width: colWidths.payment, ellipsis: true });
    doc.text(amount, cols.amount, y, { width: colWidths.amount, align: 'right' });
    
    y += 20;
    
    // Add subtle separator line between transactions
    if (i < transactions.length - 1) {
      doc.moveTo(50, y + 2).lineTo(550, y + 2).lineWidth(0.2).strokeColor('#E0E0E0').stroke().strokeColor('#000000');
      y += 8;
    }
  });
  
  // Add total section with proper spacing and alignment
  y += 20;
  doc.moveTo(50, y).lineTo(550, y).lineWidth(1.5).stroke();
  y += 20;
  
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Create a highlighted total section
  doc.font('Helvetica-Bold').fontSize(14);
  doc.text('TOTAL AMOUNT:', cols.payment, y, { width: colWidths.payment });
  doc.text(`$${total.toFixed(5)}`, cols.amount, y, { width: colWidths.amount, align: 'right' });
  
  // Add final separator line
  y += 25;
  doc.moveTo(50, y).lineTo(550, y).lineWidth(1.5).stroke();
  
  // Add footer with proper positioning and styling
  const footerY = Math.max(y + 40, 720);
  doc.fontSize(9).font('Helvetica');
  const footerText = `Generated by ${companyName || 'SkyPANEL'} Admin Panel`;
  const dateText = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
  
  // Center the footer text properly
  const footerWidth = doc.widthOfString(footerText + ' - ' + dateText);
  const footerCenterX = Math.max(50, (doc.page.width - footerWidth) / 2);
  doc.text(`${footerText} - ${dateText}`, footerCenterX, footerY, { width: 500, align: 'center' });
}

// Get user credits
router.get('/credits', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    

    
    // Get VirtFusion credits
    let virtFusionCredits = 0;
    try {
      const user = await storage.virtFusionService.getUserByExtRelationId(userId);
      if (user && user.credit) {
        const dollarAmount = parseFloat(user.credit);
        if (!isNaN(dollarAmount)) {
          virtFusionCredits = dollarAmount;
        }
      }
    } catch (error) {
      console.error('Error getting VirtFusion credits:', error);
    }
    
    // Prepare response
    const response = {
      virtFusionCredits: 0
    };

    // Set VirtFusion credits
    response.virtFusionCredits = virtFusionCredits || 0;
    
    return res.json(response);
  } catch (error: any) {
    console.error('Error getting user credits:', error);
    return res.status(500).json({ message: 'An error occurred while getting user credits' });
  }
});

// Get user transactions
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const transactions = await storage.getUserTransactions(userId);
    
    return res.json(transactions);
  } catch (error: any) {
    console.error('Error getting transactions:', error);
    return res.status(500).json({ message: 'An error occurred while getting transactions' });
  }
});

// Get transaction by ID
router.get('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view this transaction' });
    }
    
    return res.json(transaction);
  } catch (error: any) {
    console.error('Error getting transaction:', error);
    return res.status(500).json({ message: 'An error occurred while getting the transaction' });
  }
});

// Download transaction receipt
router.get('/:id/receipt', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const transactionId = parseInt(req.params.id);
    
    if (isNaN(transactionId)) {
      return res.status(400).json({ message: 'Invalid transaction ID' });
    }
    
    const transaction = await storage.getTransaction(transactionId);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    if (transaction.userId !== userId) {
      return res.status(403).json({ message: 'You do not have permission to view this transaction' });
    }
    
    // Get branding settings
    const brandingSettings = await storage.getBrandingSettings();
    const companyName = brandingSettings.company_name || 'SkyPANEL';
    const companyLogo = brandingSettings.logo_url || null;
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=receipt-${transactionId}.pdf`);

    // Pipe PDF to response
    doc.pipe(res);

    // Format PDF
    formatSingleTransactionPdf(doc, transaction, req.user, companyName, companyLogo);
    
    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error('Error generating transaction receipt:', error);
    return res.status(500).json({ message: 'An error occurred while generating the transaction receipt' });
  }
});

// Download all transactions as PDF
router.get('/download/all', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    const transactions = await storage.getUserTransactions(userId);
    
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ message: 'No transactions found' });
    }
    
    // Get branding settings
    const brandingSettings = await storage.getBrandingSettings();
    const companyName = brandingSettings.company_name || 'SkyPANEL';
    const companyLogo = brandingSettings.logo_url || null;
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.pdf');

    // Pipe PDF to response
    doc.pipe(res);

    // Format PDF
    formatTransactionsPdf(doc, transactions, req.user, companyName, companyLogo);
    
    // Finalize PDF
    doc.end();
  } catch (error: any) {
    console.error('Error generating transactions PDF:', error);
    return res.status(500).json({ message: 'An error occurred while generating the transactions PDF' });
  }
});

// Create a new transaction
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.user.id;
    
    const schema = z.object({
      amount: z.number().positive('Amount must be positive'),
      description: z.string().min(1, 'Description is required'),
      paymentMethod: z.string().min(1, 'Payment method is required'),
      status: z.string().optional(),
      metadata: z.record(z.any()).optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { amount, description, paymentMethod, status = 'completed', metadata = {} } = validationResult.data;
    
    const transaction: InsertTransaction = {
      userId,
      amount,
      description,
      paymentMethod,
      status,
      metadata
    };
    
    const result = await storage.createTransaction(transaction);
    

    
    return res.status(201).json(result);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({ message: 'An error occurred while creating the transaction' });
  }
});

export default router;
export { formatAdminTransactionsPdf };