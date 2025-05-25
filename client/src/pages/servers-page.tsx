import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AlertCircle, ChevronRight, ArrowRight, Server, RefreshCw, RotateCw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { getBrandColors } from "@/lib/brand-theme";

function getStatusBadgeVariant(status: string) {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'online':
    case 'running':
      return 'success';
    case 'offline':
    case 'stopped':
      return 'default';
    case 'suspended':
    case 'failed':
      return 'destructive';
    case 'installing':
    case 'provisioning':
    case 'shutting down':
    case 'shutdown':
    case 'rebooting':
    case 'restarting':
      return 'warning';
    case 'unknown':
    case 'complete':
      return 'secondary';
    default:
      return 'secondary';
  }
}

export default function ServersPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [perPage, setPerPage] = useState<number>(10);

  // Fetch branding data for dynamic colors
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Get brand colors from database settings
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  // Fetch user's servers from API
  const { data: serversResponse, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/user/servers', page],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/user/servers?page=${page}&perPage=${perPage}`);

        if (!response.ok) {
          console.error('API Response not OK:', response.status, response.statusText);
          throw new Error('Failed to fetch servers');
        }

        const data = await response.json();
        console.log('User servers API response:', data);

        // Check if the response is in the expected format with pagination data
        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        } else if (Array.isArray(data)) {
          return {
            data: data,
            current_page: page,
            last_page: Math.ceil(data.length / perPage),
            per_page: perPage,
            total: data.length
          };
        } else {
          return {
            data: [],
            current_page: 1,
            last_page: 1,
            per_page: perPage,
            total: 0
          };
        }
      } catch (error) {
        console.error('Error fetching user servers:', error);
        throw error;
      } finally {
        setIsRefreshing(false);
        setLastRefreshed(new Date());
      }
    },
  });

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
  };

  // Set up auto-refresh interval
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing user server list...');
      refetch();
      setLastRefreshed(new Date());
    }, 60 * 1000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refetch]);

  // Get the servers array from the response and sort it
  const servers = serversResponse?.data || [];

  // Sort servers based on the current sort field and direction
  const sortedServers = [...servers].sort((a, b) => {
    if (sortField === 'id') {
      return sortDirection === 'desc'
        ? Number(b.id) - Number(a.id)
        : Number(a.id) - Number(b.id);
    } else if (sortField === 'name') {
      return sortDirection === 'desc'
        ? String(b.name).localeCompare(String(a.name))
        : String(a.name).localeCompare(String(b.name));
    } else if (sortField === 'created') {
      const dateA = a.created ? new Date(a.created) : new Date(0);
      const dateB = b.created ? new Date(b.created) : new Date(0);
      return sortDirection === 'desc' ? dateB.getTime() - dateA.getTime() : dateA.getTime() - dateB.getTime();
    }
    return 0;
  });

  // Get pagination details from the API response or use defaults
  const totalPages = serversResponse?.last_page || 1;
  const currentPage = serversResponse?.current_page || page;

  // Function to toggle sort direction or change sort field
  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <DashboardLayout>
      <div className="container py-6">
        <div className="mb-6">
          <Breadcrumb>
            <Breadcrumb.Item href="/dashboard">Dashboard</Breadcrumb.Item>
            <Breadcrumb.Item>
              <span className="flex items-center gap-1">
                <Server className="h-4 w-4" />
                My Servers
              </span>
            </Breadcrumb.Item>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-2">My Virtual Servers</h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your virtual servers
          </p>
        </div>

        {isError && (
          <Card className="mb-6 border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center text-lg">
                <AlertCircle className="mr-2 h-5 w-5" />
                Error Loading Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-destructive/90">
                There was a problem loading your servers. Please try again.
              </CardDescription>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setIsRefreshing(true);
                  refetch().finally(() => setIsRefreshing(false));
                }}
                disabled={isRefreshing}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Try Again'}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Virtual Servers</CardTitle>
                <div className="text-xs text-muted-foreground mt-1 flex items-center">
                  <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                  <div className="ml-4 flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <div
                        className={`flex h-[18px] w-[32px] shrink-0 cursor-pointer rounded-full border-2 border-transparent p-[1px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50`}
                        style={{ backgroundColor: autoRefreshEnabled ? (brandColors.primary.full || '#3b82f6') : '#e5e7eb' }}
                        onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                        role="checkbox"
                        aria-checked={autoRefreshEnabled}
                        tabIndex={0}
                      >
                        <div
                          className={`pointer-events-none h-[14px] w-[14px] rounded-full bg-background shadow-sm transition-transform ${autoRefreshEnabled ? 'translate-x-[14px]' : 'translate-x-0'}`}
                        ></div>
                      </div>
                      <span>Auto-refresh {autoRefreshEnabled ? 'ON' : 'OFF'}</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : servers?.length ? (
              <>
                {/* Table management controls */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Sort by:</span>
                    <Select value={sortField} onValueChange={setSortField}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Server ID</SelectItem>
                        <SelectItem value="name">Server Name</SelectItem>
                        <SelectItem value="created">Creation Date</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="gap-1 text-xs px-2"
                    >
                      {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="ml-2 gap-1 text-xs px-2"
                      style={{
                        color: brandColors.primary.full || '#3b82f6',
                        borderColor: brandColors.primary.full || '#3b82f6'
                      }}
                      onClick={() => {
                        setIsRefreshing(true);
                        refetch().finally(() => setIsRefreshing(false));
                      }}
                      title="Refresh server data"
                      disabled={isRefreshing}
                    >
                      <RotateCw className={`h-3.5 w-3.5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="w-[120px] cursor-pointer"
                          onClick={() => toggleSort('id')}
                        >
                          <div className="flex items-center gap-1">
                            ID
                            {sortField === 'id' && (
                              <span className="text-xs opacity-70">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => toggleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {sortField === 'name' && (
                              <span className="text-xs opacity-70">
                                {sortDirection === 'asc' ? '↑' : '↓'}
                              </span>
                            )}
                          </div>
                        </TableHead>
                        <TableHead className="hidden md:table-cell">IP Address</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedServers.map((server) => {
                        // Determine status using power status if available, otherwise use commissioned state
                        let status;

                        if (server.powerStatus && server.powerStatus.powerState) {
                          if (server.powerStatus.powerState === "RUNNING") {
                            status = "Running";
                          } else if (server.powerStatus.powerState === "STOPPED") {
                            status = "Stopped";
                          } else {
                            status = server.powerStatus.powerState;
                          }
                        } else if (server.state) {
                          if (server.state === "running" || server.state === "RUNNING") {
                            status = "Running";
                          } else if (server.state === "stopped" || server.state === "STOPPED") {
                            status = "Stopped";
                          } else if (server.state === "complete") {
                            status = "Stopped";
                          } else {
                            status = server.state;
                          }
                        } else {
                          status = server.commissioned === 3 ? 'Online' : 'Offline';
                        }

                        return (
                          <TableRow key={server.id}>
                            <TableCell className="font-mono text-xs">
                              {server.id}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{server.name}</div>
                              <div className="text-xs text-muted-foreground">
                                UUID: {server.uuid || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-sm">
                                {server.ipAddress || server.ip || 'Not assigned'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(status)}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/servers/${server.id}`}>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1"
                                  style={{
                                    color: brandColors.primary.full || '#3b82f6',
                                    borderColor: brandColors.primary.full || '#3b82f6'
                                  }}
                                >
                                  <Eye className="h-3 w-3" />
                                  View Details
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setPage(Math.max(1, page - 1))}
                            className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                          return (
                            <PaginationItem key={pageNum}>
                              <PaginationLink
                                onClick={() => setPage(pageNum)}
                                isActive={pageNum === currentPage}
                                className="cursor-pointer"
                              >
                                {pageNum}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Server className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-2 text-sm font-semibold text-muted-foreground">No servers found</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  You don't have any virtual servers yet.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
