import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download, CheckCircle, XCircle, Clock, MoreHorizontal, PenLine } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface Invoice {
  id: number;
  userId: number;
  invoiceNumber: string;
  amount: number;
  status: string;
  items?: string;
  taxRate?: number;
  taxAmount?: number;
  totalAmount?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  dueDate?: string;
  paidDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const invoiceId = params?.id && !isNaN(parseInt(params.id, 10)) ? parseInt(params.id, 10) : null;
  
  // Fetch invoice details
  const { data: invoice, isLoading, error, refetch } = useQuery<Invoice>({
    queryKey: ['/api/admin/invoices', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        throw new Error("Invalid invoice ID");
      }
      
      // Make sure we're requesting JSON
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch invoice: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Received non-JSON response:", text.substring(0, 200) + "...");
        throw new Error("Server returned non-JSON response");
      }
      
      return await response.json();
    },
    enabled: !!invoiceId,
    retry: 1
  });

  // Fetch user details for this invoice
  const { data: user } = useQuery({
    queryKey: ['/api/admin/users', invoice?.userId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/users/${invoice?.userId}`);
      if (!response.ok) return null;
      return await response.json();
    },
    enabled: !!invoice?.userId,
  });

  // Handle invoice download
  const handleDownloadInvoice = async () => {
    if (!invoice) {
      console.error('Cannot download invoice: invoice data is null or undefined');
      toast({
        title: 'Error',
        description: 'Cannot download invoice: missing invoice data',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      // Use the API download URL for invoices
      const downloadUrl = `/api/admin/invoices/${invoice.id}/download`;
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download invoice: ${response.statusText}`);
      }
      
      // Get filename from the Content-Disposition header if available
      const contentDisposition = response.headers.get('Content-Disposition');
      
      // Default to PDF extension since we're generating a PDF
      let filename = `invoice-${invoice.invoiceNumber}.pdf`;
      
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
      
      toast({
        title: 'Success',
        description: 'Invoice downloaded successfully',
      });
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast({
        title: 'Error',
        description: 'Failed to download invoice. Please try again later.',
        variant: 'destructive'
      });
    }
  };

  // Handle invoice status update
  const updateInvoiceStatus = async (newStatus: string) => {
    if (!invoice) return;
    
    try {
      const response = await fetch(`/api/admin/invoices/${invoice.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update invoice status: ${response.statusText}`);
      }
      
      // Refetch invoice data
      refetch();
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      
      toast({
        title: 'Invoice Updated',
        description: `Invoice status changed to ${newStatus}`,
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update invoice status',
        variant: 'destructive'
      });
    }
  };

  // Format the date safely
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (error) {
      console.error("Date formatting error:", error);
      return dateString;
    }
  };

  // Get status badge with appropriate styling
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Paid
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3.5 w-3.5 mr-1" />
            Pending
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading invoice details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !invoice) {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The invoice you're looking for could not be found or you don't have permission to view it.</p>
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
        <Button variant="outline" onClick={() => setLocation('/admin')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <PenLine className="h-4 w-4 mr-2" />
                Update Status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => updateInvoiceStatus('paid')}>
                <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                <span>Mark as Paid</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateInvoiceStatus('pending')}>
                <Clock className="h-4 w-4 mr-2 text-yellow-600" />
                <span>Mark as Pending</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateInvoiceStatus('cancelled')}>
                <XCircle className="h-4 w-4 mr-2 text-red-600" />
                <span>Mark as Cancelled</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button onClick={handleDownloadInvoice}>
            <Download className="h-4 w-4 mr-2" />
            Download as PDF
          </Button>
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Invoice #{invoice.invoiceNumber}</CardTitle>
            <div>{getStatusBadge(invoice.status)}</div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Invoice Number</h3>
              <p className="text-lg font-medium">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
              <p className="text-lg font-medium">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
              <p className="text-lg font-medium">
                ${typeof invoice.amount === 'number' ? invoice.amount.toFixed(2) : '0.00'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
              <p className={`text-lg font-medium capitalize ${
                invoice.status === 'paid' ? 'text-accent' : 
                invoice.status === 'cancelled' ? 'text-destructive' : 
                'text-muted-foreground'
              }`}>
                {invoice.status}
              </p>
            </div>
            
            {invoice.taxAmount !== undefined && invoice.taxAmount !== null && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Tax Amount</h3>
                <p className="text-lg font-medium">
                  ${typeof invoice.taxAmount === 'number' ? invoice.taxAmount.toFixed(2) : '0.00'}
                </p>
              </div>
            )}
            
            {invoice.taxRate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Tax Rate</h3>
                <p className="text-lg font-medium">{invoice.taxRate}%</p>
              </div>
            )}
            
            {invoice.totalAmount !== undefined && invoice.totalAmount !== null && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Amount</h3>
                <p className="text-lg font-medium">
                  ${typeof invoice.totalAmount === 'number' ? invoice.totalAmount.toFixed(2) : '0.00'}
                </p>
              </div>
            )}
            
            {invoice.currency && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Currency</h3>
                <p className="text-lg font-medium">{invoice.currency}</p>
              </div>
            )}
            
            {invoice.dueDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                <p className="text-lg font-medium">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            )}
            
            {invoice.paidDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Paid Date</h3>
                <p className="text-lg font-medium">
                  {formatDate(invoice.paidDate)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* User Information Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer ID</h3>
              <p className="text-lg font-medium">#{invoice.userId}</p>
            </div>
            
            {user && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer Name</h3>
                  <p className="text-lg font-medium">
                    <a 
                      href={`/admin/users/${invoice.userId}`} 
                      className="text-primary hover:underline"
                    >
                      {user.fullName || user.username || `User #${invoice.userId}`}
                    </a>
                  </p>
                </div>
                
                {user.email && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Email</h3>
                    <p className="text-lg font-medium">{user.email}</p>
                  </div>
                )}
              </>
            )}
            
            {invoice.customerName && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer Name (Invoice)</h3>
                <p className="text-lg font-medium">{invoice.customerName}</p>
              </div>
            )}
            
            {invoice.customerEmail && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer Email (Invoice)</h3>
                <p className="text-lg font-medium">{invoice.customerEmail}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Invoice Notes and Items */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.notes && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Notes</h3>
              <div className="border rounded-md p-4 bg-gray-50">
                <p className="text-base">{invoice.notes}</p>
              </div>
            </div>
          )}
          
          {invoice.items && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Invoice Items</h3>
              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted">
                    {(() => {
                      try {
                        // Try to parse the items - handle both string and object formats
                        const itemsArray = typeof invoice.items === 'string' 
                          ? JSON.parse(invoice.items) 
                          : invoice.items;
                        if (Array.isArray(itemsArray)) {
                          return itemsArray.map((item: any, index: number) => (
                            <tr key={index}>
                              <td className="px-4 py-3 text-sm">{item.description || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                ${typeof item.amount === 'number' || !isNaN(parseFloat(item.amount)) 
                                  ? parseFloat(item.amount).toFixed(2) 
                                  : typeof item.totalPrice === 'number' || !isNaN(parseFloat(item.totalPrice))
                                    ? parseFloat(item.totalPrice).toFixed(2)
                                    : '0.00'}
                              </td>
                            </tr>
                          ));
                        } else if (typeof itemsArray === 'object') {
                          // Handle the case where items is a single object
                          return (
                            <tr>
                              <td className="px-4 py-3 text-sm">{itemsArray.description || 'N/A'}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                ${typeof itemsArray.totalPrice === 'number' || !isNaN(parseFloat(itemsArray.totalPrice))
                                  ? parseFloat(itemsArray.totalPrice).toFixed(2)
                                  : '0.00'}
                              </td>
                            </tr>
                          );
                        } else {
                          return <tr><td className="px-4 py-3 text-sm" colSpan={2}>No itemized details available</td></tr>;
                        }
                      } catch (error) {
                        console.error("Error parsing invoice items:", error);
                        // Fallback to displaying the raw string if it's a simple string
                        return (
                          <tr>
                            <td className="px-4 py-3 text-sm" colSpan={2}>
                              {typeof invoice.items === 'string' ? invoice.items : 'Invoice details not available'}
                            </td>
                          </tr>
                        );
                      }
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Metadata section with timestamps */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-xs font-medium text-muted-foreground mb-2 uppercase">System Information</h3>
            <div className="text-xs text-gray-500">
              <p>Created: {formatDate(invoice.createdAt)}</p>
              {invoice.updatedAt && <p>Last updated: {formatDate(invoice.updatedAt)}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
