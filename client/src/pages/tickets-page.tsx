import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TicketForm } from "@/components/tickets/TicketForm";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, ExternalLink, ChevronLeft, ChevronRight, BookOpen, TicketIcon } from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Ticket {
  id: number;
  userId: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Ticket[];
  pagination: {
    total: number;
    pages: number;
    current: number;
    perPage: number;
  };
}

export default function TicketsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5); // Set to 5 tickets per page
  const [statusFilter, setStatusFilter] = useState<string>("open"); // "all", "open", "closed"

  // Get brand colors for consistent theming
  const brandColors = getBrandColors();

  // Reset page when filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  // Fetch tickets
  const { data, isLoading } = useQuery<PaginatedResponse>({
    queryKey: ["/api/tickets", { page: currentPage, limit: pageSize, status: statusFilter }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
      });

      // Only add status parameter if it's not "all"
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      const url = `/api/tickets?${params.toString()}`;
      return apiRequest(url);
    },
  });

  const tickets = data?.data || [];

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("/api/tickets", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket created",
        description: "Your support ticket has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
      setCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error creating ticket",
        description: error.message || "Failed to create ticket",
        variant: "destructive",
      });
    },
  });

  // Close ticket mutation
  const closeTicketMutation = useMutation({
    mutationFn: async (ticketId: number) => {
      return await apiRequest(`/api/tickets/${ticketId}/close`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket closed",
        description: "The ticket has been closed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error closing ticket",
        description: error.message || "Failed to close ticket",
        variant: "destructive",
      });
    },
  });

  // Handle ticket creation
  const handleCreateTicket = (data: any) => {
    createTicketMutation.mutate(data);
  };

  // Handle closing a ticket
  const handleCloseTicket = (ticketId: number) => {
    closeTicketMutation.mutate(ticketId);
  };

  // Get badge for ticket status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">Open</Badge>;
      case "in-progress":
        return <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20">In Progress</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-muted text-muted-foreground">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get badge for ticket priority
  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "low":
        return <Badge variant="secondary" className="bg-secondary/10 text-secondary border-secondary/20">Low</Badge>;
      case "medium":
        return <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/20">Medium</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">High</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Columns for tickets table
  const columns = [
    {
      accessorKey: "id" as keyof Ticket,
      header: "Ticket ID",
      cell: (ticket: Ticket) => (
        <div className="font-medium text-foreground">#{ticket.id}</div>
      ),
    },
    {
      accessorKey: "subject" as keyof Ticket,
      header: "Subject",
      cell: (ticket: Ticket) => (
        <div className="font-medium text-foreground">{ticket.subject}</div>
      ),
    },
    {
      accessorKey: "status" as keyof Ticket,
      header: "Status",
      cell: (ticket: Ticket) => getStatusBadge(ticket.status),
    },
    {
      accessorKey: "priority" as keyof Ticket,
      header: "Priority",
      cell: (ticket: Ticket) => getPriorityBadge(ticket.priority),
    },
    {
      accessorKey: "createdAt" as keyof Ticket,
      header: "Created",
      cell: (ticket: Ticket) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      accessorKey: "updatedAt" as keyof Ticket,
      header: "Last Updated",
      cell: (ticket: Ticket) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(ticket.updatedAt), 'MMM d, yyyy h:mm a')}
        </span>
      ),
    },
  ];

  // Actions for each ticket
  const renderActions = (ticket: Ticket) => (
    <>
      <DropdownMenuItem onClick={() => navigate(`/tickets/${ticket.id}`)}>
        <MessageSquare className="h-4 w-4 mr-2" />
        View Conversation
      </DropdownMenuItem>
      {ticket.status !== "closed" && (
        <DropdownMenuItem onClick={() => handleCloseTicket(ticket.id)}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Close Ticket
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <>

      <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-300/60 shadow-xl">
          <div className="p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between relative z-10">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <TicketIcon className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                    Support Tickets
                  </h1>
                  <p className="text-muted-foreground text-lg mt-1">
                    Get help from our support team
                  </p>
                </div>
              </div>

              {/* Ticket Stats Summary */}
              <div className="flex flex-wrap gap-6 mt-6">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {tickets.filter(t => t.status.toLowerCase() === 'open').length} Open Tickets
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-secondary" />
                  <span className="text-sm font-medium text-foreground">
                    {tickets.filter(t => t.status.toLowerCase() === 'in-progress').length} In Progress
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {tickets.filter(t => t.status.toLowerCase() === 'closed').length} Closed
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
              <Button
                variant="outline"
                onClick={() => navigate('/docs')}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Docs
              </Button>
              <Button
                onClick={() => {
                  setCreateDialogOpen(true);
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </div>
          </div>
          {/* Abstract background shapes */}
          <div className="absolute top-0 left-0 w-full h-full z-0">
            <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-10"
                 style={{ backgroundColor: brandColors.primary.full }}></div>
            <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-5"
                 style={{ backgroundColor: brandColors.secondary.full }}></div>
          </div>
        </div>

        {/* Tickets Display */}
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg text-foreground">Your Support Tickets</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filter by status:</span>
                <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tickets</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-2 text-muted-foreground">Loading tickets...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2 text-foreground">
                  {statusFilter === "all"
                    ? "No Support Tickets"
                    : `No ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Tickets`
                  }
                </h3>
                <p className="text-muted-foreground mb-4">
                  {statusFilter === "all"
                    ? "You don't have any support tickets yet. Create one if you need assistance."
                    : `You don't have any ${statusFilter} tickets at the moment.`
                  }
                </p>
                {statusFilter === "all" && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Ticket
                  </Button>
                )}
              </div>
            ) : (
              /* Table View */
              <DataTable
                data={tickets}
                columns={columns}
                searchKey="subject"
                onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
                actions={renderActions}
              />
            )}

            {/* Pagination Controls */}
            {data?.pagination && data.pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  Showing {tickets.length} of {data.pagination.total} {statusFilter === "all" ? "tickets" : `${statusFilter} tickets`}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCurrentPage(p => Math.max(1, p - 1));
                    }}
                    disabled={currentPage === 1}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Previous Page</span>
                  </Button>

                  <div className="text-sm text-foreground">
                    Page {data.pagination.current} of {data.pagination.pages}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(data.pagination.pages, p + 1))}
                    disabled={currentPage === data.pagination.pages}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span className="sr-only">Next Page</span>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="w-[90vw] max-w-[450px] p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription className="text-sm">
              Describe your issue and we'll assist you ASAP.
            </DialogDescription>
          </DialogHeader>
          <TicketForm onSubmit={handleCreateTicket} isLoading={createTicketMutation.isPending} />
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </>
  );
}
