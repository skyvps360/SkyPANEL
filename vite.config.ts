import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async ({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '');

  // Helper function to safely load Replit plugins
  const loadReplitPlugins = async () => {
    const plugins = [];

    // Only load Replit plugins in development or when REPL_ID is present
    const isReplitEnvironment = env.REPL_ID !== undefined || mode === 'development';

    if (isReplitEnvironment) {
      try {
        // Load runtime error overlay plugin
        const runtimeErrorOverlay = await import("@replit/vite-plugin-runtime-error-modal").then((m) => m.default);
        plugins.push(runtimeErrorOverlay());
      } catch (error) {
        console.warn("Replit runtime error overlay plugin not available:", error.message);
      }

      try {
        // Load cartographer plugin (only in non-development with REPL_ID)
        if (env.NODE_ENV !== "development" && env.REPL_ID !== undefined) {
          const cartographer = await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer);
          plugins.push(cartographer());
        }
      } catch (error) {
        console.warn("Replit cartographer plugin not available:", error.message);
      }
    }

    return plugins;
  };

  const replitPlugins = await loadReplitPlugins();

  return {
    plugins: [
      react(),
      ...replitPlugins,
    ],
    server: {
      port: parseInt(process.env.VITE_PORT || '3000'),
      strictPort: true,
      host: '0.0.0.0',
      proxy: {
        // Proxy WebSocket requests for VNC to the backend server
        '/vnc-proxy': {
          target: `ws://localhost:${process.env.PORT || '5000'}`,
          ws: true,
          changeOrigin: true,
        },
        // Proxy API requests to the backend server
        '/api': {
          target: `http://localhost:${process.env.PORT || '5000'}`,
          changeOrigin: true,
        },
        // Proxy chat WebSocket requests to the backend server
        '/chat-ws': {
          target: `ws://localhost:${process.env.PORT || '5000'}`,
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
  };
});
