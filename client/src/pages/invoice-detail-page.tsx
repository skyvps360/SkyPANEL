import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ArrowLeft, Download } from "lucide-react";

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

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const invoiceId = params?.id && !isNaN(parseInt(params.id, 10)) ? parseInt(params.id, 10) : null;
  
  // Fetch invoice details with improved debugging
  const { data: invoice, isLoading, error } = useQuery<Invoice>({
    queryKey: ['/api/invoices', invoiceId],
    queryFn: async () => {
      if (!invoiceId) {
        throw new Error("Invalid invoice ID");
      }
      
      console.log(`[DEBUG] Fetching invoice ID: ${invoiceId}`);
      
      // Make sure we're requesting JSON
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`[DEBUG] Failed to fetch invoice: ${response.status} ${response.statusText}`);
        throw new Error(`Failed to fetch invoice: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error("Received non-JSON response:", text.substring(0, 200) + "...");
        throw new Error("Server returned non-JSON response");
      }
      
      const data = await response.json();
      console.log("[DEBUG] Invoice data received:", data);
      
      // Log the items specifically if they exist
      if (data && data.items) {
        console.log("[DEBUG] Invoice items:", data.items);
        try {
          const parsedItems = JSON.parse(data.items);
          console.log("[DEBUG] Parsed invoice items:", parsedItems);
        } catch (error) {
          console.error("[DEBUG] Failed to parse invoice items:", error);
        }
      }
      
      return data;
    },
    enabled: !!invoiceId,
    retry: 1
  });

  // Handle invoice download
  const handleDownloadInvoice = async () => {
    if (!invoice) {
      console.error('Cannot download invoice: invoice data is null or undefined');
      alert('Cannot download invoice: missing invoice data');
      return;
    }
    
    try {
      // Use the API download URL for invoices
      const downloadUrl = `/api/invoices/${invoice.id}/download`;
      
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
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading invoice details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout>
        <Card>
          <CardHeader>
            <CardTitle>Invoice Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The invoice you're looking for could not be found or you don't have permission to view it.</p>
            <Button onClick={() => setLocation('/billing')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => setLocation('/billing')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Billing
        </Button>
        <Button onClick={handleDownloadInvoice}>
          <Download className="h-4 w-4 mr-2" />
          Download as PDF
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Invoice Details</CardTitle>
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
                {invoice.createdAt 
                  ? (() => {
                      try {
                        return format(new Date(invoice.createdAt), 'MMMM d, yyyy');
                      } catch (error) {
                        console.error("Date formatting error:", error);
                        return invoice.createdAt || 'N/A';
                      }
                    })() 
                  : 'N/A'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Amount</h3>
              <p className="text-lg font-medium text-accent">
                +${typeof invoice.amount === 'number' ? Math.abs(invoice.amount).toFixed(2) : '0.00'}
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
                <p className="text-lg font-medium text-accent">
                  +${typeof invoice.taxAmount === 'number' ? Math.abs(invoice.taxAmount).toFixed(2) : '0.00'}
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
                <p className="text-lg font-medium text-accent">
                  +${typeof invoice.totalAmount === 'number' ? Math.abs(invoice.totalAmount).toFixed(2) : '0.00'}
                </p>
              </div>
            )}
            
            {invoice.customerName && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer</h3>
                <p className="text-lg font-medium">{invoice.customerName}</p>
              </div>
            )}
            
            {invoice.customerEmail && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Customer Email</h3>
                <p className="text-lg font-medium">{invoice.customerEmail}</p>
              </div>
            )}
            
            {invoice.dueDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Due Date</h3>
                <p className="text-lg font-medium">
                  {(() => {
                    try {
                      return format(new Date(invoice.dueDate), 'MMMM d, yyyy');
                    } catch (error) {
                      console.error("Date formatting error:", error);
                      return invoice.dueDate || 'N/A';
                    }
                  })()}
                </p>
              </div>
            )}
            
            {invoice.paidDate && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Paid Date</h3>
                <p className="text-lg font-medium">
                  {(() => {
                    try {
                      return format(new Date(invoice.paidDate), 'MMMM d, yyyy');
                    } catch (error) {
                      console.error("Date formatting error:", error);
                      return invoice.paidDate || 'N/A';
                    }
                  })()}
                </p>
              </div>
            )}
          </div>
          
          {invoice.notes && (
            <div className="mt-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-1">Notes</h3>
              <p className="text-base">{invoice.notes}</p>
            </div>
          )}
          
          {invoice.items && (
            <div className="mt-6">
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
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}