import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Separator } from "@/components/ui/separator";
import {
  Activity,
  Power,
  Shield,
  Network,
  HardDrive,
  Monitor,
  Settings,
  Calendar,
  User,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ServerLog {
  id: number;
  serverId: number;
  userId: number;
  action: string;
  actionType: 'power' | 'security' | 'network' | 'storage' | 'vnc' | 'config';
  status: 'success' | 'failed' | 'pending';
  details?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  ipAddress?: string;
  queueId?: number;
  errorMessage?: string;
  createdAt: string;
  user: {
    id: number;
    username: string;
    fullName: string;
    email: string;
  };
}

interface ServerLogsResponse {
  logs: ServerLog[];
  totalCount: number;
  hasMore: boolean;
}

interface ServerLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: number;
  serverName?: string;
}

const actionTypeIcons = {
  power: Power,
  security: Shield,
  network: Network,
  storage: HardDrive,
  vnc: Monitor,
  config: Settings,
};

const actionTypeColors = {
  power: "bg-blue-100 text-blue-800",
  security: "bg-red-100 text-red-800",
  network: "bg-green-100 text-green-800",
  storage: "bg-purple-100 text-purple-800",
  vnc: "bg-orange-100 text-orange-800",
  config: "bg-gray-100 text-gray-800",
};

const statusIcons = {
  success: CheckCircle,
  failed: XCircle,
  pending: Clock,
};

const statusColors = {
  success: "text-green-600",
  failed: "text-red-600",
  pending: "text-yellow-600",
};

export function ServerLogsModal({ isOpen, onClose, serverId, serverName }: ServerLogsModalProps) {
  const [actionTypeFilter, setActionTypeFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Reset filters when modal opens
  useEffect(() => {
    if (isOpen) {
      setActionTypeFilter("");
      setStartDate("");
      setEndDate("");
      setOffset(0);
    }
  }, [isOpen]);

  const { data, isLoading, error, refetch } = useQuery<ServerLogsResponse>({
    queryKey: ['/api/user/servers', serverId, 'logs', actionTypeFilter, startDate, endDate, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (actionTypeFilter) {
        params.append('actionType', actionTypeFilter);
      }
      if (startDate) {
        params.append('startDate', startDate);
      }
      if (endDate) {
        params.append('endDate', endDate);
      }

      const response = await fetch(`/api/user/servers/${serverId}/logs?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch server logs');
      }
      return response.json();
    },
    enabled: isOpen && !!serverId,
  });

  const handleClearFilters = () => {
    setActionTypeFilter("");
    setStartDate("");
    setEndDate("");
    setOffset(0);
  };

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Server Activity Logs
            {serverName && <span className="text-muted-foreground">- {serverName}</span>}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Label className="text-sm font-medium">Filters:</Label>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="actionType" className="text-sm">Type:</Label>
            <Select value={actionTypeFilter || "all"} onValueChange={(value) => setActionTypeFilter(value === "all" ? "" : value)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="power">Power</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="network">Network</SelectItem>
                <SelectItem value="storage">Storage</SelectItem>
                <SelectItem value="vnc">VNC</SelectItem>
                <SelectItem value="config">Config</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="startDate" className="text-sm">From:</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="endDate" className="text-sm">To:</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="flex items-center gap-1"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>

        {/* Logs Content */}
        <div className="flex-1 min-h-0 max-h-[400px] overflow-y-auto border rounded-md">
          <div className="p-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading logs...</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-8 text-red-600">
                <AlertCircle className="h-5 w-5 mr-2" />
                Failed to load server logs
              </div>
            ) : !data?.logs?.length ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Activity className="h-5 w-5 mr-2" />
                No activity logs found
              </div>
            ) : (
              <div className="space-y-2">
                {data.logs.map((log, index) => {
                const ActionTypeIcon = actionTypeIcons[log.actionType];
                const StatusIcon = statusIcons[log.status];

                return (
                  <div key={log.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          <ActionTypeIcon className="h-4 w-4" />
                          <Badge className={cn("text-xs", actionTypeColors[log.actionType])}>
                            {log.actionType}
                          </Badge>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{formatActionName(log.action)}</span>
                            <StatusIcon className={cn("h-4 w-4", statusColors[log.status])} />
                          </div>

                          {log.details && (
                            <p className="text-sm text-muted-foreground mb-2">{log.details}</p>
                          )}

                          {log.errorMessage && (
                            <p className="text-sm text-red-600 mb-2">{log.errorMessage}</p>
                          )}

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {log.user.fullName} ({log.user.username})
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                            </div>
                            {log.ipAddress && (
                              <div className="flex items-center gap-1">
                                <Network className="h-3 w-3" />
                                {log.ipAddress}
                              </div>
                            )}
                            {log.queueId && (
                              <div className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                Queue: {log.queueId}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>
        </div>

        {/* Load More Button - Outside ScrollArea */}
        {data?.hasMore && (
          <div className="flex justify-center p-4 border-t">
            <Button
              variant="outline"
              onClick={handleLoadMore}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Load More
            </Button>
          </div>
        )}

        {/* Footer */}
        {data && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Showing {data.logs.length} of {data.totalCount} logs
            </span>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
