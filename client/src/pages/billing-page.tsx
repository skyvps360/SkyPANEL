import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { PlusCircle, MinusCircle, Download, CreditCard, DollarSign, Receipt, FileText, History, ExternalLink, Eye } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PayPalCheckout } from "@/components/billing/PayPalCheckout";
import { useAuth } from "@/hooks/use-auth";
import { getBrandColors, getButtonStyles } from "@/lib/brand-theme";

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

interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: string;
  transactionId: number;
  dueDate: string;
  paidDate?: string;
  items: any[];
  notes?: string;
  createdAt: string;
}

export default function BillingPage() {
  const { user } = useAuth();
  const [creditAmount, setCreditAmount] = useState(50);
  const [activeTab, setActiveTab] = useState("transactions");
  const [generatingInvoices, setGeneratingInvoices] = useState(false);
  
  // Fetch branding data
  const { data: brandingData } = useQuery<{ 
    company_name: string; 
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ['/api/settings/branding'],
  });
  
  // Get brand colors using the newer structure
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  });
  
  // Handle tab changes and check if user is suspended
  const handleTabChange = (tab: string) => {
    // If user is suspended and tries to access "addCredits" tab, redirect to transactions
    if (!user?.isActive && tab === "addCredits") {
      return; // Don't change the tab
    }
    
    setActiveTab(tab);
  };

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  // Fetch invoices
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  // Fetch credit balance
  const { data: balanceData } = useQuery<{ credits: number, virtFusionCredits: number, virtFusionTokens: number }>({
    queryKey: ["/api/billing/balance"],
  });
  
  // Fetch VirtFusion usage data for last 30 days
  const { data: usageData, isError: usageError, error: usageErrorData } = useQuery<{ usage: number, rawData: any }>({
    queryKey: ["/api/billing/usage/last30days"],
    onSuccess: (data) => {
      console.log("VirtFusion usage data:", data);
    },
    onError: (error) => {
      console.error("VirtFusion usage API error:", error);
    }
  });
  
  // Handle invoice download
  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const response = await fetch(`/api/invoices/${invoice.id}/download`);
      
      if (!response.ok) {
        throw new Error(`Failed to download invoice: ${response.statusText}`);
      }
      
      // Get filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `invoice-${invoice.invoiceNumber}.pdf`;
      
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
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again later.');
    }
  };
  
  // Handle transactions PDF export/download
  const handleExportTransactions = async () => {
    try {
      const response = await fetch('/api/transactions/export');
      
      if (!response.ok) {
        throw new Error(`Failed to export transactions: ${response.statusText}`);
      }
      
      // Get filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `transactions-${new Date().toISOString().split('T')[0]}.pdf`;
      
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
      console.error('Error exporting transactions:', error);
      alert('Failed to export transactions. Please try again later.');
    }
  };
  
  // Handle generating missing invoices
  const handleGenerateMissingInvoices = async () => {
    try {
      setGeneratingInvoices(true);
      console.log("Generating missing invoices...");
      
      // Call the API endpoint to generate missing invoices
      const response = await fetch('/api/invoices/generate-missing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin' // Make sure cookies are sent
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to generate invoices: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log("Generate missing invoices API result:", result);
      
      // Show appropriate message based on the result
      if (result.generatedCount > 0) {
        // Immediately force-refetch the invoices to update the UI
        console.log("Force refetching invoices...");
        
        // Use Promise.all to ensure we refetch both invoices and transactions
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
          queryClient.invalidateQueries({ queryKey: ["/api/transactions"] })
        ]);
        
        // Show success message AFTER refetching data to ensure UI is updated
        alert(`Successfully generated ${result.generatedCount} invoice(s).`);
        
        // If we're not already on the invoices tab, switch to it
        if (activeTab !== "invoices") {
          setActiveTab("invoices");
        }
      } else {
        alert('No missing invoices to generate. All transactions already have invoices.');
      }
    } catch (error) {
      console.error('Error generating missing invoices:', error);
      alert('Failed to generate invoices. Please try again later.');
    } finally {
      setGeneratingInvoices(false);
    }
  };

  // Helper function to determine if a transaction is a credit/addition
  const isCredit = (transaction: Transaction) => {
    return transaction.type === 'credit' || 
           transaction.type === 'virtfusion_credit';
  };
  
  // Helper function to determine if a transaction is a debit/removal
  const isDebit = (transaction: Transaction) => {
    return transaction.type === 'debit' || 
           transaction.type === 'virtfusion_credit_removal';
  };
  
  // Calculate billing summary
  const hasVirtFusionBalance = balanceData?.virtFusionCredits && balanceData.virtFusionCredits > 0;
  
  const summaryData = {
    // Prioritize VirtFusion balance when available
    balance: hasVirtFusionBalance ? 
      balanceData.virtFusionCredits : 
      (balanceData?.credits || user?.credits || 0),
    
    virtFusionTokens: balanceData?.virtFusionTokens || 0,
    localBalance: balanceData?.credits || user?.credits || 0,
    
    // Use VirtFusion API data if available, otherwise fall back to transaction calculation
    spent30Days: usageData?.usage ?? transactions
      .filter(t => isDebit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    added30Days: transactions
      .filter(t => isCredit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
  };

  // Columns for transactions table
  const columns = [
    {
      accessorKey: "description" as keyof Transaction,
      header: "Transaction",
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback className={isCredit(transaction) ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}>
              {isCredit(transaction) ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">
              <a 
                href={`/billing/transactions/${transaction.id}`}
                className="hover:underline text-primary"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = `/billing/transactions/${transaction.id}`;
                }}
              >
                {transaction.description}
              </a>
            </div>
            {transaction.paymentMethod && (
              <div className="text-xs text-gray-500 capitalize">{transaction.paymentMethod}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amount" as keyof Transaction,
      header: "Amount",
      cell: (transaction: Transaction) => (
        <div className={`text-sm ${isCredit(transaction) ? 'text-accent' : 'text-destructive'}`}>
          {isCredit(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "createdAt" as keyof Transaction,
      header: "Date",
      cell: (transaction: Transaction) => (
        <span className="text-sm text-gray-500">
          {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      accessorKey: "status" as keyof Transaction,
      header: "Status",
      cell: (transaction: Transaction) => {
        const getStatusBadge = (status: string) => {
          switch (status.toLowerCase()) {
            case "completed":
              return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
            case "pending":
              return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
            case "failed":
              return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
            default:
              return <Badge>{status}</Badge>;
          }
        };
        
        return getStatusBadge(transaction.status);
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: (transaction: Transaction) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.location.href = `/billing/transactions/${transaction.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
      ),
    },
  ];
  
  // Columns for invoices table
  const invoiceColumns = [
    {
      accessorKey: "invoiceNumber" as keyof Invoice,
      header: "Invoice #",
      cell: (invoice: Invoice) => (
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback style={{
              backgroundColor: brandColors.primary.light,
              color: brandColors.primary.full
            }}>
              <FileText className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{invoice.invoiceNumber}</div>
            <div className="text-xs text-gray-500">
              {invoice.notes || "Credit purchase"}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "totalAmount" as keyof Invoice,
      header: "Amount",
      cell: (invoice: Invoice) => {
        // Determine if the invoice amount is negative (credit removal)
        const isNegativeAmount = invoice.totalAmount < 0 || (invoice.notes && invoice.notes.toLowerCase().includes('removal'));
        const displaySign = isNegativeAmount ? '-' : '+';
        
        return (
          <div className="text-sm">
            <div className={isNegativeAmount ? 'text-destructive' : 'text-accent'}>
              {displaySign}${Math.abs(invoice.totalAmount).toFixed(2)}
            </div>
            {invoice.taxAmount > 0 && (
              <div className="text-xs text-gray-500">
                Tax: {displaySign}${Math.abs(invoice.taxAmount).toFixed(2)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt" as keyof Invoice,
      header: "Date",
      cell: (invoice: Invoice) => (
        <span className="text-sm text-gray-500">
          {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      accessorKey: "status" as keyof Invoice,
      header: "Status",
      cell: (invoice: Invoice) => {
        const getStatusBadge = (status: string) => {
          switch (status.toLowerCase()) {
            case "paid":
              return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
            case "pending":
              return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
            case "overdue":
              return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
            default:
              return <Badge>{status}</Badge>;
          }
        };
        
        return getStatusBadge(invoice.status);
      },
    },
    {
      id: "actions",
      header: "",
      cell: (invoice: Invoice) => (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleDownloadInvoice(invoice)}
          style={{ 
            backgroundColor: 'transparent', 
            color: brandColors.primary.full, 
            borderColor: brandColors.primary.medium 
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      ),
    },
  ];

  // Credit amount options
  const creditOptions = [1, 2, 5, 10, 25, 50, 100, 250, 500];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Billing & Payments</h1>
          <p className="text-gray-500 mt-1">Manage your account balance and view transactions</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={handleExportTransactions}
            style={{ 
              backgroundColor: 'transparent', 
              color: brandColors.primary.full, 
              borderColor: brandColors.primary.medium 
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Transactions
          </Button>
        </div>
      </div>

      {/* Billing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 mr-2 text-primary" />
              <div className="text-3xl font-bold">${summaryData.balance.toFixed(2)}</div>
            </div>
            
            {/* Show VirtFusion tokens section when available */}
            {hasVirtFusionBalance ? (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">VirtFusion Tokens:</span>
                  <span className="font-medium" style={{ color: brandColors.primary.full }}>{summaryData.virtFusionTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>100 tokens = $1.00 USD</span>
                  <span>${(summaryData.virtFusionTokens / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            ) : (
              /* Show local balance only if no VirtFusion balance */
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Local Balance:</span>
                  <span className="font-medium">${summaryData.localBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            {user?.isActive ? (
              <Button 
                className="w-full" 
                onClick={() => handleTabChange("addCredits")}
                style={{ 
                  backgroundColor: brandColors.primary.full,
                  color: 'white',
                  borderColor: brandColors.primary.full
                }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Credits
              </Button>
            ) : (
              <Button 
                className="w-full" 
                variant="outline" 
                disabled
                style={{ borderColor: brandColors.primary.medium }}
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Account Suspended
              </Button>
            )}
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Spent Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Receipt className="h-8 w-8 mr-2 text-destructive" />
              <div className="text-3xl font-bold">${summaryData.spent30Days.toFixed(2)}</div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleTabChange("invoices")}
              style={{ 
                backgroundColor: 'transparent', 
                color: brandColors.primary.full, 
                borderColor: brandColors.primary.medium 
              }}
            >
              View Invoices
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Added Last 30 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CreditCard className="h-8 w-8 mr-2 text-accent" />
              <div className="text-3xl font-bold">${summaryData.added30Days.toFixed(2)}</div>
            </div>
          </CardContent>
          <CardFooter>
            {user?.isActive ? (
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleTabChange("addCredits")}
                style={{ 
                  backgroundColor: 'transparent', 
                  color: brandColors.primary.full, 
                  borderColor: brandColors.primary.medium 
                }}
              >
                Add More Credits
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="w-full" 
                disabled
                style={{ borderColor: brandColors.primary.medium }}
              >
                Account Suspended
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Tabs: Transactions, Add Credits, Invoices */}
      <Card>
        <CardHeader className="border-b px-6">
          <h2 className="text-lg font-semibold">Billing & Transactions</h2>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-muted/50 mb-6">
              <TabsTrigger value="transactions" className="data-[state=active]:bg-background">
                <History className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              {/* Only show Add Credits tab if user is not suspended */}
              {user?.isActive && (
                <TabsTrigger value="addCredits" className="data-[state=active]:bg-background">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Credits
                </TabsTrigger>
              )}
              <TabsTrigger value="invoices" className="data-[state=active]:bg-background">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="transactions" className="mt-0">
              <div className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {user?.isActive 
                       ? "You don't have any transactions yet. Add credits to get started."
                       : "You don't have any transactions yet. Your account is currently suspended."}
                    </p>
                    {user?.isActive ? (
                      <Button 
                        onClick={() => handleTabChange("addCredits")} 
                        style={{ 
                          backgroundColor: brandColors.primary.full,
                          color: 'white',
                          borderColor: brandColors.primary.full
                        }}
                      >
                        Add Credits
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled
                        style={{ borderColor: brandColors.primary.medium }}
                      >
                        Account Suspended
                      </Button>
                    )}
                  </div>
                ) : (
                  <DataTable
                    data={transactions}
                    columns={[
                      {
                        accessorKey: "description" as keyof Transaction,
                        header: "Transaction",
                        cell: (transaction) => (
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarFallback 
                                style={isCredit(transaction) ? {
                                  backgroundColor: brandColors.primary.light,
                                  color: brandColors.primary.full
                                } : {
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  color: 'rgb(220, 38, 38)'
                                }}
                              >
                                {isCredit(transaction) ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{transaction.description}</div>
                              <div className="text-xs text-gray-500">
                                Transaction ID: #{transaction.id}
                                {transaction.paymentMethod && (
                                  <span className="ml-2 capitalize">{transaction.paymentMethod}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ),
                      },
                      {
                        accessorKey: "createdAt" as keyof Transaction,
                        header: "Date",
                        cell: (transaction) => (
                          <span className="text-sm text-gray-500">
                            {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                          </span>
                        ),
                      },
                      {
                        accessorKey: "type" as keyof Transaction,
                        header: "Type",
                        cell: (transaction) => (
                          <span className="text-sm capitalize">{transaction.type}</span>
                        ),
                      },
                      {
                        accessorKey: "status" as keyof Transaction,
                        header: "Status",
                        cell: (transaction) => {
                          const status = transaction.status.toLowerCase();
                          let badgeClass = "";
                          
                          switch (status) {
                            case "completed":
                              badgeClass = "bg-green-100 text-green-800";
                              break;
                            case "pending":
                              badgeClass = "bg-yellow-100 text-yellow-800";
                              break;
                            case "failed":
                              badgeClass = "bg-red-100 text-red-800";
                              break;
                            default:
                              badgeClass = "bg-gray-100 text-gray-800";
                          }
                          
                          return (
                            <Badge className={`${badgeClass} hover:${badgeClass}`}>
                              {transaction.status}
                            </Badge>
                          );
                        },
                      },
                      {
                        accessorKey: "amount" as keyof Transaction,
                        header: "Amount",
                        cell: (transaction) => (
                          <div className={`text-sm ${isCredit(transaction) ? 'text-accent' : 'text-destructive'}`}>
                            {isCredit(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        ),
                      },
                      {
                        id: "actions",
                        header: "Actions",
                        cell: (transaction) => (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.location.href = `/billing/transactions/${transaction.id}`}
                            style={{ 
                              backgroundColor: 'transparent', 
                              color: brandColors.primary.full, 
                              borderColor: brandColors.primary.medium 
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        ),
                      },
                    ]}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="addCredits" className="mt-0">
              <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                  <h3 className="text-lg font-medium mb-2">Add Credits to Your Account</h3>
                  <p className="text-muted-foreground">
                    Select the amount you want to add to your account. Credits are used to pay for server resources and other services.
                  </p>
                </div>

                <div className="mb-8">
                  <h4 className="text-sm font-medium mb-3">Select Amount</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {creditOptions.map((amount) => (
                      <Button
                        key={amount}
                        variant={creditAmount === amount ? "default" : "outline"}
                        onClick={() => setCreditAmount(amount)}
                        style={creditAmount === amount ? { 
                          backgroundColor: brandColors.primary.full,
                          color: 'white',
                          borderColor: brandColors.primary.full
                        } : { 
                          backgroundColor: 'transparent', 
                          color: brandColors.primary.full, 
                          borderColor: brandColors.primary.medium 
                        }}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Selected Amount:</span>
                    <span className="font-medium">${creditAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-sm font-medium mb-3">Payment Method</h4>
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center">
                      <img 
                        src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" 
                        alt="PayPal" 
                        className="h-8 mr-3" 
                      />
                      <div>
                        <h5 className="font-medium">PayPal</h5>
                        <p className="text-sm text-muted-foreground">Pay securely using PayPal</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin section header */}
                {user?.role === 'admin' && (
                  <div className="border-t my-6 pt-6">
                    <h4 className="text-sm font-medium mb-3">PayPal Checkout</h4>
                  </div>
                )}

                <PayPalCheckout amount={creditAmount} />
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
              <div className="p-0">
                <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-lg font-medium">Your Invoices</h3>
                    <p className="text-sm text-muted-foreground">View and download invoices for your transactions</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={handleGenerateMissingInvoices}
                      disabled={generatingInvoices}
                      variant="default"
                      size="sm"
                      style={{ 
                        backgroundColor: brandColors.primary.full,
                        color: 'white',
                        borderColor: brandColors.primary.full
                      }}
                    >
                      {generatingInvoices ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2" />
                          Generate Missing Invoices
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {isLoadingInvoices ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <p className="ml-2">Loading invoices...</p>
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Invoices Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Your invoices and receipts will appear here when they are generated.
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      If you have completed transactions without invoices, you can generate them using the "Generate Missing Invoices" button above.
                    </p>
                  </div>
                ) : (
                  <DataTable
                    data={invoices}
                    columns={invoiceColumns}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}