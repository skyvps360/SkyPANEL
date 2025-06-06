import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Eye, DollarSign, CreditCard, AlertCircle, Receipt, TrendingUp, Activity } from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";
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
      cell: (item: Transaction) => (
        <span
          className={`font-medium ${item.type === 'credit' ? 'text-secondary' : 'text-destructive'}`}
          style={item.type === 'credit' ? { color: `var(--brand-secondary, ${brandColors.secondary.full})` } : undefined}
        >
          {item.type === 'credit' ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (item: Transaction) => (
        <Badge
          variant={item.type === 'credit' ? 'default' : 'outline'}
          className={item.type === 'credit' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : ''}
          style={item.type === 'credit' ? {
            backgroundColor: `var(--brand-primary, ${brandColors.primary.full})`,
            color: 'white'
          } : undefined}
        >
          {item.type}
        </Badge>
      )
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
                <span className="text-foreground">{item.paymentMethod ? item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1) : "N/A"}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Payment ID: {item.paymentId || 'None'}</p>
              <p>Type: {item.type}</p>
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
            case "pending":
              return (
                <Badge
                  variant="outline"
                  className="border-accent text-accent"
                  style={{
                    borderColor: `var(--brand-accent, ${brandColors.accent.full})`,
                    color: `var(--brand-accent, ${brandColors.accent.full})`
                  }}
                >
                  Pending
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

  // Calculate statistics
  const totalRevenue = transactions
    .filter(t => t.type === 'credit' && t.status === 'completed')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pendingTransactions = transactions.filter(t => t.status === 'pending').length;

  const totalTransactions = transactions.length;

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 space-y-8">
        {/* Modern Hero Header */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
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
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Billing Administration
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Manage billing, transactions, and VirtFusion token operations
                    </p>
                  </div>
                </div>

                {/* Billing Stats Summary */}
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      ${totalRevenue.toFixed(2)} Total Revenue
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: `var(--brand-accent, ${brandColors.accent.full})` }}
                    />
                    <span className="text-sm font-medium text-foreground">
                      {pendingTransactions} Pending
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <span className="text-3xl font-bold text-foreground">${totalRevenue.toFixed(2)}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">USD</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Total completed transactions
              </p>
            </CardContent>
          </Card>

          {/* Pending Transactions Card */}
          <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border">
              <CardTitle className="text-base font-medium text-foreground">Pending Payments</CardTitle>
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
              >
                <CreditCard
                  className="h-5 w-5"
                  style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                />
              </div>
            </div>
            <CardContent className="px-6 py-5">
              <div className="flex items-center gap-1">
                <span className="text-3xl font-bold text-foreground">{pendingTransactions}</span>
                <span className="text-sm text-muted-foreground self-end mb-1">transactions</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Awaiting payment processing
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
