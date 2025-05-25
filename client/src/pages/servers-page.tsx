import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AlertCircle, ArrowRight, Server, RefreshCw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function ServersListPage() {
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [sortField, setSortField] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [perPage, setPerPage] = useState<number>(10);

  // Fetch servers from API with pagination
  const { data: serversResponse, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/user/servers', page],
    queryFn: async () => {
      let url = `/api/user/servers?page=${page}`;

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.error('API Response not OK:', response.status, response.statusText);
          throw new Error('Failed to fetch servers');
        }

        const data = await response.json();
        console.log('Server API response:', data);

        if (data && typeof data === 'object' && 'data' in data) {
          return data;
        } else if (Array.isArray(data)) {
          return {
            data: data,
            current_page: page,
            last_page: Math.ceil(data.length / 10),
            per_page: 10,
            total: data.length
          };
        } else {
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
  };

  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      console.log('Auto-refreshing server list...');
      refetch();
      setLastRefreshed(new Date());
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, refetch]);

  const servers = serversResponse?.data || [];

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

  const totalPages = serversResponse?.last_page || 1;
  const currentPage = serversResponse?.current_page || page;

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
          <h1 className="text-3xl font-bold mt-2">My Servers</h1>
          <p className="text-muted-foreground mt-1">
            View and manage your virtual servers
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
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : servers?.length ? (
              <>
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
                        <TableHead className="hidden md:table-cell">Resources</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedServers.map((server) => {
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
                                <div>
                                  {server?.cpu?.cores || 'N/A'} vCPU • {
                                    server?.settings?.resources?.memory
                                      ? `${(server.settings.resources.memory / 1024).toFixed(1)} GB`
                                      : 'N/A'
                                  } RAM
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {server?.storage && server.storage.length > 0
                                    ? `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB`
                                    : server?.settings?.resources?.storage
                                      ? `${server.settings.resources.storage} GB`
                                      : 'N/A'} Storage
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(status)}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/servers/${server.id}`}>
                                <Button variant="outline" size="sm">
                                  <ArrowRight className="h-4 w-4 mr-1" />
                                  Manage
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="flex justify-center mt-6">
                    <Pagination>
                      <PaginationContent>
                        {currentPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setPage(currentPage - 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}

                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                          if (pageNum <= totalPages) {
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
                          }
                          return null;
                        })}

                        {currentPage < totalPages && (
                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setPage(currentPage + 1)}
                              className="cursor-pointer"
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <Server className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No servers found</p>
                <p className="text-muted-foreground mt-1">
                  You don't have any servers yet. Contact support to get started.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
