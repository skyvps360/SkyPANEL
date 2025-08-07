# VNC Console System

## Overview

The VNC Console in SkyPANEL provides users with direct, web-based access to their VPS servers' consoles. It integrates noVNC for browser-based VNC connectivity, with a backend proxy for secure connections to VirtFusion-managed servers.

### Key Features
- **Web-Based Access**: No need for external VNC clients
- **Secure Proxy**: Backend WebSocket proxy for connections
- **Real-Time Status**: Connection state monitoring and error handling
- **Brand Integration**: Custom theming using brand colors
- **Auto-Reconnect**: Automatic reconnection attempts
- **Mobile Responsive**: Works on desktop and mobile devices

## Architecture

### Components
1. **Frontend (client/src/pages/vnc-console/index.tsx)**:
   - React component for VNC display
   - Uses noVNC library dynamically loaded
   - Handles connection states and UI updates
   - Integrates with brand theme for styling

2. **Backend Proxy (server/routes_new.ts)**:
   - WebSocket proxy endpoint (/vnc-proxy)
   - Authenticates requests
   - Establishes connection to actual VNC server
   - Handles data relay between client and server

3. **VirtFusion Integration**:
   - Retrieves VNC connection details (host, port, password)
   - Uses VirtFusion API for console access credentials

### Data Flow
1. User navigates to /vnc-console with server parameters
2. Frontend loads noVNC library
3. Establishes WebSocket connection to backend proxy
4. Backend verifies auth and connects to VNC server
5. Bidirectional data relay for VNC protocol
6. Frontend renders VNC display in canvas

## Implementation Details

### Frontend Implementation
The VNCConsole component handles:
- Dynamic noVNC loading
- WebSocket connection management
- Event handlers for connect/disconnect
- Credential management
- Error handling and retries
- UI states (connecting, connected, error)

Key Code Snippets:

```typescript
// Connection Initialization
rfbRef.current = new (window as any).RFB(canvasRef.current, wsUrl, {
  credentials: { password: password },
  repeaterID: '',
  shared: true,
  wsProtocols: ['binary'],
});
```

### Backend Proxy
The proxy handles:
- WebSocket upgrades
- Authentication checks
- TCP socket to VNC server
- Data piping between sockets
- Connection cleanup

### Security
- Password protected connections
- Authenticated proxy access
- Secure WebSocket (wss)
- Connection timeouts

## Usage Guide

### Accessing VNC
1. From server details page, click 'Console'
2. System retrieves connection params from VirtFusion
3. Redirects to /vnc-console with encrypted params
4. Automatic connection attempt
5. Use keyboard/mouse in canvas area

### Troubleshooting
- **Connection Failed**: Check server status in VirtFusion
- **Blank Screen**: Ensure server is powered on
- **Credentials Error**: Verify password in VirtFusion
- **Proxy Issues**: Check backend logs for connection errors

## Configuration
- NoVNC library in public/novnc/
- Proxy endpoint: /vnc-proxy
- VirtFusion API for params retrieval

For detailed API integration, see virtfusion-integration.md"