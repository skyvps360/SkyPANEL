import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { Download, Eye, DollarSign, Receipt, History, CreditCard, User, AlertCircle } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";

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
  user: {
    id: number;
    username: string;
    email: string;
  };
}

export default function AdminBillingPage() {
  const [, navigate] = useLocation();
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

  // Fetch invoices with user data (already included from the API now)
  const { data: invoices = [], isLoading: isLoadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/admin/invoices"],
    queryFn: async () => {
      const response = await fetch("/api/admin/invoices");
      if (!response.ok) throw new Error("Failed to fetch invoices");
      
      const data = await response.json();
      return data; // User data is already included from the server
    }
  });

  // Handle generating missing invoices
  const generateMissingInvoices = async () => {
    setGeneratingInvoices(true);
    try {
      const response = await fetch("/api/admin/invoices/generate-missing", {
        method: "POST"
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate missing invoices");
      }
      
      // Invalidate and refetch invoices
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/invoices"] });
      
      toast({
        title: "Success",
        description: "Missing invoices have been generated successfully",
      });
    } catch (error) {
      console.error("Error generating invoices:", error);
      toast({
        title: "Error",
        description: "Failed to generate missing invoices",
        variant: "destructive"
      });
    } finally {
      setGeneratingInvoices(false);
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
  ];

  const invoiceColumns: DataTableColumn<Invoice>[] = [
    {
      accessorKey: "id" as keyof Invoice,
      header: "ID",
      cell: (item: Invoice) => <span className="font-medium">{item.id}</span>
    },
    {
      accessorKey: "invoiceNumber" as keyof Invoice,
      header: "Invoice #",
      cell: (item: Invoice) => <span className="font-medium">{item.invoiceNumber}</span>
    },
    {
      accessorKey: "user" as keyof Invoice,
      header: "User",
      cell: (item: Invoice) => (
        <Link to={`/admin/users/edit/${item.userId}`} className="cursor-pointer hover:underline">
          <div className="flex flex-col">
            <span className="font-medium">{item.user?.username || `User #${item.userId}`}</span>
            <span className="text-xs text-muted-foreground">{item.user?.email || 'No email available'}</span>
            <span className="text-xs text-muted-foreground">ID: {item.userId}</span>
          </div>
        </Link>
      )
    },
    {
      accessorKey: "totalAmount" as keyof Invoice,
      header: "Total Amount",
      cell: (item: Invoice) => (
        <span className="font-medium">${Number(item.totalAmount).toFixed(2)}</span>
      )
    },
    {
      accessorKey: "status" as keyof Invoice,
      header: "Status",
      cell: (item: Invoice) => (
        <Badge variant={item.status === 'paid' ? 'success' : (item.status === 'pending' ? 'outline' : 'destructive')}>
          {item.status}
        </Badge>
      )
    },
    {
      accessorKey: "createdAt" as keyof Invoice,
      header: "Created",
      cell: (item: Invoice) => <span>{format(new Date(item.createdAt), "MMM d, yyyy")}</span>
    },
    {
      id: "actions",
      header: "Actions",
      cell: (item: Invoice) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(`/admin/billing/invoices/${item.id}`)}
            title="View Invoice"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.location.href = `/api/admin/invoices/${item.id}/download`}
            title="Download Invoice"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Billing Administration</h1>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={generateMissingInvoices}
              disabled={generatingInvoices}
            >
              {generatingInvoices ? "Generating..." : "Generate Missing Invoices"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-lg">Active Invoices</CardTitle>
              <CardDescription>Number of pending/unpaid invoices</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {invoices.filter(i => i.status !== 'paid').length}
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

        <Tabs
          defaultValue={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="mb-4">
            <TabsTrigger value="transactions" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>Transactions</span>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Invoices</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="transactions" className="space-y-4">
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
          </TabsContent>
          
          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoices</CardTitle>
                <CardDescription>View all user invoices. Search by username, email, ID, or invoice number.</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable 
                  columns={invoiceColumns} 
                  data={invoices}
                  isLoading={isLoadingInvoices}
                  emptyMessage="No invoices found"
                  searchFunction={(invoice, query) => {
                    const searchLower = query.toLowerCase();
                    // Search by invoice number, user's email or username
                    if (invoice.user?.email?.toLowerCase().includes(searchLower) || 
                        invoice.user?.username?.toLowerCase().includes(searchLower) || 
                        invoice.userId.toString().includes(searchLower) ||
                        invoice.invoiceNumber?.toLowerCase().includes(searchLower) ||
                        invoice.id.toString().includes(searchLower)) {
                      return true;
                    }
                    return false;
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
