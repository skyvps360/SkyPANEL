import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ResourceMeter } from "@/components/ui/resource-meter";
import { ServerDetails } from "@/components/servers/ServerDetails";
import { ServerConsole } from "@/components/servers/ServerConsole";
import { 
  Power, 
  RotateCw, 
  Terminal, 
  HardDrive, 
  Network,
  Trash2,
  ArrowLeft,
  MonitorSmartphone,
  Activity,
  Cpu,
  Database,
  Settings,
  HardDriveDownload
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Server {
  id: number;
  name: string;
  status: string;
  ipAddress: string | null;
  operatingSystem: string;
  cpu: number;
  memory: number;
  storage: number;
  createdAt: string;
  userId: number;
  stats?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  virtFusionData?: any;
}

export default function ServerDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/servers/:id');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const serverId = params?.id ? parseInt(params.id) : 0;

  // Fetch server details
  const { 
    data: server, 
    isLoading, 
    error,
    refetch
  } = useQuery<Server>({
    queryKey: [`/api/servers/${serverId}`],
    enabled: !!serverId,
  });

  // Refetch server data every 30 seconds when tab is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch]);

  // If server not found
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Server not found or you don't have access",
        variant: "destructive",
      });
      navigate("/servers");
    }
  }, [error, navigate, toast]);

  // Server power control
  const handlePowerAction = async (action: string) => {
    if (!server) return;
    
    try {
      await apiRequest(`/api/servers/${serverId}/power/${action}`, {
        method: "POST"
      });
      toast({
        title: "Success",
        description: `Server ${action} command sent successfully`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} server`,
        variant: "destructive",
      });
    }
  };

  // Handle server deletion
  const handleDeleteServer = async () => {
    try {
      await apiRequest(`/api/servers/${serverId}`, {
        method: "DELETE"
      });
      toast({
        title: "Server deleted",
        description: "Server has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      navigate("/servers");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete server",
        variant: "destructive",
      });
    }
    setDeleteDialogOpen(false);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "running":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Running</Badge>;
      case "stopped":
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Stopped</Badge>;
      case "restarting":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Restarting</Badge>;
      case "creating":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Creating</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get OS icon
  const getOsIcon = (os: string = "") => {
    if (os.toLowerCase().includes("ubuntu")) {
      return "fa-brands fa-ubuntu";
    } else if (os.toLowerCase().includes("windows")) {
      return "fa-brands fa-windows";
    } else if (os.toLowerCase().includes("debian")) {
      return "fa-brands fa-debian";
    } else if (os.toLowerCase().includes("centos")) {
      return "fa-brands fa-centos";
    } else if (os.toLowerCase().includes("fedora")) {
      return "fa-brands fa-fedora";
    } else {
      return "fa-solid fa-server";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2">Loading server details...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If server not found
  if (!server) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p>Server not found or you don't have access.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/servers")}
            >
              Back to Servers
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="icon"
            className="mr-4"
            onClick={() => navigate("/servers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center">
              <i className={`${getOsIcon(server.operatingSystem)} text-gray-400 mr-3 text-xl`}></i>
              <h1 className="text-2xl font-semibold">{server.name}</h1>
              <div className="ml-3">{getStatusBadge(server.status)}</div>
            </div>
            <p className="text-gray-500 mt-1">
              {server.operatingSystem} • {server.cpu} vCPU • {(server.memory / 1024).toFixed(0)} GB RAM • {server.storage} GB Storage
            </p>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => handlePowerAction(server.status === 'running' ? 'stop' : 'start')}
          >
            <Power className="h-4 w-4 mr-2" />
            {server.status === 'running' ? 'Stop' : 'Start'}
          </Button>
          <Button 
            variant="outline" 
            className="flex items-center"
            onClick={() => handlePowerAction('restart')}
            disabled={server.status !== 'running'}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          <Button
            variant="destructive"
            className="flex items-center"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 bg-muted/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-background">
            <MonitorSmartphone className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="performance" className="data-[state=active]:bg-background">
            <Activity className="h-4 w-4 mr-2" />
            Performance
          </TabsTrigger>
          <TabsTrigger value="networking" className="data-[state=active]:bg-background">
            <Network className="h-4 w-4 mr-2" />
            Networking
          </TabsTrigger>
          <TabsTrigger value="storage" className="data-[state=active]:bg-background">
            <HardDriveDownload className="h-4 w-4 mr-2" />
            Storage
          </TabsTrigger>
          <TabsTrigger value="console" className="data-[state=active]:bg-background">
            <Terminal className="h-4 w-4 mr-2" />
            Console
          </TabsTrigger>
          <TabsTrigger value="settings" className="data-[state=active]:bg-background">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Tab Contents */}
        <TabsContent value="overview" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Server Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">State</span>
                    <span>{getStatusBadge(server.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">IP Address</span>
                    <span>{server.ipAddress || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Operating System</span>
                    <span>{server.operatingSystem}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created</span>
                    <span>{new Date(server.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resource Usage Card */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Resource Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <ResourceMeter
                    label="CPU"
                    value={server.stats?.cpuUsage || 0}
                    colorScheme="default"
                  />
                  <ResourceMeter
                    label="Memory"
                    value={server.stats?.memoryUsage || 0}
                    colorScheme="default"
                  />
                  <ResourceMeter
                    label="Storage"
                    value={server.stats?.diskUsage || 0}
                    colorScheme="default"
                  />
                  <ResourceMeter
                    label="Network"
                    value={server.stats?.networkUsage || 0}
                    colorScheme="default"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Server Details Component */}
            <div className="md:col-span-3">
              <ServerDetails server={server} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Performance Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center p-6">
                <Activity className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Performance monitoring</h3>
                <p className="text-muted-foreground max-w-md">
                  Detailed performance monitoring charts and metrics will be available here.
                  Currently, you can view basic resource usage on the Overview tab.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="networking" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Network Configuration</CardTitle>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center p-6">
                <Network className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Network settings</h3>
                <p className="text-muted-foreground max-w-md">
                  IP address management and network configuration options will be available here.
                  Currently, your server's IP address is {server.ipAddress || "not assigned"}.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="storage" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Storage Management</CardTitle>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center p-6">
                <HardDrive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Storage management</h3>
                <p className="text-muted-foreground max-w-md">
                  Storage management options, including attaching additional volumes 
                  and monitoring disk usage will be available here.
                  Currently, your server has {server.storage} GB of storage.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console" className="mt-0">
          <ServerConsole serverId={server.id} serverStatus={server.status} />
        </TabsContent>

        <TabsContent value="settings" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>Server Settings</CardTitle>
            </CardHeader>
            <CardContent className="h-96 flex items-center justify-center">
              <div className="text-center p-6">
                <Settings className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Server settings</h3>
                <p className="text-muted-foreground max-w-md">
                  Configuration options for your server, including OS reinstallation, 
                  resource allocation changes, and more will be available here.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your server "{server.name}" and all associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteServer}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
