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
import { getBrandColors } from "@/lib/brand-theme";
import { ResourceMeter } from "@/components/ui/resource-meter";
import { ServerDetails } from "@/components/servers/ServerDetails";
import { ServerConsole } from "@/components/servers/ServerConsole";
import {
  Power,
  RotateCw,
  Terminal,
  HardDrive,
  Network,
  ArrowLeft,
  MonitorSmartphone,
  Activity,
  Cpu,
  Database,
  Settings,
  HardDriveDownload
} from "lucide-react";

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
  // VirtFusion server data structure
  data?: {
    id: number;
    name: string;
    hostname: string;
    state: string;
    uuid: string;
    suspended: boolean;
    protected: boolean;
    created: string;
    updated: string;
    built: string;
    settings: {
      resources: {
        memory: number;
        storage: number;
        traffic: number;
        cpuCores: number;
      };
    };
    cpu: {
      cores: number;
      type: string;
      shares: number;
    };
    network: {
      interfaces: Array<{
        id: number;
        name: string;
        type: string;
        mac: string;
        ipv4: Array<{
          address: string;
          gateway: string;
          netmask: string;
        }>;
        ipv6: Array<{
          id: number;
          block?: {
            id: number;
            name: string;
          };
          order: number;
          enabled: boolean;
          addresses: string[];
          addressesDetailed: Array<{
            address?: string;
            prefix?: number;
          } | string>;
          subnet: string;
          cidr: number;
          exhausted: boolean;
          gateway: string;
          resolver1: string;
          resolver2: string;
          routeNet: boolean;
        }>;
      }>;
      secondaryInterfaces: Array<{
        id: number;
        name: string;
        type: string;
        mac: string;
        enabled: boolean;
        ipv4: Array<{
          address: string;
          gateway: string;
          netmask: string;
        }>;
        ipv6?: Array<{
          id: number;
          block?: {
            id: number;
            name: string;
          };
          order: number;
          enabled: boolean;
          addresses: string[];
          addressesDetailed: Array<{
            address?: string;
            prefix?: number;
          } | string>;
          subnet: string;
          cidr: number;
          exhausted: boolean;
          gateway: string;
          resolver1: string;
          resolver2: string;
          routeNet: boolean;
        }>;
      }>;
    };
    storage: Array<{
      id: number;
      capacity: number;
      type: string;
      primary: boolean;
      name: string;
    }>;
    hypervisor: {
      id: number;
      name: string;
      ip: string;
      hostname: string;
      group: {
        name: string;
        icon: string;
      };
    };
    vnc: {
      ip: string;
      port: number;
      enabled: boolean;
    };
    sshKeys: Array<{
      id: number;
      name: string;
      type: string;
      enabled: boolean;
    }>;
    qemuAgent?: {
      os?: {
        name?: string;
        kernel?: string;
        screen?: string;
      };
    };
    remoteState?: any;
  };
}

