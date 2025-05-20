import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResourceMeter } from "@/components/ui/resource-meter";
import { DataTable } from "@/components/ui/data-table";
import { HardDrive, Database, Plus, Settings, HardDriveDownload, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface Server {
  id: number;
  name: string;
  storage: number;
  status: string;
}

interface StorageVolume {
  id: number;
  name: string;
  size: number;
  used: number;
  serverId: number | null;
  type: string;
  status: string;
  virtFusionId?: number;
  poolId?: number | null;
  hypervisorId?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export default function StoragePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualStorageVolumes, setManualStorageVolumes] = useState<StorageVolume[]>([]);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [manualError, setManualError] = useState<Error | null>(null);
  
  // Fetch servers to display storage info
  const { data: servers = [], isLoading: serversLoading } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
  });
  
  // Fetch storage volumes from our real API endpoint
  const { 
    data: storageVolumes = [], 
    isLoading: volumesLoading,
    error: volumesError,
    refetch: refetchVolumes 
  } = useQuery<StorageVolume[]>({
    queryKey: ["/api/storage-volumes"],
    enabled: !!user, // Only run if user is authenticated
  });
  
  // Manual fetch function if needed
  const fetchStorageVolumes = async () => {
    try {
      setIsManualLoading(true);
      setManualError(null);
      const response = await apiRequest("/api/storage-volumes", {
        method: "GET"
      });
      const data = await response.json();
      setManualStorageVolumes(data);
      return data;
    } catch (error) {
      console.error("Error fetching storage volumes:", error);
      setManualError(error instanceof Error ? error : new Error(String(error)));
      return [];
    } finally {
      setIsManualLoading(false);
    }
  };
  
  // Try to load data on mount if needed
  useEffect(() => {
    if (user && storageVolumes.length === 0 && !volumesLoading) {
      fetchStorageVolumes();
    }
  }, [user, storageVolumes.length, volumesLoading]);
  
  // Function to manually refresh storage data from VirtFusion
  const refreshStorageData = async () => {
    try {
      setIsRefreshing(true);
      
      // First trigger a sync from VirtFusion to our database
      try {
        await apiRequest("/api/storage-volumes/sync", {
          method: "POST"
        });
      } catch (error: any) {
        throw new Error(error.message || "Failed to sync storage data");
      }
      
      // Then try both approaches to ensure we get data
      await Promise.all([
        // Approach 1: Invalidate the query cache
        queryClient.invalidateQueries({ queryKey: ["/api/storage-volumes"] }),
        // Approach 2: Manual fetch
        fetchStorageVolumes()
      ]);
      
      toast({
        title: "Storage volumes refreshed",
        description: "Updated storage information from VirtFusion",
      });
    } catch (error) {
      console.error("Error refreshing storage data:", error);
      toast({
        title: "Refresh failed",
        description: "Could not refresh storage information: " + (error instanceof Error ? error.message : String(error)),
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Calculate totals
  const totalStorage = storageVolumes.reduce((acc, vol) => acc + vol.size, 0);
  const usedStorage = storageVolumes.reduce((acc, vol) => acc + vol.used, 0);
  const usedPercentage = (usedStorage / totalStorage) * 100;

  // Columns for storage volumes table
  const volumesColumns = [
    {
      accessorKey: "name" as keyof StorageVolume,
      header: "Storage Volume",
      cell: (volume: StorageVolume) => (
        <div className="flex items-center">
          <HardDrive className="h-4 w-4 mr-3 text-gray-400" />
          <div className="font-medium">{volume.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "type" as keyof StorageVolume,
      header: "Type",
      cell: (volume: StorageVolume) => (
        <Badge className="bg-blue-100 text-blue-800">
          {volume.type}
        </Badge>
      ),
    },
    {
      accessorKey: "size" as keyof StorageVolume,
      header: "Size",
      cell: (volume: StorageVolume) => (
        <span>{volume.size} GB</span>
      ),
    },
    {
      accessorKey: "used" as keyof StorageVolume,
      header: "Used",
      cell: (volume: StorageVolume) => (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs mb-1">
            <span>{volume.used} GB</span>
            <span>{Math.round((volume.used / volume.size) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-primary rounded-full" 
              style={{ width: `${(volume.used / volume.size) * 100}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status" as keyof StorageVolume,
      header: "Status",
      cell: (volume: StorageVolume) => (
        <Badge className={volume.status === "online" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
          {volume.status}
        </Badge>
      ),
    },
  ];

  // Columns for server storage table
  const serverColumns = [
    {
      accessorKey: "name" as keyof Server,
      header: "Server",
      cell: (server: Server) => (
        <div className="flex items-center">
          <Database className="h-4 w-4 mr-3 text-gray-400" />
          <div className="font-medium">{server.name}</div>
        </div>
      ),
    },
    {
      accessorKey: "storage" as keyof Server,
      header: "Allocated Storage",
      cell: (server: Server) => (
        <span>{server.storage} GB</span>
      ),
    },
    {
      accessorKey: "status" as keyof Server,
      header: "Status",
      cell: (server: Server) => (
        <Badge className={server.status === "running" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
          {server.status}
        </Badge>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Storage Management</h1>
          <p className="text-gray-500 mt-1">Manage your storage resources</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            onClick={refreshStorageData} 
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center mr-2"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          <Button className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Add Storage
          </Button>
        </div>
      </div>

      {/* Storage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Storage Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {volumesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="ml-2">Loading storage data...</p>
              </div>
            ) : (
              <div className="flex flex-col md:flex-row md:items-end gap-8">
                <div className="flex-1">
                  <ResourceMeter
                    label="Total Storage Usage"
                    value={totalStorage > 0 ? usedPercentage : 0}
                    size="lg"
                  />
                  <div className="mt-4 flex justify-between text-sm">
                    <span>Used: {usedStorage} GB</span>
                    <span>Available: {totalStorage - usedStorage} GB</span>
                    <span>Total: {totalStorage} GB</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 md:w-1/3">
                  {/* Calculate storage by type */}
                  <div className="bg-muted/30 p-4 rounded-lg flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">SSD Storage</h3>
                    <p className="text-2xl font-semibold">
                      {Math.round(storageVolumes
                        .filter(vol => vol.type.toLowerCase().includes('ssd'))
                        .reduce((acc, vol) => acc + vol.size, 0) / 1000)} TB
                    </p>
                  </div>
                  <div className="bg-muted/30 p-4 rounded-lg flex-1">
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">HDD Storage</h3>
                    <p className="text-2xl font-semibold">
                      {Math.round(storageVolumes
                        .filter(vol => vol.type.toLowerCase().includes('hdd'))
                        .reduce((acc, vol) => acc + vol.size, 0) / 1000)} TB
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Storage Pools</CardTitle>
          </CardHeader>
          <CardContent>
            {volumesLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : storageVolumes.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">No storage pools available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {storageVolumes
                  .filter(volume => volume.serverId === null) // Only show unattached volumes as "pools"
                  .map((volume) => (
                    <div key={volume.id} className="space-y-2">
                      <div className="flex justify-between">
                        <h3 className="text-sm font-medium">{volume.name}</h3>
                        <Badge className="bg-blue-100 text-blue-800">{volume.type}</Badge>
                      </div>
                      <ResourceMeter
                        label=""
                        value={(volume.used / volume.size) * 100}
                        showValue={false}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{volume.used} GB used</span>
                        <span>{Math.round((volume.used / volume.size) * 100)}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Storage Volumes */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Storage Volumes</CardTitle>
        </CardHeader>
        <CardContent>
          {volumesLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading storage volumes...</p>
            </div>
          ) : volumesError ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium mb-2 text-red-600">Error Loading Storage Data</h3>
              <p className="text-muted-foreground mb-4">
                Could not retrieve storage volume information. Please try refreshing.
              </p>
              <Button onClick={refreshStorageData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : storageVolumes.length === 0 ? (
            <div className="text-center py-12">
              <HardDrive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Storage Volumes Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any storage volumes configured.
              </p>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Add Storage Volume
              </Button>
            </div>
          ) : (
            <DataTable
              data={storageVolumes}
              columns={volumesColumns}
            />
          )}
        </CardContent>
      </Card>

      {/* Server Storage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Server Storage Allocation</CardTitle>
        </CardHeader>
        <CardContent>
          {serversLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading servers...</p>
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-12">
              <HardDriveDownload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Servers Found</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any servers to display storage information.
              </p>
              <Button onClick={() => window.location.href = "/servers/new"}>Create Server</Button>
            </div>
          ) : (
            <DataTable
              data={servers}
              columns={serverColumns}
            />
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
