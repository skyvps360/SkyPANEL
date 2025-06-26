import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { getBrandColors } from "@/lib/brand-theme";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Server,
  HardDrive,
  Cpu,
  MemoryStick as Memory,
  Network,
  Power,
  Settings,

  ArrowLeft,
  Database,
  Activity,

  RefreshCw,
  ExternalLink,


  Info as InfoIcon,
  Calendar,
  DownloadCloud,
  UploadCloud,
  LineChart,
  Monitor,
  Copy,
  MemoryStick,
  Zap,
  RotateCcw,
  Square,
  PowerOff,
  ChevronDown,
  FileText,
  Key,
  ScrollText
} from "lucide-react";

// OS Icon Components with actual OS logos
const UbuntuIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#E95420"/>
    <circle cx="4.5" cy="12" r="2.5" fill="white"/>
    <circle cx="19.5" cy="12" r="2.5" fill="white"/>
    <circle cx="12" cy="4.5" r="2.5" fill="white"/>
    <circle cx="4.5" cy="12" r="1" fill="#E95420"/>
    <circle cx="19.5" cy="12" r="1" fill="#E95420"/>
    <circle cx="12" cy="4.5" r="1" fill="#E95420"/>
  </svg>
);

const DebianIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#A81D33"/>
    <path d="M8.5 8.5c1.5-1.5 3.5-1.5 5 0s1.5 3.5 0 5-3.5 1.5-5 0-1.5-3.5 0-5z" fill="white"/>
    <path d="M10 10c.5-.5 1.5-.5 2 0s.5 1.5 0 2-1.5.5-2 0-.5-1.5 0-2z" fill="#A81D33"/>
  </svg>
);

const CentOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="3" fill="#932279"/>
    <path d="M12 4L8 8h8l-4-4z" fill="white"/>
    <path d="M12 20l4-4H8l4 4z" fill="white"/>
    <path d="M4 12l4-4v8l-4-4z" fill="white"/>
    <path d="M20 12l-4 4V8l4 4z" fill="white"/>
  </svg>
);

const RockyLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#10B981"/>
    <path d="M12 3L6 9l6 3 6-3-6-6z" fill="white"/>
    <path d="M6 15l6 3 6-3" stroke="white" strokeWidth="2" fill="none"/>
    <path d="M6 12l6 3 6-3" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

const AlmaLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0EA5E9"/>
    <path d="M12 4l8 16H4l8-16z" fill="white"/>
    <path d="M12 8l4 8H8l4-8z" fill="#0EA5E9"/>
  </svg>
);

const FedoraIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#294172"/>
    <path d="M8 8h8v8H8z" fill="#3C6EB4"/>
    <circle cx="12" cy="12" r="2" fill="white"/>
  </svg>
);

const WindowsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" fill="#00BCF2"/>
    <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-13.051-1.851" fill="white"/>
  </svg>
);

const ArchLinuxIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#1793D1"/>
    <path d="M12 2L4 22h16L12 2z" fill="white"/>
    <path d="M12 6L8 18h8L12 6z" fill="#1793D1"/>
  </svg>
);

const FreeBSDIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#990000"/>
    <path d="M8 8l8 8M16 8l-8 8" stroke="white" strokeWidth="3"/>
    <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" fill="none"/>
  </svg>
);

const AlpineIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#0D597F"/>
    <path d="M12 3L3 21h18L12 3z" fill="white"/>
    <path d="M12 7L7 17h10L12 7z" fill="#0D597F"/>
  </svg>
);

const UnknownOSIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="12" fill="#6B7280"/>
    <path d="M12 8v4M12 16h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

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

