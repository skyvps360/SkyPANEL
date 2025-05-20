import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Clock, Cpu, MemoryStick, HardDrive, Network, Server as ServerIcon } from "lucide-react";
import { format } from "date-fns";

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
  virtFusionId?: number;
  stats?: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkUsage: number;
  };
  virtFusionData?: any;
}

interface ServerDetailsProps {
  server: Server;
}

export function ServerDetails({ server }: ServerDetailsProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  // Generate extra details from VirtFusion data if available
  const extraDetails = server.virtFusionData 
    ? Object.entries(server.virtFusionData)
          .filter(([key]) => !['id', 'name', 'status', 'primaryIp', 'operatingSystem', 'cpu', 'memory', 'storage'].includes(key))
          .slice(0, 6) // Limit to avoid information overload
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Server Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Basic Information</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <ServerIcon className="h-5 w-5 mr-2 mt-0.5 text-primary" />
                  <div>
                    <div className="font-medium">{server.name}</div>
                    <div className="text-sm text-muted-foreground">ID: {server.virtFusionId || server.id}</div>
                  </div>
                </div>
                
                <div className="flex">
                  <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Created: {formatDate(server.createdAt)}</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="w-7 h-5 mr-2 flex items-center">
                    <i className={getOsIcon(server.operatingSystem)} style={{ fontSize: '1.25rem' }}></i>
                  </div>
                  <div className="text-sm">{server.operatingSystem}</div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Status</h3>
              <div className="px-4 py-3 rounded-md bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Current State</span>
                  {getStatusBadge(server.status)}
                </div>
              </div>
            </div>
          </div>
          
          {/* Hardware Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Hardware Configuration</h3>
              <div className="space-y-3">
                <div className="flex">
                  <Cpu className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">CPU</div>
                    <div className="text-sm text-muted-foreground">{server.cpu} vCPU Cores</div>
                  </div>
                </div>
                
                <div className="flex">
                  <MemoryStick className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">MemoryStick</div>
                    <div className="text-sm text-muted-foreground">{(server.memory / 1024).toFixed(0)} GB RAM</div>
                  </div>
                </div>
                
                <div className="flex">
                  <HardDrive className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Storage</div>
                    <div className="text-sm text-muted-foreground">{server.storage} GB</div>
                  </div>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Network</h3>
              <div className="space-y-3">
                <div className="flex">
                  <Network className="h-5 w-5 mr-2 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Primary IP</div>
                    <div className="text-sm text-muted-foreground">
                      {server.ipAddress || "Not assigned"}
                    </div>
                  </div>
                </div>
                
                {server.virtFusionData?.networkInterfaces && (
                  <div className="flex mt-2">
                    <Network className="h-5 w-5 mr-2 text-muted-foreground" />
                    <div>
                      <div className="font-medium">Interfaces</div>
                      <div className="text-sm text-muted-foreground">
                        {server.virtFusionData.networkInterfaces.length} configured
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Additional Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Additional Information</h3>
              <div className="space-y-2">
                {extraDetails.length > 0 ? (
                  extraDetails.map(([key, value]) => {
                    if (typeof value === 'object') return null;
                    return (
                      <div key={key} className="flex justify-between">
                        <span className="text-sm capitalize">{formatKeyName(key)}:</span>
                        <span className="text-sm font-medium">
                          {typeof value === 'boolean' 
                            ? (value ? 'Yes' : 'No') 
                            : String(value)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No additional information available.
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Pricing Information</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">CPU Cost:</span>
                  <span className="text-sm font-medium">${(server.cpu * 5).toFixed(2)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">MemoryStick Cost:</span>
                  <span className="text-sm font-medium">${((server.memory / 1024) * 10).toFixed(2)}/month</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Storage Cost:</span>
                  <span className="text-sm font-medium">${(server.storage * 0.1).toFixed(2)}/month</span>
                </div>
                <Separator className="my-1" />
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Total:</span>
                  <span className="text-sm font-medium">
                    ${((server.cpu * 5) + ((server.memory / 1024) * 10) + (server.storage * 0.1)).toFixed(2)}/month
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getStatusBadge(status: string) {
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
}

function getOsIcon(os: string = "") {
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
}

function formatKeyName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .replace(/Id$/, 'ID') // Replace "Id" with "ID"
    .replace(/Ip$/, 'IP'); // Replace "Ip" with "IP"
}
