import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
// Input component removed as search bar has been removed
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { AlertCircle, ChevronRight, Server, RefreshCw, RotateCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


function getStatusBadgeVariant(status: string) {
  // Normalize the status to lowercase for comparison
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    // Running states
    case 'online':
    case 'running':
      return 'success';

    // Stopped states
    case 'offline':
    case 'stopped':
      return 'default';

    // Error states
    case 'suspended':
    case 'failed':
      return 'destructive';

    // In-progress states
    case 'installing':
    case 'provisioning':
    case 'shutting down':
    case 'shutdown':
    case 'rebooting':
    case 'restarting':
      return 'warning';

    // Unknown or other states
    case 'unknown':
    case 'complete': // Special VirtFusion status for newly provisioned servers
      return 'secondary';

    default:
      return 'secondary';
  }
}

export default function ServersListPage() {
  const [page, setPage] = useState(1);
  // Map to store virtFusionId -> localUserId mappings
  const [userMappings, setUserMappings] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Fetch all users to create VirtFusion ID -> User ID mapping
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        console.error('Failed to fetch users');
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Build the mapping when users are loaded
  useEffect(() => {
    if (users && users.length > 0) {
      const mappings: Record<string, number> = {};
      users.forEach((user: any) => {
        if (user.virtFusionId) {
          mappings[user.virtFusionId.toString()] = user.id;
        }
      });
      setUserMappings(mappings);
    }
  }, [users]);

  // Fetch servers from API with pagination
  const { data: serversResponse, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/admin/servers', page],
    queryFn: async () => {
      let url = `/api/admin/servers?page=${page}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error('API Response not OK:', response.status, response.statusText);
          throw new Error('Failed to fetch servers');
        }

        const data = await response.json();

        // Check if the response is in the expected format with pagination data
        if (data && typeof data === 'object' && 'data' in data) {
          // If we received a paginated response (with data and pagination properties)
          return data;
        } else if (Array.isArray(data)) {
          // If we received just an array, convert it to the expected format
          return {
            data: data,
            current_page: page,
            last_page: Math.ceil(data.length / 10),
            per_page: 10,
            total: data.length
          };
        } else {
          // Return empty data with pagination info as fallback
          return {
            data: [],
            current_page: 1,
            last_page: 1,
            per_page: 10,
            total: 0
          };
        }
      } catch (error) {
        console.error('Error fetching servers:', error);
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
      refetch();
      setLastRefreshed(new Date());
    }, 60 * 1000); // Refresh every 60 seconds

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refetch]);

  // Add server sorting and management options
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [perPage, setPerPage] = useState<number>(10);

  // Get the servers array from the response and sort it
  const servers = serversResponse?.data || [];

  // Sort servers based on the current sort field and direction
  const sortedServers = [...servers].sort((a, b) => {
    if (sortField === 'id') {
      return sortDirection === 'desc'
        ? Number(b.id) - Number(a.id)  // Show highest IDs first by default
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
      setSortDirection('desc'); // Default to descending when changing fields
    }
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <div className="mb-6">
          <Breadcrumb>
            <Breadcrumb.Item href="/admin">Admin</Breadcrumb.Item>
            <Breadcrumb.Item>
              <span className="flex items-center gap-1">
                <Server className="h-4 w-4" />
                Servers
              </span>
            </Breadcrumb.Item>
          </Breadcrumb>
          <h1 className="text-3xl font-bold mt-2">VirtFusion Server Management</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all virtual servers across the platform
          </p>
          <div className="bg-muted/30 p-4 rounded-lg mt-3 border text-sm">
            <p className="text-muted-foreground">
              <strong>Note:</strong> Servers in VirtFusion are linked to users via the <code className="inline-block bg-muted px-1 rounded">virtfusion_id</code> field.
              Server owners are automatically mapped to local users when available.
              Hover over owner names for detailed mapping information.
            </p>
          </div>
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
                There was a problem connecting to the VirtFusion API. Please check your API credentials and try again.
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
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle>Virtual Servers</CardTitle>
              <div className="text-xs text-muted-foreground mt-1 flex items-center">
                <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
                <div className="ml-4 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      className={`flex h-[18px] w-[32px] shrink-0 cursor-pointer rounded-full border-2 border-transparent p-[1px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${autoRefreshEnabled ? 'bg-primary' : 'bg-input'}`}
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
            <div className="flex items-center gap-2">
              {/* Create Server button temporarily hidden */}
              <div className="text-sm text-muted-foreground">
                Server creation is temporarily disabled
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
                      className="ml-2 gap-1 text-xs px-2 text-primary"
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Show:</span>
                    <Select value={perPage.toString()} onValueChange={(value) => setPerPage(Number(value))}>
                      <SelectTrigger className="w-[80px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">per page</span>
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
                        <TableHead className="hidden md:table-cell">Owner</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedServers.map((server) => {
                        // In VirtFusion API responses:
                        // - The ID in server.owner is the VirtFusion user ID
                        // - We need to find the matching local user with this ID in the virtfusion_id field

                        // First, extract the VirtFusion user ID from server.owner
                        let virtFusionUserId = null;
                        if (typeof server.owner === 'object' && server.owner) {
                          virtFusionUserId = server.owner.id || null;
                        } else if (server.owner) {
                          virtFusionUserId = server.owner;
                        }

                        // Look up the local user ID from our mapping
                        let localUserId = 'Unknown';
                        if (virtFusionUserId && userMappings[virtFusionUserId.toString()]) {
                          localUserId = userMappings[virtFusionUserId.toString()].toString();
                        }

                        // Format the owner display - show username when available
                        let ownerDisplay = 'Unknown Owner';
                        if (typeof server.owner === 'object' && server.owner?.username) {
                          ownerDisplay = server.owner.username;
                        } else if (virtFusionUserId) {
                          // Try to find the user in our users array
                          const matchedUser = users?.find((user: any) =>
                            user.virtFusionId === virtFusionUserId
                          );

                          if (matchedUser) {
                            ownerDisplay = matchedUser.username || matchedUser.fullName || `User ID: ${matchedUser.id}`;
                          } else {
                            ownerDisplay = `VirtFusion ID: ${virtFusionUserId}`;
                          }
                        }

                        // Determine status using power status if available, otherwise use commissioned state
                        let status;

                        // First check if we have power status from our tracking database
                        if (server.powerStatus && server.powerStatus.powerState) {
                          if (server.powerStatus.powerState === "RUNNING") {
                            status = "Running";
                          } else if (server.powerStatus.powerState === "STOPPED") {
                            status = "Stopped";
                          } else {
                            status = server.powerStatus.powerState;
                          }
                        }
                        // Fall back to server.state if available
                        else if (server.state) {
                          if (server.state === "running" || server.state === "RUNNING") {
                            status = "Running";
                          } else if (server.state === "stopped" || server.state === "STOPPED") {
                            status = "Stopped";
                          } else if (server.state === "complete") {
                            // If the status is "complete" (newly created server), default to Stopped
                            status = "Stopped";
                          } else {
                            status = server.state;
                          }
                        }
                        // Otherwise fallback to commissioned state
                        else {
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
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      {virtFusionUserId ? (
                                        ownerDisplay
                                      ) : (
                                        <Badge variant="outline" className="text-muted-foreground bg-muted/50">No Owner</Badge>
                                      )}
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    {virtFusionUserId ? (
                                      <>
                                        <p className="font-semibold mb-1">User Mapping Info:</p>
                                        <p>VirtFusion ID: {virtFusionUserId}</p>
                                        {localUserId !== 'Unknown' ? (
                                          <p>Local User ID: {localUserId}</p>
                                        ) : (
                                          <p className="text-amber-500">No matching local user found</p>
                                        )}
                                      </>
                                    ) : (
                                      <p>This server has no assigned owner in VirtFusion</p>
                                    )}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(status)}>
                                {status}
                              </Badge>
                              {server.suspended && (
                                <Badge variant="destructive" className="ml-2">
                                  Suspended
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {localUserId !== 'Unknown' ? (
                                  <Link href={`/admin/users/${localUserId}`}>
                                    <Button size="sm" variant="ghost" className="h-8 whitespace-nowrap">
                                      User
                                    </Button>
                                  </Link>
                                ) : (
                                  <Button size="sm" variant="ghost" className="h-8 whitespace-nowrap opacity-50" disabled>
                                    No User
                                  </Button>
                                )}
                                <Link href={`/admin/servers/${server.id}`}>
                                  <Button size="sm" variant="ghost" className="h-8 whitespace-nowrap">
                                    Details
                                    <ChevronRight className="ml-1 h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p => Math.max(1, p - 1));
                          }}
                          aria-disabled={currentPage === 1}
                          tabIndex={currentPage === 1 ? -1 : undefined}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>

                      {/* Show limited number of pagination links */}
                      {(() => {
                        // Determine which page numbers to show
                        let pageNumbers = [];
                        const maxVisible = 5; // Maximum number of visible page numbers

                        if (totalPages <= maxVisible) {
                          // Show all pages if 5 or fewer
                          pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
                        } else if (currentPage <= 3) {
                          // Near start: show first 5 pages
                          pageNumbers = [1, 2, 3, 4, 5];
                        } else if (currentPage >= totalPages - 2) {
                          // Near end: show last 5 pages
                          pageNumbers = Array.from({ length: 5 }, (_, i) => totalPages - 4 + i);
                        } else {
                          // In middle: show current page and 2 on each side
                          pageNumbers = [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
                        }

                        return pageNumbers.map(pageNum => (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setPage(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        ));
                      })()}

                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            setPage(p => Math.min(totalPages, p + 1));
                          }}
                          aria-disabled={currentPage === totalPages}
                          tabIndex={currentPage === totalPages ? -1 : undefined}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                  <Server className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">No Servers Found</h3>
                <p className="text-muted-foreground mt-1 mb-4">
                  There are no servers available in the system.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsRefreshing(true);
                    refetch().finally(() => setIsRefreshing(false));
                  }}
                  disabled={isRefreshing}
                  className="mx-auto"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Server List'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </AdminLayout>
  );
}
