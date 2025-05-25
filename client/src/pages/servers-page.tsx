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
import { AlertCircle, ArrowRight, Server, RefreshCw, RotateCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// OS Icon Components
const UbuntuIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4z" fill="#E95420"/>
    <circle cx="4.8" cy="12" r="2.4" fill="#E95420"/>
    <circle cx="19.2" cy="12" r="2.4" fill="#E95420"/>
    <circle cx="12" cy="4.8" r="2.4" fill="#E95420"/>
  </svg>
);

const DebianIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4z" fill="#A81D33"/>
  </svg>
);

const CentOSIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L8 8h8l-4-8zm0 24l4-8H8l4 8zm12-12l-8-4v8l8-4zM0 12l8 4V8l-8 4z" fill="#932279"/>
  </svg>
);

const RockyLinuxIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#10B981" strokeWidth="2" fill="none"/>
  </svg>
);

const AlmaLinuxIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l10 20H2L12 2z" fill="#0EA5E9"/>
  </svg>
);

const FedoraIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#294172"/>
    <path d="M8 8h8v8H8z" fill="#3C6EB4"/>
  </svg>
);

const WindowsIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" fill="#00BCF2"/>
  </svg>
);

const ArchLinuxIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0L2.5 24h3.5L12 6l6 18h3.5L12 0z" fill="#1793D1"/>
  </svg>
);

const FreeBSDIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#990000"/>
    <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="2"/>
  </svg>
);

const AlpineIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2L2 22h20L12 2z" fill="#0D597F"/>
    <path d="M12 8L8 16h8l-4-8z" fill="white"/>
  </svg>
);

const UnknownOSIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="#6B7280"/>
    <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// OS Template mapping - maps osTemplateInstallId to OS information
const OS_TEMPLATES = {
  1: { name: "Ubuntu 20.04 LTS", icon: UbuntuIcon, color: "text-orange-600" },
  2: { name: "Ubuntu 22.04 LTS", icon: UbuntuIcon, color: "text-orange-600" },
  3: { name: "Ubuntu 24.04 LTS", icon: UbuntuIcon, color: "text-orange-600" },
  4: { name: "Debian 11", icon: DebianIcon, color: "text-red-600" },
  5: { name: "Debian 12", icon: DebianIcon, color: "text-red-600" },
  6: { name: "CentOS 7", icon: CentOSIcon, color: "text-purple-600" },
  7: { name: "CentOS 8", icon: CentOSIcon, color: "text-purple-600" },
  8: { name: "Rocky Linux 8", icon: RockyLinuxIcon, color: "text-green-600" },
  9: { name: "Rocky Linux 9", icon: RockyLinuxIcon, color: "text-green-600" },
  10: { name: "AlmaLinux 8", icon: AlmaLinuxIcon, color: "text-blue-600" },
  11: { name: "AlmaLinux 9", icon: AlmaLinuxIcon, color: "text-blue-600" },
  12: { name: "Fedora 38", icon: FedoraIcon, color: "text-blue-700" },
  13: { name: "Fedora 39", icon: FedoraIcon, color: "text-blue-700" },
  14: { name: "openSUSE Leap", icon: RockyLinuxIcon, color: "text-green-700" },
  15: { name: "Arch Linux", icon: ArchLinuxIcon, color: "text-blue-500" },
  16: { name: "Windows Server 2019", icon: WindowsIcon, color: "text-blue-800" },
  17: { name: "Windows Server 2022", icon: WindowsIcon, color: "text-blue-800" },
  18: { name: "FreeBSD 13", icon: FreeBSDIcon, color: "text-red-700" },
  19: { name: "FreeBSD 14", icon: FreeBSDIcon, color: "text-red-700" },
  20: { name: "Alpine Linux", icon: AlpineIcon, color: "text-blue-400" },
  49: { name: "Ubuntu 22.04 LTS", icon: UbuntuIcon, color: "text-orange-600" }, // Your server's template
  // Add more mappings as needed
} as const;

