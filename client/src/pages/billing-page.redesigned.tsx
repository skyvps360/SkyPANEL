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
import { PlusCircle, MinusCircle, Download, CreditCard, DollarSign, Receipt, FileText, History, ExternalLink, Eye, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PayPalCheckout } from "@/components/billing/PayPalCheckout";
import { useAuth } from "@/hooks/use-auth";
import { getBrandColors, getButtonStyles } from "@/lib/brand-theme";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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

export default function BillingPage() {
  const { user } = useAuth();
  const [creditAmount, setCreditAmount] = useState(50);
  const [activeTab, setActiveTab] = useState("transactions");
  
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

  // Fetch credit balance
  const { data: balanceData } = useQuery<{ credits: number, virtFusionCredits: number, virtFusionTokens: number }>({
    queryKey: ["/api/billing/balance"],
  });
  
  // Fetch VirtFusion usage data for last 30 days
  const { data: usageData } = useQuery<{ usage: number, rawData: any }>({
    queryKey: ["/api/billing/usage/last30days"],
    onSuccess: (data) => {
      console.log("VirtFusion usage data:", data);
    },
    onError: (error) => {
      console.error("VirtFusion usage API error:", error);
    }
  });
  
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
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <Button 
            variant="outline"
            className="flex items-center hover:bg-primary/10"
            onClick={handleExportTransactions}
          >
            <Download className="h-4 w-4 mr-2" />
            Export Transactions
          </Button>
          
          {user?.isActive && (
            <Button 
              className="flex items-center"
              onClick={() => handleTabChange("addCredits")}
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Credits
            </Button>
          )}
        </div>
      </div>

      {/* Billing Summary Cards - Modernized Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Balance Card */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-primary/5 px-6 py-4 border-b">
            <h3 className="font-medium text-sm text-primary">Current Balance</h3>
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Available</span>
                <div className="text-3xl font-bold">${summaryData.balance.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Show VirtFusion tokens section when available */}
            {hasVirtFusionBalance && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">VirtFusion Tokens</span>
                  <span className="font-medium text-primary">{summaryData.virtFusionTokens.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                  <span>100 tokens = $1.00 USD</span>
                  <span>${(summaryData.virtFusionTokens / 100).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
              </div>
            )}
          </CardContent>
          
          {user?.isActive && (
            <div className="px-6 py-4 bg-muted/20 border-t">
              <Button 
                className="w-full"
                onClick={() => handleTabChange("addCredits")}
                variant="outline"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Credits
              </Button>
            </div>
          )}
        </Card>

        {/* Spent Last 30 Days Card */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-destructive/5 px-6 py-4 border-b">
            <h3 className="font-medium text-sm text-destructive">Spent Last 30 Days</h3>
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mr-4">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Debits</span>
                <div className="text-3xl font-bold">${summaryData.spent30Days.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Service usage and consumption for the last 30 days
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Added Last 30 Days Card */}
        <Card className="overflow-hidden border-none shadow-md">
          <div className="bg-primary/5 px-6 py-4 border-b">
            <h3 className="font-medium text-sm text-primary">Added Last 30 Days</h3>
          </div>
          
          <CardContent className="p-6">
            <div className="flex items-center mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mr-4">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Total Credits</span>
                <div className="text-3xl font-bold">${summaryData.added30Days.toFixed(2)}</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                All credit additions and payments in the last 30 days
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Transactions, Add Credits */}
      <Card className="border shadow-sm">
        <CardHeader className="border-b px-6">
          <CardTitle>Billing & Transactions</CardTitle>
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
                      >
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
                            <Avatar className="h-8 w-8 mr-3">
                              <AvatarFallback 
                                className={cn(
                                  "flex items-center justify-center",
                                  isCredit(transaction) 
                                    ? "bg-primary/10 text-primary"
                                    : "bg-destructive/10 text-destructive"
                                )}
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
                          
                          return (
                            <Badge variant={
                              status === "completed" ? "default" : 
                              status === "pending" ? "outline" : 
                              "destructive"
                            }>
                              {transaction.status}
                            </Badge>
                          );
                        },
                      },
                      {
                        accessorKey: "amount" as keyof Transaction,
                        header: "Amount",
                        cell: (transaction) => (
                          <div className={cn(
                            "text-sm font-medium",
                            isCredit(transaction) ? "text-primary" : "text-destructive"
                          )}>
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
                            className="hover:bg-primary/10"
                            onClick={() => window.location.href = `/billing/transactions/${transaction.id}`}
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
                        className={cn(
                          creditAmount === amount && "bg-primary text-primary-foreground" 
                        )}
                      >
                        ${amount}
                      </Button>
                    ))}
                  </div>
                </div>

                <Card className="mb-6 bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Selected Amount:</span>
                      <span className="font-medium text-primary">${creditAmount.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="mb-8">
                  <h4 className="text-sm font-medium mb-3">Payment Method</h4>
                  <Card>
                    <CardContent className="p-4">
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
                    </CardContent>
                  </Card>
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
