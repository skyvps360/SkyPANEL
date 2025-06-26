import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  description: string;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  createdAt: string;
}

// Helper function to format transaction descriptions for better readability
const formatTransactionDescription = (transaction: Transaction) => {
  let description = transaction.description;

  // Handle DNS plan transactions with plan name extraction
  if (transaction.type === 'dns_plan_purchase' && description.includes('DNS Plan Purchase:')) {
    return description;
  }

  if (transaction.type === 'dns_plan_upgrade' && description.includes('DNS Plan Upgrade:')) {
    return description;
  }

  if (transaction.type === 'dns_plan_downgrade' && description.includes('DNS Plan Downgrade:')) {
    return description;
  }

  // Handle admin credit operations
  if (transaction.type === 'admin_credit_add' && description.includes('Admin Credit Addition:')) {
    return description;
  }

  if (transaction.type === 'admin_credit_remove' && description.includes('Admin Credit Removal:')) {
    return description;
  }

  // Handle legacy dns_plan_purchase format
  if (transaction.type === 'dns_plan_purchase') {
    // Try to extract plan name from description
    const planMatch = description.match(/DNS Plan Purchase: (.+)/);
    if (planMatch) {
      return `DNS Plan Purchase: ${planMatch[1]}`;
    }
    return 'DNS Plan Purchase';
  }

  // Return processed description for other transaction types
  return description;
};

// Helper function to determine if a transaction is a credit/addition
const isCredit = (transaction: Transaction) => {
  return transaction.type === 'virtfusion_credit' ||
         transaction.type === 'custom_credit' ||
         transaction.type === 'admin_credit_add' ||
         transaction.amount > 0; // Also include any transaction with positive amount as credit
};

// Helper function to determine if a transaction is a debit/removal
const isDebit = (transaction: Transaction) => {
  return transaction.type === 'debit' ||
         transaction.type === 'virtfusion_credit_removal' ||
         transaction.type === 'virtfusion_deduction' ||
         transaction.type === 'dns_plan_purchase' ||
         transaction.type === 'dns_plan_upgrade' ||
         transaction.type === 'admin_credit_remove' ||
         transaction.amount < 0; // Also include any transaction with negative amount as spending
};

// Helper function to format transaction type for display
const formatTransactionType = (transaction: Transaction) => {
  switch (transaction.type) {
    case 'virtfusion_credit':
      return 'VirtFusion Credit';
    case 'credit':
      return 'VirtFusion Credit';
    case 'dns_plan_purchase':
      return 'DNS Plan Purchase';
    case 'dns_plan_upgrade':
      return 'DNS Plan Upgrade';
    case 'dns_plan_downgrade':
      return 'DNS Plan Downgrade';
    default:
      return transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1).replace(/_/g, ' ');
  }
};

export default function TransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const transactionId = params?.id && !isNaN(parseInt(params.id, 10)) ? parseInt(params.id, 10) : null;


  // Fetch transaction details with improved debugging
  const { data: transaction, isLoading, error } = useQuery<Transaction>({
    queryKey: [`/api/transactions/${transactionId}`],
    enabled: !!transactionId,
    onError: (error) => {
      console.error("Error fetching transaction details:", error);
    },
    onSuccess: (data) => {
    },
    retry: 1,
  });

  // Handle transaction download
  const handleDownloadTransaction = async () => {
    if (!transaction) {
      console.error('Cannot download transaction: transaction data is null or undefined');
      alert('Cannot download transaction: missing transaction data');
      return;
    }
    
   
    try {
      // Use the special download URL that bypasses Vite's interception
      const downloadUrl = `/special-download/transactions/${transaction.id}/pdf`;
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download transaction: ${response.statusText}`);
      }
      
      // Get filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      
      // Default to PDF extension since we're generating a PDF
      let filename = `transaction-${transaction.id}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading transaction:', error);
      alert('Failed to download transaction. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading transaction details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !transaction) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Transaction Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The transaction you're looking for could not be found or you don't have permission to view it.</p>
            <Button onClick={() => setLocation('/billing')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => setLocation('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <Button onClick={handleDownloadTransaction}>
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Transaction ID</h3>
              <p className="text-lg font-medium">{transaction.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
              <p className="text-lg font-medium">
                {transaction.createdAt 
                  ? (() => {
                      try {
                        return format(new Date(transaction.createdAt), 'MMMM d, yyyy');
                      } catch (error) {
                        console.error("Date formatting error:", error);
                        return transaction.createdAt || 'N/A';
                      }
                    })() 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <p className="text-lg font-medium">{formatTransactionDescription(transaction)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
              <p className={`text-lg font-medium ${isCredit(transaction) ? 'text-accent' : 'text-destructive'}`}>
                {isCredit(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
              <p className="text-lg font-medium">{formatTransactionType(transaction)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <p className="text-lg font-medium capitalize">{transaction.status}</p>
            </div>
            {transaction.paymentMethod && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment Method</h3>
                <p className="text-lg font-medium capitalize">
                  {transaction.paymentMethod === 'virtfusion_tokens' ? 'VirtFusion Tokens' : transaction.paymentMethod}
                </p>
              </div>
            )}
            {transaction.paymentId && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment ID</h3>
                <p className="text-lg font-medium">{transaction.paymentId}</p>
              </div>
            )}
            {transaction.virtFusionCreditId && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">VirtFusion Credit ID</h3>
                <p className="text-lg font-medium text-primary">{transaction.virtFusionCreditId}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}