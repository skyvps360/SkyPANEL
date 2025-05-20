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
    transaction.type === "credit" || transaction.type === "virtfusion_credit"
  );
};

// Helper function to determine if a transaction is a debit/removal
const isDebit = (transaction: Transaction) => {
  return (
    transaction.type === "debit" ||
    transaction.type === "virtfusion_credit_removal"
  );
};

export function BillingActivity() {
  const { data: transactions = [], isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });

  const columns = [
    {
      accessorKey: "description" as keyof Transaction,
      header: "Transaction",
      cell: (transaction: Transaction) => (
        <div className="flex items-center">
          <Avatar className="h-8 w-8 mr-3">
            <AvatarFallback
              className={
                isCredit(transaction)
                  ? "bg-blue-100 text-blue-600"
                  : "bg-red-100 text-red-600"
              }
            >
              {isCredit(transaction) ? (
                <PlusCircle className="h-4 w-4" />
              ) : (
                <MinusCircle className="h-4 w-4" />
              )}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-medium">{transaction.description}</div>
            {transaction.paymentMethod && (
              <div className="text-xs text-gray-500 capitalize">
                {transaction.paymentMethod}
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
        <div
          className={`text-sm ${isCredit(transaction) ? "text-accent" : "text-alert"}`}
        >
          {isCredit(transaction) ? "+" : "-"}$
          {Math.abs(transaction.amount).toFixed(2)}
        </div>
      ),
    },
    {
      accessorKey: "createdAt" as keyof Transaction,
      header: "Date",
      cell: (transaction: Transaction) => (
        <span className="text-sm text-gray-500">
          {format(new Date(transaction.createdAt), "MMM d, yyyy")}
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
              return (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Completed
                </Badge>
              );
            case "pending":
              return (
                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                  Pending
                </Badge>
              );
            case "failed":
              return (
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                  Failed
                </Badge>
              );
            default:
              return <Badge>{status}</Badge>;
          }
        };

        return getStatusBadge(transaction.status);
      },
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">
          Recent Transactions
        </CardTitle>
        <Link href="/billing">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <DataTable
          data={transactions}
          columns={columns}
          searchKey="description"
        />
      </CardContent>
    </Card>
  );
}

export default BillingActivity;
