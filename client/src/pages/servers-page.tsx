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
import { Search, RefreshCw, Server, ArrowRight, AlertCircle, Calendar, MapPin, Cpu, HardDrive, MemoryStick, Zap, Settings } from "lucide-react";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";
import ClientServerCreateModal from "@/components/ClientServerCreateModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// OS Icon Components
const UbuntuIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="#E95420" />
    <circle cx="12" cy="6" r="2" fill="white" />
    <circle cx="6" cy="15" r="2" fill="white" />
    <circle cx="18" cy="15" r="2" fill="white" />
    <path d="M12 8v4M8.5 13.5l3.5-2M15.5 13.5l-3.5-2" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const DebianIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2.34-.21 3.41-.6-.32-.15-.62-.33-.9-.54-1.4.45-2.9.14-3.51-1.86 0 0-.5-1.5-2-1.5s-2.5 1-3.5 0c-.5-.5-.5-1.5 0-2s1.5-1 2.5-1 2 .5 2.5 1.5c.3.6.7 1 1.2 1.2.8-.4 1.3-1.2 1.3-2.2 0-1.3-1.1-2.4-2.4-2.4-.7 0-1.3.3-1.8.7-.2-.3-.3-.7-.3-1.1 0-.8.4-1.5 1-2 .3-.2.6-.3 1-.3.8 0 1.5.7 1.5 1.5 0 .4-.2.8-.5 1 .4.2.7.6.7 1.1 0 .7-.6 1.3-1.3 1.3-.4 0-.7-.2-1-.4-.1.2-.1.4-.1.6 0 .9.7 1.6 1.6 1.6.5 0 .9-.2 1.2-.6.2.1.4.1.6.1.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.5-1.1.6-.4 1-.9 1.3-1.6C21.79 14.34 22 13.19 22 12c0-5.52-4.48-10-10-10z" fill="#A81D33" />
  </svg>
);

const CentOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#932279" />
    <path d="M7 12l3-3h4l3 3-3 3h-4z" fill="white" />
    <circle cx="12" cy="12" r="2" fill="#932279" />
    <path d="M12 7v2M17 12h-2M12 17v-2M7 12h2" stroke="white" strokeWidth="1" />
  </svg>
);

const RockyLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M3 20h18L12 4z" fill="#10B981" />
    <path d="M7 17h10l-5-8z" fill="white" />
    <path d="M9 15h6l-3-5z" fill="#10B981" />
    <circle cx="12" cy="18" r="1" fill="#10B981" />
  </svg>
);

const AlmaLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#FF6B35" />
    <path d="M8 10c0-1 1-2 2-2s2 1 2 2v2c0 1-1 2-2 2s-2-1-2-2v-2z" fill="white" />
    <path d="M12 10c0-1 1-2 2-2s2 1 2 2v2c0 1-1 2-2 2s-2-1-2-2v-2z" fill="white" />
    <path d="M9 16c1 1 2 1 3 1s2 0 3-1" stroke="white" strokeWidth="1" fill="none" />
    <path d="M6 8c2-2 4-2 6 0M12 8c2-2 4-2 6 0" stroke="white" strokeWidth="1" fill="none" />
  </svg>
);

const FedoraIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#294172" />
    <path d="M8 12c0-2.2 1.8-4 4-4v8c-2.2 0-4-1.8-4-4z" fill="white" />
    <path d="M12 8c2.2 0 4 1.8 4 4s-1.8 4-4 4" stroke="white" strokeWidth="2" fill="none" />
    <text x="12" y="16" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">f</text>
  </svg>
);

const WindowsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M3 5.5l7.5-1v7H3v-6z" fill="#00BCF2" />
    <path d="M11.5 4.5L21 3v8.5h-9.5V4.5z" fill="#00BCF2" />
    <path d="M3 12.5h7.5v7L3 18.5v-6z" fill="#00BCF2" />
    <path d="M11.5 12.5H21V21l-9.5-1.5v-7z" fill="#00BCF2" />
  </svg>
);

const ArchLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2l-1.5 3-1 2-1 2-1.5 3-1.5 3-1.5 3h4l1-2 1-2 1-2 1 2 1 2 1 2h4l-1.5-3-1.5-3-1.5-3-1-2-1-2L12 2z" fill="#1793D1" />
    <path d="M12 6l-2 4h4l-2-4z" fill="white" />
  </svg>
);

const FreeBSDIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#CC0000" />
    <path d="M8 10c0-1 1-2 2-2 .5 0 1 .2 1.4.6.4-.4.9-.6 1.4-.6 1 0 2 1 2 2v1c0 .5-.2 1-.6 1.4.4.4.6.9.6 1.4 0 1-1 2-2 2-.5 0-1-.2-1.4-.6-.4.4-.9.6-1.4.6-1 0-2-1-2-2 0-.5.2-1 .6-1.4-.4-.4-.6-.9-.6-1.4v-1z" fill="white" />
    <circle cx="10" cy="9" r="1" fill="#CC0000" />
    <circle cx="14" cy="9" r="1" fill="#CC0000" />
    <path d="M10 13c1 1 2 1 4 0" stroke="#CC0000" strokeWidth="1" fill="none" />
  </svg>
);

const AlpineIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M2 20l4-8 4 8z" fill="#0D597F" />
    <path d="M8 20l4-12 4 12z" fill="#0D597F" />
    <path d="M14 20l4-8 4 8z" fill="#0D597F" />
    <path d="M6 18l2-4 2 4z" fill="white" />
    <path d="M10 18l2-6 2 6z" fill="white" />
    <path d="M16 18l2-4 2 4z" fill="white" />
  </svg>
);

const UnknownOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="14" rx="2" fill="#6B7280" />
    <rect x="5" y="6" width="14" height="10" rx="1" fill="white" />
    <rect x="7" y="8" width="10" height="1" fill="#6B7280" />
    <rect x="7" y="10" width="6" height="1" fill="#6B7280" />
    <rect x="7" y="12" width="8" height="1" fill="#6B7280" />
    <circle cx="12" cy="20" r="1" fill="#6B7280" />
    <rect x="11" y="18" width="2" height="2" fill="#6B7280" />
  </svg>
);

// Helper function to get OS icon based on OS name
function getOSIconAndColor(osName: string) {
  const name = osName?.toLowerCase() || '';

  if (name.includes('ubuntu')) {
    return { icon: UbuntuIcon };
  } else if (name.includes('debian')) {
    return { icon: DebianIcon };
  } else if (name.includes('centos')) {
    return { icon: CentOSIcon };
  } else if (name.includes('rocky')) {
    return { icon: RockyLinuxIcon };
  } else if (name.includes('alma')) {
    return { icon: AlmaLinuxIcon };
  } else if (name.includes('fedora')) {
    return { icon: FedoraIcon };
  } else if (name.includes('arch')) {
    return { icon: ArchLinuxIcon };
  } else if (name.includes('freebsd')) {
    return { icon: FreeBSDIcon };
  } else if (name.includes('alpine')) {
    return { icon: AlpineIcon };
  } else if (name.includes('windows')) {
    return { icon: WindowsIcon };
  } else {
    return { icon: UnknownOSIcon };
  }
}

// Helper function to extract OS template ID from server data
function extractOSTemplateId(serverData: any): number | null {
  // Try multiple possible locations for OS template ID
  const possiblePaths = [
    serverData?.settings?.osTemplateInstallId,
    serverData?.osTemplateInstallId,
    serverData?.osTemplateId,
    serverData?.templateId,
    serverData?.os?.templateId,
    serverData?.os?.id,
    serverData?.template?.id
  ];

  for (const path of possiblePaths) {
    if (path && typeof path === 'number') {
      return path;
    }
  }

  return null;
}

// Helper function to get OS info for a server
function getServerOSInfo(serverData: any) {
  // Fallback to OS name from server data if available
  const osName = serverData?.os?.name || serverData?.operatingSystem;
  if (osName && typeof osName === 'string') {
    const { icon } = getOSIconAndColor(osName);
    return {
      name: osName,
      icon
    };
  }

  // If no OS name found, return unknown
  return { name: "Unknown OS", icon: UnknownOSIcon };
}

