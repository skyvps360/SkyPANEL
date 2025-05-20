// Script to generate missing invoices
import { db } from "../server/db.js";
import * as schema from "../shared/schema.js";
import { eq, isNull, and } from "drizzle-orm";

// Helper function to generate a unique invoice number
function generateInvoiceNumber(): string {
  const prefix = 'INV';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
}

async function main() {
  console.log("Finding transactions without invoices...");
  
  // Get all transactions that don't have an invoice number
  const transactions = await db.select()
    .from(schema.transactions)
    .where(isNull(schema.transactions.invoiceNumber));
  
  console.log(`Found ${transactions.length} transactions without invoices`);
  
  // Create invoices for each transaction
  let successCount = 0;
  let errorCount = 0;
  
  for (const transaction of transactions) {
    try {
      console.log(`Processing transaction ID: ${transaction.id}`);
      
      // Generate an invoice number
      const invoiceNumber = generateInvoiceNumber();
      
      // Determine invoice status based on transaction status
      const status = transaction.status === 'completed' ? 'paid' : 
                     transaction.status === 'failed' ? 'cancelled' : 'pending';
      
      // Default tax rate (can be customized)
      const taxRate = 0.0;  // 0% tax
      
      // Calculate amounts
      const amount = transaction.amount;
      const taxAmount = amount * taxRate;
      const totalAmount = amount + taxAmount;
      
      // Create an invoice item for the transaction
      const items = JSON.stringify([{
        description: transaction.description,
        quantity: 1,
        unitPrice: amount,
        totalPrice: amount
      }]);
      
      // Get today's date
      const today = new Date();
      
      // Set due date to 14 days from today
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + 14);
      
      // Set paid date for completed transactions
      const paidDate = transaction.status === 'completed' ? today : null;
      
      // Convert to ISO strings for storage
      const dueDateIso = dueDate.toISOString();
      const paidDateIso = paidDate ? paidDate.toISOString() : null;
      
      // Create the invoice record
      const invoice = await db.insert(schema.invoices)
        .values({
          invoiceNumber,
          userId: transaction.userId,
          transactionId: transaction.id,
          amount,
          taxAmount,
          totalAmount,
          currency: 'USD', // Default currency
          status,
          dueDate: dueDateIso,
          paidDate: paidDateIso,
          items,
          notes: `Invoice for transaction #${transaction.id}`,
        })
        .returning();
      
      // Update the transaction with the invoice number
      await db.update(schema.transactions)
        .set({ invoiceNumber })
        .where(eq(schema.transactions.id, transaction.id));
      
      console.log(`Created invoice #${invoiceNumber} for transaction ${transaction.id}`);
      successCount++;
    } catch (error) {
      console.error(`Failed to create invoice for transaction ${transaction.id}:`, error);
      errorCount++;
    }
  }
  
  console.log(`Completed invoice generation: ${successCount} successes, ${errorCount} failures`);
}

main()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });