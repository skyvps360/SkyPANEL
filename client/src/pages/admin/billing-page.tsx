import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Eye, DollarSign, CreditCard, AlertCircle, Receipt, TrendingUp, Activity, Download, CalendarIcon } from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";
import { useToast } from "@/hooks/use-toast";
import React, { useState } from "react";
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
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function AdminBillingPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // State for date range selection
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Fetch branding data
  const { data: brandingData } = useQuery<{
    company_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;

  }>({
    queryKey: ['/api/settings/branding'],
  });
  
  // Get brand colors for styling
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  });

  // Fetch transactions with user data (already included from the API now)
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/admin/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/admin/transactions");
      if (!response.ok) throw new Error("Failed to fetch transactions");
      
      const data = await response.json();
      return data; // User data is already included from the server
    }
  });

  // Download all transactions
  const handleDownloadAll = async () => {
    try {
      setIsDownloading(true);
      const response = await fetch('/api/admin/transactions/download/all');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download transactions');
      }
      
      // Create blob and download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'all-transactions.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: "All transactions downloaded successfully",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download transactions",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Download filtered transactions by date range
  const handleDownloadFiltered = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Error", 
        description: "Start date must be before end date",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsDownloading(true);
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      const response = await fetch(`/api/admin/transactions/download/filtered?${params}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to download transactions');
      }
      
      // Create blob and download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      a.download = `transactions-${startStr}-to-${endStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Success",
        description: `Transactions from ${startStr} to ${endStr} downloaded successfully`,
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to download filtered transactions",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const transactionColumns: DataTableColumn<Transaction>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: (item: Transaction) => <span className="font-medium">{item.id}</span>
    },
    {
      accessorKey: "user",
      header: "User",
      cell: (item: Transaction) => (
        <Link to={`/admin/users/${item.userId}`} className="cursor-pointer hover:underline">
          <div className="flex flex-col">
            <span className="font-medium">{item.user?.username || `User #${item.userId}`}</span>
            <span className="text-xs text-muted-foreground">{item.user?.email || 'No email available'}</span>
            <span className="text-xs text-muted-foreground">ID: {item.userId}</span>
          </div>
        </Link>
      )
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: (item: Transaction) => {
        const isCredit = item.type === 'virtfusion_credit' || item.type === 'dns_plan_downgrade' || item.amount > 0;
        return (
          <span
            className={`font-medium ${isCredit ? 'text-secondary' : 'text-destructive'}`}
            style={isCredit ? { color: `var(--brand-secondary, ${brandColors.secondary.full})` } : undefined}
          >
            {isCredit ? '+' : '-'}${Math.abs(item.amount).toFixed(5)}
          </span>
        );
      }
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (item: Transaction) => {
        const isCredit = item.type === 'virtfusion_credit' || item.type === 'dns_plan_downgrade' || item.amount > 0;
        const displayType = item.type === 'virtfusion_credit' ? 'VirtFusion Credit' :
                           item.type === 'credit' ? 'VirtFusion Credit' :
                           item.type === 'dns_plan_purchase' ? 'DNS Plan Purchase' :
                           item.type === 'dns_plan_upgrade' ? 'DNS Plan Upgrade' :
                           item.type === 'dns_plan_downgrade' ? 'DNS Plan Downgrade' :


                           item.type;
        return (
          <Badge
            variant={isCredit ? 'default' : 'outline'}
            className={isCredit ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
            style={isCredit ? {
              backgroundColor: `var(--brand-primary, ${brandColors.primary.full})`,
              color: 'white'
            } : undefined}
          >
            {displayType}
          </Badge>
        );
      }
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (item: Transaction) => <span>{item.description}</span>
    },
    {
      accessorKey: "paymentMethod",
      header: "Payment Method",
      cell: (item: Transaction) => (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                {item.paymentMethod === 'paypal' && <CreditCard className="h-4 w-4 text-blue-500" />}
                {item.paymentMethod === 'credit' && (
                  <DollarSign
                    className="h-4 w-4"
                    style={{ color: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                  />
                )}
                {!item.paymentMethod && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                <span className="text-foreground">
                  {item.paymentMethod
                    ? (item.paymentMethod === 'virtfusion_tokens' ? 'VirtFusion Tokens' : item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1))
                    : "N/A"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Payment ID: {item.paymentId || 'None'}</p>
              <p>Type: {item.type === 'virtfusion_credit' ? 'VirtFusion Credit' :
                       item.type === 'credit' ? 'VirtFusion Credit' :
                       item.type === 'dns_plan_purchase' ? 'DNS Plan Purchase' :
                       item.type === 'dns_plan_upgrade' ? 'DNS Plan Upgrade' :
                       item.type === 'dns_plan_downgrade' ? 'DNS Plan Downgrade' :

                       item.type}</p>
              <p>Status: {item.status}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (item: Transaction) => {
        const getStatusBadge = (status: string) => {
          switch (status.toLowerCase()) {
            case "completed":
              return (
                <Badge
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  style={{
                    backgroundColor: `var(--brand-secondary, ${brandColors.secondary.full})`,
                    color: 'white'
                  }}
                >
                  Completed
                </Badge>
              );
            
            case "failed":
              return <Badge variant="destructive">Failed</Badge>;
            default:
              return <Badge variant="outline">{status}</Badge>;
          }
        };

        return getStatusBadge(item.status);
      }
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: (item: Transaction) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">
            {format(new Date(item.createdAt), "MMM d, yyyy")}
          </span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(item.createdAt), "h:mm a")}
          </span>
        </div>
      )
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item: Transaction) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/admin/billing/transactions/${item.id}`)}
          title="View Transaction"
          className="hover:bg-primary/5 text-primary transition-colors"
          style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      )
    },
  ];

  // Calculate statistics - unified billing revenue from all credit types
  const totalRevenue = transactions
    .filter(t => {
      // Include all credit purchases that add money to the system
      const isCreditPurchase = t.type === 'virtfusion_credit' ||
                              t.type === 'credit';
      return isCreditPurchase && t.status === 'completed' && Number(t.amount) > 0;
    })
    .reduce((sum, t) => sum + Number(t.amount), 0);

  

  const totalTransactions = transactions.length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Modern Hero Header */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-4 sm:p-6 md:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div
                    className="flex items-center justify-center h-12 w-12 rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                  >
                    <DollarSign className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Billing Administration
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base md:text-lg mt-1">
                      Manage billing, transactions, and VirtFusion token operations
                    </p>
                  </div>
                </div>

                {/* Billing Stats Summary */}
                <div className="flex flex-wrap gap-3 sm:gap-4 md:gap-6 mt-4 sm:mt-6">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      ${totalRevenue.toFixed(5)} Total Revenue
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {totalTransactions} Total Transactions
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Total Revenue Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Total Revenue</CardTitle>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})` }}
              >
                <DollarSign
                  className="h-5 w-5"
                  style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                />
              </div>
            </div>
            <CardContent className="px-6 py-5">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-foreground">${totalRevenue.toFixed(5)}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                VirtFusion token billing system
              </p>
            </CardContent>
          </Card>

          

          {/* Total Transactions Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Total Activity</CardTitle>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `var(--brand-secondary-lighter, ${brandColors.secondary.lighter})` }}
              >
                <Activity
                  className="h-5 w-5"
                  style={{ color: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                />
              </div>
            </div>
            <CardContent className="px-6 py-5">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-foreground">{totalTransactions}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">total</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                All transaction records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Transaction History Card */}
        <Card className="bg-card border border-border shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-3">
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})` }}
                >
                  <Receipt
                    className="h-5 w-5"
                    style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                  />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-foreground">Transaction History</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    View all VirtFusion token transactions across all users. Search by username, email, ID, or description.
                  </CardDescription>
                </div>
              </div>
              
              {/* Download Controls */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
                {/* Download All Button */}
                <Button
                  onClick={handleDownloadAll}
                  disabled={isDownloading}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {isDownloading ? "Downloading..." : "Download All"}
                </Button>
                
                {/* Date Range Selector */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  {/* Start Date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full sm:w-[140px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MMM dd, yyyy") : "Start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* End Date */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full sm:w-[140px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MMM dd, yyyy") : "End date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  {/* Download Filtered Button */}
                  <Button
                    onClick={handleDownloadFiltered}
                    disabled={isDownloading || !startDate || !endDate}
                    size="sm"
                    className="w-full sm:w-auto"
                    style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isDownloading ? "Downloading..." : "Download Range"}
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <DataTable
              columns={transactionColumns}
              data={transactions}
              isLoading={isLoading}
              emptyMessage="No transactions found"
              enableSearch={true}
              searchPlaceholder="Search transactions by user, description, ID, or status..."
              enablePagination={true}
              defaultPageSize={5}
              pageSizeOptions={[5, 10, 25, 50, 100]}
              searchFunction={(transaction, query) => {
                const searchLower = query.toLowerCase();
                // Search by user's email, username, transaction description, ID, payment method, and status
                return (
                  transaction.user?.email?.toLowerCase().includes(searchLower) ||
                  transaction.user?.username?.toLowerCase().includes(searchLower) ||
                  transaction.userId.toString().includes(searchLower) ||
                  transaction.description?.toLowerCase().includes(searchLower) ||
                  transaction.id.toString().includes(searchLower) ||
                  transaction.paymentMethod?.toLowerCase().includes(searchLower) ||
                  transaction.status?.toLowerCase().includes(searchLower) ||
                  transaction.type?.toLowerCase().includes(searchLower)
                );
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
