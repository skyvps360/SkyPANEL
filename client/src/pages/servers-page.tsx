import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { GoogleAnalyticsTracker } from "../components/GoogleAnalyticsTracker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Server, ArrowRight, AlertCircle, Calendar, MapPin, Cpu, HardDrive, MemoryStick, Zap, Settings } from "lucide-react";
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
  // Add state for rate limiting
  const [refreshClicks, setRefreshClicks] = useState<number[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);

  // Fetch branding data
  const { data: brandingData } = useQuery<{
    company_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ['/api/settings/branding'],
  });

  // Get brand colors using the newer structure
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  });

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
    const now = Date.now();
    setRefreshClicks(prevClicks => {
      const recentClicks = prevClicks.filter(ts => now - ts < 60000);
      if (recentClicks.length >= 2) {
        setIsRateLimited(true);
        return recentClicks;
      }
      // Allow refresh, update state, and trigger refresh
      setIsRefreshing(true);
      refetch().finally(() => setIsRefreshing(false));
      return [...recentClicks, now];
    });
  };

  // Effect to re-enable button after 60s if rate limited
  useEffect(() => {
    if (!isRateLimited) return;
    const now = Date.now();
    const timeout = setTimeout(() => {
      setIsRateLimited(false);
      // Remove old timestamps
      setRefreshClicks(clicks => clicks.filter(ts => now - ts < 60000));
    }, 60000 - (now - (refreshClicks[0] || now)));
    return () => clearTimeout(timeout);
  }, [isRateLimited, refreshClicks]);

  if (isError) {
    return (
      <>
        <GoogleAnalyticsTracker />
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
      </>
    );
  }

  return (
    <>
      <GoogleAnalyticsTracker />
      <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-300/60 shadow-xl">
          <div className="p-8 md:p-12 flex flex-col lg:flex-row lg:items-center lg:justify-between relative z-10">
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
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'RUNNING').length} Running
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'STOPPED').length} Stopped
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <span className="text-sm font-medium text-foreground">
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'SUSPENDED').length} Suspended
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
                disabled={isRefreshing || isRateLimited}
                variant="outline"
                className="transition-all duration-200"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : isRateLimited ? 'Rate limit: wait 1 min' : 'Refresh'}
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

        {/* Enhanced Filters Section */}
        <Card className="shadow-xl border border-gray-300/60">
          <CardContent className="p-6">
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
          </CardContent>
        </Card>

        {/* Loading State for Modern Table */}
        {isLoading ? (
          <Card className="shadow-xl border border-gray-300/60">
            <div className="overflow-hidden">
              {/* Table Header */}
              <div className="bg-gray-50/80 border-b border-gray-200 px-8 py-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-40" />
                </div>
              </div>
              
              {/* Loading Rows */}
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="px-8 py-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6 flex-1">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-5 w-64" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-24 rounded-lg" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ) : servers?.length ? (
          <>
            {/* Modern Server Management Table */}
            <Card className="shadow-xl border border-gray-300/60 overflow-hidden">
              {/* Table Header */}
              <div 
                className="px-8 py-5 border-b border-gray-200/80 backdrop-blur-sm"
                style={{
                  background: `linear-gradient(135deg, ${brandColors.primary.full}15, ${brandColors.secondary.full}10)`
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-2 rounded-lg text-white shadow-md"
                      style={{ backgroundColor: brandColors.primary.full }}
                    >
                      <Server className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Server Infrastructure</h3>
                      <p className="text-sm text-muted-foreground">
                        {filteredServers.length} server{filteredServers.length !== 1 ? 's' : ''} • 
                        {filteredServers.filter((s: any) => getServerStatus(s) === 'RUNNING').length} running
                      </p>
                    </div>
                  </div>
                  <div className="hidden lg:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <span className="min-w-[140px]">Location</span>
                    <span className="min-w-[100px]">Status</span>
                    <span className="min-w-[70px]">CPU</span>
                    <span className="min-w-[80px]">RAM</span>
                    <span className="min-w-[90px]">Storage</span>
                    <span className="min-w-[100px]">Actions</span>
                  </div>
                </div>
              </div>

              {/* Server Rows */}
              <div className="divide-y divide-gray-100/60">
                {servers.map((server: any, index: number) => {
                  const status = getServerStatus(server);
                  const isRunning = status === 'RUNNING';
                  const isStopped = status === 'STOPPED';
                  const isSuspended = status === 'SUSPENDED';

                  return (
                    <div
                      key={server.id}
                      className={`group px-8 py-6 hover:bg-gray-50/60 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Server Info Section */}
                        <div className="flex items-center gap-6 flex-1 min-w-0">
                          <div
                            className="flex items-center justify-center h-12 w-12 rounded-full text-white shadow-lg transition-all duration-200 flex-shrink-0"
                            style={{
                              backgroundColor: isRunning 
                                ? brandColors.primary.full 
                                : isSuspended 
                                ? '#ef4444' 
                                : '#6b7280'
                            }}
                          >
                            <Server className="h-6 w-6" />
                          </div>
                          
                          {/* Server Name & Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="text-lg font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                                <span className="break-all">{server.name}</span>
                              </h4>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                                ID: {server.id}
                              </span>
                              {server.created && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(server.created).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Server Stats & Actions - Individual Columns */}
                        <div className="flex items-center gap-6 flex-shrink-0">
                          {/* Location Column */}
                          <div className="hidden lg:block text-sm font-medium text-muted-foreground min-w-[140px]">
                            {server.hypervisor?.name ? (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                <span className="truncate">{server.hypervisor.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </div>
                          
                          {/* Status Column */}
                          <div className="min-w-[100px]">
                            <Badge
                              variant={getStatusBadgeVariant(status)}
                              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                                isRunning
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : isSuspended
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              <div className={`w-2 h-2 rounded-full mr-2 ${
                                isRunning ? 'bg-green-500' : isSuspended ? 'bg-red-500' : 'bg-gray-500'
                              }`}></div>
                              {status}
                            </Badge>
                          </div>
                          
                          {/* CPU Column */}
                          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[70px]">
                            <Cpu className="h-4 w-4" />
                            <span>
                              {server.cpu?.cores !== undefined && server.cpu?.cores !== null ? `${server.cpu.cores}c` : '—'}
                            </span>
                          </div>
                          
                          {/* RAM Column */}
                          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[80px]">
                            <MemoryStick className="h-4 w-4" />
                            <span>
                              {(() => {
                                const memoryMb = server?.settings?.resources?.memory;
                                const legacyMemory = server.memory;
                                if (typeof memoryMb === 'number' && !isNaN(memoryMb)) {
                                  return `${(memoryMb / 1024).toFixed(0)}GB`;
                                } else if (legacyMemory && !isNaN(parseInt(legacyMemory, 10))) {
                                  return `${(parseInt(legacyMemory, 10) / 1024).toFixed(0)}GB`;
                                } else {
                                  return '—';
                                }
                              })()}
                            </span>
                          </div>
                          
                          {/* Storage Column */}
                          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[90px]">
                            <HardDrive className="h-4 w-4" />
                            <span>
                              {server.storage?.length > 0 && server.storage[0]?.capacity !== undefined && server.storage[0]?.capacity !== null
                                ? `${server.storage[0].capacity}GB`
                                : '—'}
                            </span>
                          </div>
                          
                          {/* Actions Column */}
                          <div className="min-w-[100px]">
                            <Link href={`/servers/${server.id}`}>
                              <Button
                                size="sm"
                                className="text-white shadow-md transition-all duration-300 group-hover:scale-105 hover:shadow-lg w-full"
                                style={{
                                  backgroundColor: brandColors.primary.full,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = `${brandColors.primary.full}dd`;
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = brandColors.primary.full;
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" />
                                Manage
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2 bg-card rounded-full border border-border shadow-sm p-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage <= 1}
                    className="rounded-full disabled:opacity-50"
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
                            variant={pageNum === currentPage ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className={`rounded-full ${
                              pageNum === currentPage
                                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                : ""
                            }`}
                          >
                            {pageNum}
                          </Button>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage >= totalPages}
                    className="rounded-full disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Enhanced Empty State */
          <Card className="shadow-xl border border-gray-300/60">
            <CardContent className="text-center py-16 px-8">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-lg">
                <Server className="h-10 w-10 text-primary" />
              </div>

              <h3 className="text-2xl font-bold text-foreground mb-3">
                {searchQuery || statusFilter !== 'all' ? 'No servers found' : 'No servers yet'}
              </h3>

              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                {searchQuery || statusFilter !== 'all'
                  ? 'No servers match your current search criteria. Try adjusting your filters or search terms.'
                  : `You don't have any servers yet. Create your first server to get started with your virtual infrastructure.`}
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
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
    </>
  );
}
