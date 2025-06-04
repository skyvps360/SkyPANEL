import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TicketList } from "@/components/tickets/TicketList";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Inbox, 
  RefreshCw,
  Filter,
  SlidersHorizontal,
  Search
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Ticket {
  id: number;
  userId: number;
  departmentId: number;
  subject: string;
  status: string;
  priority: string;
  vpsId: number | null;
  createdAt: string;
  updatedAt: string;
  user?: User;
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

export default function AdminTicketsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("open");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Brand color state
  const [primaryColor, setPrimaryColor] = useState<string>("2563eb"); // Default blue
  const [secondaryColor, setSecondaryColor] = useState<string>("10b981"); // Default green
  const [accentColor, setAccentColor] = useState<string>("f59e0b"); // Default amber
  const [brandColorLoaded, setBrandColorLoaded] = useState<boolean>(false);
  
  // Fetch company brand colors on component mount
  useEffect(() => {
    async function fetchBrandingSettings() {
      try {
        const response = await apiRequest('/api/settings/branding');
        if (response) {
          // Set primary color (with fallback to legacy company_color)
          if (response.primary_color) {
            setPrimaryColor(response.primary_color.replace('#', ''));
          } else if (response.company_color) {
            // Fallback to legacy company_color if primary_color is not set
            setPrimaryColor(response.company_color.replace('#', ''));
          }
          
          // Set secondary color if available
          if (response.secondary_color) {
            setSecondaryColor(response.secondary_color.replace('#', ''));
          }
          
          // Set accent color if available
          if (response.accent_color) {
            setAccentColor(response.accent_color.replace('#', ''));
          }
        }
        setBrandColorLoaded(true);
      } catch (error) {
        console.error('Failed to load branding settings:', error);
        setBrandColorLoaded(true); // Continue even if settings fail to load
      }
    }
    
    fetchBrandingSettings();
  }, []);

  // Fetch tickets with admin permissions, filtered by active tab status
  const { data, isLoading: ticketsLoading, refetch } = useQuery<PaginatedResponse>({
    queryKey: ['/api/admin/tickets', { page: currentPage, limit: pageSize, status: activeTab === 'open' ? 'open' : 'closed' }],
    queryFn: async ({ queryKey }) => {
      const [endpoint, params] = queryKey as [string, { page: number; limit: number; status: string }];
      const statusParam = params.status === 'open' ? 'open' : 'closed';
      const url = `${endpoint}?page=${params.page}&limit=${params.limit}&status=${statusParam}`;
      return apiRequest(url);
    },
    refetchInterval: autoRefresh ? 30000 : false, // Refetch every 30 seconds if autoRefresh is enabled
  });
  
  const tickets = data?.data || [];
  const pagination = data?.pagination;
  
  // Function to manually refresh tickets
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await refetch();
      toast({
        title: "Refreshed",
        description: "Ticket list has been refreshed",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh tickets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Sort tickets by creation date (oldest first - FIFO order)
  const sortedTickets = [...tickets].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  // Filter tickets by search query (tickets are already filtered by status from API)
  const filteredTickets = sortedTickets.filter(ticket => {
    const matchesSearch = !searchQuery || 
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ticket.user?.fullName && ticket.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ticket.user?.email && ticket.user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      // Add ticket ID search
      ticket.id.toString().includes(searchQuery);
    
    return matchesSearch;
  });
  
  // Since tickets are already filtered by status from the API, we can use them directly
  const displayTickets = filteredTickets;

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle tab change and reset pagination
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1); // Reset to first page when switching tabs
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">Support Tickets</h1>
            <p className="text-muted-foreground">
              Manage customer support tickets and respond to inquiries
            </p>
          </div>
          <div className="flex items-center space-x-2 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={toggleAutoRefresh}
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "text-primary" : "text-muted-foreground"}`} />
              {autoRefresh ? "Auto-refresh On" : "Auto-refresh Off"}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input 
                  placeholder="Search tickets by ID, subject, user name, or email..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-auto">
                  <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Items per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto flex items-center justify-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="mb-6">
            <TabsTrigger value="open" className="relative">
              Open Tickets
              {activeTab === 'open' && displayTickets.length > 0 && (
                <span 
                  className="absolute -top-1 -right-1 text-xs rounded-full h-5 w-5 flex items-center justify-center"
                  style={{ 
                    backgroundColor: `#${accentColor}`,
                    color: 'white'
                  }}
                >
                  {displayTickets.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="closed">Closed Tickets</TabsTrigger>
          </TabsList>
          
          <TabsContent value="open">
            {ticketsLoading ? (
              <Card>
                <CardContent className="p-6 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            ) : displayTickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                  <Inbox className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No open tickets</h3>
                  <p className="text-muted-foreground">All customer support tickets have been resolved.</p>
                </CardContent>
              </Card>
            ) : (
              <TicketList 
                tickets={displayTickets}
                searchQuery={searchQuery}
                brandColors={{
                  primaryColor,
                  secondaryColor,
                  accentColor
                }}
              />
            )}
          </TabsContent>
          
          <TabsContent value="closed">
            {ticketsLoading ? (
              <Card>
                <CardContent className="p-6 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </CardContent>
              </Card>
            ) : displayTickets.length === 0 ? (
              <Card>
                <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                  <Inbox className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No closed tickets</h3>
                  <p className="text-muted-foreground">There are no closed tickets to display.</p>
                </CardContent>
              </Card>
            ) : (
              <TicketList 
                tickets={displayTickets}
                searchQuery={searchQuery}
                brandColors={{
                  primaryColor,
                  secondaryColor,
                  accentColor
                }}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Pagination controls */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center mt-6">
            <Pagination
              currentPage={pagination.current}
              totalPages={pagination.pages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </AdminLayout>
  );
}