function getOSInfo(osTemplateInstallId: number | null | undefined) {
  if (!osTemplateInstallId) {
    return { name: "Unknown OS", icon: UnknownOSIcon, color: "text-gray-500" };
  }

  return OS_TEMPLATES[osTemplateInstallId as keyof typeof OS_TEMPLATES] ||
         { name: `Template ${osTemplateInstallId}`, icon: UnknownOSIcon, color: "text-gray-600" };
}

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
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  // Filter servers based on search query
  const filteredServers = servers.filter((server: any) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      server.name?.toLowerCase().includes(query) ||
      server.id?.toString().includes(query) ||
      server.uuid?.toLowerCase().includes(query)
    );
  });

  const sortedServers = [...filteredServers].sort((a, b) => {
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
                {/* Search Bar */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search servers by name, ID, or UUID..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  {searchQuery && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Showing {filteredServers.length} of {servers.length} servers
                    </p>
                  )}
                </div>

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
                        <TableHead className="hidden lg:table-cell">Operating System</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedServers.map((server) => {

                        let status;

                        // Enhanced status detection for VirtFusion API response
                        if (server.powerStatus && server.powerStatus.powerState) {
                          if (server.powerStatus.powerState === "RUNNING") {
                            status = "Running";
                          } else if (server.powerStatus.powerState === "STOPPED") {
                            status = "Stopped";
                          } else {
                            status = server.powerStatus.powerState;
                          }
                        } else if (server.remoteState?.state) {
                          // Check remoteState.state from VirtFusion API
                          if (server.remoteState.state === "running" || server.remoteState.running === true) {
                            status = "Running";
                          } else if (server.remoteState.state === "stopped" || server.remoteState.running === false) {
                            status = "Stopped";
                          } else {
                            status = server.remoteState.state;
                          }
                        } else if (server.state) {
                          if (server.state === "running" || server.state === "RUNNING") {
                            status = "Running";
                          } else if (server.state === "stopped" || server.state === "STOPPED") {
                            status = "Stopped";
                          } else if (server.state === "complete") {
                            // "complete" state in VirtFusion means the server is built and running
                            status = "Running";
                          } else {
                            status = server.state;
                          }
                        } else if (server.status) {
                          // Check the status field from VirtFusion API
                          status = server.status;
                        } else {
                          status = server.commissioned === 3 ? 'Online' : 'Offline';
                        }

                        // Get OS information for this server
                        const osInfo = getOSInfo(server.settings?.osTemplateInstallId);

                        return (
                          <TableRow key={server.id}>
                            <TableCell className="font-mono text-xs">
                              {server.id}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="flex items-center" title={osInfo.name}>
                                  <osInfo.icon />
                                </span>
                                <div>
                                  <div className="font-medium">{server.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    UUID: {server.uuid || 'N/A'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="text-sm">
                                <div>
                                  {/* CPU cores from VirtFusion API */}
                                  {server?.cpu?.cores || server?.settings?.resources?.cpuCores || 'N/A'} vCPU • {
                                    /* Memory from VirtFusion API - already in MB */
                                    server?.settings?.resources?.memory
                                      ? `${server.settings.resources.memory} MB`
                                      : 'N/A'
                                  } RAM
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {/* Storage from VirtFusion API */}
                                  {server?.storage && server.storage.length > 0
                                    ? `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB`
                                    : server?.settings?.resources?.storage
                                      ? `${server.settings.resources.storage} GB`
                                      : 'N/A'} Storage
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-2">
                                <span className="flex items-center">
                                  <osInfo.icon />
                                </span>
                                <div>
                                  <div className={`text-sm font-medium ${osInfo.color}`}>
                                    {osInfo.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Template ID: {server.settings?.osTemplateInstallId || 'N/A'}
                                  </div>
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
            ) : searchQuery ? (
              <div className="text-center py-8">
                <Search className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No servers match your search</p>
                <p className="text-muted-foreground mt-1">
                  Try adjusting your search terms or clear the search to see all servers.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search
                </Button>
              </div>
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