function getStatusBadgeVariant(status: string) {
  const normalizedStatus = status.toLowerCase();

  switch (normalizedStatus) {
    case 'running':
      return 'default';
    case 'stopped':
      return 'secondary';
    case 'suspended':
      return 'destructive';
    case 'building':
    case 'pending':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getServerStatus(server: any) {
  if (server.remoteState?.state) {
    const state = server.remoteState.state.toLowerCase();
    if (state === 'running' || server.remoteState.running === true) {
      return 'RUNNING';
    } else if (state === 'stopped' || server.remoteState.running === false) {
      return 'STOPPED';
    }
  }

  if (server.powerStatus?.powerState) {
    const powerState = server.powerStatus.powerState.toLowerCase();
    if (powerState === 'running') return 'RUNNING';
    if (powerState === 'stopped') return 'STOPPED';
  }

  if (server.state) {
    const state = server.state.toLowerCase();
    if (state === 'complete') return 'RUNNING';
    if (state === 'running') return 'RUNNING';
    if (state === 'stopped') return 'STOPPED';
    if (state === 'suspended') return 'SUSPENDED';
    if (state === 'pending' || state === 'building') return 'BUILDING';
  }

  if (server.commissioned === 3) return 'RUNNING';
  if (server.commissioned === 0) return 'STOPPED';

  return 'UNKNOWN';
}



export default function ServersPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshClicks, setRefreshClicks] = useState<number[]>([]);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: brandingData } = useQuery<{
    company_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ['/api/settings/branding'],
  });

  // Fetch VirtFusion cron status to determine if server creation should be available
  const { data: virtfusionCronData } = useQuery<{
    success: boolean;
    cronStatus: {
      virtfusionHourly: {
        enabled: boolean;
        schedule: string;
        isRunning: boolean;
      };
      virtfusionMonthly: {
        enabled: boolean;
        schedule: string;
        isRunning: boolean;
      };
    };
  }>({
    queryKey: ['/api/admin/cron/status', 'virtfusion'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cron/status');
      if (!response.ok) {
        throw new Error('Failed to fetch VirtFusion cron status');
      }
      return response.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  });

  // Get pattern backgrounds for visual elements
  const patterns = getPatternBackgrounds({
    primaryColor: brandingData?.primary_color
  });

  // Check if VirtFusion cron sync is enabled (either hourly or monthly billing)
  const isVirtFusionEnabled = virtfusionCronData?.cronStatus?.virtfusionHourly?.enabled || 
                             virtfusionCronData?.cronStatus?.virtfusionMonthly?.enabled;

  const { data: serversResponse, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ['/api/user/servers'],
    queryFn: async () => {
      const response = await fetch('/api/user/servers');
      if (!response.ok) {
        throw new Error('Failed to fetch servers');
      }
      return response.json();
    },
    staleTime: 30000,
  });

  const allServers = serversResponse?.data || [];

  const filteredServers = allServers.filter((server: any) => {
    // Temporary debugging for server ID 278 to see what fields are available
    if (server.id === 278) {
      console.log('Server 278 data:', {
        id: server.id,
        name: server.name,
        deleteLevel: server.deleteLevel,
        state: server.state,
        commissionStatus: server.commissionStatus,
        scheduledDeletion: server.scheduledDeletion,
        deletionScheduled: server.deletionScheduled,
        deleteScheduled: server.deleteScheduled,
        deletedAt: server.deletedAt,
        scheduledForDeletion: server.scheduledForDeletion,
        deletionDate: server.deletionDate
      });
    }

    // Exclude servers that are being deleted - check multiple possible fields
    if (server.deleteLevel && server.deleteLevel > 0) {
      return false;
    }
    
    // Also check if server has a deletion scheduled (alternative field names)
    if (server.scheduledDeletion || server.deletionScheduled || server.deleteScheduled) {
      return false;
    }
    
    // Check if server state indicates deletion
    if (server.state === 'deleting' || server.state === 'deleted' || server.state === 'scheduled_deletion') {
      return false;
    }
    
    // Check commissionStatus - if it's 0, the server might be decommissioned/deleted
    if (server.commissionStatus === 0) {
      return false;
    }
    
    // Check if server has a deletion timestamp or scheduled deletion
    if (server.deletedAt || server.scheduledForDeletion || server.deletionDate) {
      return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        server.name?.toLowerCase().includes(query) ||
        server.id?.toString().includes(query) ||
        server.hypervisor?.name?.toLowerCase().includes(query);

      if (!matchesSearch) return false;
    }

    if (statusFilter !== 'all') {
      const serverStatus = getServerStatus(server).toLowerCase();
      if (statusFilter === 'running' && serverStatus !== 'running') return false;
      if (statusFilter === 'stopped' && serverStatus !== 'stopped') return false;
      if (statusFilter === 'suspended' && serverStatus !== 'suspended') return false;
    }

    return true;
  });

  const itemsPerPage = 12;
  const totalPages = Math.ceil(filteredServers.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const servers = filteredServers.slice(startIndex, endIndex);
  const currentPage = page;

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
      setIsRefreshing(true);
      refetch().finally(() => setIsRefreshing(false));
      return [...recentClicks, now];
    });
  };

  useEffect(() => {
    if (!isRateLimited) return;
    const now = Date.now();
    const timeout = setTimeout(() => {
      setIsRateLimited(false);
      setRefreshClicks(clicks => clicks.filter(ts => now - ts < 60000));
    }, 60000 - (now - (refreshClicks[0] || now)));
    return () => clearTimeout(timeout);
  }, [isRateLimited, refreshClicks]);



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
        {/* Header Section */}
        <div className="relative overflow-hidden w-full rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-300/60 shadow-xl">
          {/* Decorative bubble elements */}
          <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-10"
               style={{ backgroundColor: brandColors.primary.full }}></div>
          <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-5"
               style={{ backgroundColor: brandColors.secondary.full }}></div>
          <div className="absolute top-1/4 right-10 w-32 h-32 rounded-full opacity-10"
               style={{ backgroundColor: brandColors.accent?.full || brandColors.primary.full }}></div>
          
          <div className="p-8 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center space-x-4 mb-6 lg:mb-0">
                <div 
                  className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg"
                  style={{ backgroundColor: brandColors.primary.full }}
                >
                  <Server className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">My Servers</h1>
                  <p className="text-muted-foreground text-lg mt-1">Manage and monitor your virtual servers</p>
                  <div className="flex flex-wrap gap-6 mt-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brandColors.primary.full }}
                      ></div>
                      <span className="font-medium text-foreground">{filteredServers.length} Total Servers</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: brandColors.secondary.full }}
                      ></div>
                      <span className="font-medium text-foreground">{filteredServers.filter((s: any) => getServerStatus(s) === 'RUNNING').length} Running</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Status Summary */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'RUNNING').length} Running
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'STOPPED').length} Stopped
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {filteredServers.filter((s: any) => getServerStatus(s) === 'SUSPENDED').length} Suspended
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              {isVirtFusionEnabled && (
                <Button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                >
                  <Server className="h-4 w-4" />
                  Create Server in {brandingData?.company_name || 'SkyPANEL'}
                </Button>
              )}
              {!isVirtFusionEnabled && (
                <VirtFusionSsoButton text="Create Server" />
              )}
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing || isRateLimited}
                variant="outline"
                className="transition-all duration-200 shadow-sm hover:shadow"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : isRateLimited ? 'Rate limit: wait 1 min' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Servers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="font-medium">{filteredServers.length}</span> of{' '}
                    <span className="font-medium">{allServers.length}</span> servers
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading ? (
          <Card className="shadow-sm border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="px-4 py-4 w-1/3 min-w-[280px]"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="hidden xl:table-cell px-3 py-4 w-32"><Skeleton className="h-4 w-16" /></TableHead>
                  <TableHead className="px-3 py-4 w-24"><Skeleton className="h-4 w-12" /></TableHead>
                  <TableHead className="hidden lg:table-cell px-3 py-4 w-40"><Skeleton className="h-4 w-20" /></TableHead>
                  <TableHead className="px-3 py-4 w-28"><Skeleton className="h-4 w-14" /></TableHead>
                  <TableHead className="px-3 py-4 w-24"><Skeleton className="h-4 w-16" /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-16" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden xl:table-cell px-3 py-4"><Skeleton className="h-3 w-20" /></TableCell>
                    <TableCell className="px-3 py-4">
                      <div className="flex flex-col gap-1">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell px-3 py-4">
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-3 w-14" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </TableCell>
                    <TableCell className="px-3 py-4"><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
                    <TableCell className="px-3 py-4"><Skeleton className="h-7 w-16 rounded-lg" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        ) : servers?.length ? (
          <>
            {/* Server List */}
            <Card className="shadow-sm border border-gray-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="px-4 py-4 text-sm font-medium text-gray-600 w-1/3 min-w-[280px]">Server</TableHead>
                    <TableHead className="hidden xl:table-cell px-3 py-4 text-sm font-medium text-gray-600 w-32">Location</TableHead>
                    <TableHead className="px-3 py-4 text-sm font-medium text-gray-600 w-24">Status</TableHead>
                    <TableHead className="hidden lg:table-cell px-3 py-4 text-sm font-medium text-gray-600 w-40">Resources</TableHead>
                    <TableHead className="px-3 py-4 text-sm font-medium text-gray-600 w-28">Billing</TableHead>
                    <TableHead className="px-3 py-4 text-sm font-medium text-gray-600 w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {servers.map((server: any, index: number) => {
                  const status = getServerStatus(server);
                  const isRunning = status === 'RUNNING';
                  const isStopped = status === 'STOPPED';
                  const isSuspended = status === 'SUSPENDED';

                  return (
                      <TableRow
                      key={server.id}
                        className={`group hover:bg-gray-50 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-25/20'
                      }`}
                    >
                        <TableCell className="px-4 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {(() => {
                            const osInfo = getServerOSInfo(server);
                            const OSIcon = osInfo.icon;
                            return (
                              <div
                                className="flex items-center justify-center h-10 w-10 rounded-full text-white shadow-sm transition-all duration-200 flex-shrink-0"
                                style={{
                                  backgroundColor: isRunning 
                                    ? brandColors.primary.full 
                                    : isSuspended 
                                    ? '#ef4444' 
                                    : '#6b7280'
                                }}
                              >
                                <OSIcon className="h-5 w-5" />
                              </div>
                            );
                          })()}
                          
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 leading-tight group-hover:text-primary transition-colors truncate text-sm">
                              {server.name}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                Server ID: {server.id}
                              </span>
                            </div>
                          </div>
                        </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell px-3 py-4 text-sm text-gray-600">
                            {server.hypervisor?.name ? (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate text-xs">{server.hypervisor.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                        </TableCell>
                        <TableCell className="px-3 py-4">
                            <Badge
                              variant={getStatusBadgeVariant(status)}
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                isRunning
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : isSuspended
                                  ? 'bg-red-100 text-red-800 border-red-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                isRunning ? 'bg-green-500' : isSuspended ? 'bg-red-500' : 'bg-gray-500'
                              }`}></div>
                              {status}
                            </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell px-3 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <Cpu className="h-3 w-3" />
                              <span>
                                {server.cpu?.cores !== undefined && server.cpu?.cores !== null ? `${server.cpu.cores} vCPU` : '— vCPU'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <MemoryStick className="h-3 w-3" />
                              <span>
                                {(() => {
                                  const memoryMb = server?.settings?.resources?.memory;
                                  const legacyMemory = server.memory;
                                  if (typeof memoryMb === 'number' && !isNaN(memoryMb)) {
                                    return `${(memoryMb / 1024).toFixed(0)}GB RAM`;
                                  } else if (legacyMemory && !isNaN(parseInt(legacyMemory, 10))) {
                                    return `${(parseInt(legacyMemory, 10) / 1024).toFixed(0)}GB RAM`;
                                  } else {
                                    return '— RAM';
                                  }
                                })()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600">
                              <HardDrive className="h-3 w-3" />
                              <span>
                                {server.storage?.length > 0 && server.storage[0]?.capacity !== undefined && server.storage[0]?.capacity !== null
                                  ? `${server.storage[0].capacity}GB NVMe SSD`
                                  : '— NVMe SSD'}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-4">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                server.billingCycle === 'Hourly' ? 'default' :
                                server.billingCycle === 'Monthly' ? 'secondary' :
                                'outline'
                              }
                              className={`text-xs font-medium px-2 py-1 rounded-full ${
                                server.billingCycle === 'Hourly'
                                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                                  : server.billingCycle === 'Monthly'
                                  ? 'bg-green-100 text-green-800 border-green-200'
                                  : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}
                            >
                              {server.billingCycle || 'Monthly'}
                            </Badge>
                            {server.billingCycle === 'Hourly' && server.totalBilled !== undefined && server.totalBilled > 0 && (
                              <span className="text-xs text-gray-600">
                                Total: ${server.totalBilled.toFixed(5)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-4">
                            <Link href={`/servers/${server.id}`}>
                              <Button
                                size="sm"
                                className="text-white shadow-sm transition-all duration-300 group-hover:scale-105 hover:shadow-md text-xs px-2 py-1"
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
                                <Settings className="mr-1 h-3 w-3" />
                                Manage
                              </Button>
                            </Link>
                        </TableCell>
                      </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2 bg-white rounded-full border border-gray-200 shadow-sm p-1">
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
          /* Empty State */
          <Card className="shadow-sm border border-gray-200">
            <CardContent className="text-center py-16 px-8">
              <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-sm">
                <Server className="h-10 w-10 text-primary" />
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery || statusFilter !== 'all' ? 'No servers found' : 'No servers yet'}
              </h3>

              <p className="text-gray-600 mb-8 max-w-md mx-auto">
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
                  {/* Create Server button temporarily hidden */}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Server creation is temporarily disabled
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Client Server Create Modal - only render if VirtFusion is enabled */}
        {isVirtFusionEnabled && (
          <ClientServerCreateModal
            open={showCreateModal}
            onOpenChange={setShowCreateModal}
            onSuccess={() => {
              // Refresh the server list after successful creation
              refetch();
            }}
            companyName={brandingData?.company_name}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