export default function ServerDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/servers/:id');
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch branding data for dynamic colors
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Get brand colors from database settings
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  const serverId = params?.id ? parseInt(params.id) : 0;

  // Fetch server details
  const {
    data: server,
    isLoading,
    error,
    refetch
  } = useQuery<Server>({
    queryKey: [`/api/user/servers/${serverId}`],
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
      await apiRequest(`/api/user/servers/${serverId}/power/${action}`, {
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

  // Extract server information from VirtFusion data
  const getServerInfo = () => {
    const vfData = server?.data;
    if (!vfData) {
      return {
        name: server?.name || 'Unknown',
        hostname: server?.ipAddress || 'Not assigned',
        status: server?.status || 'unknown',
        os: server?.operatingSystem || 'Unknown',
        cpu: server?.cpu || 0,
        memory: server?.memory || 0,
        storage: server?.storage || 0,
        created: server?.createdAt || '',
        ipAddresses: [],
        macAddresses: [],
        hypervisor: null,
        vnc: null,
        sshKeys: [],
        storageDevices: []
      };
    }

    // Extract IP addresses from network interfaces
    const ipAddresses: string[] = [];
    const macAddresses: string[] = [];

    // Primary interfaces
    vfData.network?.interfaces?.forEach(iface => {
      if (iface.mac) macAddresses.push(iface.mac);
      iface.ipv4?.forEach(ip => {
        if (ip.address) ipAddresses.push(ip.address);
      });
    });

    // Secondary interfaces
    vfData.network?.secondaryInterfaces?.forEach(iface => {
      if (iface.mac) macAddresses.push(iface.mac);
      iface.ipv4?.forEach(ip => {
        if (ip.address) ipAddresses.push(ip.address);
      });
    });

    return {
      name: vfData.name || server?.name || 'Unknown',
      hostname: vfData.hostname || ipAddresses[0] || 'Not assigned',
      status: vfData.state || server?.status || 'unknown',
      os: vfData.qemuAgent?.os?.name || server?.operatingSystem || 'Unknown',
      cpu: vfData.cpu?.cores || vfData.settings?.resources?.cpuCores || server?.cpu || 0,
      memory: vfData.settings?.resources?.memory || server?.memory || 0,
      storage: vfData.settings?.resources?.storage || server?.storage || 0,
      traffic: vfData.settings?.resources?.traffic || 0,
      created: vfData.created || server?.createdAt || '',
      built: vfData.built || '',
      updated: vfData.updated || '',
      uuid: vfData.uuid || '',
      ipAddresses,
      macAddresses,
      hypervisor: vfData.hypervisor,
      vnc: vfData.vnc,
      sshKeys: vfData.sshKeys || [],
      storageDevices: vfData.storage || [],
      networkInterfaces: vfData.network?.interfaces || [],
      secondaryInterfaces: vfData.network?.secondaryInterfaces || []
    };
  };

  const serverInfo = getServerInfo();

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
            style={{
              color: brandColors.primary.full || '#3b82f6',
              borderColor: brandColors.primary.full || '#3b82f6'
            }}
            onClick={() => navigate("/servers")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center">
              <i className={`${getOsIcon(serverInfo.os)} text-gray-400 mr-3 text-xl`}></i>
              <h1 className="text-2xl font-semibold">{serverInfo.name}</h1>
              <div className="ml-3">{getStatusBadge(serverInfo.status)}</div>
            </div>
            <p className="text-gray-500 mt-1">
              {serverInfo.os} • {serverInfo.cpu} vCPU • {(serverInfo.memory / 1024).toFixed(0)} GB RAM • {serverInfo.storage} GB Storage
              {serverInfo.traffic > 0 && ` • ${serverInfo.traffic} GB Traffic`}
            </p>
            {serverInfo.uuid && (
              <p className="text-xs text-gray-400 mt-1">
                UUID: {serverInfo.uuid}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="flex items-center"
            style={{
              color: brandColors.primary.full || '#3b82f6',
              borderColor: brandColors.primary.full || '#3b82f6'
            }}
            onClick={() => handlePowerAction(serverInfo.status === 'running' ? 'stop' : 'start')}
          >
            <Power className="h-4 w-4 mr-2" />
            {serverInfo.status === 'running' ? 'Stop' : 'Start'}
          </Button>
          <Button
            variant="outline"
            className="flex items-center"
            style={{
              color: brandColors.primary.full || '#3b82f6',
              borderColor: brandColors.primary.full || '#3b82f6'
            }}
            onClick={() => handlePowerAction('restart')}
            disabled={serverInfo.status !== 'running'}
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Restart
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
                <CardTitle className="text-lg">Server Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">State</span>
                    <span>{getStatusBadge(serverInfo.status)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Hostname</span>
                    <span className="text-sm">{serverInfo.hostname}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Operating System</span>
                    <span className="text-sm">{serverInfo.os}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Created</span>
                    <span className="text-sm">{new Date(serverInfo.created).toLocaleDateString()}</span>
                  </div>
                  {serverInfo.built && (
                    <div className="flex justify-between">
                      <span className="font-medium">Built</span>
                      <span className="text-sm">{new Date(serverInfo.built).toLocaleDateString()}</span>
                    </div>
                  )}
                  {serverInfo.hypervisor && (
                    <div className="flex justify-between">
                      <span className="font-medium">Location</span>
                      <span className="text-sm">{serverInfo.hypervisor.group?.name || 'Unknown'}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Network Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Network Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serverInfo.ipAddresses.length > 0 && (
                    <div>
                      <span className="font-medium text-sm">IP Addresses</span>
                      <div className="mt-1 space-y-1">
                        {serverInfo.ipAddresses.map((ip, index) => (
                          <div key={index} className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                            {ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {serverInfo.macAddresses.length > 0 && (
                    <div>
                      <span className="font-medium text-sm">MAC Addresses</span>
                      <div className="mt-1 space-y-1">
                        {serverInfo.macAddresses.map((mac, index) => (
                          <div key={index} className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded">
                            {mac}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {serverInfo.vnc && (
                    <div>
                      <span className="font-medium text-sm">VNC Console</span>
                      <div className="mt-1 text-sm text-gray-600">
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <Badge variant={serverInfo.vnc.enabled ? "default" : "secondary"}>
                            {serverInfo.vnc.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        {serverInfo.vnc.enabled && (
                          <>
                            <div className="flex justify-between mt-1">
                              <span>IP:</span>
                              <span className="font-mono">{serverInfo.vnc.ip}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Port:</span>
                              <span className="font-mono">{serverInfo.vnc.port}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Resource Specifications Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resource Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="font-medium">CPU Cores</span>
                    <span className="text-sm">{serverInfo.cpu} vCPU</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Memory</span>
                    <span className="text-sm">{(serverInfo.memory / 1024).toFixed(1)} GB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Storage</span>
                    <span className="text-sm">{serverInfo.storage} GB</span>
                  </div>
                  {serverInfo.traffic > 0 && (
                    <div className="flex justify-between">
                      <span className="font-medium">Traffic Limit</span>
                      <span className="text-sm">{serverInfo.traffic} GB</span>
                    </div>
                  )}
                  {serverInfo.hypervisor && (
                    <>
                      <div className="flex justify-between">
                        <span className="font-medium">Hypervisor</span>
                        <span className="text-sm">{serverInfo.hypervisor.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Hypervisor IP</span>
                        <span className="text-sm font-mono">{serverInfo.hypervisor.ip}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Storage Devices Section */}
          {serverInfo.storageDevices.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Storage Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serverInfo.storageDevices.map((storage, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{storage.name}</div>
                        <div className="text-sm text-gray-500">
                          {storage.type.toUpperCase()} • Drive {storage.drive?.toUpperCase() || 'Unknown'}
                          {storage.primary && <span className="ml-2 text-blue-600">(Primary)</span>}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{storage.capacity} GB</div>
                        <div className="text-sm text-gray-500">
                          {storage.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SSH Keys Section */}
          {serverInfo.sshKeys.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">SSH Keys</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {serverInfo.sshKeys.map((key, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium">{key.name}</div>
                        <div className="text-sm text-gray-500">{key.type}</div>
                      </div>
                      <Badge variant={key.enabled ? "default" : "secondary"}>
                        {key.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
          <div className="space-y-6">
            {/* Primary Network Interfaces */}
            {serverInfo.networkInterfaces.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Primary Network Interfaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serverInfo.networkInterfaces.map((iface, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{iface.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{iface.type} Interface</p>
                          </div>
                          <Badge variant={iface.enabled ? "default" : "secondary"}>
                            {iface.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium">MAC Address</span>
                            <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-1">{iface.mac}</p>
                          </div>

                          {iface.ipv4 && iface.ipv4.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">IPv4 Addresses</span>
                              <div className="mt-1 space-y-1">
                                {iface.ipv4.map((ip, ipIndex) => (
                                  <div key={ipIndex} className="text-sm">
                                    <p className="font-mono bg-gray-50 px-2 py-1 rounded">{ip.address}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Gateway: {ip.gateway} • Netmask: {ip.netmask}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {iface.ipv6 && iface.ipv6.length > 0 && (
                          <div className="mt-4">
                            <span className="text-sm font-medium">IPv6 Configuration</span>
                            <div className="mt-1 space-y-3">
                              {iface.ipv6.map((ipv6, ipv6Index) => (
                                <div key={ipv6Index} className="text-sm bg-gray-50 p-3 rounded">
                                  <div className="font-medium mb-2">
                                    Subnet: <span className="font-mono">{ipv6.subnet}/{ipv6.cidr}</span>
                                    {ipv6.block && (
                                      <span className="ml-2 text-xs text-blue-600">({ipv6.block.name})</span>
                                    )}
                                  </div>

                                  {/* IPv6 Addresses */}
                                  {((ipv6.addresses && ipv6.addresses.length > 0) || (ipv6.addressesDetailed && ipv6.addressesDetailed.length > 0)) && (
                                    <div className="mb-2">
                                      <span className="text-xs font-medium text-gray-700">IPv6 Addresses:</span>
                                      <div className="mt-1 space-y-1">
                                        {/* Show detailed addresses if available, otherwise show simple addresses */}
                                        {ipv6.addressesDetailed && ipv6.addressesDetailed.length > 0 ? (
                                          ipv6.addressesDetailed.map((detailed, detailIndex) => (
                                            <div key={detailIndex} className="bg-white p-2 rounded border">
                                              <div className="font-mono text-xs">{detailed.address || detailed}</div>
                                              {detailed.prefix && (
                                                <div className="text-xs text-gray-500">Prefix: /{detailed.prefix}</div>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          ipv6.addresses?.map((addr, addrIndex) => (
                                            <div key={addrIndex} className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                              {addr}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div>Gateway: <span className="font-mono">{ipv6.gateway}</span></div>
                                    {ipv6.resolver1 && (
                                      <div>DNS: <span className="font-mono">{ipv6.resolver1}</span>
                                        {ipv6.resolver2 && <span>, <span className="font-mono">{ipv6.resolver2}</span></span>}
                                      </div>
                                    )}
                                    {ipv6.exhausted !== undefined && (
                                      <div>Status: {ipv6.exhausted ? 'Exhausted' : 'Available'}</div>
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
                </CardContent>
              </Card>
            )}

            {/* Secondary Network Interfaces */}
            {serverInfo.secondaryInterfaces.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Secondary Network Interfaces</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {serverInfo.secondaryInterfaces.map((iface, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{iface.name}</h4>
                            <p className="text-sm text-gray-500 capitalize">{iface.type} Interface</p>
                          </div>
                          <Badge variant={iface.enabled ? "default" : "secondary"}>
                            {iface.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm font-medium">MAC Address</span>
                            <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-1">{iface.mac}</p>
                          </div>

                          {iface.ipv4 && iface.ipv4.length > 0 && (
                            <div>
                              <span className="text-sm font-medium">IPv4 Addresses</span>
                              <div className="mt-1 space-y-1">
                                {iface.ipv4.map((ip, ipIndex) => (
                                  <div key={ipIndex} className="text-sm">
                                    <p className="font-mono bg-gray-50 px-2 py-1 rounded">{ip.address}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Gateway: {ip.gateway} • Netmask: {ip.netmask}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {iface.ipv6 && iface.ipv6.length > 0 && (
                          <div className="mt-4">
                            <span className="text-sm font-medium">IPv6 Configuration</span>
                            <div className="mt-1 space-y-3">
                              {iface.ipv6.map((ipv6, ipv6Index) => (
                                <div key={ipv6Index} className="text-sm bg-gray-50 p-3 rounded">
                                  <div className="font-medium mb-2">
                                    Subnet: <span className="font-mono">{ipv6.subnet}/{ipv6.cidr}</span>
                                    {ipv6.block && (
                                      <span className="ml-2 text-xs text-blue-600">({ipv6.block.name})</span>
                                    )}
                                  </div>

                                  {/* IPv6 Addresses */}
                                  {((ipv6.addresses && ipv6.addresses.length > 0) || (ipv6.addressesDetailed && ipv6.addressesDetailed.length > 0)) && (
                                    <div className="mb-2">
                                      <span className="text-xs font-medium text-gray-700">IPv6 Addresses:</span>
                                      <div className="mt-1 space-y-1">
                                        {/* Show detailed addresses if available, otherwise show simple addresses */}
                                        {ipv6.addressesDetailed && ipv6.addressesDetailed.length > 0 ? (
                                          ipv6.addressesDetailed.map((detailed, detailIndex) => (
                                            <div key={detailIndex} className="bg-white p-2 rounded border">
                                              <div className="font-mono text-xs">{detailed.address || detailed}</div>
                                              {detailed.prefix && (
                                                <div className="text-xs text-gray-500">Prefix: /{detailed.prefix}</div>
                                              )}
                                            </div>
                                          ))
                                        ) : (
                                          ipv6.addresses?.map((addr, addrIndex) => (
                                            <div key={addrIndex} className="font-mono text-xs bg-white px-2 py-1 rounded border">
                                              {addr}
                                            </div>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="text-xs text-gray-500 space-y-1">
                                    <div>Gateway: <span className="font-mono">{ipv6.gateway}</span></div>
                                    {ipv6.resolver1 && (
                                      <div>DNS: <span className="font-mono">{ipv6.resolver1}</span>
                                        {ipv6.resolver2 && <span>, <span className="font-mono">{ipv6.resolver2}</span></span>}
                                      </div>
                                    )}
                                    {ipv6.exhausted !== undefined && (
                                      <div>Status: {ipv6.exhausted ? 'Exhausted' : 'Available'}</div>
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
                </CardContent>
              </Card>
            )}

            {/* No Network Interfaces */}
            {serverInfo.networkInterfaces.length === 0 && serverInfo.secondaryInterfaces.length === 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Network Configuration</CardTitle>
                </CardHeader>
                <CardContent className="h-96 flex items-center justify-center">
                  <div className="text-center p-6">
                    <Network className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No network interfaces found</h3>
                    <p className="text-muted-foreground max-w-md">
                      Network interface information is not available for this server.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="storage" className="mt-0">
          {serverInfo.storageDevices.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Storage Devices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serverInfo.storageDevices.map((storage, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium flex items-center">
                            <HardDrive className="h-4 w-4 mr-2" />
                            {storage.name}
                            {storage.primary && <span className="ml-2 text-blue-600 text-sm">(Primary)</span>}
                          </h4>
                          <p className="text-sm text-gray-500">Drive {storage.drive?.toUpperCase() || 'Unknown'}</p>
                        </div>
                        <Badge variant={storage.enabled ? "default" : "secondary"}>
                          {storage.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <span className="text-sm font-medium">Capacity</span>
                          <p className="text-lg font-semibold">{storage.capacity} GB</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Type</span>
                          <p className="text-sm">{storage.type.toUpperCase()}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">Status</span>
                          <p className="text-sm">
                            {storage.status === 3 ? (
                              <Badge variant="default">Active</Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </p>
                        </div>
                      </div>

                      {storage.filename && (
                        <div className="mt-3 pt-3 border-t">
                          <span className="text-sm font-medium">Filename</span>
                          <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-1">{storage.filename}</p>
                        </div>
                      )}

                      {storage.path && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Path</span>
                          <p className="text-sm font-mono bg-gray-50 px-2 py-1 rounded mt-1">{storage.path}</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Created:</span>
                            <span className="ml-2">{new Date(storage.created).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span className="font-medium">Updated:</span>
                            <span className="ml-2">{new Date(storage.updated).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Storage Management</CardTitle>
              </CardHeader>
              <CardContent className="h-96 flex items-center justify-center">
                <div className="text-center p-6">
                  <HardDrive className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No storage devices found</h3>
                  <p className="text-muted-foreground max-w-md">
                    Storage device information is not available for this server.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="console" className="mt-0">
          <ServerConsole serverId={server.id} serverStatus={serverInfo.status} />
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


    </DashboardLayout>
  );
}
