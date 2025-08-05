import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// Tabs removed - using Select dropdown instead for better mobile experience
import {
  Slider
} from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
  ShieldOff,
  Clock,
  ArrowLeft,
  Database,
  MonitorPlay,
  Activity,
  Badge,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  PowerIcon,
  Key,
  Trash,
  Info as InfoIcon,
  Calendar,
  DownloadCloud,
  UploadCloud,
  LineChart,
  Monitor,
  Terminal
} from "lucide-react";

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
    queryKey: ['/api/admin/servers', serverId, 'traffic'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/servers/${serverId}/traffic`);
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
import { Separator } from "@/components/ui/separator";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// VNC Tab Component
const VNCTab = ({ serverId }: { serverId: number }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch VNC status
  // NOTE: Increased cache time to reduce VNC API calls since each call toggles VNC state
  const { data: vncData, isLoading: vncLoading, error: vncError, refetch: refetchVNC } = useQuery({
    queryKey: ['/api/admin/servers', serverId, 'vnc'],
    queryFn: async () => {
      const response = await fetch(`/api/admin/servers/${serverId}/vnc`);
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

    // Create VNC console popup - only pass serverId for security
    const vncUrl = `/vnc-console?serverId=${serverId}`;

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
                        isVNCEnabled ? "bg-green-500 animate-pulse" : "bg-red-500"
                      }`}></div>
                      <span className="text-xl font-bold">
                        {isVNCEnabled ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <UIBadge
                      variant={isVNCEnabled ? "default" : "outline"}
                      className={`px-3 py-1 ${
                        isVNCEnabled ? "bg-green-500 hover:bg-green-600" : ""
                      }`}
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
                          className="bg-blue-50 border-blue-200 hover:bg-blue-200 text-blue-700 hover:text-blue-900 font-medium"
                          onClick={openVNCConsole}
                          size="lg"
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


  return (
    <UIBadge
      className={`${
        isRunning ? "bg-primary text-primary-foreground hover:bg-primary/90" :
        powerState === "stopped" ? "bg-muted text-muted-foreground" :
        powerState === "shutdown" ? "bg-orange-300 text-orange-800" :
        powerState === "paused" ? "bg-yellow-300 text-yellow-800" :
        ""
      }`}
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

  // State for storing generated password
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  // State for active tab
  const [activeTab, setActiveTab] = useState("overview");

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
  const copyToClipboard = (text: string, type: 'password' | 'mac' | 'ip' | 'subnet' = 'password') => {
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
    queryKey: ['/api/admin/servers', id],
    queryFn: async () => {
      if (!id || isNaN(serverId)) {
        throw new Error('Invalid server ID');
      }

      const response = await fetch(`/api/admin/servers/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch server details');
      }

      return response.json();
    },
    enabled: !!id && !isNaN(serverId),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Extract the server data from the response
  const server = serverResponse?.data;

  // We're now using the formatDate function defined at the top of the file

  // Server power actions mutations
  const bootMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/boot`, {
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
          title: "Boot Failed",
          description: error.message || "There was a problem booting the server.",
          variant: "destructive",
        });
      }
    },
  });

  const shutdownMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/shutdown`, {
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
          title: "Shutdown Failed",
          description: error.message || "There was a problem shutting down the server.",
          variant: "destructive",
        });
      }
    },
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/restart`, {
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
          title: "Restart Failed",
          description: error.message || "There was a problem restarting the server.",
          variant: "destructive",
        });
      }
    },
  });

  const powerOffMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/power-off`, {
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

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/admin/servers/${id}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user: 'root', // Must use 'root' as the API is returning an error with 'administrator'
          sendMail: false // We'll display the password in the UI
        }),
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers', id] });
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
      const vncStatus = server?.vnc ? 'disable' : 'enable';
      const response = await fetch(`/api/admin/servers/${id}/vnc/${vncStatus}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to ${vncStatus} VNC`);
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers', id] });
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

  // CPU Throttle state and mutation
  const [cpuThrottleValue, setCpuThrottleValue] = useState(0);
  const [isApplyingThrottle, setIsApplyingThrottle] = useState(false);

  // Load the current throttle value when server data is available
  useEffect(() => {
    // CPU throttle is stored in server.cpu.throttle according to the API data
    if (server?.cpu?.throttle !== undefined) {
      setCpuThrottleValue(Number(server.cpu.throttle));
    } else {
    }
  }, [server]);

  const cpuThrottleMutation = useMutation({
    mutationFn: async (percent: number) => {
      setIsApplyingThrottle(true);

      const response = await fetch(`/api/admin/servers/${id}/throttle-cpu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ percent }),
      });

      // First get a clone of the response for error cases
      const responseClone = response.clone();

      if (!response.ok) {
        // Check for 423 status code (locked) without reading body first
        if (response.status === 423) {
          return {
            success: true,
            pending: true,
            message: "Operation queued - server has pending tasks",
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
          throw new Error(errorData.message || errorData.error || 'Failed to throttle CPU');
        } catch (jsonError) {
          // If not valid JSON, try to get the text
          try {
            const textError = await responseClone.text();
            throw new Error(`Failed to throttle CPU: ${textError}`);
          } catch (textError) {
            // If we can't even get the text, create a generic error with the status
            throw new Error(`Failed to throttle CPU: Server returned status ${response.status}`);
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
      setIsApplyingThrottle(false);
      toast({
        title: data.pending ? "Operation Queued" : "CPU Throttle Applied",
        description: data.message || `CPU throttled to ${cpuThrottleValue}% successfully.`,
      });
      // Immediately refetch server data
      refetch();
      // Also invalidate the cache for future requests
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers', id] });
    },
    onError: (error) => {
      setIsApplyingThrottle(false);
      // Check if error message indicates a queue issue
      if (error.message && error.message.includes("pending tasks in queue")) {
        toast({
          title: "Operation Queued",
          description: "A previous operation is still in progress. Please wait.",
        });
      } else {
        toast({
          title: "CPU Throttle Failed",
          description: error.message || "There was a problem throttling the CPU.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Back button */}
        <Link href="/admin/servers">
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Servers List
          </Button>
        </Link>

        {/* Server header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Server className="h-7 w-7 text-primary" />
              {isLoading ? (
                <Skeleton className="h-9 w-64" />
              ) : error ? (
                "Error Loading Server"
              ) : (
                server?.name || "Server Details"
              )}
            </h1>
            {!isLoading && !error && server && (
              <p className="text-muted-foreground mt-1">
                ID: {server.id} • UUID: {server.uuid}
              </p>
            )}
          </div>

          {/* Status badges */}
          {!isLoading && !error && server && (
            <div className="flex gap-2">
              {/* Suspension status */}
              <UIBadge
                variant={server.suspended ? "destructive" : "default"}
                className={`px-3 py-1 ${!server.suspended ? "bg-green-500 hover:bg-green-600" : ""}`}
              >
                {server.suspended ? "Suspended" : "Active"}
              </UIBadge>

              {/* Power status - comes from server.state */}
              {server.state !== "complete" && (
                <UIBadge
                  variant={
                    server.state === "running" ? "default" :
                    server.state === "stopped" ? "outline" :
                    server.state === "shutdown" ? "secondary" :
                    server.state === "paused" ? "secondary" :
                    "outline"
                  }
                  className={`px-3 py-1 ${
                    server.state === "running" ? "bg-blue-500 hover:bg-blue-600" :
                    server.state === "stopped" ? "bg-gray-200 text-gray-700" :
                    server.state === "shutdown" ? "bg-orange-300 text-orange-800" :
                    server.state === "paused" ? "bg-yellow-300 text-yellow-800" :
                    ""
                  }`}
                >
                  {server.state === "running" ? "Running" :
                   server.state === "stopped" ? "Stopped" :
                   server.state === "shutdown" ? "Shutting Down" :
                   server.state === "paused" ? "Paused" :
                   server.state || "Unknown"}
                </UIBadge>
              )}

              {/* Protected status */}
              {server.protected && (
                <UIBadge
                  variant="secondary"
                  className="px-3 py-1"
                >
                  Protected
                </UIBadge>
              )}
            </div>
          )}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
              <Skeleton className="h-[120px] w-full" />
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Server</CardTitle>
              <CardDescription>
                There was a problem loading the server details.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Please try refreshing the page or contact support if the problem persists.</p>
              <Button onClick={() => window.location.reload()} className="mt-4">
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Server details */}
        {!isLoading && !error && server && (
          <div className="space-y-4">
            {/* Tab Navigation Dropdown */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Server Details</h2>
                <div className="w-64">
                  <Select value={activeTab} onValueChange={setActiveTab}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overview">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Overview
                        </div>
                      </SelectItem>
                      <SelectItem value="specs">
                        <div className="flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          Specifications
                        </div>
                      </SelectItem>
                      <SelectItem value="network">
                        <div className="flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          Network
                        </div>
                      </SelectItem>
                      <SelectItem value="traffic">
                        <div className="flex items-center gap-2">
                          <LineChart className="h-4 w-4" />
                          Traffic
                        </div>
                      </SelectItem>
                      <SelectItem value="storage">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          Storage
                        </div>
                      </SelectItem>
                      <SelectItem value="vnc">
                        <div className="flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          VNC
                        </div>
                      </SelectItem>
                      <SelectItem value="console">
                        <div className="flex items-center gap-2">
                          <Terminal className="h-4 w-4" />
                          Controls
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* General Information */}
                <Card className="md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      General Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground w-1/3">Name:</td>
                          <td className="py-1 font-medium">{server.name}</td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">ID:</td>
                          <td className="py-1 font-medium">{server.id}</td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">UUID:</td>
                          <td className="py-1 font-medium">{server.uuid}</td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Hypervisor ID:</td>
                          <td className="py-1 font-medium">{server.hypervisorId}</td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Owner ID:</td>
                          <td className="py-1 font-medium">
                            {/* This should always show the extRelationID (never VirtFusion owner ID) */}
                            {typeof server.owner === 'object'
                              ? (server.owner.extRelationID || server.owner.id)
                              : (server.extRelationID || server.ownerId || server.owner)}
                          </td>
                        </tr>

                        {/* Always include the Root Password row, but conditionally show password or message */}
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Root Password:</td>
                          <td className="py-1 font-medium flex items-center gap-2">
                            {generatedPassword ? (
                              <>
                                <code className="bg-muted px-2 py-0.5 rounded text-sm font-mono">
                                  {generatedPassword}
                                </code>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => copyToClipboard(generatedPassword, 'password')}
                                  className="h-6 w-6"
                                  title="Copy to clipboard"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                </Button>
                              </>
                            ) : (
                              <span className="text-muted-foreground text-sm flex items-center">
                                <InfoIcon className="h-4 w-4 mr-1" />
                                Use the Reset Password option in Controls tab
                              </span>
                            )}
                          </td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Suspended Status:</td>
                          <td className="py-1">
                            <UIBadge
                              variant={server.suspended ? "destructive" : "default"}
                              className={`${!server.suspended ? "bg-green-500 hover:bg-green-600" : ""}`}
                            >
                              {server.suspended ? "Suspended" : "Active"}
                            </UIBadge>
                          </td>
                        </tr>

                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Power State:</td>
                          <td className="py-1">
                            <PowerStatusBadge server={server} />
                          </td>
                        </tr>

                        {server.protected !== undefined && (
                          <tr>
                            <td className="py-1 pr-2 text-muted-foreground">Protected:</td>
                            <td className="py-1">
                              <UIBadge variant={server.protected ? "default" : "outline"}>
                                {server.protected ? "Yes" : "No"}
                              </UIBadge>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Timeline Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <tbody>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Created:</td>
                          <td className="py-1 font-medium">{formatDate(server.created)}</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Built:</td>
                          <td className="py-1 font-medium">{formatDate(server.built)}</td>
                        </tr>
                        <tr>
                          <td className="py-1 pr-2 text-muted-foreground">Last Updated:</td>
                          <td className="py-1 font-medium">{formatDate(server.updated)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hypervisor Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Hypervisor
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-2">
                      <p className="text-xl font-bold">ID: {server.hypervisorId}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Commissioned: {server.commissioned}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Owner Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Badge className="h-5 w-5" />
                      Owner
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-2">
                      {/* Note: In VirtFusion integration, we use the local user.id as the extRelationId
                          parameter in URLs and requests, not the virtFusionId */}
                      <p className="text-xl font-bold">
                        ID: {typeof server.owner === 'object'
                              ? (server.owner.extRelationID || server.owner.id)
                              : (server.extRelationID || server.ownerId || server.owner)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        ExtRelationID is our local system user.id used for VirtFusion API calls
                      </p>
                      {/* Note: No view button here - we'll properly display the owner in
                          ExtRelationID mapping through the server list view only */}
                    </div>
                  </CardContent>
                </Card>
              </div>


              </div>
            )}

            {/* Specifications Tab */}
            {activeTab === "specs" && (
              <div className="space-y-4">
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

                    {/* CPU Throttle Control */}
                    <div className="space-y-2 mt-6 col-span-1 md:col-span-2 border rounded-md p-4 bg-muted/20">
                      <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                        CPU Throttle Control
                        {isApplyingThrottle && <RefreshCw className="h-3 w-3 animate-spin text-primary" />}
                      </h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Current Throttle: {cpuThrottleValue}%</span>
                          <span className="text-xs text-muted-foreground">
                            {cpuThrottleValue === 0 ? 'No Throttling (Full Speed)' :
                             cpuThrottleValue < 30 ? 'Light Throttling' :
                             cpuThrottleValue < 60 ? 'Moderate Throttling' :
                             'Heavy Throttling'}
                          </span>
                        </div>

                        <div className="pt-2">
                          <Slider
                            defaultValue={[cpuThrottleValue]}
                            value={[cpuThrottleValue]}
                            max={99}
                            min={0}
                            step={1}
                            onValueChange={(value) => setCpuThrottleValue(value[0])}
                            className="w-full"
                          />
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>No Throttle</span>
                            <span>Max Throttle (99%)</span>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground"
                            onClick={() => cpuThrottleMutation.mutate(cpuThrottleValue)}
                            disabled={isApplyingThrottle || cpuThrottleMutation.isPending}
                          >
                            {isApplyingThrottle || cpuThrottleMutation.isPending ? 'Applying...' : 'Apply Throttle'}
                          </Button>
                        </div>
                      </div>
                    </div>
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
              </div>
            )}

            {/* Network Tab */}
            {activeTab === "network" && (
              <div className="space-y-4">
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
              </div>
            )}

            {/* Traffic Tab */}
            {activeTab === "traffic" && (
              <div className="space-y-4">
                {/* Add Traffic tab query */}
                <TrafficTab serverId={serverId} />
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === "storage" && (
              <div className="space-y-4">
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
              </div>
            )}

            {/* VNC Tab */}
            {activeTab === "vnc" && (
              <div className="space-y-4">
                <VNCTab serverId={serverId} />
              </div>
            )}

            {/* Controls Tab */}
            {activeTab === "console" && (
              <div className="space-y-4">
              <div className="space-y-6">
                {/* Power status card with enhanced design */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Server Power Status
                    </CardTitle>
                    <CardDescription>
                      Monitor and control server power state
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col space-y-4">
                        {/* Current Power Status Display */}
                        <div className="bg-muted/40 p-4 rounded-lg border flex flex-col items-center justify-center text-center">
                          <h3 className="text-sm font-medium text-muted-foreground mb-2">CURRENT POWER STATUS</h3>
                          <div className="flex items-center gap-2 justify-center mb-2">
                            <div className={`w-3 h-3 rounded-full animate-pulse ${
                              // First check the powerStatus from our database tracking
                              server.powerStatus?.powerState === "RUNNING" ? "bg-green-500" :
                              server.powerStatus?.powerState === "STOPPED" ? "bg-red-500" :
                              // Check remoteState.state and remoteState.running which comes from the ?remoteState=true parameter
                              server.remoteState?.state === "running" || server.remoteState?.running === true ? "bg-green-500" :
                              server.remoteState?.state === "stopped" || server.remoteState?.running === false ? "bg-red-500" :
                              // Fall back to server.state if neither powerStatus nor remoteState is available
                              server.state === "running" || server.state === "RUNNING" ? "bg-green-500" :
                              server.state === "stopped" || server.state === "STOPPED" ? "bg-red-500" :
                              server.state === "shutdown" || server.state === "SHUTTING_DOWN" ? "bg-orange-500" :
                              server.state === "paused" || server.state === "PAUSED" ? "bg-yellow-500" :
                              // Default to gray as unknown since we need proper power state
                              "bg-gray-500"
                            }`}></div>
                            <span className="text-xl font-bold">
                              {/* First check the powerStatus from our database tracking */}
                              {server.powerStatus?.powerState === "RUNNING" ? "RUNNING" :
                               server.powerStatus?.powerState === "STOPPED" ? "STOPPED" :
                               // Check remoteState.state and remoteState.running which comes from the ?remoteState=true parameter
                               server.remoteState?.state === "running" || server.remoteState?.running === true ? "RUNNING" :
                               server.remoteState?.state === "stopped" || server.remoteState?.running === false ? "STOPPED" :
                               // Fall back to server.state if neither powerStatus nor remoteState is available
                               server.state === "running" || server.state === "RUNNING" ? "RUNNING" :
                               server.state === "stopped" || server.state === "STOPPED" ? "STOPPED" :
                               server.state === "shutdown" || server.state === "SHUTTING_DOWN" ? "SHUTTING DOWN" :
                               server.state === "paused" || server.state === "PAUSED" ? "PAUSED" :
                               "UNKNOWN"}
                            </span>
                          </div>
                          <div className="mt-2">
                            <UIBadge
                              variant={
                                server.suspended ? "destructive" : "default"
                              }
                              className={`px-3 py-1 ${
                                !server.suspended ? "bg-green-500 hover:bg-green-600" : ""
                              }`}
                            >
                              {server.suspended ? "SERVER SUSPENDED" : "SERVER ACTIVE"}
                            </UIBadge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Last updated: {formatDate(server.updated)}
                          </p>
                        </div>

                        {/* Power Actions Description */}
                        <div className="text-sm text-muted-foreground">
                          <h4 className="font-medium mb-1">Power Actions:</h4>
                          <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Boot</strong> - Start the server if it's stopped</li>
                            <li><strong>Shutdown</strong> - Gracefully shut down the OS</li>
                            <li><strong>Restart</strong> - Reboot the server</li>
                            <li><strong>Power Off</strong> - Force power off (not recommended)</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-4">
                        {/* Power Action Buttons */}
                        <div className="bg-muted/40 p-4 rounded-lg border">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">POWER ACTIONS</h3>
                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="flex-1 bg-green-50 border-green-200 hover:bg-green-200 text-green-700 hover:text-green-900 font-medium"
                              onClick={() => bootMutation.mutate()}
                              disabled={bootMutation.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" /> Boot
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 bg-orange-50 border-orange-200 hover:bg-orange-200 text-orange-700 hover:text-orange-900 font-medium"
                              onClick={() => shutdownMutation.mutate()}
                              disabled={shutdownMutation.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" /> Shutdown
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 bg-blue-50 border-blue-200 hover:bg-blue-200 text-blue-700 hover:text-blue-900 font-medium"
                              onClick={() => restartMutation.mutate()}
                              disabled={restartMutation.isPending}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" /> Restart
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 bg-red-50 border-red-200 hover:bg-red-200 text-red-700 hover:text-red-900 font-medium"
                              onClick={() => powerOffMutation.mutate()}
                              disabled={powerOffMutation.isPending}
                            >
                              <Power className="mr-2 h-4 w-4" /> Power Off
                            </Button>
                          </div>
                        </div>

                        {/* State Indicator Legend */}
                        <div className="text-xs text-muted-foreground">
                          <h4 className="font-medium mb-1">Power State Indicators:</h4>
                          <div className="flex flex-wrap gap-2">
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              <span>Running</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-red-500"></div>
                              <span>Stopped</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                              <span>Shutting Down</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                              <span>Paused</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Server Management Card */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Server Management
                    </CardTitle>
                    <CardDescription>
                      Manage server status and configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Main layout with two columns side by side */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col">
                        {/* Status Actions Description */}
                        <div className="text-sm text-muted-foreground mb-4">
                          <h4 className="font-medium mb-1">Status Actions:</h4>
                          <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Suspend</strong> - Temporarily disable server access</li>
                            <li><strong>Reset Password</strong> - Change the server login credentials</li>
                          </ul>
                        </div>

                        {/* Status Actions */}
                        <div className="bg-muted/40 p-4 rounded-lg border h-full flex flex-col">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">STATUS ACTIONS</h3>
                          <div className="grid grid-cols-2 gap-3 mt-auto">
                            {server.suspended ? (
                              <Button
                                variant="outline"
                                className="flex-1 bg-green-50 border-green-200 hover:bg-green-200 text-green-700 hover:text-green-900 font-medium"
                                onClick={() => unsuspendMutation.mutate()}
                                disabled={unsuspendMutation.isPending}
                              >
                                <Shield className="mr-2 h-4 w-4" /> Unsuspend
                              </Button>
                            ) : (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="flex-1 bg-amber-50 border-amber-200 hover:bg-amber-200 text-amber-700 hover:text-amber-900 font-medium"
                                  >
                                    <ShieldOff className="mr-2 h-4 w-4" /> Suspend
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirm Suspension</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      <div className="flex items-start gap-2 my-2">
                                        <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                                        <div>
                                          <p>Are you sure you want to suspend this server?</p>
                                          <p className="mt-2">The server will be inaccessible to the user until unsuspended.</p>
                                        </div>
                                      </div>
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => suspendMutation.mutate()}
                                      disabled={suspendMutation.isPending}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      {suspendMutation.isPending ? 'Processing...' : 'Suspend Server'}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex-1 bg-blue-50 border-blue-200 hover:bg-blue-200 text-blue-700 hover:text-blue-900 font-medium"
                                >
                                  <Key className="mr-2 h-4 w-4" /> Reset Password
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Reset Server Password</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <div className="flex items-start gap-2 my-2">
                                      <AlertTriangle className="h-5 w-5 text-blue-500 mt-0.5" />
                                      <div>
                                        <p>Are you sure you want to reset the root password for this server?</p>
                                        <p className="mt-2">The new password will be displayed in the Overview tab after reset.</p>
                                      </div>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => resetPasswordMutation.mutate()}
                                    disabled={resetPasswordMutation.isPending}
                                    className="bg-blue-600 text-white hover:bg-blue-700"
                                  >
                                    {resetPasswordMutation.isPending ? 'Processing...' : 'Reset Password'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        {/* Management Actions Description */}
                        <div className="text-sm text-muted-foreground mb-4">
                          <h4 className="font-medium mb-1">Management Actions:</h4>
                          <ul className="list-disc list-inside space-y-1 pl-2">
                            <li><strong>Delete Server</strong> - Permanently remove this server</li>
                          </ul>
                        </div>

                        {/* Management Actions */}
                        <div className="bg-muted/40 p-4 rounded-lg border h-full flex flex-col">
                          <h3 className="text-sm font-medium text-muted-foreground mb-3 text-center">MANAGEMENT ACTIONS</h3>
                          <div className="grid grid-cols-1 gap-3 mt-auto">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  className="flex-1 bg-red-50 border-red-200 hover:bg-red-200 text-red-700 hover:text-red-900 font-medium"
                                >
                                  <Trash className="mr-2 h-4 w-4" /> Delete Server
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Permanently Delete Server</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    <div className="flex items-start gap-2 my-2">
                                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                                      <div>
                                        <p>Are you sure you want to delete this server?</p>
                                        <p className="mt-2">This action is permanent and cannot be undone. All data associated with this server will be lost.</p>
                                      </div>
                                    </div>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteServerMutation.mutate()}
                                    disabled={deleteServerMutation.isPending}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    {deleteServerMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              </div>
            )}

          </div>
        )}
      </div>
    </AdminLayout>
  );
}