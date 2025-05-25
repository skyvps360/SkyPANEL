import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Server, ArrowRight, AlertCircle, Calendar, MapPin } from "lucide-react";

function getStatusBadgeVariant(status: string) {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'running':
      return 'default'; // Green
    case 'stopped':
      return 'secondary'; // Gray
    case 'suspended':
      return 'destructive'; // Red
    case 'building':
    case 'pending':
      return 'outline'; // Yellow/Orange
    default:
      return 'secondary';
  }
}

function getServerStatus(server: any) {
  // Check multiple possible status fields from VirtFusion API

  // First check remoteState (most reliable for VirtFusion)
  if (server.remoteState?.state) {
    const state = server.remoteState.state.toLowerCase();
    if (state === 'running' || server.remoteState.running === true) {
      return 'RUNNING';
    } else if (state === 'stopped' || server.remoteState.running === false) {
      return 'STOPPED';
    }
  }

  // Check powerStatus
  if (server.powerStatus?.powerState) {
    const powerState = server.powerStatus.powerState.toLowerCase();
    if (powerState === 'running') return 'RUNNING';
    if (powerState === 'stopped') return 'STOPPED';
  }

  // Check main state field
  if (server.state) {
    const state = server.state.toLowerCase();
    if (state === 'complete') return 'RUNNING'; // VirtFusion "complete" means running
    if (state === 'running') return 'RUNNING';
    if (state === 'stopped') return 'STOPPED';
    if (state === 'suspended') return 'SUSPENDED';
    if (state === 'pending' || state === 'building') return 'BUILDING';
  }

  // Check commissioned status (fallback)
  if (server.commissioned === 3) return 'RUNNING';
  if (server.commissioned === 0) return 'STOPPED';

  return 'UNKNOWN';
}

export default function ServersPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch servers from API
  const { data: serversResponse, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/user/servers'],
    queryFn: async () => {
      const response = await fetch('/api/user/servers');
      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const allServers = serversResponse?.data || [];

  // Client-side filtering
  const filteredServers = allServers.filter((server: any) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        server.name?.toLowerCase().includes(query) ||
        server.id?.toString().includes(query) ||
        server.hypervisor?.name?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter !== 'all') {
      const serverStatus = getServerStatus(server).toLowerCase();
      if (statusFilter === 'running' && serverStatus !== 'running') return false;
      if (statusFilter === 'stopped' && serverStatus !== 'stopped') return false;
      if (statusFilter === 'suspended' && serverStatus !== 'suspended') return false;
    }

    return true;
  });

  // Client-side pagination
  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const servers = filteredServers.slice(startIndex, endIndex);
  const currentPage = page;

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  if (isError) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center">
                <AlertCircle className="mr-2 h-5 w-5" />
                Error Loading Servers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-destructive/90 mb-4">
                There was a problem loading your servers. Please try again.
              </p>
              <Button variant="outline" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Servers</h1>
            <p className="text-muted-foreground">
              Manage and monitor your virtual servers
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing} variant="outline">
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search servers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Servers</SelectItem>
                  <SelectItem value="running">Running</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : servers?.length ? (
          <>
            {/* Server Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map((server: any) => {
                const status = getServerStatus(server);

                return (
                  <Card key={server.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Server className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <CardTitle className="text-lg">{server.name}</CardTitle>
                            <p className="text-sm text-muted-foreground font-mono">
                              ID: {server.id}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusBadgeVariant(status)}>
                          {status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Server Info */}
                      <div className="space-y-2">
                        {server.hypervisor?.name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span>{server.hypervisor.name}</span>
                          </div>
                        )}
                        {server.created && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>Created {new Date(server.created).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Link href={`/servers/${server.id}`}>
                        <Button className="w-full" variant="outline">
                          <ArrowRight className="mr-2 h-4 w-4" />
                          Manage Server
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                      if (pageNum <= totalPages) {
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <Card>
            <CardContent className="text-center py-12">
              <Server className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No servers found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? 'No servers match your current filters.'
                  : 'You don\'t have any servers yet.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
