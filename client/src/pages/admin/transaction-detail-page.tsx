import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";

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

const isCredit = (transaction: Transaction) => {
  return transaction.type === 'credit' ||
         transaction.type === 'virtfusion_credit' ||
         transaction.type === 'custom_credit';
};

const isDebit = (transaction: Transaction) => {
  return transaction.type === 'debit' || transaction.type === 'virtfusion_credit_removal';
};

export default function AdminTransactionDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const transactionId = params?.id && !isNaN(parseInt(params.id, 10)) ? parseInt(params.id, 10) : null;

  useEffect(() => {
    if (!transactionId) setLocation('/admin/billing');
  }, [transactionId, setLocation]);

  const { data: transaction, isLoading, error } = useQuery<Transaction>({
    queryKey: [`/api/transactions/${transactionId}`],
    enabled: !!transactionId,
    retry: 1,
  });

  const handleDownloadTransaction = async () => {
    if (!transaction) return;
    try {
      const downloadUrl = `/special-download/transactions/${transaction.id}/pdf`;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to download transaction');
      let filename = `transaction-${transaction.id}.pdf`;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Failed to download transaction. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading transaction details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !transaction) {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle>Transaction Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The transaction you're looking for could not be found or you don't have permission to view it.</p>
            <Button onClick={() => setLocation('/admin/billing')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => setLocation('/admin/billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <Button onClick={handleDownloadTransaction}>
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Transaction ID</h3>
              <p className="text-lg font-medium">{transaction.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
              <p className="text-lg font-medium">
                {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">User</h3>
              <p className="text-lg font-medium">{transaction.user?.username} ({transaction.user?.email})</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
              <p className="text-lg font-medium">{transaction.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
              <p className={`text-lg font-medium ${isCredit(transaction) ? 'text-accent' : 'text-destructive'}`}>
                {isCredit(transaction) ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Type</h3>
              <p className="text-lg font-medium capitalize">{transaction.type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <p className="text-lg font-medium capitalize">{transaction.status}</p>
            </div>
            {transaction.paymentMethod && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment Method</h3>
                <p className="text-lg font-medium capitalize">{transaction.paymentMethod}</p>
              </div>
            )}
            {transaction.paymentId && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Payment ID</h3>
                <p className="text-lg font-medium">{transaction.paymentId}</p>
              </div>
            )}
            {transaction.virtFusionCreditId && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">VirtFusion Credit ID</h3>
                <p className="text-lg font-medium text-primary">{transaction.virtFusionCreditId}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
