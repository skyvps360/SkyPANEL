import type { Express, Request, Response } from "express";
import PDFDocument from "pdfkit";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import * as schema from "../../shared/schema"; // For InsertTransaction type
import type { InsertTransaction } from "../../shared/schema"; // Explicit import

// Helper functions (copied from routes_new.ts for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Helper function to format transaction descriptions for PDF
function formatTransactionDescriptionForPdf(description: string): string {
  if (!description) return 'N/A';
  let formattedDescription = description;
  formattedDescription = formattedDescription.replace(/\s*!\'\s*/g, ' → ');
  formattedDescription = formattedDescription.replace(/\s*'!\s*/g, ' ← ');
  formattedDescription = formattedDescription.replace(/\s*[!'"]+\s*/g, ' → ');
  formattedDescription = formattedDescription.replace(/\s*→\s*/g, ' → ');
  formattedDescription = formattedDescription.replace(/\s*←\s*/g, ' ← ');
  return formattedDescription;
}

// Helper function to format payment methods for PDF
function formatPaymentMethodForPdf(paymentMethod: string): string {
  if (!paymentMethod) return 'N/A';
  switch (paymentMethod.toLowerCase()) {
    case 'paypal': return 'PayPal';
    case 'virtfusion_tokens': return 'VirtFusion Tokens';
    case 'credit': return 'VirtFusion Credits';
    case 'stripe': return 'Credit Card (Stripe)';
    default: return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
  }
}

// Helper function to format a single transaction PDF (copied from routes_new.ts)
function formatSingleTransactionPdf(doc: PDFKit.PDFDocument, transaction: any, user: any, companyName: string, companyLogo: string) {
    console.log('Generating PDF for transaction:', JSON.stringify(transaction, null, 2));
    if (companyLogo) {
      try {
        if (companyLogo.startsWith('data:image')) {
          const base64Data = companyLogo.split(',')[1];
          if (base64Data) {
            const logoBuffer = Buffer.from(base64Data, 'base64');
            doc.image(logoBuffer, 50, 45, { width: 150 });
          }
        } else {
          // doc.image(companyLogo, 50, 45, { width: 150 }); // External URL image fetching can be problematic
        }
      } catch (err) {
        console.error('Error adding logo to PDF:', err);
      }
    }
    doc.fontSize(20).text(companyName, 50, companyLogo ? 130 : 50);
    doc.fontSize(15).text('Transaction Receipt', 50, doc.y + 10);
    doc.moveDown();
    doc.fontSize(10).text(`Customer: ${user.fullName || user.username || 'Customer'}`);
    doc.text(`Account ID: ${user.id}`);
    doc.text(`Receipt Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(12).font('Helvetica-Bold').text('Transaction Details', 50, doc.y + 10);
    doc.font('Helvetica').moveDown();
    let dateStr = 'N/A';
    if (transaction.createdAt) {
      try {
        dateStr = new Date(transaction.createdAt).toLocaleDateString();
      } catch (e) { console.error('Error formatting date:', e); }
    }
    const labelWidth = 120;
    const valueWidth = 170;
    const leftColX = 50;
    const rightColX = 300;
    const lineHeight = 25;
    let currentY = doc.y;
    const addField = (label: string, value: string, x: number, y: number) => {
      doc.fontSize(10).font('Helvetica-Bold').text(label, x, y);
      doc.font('Helvetica').text(value || 'N/A', x + labelWidth, y, { width: valueWidth, ellipsis: true });
    };
    addField('Transaction ID:', `#${transaction.id || 'Unknown'}`, leftColX, currentY);
    addField('Date:', dateStr, rightColX, currentY);
    currentY += lineHeight;
    addField('Type:', transaction.type || 'N/A', leftColX, currentY);
    addField('Status:', transaction.status || 'N/A', rightColX, currentY);
    currentY += lineHeight;
    doc.fontSize(10).font('Helvetica-Bold').text('Description:', leftColX, currentY);
    doc.font('Helvetica').text(formatTransactionDescriptionForPdf(transaction.description), leftColX + labelWidth, currentY, { width: 380, ellipsis: true });
    currentY += lineHeight;
    if (transaction.paymentMethod) {
      addField('Payment Method:', formatPaymentMethodForPdf(transaction.paymentMethod), leftColX, currentY);
      currentY += lineHeight;
    }
    if (transaction.paymentId) {
      addField('Payment ID:', transaction.paymentId, leftColX, currentY);
    }
    doc.moveDown(2);
    const isCredit = transaction.type === 'credit' || transaction.type === 'virtfusion_credit';
    let amount = 0;
    try {
      amount = typeof transaction.amount === 'number' ? transaction.amount : parseFloat(transaction.amount);
    } catch (e) { console.error('Error parsing transaction amount:', e); }
    doc.fontSize(14).font('Helvetica-Bold').text('Amount:', 50, doc.y);
    doc.fillColor(isCredit ? '#4CAF50' : '#FF5252').fontSize(16).text(`${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`, 150, doc.y - 14);
    doc.fillColor('#000000');
    doc.moveDown(2);
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc.fontSize(10).text('Thank you for your business.', 50, doc.y);
    doc.fontSize(8).text(`Generated on ${new Date().toLocaleString()}`, 50, doc.y + 5);
}

// Helper function to format transactions PDF (copied from routes_new.ts)
function formatTransactionsPdf(doc: PDFKit.PDFDocument, transactions: any[], user: any, companyName: string, companyLogo: string) {
    if (companyLogo) {
      try {
        if (companyLogo.startsWith('data:image')) {
          const base64Data = companyLogo.split(',')[1];
          if (base64Data) {
            const logoBuffer = Buffer.from(base64Data, 'base64');
            doc.image(logoBuffer, 50, 45, { width: 150 });
          }
        } else {
          // doc.image(companyLogo, 50, 45, { width: 150 }); // External URL image fetching
        }
      } catch (err) { console.error('Error adding logo to PDF:', err); }
    }
    doc.fontSize(20).text(companyName, 50, companyLogo ? 130 : 50);
    doc.fontSize(15).text('Transaction Statement', 50, doc.y + 10);
    doc.moveDown();
    doc.fontSize(10).text(`Customer: ${user.fullName || user.username || 'Customer'}`);
    doc.text(`Account ID: ${user.id}`);
    doc.text(`Statement Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    if (transactions.length === 0) {
      doc.fontSize(12).text('No transactions found for this account.', 50, doc.y + 10);
      return;
    }
    const tableTop = doc.y + 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('Transaction ID', 50, tableTop);
    doc.text('Date', 130, tableTop);
    doc.text('Description', 190, tableTop);
    doc.text('Type', 350, tableTop);
    doc.text('Status', 420, tableTop);
    doc.text('Amount', 490, tableTop, { width: 60, align: 'right' });
    doc.font('Helvetica');
    doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
    let y = doc.y + 10;
    let totalCredit = 0;
    let totalDebit = 0;
    transactions.forEach((transaction, i) => {
      if (y > 700) {
        doc.addPage(); y = 50;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Transaction ID', 50, y); doc.text('Date', 130, y); doc.text('Description', 190, y);
        doc.text('Type', 350, y); doc.text('Status', 420, y); doc.text('Amount', 490, y, { width: 60, align: 'right' });
        doc.font('Helvetica');
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(50, y + 15).lineTo(550, y + 15).stroke();
        y += 25;
      }
      const date = transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'N/A';
      const amount = parseFloat(transaction.amount);
      const isCredit = transaction.type === 'credit' || transaction.type === 'virtfusion_credit';
      if (isCredit) { totalCredit += amount; } else { totalDebit += Math.abs(amount); }
      if (i % 2 === 1) { doc.rect(50, y - 3, 500, 20).fill('#f6f6f6'); }
      doc.fillColor('#000000');
      doc.fontSize(8).text(transaction.id ? `#${transaction.id}` : 'N/A', 50, y);
      doc.text(date, 130, y);
      doc.text(formatTransactionDescriptionForPdf(transaction.description), 190, y, { width: 150, ellipsis: true });
      doc.text(transaction.type || '', 350, y);
      doc.text(transaction.status || '', 420, y);
      doc.fillColor(isCredit ? '#4CAF50' : '#FF5252').text(`${isCredit ? '+' : '-'}$${Math.abs(amount).toFixed(2)}`, 490, y, { width: 60, align: 'right' });
      doc.fillColor('#000000');
      y += 20;
    });
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
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).text(`Page ${i - range.start + 1} of ${range.count}`, 50, 780, { align: 'center', width: 500 });
      doc.fontSize(8).text(`This statement was generated on ${new Date().toLocaleString()}. For questions, please contact support.`, 50, 795, { align: 'center', width: 500 });
    }
}


const router = (app: Express) => {
  // Get user's transactions
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactions = await storage.getUserTransactions((req.user! as any).id);
      res.json(transactions);
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Export transactions as PDF
  app.get("/api/transactions/export", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user! as any).id;
      const isAdmin = (req.user! as any).role === 'admin';
      const user = req.user!;

      let transactions;
      if (isAdmin && req.query.all === 'true') {
        transactions = await storage.searchTransactions({
          userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
          startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
          endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
          status: req.query.status as string | undefined,
          type: req.query.type as string | undefined,
          search: req.query.search as string | undefined,
        });
      } else {
        transactions = await storage.getUserTransactions(userId);
      }

      const companyName = await storage.getSetting('company_name');
      const companyNameValue = companyName?.value || 'Your Company';
      const companyLogo = await storage.getSetting('company_logo');
      const companyLogoValue = companyLogo?.value || '';

      const doc = new PDFDocument({ margin: 50 });
      let buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      formatTransactionsPdf(doc, transactions, user, companyNameValue, companyLogoValue);
      doc.end();

      const pdfPromise = new Promise<Buffer>((resolve) => {
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });
      });

      const pdfBuffer = await pdfPromise;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific transaction by ID
  app.get("/api/transactions/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const transactionIdStr = req.params.id;
      if (!transactionIdStr || isNaN(parseInt(transactionIdStr))) {
        return res.status(400).json({ error: "Invalid transaction ID" });
      }
      const transactionId = parseInt(transactionIdStr);
      const userId = (req.user! as any).id;
      const isAdminUser = (req.user! as any).role === 'admin';

      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || (!isAdminUser && transaction.userId !== userId)) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      if (isAdminUser) {
        const transactionUser = await storage.getUser(transaction.userId);
        const transactionWithUser = {
          ...transaction,
          user: transactionUser ? {
            id: transactionUser.id,
            username: transactionUser.username || transactionUser.fullName || `User #${transactionUser.id}`,
            email: transactionUser.email || 'No email available'
          } : undefined
        };
        res.json(transactionWithUser);
      } else {
        res.json(transaction);
      }
    } catch (error: any) {
      console.error("Error retrieving transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get current balance (VirtFusion tokens only)
  app.get("/api/billing/balance", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser((req.user! as any).id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const response = { virtFusionCredits: 0, virtFusionTokens: 0 };
      if (user.virtFusionId) {
        try {
          await virtFusionApi.updateSettings();
          if (virtFusionApi.isConfigured()) {
            const virtFusionData = await virtFusionApi.getUserHourlyStats(user.id); // Use user.id as extRelationId
            if (virtFusionData?.data?.credit?.tokens) {
              const tokenAmount = parseFloat(virtFusionData.data.credit.tokens);
              const dollarAmount = tokenAmount / 100;
              response.virtFusionTokens = tokenAmount || 0;
              response.virtFusionCredits = dollarAmount || 0;
            }
          }
        } catch (virtFusionError) {
          console.error("Error fetching VirtFusion credits:", virtFusionError);
        }
      }
      res.json(response);
    } catch (error: any) {
      console.error(`Error fetching balance:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Add VirtFusion tokens via PayPal
  app.post("/api/billing/add-credits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { amount, paymentId, verificationData } = req.body;
      console.log(`Processing VirtFusion token purchase: amount=${amount}, paymentId=${paymentId}`);

      if (!amount || amount <= 0 || !paymentId) {
        return res.status(400).json({ error: "Invalid amount or payment ID" });
      }
      if (amount < 1) return res.status(400).json({ error: "Minimum amount is $1.00" });
      if (amount > 1000) return res.status(400).json({ error: "Maximum amount is $1000.00" });

      if (!verificationData || !verificationData.verified) {
        return res.status(400).json({ error: "Payment verification failed.", needsVerification: true });
      }
      if (verificationData.amount !== amount) {
        return res.status(400).json({ error: "Payment amount doesn't match verification data.", needsVerification: true });
      }

      const user = req.user as any;
      if (!user.virtFusionId) {
        return res.status(400).json({ error: "Your account is not linked to VirtFusion.", needsSync: true });
      }

      await virtFusionApi.updateSettings();
      if (!virtFusionApi.isConfigured()) {
        return res.status(500).json({ error: "VirtFusion API configuration incomplete.", details: "Missing API URL or token" });
      }

      const tokens = amount * 100;
      let initialBalance = 0;
      try {
        const balanceData = await virtFusionApi.getUserHourlyStats(user.id); // Use user.id as extRelationId
        if (balanceData?.data?.credit?.tokens) {
          initialBalance = parseFloat(balanceData.data.credit.tokens) / 100;
        }
      } catch (balanceError) { console.error("Error fetching initial balance:", balanceError); }

      const transaction: InsertTransaction = {
        userId: user.id,
        amount: amount,
        type: "virtfusion_credit",
        description: "VirtFusion token purchase via PayPal",
        status: "pending",
        paymentMethod: "paypal",
        paymentId: paymentId,
      };
      const createdTransaction = await storage.createTransaction(transaction);

      try {
        await virtFusionApi.testConnection();
        await virtFusionApi.getUserByExtRelationId(user.id); // Use user.id as extRelationId

        const tokenData = { tokens: tokens, reference_1: createdTransaction.id, reference_2: `PayPal payment ID: ${paymentId}` };
        const virtFusionResult = await virtFusionApi.addCreditToUser(user.id, tokenData); // Use user.id as extRelationId
        const virtFusionCreditId = virtFusionResult?.data?.id;

        await storage.updateTransaction(createdTransaction.id, {
          status: "completed",
          virtFusionCreditId: virtFusionCreditId ? String(virtFusionCreditId) : null,
          description: virtFusionCreditId ? `VirtFusion token purchase via PayPal (Credit ID: ${virtFusionCreditId})` : transaction.description
        });

        try {
          const updatedBalanceData = await virtFusionApi.getUserHourlyStats(user.id); // Use user.id
          if (updatedBalanceData?.data?.credit?.tokens) {
            const updatedBalance = parseFloat(updatedBalanceData.data.credit.tokens) / 100;
            if (initialBalance < 0) {
              const deductionAmount = Math.abs(initialBalance);
              if (deductionAmount > 0) {
                const deductionTransaction: InsertTransaction = {
                  userId: user.id, amount: deductionAmount * -1, type: "virtfusion_deduction",
                  description: `Automatic deduction to cover negative balance (linked to transaction #${createdTransaction.id})`,
                  status: "completed", paymentMethod: "paypal", paymentId: paymentId,
                };
                await storage.createTransaction(deductionTransaction);
              }
            }
          }
        } catch (balanceError) { console.error("Error fetching updated balance:", balanceError); }

        res.json({ success: true, tokensAdded: tokens, amountPaid: amount, virtFusionResponse: virtFusionResult });
      } catch (virtFusionError: any) {
        await storage.updateTransaction(createdTransaction.id, { status: "failed", description: `${transaction.description} (VirtFusion sync failed: ${virtFusionError.message})` });
        return res.status(500).json({ error: "Failed to add tokens to VirtFusion account", details: virtFusionError.message });
      }
    } catch (error: any) {
      console.error(`Error processing VirtFusion token purchase:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Verify PayPal payment with server-side validation
  app.post("/api/billing/verify-paypal-payment", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "PayPal order ID is required" });
      }

      const isSandbox = process.env.VITE_PAYPAL_SANDBOX === "true";
      const paypalBaseUrl = isSandbox ? "https://api-m.sandbox.paypal.com" : "https://api-m.paypal.com";
      const clientId = isSandbox ? process.env.VITE_PAYPAL_SANDBOX_CLIENT_ID : (process.env.VITE_PAYPAL_CLIENT_ID || process.env.PAYPAL_CLIENT_ID);
      const clientSecret = isSandbox ? process.env.VITE_PAYPAL_SANDBOX_SECRET : (process.env.VITE_PAYPAL_SECRET || process.env.PAYPAL_SECRET);

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: "PayPal integration is not properly configured.", details: "Missing API credentials" });
      }

      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const tokenResponse = await fetch(`${paypalBaseUrl}/v1/oauth2/token`, {
        method: 'POST', headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=client_credentials'
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(`Failed to get PayPal access token: ${errorData.error_description || 'Unknown error'}`);
      }
      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      const captureResponse = await fetch(`${paypalBaseUrl}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
      });

      if (!captureResponse.ok) {
        const errorData = await captureResponse.json();
        throw new Error(`Failed to capture PayPal payment: ${errorData.details?.[0]?.description || errorData.message || 'Unknown error'}`);
      }
      const captureData = await captureResponse.json();

      if (captureData.status !== 'COMPLETED') {
        return res.status(400).json({ error: `PayPal payment could not be completed (status: ${captureData.status}).` });
      }

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

      return res.json({ verified: true, orderId: captureData.id, status: captureData.status, amount, currency });
    } catch (error: any) {
      console.error("Error verifying PayPal order:", error);
      return res.status(500).json({ error: "Failed to verify payment with PayPal.", details: error.message });
    }
  });
};

export default router;
