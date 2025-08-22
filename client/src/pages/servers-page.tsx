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
  <svg className={className} viewBox="0 0 24 24" fill="#E95420">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm7.5 12c0 .9-.15 1.77-.43 2.58l-2.24-1.3c.12-.41.17-.84.17-1.28 0-.44-.05-.87-.17-1.28l2.24-1.3c.28.81.43 1.68.43 2.58zm-7.5-7.5c.9 0 1.77.15 2.58.43l-1.3 2.24c-.41-.12-.84-.17-1.28-.17s-.87.05-1.28.17l-1.3-2.24C10.23 4.65 11.1 4.5 12 4.5zm0 15c-.9 0-1.77-.15-2.58-.43l1.3-2.24c.41.12.84.17 1.28.17s.87-.05 1.28-.17l1.3 2.24c-.81.28-1.68.43-2.58.43zm-7.5-7.5c0-.9.15-1.77.43-2.58l2.24 1.3c-.12.41-.17.84-.17 1.28 0 .44.05.87.17 1.28l-2.24 1.3C4.65 13.77 4.5 12.9 4.5 12z"/>
    <circle cx="6" cy="12" r="2"/>
    <circle cx="18" cy="12" r="2"/>
    <circle cx="12" cy="6" r="2"/>
  </svg>
);

const DebianIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#A81D33">
    <path d="M12.515 0.004c-0.322 0.002-0.64 0.014-0.954 0.035 0.314-0.021 0.632-0.033 0.954-0.035zm0.954 0.035c2.89 0.19 5.49 1.51 7.38 3.64-1.89-2.13-4.49-3.45-7.38-3.64zm7.38 3.64c1.85 2.07 2.98 4.78 3.15 7.76-0.17-2.98-1.3-5.69-3.15-7.76zm3.15 7.76c0.02 0.2 0.02 0.4 0.02 0.6 0-0.2 0-0.4-0.02-0.6zm0.02 0.6c0 6.63-5.37 12-12 12s-12-5.37-12-12 5.37-12 12-12c0.2 0 0.4 0 0.6 0.02-0.2-0.02-0.4-0.02-0.6-0.02zm-12 12c-2.98-0.17-5.69-1.3-7.76-3.15 2.07 1.85 4.78 2.98 7.76 3.15zm-7.76-3.15c-2.13-1.89-3.45-4.49-3.64-7.38 0.19 2.89 1.51 5.49 3.64 7.38zm-3.64-7.38c-0.021-0.314-0.033-0.632-0.035-0.954 0.002 0.322 0.014 0.64 0.035 0.954z"/>
  </svg>
);

const CentOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#932279">
    <path d="M12 0L8.5 3.5L12 7L15.5 3.5L12 0zM3.5 8.5L0 12L3.5 15.5L7 12L3.5 8.5zM20.5 8.5L17 12L20.5 15.5L24 12L20.5 8.5zM8.5 20.5L12 24L15.5 20.5L12 17L8.5 20.5zM12 8.5L8.5 12L12 15.5L15.5 12L12 8.5z"/>
  </svg>
);

const RockyLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#10B981">
    <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm0 2.5l6 3v9l-6 3-6-3v-9l6-3zm-3 4.5v6l3-1.5 3 1.5V9l-3 1.5L9 9z"/>
  </svg>
);

const AlmaLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#FF6B35">
    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.5L18.5 8v8L12 19.5 5.5 16V8L12 4.5zM8 10l4 2 4-2v4l-4 2-4-2v-4z"/>
  </svg>
);

const FedoraIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#294172">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm8.485 15.515c-2.343 2.343-5.515 3.485-8.485 3.485s-6.142-1.142-8.485-3.485S0 9.485 0 12s1.142 6.142 3.515 8.485S9.515 24 12 24s6.142-1.142 8.485-3.515S24 14.485 24 12s-1.142-6.142-3.515-8.485zm-8.485 3.485c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z"/>
  </svg>
);

const WindowsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#00A1F1">
    <path d="M0 3.4L9.5 2.2v8.3H0V3.4zm10.5-1.2L24 0v11.5H10.5V2.2zM0 12.5h9.5v8.3L0 19.6v-7.1zm10.5 8.1L24 22V12.5H10.5v8.1z"/>
  </svg>
);

const ArchLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#1793D1">
    <path d="M12 0L2.5 22h3.2l1.8-3.6h9l1.8 3.6h3.2L12 0zm0 5.4l3.6 7.2H8.4L12 5.4z"/>
  </svg>
);

const FreeBSDIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#AB2B28">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.5 6.5c1.5 1.5 2.5 3.5 2.5 5.5 0 4.4-3.6 8-8 8s-8-3.6-8-8 3.6-8 8-8c2 0 3.8.7 5.2 1.8l-1.4 1.4c-1-.8-2.3-1.2-3.8-1.2-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6c0-1.5-.6-2.9-1.5-3.9L18.5 6.5z"/>
    <circle cx="17" cy="7" r="2" fill="#AB2B28"/>
  </svg>
);

const AlpineIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#0D597F">
    <path d="M12 2L4 12l8 10 8-10-8-10zm0 3.5L17.5 12 12 18.5 6.5 12 12 5.5z"/>
    <path d="M12 8L8 12l4 4 4-4-4-4z" fill="#0D597F"/>
  </svg>
);

const UnknownOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#6B7280">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/>
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
