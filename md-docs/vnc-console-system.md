# VNC Console System

## Overview

The VNC Console in SkyPANEL provides secure, browser-based access to a VPS console. It uses a lightweight custom client (noVNC-compatible `RealVNCClient`) on the frontend and a backend WebSocket-to-TCP proxy to relay the RFB protocol to the VirtFusion-managed server.

## Architecture

- Frontend: `client/src/pages/vnc-console/index.tsx`
  - Loads `client/public/novnc/realvnc-client.js` on demand
  - Builds a WebSocket URL to our proxy with host/port query params
  - Passes the VirtFusion-provided VNC password via client options
- Backend Proxy: `server/routes_new.ts`
  - Manual WebSocket routing on the HTTP server: only `/vnc-proxy` is handled by the VNC proxy; other WS routes (e.g., Vite HMR) are left alone
  - Validates query params, connects a TCP socket to the target `host:port`, and relays bytes between the browser WebSocket and the VNC TCP socket
  - Uses TCP keep-alive and avoids aggressive timeouts to allow RFB handshakes to complete
- VirtFusion Integration: `server/virtfusion-api.ts`
  - Endpoints used by the UI to fetch VNC status and credentials
  - Key endpoint per VirtFusion API: `POST /servers/{serverId}/vnc` toggles and returns current status; `GET /servers/{serverId}/vnc` returns current status without toggling

## Data Flow

1. User clicks “Open Console” on `/servers/:id`.
2. Frontend fetches VNC status/credentials via `GET /api/user/servers/:id/vnc?action=status`.
3. If enabled, we navigate to `/vnc-console?host=...&port=...&password=...`.
4. VNC page loads `RealVNCClient` and opens WebSocket to `/vnc-proxy?host=...&port=...`.
5. Backend upgrades WS, dials TCP to the VNC server, and begins bidirectional byte relay.
6. Client performs RFB handshake and authenticates using the provided password.

## Frontend Details

- Page: `client/src/pages/vnc-console/index.tsx`
  - Reads `host`, `port`, `password` from the query string
  - Dynamically injects `client/public/novnc/realvnc-client.js`
  - Instantiates `new window.RFB(canvasEl, '/vnc-proxy?host=...&port=...', { credentials: { password } })`
  - Shows connection state (connecting/connected/error) and provides a reconnect action

- Client library: `client/public/novnc/realvnc-client.js`
  - Opens a WebSocket to our proxy using `ws:` on HTTP and `wss:` on HTTPS
  - Implements the RFB handshake with compatibility for RFB 3.3 and 3.8:
    - Echoes the server’s version string
    - Supports security negotiation in both formats (single 32-bit type and type list)
    - Handles VNC password authentication (DES-based challenge-response)
  - Renders the framebuffer to a canvas and handles basic input/clipboard events

## Backend Proxy Details

- Location: `server/routes_new.ts`
- Manual WS routing:
  - The HTTP server’s `upgrade` event inspects `url.pathname`.
  - If `'/vnc-proxy'`, it runs the VNC upgrade handler; otherwise it either defers (e.g., Vite HMR in dev) or closes.
- Proxy handler:
  - Validates `host` and `port` query params
  - Creates a `net.createConnection({ host, port })`, enables `setKeepAlive(true, 15000)`
  - Forwards bytes between WebSocket and TCP socket in both directions
  - Cleans up both ends on error/close

## Security

- Users must be authenticated to fetch VNC credentials via `/api/user/servers/:id/vnc`.
- Ownership check ensures users can only obtain credentials for their own servers.
- The VNC password is never logged; it is passed only at the moment of client initialization.
- The proxy validates inputs and only opens a TCP connection to the requested host/port; it does not expose arbitrary command execution.

## Endpoints

- `GET /api/user/servers/:id/vnc?action=status`
  - Returns current VNC status/credentials without toggling
  - Uses caching to avoid unnecessary API calls
- `POST /api/servers/:serverId/vnc/enable` (admin-only helper)
- `GET /api/servers/:serverId/vnc` (admin-only helper)

VirtFusion references (from `virtfusions-api.yaml`):

- `POST /servers/{serverId}/vnc` – toggles VNC and returns `{ vnc: { ip, hostname, port, password, enabled } }`
- `GET /servers/{serverId}/vnc` – returns current status/credentials

## Operational Notes

- Development:
  - Vite proxies `/vnc-proxy` to the same backend port; HMR WS is allowed to pass through.
  - Use `http://localhost:3333` by project convention for dev.
- Production:
  - Use `wss://<your-domain>/vnc-proxy` from the client; HTTPS will auto-select `wss`.
  - If behind Cloudflare/NGINX, ensure WS upgrade is allowed for `/vnc-proxy`.

## Troubleshooting

- WebSocket connects then immediately closes:
  - Verify the proxy does not time out the TCP socket. We enable keep-alive and avoid aggressive timeouts.
  - Ensure Cloudflare/edge allows WS upgrades for `/vnc-proxy`.
- Authentication fails:
  - Regenerate VNC credentials by toggling in VirtFusion UI and refetch with `action=status`.
  - Confirm the password is passed to `credentials.password` and not logged.
- Blank canvas or no updates:
  - Confirm the RFB handshake completed and the client proceeded to `server_init`.
  - Some encodings are not implemented; basic raw/copyrect are supported.

## UX Guidance

- From `/servers/:id`, expose only “Open Console”. Avoid toggling VNC in-app (use VirtFusion if needed).
- Show clear connection state and a single “Reconnect” control.

## Files

- Frontend page: `client/src/pages/vnc-console/index.tsx`
- Client library: `client/public/novnc/realvnc-client.js`
- Proxy and routes: `server/routes_new.ts`
- VirtFusion API client: `server/virtfusion-api.ts`
- VirtFusion API reference: `virtfusions-api.yaml`
