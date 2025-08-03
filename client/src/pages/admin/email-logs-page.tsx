import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistance } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Filter,
  Mail,
  Search,
  X
} from 'lucide-react';

import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

interface EmailLog {
  id: number;
  type: string;
  status: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  userId: number | null;
  messageId: string | null;
  errorMessage: string | null;
  sentAt: string;
  metadata: Record<string, any> | null;
}

interface PaginatedEmailLogs {
  logs: EmailLog[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export default function EmailLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Fetch email logs with pagination
  const { data, isLoading } = useQuery<PaginatedEmailLogs>({
    queryKey: ['/api/admin/email-logs', statusFilter, typeFilter, searchTerm, currentPage, itemsPerPage],
    queryFn: async () => {
      let url = '/api/admin/email-logs';
      const params = new URLSearchParams();
      
      // Add filters
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter && typeFilter !== 'all') params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      // Add pagination
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch email logs');
      return response.json();
    },
  });
  
  // Extract logs and pagination data from the response
  const emailLogs = data?.logs || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // The query will automatically refetch due to the searchTerm dependency
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTypeFilter('all');
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'sent':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      case 'queued':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Queued</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatMetadata = (metadata: Record<string, any> | null) => {
    if (!metadata) return 'No metadata';
    
    return (
      <div className="space-y-2">
        {Object.entries(metadata).map(([key, value]) => (
          <div key={key} className="text-sm text-gray-900 dark:text-gray-100">
            <span className="font-semibold">{key}:</span>{' '}
            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Email Logs</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Emails</CardTitle>
            <CardDescription>Search and filter through all email logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              {/* Search form - full width on mobile, takes up more space on desktop */}
              <form onSubmit={handleSearch} className="flex w-full">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    type="search"
                    placeholder="Search by recipient, subject, or email type..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button type="submit" className="ml-2">Search</Button>
              </form>

              {/* Filter controls - stack on mobile, side by side on desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="queued">Queued</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Email Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="maintenance_notification">Maintenance Notification</SelectItem>
                    <SelectItem value="password_reset">Password Reset</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="verification">Email Verification</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters} className="w-full sm:w-auto">
                  <X className="h-4 w-4 mr-1" /> Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Log History</CardTitle>
            <CardDescription>All emails sent through the system</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {emailLogs && emailLogs.length > 0 ? (
                  <>
                    {/* Desktop view */}
                    <div className="overflow-x-auto hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Type</TableHead>
                            <TableHead>Recipient</TableHead>
                            <TableHead>Subject</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Sent At</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {emailLogs.map((log: EmailLog) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  <Mail className="w-3 h-3 mr-1" />
                                  {log.type.replace(/_/g, ' ')}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{log.recipientName}</div>
                                <div className="text-sm text-gray-500">{log.recipientEmail}</div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate">
                                {log.subject}
                              </TableCell>
                              <TableCell>{getStatusBadge(log.status)}</TableCell>
                              <TableCell>
                                <div className="font-medium">
                                  {new Date(log.sentAt).toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatDistance(new Date(log.sentAt), new Date(), { addSuffix: true })}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  onClick={() => setSelectedEmail(log)}
                                  className="h-8 px-2"
                                >
                                  View Details
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile view - Card based layout */}
                    <div className="space-y-4 md:hidden">
                      {emailLogs.map((log: EmailLog) => (
                        <Card key={log.id} className="overflow-hidden">
                          <CardContent className="p-0">
                            {/* Header section with type and status */}
                            <div className="p-4 flex justify-between items-center bg-muted/30">
                              <Badge variant="outline" className="capitalize">
                                <Mail className="w-3 h-3 mr-1" />
                                {log.type.replace(/_/g, ' ')}
                              </Badge>
                              {getStatusBadge(log.status)}
                            </div>
                            
                            {/* Content section */}
                            <div className="p-4 space-y-3">
                              {/* Subject */}
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Subject:</div>
                                <div className="font-medium">{log.subject}</div>
                              </div>
                              
                              {/* Recipient */}
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Recipient:</div>
                                <div className="font-medium">{log.recipientName}</div>
                                <div className="text-sm text-gray-500">{log.recipientEmail}</div>
                              </div>
                              
                              {/* Sent At */}
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">Sent At:</div>
                                <div className="font-medium">{new Date(log.sentAt).toLocaleString()}</div>
                                <div className="text-xs text-gray-500">
                                  {formatDistance(new Date(log.sentAt), new Date(), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="px-4 py-3 bg-muted/20 border-t flex justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedEmail(log)}
                              >
                                View Details
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-10">
                    <Mail className="h-12 w-12 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium">No emails found</h3>
                    <p className="mt-1 text-gray-500">
                      {searchTerm || statusFilter || typeFilter ? 
                        'Try adjusting your search or filters' : 
                        'No emails have been sent or logged yet'}
                    </p>
                    {(searchTerm || statusFilter || typeFilter) && (
                      <Button 
                        onClick={clearFilters} 
                        variant="outline" 
                        className="mt-4"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Pagination Controls */}
                {data?.pagination && data.pagination.totalPages > 1 && (
                  <div className="flex flex-col space-y-3 md:flex-row md:space-y-0 md:justify-between md:items-center mt-6">
                    {/* Page size selector - full width on mobile */}
                    <div className="w-full md:w-auto order-2 md:order-3">
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={(value) => {
                          setItemsPerPage(Number(value));
                          setCurrentPage(1); // Reset to first page when changing items per page
                        }}
                      >
                        <SelectTrigger className="w-full md:w-[110px]">
                          <SelectValue placeholder="Page size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10 per page</SelectItem>
                          <SelectItem value="25">25 per page</SelectItem>
                          <SelectItem value="50">50 per page</SelectItem>
                          <SelectItem value="100">100 per page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Status text - hidden on small mobile, visible on larger screens */}
                    <div className="text-sm text-gray-500 order-1 md:order-1 hidden sm:block">
                      Showing {(data.pagination.currentPage - 1) * data.pagination.itemsPerPage + 1} to {
                        Math.min(data.pagination.currentPage * data.pagination.itemsPerPage, data.pagination.totalItems)
                      } of {data.pagination.totalItems} emails
                    </div>
                    
                    {/* Page navigation buttons - centered on mobile */}
                    <div className="flex items-center justify-center md:justify-end space-x-2 order-3 md:order-2">
                      {/* First page button - hide on small mobile */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(1)}
                        className="hidden sm:flex"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Previous page button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {/* Page numbers - hide most on mobile */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, data.pagination.totalPages) }, (_, i) => {
                          // Show pages around the current page
                          let pageToShow = currentPage - 2 + i;
                          
                          // Adjust if we're at the beginning or end
                          if (currentPage < 3) {
                            pageToShow = i + 1;
                          } else if (currentPage > data.pagination.totalPages - 2) {
                            pageToShow = data.pagination.totalPages - 4 + i;
                          }
                          
                          // Make sure we don't go below 1 or above totalPages
                          pageToShow = Math.max(1, Math.min(data.pagination.totalPages, pageToShow));
                          
                          // On mobile, only show current page number
                          const showOnMobile = pageToShow === currentPage;
                          
                          return (
                            <Button
                              key={pageToShow}
                              variant={pageToShow === currentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageToShow)}
                              className={`w-9 ${!showOnMobile ? 'hidden sm:flex' : ''}`}
                            >
                              {pageToShow}
                            </Button>
                          );
                        })}
                      </div>
                      
                      {/* Next page button */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === data.pagination.totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, data.pagination.totalPages))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      
                      {/* Last page button - hide on small mobile */}
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={currentPage === data.pagination.totalPages}
                        onClick={() => setCurrentPage(data.pagination.totalPages)}
                        className="hidden sm:flex"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Email Detail Dialog */}
        <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
          <DialogContent className="max-w-3xl w-[95vw] sm:w-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle>Email Details</DialogTitle>
              <DialogDescription>
                Detailed information about the email
              </DialogDescription>
            </DialogHeader>
            
            {selectedEmail && (
              <Tabs defaultValue="details">
                <TabsList className="mb-4 w-full grid grid-cols-2 md:flex md:w-auto">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                  {selectedEmail.errorMessage && (
                    <TabsTrigger value="error" className="col-span-2 mt-2 md:mt-0">Error</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="details" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Status</h4>
                      <div>{getStatusBadge(selectedEmail.status)}</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Type</h4>
                      <p className="capitalize">{selectedEmail.type.replace(/_/g, ' ')}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Recipient Name</h4>
                      <p className="break-words">{selectedEmail.recipientName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Recipient Email</h4>
                      <p className="break-words">{selectedEmail.recipientEmail}</p>
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <h4 className="text-sm font-medium text-gray-500">Subject</h4>
                      <p className="break-words">{selectedEmail.subject}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Sent At</h4>
                      <p>{new Date(selectedEmail.sentAt).toLocaleString()}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Message ID</h4>
                      <p className="font-mono text-xs break-all">{selectedEmail.messageId || 'N/A'}</p>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="metadata" className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
                    {formatMetadata(selectedEmail.metadata)}
                  </div>
                </TabsContent>
                
                {selectedEmail.errorMessage && (
                  <TabsContent value="error" className="space-y-4">
                    <div className="bg-red-50 p-4 rounded-md text-red-600 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                      {selectedEmail.errorMessage}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}