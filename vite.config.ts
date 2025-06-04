import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async ({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(env.NODE_ENV !== "production" &&
      env.REPL_ID !== undefined
        ? [
            await import("@replit/vite-plugin-cartographer").then((m) =>
              m.cartographer(),
            ),
          ]
        : []),
    ],
  server: {
    proxy: {
      // Proxy WebSocket requests for VNC to the backend server
      '/vnc-proxy': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
      // Proxy API requests to the backend server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy chat WebSocket requests to the backend server
      '/chat-ws': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  define: {
    // Explicitly define PayPal environment variables for client-side access
    'import.meta.env.VITE_PAYPAL_SANDBOX': JSON.stringify(env.VITE_PAYPAL_SANDBOX),
    'import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID': JSON.stringify(env.VITE_PAYPAL_SANDBOX_CLIENT_ID),
    'import.meta.env.VITE_PAYPAL_SANDBOX_SECRET': JSON.stringify(env.VITE_PAYPAL_SANDBOX_SECRET),
    'import.meta.env.VITE_PAYPAL_CLIENT_ID': JSON.stringify(env.VITE_PAYPAL_CLIENT_ID),
    'import.meta.env.VITE_PAYPAL_SECRET': JSON.stringify(env.VITE_PAYPAL_SECRET),
    'import.meta.env.VITE_PAYPAL_CURRENCY': JSON.stringify(env.VITE_PAYPAL_CURRENCY),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  // Wrangler configuration
  wrangler: {
    account_id: env.CF_ACCOUNT_ID,
    zone_id: env.CF_ZONE_ID,
    route: env.CF_ROUTE,
  },
  };
});
