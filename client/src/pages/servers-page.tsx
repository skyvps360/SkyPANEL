import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Download, 
  Power, 
  RotateCw, 
  Terminal, 
  HardDrive, 
  Network,
  Trash2,
  ExternalLink 
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { queryClient } from "@/lib/queryClient";

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
}

export default function ServersPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [deleteServerId, setDeleteServerId] = useState<number | null>(null);
  
  // Fetch servers
  const { data: servers = [], isLoading, refetch } = useQuery<Server[]>({
    queryKey: ["/api/servers"],
  });

  // Get OS icon based on operatingSystem field
  const getOsIcon = (os: string) => {
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

  // Get status badge based on server status
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
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

  // Server power control
  const handlePowerAction = async (serverId: number, action: string) => {
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

  // Delete server
  const handleDeleteServer = async () => {
    if (!deleteServerId) return;
    
    try {
      await apiRequest(`/api/servers/${deleteServerId}`, {
        method: "DELETE"
      });
      toast({
        title: "Server deleted",
        description: "Server has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/servers"] });
      setDeleteServerId(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete server",
        variant: "destructive",
      });
    }
  };

  const columns = [
    {
      accessorKey: "name" as keyof Server,
      header: "Server",
      cell: (server: Server) => (
        <div className="flex items-center">
          <i className={`${getOsIcon(server.operatingSystem)} text-gray-400 mr-3 text-lg`}></i>
          <div>
            <div className="text-sm font-medium">{server.name}</div>
            <div className="text-xs text-gray-500">{server.operatingSystem}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status" as keyof Server,
      header: "Status",
      cell: (server: Server) => getStatusBadge(server.status),
    },
    {
      accessorKey: "ipAddress" as keyof Server,
      header: "IP Address",
      cell: (server: Server) => (
        <span className="text-sm text-gray-500">
          {server.ipAddress || "Not assigned"}
        </span>
      ),
    },
    {
      accessorKey: "cpu" as keyof Server,
      header: "CPU",
      cell: (server: Server) => (
        <span className="text-sm">{server.cpu} vCPU</span>
      ),
    },
    {
      accessorKey: "memory" as keyof Server,
      header: "Memory",
      cell: (server: Server) => (
        <span className="text-sm">{(server.memory / 1024).toFixed(0)} GB</span>
      ),
    },
    {
      accessorKey: "storage" as keyof Server,
      header: "Storage",
      cell: (server: Server) => (
        <span className="text-sm">{server.storage} GB</span>
      ),
    },
  ];

  const renderActions = (server: Server) => (
    <>
      <DropdownMenuItem 
        onClick={() => handlePowerAction(server.id, server.status === 'running' ? 'stop' : 'start')}
      >
        <Power className="h-4 w-4 mr-2" />
        {server.status === 'running' ? 'Stop' : 'Start'}
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => handlePowerAction(server.id, 'restart')}
        disabled={server.status !== 'running'}
      >
        <RotateCw className="h-4 w-4 mr-2" />
        Restart
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/servers/${server.id}`)}>
        <ExternalLink className="h-4 w-4 mr-2" />
        View Details
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => navigate(`/servers/${server.id}/console`)}>
        <Terminal className="h-4 w-4 mr-2" />
        Console
      </DropdownMenuItem>
      <DropdownMenuItem 
        className="text-destructive"
        onClick={() => setDeleteServerId(server.id)}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </DropdownMenuItem>
    </>
  );

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Servers</h1>
          <p className="text-gray-500 mt-1">Manage your virtual servers</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button variant="outline" className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button className="flex items-center" onClick={() => navigate("/servers/new")}>
            <Plus className="h-4 w-4 mr-2" />
            New Server
          </Button>
        </div>
      </div>

      {/* Servers Table */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <DataTable 
          data={servers}
          columns={columns}
          onRowClick={(server) => navigate(`/servers/${server.id}`)}
          searchKey="name"
          actions={renderActions}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteServerId} onOpenChange={(open) => !open && setDeleteServerId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete your server and all associated data. 
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