// Helper function to format data size to human readable format
const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Traffic Tab Component
const TrafficTab = ({ serverId }: { serverId: number }) => {
  // Fetch traffic data
  const { data: trafficData, isLoading: trafficLoading, error: trafficError } = useQuery({
    queryKey: ['/api/user/servers', serverId, 'traffic'],
    queryFn: async () => {
      const response = await fetch(`/api/user/servers/${serverId}/traffic`);
      if (!response.ok) {
        throw new Error('Failed to fetch traffic data');
      }
      return response.json();
    },
    staleTime: 60000, // Cache for 1 minute before considering stale
  });

  // Process data for charts if available
  const getChartData = () => {
    // Get the correct traffic data path based on the structure returned from the API
    const monthlyTraffic = trafficData?.data?.monthly ||
                          (trafficData?.data?.traffic?.public && trafficData.data.traffic.public.periods) ||
                          [];

    if (!monthlyTraffic || Object.keys(monthlyTraffic).length === 0) {
      return [];
    }

    // Handle different API structures
    if (Array.isArray(monthlyTraffic)) {
      // If it's an array (periods format)
      return monthlyTraffic.map((period: any) => {
        // The limit value in the API is in GB, need to convert to bytes for consistent display
        const limitInBytes = (period.limit || 500) * 1024 * 1024 * 1024; // Convert GB to bytes

        return {
          month: new Date(period.start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          rx: period.rx || 0,
          tx: period.tx || 0,
          total: period.total || 0,
          limit: limitInBytes // Store limit in bytes for consistent formatting
        };
      });
    } else {
      // If it's an object with month keys (monthly format)
      return Object.entries(monthlyTraffic).map(([month, stats]: [string, any]) => {
        // The limit value in the API is in GB, need to convert to bytes for consistent display
        const limitInBytes = (stats.limit || 500) * 1024 * 1024 * 1024; // Convert GB to bytes

        return {
          month,
          rx: stats.rx || 0,
          tx: stats.tx || 0,
          total: stats.total || 0,
          limit: limitInBytes // Store limit in bytes for consistent formatting
        };
      });
    }
  };

  const chartData = getChartData();


  // Current month data for the progress bar - get the first element regardless of format
  const currentMonthData = chartData.length > 0 ? chartData[0] : null;

  const usagePercent = currentMonthData && currentMonthData.limit > 0
    ? Math.min(100, (currentMonthData.total / currentMonthData.limit) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Network Traffic Statistics
          </CardTitle>
          <CardDescription>
            Monthly network traffic usage and statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trafficLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground">Loading traffic data...</p>
            </div>
          )}

          {trafficError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="font-semibold">Error Loading Traffic Data</p>
              <p className="text-sm mt-1">
                {trafficError instanceof Error ? trafficError.message : 'An unknown error occurred'}
              </p>
            </div>
          )}

          {!trafficLoading && !trafficError && chartData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Activity className="h-16 w-16 mb-4 opacity-50" />
              <p>No traffic data available for this server.</p>
              <p className="text-sm mt-1">Traffic statistics will appear here once generated.</p>
            </div>
          )}

          {!trafficLoading && !trafficError && chartData.length > 0 && (
            <div className="space-y-6">
              {/* Traffic Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <DownloadCloud className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Download</h3>
                  <p className="text-2xl font-bold">
                    {currentMonthData ? formatBytes(currentMonthData.rx) : 'N/A'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <UploadCloud className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Upload</h3>
                  <p className="text-2xl font-bold">
                    {currentMonthData ? formatBytes(currentMonthData.tx) : 'N/A'}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <Activity className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Total Usage</h3>
                  <div className="flex flex-col items-center">
                    <p className="text-2xl font-bold mb-1">
                      {currentMonthData ? formatBytes(currentMonthData.total) : 'N/A'}
                    </p>
                    {currentMonthData && (
                      <>
                        <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                          <div
                            className={`h-2.5 rounded-full ${
                              usagePercent > 90 ? 'bg-destructive' :
                              usagePercent > 70 ? 'bg-warning' :
                              'bg-primary'
                            }`}
                            style={{ width: `${usagePercent}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {`${Math.round(usagePercent)}% of ${formatBytes(currentMonthData.limit)}`}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Traffic Chart */}
              <div className="mt-6">
                <h3 className="font-semibold text-md mb-4">Monthly Traffic Breakdown</h3>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis
                        tickFormatter={(value) => formatBytes(value, 1)}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatBytes(value), '']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="rx" name="Download" fill="hsl(var(--primary))" />
                      <Bar dataKey="tx" name="Upload" fill="hsl(var(--primary) / 0.7)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Total Usage Chart */}
              <div className="mt-6">
                <h3 className="font-semibold text-md mb-4">Total Usage vs Limit</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" angle={-45} textAnchor="end" height={60} />
                      <YAxis
                        tickFormatter={(value) => formatBytes(value, 1)}
                        width={100}
                      />
                      <Tooltip
                        formatter={(value: any) => [formatBytes(value), '']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Area type="monotone" dataKey="total" name="Total Usage" fill="hsl(var(--primary) / 0.5)" stroke="hsl(var(--primary))" />
                      <Area type="monotone" dataKey="limit" name="Monthly Limit" fill="hsl(var(--muted) / 0.4)" stroke="hsl(var(--muted-foreground))" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Helper function to format dates
const formatDate = (dateStr: string | Date | undefined): string => {
  if (!dateStr) return 'Unknown';

  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;

  // Check if date is valid
  if (isNaN(date.getTime())) return 'Invalid date';

  // Format as: May 8, 2025 11:30 AM
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

import { Button } from "@/components/ui/button";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ServerLogsModal } from "@/components/server/ServerLogsModal";
import { Breadcrumb } from "@/components/ui/breadcrumb";

// VNC Tab Component
const VNCTab = ({ serverId }: { serverId: number }) => {
  const { toast } = useToast();

  // Get brand colors for styling
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color,
  });

  // Fetch VNC status
  // NOTE: Increased cache time to reduce VNC API calls since each call toggles VNC state
  const { data: vncData, isLoading: vncLoading, error: vncError } = useQuery({
    queryKey: ['/api/user/servers', serverId, 'vnc'],
    queryFn: async () => {
      const response = await fetch(`/api/user/servers/${serverId}/vnc`);
      if (!response.ok) {
        throw new Error('Failed to fetch VNC status');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce API calls
    refetchInterval: false, // Disable automatic refetching
  });



  const vncStatus = vncData?.data?.data?.vnc;
  const isVNCEnabled = vncStatus?.enabled === true;

  // Function to open NoVNC console
  const openVNCConsole = () => {
    if (!vncStatus || !isVNCEnabled) {
      toast({
        title: "VNC Not Available",
        description: "VNC must be enabled before connecting",
        variant: "destructive",
      });
      return;
    }

    // Create VNC console popup
    const vncUrl = `/vnc-console?host=${encodeURIComponent(vncStatus.ip)}&port=${vncStatus.port}&password=${encodeURIComponent(vncStatus.password)}&serverId=${serverId}`;

    // Open VNC console in a new popup window
    const popup = window.open(
      vncUrl,
      'vnc-console',
      'width=1024,height=768,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );

    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to open the VNC console.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "VNC Console Opening",
        description: "VNC console is opening in a new window...",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            VNC Remote Access
          </CardTitle>
          <CardDescription>
            Manage VNC remote desktop access for this server
          </CardDescription>
        </CardHeader>
        <CardContent>
          {vncLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-muted-foreground">Loading VNC status...</p>
            </div>
          )}

          {vncError && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p className="font-semibold">Error Loading VNC Status</p>
              <p className="text-sm mt-1">
                {vncError instanceof Error ? vncError.message : 'An unknown error occurred'}
              </p>
            </div>
          )}

          {!vncLoading && !vncError && (
            <div className="space-y-6">
              {/* VNC Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col space-y-4">
                  {/* Current VNC Status Display */}
                  <div className="bg-muted/40 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">VNC STATUS</h3>
                    <div className="flex items-center gap-2 justify-center mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        isVNCEnabled ? "animate-pulse" : ""
                      }`} style={{
                        backgroundColor: isVNCEnabled ? brandColors.secondary.full : '#ef4444'
                      }}></div>
                      <span className="text-xl font-bold">
                        {isVNCEnabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <UIBadge
                      variant={isVNCEnabled ? "default" : "outline"}
                      className={`px-3 py-1 ${isVNCEnabled ? "text-white" : ""}`}
                      style={isVNCEnabled ? {
                        backgroundColor: brandColors.secondary.full,
                      } : {}}
                    >
                      {isVNCEnabled ? "VNC ACTIVE" : "VNC INACTIVE"}
                    </UIBadge>
                  </div>

                  {/* VNC Actions Description */}
                  <div className="text-sm text-muted-foreground">
                    <h4 className="font-medium mb-1">VNC Remote Access:</h4>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      <li><strong>Remote Desktop</strong> - Access server desktop remotely</li>
                      <li><strong>Browser Console</strong> - Connect via web-based VNC client</li>
                      <li><strong>Secure Connection</strong> - Encrypted VNC session</li>
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col space-y-4">
                  {/* VNC Control Buttons */}
                  <div className="bg-muted/40 p-4 rounded-lg border">
                    <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">VNC CONTROLS</h3>
                    <div className="flex justify-center">
                      {isVNCEnabled ? (
                        <Button
                          variant="outline"
                          className="font-medium transition-all duration-200"
                          onClick={openVNCConsole}
                          size="lg"
                          style={{
                            backgroundColor: brandColors.primary.light,
                            borderColor: brandColors.primary.medium,
                            color: brandColors.primary.dark,
                          }}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Connect to VNC Console
                        </Button>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">VNC is currently disabled</p>
                          <p className="text-xs">Contact administrator to enable VNC access</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* VNC Connection Information */}
              {isVNCEnabled && vncStatus && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Monitor className="h-5 w-5" />
                      VNC Connection Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Connection Information</h3>
                        <table className="w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground w-1/3">Server IP:</td>
                              <td className="py-1 font-medium">{vncStatus.ip || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground">VNC Port:</td>
                              <td className="py-1 font-medium">{vncStatus.port || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground">Hostname:</td>
                              <td className="py-1 font-medium">{vncStatus.hostname || 'N/A'}</td>
                            </tr>
                            {vncStatus.password && (
                              <tr>
                                <td className="py-1 pr-2 text-muted-foreground">Password:</td>
                                <td className="py-1 font-medium">
                                  <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                                    {vncStatus.password}
                                  </code>
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">Connection Instructions</h3>
                        <div className="text-sm text-muted-foreground space-y-2">
                          <p>To connect to this server via VNC:</p>
                          <ol className="list-decimal list-inside space-y-1 pl-2">
                            <li>Use a VNC client (like TightVNC, RealVNC, or UltraVNC)</li>
                            <li>Connect to: <code className="bg-muted px-1 rounded">{vncStatus.ip}:{vncStatus.port}</code></li>
                            {vncStatus.password && (
                              <li>Enter password: <code className="bg-muted px-1 rounded">{vncStatus.password}</code></li>
                            )}
                            <li>Click "Connect" to access the remote desktop</li>
                          </ol>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* VNC Not Enabled Message */}
              {!isVNCEnabled && (
                <div className="text-center py-8 text-muted-foreground">
                  <Monitor className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">VNC is currently disabled</p>
                  <p className="text-sm mt-1">
                    Enable VNC to allow remote desktop access to this server.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Power Status Badge Component
const PowerStatusBadge = ({ server }: { server: any }) => {
  // Check if remoteState exists and use its state, otherwise fall back to server.state
  const powerState = server?.remoteState?.state || server.state;
  const isRunning = server?.remoteState?.running || powerState === "running";

  // Get brand colors for styling
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color,
  });


  return (
    <UIBadge
      className={`${
        isRunning ? "bg-primary text-primary-foreground hover:bg-primary/90" :
        powerState === "stopped" ? "bg-muted text-muted-foreground" :
        ""
      }`}
      style={
        powerState === "shutdown" ? {
          backgroundColor: brandColors.accent.light,
          color: brandColors.accent.dark,
        } :
        powerState === "paused" ? {
          backgroundColor: '#fef3c7',
          color: '#92400e',
        } : {}
      }
      variant={
        isRunning ? "default" :
        powerState === "stopped" ? "outline" :
        powerState === "shutdown" ? "secondary" :
        powerState === "paused" ? "secondary" :
        "outline"
      }
    >
      {isRunning ? "RUNNING" :
       powerState === "stopped" ? "STOPPED" :
       powerState === "shutdown" ? "SHUTTING DOWN" :
       powerState === "paused" ? "PAUSED" :
       powerState || "UNKNOWN"}
    </UIBadge>
  );
};

// Server detail component
export default function ServerDetailPage() {
  const { id } = useParams();
  const serverId = parseInt(id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for storing generated password and active tab
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);

  // Ensure activeTab is valid (redirect console to overview since we removed it)
  useEffect(() => {
    if (activeTab === "console") {
      setActiveTab("overview");
    }
  }, [activeTab]);

  // Fetch branding settings for brand colors
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Generate brand colors
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || brandingData?.company_color,
    secondaryColor: brandingData?.secondary_color,
  });



  // Load saved password from localStorage on initial render
  useEffect(() => {
    try {
      const savedPasswordData = localStorage.getItem(`server_password_${id}`);
      if (savedPasswordData) {
        const parsedData = JSON.parse(savedPasswordData);
        // Check if the saved password is for the correct server
        if (parsedData.serverId == id) {
          setGeneratedPassword(parsedData.password);
        }
      }
    } catch (e) {
      console.error('Failed to load password from localStorage:', e);
    }
  }, [id]);

  // Function to copy text to clipboard with context-aware messaging
  const copyToClipboard = (text: string, type: 'password' | 'mac' | 'ip' | 'subnet' | 'uuid' = 'password') => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Different messages based on what's being copied
        let description = "";
        switch(type) {
          case 'password':
            description = "Password copied to clipboard successfully.";
            break;
          case 'mac':
            description = "MAC address copied to clipboard successfully.";
            break;
          case 'ip':
            description = "IP address copied to clipboard successfully.";
            break;
          case 'subnet':
            description = "Subnet information copied to clipboard successfully.";
            break;
          case 'uuid':
            description = "UUID copied to clipboard successfully.";
            break;
          default:
            description = "Text copied to clipboard successfully.";
        }

        toast({
          title: "Copied to Clipboard",
          description,
          duration: 3000,
        });
      })
      .catch((err) => {
        console.error('Failed to copy text: ', err);

        // Error message based on context
        let errorDescription = "";
        switch(type) {
          case 'password':
            errorDescription = "Failed to copy password to clipboard.";
            break;
          case 'mac':
            errorDescription = "Failed to copy MAC address to clipboard.";
            break;
          case 'ip':
            errorDescription = "Failed to copy IP address to clipboard.";
            break;
          case 'subnet':
            errorDescription = "Failed to copy subnet information to clipboard.";
            break;
          case 'uuid':
            errorDescription = "Failed to copy UUID to clipboard.";
            break;
          default:
            errorDescription = "Failed to copy text to clipboard.";
        }

        toast({
          title: "Copy Failed",
          description: errorDescription,
          variant: "destructive",
        });
      });
  };

  // Fetch server details with auto-refreshing
  const { data: serverResponse, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/user/servers', id],
    queryFn: async () => {
      if (!id || isNaN(serverId)) {
        throw new Error('Invalid server ID');
      }

      const response = await fetch(`/api/user/servers/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch server details');
      }

      return response.json();
    },
    enabled: !!id && !isNaN(serverId),
    refetchInterval: 10000, // Reduced frequency to 10 seconds to prevent infinite loops
    staleTime: 5000, // Cache for 5 seconds
  });

  // Extract the server data from the response
  const server = serverResponse?.data;

  // Fetch OS templates to get OS information
  const { data: osTemplates } = useQuery({
    queryKey: ['/api/admin/all-templates'],
    queryFn: async () => {
      try {
        // Try the all-templates endpoint first (works for authenticated users)
        const response = await fetch('/api/admin/all-templates');
        if (!response.ok) {
          throw new Error('Failed to fetch OS templates');
        }
        const data = await response.json();
        return data?.data || [];
      } catch (error) {
        console.error('Error fetching OS templates from all-templates:', error);

        // Fallback to the os-templates endpoint
        try {
          const fallbackResponse = await fetch('/api/os-templates');
          if (!fallbackResponse.ok) {
            throw new Error('Failed to fetch OS templates from fallback');
          }
          const fallbackData = await fallbackResponse.json();
          return fallbackData?.data || [];
        } catch (fallbackError) {
          console.error('Error fetching OS templates from fallback:', fallbackError);
          return [];
        }
      }
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  // Fetch specific template by ID if not found in all-templates
  const osTemplateId = extractOSTemplateId(server);
  const { data: specificTemplate } = useQuery({
    queryKey: ['/api/admin/templates', osTemplateId],
    queryFn: async () => {
      if (!osTemplateId) return null;

      try {
        const response = await fetch(`/api/admin/templates/${osTemplateId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch template ${osTemplateId}`);
        }
        const data = await response.json();
        return data?.data || null;
      } catch (error) {
        console.error(`Error fetching specific template ${osTemplateId}:`, error);
        return null;
      }
    },
    enabled: !!osTemplateId && !!osTemplates && osTemplates.length > 0 && !osTemplates.find((t: any) => t.id === osTemplateId || t.id === String(osTemplateId) || Number(t.id) === osTemplateId),
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  // Get OS information for the server
  function getOSInfo(osTemplateInstallId: number | null | undefined) {

    // PRIORITY 1: Use OS information from qemu agent (most accurate)
    const qemuAgentOS = server?.qemuAgent?.os || server?.remoteState?.agent?.osinfo;
    if (qemuAgentOS) {
      // Use pretty-name if available, otherwise name, otherwise construct from name + version
      let osName = qemuAgentOS['pretty-name'] || qemuAgentOS.name;
      if (!osName && qemuAgentOS.name && qemuAgentOS.version) {
        osName = `${qemuAgentOS.name} ${qemuAgentOS.version}`;
      } else if (!osName && qemuAgentOS.name) {
        osName = qemuAgentOS.name;
      }

      if (osName) {
        const { icon } = getOSIconAndColor(osName);
        return {
          name: osName,
          icon
        };
      }
    }

    if (!osTemplateInstallId) {
      return { name: "Unknown OS", icon: UnknownOSIcon };
    }

    // PRIORITY 2: Use specific template data if fetched
    if (specificTemplate && (specificTemplate.id === osTemplateInstallId || specificTemplate.id === String(osTemplateInstallId) || Number(specificTemplate.id) === osTemplateInstallId)) {
      const displayName = `${specificTemplate.name}${specificTemplate.version ? ` ${specificTemplate.version}` : ''}${specificTemplate.architecture ? ` (${specificTemplate.architecture})` : specificTemplate.variant ? ` (${specificTemplate.variant})` : ''}`;
      const { icon } = getOSIconAndColor(specificTemplate.name);

      return {
        name: displayName,
        icon
      };
    }

    if (!osTemplates || osTemplates.length === 0) {
      return { name: `Template ${osTemplateInstallId}`, icon: UnknownOSIcon };
    }

    // PRIORITY 3: Find the template in the all-templates data
    const availableTemplates = osTemplates.map((t: any) => ({ id: t.id, name: t.name, type: t.type }));

    // Try both exact match and string/number conversion
    const template = osTemplates?.find((t: any) => t.id === osTemplateInstallId || t.id === String(osTemplateInstallId) || Number(t.id) === osTemplateInstallId);

    if (template) {
      // Build the display name from template data
      const displayName = `${template.name}${template.version ? ` ${template.version}` : ''}${template.architecture ? ` (${template.architecture})` : template.variant ? ` (${template.variant})` : ''}`;
      const { icon } = getOSIconAndColor(template.name);

      return {
        name: displayName,
        icon
      };
    }

    // PRIORITY 4: Fallback to OS name from server data
    const serverOsName = server?.os?.name || server?.operatingSystem;
    if (serverOsName && typeof serverOsName === 'string') {
      const { icon } = getOSIconAndColor(serverOsName);
      return {
        name: serverOsName,
        icon
      };
    }

    return { name: `Template ${osTemplateInstallId}`, icon: UnknownOSIcon };
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

  // Helper function to get OS info with fallbacks
  function getServerOSInfo(serverData: any) {
    // First try to get OS template ID and match with templates
    const osTemplateId = extractOSTemplateId(serverData);
    if (osTemplateId) {
      return getOSInfo(osTemplateId);
    }

    // Fallback to OS name from server data if available
    const osName = serverData?.os?.name || serverData?.operatingSystem;
    if (osName && typeof osName === 'string') {
      const { icon } = getOSIconAndColor(osName);
      return {
        name: osName,
        icon
      };
    }

    // Final fallback
    return { name: "Unknown OS", icon: UnknownOSIcon };
  }

  // Fetch VNC status for Quick Actions
  // NOTE: Increased cache time to reduce VNC API calls since each call toggles VNC state
  const { data: vncData, refetch: refetchVNC } = useQuery({
    queryKey: ['/api/user/servers', id, 'vnc'],
    queryFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/vnc`);
      if (!response.ok) {
        throw new Error('Failed to fetch VNC status');
      }
      return response.json();
    },
    enabled: !!id && !isNaN(serverId),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes to reduce API calls
    refetchInterval: false, // Disable automatic refetching
  });

  const vncStatus = vncData?.data?.data?.vnc;
  const isVNCEnabled = vncStatus?.enabled === true;

  // Function to open VNC console in popup window
  const openVNCConsole = () => {
    if (!vncStatus || !isVNCEnabled) {
      toast({
        title: "VNC Not Available",
        description: "VNC must be enabled before connecting",
        variant: "destructive",
      });
      return;
    }

    // Create VNC console popup
    const vncUrl = `/vnc-console?host=${encodeURIComponent(vncStatus.ip)}&port=${vncStatus.port}&password=${encodeURIComponent(vncStatus.password)}&serverId=${serverId}`;

    // Open VNC console in a new popup window
    const popup = window.open(
      vncUrl,
      'vnc-console',
      'width=1024,height=768,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no'
    );

    if (!popup) {
      toast({
        title: "Popup Blocked",
        description: "Please allow popups for this site to use VNC console",
        variant: "destructive",
      });
    }
  };

  // Server state logic for button enable/disable - matches the status display logic
  const getServerRunningState = () => {
    // Return false if server data is not loaded yet
    if (!server) return false;

    // First check the powerStatus from our database tracking
    if (server.powerStatus?.powerState === "RUNNING") return true;
    if (server.powerStatus?.powerState === "STOPPED") return false;

    // Check remoteState.state and remoteState.running which comes from the ?remoteState=true parameter
    if (server.remoteState?.state === "running" || server.remoteState?.running === true) return true;
    if (server.remoteState?.state === "stopped" || server.remoteState?.running === false) return false;

    // Fall back to server.state if neither powerStatus nor remoteState is available
    if (server.state === "running" || server.state === "RUNNING") return true;
    if (server.state === "stopped" || server.state === "STOPPED") return false;
    if (server.state === "complete") return false; // VirtFusion often uses "complete" for stopped servers

    // Default to false (stopped) for unknown states
    return false;
  };

  const isServerRunning = getServerRunningState();
  const isServerStopped = !isServerRunning;

  // Function to get display status for UI
  const getDisplayStatus = () => {
    if (!server) return 'UNKNOWN';

    // First check the powerStatus from our database tracking
    if (server.powerStatus?.powerState === "RUNNING") return 'RUNNING';
    if (server.powerStatus?.powerState === "STOPPED") return 'STOPPED';

    // Check remoteState.state and remoteState.running which comes from the ?remoteState=true parameter
    if (server.remoteState?.state === "running" || server.remoteState?.running === true) return 'RUNNING';
    if (server.remoteState?.state === "stopped" || server.remoteState?.running === false) return 'STOPPED';

    // Fall back to server.state if neither powerStatus nor remoteState is available
    if (server.state === "running" || server.state === "RUNNING") return 'RUNNING';
    if (server.state === "stopped" || server.state === "STOPPED") return 'STOPPED';
    if (server.state === "complete") return 'STOPPED'; // VirtFusion often uses "complete" for stopped servers

    // Default to unknown for unknown states
    return 'UNKNOWN';
  };

  // Power action handler
  const handlePowerAction = (action: 'boot' | 'restart' | 'shutdown' | 'poweroff') => {
    switch (action) {
      case 'boot':
        bootMutation.mutate();
        break;
      case 'restart':
        restartMutation.mutate();
        break;
      case 'shutdown':
        shutdownMutation.mutate();
        break;
      case 'poweroff':
        powerOffMutation.mutate();
        break;
    }
  };

  // We're now using the formatDate function defined at the top of the file

  // Server power actions mutations
  const bootMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/power/boot`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code directly without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: 423 }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to boot server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to boot server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to boot server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Booting",
        description: data.message || "The server is now booting up.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });

      // Poll for state changes after a short delay
      setTimeout(() => {
        refetch();
        // Continue polling every 3 seconds for up to 30 seconds to catch state changes
        const pollInterval = setInterval(() => {
          refetch();
        }, 3000);

        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
      }, 2000);
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Boot Failed",
          description: error.message || "There was a problem booting the server.",
          variant: "destructive",
        });
      }
    },
  });

  const shutdownMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/power/shutdown`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code directly without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: 423 }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to shutdown server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to shutdown server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to shutdown server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Shutting Down",
        description: data.message || "The server is now shutting down gracefully.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });

      // Poll for state changes after a short delay
      setTimeout(() => {
        refetch();
        // Continue polling every 3 seconds for up to 30 seconds to catch state changes
        const pollInterval = setInterval(() => {
          refetch();
        }, 3000);

        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
      }, 2000);
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Shutdown Failed",
          description: error.message || "There was a problem shutting down the server.",
          variant: "destructive",
        });
      }
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/power/restart`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code directly without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: 423 }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to restart server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to restart server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to restart server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Restarting",
        description: data.message || "The server is now restarting.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });

      // Poll for state changes after a short delay
      setTimeout(() => {
        refetch();
        // Continue polling every 3 seconds for up to 30 seconds to catch state changes
        const pollInterval = setInterval(() => {
          refetch();
        }, 3000);

        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
      }, 2000);
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Restart Failed",
          description: error.message || "There was a problem restarting the server.",
          variant: "destructive",
        });
      }
    },
  });

  const powerOffMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/power/poweroff`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code directly without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: 423 }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to power off server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to power off server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to power off server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Powered Off",
        description: data.message || "The server has been forcefully powered off.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });

      // Poll for state changes after a short delay
      setTimeout(() => {
        refetch();
        // Continue polling every 3 seconds for up to 30 seconds to catch state changes
        const pollInterval = setInterval(() => {
          refetch();
        }, 3000);

        // Stop polling after 30 seconds
        setTimeout(() => {
          clearInterval(pollInterval);
        }, 30000);
      }, 2000);
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Power Off Failed",
          description: error.message || "There was a problem powering off the server.",
          variant: "destructive",
        });
      }
    },
  });

  // Server status actions mutations
  const suspendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/suspend`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code directly without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: 423 }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to suspend server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to suspend server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to suspend server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Suspended",
        description: data.message || "The server has been suspended.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers', id] });
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Suspend Failed",
          description: error.message || "There was a problem suspending the server.",
          variant: "destructive",
        });
      }
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/unsuspend`, {
        method: 'POST',
      });

      // First get a clone of the response for error cases since we can only read the body once
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 or 409 status code directly without reading body first
        if (response.status === 423 || response.status === 409) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
            queueInfo: { status: response.status }
          };
        }

        try {
          const errorData = await responseClone.json();
          if (errorData.msg?.includes("pending tasks in queue") ||
              errorData.msg?.includes("action is currently scheduled")) {
            return {
              success: true,
              pending: true,
              message: "Operation queued - server has pending tasks",
              queueInfo: errorData
            };
          }
          throw new Error(errorData.message || errorData.error || 'Failed to unsuspend server');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to unsuspend server: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to unsuspend server: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        return await response.json();
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.pending ? "Operation Queued" : "Server Unsuspended",
        description: data.message || "The server has been unsuspended.",
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers', id] });
    },
    onError: (error) => {
      // Check if error message indicates a queue issue
      if (error.message &&
          (error.message.includes("pending tasks in queue") ||
           error.message.includes("action is currently scheduled"))) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "Unsuspend Failed",
          description: error.message || "There was a problem unsuspending the server.",
          variant: "destructive",
        });
      }
    },
  });

  // Reset password mutation (user endpoint)
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const responseClone = response.clone();

      if (!response.ok) {
        // Error handling
        try {
          const errorData = await responseClone.json();
          throw new Error(errorData.message || errorData.error || 'Failed to reset password');
        } catch (jsonError) {
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to reset password: ${textError}`);
          } catch (textError) {
            throw new Error(`Failed to reset password: Server returned status ${response.status}`);
          }
        }
      }

      // For successful responses
      try {
        const data = await response.json();
        return data;
      } catch (jsonError) {
        return { success: true };
      }
    },
    onSuccess: (data) => {

      // Extract the generated password from the response
      // The password could be in different places based on the API response structure
      let password = null;

      // Try to extract from our server's generatedPassword field
      if (data.generatedPassword) {
        password = data.generatedPassword;
      }
      // Try to extract from data.data.expectedPassword (VirtFusion API format)
      else if (data.data && data.data.expectedPassword) {
        password = data.data.expectedPassword;
      }
      // Try to extract from data.data.data.expectedPassword (nested response)
      else if (data.data && data.data.data && data.data.data.expectedPassword) {
        password = data.data.data.expectedPassword;
      }

      if (password) {
        setGeneratedPassword(password);

        // Save the password to localStorage with an expiry (encrypted in production)
        try {
          const passwordData = {
            serverId: id,
            password: password,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem(`server_password_${id}`, JSON.stringify(passwordData));
        } catch (e) {
          console.error('Failed to save password to localStorage:', e);
        }

        toast({
          title: "Password Reset Successful",
          description: "The server password has been reset. You can view it in the overview tab.",
        });
      } else {
        toast({
          title: "Password Reset Successful",
          description: "The server password has been reset, but no password was returned by the API.",
        });
      }

      refetch();
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });
    },
    onError: (error) => {
      toast({
        title: "Password Reset Failed",
        description: error.message || "There was a problem resetting the server password.",
        variant: "destructive",
      });
    },
  });

  const toggleVncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/user/servers/${id}/vnc`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to toggle VNC');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      const action = server?.vnc ? 'disabled' : 'enabled';
      toast({
        title: `VNC ${action}`,
        description: `VNC access has been ${action} for this server.`,
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers', id] });
    },
    onError: (error) => {
      toast({
        title: "VNC Toggle Failed",
        description: error.message || "There was a problem changing VNC settings.",
        variant: "destructive",
      });
    },
  });



  const deleteServerMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete server');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Server Deleted",
        description: "The server has been deleted successfully.",
      });
      // Redirect to servers list after deletion
      window.location.href = '/admin/servers';
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "There was a problem deleting the server.",
        variant: "destructive",
      });
    },
  });



  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item href="/servers">Servers</Breadcrumb.Item>
          <Breadcrumb.Item>{
            isLoading ? "Loading..." : error ? "Error" : server?.name || "Server Details"
          }</Breadcrumb.Item>
        </Breadcrumb>
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
                    {/* Removed Back to Servers button, replaced by breadcrumb above */}
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      {isLoading ? (
                        <Skeleton className="h-10 w-64" />
                      ) : error ? (
                        "Error Loading Server"
                      ) : (
                        server?.name || "Server Details"
                      )}
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      {isLoading ? (
                        <Skeleton className="h-5 w-48" />
                      ) : error ? (
                        "Unable to load server details"
                      ) : (
                        `Server management and monitoring • ID: ${server?.id || 'N/A'}`
                      )}
                    </p>
                  </div>
                </div>

                {/* Server Status and OS Info */}
                {!isLoading && !error && server && (
                  <div className="flex flex-wrap gap-4 mt-6">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${
                        getDisplayStatus() === 'RUNNING' ? 'bg-primary animate-pulse' :
                        getDisplayStatus() === 'STOPPED' ? 'bg-muted-foreground' :
                        'bg-destructive'
                      }`} />
                      <span className="text-sm font-medium text-foreground">
                        {getDisplayStatus()}
                      </span>
                    </div>
                    {(() => {
                      const osInfo = getServerOSInfo(server);
                      if (osInfo && osInfo.name !== "Unknown OS") {
                        const OSIcon = osInfo.icon;
                        return (
                          <div className="flex items-center gap-2">
                            <OSIcon className="w-4 h-4" />
                            <span className="text-sm font-medium text-muted-foreground">
                              {osInfo.name}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {/* Removed UUID display from hero header */}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {!isLoading && !error && server && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                  <Button
                    onClick={openVNCConsole}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                  >
                    <Monitor className="h-4 w-4" />
                    VNC Console
                  </Button>
                  <Button
                    onClick={() => {
                      refetch();
                      refetchVNC();
                      toast({
                        title: "Data Refreshed",
                        description: "Server data has been updated.",
                      });
                    }}
                    variant="outline"
                    className="transition-all duration-200"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modern Resource Cards */}
        {!isLoading && !error && server && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Memory Card */}
            <div className="rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MemoryStick className="h-4 w-4" />
                      <span>Memory</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {server?.settings?.resources?.memory ?
                        `${(server.settings.resources.memory / 1024).toFixed(1)} GB` : 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {server?.settings?.resources?.memory ? `${server.settings.resources.memory} MB` : 'Not specified'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
                    <MemoryStick className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* CPU Card */}
            <div className="rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Cpu className="h-4 w-4" />
                      <span>CPU Cores</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {server?.cpu?.cores || server?.settings?.resources?.cpuCores || 'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {server?.cpu?.type || 'Virtual CPU'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
                    <Cpu className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>

            {/* Storage Card */}
            <div className="rounded-xl bg-card border border-border shadow-md hover:shadow-lg transition-all duration-300">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-4 w-4" />
                      <span>Storage</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {server?.settings?.resources?.storage ?
                        `${server.settings.resources.storage} GB` :
                        server?.storage && server.storage.length > 0 ?
                          `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB` :
                          'N/A'}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {server?.storage?.length ? `${server.storage.length} drive(s)` : 'Virtual disk'}
                    </div>
                  </div>
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10">
                    <HardDrive className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Power Controls and Quick Actions */}
        {!isLoading && !error && server && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Power Controls */}
            <div className="lg:col-span-2 rounded-xl bg-card border border-border shadow-md">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                    <Zap className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Power Controls</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Button
                    variant={isServerStopped ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePowerAction('boot')}
                    disabled={!isServerStopped || isLoading}
                    className="flex items-center gap-2 h-12 disabled:opacity-50 transition-all duration-200"
                  >
                    <Power className="h-4 w-4" />
                    <span>Boot</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePowerAction('restart')}
                    disabled={isServerStopped || isLoading}
                    className="flex items-center gap-2 h-12 disabled:opacity-50 transition-all duration-200"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Restart</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePowerAction('shutdown')}
                    disabled={isServerStopped || isLoading}
                    className="flex items-center gap-2 h-12 disabled:opacity-50 transition-all duration-200"
                  >
                    <Square className="h-4 w-4" />
                    <span>Shutdown</span>
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handlePowerAction('poweroff')}
                    disabled={isServerStopped || isLoading}
                    className="flex items-center gap-2 h-12 disabled:opacity-50 transition-all duration-200"
                  >
                    <PowerOff className="h-4 w-4" />
                    <span>Force Off</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl bg-card border border-border shadow-md">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
                    <Settings className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
                </div>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPasswordMutation.mutate()}
                    className="w-full justify-start gap-2 h-10 transition-all duration-200"
                  >
                    <Key className="h-4 w-4" />
                    Reset Password
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLogsModalOpen(true)}
                    className="w-full justify-start gap-2 h-10 transition-all duration-200"
                  >
                    <ScrollText className="h-4 w-4" />
                    Activity Logs
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Tab Navigation */}
        {!isLoading && !error && server && (
          <div className="flex flex-wrap gap-2 bg-card rounded-xl border border-border shadow-md p-6">
            {[
              { id: "overview", label: "Overview", icon: Server },
              { id: "specs", label: "Specifications", icon: Cpu },
              { id: "network", label: "Network", icon: Network },
              { id: "traffic", label: "Traffic", icon: Activity },
              { id: "storage", label: "Storage", icon: HardDrive },
              { id: "vnc", label: "VNC", icon: Monitor },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <Button
                  key={tab.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 h-10 transition-all duration-200 ${
                    isActive ? 'bg-primary text-primary-foreground shadow-md' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        )}

          {/* Enhanced Loading state */}
          {isLoading && (
            <div className="space-y-8">
              {/* Loading Header */}
              <div className="space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-12 w-96" />
              </div>

              {/* Loading Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <Card key={i} className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-16" />
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-12 w-12 rounded-xl" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Loading Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-24 mb-4" />
                    <div className="space-y-3">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Enhanced Error state */}
          {error && (
            <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="text-red-700 flex items-center gap-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <Server className="h-5 w-5 text-red-600" />
                  </div>
                  Error Loading Server
                </CardTitle>
                <CardDescription className="text-slate-600">
                  There was a problem loading the server details. This could be due to network issues or server unavailability.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-slate-700">Please try refreshing the page or contact support if the problem persists.</p>
                  <div className="flex gap-3">
                    <Button
                      onClick={() => window.location.reload()}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Page
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.history.back()}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Go Back
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Enhanced Server Details */}
          {!isLoading && !error && server && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* General Information */}
                  <Card className="lg:col-span-2 bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: brandColors.primary.light }}>
                          <Server className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                        </div>
                        General Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Server Name</span>
                            <span className="font-semibold text-slate-800">{server.name}</span>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Server ID</span>
                            <span className="font-semibold text-slate-800">{server.id}</span>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">UUID</span>
                            <div className="flex items-center gap-2">
                              <code className="text-xs font-mono px-2 py-1 rounded text-slate-700" style={{ backgroundColor: brandColors.primary.extraLight }}>
                                {server.uuid?.slice(0, 8)}...
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(server.uuid, "uuid")}
                                className="h-6 w-6 p-0 transition-colors"
                                style={{
                                  '--hover-bg': brandColors.primary.extraLight,
                                } as React.CSSProperties}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.primary.extraLight}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Hypervisor</span>
                            <span className="font-semibold text-slate-800">{server.hypervisorId}</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Operating System</span>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const osInfo = getServerOSInfo(server);
                                const OSIcon = osInfo.icon;
                                return (
                                  <>
                                    <OSIcon className="w-4 h-4" />
                                    <span className="font-semibold text-slate-800">{osInfo.name}</span>
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Owner ID</span>
                            <span className="font-semibold text-slate-800">
                              {typeof server.owner === 'object'
                                ? (server.owner.extRelationID || server.owner.id)
                                : (server.extRelationID || server.ownerId || server.owner)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Root Password</span>
                            <div className="flex items-center gap-2">
                              {generatedPassword ? (
                                <>
                                  <code className="px-2 py-1 rounded text-xs font-mono text-slate-700" style={{ backgroundColor: brandColors.secondary.extraLight }}>
                                    {generatedPassword}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(generatedPassword, 'password')}
                                    className="h-6 w-6 p-0 transition-colors"
                                    title="Copy to clipboard"
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = brandColors.secondary.extraLight}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <InfoIcon className="h-3 w-3" />
                                  Use Reset Password
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Status</span>
                            <UIBadge
                              variant={server.suspended ? "destructive" : "default"}
                              className={`${!server.suspended ? "text-white" : ""}`}
                              style={!server.suspended ? {
                                backgroundColor: brandColors.secondary.full,
                              } : {}}
                            >
                              {server.suspended ? "Suspended" : "Active"}
                            </UIBadge>
                          </div>

                          <div className="flex items-center justify-between py-3 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-600">Power State</span>
                            <PowerStatusBadge server={server} />
                          </div>

                          {server.protected !== undefined && (
                            <div className="flex items-center justify-between py-3">
                              <span className="text-sm font-medium text-slate-600">Protected</span>
                              <UIBadge variant={server.protected ? "default" : "outline"}>
                                {server.protected ? "Yes" : "No"}
                              </UIBadge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Card */}
                  <Card className="bg-white/70 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: brandColors.accent.light }}>
                          <Calendar className="h-5 w-5" style={{ color: brandColors.accent.full }} />
                        </div>
                        Timeline
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex flex-col space-y-2 p-3 rounded-lg" style={{ backgroundColor: brandColors.primary.extraLight }}>
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Created</span>
                          <span className="text-sm font-semibold text-slate-800">{formatDate(server.created)}</span>
                        </div>

                        <div className="flex flex-col space-y-2 p-3 rounded-lg" style={{ backgroundColor: brandColors.secondary.extraLight }}>
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Built</span>
                          <span className="text-sm font-semibold text-slate-800">{formatDate(server.built)}</span>
                        </div>

                        <div className="flex flex-col space-y-2 p-3 rounded-lg" style={{ backgroundColor: brandColors.accent.extraLight }}>
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">Last Updated</span>
                          <span className="text-sm font-semibold text-slate-800">{formatDate(server.updated)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

            {/* Specifications Tab */}
            <TabsContent value="specs" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <Cpu className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">CPU</h3>
                  <p className="text-2xl font-bold">{server?.cpu?.cores || "N/A"} Cores</p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <Memory className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Memory</h3>
                  <p className="text-2xl font-bold">
                    {server?.settings?.resources?.memory
                      ? `${(server.settings.resources.memory / 1024).toFixed(1)} GB`
                      : "N/A"}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                  <HardDrive className="h-12 w-12 text-primary mb-2" />
                  <h3 className="font-semibold text-lg">Storage</h3>
                  <p className="text-2xl font-bold">
                    {server?.storage && server.storage.length > 0
                      ? `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB`
                      : server?.settings?.resources?.storage
                        ? `${server.settings.resources.storage} GB`
                        : "N/A"}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    CPU Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">CPU Details</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground w-1/3">CPU Cores:</td>
                            <td className="py-1 font-medium">{server?.cpu?.cores || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">CPU Type:</td>
                            <td className="py-1 font-medium">{server?.cpu?.typeExact || server?.cpu?.type || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">CPU Shares:</td>
                            <td className="py-1 font-medium">{server?.cpu?.shares || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Architecture:</td>
                            <td className="py-1 font-medium">{server?.arch === 1 ? 'x86_64' : server?.arch === 2 ? 'ARM64' : server?.arch || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {server?.cpu?.topology?.enabled && (
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground">CPU Topology</h3>
                        <table className="w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground w-1/3">Sockets:</td>
                              <td className="py-1 font-medium">{server.cpu.topology.sockets || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground">Cores per Socket:</td>
                              <td className="py-1 font-medium">{server.cpu.topology.cores || 'N/A'}</td>
                            </tr>
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground">Threads per Core:</td>
                              <td className="py-1 font-medium">{server.cpu.topology.threads || 'N/A'}</td>
                            </tr>
                            {server.cpu.topology.dies && (
                              <tr>
                                <td className="py-1 pr-2 text-muted-foreground">Dies:</td>
                                <td className="py-1 font-medium">{server.cpu.topology.dies}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}


                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    System Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Boot Settings</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground w-1/3">Boot Order:</td>
                            <td className="py-1 font-medium">{server?.settings?.bootOrder?.join(', ') || 'N/A'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Boot Menu:</td>
                            <td className="py-1 font-medium">{server?.settings?.bootMenu === 1 ? 'Enabled' : 'Disabled'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Network Boot:</td>
                            <td className="py-1 font-medium">{server?.settings?.networkBoot ? 'Enabled' : 'Disabled'}</td>
                          </tr>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">UEFI:</td>
                            <td className="py-1 font-medium">{server?.settings?.uefi ? 'Enabled' : 'Disabled'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Virtualization Features</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground w-1/3">Cloud-Init:</td>
                            <td className="py-1 font-medium">{server?.settings?.cloudInit ? 'Enabled' : 'Disabled'}</td>
                          </tr>

                          {server?.settings?.hyperv && (
                            <tr>
                              <td className="py-1 pr-2 text-muted-foreground">Hyper-V Extensions:</td>
                              <td className="py-1 font-medium">{server?.settings?.hyperv?.enabled ? 'Enabled' : 'Disabled'}</td>
                            </tr>
                          )}

                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">TPM:</td>
                            <td className="py-1 font-medium">{server?.settings?.tpmType ? 'Enabled' : 'Disabled'}</td>
                          </tr>

                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Machine Type:</td>
                            <td className="py-1 font-medium">{server?.settings?.machineType || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Memory className="h-5 w-5" />
                    Resource Allocation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Memory Configuration</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground w-1/3">Memory:</td>
                            <td className="py-1 font-medium">{server?.settings?.resources?.memory
                              ? `${server.settings.resources.memory} MB (${(server.settings.resources.memory / 1024).toFixed(1)} GB)`
                              : 'N/A'}</td>
                          </tr>

                          {server?.settings?.memBalloon && (
                            <>
                              <tr>
                                <td className="py-1 pr-2 text-muted-foreground">Memory Balloon:</td>
                                <td className="py-1 font-medium">{server.settings.memBalloon.model === 1 ? 'Enabled' : 'Disabled'}</td>
                              </tr>

                              <tr>
                                <td className="py-1 pr-2 text-muted-foreground">Auto-Deflate:</td>
                                <td className="py-1 font-medium">{server.settings.memBalloon.autoDeflate ? 'Enabled' : 'Disabled'}</td>
                              </tr>
                            </>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground">Resource Limits</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground w-1/3">Storage:</td>
                            <td className="py-1 font-medium">
                              {server?.storage && server.storage.length > 0
                                ? `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB`
                                : server?.settings?.resources?.storage
                                  ? `${server.settings.resources.storage} GB`
                                  : 'N/A'}
                            </td>
                          </tr>

                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Traffic Allocation:</td>
                            <td className="py-1 font-medium">{server?.settings?.resources?.traffic
                              ? `${server.settings.resources.traffic} GB`
                              : 'N/A'}</td>
                          </tr>

                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">PCI Ports:</td>
                            <td className="py-1 font-medium">{server?.settings?.pciPorts || 'N/A'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Network Tab */}
            <TabsContent value="network" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Network Information
                  </CardTitle>
                  <CardDescription>
                    Network interfaces, IP addresses, and connectivity settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Primary Network Interfaces */}
                  {server.network?.interfaces && server.network.interfaces.length > 0 ? (
                    <div className="space-y-4">
                      <h3 className="font-semibold text-md mb-2">Primary Network Interfaces</h3>
                      {server.network.interfaces.map((intf: any, idx: number) => (
                        <div key={idx} className="border rounded-md p-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-semibold text-md">{intf.name} ({intf.type})</h3>
                            <UIBadge variant={intf.enabled ? "default" : "outline"}>
                              {intf.enabled ? "Enabled" : "Disabled"}
                            </UIBadge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {intf.inTrafficCount && (
                              <UIBadge variant="outline" className="text-xs">In Traffic Count</UIBadge>
                            )}
                            {intf.outTrafficCount && (
                              <UIBadge variant="outline" className="text-xs">Out Traffic Count</UIBadge>
                            )}
                            {intf.firewallEnabled && (
                              <UIBadge variant="outline" className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-200">Firewall Active</UIBadge>
                            )}
                            {intf.ipFilter && (
                              <UIBadge variant="outline" className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-200">IP Filter: {intf.ipFilterType || "Active"}</UIBadge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <span className="font-medium">MAC Address:</span>
                            <code className="bg-muted px-2 py-0.5 rounded font-mono">{intf.mac}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(intf.mac, "mac")}
                              className="h-6 w-6"
                              title="Copy to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </Button>
                          </div>

                          {/* IPv4 Addresses */}
                          {intf.ipv4 && intf.ipv4.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold mb-2">IPv4 Addresses</h4>
                              <div className="space-y-2 mt-1">
                                {intf.ipv4.map((ip: any, ipIdx: number) => (
                                  <div key={ipIdx} className="bg-muted rounded-md p-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono">{ip.address}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(ip.address, "ip")}
                                        className="h-6 w-6"
                                        title="Copy to clipboard"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                      </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span><span className="font-medium">Gateway:</span> {ip.gateway}</span>
                                      <span><span className="font-medium">Netmask:</span> {ip.netmask}</span>
                                      {ip.rdns && <span><span className="font-medium">rDNS:</span> {ip.rdns}</span>}
                                    </div>
                                    {(ip.resolver1 || ip.resolver2) && (
                                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                        {ip.resolver1 && <span><span className="font-medium">DNS 1:</span> {ip.resolver1}</span>}
                                        {ip.resolver2 && <span><span className="font-medium">DNS 2:</span> {ip.resolver2}</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* IPv6 Addresses */}
                          {intf.ipv6 && intf.ipv6.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold mb-2">IPv6 Addresses</h4>
                              <div className="space-y-2 mt-1">
                                {intf.ipv6.map((ip: any, ipIdx: number) => (
                                  <div key={ipIdx} className="bg-muted rounded-md p-2 text-sm">
                                    {/* Subnet Information */}
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-mono text-blue-700 font-medium">{ip.subnet}/{ip.cidr}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(`${ip.subnet}/${ip.cidr}`, "subnet")}
                                        className="h-6 w-6"
                                        title="Copy subnet to clipboard"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                      </Button>
                                    </div>

                                    {/* Individual IPv6 Addresses */}
                                    {ip.addresses && ip.addresses.length > 0 && (
                                      <div className="mb-2">
                                        <h5 className="text-xs font-medium text-muted-foreground mb-1">Individual Addresses:</h5>
                                        <div className="space-y-1">
                                          {ip.addresses.map((addr: string, addrIdx: number) => (
                                            <div key={addrIdx} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
                                              <span className="font-mono text-xs">{addr}</span>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyToClipboard(addr, "ip")}
                                                className="h-4 w-4"
                                                title="Copy address to clipboard"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Show message when no individual addresses are available */}
                                    {(!ip.addresses || ip.addresses.length === 0) && (
                                      <div className="text-xs text-muted-foreground bg-yellow-50 rounded px-2 py-1 mb-2">
                                        No individual addresses assigned yet. This is a subnet allocation.
                                      </div>
                                    )}

                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span><span className="font-medium">Gateway:</span> {ip.gateway}</span>
                                      <span><span className="font-medium">Order:</span> {ip.order}</span>
                                      <span><span className="font-medium">Enabled:</span> {ip.enabled ? 'Yes' : 'No'}</span>
                                      {ip.routeNet && <span className="bg-blue-100 text-blue-800 px-1 rounded">Route Net</span>}
                                      {ip.exhausted && <span className="bg-red-100 text-red-800 px-1 rounded">Exhausted</span>}
                                    </div>
                                    {(ip.resolver1 || ip.resolver2) && (
                                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                        {ip.resolver1 && <span><span className="font-medium">DNS 1:</span> {ip.resolver1}</span>}
                                        {ip.resolver2 && <span><span className="font-medium">DNS 2:</span> {ip.resolver2}</span>}
                                      </div>
                                    )}
                                    {ip.block && (
                                      <div className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 mt-1 rounded">
                                        Block: {ip.block.name} (ID: {ip.block.id})
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Network connectivity info */}
                          {intf.hypervisorConnectivity && (
                            <div className="mt-3 text-xs border-t pt-2">
                              <h4 className="text-sm font-semibold">Hypervisor Connectivity</h4>
                              <table className="w-full mt-1 text-xs">
                                <tbody>
                                  <tr>
                                    <td className="py-0.5 pr-2 text-muted-foreground w-1/3">Type:</td>
                                    <td className="py-0.5">{intf.hypervisorConnectivity.type}</td>
                                  </tr>
                                  {intf.hypervisorConnectivity.bridge && (
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Bridge:</td>
                                      <td className="py-0.5">{intf.hypervisorConnectivity.bridge}</td>
                                    </tr>
                                  )}
                                  {intf.hypervisorConnectivity.mtu && (
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">MTU:</td>
                                      <td className="py-0.5">{intf.hypervisorConnectivity.mtu}</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Network className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No primary network interfaces found</p>
                    </div>
                  )}

                  {/* Secondary Network Interfaces */}
                  {server.network?.secondaryInterfaces && server.network.secondaryInterfaces.length > 0 && (
                    <div className="mt-6 space-y-4">
                      <h3 className="font-semibold text-md mb-2">Secondary Network Interfaces</h3>
                      {server.network.secondaryInterfaces.map((intf: any, idx: number) => (
                        <div key={idx} className="border rounded-md p-4">
                          <div className="flex justify-between mb-2">
                            <h3 className="font-semibold text-md">{intf.name} ({intf.type})</h3>
                            <UIBadge variant={intf.enabled ? "default" : "outline"}>
                              {intf.enabled ? "Enabled" : "Disabled"}
                            </UIBadge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <span className="font-medium">MAC Address:</span>
                            <code className="bg-muted px-2 py-0.5 rounded font-mono">{intf.mac}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copyToClipboard(intf.mac, "mac")}
                              className="h-6 w-6"
                              title="Copy to clipboard"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                            </Button>
                          </div>

                          {/* Display IP addresses if available */}
                          {intf.ipv4 && intf.ipv4.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold mb-2">IPv4 Addresses</h4>
                              <div className="space-y-2 mt-1">
                                {intf.ipv4.map((ip: any, ipIdx: number) => (
                                  <div key={ipIdx} className="bg-muted rounded-md p-2 text-sm">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono">{ip.address}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(ip.address, "ip")}
                                        className="h-6 w-6"
                                        title="Copy to clipboard"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                      </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span><span className="font-medium">Gateway:</span> {ip.gateway}</span>
                                      <span><span className="font-medium">Netmask:</span> {ip.netmask}</span>
                                      {ip.rdns && <span><span className="font-medium">rDNS:</span> {ip.rdns}</span>}
                                    </div>
                                    {(ip.resolver1 || ip.resolver2) && (
                                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                        {ip.resolver1 && <span><span className="font-medium">DNS 1:</span> {ip.resolver1}</span>}
                                        {ip.resolver2 && <span><span className="font-medium">DNS 2:</span> {ip.resolver2}</span>}
                                      </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span><span className="font-medium">Order:</span> {ip.order}</span>
                                      <span><span className="font-medium">Block ID:</span> {ip.blockId}</span>
                                      {ip.mac && <span><span className="font-medium">MAC:</span> {ip.mac}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* IPv6 addresses if available */}
                          {intf.ipv6 && intf.ipv6.length > 0 && (
                            <div className="mt-3">
                              <h4 className="text-sm font-semibold">IPv6 Addresses</h4>
                              <div className="space-y-2 mt-1">
                                {intf.ipv6.map((ip: any, ipIdx: number) => (
                                  <div key={ipIdx} className="bg-muted rounded-md p-2 text-sm">
                                    {/* Subnet Information */}
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-mono text-blue-700 font-medium">{ip.subnet}/{ip.cidr}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => copyToClipboard(`${ip.subnet}/${ip.cidr}`, "subnet")}
                                        className="h-6 w-6"
                                        title="Copy subnet to clipboard"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                        </svg>
                                      </Button>
                                    </div>

                                    {/* Individual IPv6 Addresses */}
                                    {ip.addresses && ip.addresses.length > 0 && (
                                      <div className="mb-2">
                                        <h5 className="text-xs font-medium text-muted-foreground mb-1">Individual Addresses:</h5>
                                        <div className="space-y-1">
                                          {ip.addresses.map((addr: string, addrIdx: number) => (
                                            <div key={addrIdx} className="flex items-center justify-between bg-blue-50 rounded px-2 py-1">
                                              <span className="font-mono text-xs">{addr}</span>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => copyToClipboard(addr, "ip")}
                                                className="h-4 w-4"
                                                title="Copy address to clipboard"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2 2v1"></path>
                                                </svg>
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Show message when no individual addresses are available */}
                                    {(!ip.addresses || ip.addresses.length === 0) && (
                                      <div className="text-xs text-muted-foreground bg-yellow-50 rounded px-2 py-1 mb-2">
                                        No individual addresses assigned yet. This is a subnet allocation.
                                      </div>
                                    )}

                                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                      <span><span className="font-medium">Gateway:</span> {ip.gateway}</span>
                                      <span><span className="font-medium">Enabled:</span> {ip.enabled ? 'Yes' : 'No'}</span>
                                      <span><span className="font-medium">Order:</span> {ip.order}</span>
                                      {ip.routeNet && <span className="bg-blue-100 text-blue-800 px-1 rounded">Route Net</span>}
                                      {ip.exhausted && <span className="bg-red-100 text-red-800 px-1 rounded">Exhausted</span>}
                                    </div>
                                    {(ip.resolver1 || ip.resolver2) && (
                                      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                                        {ip.resolver1 && <span><span className="font-medium">DNS 1:</span> {ip.resolver1}</span>}
                                        {ip.resolver2 && <span><span className="font-medium">DNS 2:</span> {ip.resolver2}</span>}
                                      </div>
                                    )}
                                    {ip.block && (
                                      <div className="text-xs bg-blue-50 text-blue-800 px-2 py-0.5 mt-1 rounded">
                                        Block: {ip.block.name} (ID: {ip.block.id})
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Traffic and Firewall Details */}
                          <div className="mt-3 border-t pt-3">
                            <h4 className="text-sm font-semibold mb-2">Interface Details</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Additional Details */}
                              <div>
                                <h5 className="text-xs font-semibold mb-1 text-muted-foreground">Network Properties</h5>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground w-1/3">Interface ID:</td>
                                      <td className="py-0.5">{intf.id}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Type:</td>
                                      <td className="py-0.5">{intf.type}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Order:</td>
                                      <td className="py-0.5">{intf.order}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Driver:</td>
                                      <td className="py-0.5">{intf.driver || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Tag:</td>
                                      <td className="py-0.5">{intf.tag || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Process Queues:</td>
                                      <td className="py-0.5">{intf.processQueues !== null ? intf.processQueues : 'N/A'}</td>
                                    </tr>
                                    {intf.hypervisorNetwork && (
                                      <tr>
                                        <td className="py-0.5 pr-2 text-muted-foreground">Hypervisor Network:</td>
                                        <td className="py-0.5">{intf.hypervisorNetwork}</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>

                              {/* Network Configuration */}
                              <div>
                                <h5 className="text-xs font-semibold mb-1 text-muted-foreground">Network Configuration</h5>
                                <table className="w-full text-xs">
                                  <tbody>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground w-1/3">In Traffic Count:</td>
                                      <td className="py-0.5">{intf.inTrafficCount ? 'Enabled' : 'Disabled'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Out Traffic Count:</td>
                                      <td className="py-0.5">{intf.outTrafficCount ? 'Enabled' : 'Disabled'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Port Isolated:</td>
                                      <td className="py-0.5">{intf.portIsolated ? 'Yes' : 'No'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">DHCP v4:</td>
                                      <td className="py-0.5">{intf.dhcpV4 ? 'Enabled' : 'Disabled'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">DHCP v6:</td>
                                      <td className="py-0.5">{intf.dhcpV6 ? 'Enabled' : 'Disabled'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">NAT:</td>
                                      <td className="py-0.5">{intf.isNat || intf.nat ? 'Yes' : 'No'}</td>
                                    </tr>
                                    <tr>
                                      <td className="py-0.5 pr-2 text-muted-foreground">Firewall:</td>
                                      <td className="py-0.5">
                                        {intf.firewallEnabled ? (
                                          <span className="text-green-600">Enabled</span>
                                        ) : (
                                          <span className="text-red-600">Disabled</span>
                                        )}
                                      </td>
                                    </tr>
                                    {intf.firewallEnabled && intf.firewallRules && (
                                      <tr>
                                        <td className="py-0.5 pr-2 text-muted-foreground">Firewall Rules:</td>
                                        <td className="py-0.5">{intf.firewallRules.length} rules</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Traffic Statistics */}
                            {(intf.inTrafficCount || intf.outTrafficCount) && (
                              <div className="mt-2 pt-2 border-t">
                                <h5 className="text-xs font-semibold mb-1 text-muted-foreground">Traffic Statistics</h5>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  {intf.inAverage !== undefined && (
                                    <div><span className="text-muted-foreground">In Average:</span> {intf.inAverage}</div>
                                  )}
                                  {intf.outAverage !== undefined && (
                                    <div><span className="text-muted-foreground">Out Average:</span> {intf.outAverage}</div>
                                  )}
                                  {intf.inPeak !== undefined && (
                                    <div><span className="text-muted-foreground">In Peak:</span> {intf.inPeak}</div>
                                  )}
                                  {intf.outPeak !== undefined && (
                                    <div><span className="text-muted-foreground">Out Peak:</span> {intf.outPeak}</div>
                                  )}
                                  {intf.inBurst !== undefined && (
                                    <div><span className="text-muted-foreground">In Burst:</span> {intf.inBurst}</div>
                                  )}
                                  {intf.outBurst !== undefined && (
                                    <div><span className="text-muted-foreground">Out Burst:</span> {intf.outBurst}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Network Settings */}
                  <div className="mt-6">
                    <h3 className="font-semibold text-md mb-2">Network Settings</h3>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground w-1/3">DHCP IPv4:</td>
                          <td className="py-1 font-medium">{server.primaryNetworkDhcp4 ? 'Enabled' : 'Disabled'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">DHCP IPv6:</td>
                          <td className="py-1 font-medium">{server.primaryNetworkDhcp6 ? 'Enabled' : 'Disabled'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Traffic Tab */}
            <TabsContent value="traffic" className="space-y-4">
              {/* Add Traffic tab query */}
              <TrafficTab serverId={serverId} />
            </TabsContent>

            {/* Storage Tab */}
            <TabsContent value="storage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Storage Information
                  </CardTitle>
                  <CardDescription>
                    Storage devices, disks and volumes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Storage Overview Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                      <HardDrive className="h-12 w-12 text-primary mb-2" />
                      <h3 className="font-semibold text-lg">Total Storage</h3>
                      <p className="text-2xl font-bold">
                        {server?.storage && server.storage.length > 0
                          ? `${server.storage.reduce((acc: number, drive: any) => acc + (drive.capacity || 0), 0)} GB`
                          : server?.settings?.resources?.storage
                            ? `${server.settings.resources.storage} GB`
                            : "N/A"}
                      </p>
                    </div>

                    {server?.remoteState?.agent?.fsinfo && (
                      <>
                        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                          <Database className="h-12 w-12 text-primary mb-2" />
                          <h3 className="font-semibold text-lg">Filesystem Space</h3>
                          <p className="text-2xl font-bold">
                            {(server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) =>
                              acc + (fs["total-bytes"] || 0), 0) / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-card text-card-foreground hover:bg-accent/10 transition-colors">
                          <Database className="h-12 w-12 text-primary mb-2" />
                          <h3 className="font-semibold text-lg">Used Space</h3>
                          <div className="flex flex-col items-center">
                            <p className="text-2xl font-bold mb-1">
                              {(server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) =>
                                acc + (fs["used-bytes"] || 0), 0) / (1024 * 1024 * 1024)).toFixed(1)} GB
                            </p>
                            <div className="w-full bg-muted rounded-full h-2.5 mb-1">
                              <div
                                className={`h-2.5 rounded-full ${
                                  (server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["used-bytes"] || 0), 0) /
                                   server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["total-bytes"] || 0), 0)) > 0.9
                                    ? 'bg-destructive'
                                    : (server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["used-bytes"] || 0), 0) /
                                       server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["total-bytes"] || 0), 0)) > 0.7
                                      ? 'bg-warning'
                                      : 'bg-primary'
                                }`}
                                style={{
                                  width: `${Math.min(100, (
                                    server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["used-bytes"] || 0), 0) /
                                    server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["total-bytes"] || 0), 0)
                                  ) * 100)}%`
                                }}
                              ></div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {`${Math.round(
                                (server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["used-bytes"] || 0), 0) /
                                server.remoteState.agent.fsinfo.reduce((acc: number, fs: any) => acc + (fs["total-bytes"] || 0), 0)) * 100
                              )}% Used`}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Storage Drives from VirtFusion API */}
                  {server?.storage && server.storage.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-md mb-3">Storage Drives</h3>
                      <div className="space-y-4">
                        {server.storage.map((drive: any, idx: number) => (
                          <div key={idx} className="border rounded-md p-4">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-semibold">{drive.name || `Drive ${drive.id}`}</h4>
                              <UIBadge variant="outline">
                                {drive.capacity} GB
                              </UIBadge>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="text-muted-foreground">Drive Type:</div>
                              <div>{drive.type || 'N/A'}</div>

                              {drive.bus && (
                                <>
                                  <div className="text-muted-foreground">Bus:</div>
                                  <div>{drive.bus}</div>
                                </>
                              )}

                              <div className="text-muted-foreground">Path:</div>
                              <div>{drive.path || 'N/A'}</div>

                              <div className="text-muted-foreground">Primary:</div>
                              <div>{drive.primary ? 'Yes' : 'No'}</div>

                              <div className="text-muted-foreground">Status:</div>
                              <div>
                                {drive.enabled ? (
                                  <span className="text-green-600">Enabled</span>
                                ) : (
                                  <span className="text-red-600">Disabled</span>
                                )}
                              </div>

                              {drive.created && (
                                <>
                                  <div className="text-muted-foreground">Created:</div>
                                  <div>{new Date(drive.created).toLocaleDateString()}</div>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Media Details */}
                  {server?.media && (
                    <div className="mt-6">
                      <h3 className="font-semibold text-md mb-3">Media Information</h3>
                      <div className="bg-muted rounded-md p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-2">ISO Information</h4>
                            <table className="w-full text-sm">
                              <tbody>
                                <tr>
                                  <td className="py-1 pr-2 text-muted-foreground w-1/3">ISO Mounted:</td>
                                  <td className="py-1">{server.media.isoMounted ? 'Yes' : 'No'}</td>
                                </tr>
                                {server.media.isoType && (
                                  <tr>
                                    <td className="py-1 pr-2 text-muted-foreground">ISO Type:</td>
                                    <td className="py-1">{server.media.isoType}</td>
                                  </tr>
                                )}
                                {server.media.isoName && (
                                  <tr>
                                    <td className="py-1 pr-2 text-muted-foreground">ISO Name:</td>
                                    <td className="py-1">{server.media.isoName}</td>
                                  </tr>
                                )}
                                {server.media.isoFilename && (
                                  <tr>
                                    <td className="py-1 pr-2 text-muted-foreground">ISO Filename:</td>
                                    <td className="py-1">{server.media.isoFilename}</td>
                                  </tr>
                                )}
                                {server.media.isoUrl && (
                                  <tr>
                                    <td className="py-1 pr-2 text-muted-foreground">ISO URL:</td>
                                    <td className="py-1">
                                      <a
                                        href={server.media.isoUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline flex items-center gap-1"
                                      >
                                        <span className="truncate max-w-[200px]">{server.media.isoUrl}</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Filesystem Information */}
                  {(() => {
                    // Debug logging for server storage data
                    return null;
                  })()}
                  {server?.remoteState?.agent?.fsinfo && server.remoteState.agent.fsinfo.length > 0 ? (
                    <div className="mt-6">
                      <h3 className="font-semibold text-md mb-3">Filesystem Information</h3>
                      <div className="space-y-4">
                        {server.remoteState.agent.fsinfo.map((fs: any, idx: number) => (
                          <div key={idx} className="border rounded-md p-4">
                            <div className="flex justify-between mb-2">
                              <h4 className="font-semibold">{fs.name} ({fs.type})</h4>
                              <UIBadge variant="outline">
                                {(fs["total-bytes"] / (1024 * 1024 * 1024)).toFixed(1)} GB
                              </UIBadge>
                            </div>

                            <p className="text-sm text-muted-foreground mb-2">
                              Mount Point: <code className="bg-muted px-2 py-0.5 rounded">{fs.mountpoint}</code>
                            </p>

                            {/* Usage bar */}
                            <div className="mt-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Used: {(fs["used-bytes"] / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                                <span>Free: {((fs["total-bytes"] - fs["used-bytes"]) / (1024 * 1024 * 1024)).toFixed(1)} GB</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    (fs["used-bytes"] / fs["total-bytes"]) > 0.9
                                      ? 'bg-destructive'
                                      : (fs["used-bytes"] / fs["total-bytes"]) > 0.7
                                        ? 'bg-warning'
                                        : 'bg-primary'
                                  }`}
                                  style={{ width: `${Math.min(100, (fs["used-bytes"] / fs["total-bytes"]) * 100)}%` }}
                                ></div>
                              </div>
                              <p className="text-xs text-right mt-1">
                                {`${Math.round((fs["used-bytes"] / fs["total-bytes"]) * 100)}% Used`}
                              </p>
                            </div>

                            {/* Disk information */}
                            {fs.disk && fs.disk.length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <h5 className="text-sm font-semibold mb-2">Disk Information</h5>
                                <div className="space-y-2">
                                  {fs.disk.map((disk: any, diskIdx: number) => (
                                    <div key={diskIdx} className="bg-muted/50 p-2 rounded-md text-xs">
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <span className="text-muted-foreground">Device:</span> {disk.dev}
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Bus Type:</span> {disk["bus-type"]}
                                        </div>
                                        {disk["pci-controller"] && (
                                          <div className="col-span-2">
                                            <span className="text-muted-foreground">PCI:</span> {disk["pci-controller"].domain}:{disk["pci-controller"].bus}:{disk["pci-controller"].slot}.{disk["pci-controller"].function}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <HardDrive className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Detailed filesystem information is not available.</p>
                      <p className="text-sm">
                        This information is retrieved from the QEMU guest agent. Ensure it's installed and running on the server.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* VNC Tab */}
            <TabsContent value="vnc" className="space-y-4">
              <VNCTab serverId={serverId} />
            </TabsContent>



          </Tabs>
        )}

        {/* Server Logs Modal */}
        <ServerLogsModal
          isOpen={isLogsModalOpen}
          onClose={() => setIsLogsModalOpen(false)}
          serverId={serverId}
          serverName={server?.name}
        />
      </div>
    </DashboardLayout>
  );
}