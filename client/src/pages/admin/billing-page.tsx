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
import { Eye, DollarSign, CreditCard, AlertCircle } from "lucide-react";
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
        <span className={item.type === 'credit' ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
          {item.type === 'credit' ? '+' : '-'}${Math.abs(item.amount).toFixed(2)}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: (item: Transaction) => (
        <Badge variant={item.type === 'credit' ? 'default' : 'outline'}>
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
                {item.paymentMethod === 'stripe' && <CreditCard className="h-4 w-4 text-purple-500" />}
                {item.paymentMethod === 'credit' && <DollarSign className="h-4 w-4 text-green-500" />}
                {!item.paymentMethod && <AlertCircle className="h-4 w-4 text-gray-400" />}
                <span>{item.paymentMethod ? item.paymentMethod.charAt(0).toUpperCase() + item.paymentMethod.slice(1) : "N/A"}</span>
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
      cell: (item: Transaction) => (
        <Badge variant={item.status === 'completed' ? 'success' : (item.status === 'pending' ? 'outline' : 'destructive')}>
          {item.status}
        </Badge>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: (item: Transaction) => <span>{format(new Date(item.createdAt), "MMM d, yyyy HH:mm")}</span>
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item: Transaction) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/admin/billing/transactions/${item.id}`)}
          title="View Transaction"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )
    },
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Billing Administration</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Revenue</CardTitle>
              <CardDescription>Total completed transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  ${transactions
                    .filter(t => t.type === 'credit' && t.status === 'completed')
                    .reduce((sum, t) => sum + Number(t.amount), 0)
                    .toFixed(2)}
                </span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Payment Processing</CardTitle>
              <CardDescription>Pending payment transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {transactions.filter(t => t.status === 'pending').length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>View all transactions across all users. Search by username, email, ID, or description.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={transactionColumns} 
              data={transactions}
              isLoading={isLoading}
              emptyMessage="No transactions found"
              searchFunction={(transaction, query) => {
                const searchLower = query.toLowerCase();
                // Search by user's email or username
                if (transaction.user?.email?.toLowerCase().includes(searchLower) || 
                    transaction.user?.username?.toLowerCase().includes(searchLower) ||
                    transaction.userId.toString().includes(searchLower) ||
                    transaction.description?.toLowerCase().includes(searchLower) ||
                    transaction.id.toString().includes(searchLower)) {
                  return true;
                }
                return false;
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
