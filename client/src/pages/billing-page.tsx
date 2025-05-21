import React, { useState } from "react";
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

  // Invoices are deprecated; do not fetch or use them anymore

  // Fetch credit balance
  const { data: balanceData } = useQuery<{ credits: number, virtFusionCredits: number, virtFusionTokens: number }>({
    queryKey: ["/api/billing/balance"],
  });
  
  // Fetch VirtFusion usage data for last 30 days
  const { data: usageData, isError: usageError, error: usageErrorData } = useQuery<{ usage: number, rawData: any }>({
    queryKey: ["/api/billing/usage/last30days"],
    staleTime: 300000, // 5 minutes
  });
  
  // Log usage data when it changes
  React.useEffect(() => {
    if (usageData) {
      console.log("VirtFusion usage data:", usageData);
    }
    if (usageError) {
      console.error("VirtFusion usage API error:", usageErrorData);
    }
  }, [usageData, usageError, usageErrorData]);
  
  // Invoice download handler removed (invoices deprecated)
  
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
  
  // Invoice generation handler removed (invoices deprecated)

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
  
  // Calculate the spent and added amounts for the last 30 days from transactions
  const spentFromTransactions = transactions
    .filter(t => isDebit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  
  const addedFromTransactions = transactions
    .filter(t => isCredit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const summaryData = {
    // Prioritize VirtFusion balance when available
    balance: hasVirtFusionBalance ? 
      balanceData?.virtFusionCredits || 0 : 
      (balanceData?.credits || user?.credits || 0),
    
    virtFusionTokens: balanceData?.virtFusionTokens || 0,
    localBalance: balanceData?.credits || user?.credits || 0,
    
    // Use VirtFusion API data if available, otherwise fall back to transaction calculation
    spent30Days: (usageData && 'usage' in usageData) ? usageData.usage : spentFromTransactions,
    added30Days: addedFromTransactions,
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

      {/* Billing Summary - Modern Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Current Balance Card */}
        <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="bg-primary/5 px-6 py-4 flex items-center justify-between border-b">
            <CardTitle className="text-base font-medium">Current Balance</CardTitle>
            <div className="h-10 w-10 rounded-full flex items-center justify-center" 
                 style={{ backgroundColor: brandColors.primary.extraLight }}>
              <DollarSign className="h-5 w-5" style={{ color: brandColors.primary.full }} />
            </div>
          </div>
          <CardContent className="px-6 py-5">
            <div className="mb-2">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold">${summaryData.balance.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
              </div>
            </div>
            
            {/* Show VirtFusion tokens section when available */}
            {hasVirtFusionBalance ? (
              <div className="mt-3 pt-3 border-t border-border/60">
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
              <div className="mt-3 pt-3 border-t border-border/60">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Local Balance:</span>
                  <span className="font-medium">${summaryData.localBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Spent Last 30 Days Card */}
        <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="bg-destructive/5 px-6 py-4 flex items-center justify-between border-b">
            <CardTitle className="text-base font-medium">Spent Last 30 Days</CardTitle>
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-red-50">
              <Receipt className="h-5 w-5 text-red-500" />
            </div>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-bold">${summaryData.spent30Days.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Total amount spent in the last 30 days
            </p>
          </CardContent>
        </Card>

        {/* Added Last 30 Days Card */}
        <Card className="overflow-hidden border border-border/40 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="bg-accent/5 px-6 py-4 flex items-center justify-between border-b">
            <CardTitle className="text-base font-medium">Added Last 30 Days</CardTitle>
            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-50">
              <CreditCard className="h-5 w-5 text-green-500" />
            </div>
          </div>
          <CardContent className="p-6">
            <div className="flex items-center gap-1">
              <span className="text-3xl font-bold">${summaryData.added30Days.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Total credits added in the last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Add Credits Button under the 3 cards has been removed as requested. */}

      {/* Tabs: Transactions, Add Credits, Invoices */}
      <Card className="border border-border/40 shadow-sm overflow-hidden">
        <CardHeader className="border-b px-6 bg-card/30">
          <h2 className="text-lg font-semibold">Billing & Transactions</h2>
        </CardHeader>

        <CardContent className="p-6">
          <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="bg-muted/50 mb-6 p-1 rounded-md">
              <TabsTrigger value="transactions" className="data-[state=active]:bg-background rounded-md">
                <History className="h-4 w-4 mr-2" />
                Transactions
              </TabsTrigger>
              {/* Only show Add Credits tab if user is not suspended */}
              {user?.isActive && (
                <TabsTrigger value="addCredits" className="data-[state=active]:bg-background rounded-md">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Credits
                </TabsTrigger>
              )}
              {/* Invoices tab hidden for client side */}
              {/* <TabsTrigger value="invoices" className="data-[state=active]:bg-background">
                <FileText className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger> */}
            </TabsList>
            
            <TabsContent value="transactions" className="mt-0">
              <div className="p-0">
                {isLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: brandColors.primary.full }}></div>
                    <p className="ml-2 font-medium text-muted-foreground">Loading transactions...</p>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 bg-muted/5 rounded-lg border border-border/40 px-6">
                    <div className="p-4 rounded-full mx-auto w-16 h-16 mb-4 flex items-center justify-center" style={{ backgroundColor: brandColors.primary.extraLight }}>
                      <FileText className="h-8 w-8" style={{ color: brandColors.primary.full }} />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No Transactions Found</h3>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      {user?.isActive 
                       ? "You don't have any transactions yet. Add credits to get started with your account."
                       : "You don't have any transactions yet. Your account is currently suspended."}
                    </p>
                    {user?.isActive ? (
                      <Button 
                        onClick={() => handleTabChange("addCredits")} 
                        className="px-6 py-2 transition-all hover:translate-y-[-1px]"
                        style={{ 
                          backgroundColor: brandColors.primary.full,
                          color: 'white'
                        }}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Add Credits
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        disabled
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
                            <Avatar className="h-9 w-9 mr-3 shadow-sm">
                              <AvatarFallback 
                                className="rounded-full flex items-center justify-center"
                                style={isCredit(transaction) ? {
                                  background: `linear-gradient(135deg, ${brandColors.primary.lighter}, ${brandColors.primary.light})`,
                                  color: brandColors.primary.full
                                } : {
                                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.2))',
                                  color: 'rgb(220, 38, 38)'
                                }}
                              >
                                {isCredit(transaction) ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{transaction.description}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <span>ID: #{transaction.id}</span>
                                {transaction.paymentMethod && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                    <span className="capitalize flex items-center">
                                      {transaction.paymentMethod === 'paypal' && 
                                        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons@develop/icons/paypal.svg" 
                                             className="h-3 w-3 mr-1 inline opacity-70" alt="PayPal" />}
                                      {transaction.paymentMethod}
                                    </span>
                                  </>
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
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {format(new Date(transaction.createdAt), 'MMM d, yyyy')}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(transaction.createdAt), 'h:mm a')}
                            </span>
                          </div>
                        ),
                      },
                      {
                        accessorKey: "status" as keyof Transaction,
                        header: "Status",
                        cell: (transaction) => {
                          const status = transaction.status.toLowerCase();
                          let variant = "default";
                          
                          switch (status) {
                            case "completed":
                              variant = "success";
                              break;
                            case "pending":
                              variant = "outline";
                              break;
                            case "failed":
                              variant = "destructive";
                              break;
                          }
                          
                          return (
                            <Badge variant={variant as any} className="capitalize font-normal">
                              {transaction.status}
                            </Badge>
                          );
                        },
                      },
                      {
                        accessorKey: "amount" as keyof Transaction,
                        header: "Amount",
                        cell: (transaction) => (
                          <div className={`font-medium ${isCredit(transaction) ? 'text-green-600' : 'text-red-600'}`}>
                            <span className="mr-1">{isCredit(transaction) ? '+' : '-'}</span>
                            ${Math.abs(transaction.amount).toFixed(2)}
                          </div>
                        ),
                      },
                      {
                        id: "actions",
                        header: "",
                        cell: (transaction) => (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => window.location.href = `/billing/transactions/${transaction.id}`}
                            className="hover:bg-primary/5 transition-colors"
                            style={{ color: brandColors.primary.full }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
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
                <div className="mb-8 bg-primary/5 p-6 rounded-lg border border-primary/20">
                  <h3 className="text-xl font-medium mb-2 flex items-center gap-2">
                    <div className="p-2 rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                      <PlusCircle className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                    </div>
                    Add Credits to Your Account
                  </h3>
                  <p className="text-muted-foreground">
                    Select the amount you want to add to your account. Credits are used to pay for server resources and other services.
                  </p>
                </div>

                <div className="mb-8">
                  <h4 className="text-sm font-medium mb-4 flex items-center">
                    <DollarSign className="h-4 w-4 mr-1" style={{ color: brandColors.primary.full }} />
                    Select Amount
                  </h4>
                  <div className="grid grid-cols-3 gap-4">
                    {creditOptions.map((amount) => (
                      <Button
                        key={amount}
                        variant={creditAmount === amount ? "default" : "outline"}
                        onClick={() => setCreditAmount(amount)}
                        className={`font-medium transition-all ${creditAmount === amount ? 'shadow-md hover:shadow-lg' : 'hover:bg-primary/5'}`}
                        style={creditAmount === amount ? { 
                          backgroundColor: brandColors.primary.full,
                          color: 'white'
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

                <div className="rounded-lg border border-border/60 p-4 mb-8 bg-card/30 shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Selected Amount:</span>
                    <span className="text-xl font-bold" style={{ color: brandColors.primary.full }}>${creditAmount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mb-8">
                  <h4 className="text-sm font-medium mb-3">Payment Method</h4>
                  <div className="rounded-lg border border-border/60 p-4 shadow-sm bg-card/30">
                    <div className="flex items-center">
                      <div className="mr-4 p-2 bg-blue-50 rounded-lg">
                        <img 
                          src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg" 
                          alt="PayPal" 
                          className="h-8" 
                        />
                      </div>
                      <div>
                        <h5 className="font-medium">PayPal</h5>
                        <p className="text-sm text-muted-foreground">Pay securely using PayPal or credit card</p>
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


          </Tabs>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}