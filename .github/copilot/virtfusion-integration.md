# SkyPANEL VirtFusion Integration

## Overview

SkyPANEL integrates with VirtFusion to provide comprehensive VPS hosting management capabilities. This integration allows users to manage their virtual servers, monitor resources, and handle billing through a unified interface.

## Core Components

### API Client
The VirtFusion API client handles all communication with the VirtFusion API, managing authentication, request formatting, and response parsing.

### Server Management
Provides functionality for creating, modifying, and managing virtual servers through the VirtFusion API.

### User Integration
Maps SkyPANEL users to VirtFusion users and maintains synchronization between the two systems.

### Billing Integration
Integrates with the Custom Credit System to handle payments and billing for VirtFusion resources.

## API Client Implementation

```typescript
export class VirtFusionAPI {
  private apiUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private axios: AxiosInstance;

  constructor() {
    this.apiUrl = process.env.VIRT_FUSION_API_URL!;
    this.apiKey = process.env.VIRT_FUSION_API_KEY!;
    this.apiSecret = process.env.VIRT_FUSION_API_SECRET!;

    this.axios = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-KEY': this.apiKey,
        'X-API-SECRET': this.apiSecret
      }
    });

    // Add response interceptor for error handling
    this.axios.interceptors.response.use(
      response => response,
      error => this.handleApiError(error)
    );
  }

  private handleApiError(error: any) {
    if (error.response) {
      // Extract error details from VirtFusion response
      const status = error.response.status;
      const data = error.response.data;
      
      console.error(`VirtFusion API Error (${status}):`, data);
      
      // Transform to standardized error format
      throw new VirtFusionApiError(
        data.message || 'Unknown VirtFusion API error',
        status,
        data
      );
    } else if (error.request) {
      console.error('VirtFusion API Request Error:', error.request);
      throw new Error('No response received from VirtFusion API');
    } else {
      console.error('VirtFusion API Error:', error.message);
      throw error;
    }
  }

  // API methods
  async getServers(params?: any): Promise<VirtFusionServer[]> {
    const response = await this.axios.get('/servers', { params });
    return response.data.data;
  }

  async getServer(id: number): Promise<VirtFusionServer> {
    const response = await this.axios.get(`/servers/${id}`);
    return response.data.data;
  }

  async createServer(data: CreateServerParams): Promise<VirtFusionServer> {
    const response = await this.axios.post('/servers', data);
    return response.data.data;
  }

  async startServer(id: number): Promise<any> {
    const response = await this.axios.post(`/servers/${id}/start`);
    return response.data;
  }

  async stopServer(id: number): Promise<any> {
    const response = await this.axios.post(`/servers/${id}/stop`);
    return response.data;
  }

  async rebootServer(id: number): Promise<any> {
    const response = await this.axios.post(`/servers/${id}/reboot`);
    return response.data;
  }

  // Additional methods for other VirtFusion resources
}
```

## Server Management Service

```typescript
export class VirtFusionServerService {
  private api: VirtFusionAPI;
  private db: Database;

  constructor(api: VirtFusionAPI, db: Database) {
    this.api = api;
    this.db = db;
  }

  async getUserServers(userId: string): Promise<ServerWithDetails[]> {
    // Get user's VirtFusion ID from the database
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        virtFusionId: true
      }
    });

    if (!user?.virtFusionId) {
      throw new Error('User not linked to VirtFusion');
    }

    // Get servers from VirtFusion API
    const virtFusionServers = await this.api.getServers({
      user_id: user.virtFusionId
    });

    // Map to our internal server format
    return virtFusionServers.map(server => this.mapVirtFusionServer(server, userId));
  }

  async getServerDetails(serverId: number, userId: string): Promise<ServerWithDetails> {
    // Get server from VirtFusion API
    const virtFusionServer = await this.api.getServer(serverId);
    
    // Check if this server belongs to the user
    await this.validateServerOwnership(serverId, userId);
    
    // Map to our internal server format with extended details
    return this.mapVirtFusionServer(virtFusionServer, userId, true);
  }

  async createServer(userId: string, params: CreateServerParams): Promise<ServerWithDetails> {
    // Get user's VirtFusion ID
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        virtFusionId: true
      }
    });

    if (!user?.virtFusionId) {
      throw new Error('User not linked to VirtFusion');
    }

    // Create server in VirtFusion
    const createParams = {
      ...params,
      user_id: user.virtFusionId
    };
    
    const virtFusionServer = await this.api.createServer(createParams);
    
    // Map to our internal format
    return this.mapVirtFusionServer(virtFusionServer, userId);
  }

  async performServerAction(serverId: number, userId: string, action: 'start' | 'stop' | 'reboot'): Promise<void> {
    // Validate ownership
    await this.validateServerOwnership(serverId, userId);
    
    // Perform the requested action
    switch (action) {
      case 'start':
        await this.api.startServer(serverId);
        break;
      case 'stop':
        await this.api.stopServer(serverId);
        break;
      case 'reboot':
        await this.api.rebootServer(serverId);
        break;
    }
  }

  private async validateServerOwnership(serverId: number, userId: string): Promise<void> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        virtFusionId: true
      }
    });

    if (!user?.virtFusionId) {
      throw new Error('User not linked to VirtFusion');
    }

    const server = await this.api.getServer(serverId);
    
    if (server.user_id !== user.virtFusionId) {
      throw new Error('Server does not belong to user');
    }
  }

  private mapVirtFusionServer(server: VirtFusionServer, userId: string, includeDetails = false): ServerWithDetails {
    // Map VirtFusion server to our internal format
    return {
      id: server.id,
      name: server.hostname,
      status: this.mapServerStatus(server.status),
      ip: server.main_ip,
      location: server.datacenter?.name || 'Unknown',
      plan: server.package?.name || 'Custom',
      resources: {
        cpu: server.package?.cpu || 0,
        memory: server.package?.memory || 0,
        disk: server.package?.disk || 0,
        bandwidth: server.package?.bandwidth || 0
      },
      os: server.template?.name || 'Unknown',
      createdAt: new Date(server.created_at),
      // Include additional details if requested
      ...(includeDetails && {
        additionalIps: server.additional_ips || [],
        bandwidth: {
          used: server.bandwidth_used || 0,
          total: server.package?.bandwidth || 0
        },
        vnc: {
          available: !!server.vnc_url,
          url: server.vnc_url || null
        }
      })
    };
  }

  private mapServerStatus(status: string): ServerStatus {
    switch (status.toLowerCase()) {
      case 'online':
        return 'running';
      case 'offline':
        return 'stopped';
      case 'installing':
        return 'provisioning';
      case 'rebooting':
        return 'rebooting';
      default:
        return 'unknown';
    }
  }
}
```

