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
import { Search, RefreshCw, Server, ArrowRight, AlertCircle, Calendar, MapPin, Activity, Cpu, HardDrive, MemoryStick, Zap, Settings } from "lucide-react";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";
import { getBrandColors } from "@/lib/brand-theme";

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

  // Get brand colors for consistent theming
  const brandColors = getBrandColors();

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
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Server className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      My Servers
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Manage and monitor your virtual servers
                    </p>
                  </div>
                </div>

                {/* Server Stats Summary */}
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {filteredServers.filter(s => getServerStatus(s) === 'RUNNING').length} Running
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">
                      {filteredServers.filter(s => getServerStatus(s) === 'STOPPED').length} Stopped
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <span className="text-sm font-medium text-foreground">
                      {filteredServers.filter(s => getServerStatus(s) === 'SUSPENDED').length} Suspended
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                <VirtFusionSsoButton
                  text="Create Server"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                />
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="transition-all duration-200"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters Section */}
        <div className="rounded-xl bg-card border border-border shadow-md">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search Servers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by name, ID, or location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-11 transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Filter by Status
                  </label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px] h-11">
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

                <div className="flex items-end">
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-lg border border-border">
                    <span className="font-medium">{filteredServers.length}</span> of{' '}
                    <span className="font-medium">{allServers.length}</span> servers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Loading State */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-card border border-border shadow-md">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>

                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : servers?.length ? (
          <>
            {/* Modern Server Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {servers.map((server: any) => {
                const status = getServerStatus(server);
                const isRunning = status === 'RUNNING';
                const isStopped = status === 'STOPPED';
                const isSuspended = status === 'SUSPENDED';

                return (
                  <div
                    key={server.id}
                    className="group rounded-xl bg-card border border-border shadow-md hover:shadow-xl hover:border-border/80 transition-all duration-300"
                  >
                    <div className="p-6">
                      {/* Header with Status */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex items-center justify-center h-10 w-10 rounded-lg text-white shadow-sm transition-all duration-200 ${
                              isRunning ? 'bg-primary shadow-lg' : isSuspended ? 'bg-destructive' : 'bg-muted-foreground'
                            }`}
                          >
                            <Server className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-foreground group-hover:text-muted-foreground transition-colors">
                              {server.name}
                            </h3>
                            <p className="text-sm text-muted-foreground font-mono">
                              ID: {server.id}
                            </p>
                          </div>
                        </div>

                        <Badge
                          variant={getStatusBadgeVariant(status)}
                          className={`${
                            isRunning
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : isSuspended
                              ? 'bg-destructive/10 text-destructive border-destructive/20'
                              : 'bg-muted text-muted-foreground border-border'
                          } font-medium`}
                        >
                          <div className={`w-2 h-2 rounded-full mr-1.5 ${
                            isRunning ? 'bg-primary' : isSuspended ? 'bg-destructive' : 'bg-muted-foreground'
                          }`} />
                          {status}
                        </Badge>
                      </div>

                      {/* Server Details */}
                      <div className="space-y-3 mb-6">
                        {server.hypervisor?.name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4 text-muted-foreground/60" />
                            <span>{server.hypervisor.name}</span>
                          </div>
                        )}
                        {server.created && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4 text-muted-foreground/60" />
                            <span>Created {new Date(server.created).toLocaleDateString()}</span>
                          </div>
                        )}

                        {/* Resource Info (if available) */}
                        {(server.cpu?.cores || server.memory || server.storage?.length > 0) && (
                          <div className="flex items-center gap-4 pt-2 border-t border-border">
                            {server.cpu?.cores && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Cpu className="h-3 w-3" />
                                <span>{server.cpu.cores} CPU</span>
                              </div>
                            )}
                            {server.memory && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MemoryStick className="h-3 w-3" />
                                <span>{server.memory}MB</span>
                              </div>
                            )}
                            {server.storage?.length > 0 && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <HardDrive className="h-3 w-3" />
                                <span>{server.storage[0]?.capacity || 'Storage'}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Link href={`/servers/${server.id}`}>
                        <Button
                          className="w-full hover:bg-primary hover:text-primary-foreground transition-all duration-200 group-hover:shadow-md"
                          variant="outline"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Manage Server
                          <ArrowRight className="ml-auto h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2 bg-card rounded-xl border border-border shadow-sm p-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="disabled:opacity-50"
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
                            className={pageNum === currentPage
                              ? "bg-primary text-primary-foreground hover:bg-primary/90"
                              : ""
                            }
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
                    className="disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Enhanced Empty State */
          <div className="rounded-xl bg-card border border-border shadow-md">
            <div className="text-center py-16 px-8">
              <div className="mx-auto h-16 w-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 shadow-lg">
                <Server className="h-8 w-8 text-primary" />
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">
                {searchQuery || statusFilter !== 'all' ? 'No servers found' : 'No servers yet'}
              </h3>

              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No servers match your current search criteria. Try adjusting your filters or search terms.'
                  : 'You don\'t have any servers yet. Create your first server to get started with your virtual infrastructure.'}
              </p>

              {searchQuery || statusFilter !== 'all' ? (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                    variant="outline"
                  >
                    Clear Filters
                  </Button>
                  <VirtFusionSsoButton
                    text="Create New Server"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                  />
                </div>
              ) : (
                <VirtFusionSsoButton
                  text="Create Your First Server"
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
