import { useQuery } from "@tanstack/react-query";
import { PlusCircle, MinusCircle } from "lucide-react";
import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

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

// Helper function to determine if a transaction is a credit/addition
const isCredit = (transaction: Transaction) => {
  return (
    transaction.type === "virtfusion_credit" ||
    transaction.type === "custom_credit" ||
    transaction.type === "admin_credit_add"
  );
};

// Helper function to determine if a transaction is a debit/removal
const isDebit = (transaction: Transaction) => {
  return (
    transaction.type === "debit" ||
    transaction.type === "virtfusion_credit_removal" ||
    transaction.type === "virtfusion_deduction" ||
    transaction.type === "dns_plan_purchase" ||
    transaction.amount < 0 // Also include any transaction with negative amount as spending
  );
};

export function BillingActivity() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

    // Fetch branding data for custom credits name
    const {data: brandingData} = useQuery({
        queryKey: ["/api/settings/branding"],
    });

    // Helper function to format transaction description
    const formatDescription = (description: string) => {
        if (!description) return '';
        return description;
    };

    // Helper function to format payment method
    const formatPaymentMethod = (paymentMethod: string) => {
        if (!paymentMethod) return '';

        // Capitalize first letter for payment methods
        return paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1);
    };

  const columns = [
    {
      accessorKey: "description" as keyof Transaction,
      header: "Transaction",
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center mr-4 ${
            isCredit(transaction)
              ? "bg-emerald-100 text-emerald-600"
              : "bg-red-100 text-red-600"
          }`}>
            {isCredit(transaction) ? (
              <PlusCircle className="h-5 w-5" />
            ) : (
              <MinusCircle className="h-5 w-5" />
            )}
          </div>
          <div>
              <div className="text-sm font-semibold text-gray-900">{formatDescription(transaction.description)}</div>
            {transaction.paymentMethod && (
              <div className="text-xs text-gray-500 capitalize mt-1 flex items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400 mr-2" />
                  {formatPaymentMethod(transaction.paymentMethod)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "amount" as keyof Transaction,
      header: "Amount",
      cell: (transaction: Transaction) => (
        <div className="text-right">
          <div className={`text-lg font-bold ${
            isCredit(transaction) ? "text-emerald-600" : "text-red-600"
          }`}>
            {isCredit(transaction) ? "+" : "-"}$
            {Math.abs(transaction.amount).toFixed(5)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "createdAt" as keyof Transaction,
      header: "Date",
      cell: (transaction: Transaction) => (
        <div className="text-sm text-gray-600">
          {format(new Date(transaction.createdAt), "MMM d, yyyy")}
          <div className="text-xs text-gray-400 mt-1">
            {format(new Date(transaction.createdAt), "h:mm a")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status" as keyof Transaction,
      header: "Status",
      cell: (transaction: Transaction) => {
        const getStatusBadge = (status: string) => {
          switch (status.toLowerCase()) {
            case "completed":
              return (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2" />
                  Completed
                </Badge>
              );
            case "pending":
              return (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2" />
                  Pending
                </Badge>
              );
            case "failed":
              return (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />
                  Failed
                </Badge>
              );
            default:
              return (
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mr-2" />
                  {status}
                </Badge>
              );
          }
        };

        return getStatusBadge(transaction.status);
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Modern Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 pb-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Recent Transactions</h2>
          <p className="text-gray-600 mt-1">Track your account activity and billing history</p>
        </div>
        <Link href="/billing">
          <Button
            variant="outline"
            className="bg-white border-gray-200 hover:bg-primary hover:text-primary-foreground hover:shadow-md transition-all duration-200"
          >
            View All Transactions
          </Button>
        </Link>
      </div>

      {/* Enhanced Data Table */}
      <div className="px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-3 text-gray-600">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <MinusCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
            <p className="text-gray-600 mb-6">Your transaction history will appear here once you start using our services.</p>
            <Link href="/packages">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Browse Packages
              </Button>
            </Link>
          </div>
        ) : (
          <DataTable
            data={transactions}
            columns={columns}
            searchKey="description"
          />
        )}
      </div>
    </div>
  );
}

export default BillingActivity;
