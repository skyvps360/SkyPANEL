# Server Management System Documentation

## Overview

The SkyPANEL Server Management System provides a comprehensive interface for creating, managing, and monitoring virtual servers. It integrates with VirtFusion API to provision and control virtual machines, offering users a seamless experience for managing their cloud infrastructure.

## Architecture

The server management system consists of several components:

1. **Frontend Components**:
   - Server listing and details pages
   - Server creation wizard
   - Server monitoring dashboard
   - VNC console integration
   - Server action controls (start, stop, restart, etc.)

2. **Backend Services**:
   - VirtFusion API integration (virtfusion-api.ts)
   - VirtFusion service (virtfusion-service.ts)
   - Server management routes
   - Monitoring and metrics collection

3. **External Integrations**:
   - VirtFusion API for server provisioning and management
   - NoVNC for browser-based console access

## Server Management Flow

### Server Creation

1. User selects "Create Server" from the servers page
2. User selects a server package, location, and operating system
3. User provides server name and optional configuration
4. Frontend sends creation request to `/api/servers/create` endpoint
5. Backend validates the request and forwards it to VirtFusion API
6. VirtFusion provisions the server and returns server details
7. Server is added to the user's account and displayed in the UI
8. User receives notification when server is ready

### Server Management

1. User views their servers on the servers page
2. User can select a server to view detailed information
3. Server details page shows:
   - Server status (running, stopped, etc.)
   - Resource usage (CPU, memory, disk, network)
   - IP addresses and networking information
   - Operating system details
   - Server actions (start, stop, restart, etc.)

### Server Actions

1. **Start Server**:
   - User clicks "Start" button
   - Request sent to `/api/servers/{id}/start` endpoint
   - Backend forwards request to VirtFusion API
   - Server status is updated in real-time

2. **Stop Server**:
   - User clicks "Stop" button
   - Request sent to `/api/servers/{id}/stop` endpoint
   - Backend forwards request to VirtFusion API
   - Server status is updated in real-time

3. **Restart Server**:
   - User clicks "Restart" button
   - Request sent to `/api/servers/{id}/restart` endpoint
   - Backend forwards request to VirtFusion API
   - Server status is updated in real-time

4. **Reinstall OS**:
   - User selects "Reinstall OS" option
   - User confirms action and selects OS
   - Request sent to `/api/servers/{id}/reinstall` endpoint
   - Backend forwards request to VirtFusion API
   - Server is reinstalled with selected OS

### VNC Console Access

1. User clicks "Console" button on server details page
2. Frontend requests console access token from `/api/servers/{id}/console` endpoint
3. Backend obtains VNC connection details from VirtFusion API
4. Frontend initializes NoVNC client with connection details
5. User interacts with server console directly in the browser

## Implementation Details

### Frontend Components

#### Server List Component (client/src/pages/servers-page.tsx)

This component displays a list of the user's servers with basic information and status indicators.

```typescript
// Simplified example
const UserServersPage: React.FC = () => {
  const { data: servers, isLoading } = useQuery(['servers'], fetchServers);

  return (
    <div>
      <h1>My Servers</h1>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4">
          {servers.map(server => (
            <ServerCard key={server.id} server={server} />
          ))}
        </div>
      )}
      <Button onClick={handleCreateServer}>Create Server</Button>
    </div>
  );
};
```

#### Server Detail Component (client/src/pages/server-detail-page.tsx)

This component displays detailed information about a specific server and provides action buttons.

#### VNC Console Component (client/src/pages/vnc-console.tsx)

This component integrates NoVNC to provide browser-based console access to servers.

### Backend Services

#### VirtFusion API Service (server/virtfusion-api.ts)

This service handles communication with the VirtFusion API for server management operations.

Key functions:
- `getServers(userId)`: Retrieves servers for a specific user
- `getServerDetails(serverId)`: Gets detailed information about a server
- `createServer(serverData)`: Creates a new virtual server
- `startServer(serverId)`: Starts a server
- `stopServer(serverId)`: Stops a server
- `restartServer(serverId)`: Restarts a server
- `reinstallServer(serverId, osId)`: Reinstalls a server with a new OS
- `getConsoleUrl(serverId)`: Gets VNC console access details

#### VirtFusion Service (server/virtfusion-service.ts)

This service provides higher-level functionality built on top of the VirtFusion API service.

