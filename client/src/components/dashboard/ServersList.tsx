import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  Power,
  RotateCw,
  Terminal,
  MoreHorizontal,
  ExternalLink,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";

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

export function ServersList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Fetch servers
  const {
    data: servers = [],
    isLoading,
    refetch,
  } = useQuery<Server[]>({
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
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Running
          </Badge>
        );
      case "stopped":
        return (
          <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
            Stopped
          </Badge>
        );
      case "restarting":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            Restarting
          </Badge>
        );
      case "creating":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            Creating
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            Failed
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Server power control
  const handlePowerAction = async (serverId: number, action: string) => {
    try {
      await apiRequest(`/api/servers/${serverId}/power/${action}`, {
        method: "POST",
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

  const columns = [
    {
      accessorKey: "name" as keyof Server,
      header: "Server",
      cell: (server: Server) => (
        <div className="flex items-center">
          <i
            className={`${getOsIcon(server.operatingSystem)} text-gray-400 mr-3 text-lg`}
          ></i>
          <div>
            <div className="text-sm font-medium">{server.name}</div>
            <div className="text-xs text-gray-500">
              {server.operatingSystem}
            </div>
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
      {/* Use the VirtFusion panel for full server management via SSO */}
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation(); // Prevent row click event
          // Dispatch a custom event to trigger the SSO flow with server ID
          const event = new CustomEvent("virtfusion-sso", {
            detail: { serverId: server.id },
          });
          document.dispatchEvent(event);
        }}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        Manage in VirtFusion
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handlePowerAction(
            server.id,
            server.status === "running" ? "stop" : "start",
          );
        }}
      >
        <Power className="h-4 w-4 mr-2" />
        {server.status === "running" ? "Stop" : "Start"}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          handlePowerAction(server.id, "restart");
        }}
      >
        <RotateCw className="h-4 w-4 mr-2" />
        Restart
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/servers/${server.id}/console`);
        }}
      >
        <Terminal className="h-4 w-4 mr-2" />
        Console
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Recent Servers</h2>
        <Link href="/servers">
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </Link>
      </div>
      <DataTable
        data={servers}
        columns={columns}
        onRowClick={(server) => navigate(`/servers/${server.id}`)}
        actions={renderActions}
      />
    </div>
  );
}

export default ServersList;