## API Routes

```typescript
// Server routes
router.get('/api/servers', authMiddleware, async (req, res) => {
  try {
    const serverService = new VirtFusionServerService(new VirtFusionAPI(), db);
    const servers = await serverService.getUserServers(req.user.id);
    res.json({ success: true, data: servers });
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch servers' });
  }
});

router.get('/api/servers/:id', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const serverService = new VirtFusionServerService(new VirtFusionAPI(), db);
    const server = await serverService.getServerDetails(serverId, req.user.id);
    res.json({ success: true, data: server });
  } catch (error) {
    console.error(`Error fetching server ${req.params.id}:`, error);
    
    if (error.message === 'Server does not belong to user') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.status(500).json({ success: false, message: 'Failed to fetch server details' });
  }
});

router.post('/api/servers/:id/action', authMiddleware, async (req, res) => {
  try {
    const serverId = parseInt(req.params.id);
    const { action } = req.body;
    
    if (!['start', 'stop', 'reboot'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    const serverService = new VirtFusionServerService(new VirtFusionAPI(), db);
    await serverService.performServerAction(serverId, req.user.id, action);
    
    res.json({ success: true, message: `Server ${action} initiated` });
  } catch (error) {
    console.error(`Error performing action on server ${req.params.id}:`, error);
    
    if (error.message === 'Server does not belong to user') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    res.status(500).json({ success: false, message: `Failed to ${req.body.action} server` });
  }
});
```

## Frontend Components

### Server List Component

```tsx
export function ServersList() {
  const { data: servers, isLoading, error } = useQuery({
    queryKey: ['servers'],
    queryFn: fetchUserServers
  });

  if (isLoading) return <ServerListSkeleton />;
  
  if (error) return <ErrorDisplay message="Failed to load servers" />;
  
  if (!servers?.length) {
    return <EmptyState message="No servers found" action={{ label: 'Create Server', href: '/servers/new' }} />;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {servers.map(server => (
        <ServerCard key={server.id} server={server} />
      ))}
    </div>
  );
}
```

### Server Detail Component

```tsx
export function ServerDetail({ serverId }: { serverId: number }) {
  const { data: server, isLoading, error } = useQuery({
    queryKey: ['server', serverId],
    queryFn: () => fetchServerDetails(serverId)
  });
  
  const serverAction = useMutation({
    mutationFn: ({ id, action }: { id: number, action: 'start' | 'stop' | 'reboot' }) => 
      performServerAction(id, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server', serverId] });
      toast.success(`Server ${action} initiated`);
    },
    onError: (error) => {
      toast.error(`Failed to ${action} server`);
      console.error('Server action error:', error);
    }
  });

  if (isLoading) return <ServerDetailSkeleton />;
  
  if (error) return <ErrorDisplay message="Failed to load server details" />;
  
  if (!server) return <NotFound message="Server not found" />;

  const handleAction = (action: 'start' | 'stop' | 'reboot') => {
    serverAction.mutate({ id: serverId, action });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{server.name}</h1>
        <ServerStatusBadge status={server.status} />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <ResourcesPanel resources={server.resources} />
        <ServerInfoPanel server={server} />
      </div>
      
      <ServerActionButtons 
        serverId={serverId} 
        status={server.status} 
        onAction={handleAction}
        isLoading={serverAction.isPending}
      />
      
      {server.vnc?.available && (
        <VncConsoleButton serverId={serverId} vncUrl={server.vnc.url} />
      )}
    </div>
  );
}
```
