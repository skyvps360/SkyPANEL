import React, { useState, useRef } from "react";
import { queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { PlusCircle, MinusCircle, Download, CreditCard, DollarSign, History, Eye, Receipt, FileText, Edit3, Search, ChevronDown, Ticket } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PayPalCheckout } from "@/components/billing/PayPalCheckout";

import { useAuth } from "@/hooks/use-auth";
import { getBrandColors, getButtonStyles } from "@/lib/brand-theme";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  description: string;
  status: string;
  paymentMethod?: string;
  paymentId?: string;
  virtFusionCreditId?: string;
  createdAt: string;
}



export default function BillingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [creditAmount, setCreditAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountError, setCustomAmountError] = useState("");
  const [activeTab, setActiveTab] = useState("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");

  // Ref for the Billing & Transactions card
  const billingTransactionsRef = useRef<HTMLDivElement>(null);




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

  // Handle tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  // Scroll to billing card function
  const scrollToBillingCard = () => {
    setActiveTab("addCredits");
    
    // Use a longer delay and ensure element is ready
    setTimeout(() => {
      if (billingTransactionsRef.current) {
        // Force a reflow to ensure layout is complete
        billingTransactionsRef.current.offsetHeight;
        
        billingTransactionsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    }, 300);
  };

  // Fetch transactions
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });



  // Filter transactions based on search query and status filter
  const filteredTransactions = React.useMemo(() => {
    return transactions.filter(transaction => {
      // Filter by status
      if (statusFilter !== 'all' && transaction.status.toLowerCase() !== statusFilter.toLowerCase()) {
        return false;
      }

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchInCreditId = (transaction as any).virtFusionCreditId?.toLowerCase?.() || '';
        const searchInCreditIdNoHyphens = searchInCreditId.replace(/-/g, '');
        const queryNoHyphens = query.replace(/-/g, '');

        return (
          transaction.description.toLowerCase().includes(query) ||
          transaction.id.toString().includes(query) ||
          transaction.amount.toString().includes(query) ||
          transaction.status.toLowerCase().includes(query) ||
          (transaction.paymentId && transaction.paymentId.toLowerCase().includes(query)) ||
          searchInCreditId.includes(query) ||
          searchInCreditIdNoHyphens.includes(queryNoHyphens)
        );
      }

      return true;
    });
  }, [transactions, searchQuery, statusFilter]);



  // Fetch balance data (VirtFusion tokens only)
  const { data: balanceData } = useQuery<{
    virtFusionCredits: number,
    virtFusionTokens: number
  }>({
    queryKey: ["/api/billing/balance"],
  });

  // Fetch user's coupon history
  const { data: couponHistoryResponse } = useQuery<{
    history: Array<{
      id: number;
      couponCode: string;
      couponDescription: string | null;
      tokensReceived: number;
      virtfusionCreditId: string | null;
      transactionId: number | null;
      usedAt: string;
    }>;
  }>({
    queryKey: ["/api/coupons/history"],
  });

  // Extract the history array from the response
  const couponHistory = couponHistoryResponse?.history || [];

  // Coupon claim mutation
  const claimCouponMutation = useMutation({
    mutationFn: (code: string) => apiRequest("/api/coupons/claim", {
      method: "POST",
      body: { code },
    }),
    onSuccess: (data: any) => {
      toast({
        title: "Success!",
        description: data.message,
      });
      setCouponCode("");
      setCouponError("");
      // Refresh relevant data
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/coupons/history"] });
    },
    onError: (error: any) => {
      setCouponError(error.message || "Failed to claim coupon");
      toast({
        title: "Error",
        description: error.message || "Failed to claim coupon",
        variant: "destructive",
      });
    },
  });

  // Fetch VirtFusion usage data for last 30 days
  const { data: usageData, isError: usageError, error: usageErrorData } = useQuery<{ usage: number, rawData: any }>({
    queryKey: ["/api/billing/usage/last30days"],
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    retry: 1, // Only retry once on failure
    retryDelay: 5000, // Wait 5 seconds before retry
  });

  // Log usage data when it changes - use useCallback to prevent re-renders
  const logUsageData = React.useCallback(() => {
    if (usageData) {
      // VirtFusion usage data logged
    }
    if (usageError) {
      console.error("VirtFusion usage API error:", usageErrorData);
    }
  }, [usageData, usageError, usageErrorData]);

  React.useEffect(() => {
    logUsageData();
  }, [logUsageData]);



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

  // Calculate billing summary for VirtFusion data
  const hasVirtFusionBalance = balanceData?.virtFusionCredits && balanceData.virtFusionCredits > 0;

  // Calculate the spent and added amounts for the last 30 days from transactions
  const spentFromTransactions = transactions
    .filter(t => isDebit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const addedFromTransactions = transactions
    .filter(t => isCredit(t) && new Date(t.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  const summaryData = {
    // Use VirtFusion balance only - use nullish coalescing to preserve negative balances
    balance: balanceData?.virtFusionCredits ?? 0,
    virtFusionTokens: balanceData?.virtFusionTokens ?? 0,

    // Combine VirtFusion API usage data with transaction-based spending
    spent30Days: ((usageData && 'usage' in usageData) ? usageData.usage : 0) + spentFromTransactions,
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
                {formatTransactionDescription(transaction)}
              </a>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-2">
              {transaction.virtFusionCreditId && (
                <span className="text-primary font-medium">Credit ID: {transaction.virtFusionCreditId}</span>
              )}
              {transaction.paymentMethod && (
                <>
                  {transaction.virtFusionCreditId && <span className="w-1 h-1 rounded-full bg-gray-400"></span>}
                  <span className="capitalize">{transaction.paymentMethod}</span>
                </>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amount" as keyof Transaction,
      header: "Amount",
      cell: (transaction: Transaction) => (
        <div className={`text-sm ${isCredit(transaction) ? 'text-accent' : 'text-destructive'}`}>
          {isCredit(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(5)}
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



  // VirtFusion token amount options
  const creditOptions = [1, 2, 5, 10, 25, 50, 100, 250, 500];

  // Handle predefined amount selection
  const handlePredefinedAmountSelect = (amount: number) => {
    setCreditAmount(amount);
    setIsCustomAmount(false);
    setCustomAmount("");
    setCustomAmountError("");
  };

  // Handle custom amount input
  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitizedValue = value.replace(/[^0-9.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (sanitizedValue.match(/\./g) || []).length;
    if (decimalCount > 1) return;

    setCustomAmount(sanitizedValue);

    if (sanitizedValue) {
      const numValue = parseFloat(sanitizedValue);

      // Validate amount
      if (isNaN(numValue)) {
        setCustomAmountError("Please enter a valid amount");
      } else if (numValue < 1) {
        setCustomAmountError("Minimum amount is $1.00");
      } else if (numValue > 1000) {
        setCustomAmountError("Maximum amount is $1000.00");
      } else {
        setCustomAmountError("");
        setCreditAmount(numValue);
        setIsCustomAmount(true);
      }
    } else {
      setCustomAmountError("");
    }
  };

  // Handle coupon code validation
  const validateCoupon = async (code: string) => {
    if (!code.trim()) {
      setCouponError("Please enter a coupon code");
      return false;
    }

    try {
      await apiRequest("/api/coupons/validate", {
        method: "POST",
        body: { code: code.trim() },
      });
      setCouponError("");
      return true;
    } catch (error: any) {
      setCouponError(error.message || "Invalid coupon code");
      return false;
    }
  };

  // Handle coupon claim
  const handleClaimCoupon = async () => {
    const code = couponCode.trim();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }

    const isValid = await validateCoupon(code);
    if (isValid) {
      claimCouponMutation.mutate(code);
    }
  };

  // Handle coupon code input change
  const handleCouponCodeChange = (value: string) => {
    setCouponCode(value);
    if (couponError) {
      setCouponError("");
    }
  };

  // Get the final amount to use for payment
  const getFinalAmount = () => {
    if (isCustomAmount && customAmount) {
      const numValue = parseFloat(customAmount);
      if (!isNaN(numValue) && numValue >= 1 && numValue <= 1000) {
        return numValue;
      }
    }
    return creditAmount;
  };



  return (
    <>
      
      <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-300/60 shadow-xl">
          <div className="p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Billing & Payments
                  </h1>
                  <p className="text-muted-foreground text-lg mt-1">
                    Manage your account balance and view transactions
                  </p>
                </div>
              </div>

              {/* Enhanced Billing Stats Summary with Clear Credit Type Distinction */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${summaryData.balance < 0 ? 'bg-red-600' : 'bg-primary'}`} />
                  <span className={`text-sm font-medium ${summaryData.balance < 0 ? 'text-red-600' : 'text-foreground'}`}>
                    VirtFusion Tokens: ${summaryData.balance.toFixed(5)} {summaryData.balance < 0 ? 'Overdrawn' : 'Available'}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm font-medium text-foreground">
                    ${summaryData.spent30Days.toFixed(5)} Spent (30d)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-sm font-medium text-foreground">
                    ${summaryData.added30Days.toFixed(5)} Added (30d)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
              <Button
                variant="outline"
                className="transition-all duration-200"
                onClick={handleExportTransactions}
              >
                <Download className="h-4 w-4 mr-2" />
                Export Transactions
              </Button>
              {user?.isActive && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Credits
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={scrollToBillingCard}>
                      <DollarSign className="h-4 w-4 mr-2" />
                      VirtFusion Tokens
                    </DropdownMenuItem>

                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          {/* Abstract background shapes */}
          <div className="absolute top-0 left-0 w-full h-full z-0">
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-10"
              style={{ backgroundColor: brandColors.primary.full }}></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-5"
              style={{ backgroundColor: brandColors.secondary.full }}></div>
          </div>
        </div>

        {/* Billing Summary - Modern Card Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* VirtFusion Tokens Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">VirtFusion Tokens</CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
            <CardContent className="p-6">
              <div className="mb-2">
                <div className="flex items-center gap-1">
                  <span className={`text-2xl font-bold ${summaryData.virtFusionTokens < 0 ? 'text-red-600' : 'text-primary'}`}>
                    {summaryData.virtFusionTokens.toLocaleString()}
                  </span>
                  <span className="text-sm text-muted-foreground self-end mb-1">tokens</span>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <span>${(summaryData.virtFusionTokens / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                <br />
                <span className="text-xs">For KVM VPS & DKVM Servers</span>
              </div>
            </CardContent>
          </Card>



          {/* Spent Last 30 Days Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Spent Last 30 Days</CardTitle>
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Receipt className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-foreground">${summaryData.spent30Days.toFixed(5)}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Total amount spent in the last 30 days
              </p>
            </CardContent>
          </Card>

          {/* Added Last 30 Days Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Added Last 30 Days</CardTitle>
              <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <PlusCircle className="h-5 w-5 text-secondary" />
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-foreground">${summaryData.added30Days.toFixed(5)}</span>
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
        <Card ref={billingTransactionsRef} className="bg-card border border-border shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold text-foreground">Billing & Transactions</h2>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="bg-muted mb-6 p-1 rounded-md">
                <TabsTrigger value="transactions" className="data-[state=active]:bg-background rounded-md">
                  <History className="h-4 w-4 mr-2" />
                  Transactions
                </TabsTrigger>
                {/* Add VirtFusion Tokens tab */}
                {user?.isActive && (
                  <TabsTrigger value="addCredits" className="data-[state=active]:bg-background rounded-md">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    VirtFusion Tokens
                  </TabsTrigger>
                )}
                {/* Add Coupons tab */}
                {user?.isActive && (
                  <TabsTrigger value="coupons" className="data-[state=active]:bg-background rounded-md">
                    <Ticket className="h-4 w-4 mr-2" />
                    Coupons
                  </TabsTrigger>
                )}

              </TabsList>

              <TabsContent value="transactions" className="mt-0">
                <div className="p-0">
                  {/* Search and Filter Bar */}
                  <div className="mb-6 p-1 bg-muted/30 rounded-lg">
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search transactions..."
                          className="pl-9 bg-background"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="w-full md:w-48">
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="all">All Statuses</option>
                          <option value="completed">Completed</option>
                          <option value="pending">Pending</option>
                          <option value="failed">Failed</option>
                        </select>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleExportTransactions}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>

                  {isLoading ? (
                    <div className="flex justify-center items-center py-12">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      <p className="ml-2 font-medium text-muted-foreground">Loading transactions...</p>
                    </div>
                  ) : filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 bg-muted/5 rounded-lg border border-border px-6">
                      <div className="p-4 rounded-full mx-auto w-16 h-16 mb-4 bg-primary/10 flex items-center justify-center">
                        <FileText className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium mb-2 text-foreground">
                        {searchQuery || statusFilter !== 'all'
                          ? 'No matching transactions found'
                          : 'No Transactions Found'}
                      </h3>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        {searchQuery || statusFilter !== 'all'
                          ? 'Try adjusting your search or filter criteria.'
                          : user?.isActive
                            ? "You don't have any transactions yet. Add credits to get started with your account."
                            : "You don't have any transactions yet. Your account is currently suspended."}
                      </p>
                      {user?.isActive ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button className="px-6 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:translate-y-[-1px]">
                              <PlusCircle className="h-4 w-4 mr-2" />
                              Add Credits
                              <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="center" className="w-56">
                            <DropdownMenuItem onClick={scrollToBillingCard}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              VirtFusion Tokens
                            </DropdownMenuItem>

                          </DropdownMenuContent>
                        </DropdownMenu>
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
                      data={filteredTransactions}
                      columns={[
                        {
                          accessorKey: "description" as keyof Transaction,
                          header: "Transaction",
                          cell: (transaction) => (
                            <div className="flex items-center">
                              <Avatar className="h-9 w-9 mr-3 shadow-sm">
                                <AvatarFallback
                                  className={`rounded-full flex items-center justify-center ${isCredit(transaction)
                                      ? 'bg-primary/10 text-primary'
                                      : 'bg-destructive/10 text-destructive'
                                    }`}
                                >
                                  {isCredit(transaction) ? <PlusCircle className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="text-sm font-medium text-foreground">{formatTransactionDescription(transaction)}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span>ID: #{transaction.id}</span>

                                  {/* Transaction Type Badge */}
                                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${transaction.type === 'virtfusion_credit'
                                      ? 'bg-blue-100 text-blue-700'

                                      : transaction.type === 'credit'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                    {transaction.type === 'virtfusion_credit'
                                      ? 'VirtFusion Credit'

                                      : transaction.type === 'credit'
                                        ? 'VirtFusion Credit'
                                        : transaction.type}
                                  </span>

                                  {transaction.virtFusionCreditId && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50"></span>
                                      <span className="text-primary font-medium">Credit ID: {transaction.virtFusionCreditId}</span>
                                    </>
                                  )}
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
                              <span className="text-sm font-medium text-foreground">
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
                            <div className={`font-medium ${isCredit(transaction) ? 'text-secondary' : 'text-destructive'}`}>
                              <span className="mr-1">{isCredit(transaction) ? '+' : '-'}</span>
                              ${Math.abs(transaction.amount).toFixed(5)}
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
                              className="hover:bg-primary hover:text-primary-foreground text-primary transition-colors"
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
                    <h3 className="text-xl font-medium mb-2 flex items-center gap-2 text-foreground">
                      <div className="p-2 rounded-full bg-primary/10">
                        <PlusCircle className="h-5 w-5 text-primary" />
                      </div>
                      Add VirtFusion Tokens
                    </h3>
                    <p className="text-muted-foreground">
                      Purchase VirtFusion tokens instantly via PayPal. These digital tokens are used to pay for server resources and services.
                      <br />
                      <span className="text-sm font-medium">Exchange Rate: 100 tokens = $1.00 USD • Digital Service • No Shipping Required</span>
                    </p>
                  </div>

                  <div className="mb-8">
                    <h4 className="text-sm font-medium mb-4 flex items-center text-foreground">
                      <DollarSign className="h-4 w-4 mr-1 text-primary" />
                      Select Amount
                    </h4>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {creditOptions.map((amount) => (
                        <Button
                          key={amount}
                          variant={!isCustomAmount && creditAmount === amount ? "default" : "outline"}
                          onClick={() => handlePredefinedAmountSelect(amount)}
                          className={`font-medium transition-all duration-150 ${!isCustomAmount && creditAmount === amount
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg'
                              : 'hover:bg-primary/30 text-primary border-primary/80 hover:border-primary hover:shadow-lg hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-primary/50'
                            }`}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="border-t border-border pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Edit3 className="h-4 w-4 text-primary" />
                        <Label htmlFor="customAmount" className="text-sm font-medium text-foreground">
                          Or enter a custom amount ($1 - $1000)
                        </Label>
                      </div>
                      <div className="max-w-sm">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="customAmount"
                            type="text"
                            placeholder="0.00"
                            value={customAmount}
                            onChange={(e) => handleCustomAmountChange(e.target.value)}
                            className={`pl-8 ${customAmountError ? 'border-destructive' : ''} ${isCustomAmount ? 'ring-2 ring-primary/20 border-primary' : ''}`}
                          />
                        </div>
                        {customAmountError && (
                          <p className="text-sm text-destructive mt-1">{customAmountError}</p>
                        )}
                        {isCustomAmount && !customAmountError && customAmount && (
                          <p className="text-sm text-secondary mt-1">
                            Custom amount: ${parseFloat(customAmount).toFixed(2)} = {(parseFloat(customAmount) * 100).toLocaleString()} tokens
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border p-4 mb-8 bg-muted/30 shadow-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Selected Amount:</span>
                      <span className="text-xl font-bold text-primary">
                        ${getFinalAmount().toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <span>VirtFusion Tokens:</span>
                      <span className="font-medium">{(getFinalAmount() * 100).toLocaleString()} tokens</span>
                    </div>
                    {isCustomAmount && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Custom amount selected
                      </div>
                    )}
                  </div>

                  {/* Only show PayPal checkout if amount is valid */}
                  {(!isCustomAmount || (isCustomAmount && !customAmountError && customAmount)) && (
                    <PayPalCheckout amount={getFinalAmount()} />
                  )}

                  {/* Show error message if custom amount is invalid */}
                  {isCustomAmount && customAmountError && (
                    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
                      <p className="text-destructive font-medium">Please enter a valid amount between $1.00 and $1000.00</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="coupons" className="mt-0">
                <div className="max-w-4xl mx-auto">
                  {/* Coupon Claiming Section */}
                  <div className="mb-8 bg-primary/5 p-6 rounded-lg border border-primary/20">
                    <h3 className="text-xl font-medium mb-2 flex items-center gap-2 text-foreground">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Ticket className="h-5 w-5 text-primary" />
                      </div>
                      Claim Coupon
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      Enter a coupon code to claim VirtFusion tokens or credits. Coupons can only be used once per account.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Enter coupon code"
                          value={couponCode}
                          onChange={(e) => handleCouponCodeChange(e.target.value)}
                          className={couponError ? 'border-destructive' : ''}
                          disabled={claimCouponMutation.isPending}
                        />
                        {couponError && (
                          <p className="text-sm text-destructive mt-1">{couponError}</p>
                        )}
                      </div>
                      <Button
                        onClick={handleClaimCoupon}
                        disabled={!couponCode.trim() || claimCouponMutation.isPending}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        {claimCouponMutation.isPending ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Claiming...
                          </>
                        ) : (
                          <>
                            <Ticket className="h-4 w-4 mr-2" />
                            Claim Coupon
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Coupon History Section */}
                  <div>
                    <h4 className="text-lg font-medium mb-4 flex items-center gap-2 text-foreground">
                      <History className="h-5 w-5 text-primary" />
                      Coupon History
                    </h4>

                    {couponHistory.length === 0 ? (
                      <div className="text-center py-12 bg-muted/5 rounded-lg border border-border px-6">
                        <div className="p-4 rounded-full mx-auto w-16 h-16 mb-4 bg-primary/10 flex items-center justify-center">
                          <Ticket className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-lg font-medium mb-2 text-foreground">No Coupons Claimed Yet</h3>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                          You haven't claimed any coupons yet. Enter a coupon code above to get started.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {couponHistory.map((usage) => (
                          <div key={usage.id} className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-full bg-secondary/10">
                                  <Ticket className="h-4 w-4 text-secondary" />
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{usage.couponCode}</div>
                                  {usage.couponDescription && (
                                    <div className="text-sm text-muted-foreground">{usage.couponDescription}</div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-secondary">+{usage.tokensReceived.toLocaleString()} tokens</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(new Date(usage.usedAt), 'MMM d, yyyy')}
                                </div>
                              </div>
                            </div>
                            {usage.virtfusionCreditId && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                VirtFusion Credit ID: {usage.virtfusionCreditId}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
    </>
  );
}