Key functions:
- `syncUserServers(userId)`: Synchronizes server data between VirtFusion and SkyPANEL
- `processServerCreation(userData, packageId)`: Handles the server creation process
- `monitorServerStatus(serverId)`: Monitors server status changes
- `collectServerMetrics(serverId)`: Collects performance metrics from servers

## Server Monitoring

The server management system includes real-time monitoring of server resources and status:

1. **Resource Monitoring**:
   - CPU usage tracking
   - Memory utilization
   - Disk space and I/O
   - Network traffic

2. **Status Monitoring**:
   - Server power state (running, stopped, etc.)
   - Service health checks
   - Uptime tracking
   - Event logging

3. **Alerting**:
   - Resource threshold alerts
   - Status change notifications
   - Scheduled maintenance notifications

## Security Considerations

1. **Access Control**: Server management actions are restricted to the server owner and administrators
2. **API Authentication**: All requests to VirtFusion API use secure authentication
3. **Console Security**: VNC console access is secured with temporary tokens
4. **Action Validation**: All server actions are validated before execution
5. **Audit Logging**: All server management actions are logged for security and troubleshooting

## Configuration

Server management configuration is stored in environment variables:

```
# VirtFusion API Integration
VIRTFUSION_API_URL="https://vdc.example.com/api/v1"
VIRTFUSION_API_TOKEN="your-virtfusion-token"
```

## Troubleshooting

### Common Issues

1. **Server Creation Failures**:
   - Check VirtFusion API connectivity
   - Verify resource availability in the selected location
   - Check user quota and billing status
   - Review VirtFusion API logs for detailed error messages

2. **Server Action Failures**:
   - Verify server status before attempting actions
   - Check VirtFusion API connectivity
   - Ensure the action is valid for the current server state
   - Review action logs for detailed error information

3. **VNC Console Issues**:
   - Check browser compatibility (WebSocket support required)
   - Verify network connectivity to VNC proxy
   - Ensure server is running before accessing console
   - Check for browser extensions that might block WebSockets

## API Reference

### Server Management Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/servers` | GET | Gets user's servers | None | `{ servers: Server[] }` |
| `/api/servers/{id}` | GET | Gets server details | None | `{ server: ServerDetails }` |
| `/api/servers/create` | POST | Creates a new server | `{ package, location, os, name }` | `{ server, message }` |
| `/api/servers/{id}/start` | POST | Starts a server | None | `{ success, message }` |
| `/api/servers/{id}/stop` | POST | Stops a server | None | `{ success, message }` |
| `/api/servers/{id}/restart` | POST | Restarts a server | None | `{ success, message }` |
| `/api/servers/{id}/reinstall` | POST | Reinstalls server OS | `{ osId }` | `{ success, message }` |
| `/api/servers/{id}/console` | GET | Gets console access | None | `{ url, token }` |
| `/api/servers/{id}/metrics` | GET | Gets server metrics | None | `{ metrics }` |

## Data Models

### Server Object

```typescript
interface Server {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'suspended' | 'provisioning' | 'error';
  package: {
    id: string;
    name: string;
    cpu: number;
    memory: number;
    storage: number;
  };
  location: {
    id: string;
    name: string;
    country: string;
  };
  ipAddresses: {
    primary: string;
    additional: string[];
  };
  os: {
    id: string;
    name: string;
    version: string;
    type: 'linux' | 'windows';
  };
  createdAt: string;
  lastStartedAt: string;
}
```

### Server Metrics Object

```typescript
interface ServerMetrics {
  cpu: {
    usage: number; // Percentage
    cores: number;
  };
  memory: {
    total: number; // MB
    used: number; // MB
    percentage: number;
  };
  disk: {
    total: number; // GB
    used: number; // GB
    percentage: number;
    read: number; // IOPS
    write: number; // IOPS
  };
  network: {
    inbound: number; // Mbps
    outbound: number; // Mbps
    packets: {
      in: number;
      out: number;
    };
  };
  uptime: number; // Seconds
}
```

## Integration with Other Systems

The server management system integrates with several other SkyPANEL components:

1. **Billing System**: Server usage is tracked for billing purposes
2. **Notification System**: Server events trigger notifications
3. **Support System**: Server issues can be reported through support tickets
4. **DNS Management**: DNS records can be created for server IP addresses