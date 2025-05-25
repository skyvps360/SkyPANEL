import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Wifi, WifiOff, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getBrandColors } from '@/lib/brand-theme';
// NoVNC will be loaded dynamically

// NoVNC types - using imported RFB class

const VNCConsole: React.FC = () => {
  const { toast } = useToast();

  // Get URL parameters using vanilla JavaScript
  const searchParams = new URLSearchParams(window.location.search);

  const canvasRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Get connection parameters from URL
  const host = searchParams.get('host');
  const port = searchParams.get('port');
  const password = searchParams.get('password');
  const serverId = searchParams.get('serverId');

  // Fetch brand colors from database
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  // Debug: Log connection parameters
  console.log('VNC Console - Connection parameters:', {
    host,
    port,
    password: password ? '***' : null,
    serverId,
    fullUrl: window.location.href
  });

  // Load NoVNC and initialize when parameters are available
  useEffect(() => {
    if (host && port && password) {
      console.log('All VNC parameters available, loading NoVNC...');
      loadNoVNCAndInitialize();
    } else {
      console.error('Missing VNC connection parameters:', { host, port, password: !!password });
      setConnectionError('Missing VNC connection parameters');
    }

    return () => {
      // Cleanup on unmount
      if (rfbRef.current) {
        console.log('Cleaning up VNC connection...');
        try {
          rfbRef.current.disconnect();
        } catch (error) {
          console.error('Error during VNC cleanup:', error);
        }
      }
    };
  }, [host, port, password]);

  const loadNoVNCAndInitialize = async () => {
    try {
      // Check if NoVNC is already loaded
      if ((window as any).RFB) {
        console.log('NoVNC already loaded');
        waitForCanvasAndInitialize();
        return;
      }

      console.log('Loading NoVNC library from local files...');

      // Set up event listeners first
      const handleNoVNCReady = () => {
        console.log('NoVNC RFB module loaded successfully:', typeof (window as any).RFB);
        window.removeEventListener('novnc-ready', handleNoVNCReady);
        window.removeEventListener('novnc-error', handleNoVNCError);
        waitForCanvasAndInitialize();
      };

      const handleNoVNCError = (event: any) => {
        console.error('Failed to load NoVNC:', event.detail?.error);
        window.removeEventListener('novnc-ready', handleNoVNCReady);
        window.removeEventListener('novnc-error', handleNoVNCError);
        setConnectionError('Failed to load NoVNC library from local files');
      };

      window.addEventListener('novnc-ready', handleNoVNCReady);
      window.addEventListener('novnc-error', handleNoVNCError);

      // Load the RealVNC client script
      const script = document.createElement('script');
      script.src = '/novnc/realvnc-client.js';
      script.type = 'text/javascript';

      script.onerror = () => {
        console.error('Failed to load RealVNC client script');
        window.removeEventListener('novnc-ready', handleNoVNCReady);
        window.removeEventListener('novnc-error', handleNoVNCError);
        setConnectionError('Failed to load RealVNC client script');
      };

      document.head.appendChild(script);

    } catch (error) {
      console.error('Error loading NoVNC:', error);
      setConnectionError('Failed to load NoVNC library: ' + (error as Error).message);
    }
  };

  const waitForCanvasAndInitialize = () => {
    // Wait for canvas to be rendered in DOM
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait

    const checkCanvas = () => {
      attempts++;
      console.log(`Checking for canvas element (attempt ${attempts}/${maxAttempts}):`, canvasRef.current);

      if (canvasRef.current) {
        console.log('Canvas is ready, initializing VNC...');
        initializeVNC();
      } else if (attempts < maxAttempts) {
        console.log('Canvas not ready yet, retrying...');
        setTimeout(checkCanvas, 100);
      } else {
        console.error('Canvas element not found after maximum attempts');
        setConnectionError('VNC display container not ready');
      }
    };

    // Start checking after a short delay to ensure DOM is rendered
    setTimeout(checkCanvas, 200);
  };

  const initializeVNC = () => {
    console.log('initializeVNC called');
    console.log('Canvas ref current:', canvasRef.current);
    console.log('Canvas ref element:', document.getElementById('vnc-canvas-container'));

    if (!canvasRef.current) {
      console.error('Canvas ref not available');
      setConnectionError('VNC display container not ready');
      return;
    }

    if (!(window as any).RFB) {
      console.error('RFB class not available on window');
      setConnectionError('NoVNC library not loaded');
      return;
    }

    try {
      console.log('Initializing VNC connection...');
      console.log('RFB class available:', typeof (window as any).RFB, (window as any).RFB);
      setIsConnecting(true);
      setConnectionError(null);

      // Construct WebSocket URL for VNC proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/vnc-proxy?host=${encodeURIComponent(host!)}&port=${port}`;

      console.log('WebSocket URL construction:', {
        windowProtocol: window.location.protocol,
        windowHost: window.location.host,
        protocol,
        finalUrl: wsUrl
      });

      console.log('VNC Connection Details:', {
        protocol,
        host: window.location.host,
        vncHost: host,
        vncPort: port,
        wsUrl,
        hasPassword: !!password,
        canvasElement: canvasRef.current
      });

      // Create the RFB connection directly (no test connection)
      try {
        console.log('Creating RFB connection...');
        rfbRef.current = new (window as any).RFB(canvasRef.current, wsUrl, {
          credentials: { password: password },
          repeaterID: '',
          shared: true,
          wsProtocols: ['binary'],
        });

        // Set up event handlers
        rfbRef.current.addEventListener('connect', handleConnect);
        rfbRef.current.addEventListener('disconnect', handleDisconnect);
        rfbRef.current.addEventListener('credentialsrequired', handleCredentialsRequired);
        rfbRef.current.addEventListener('securityfailure', handleSecurityFailure);

        console.log('RFB connection created successfully');
      } catch (rfbError) {
        console.error('Error creating RFB connection:', rfbError);
        setConnectionError('Failed to create VNC connection: ' + (rfbError as Error).message);
        setIsConnecting(false);
      }

    } catch (error) {
      console.error('Error initializing VNC:', error);
      setConnectionError('Failed to initialize VNC connection: ' + (error as Error).message);
      setIsConnecting(false);
    }
  };

  const handleConnect = () => {
    console.log('VNC connected');
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionError(null);

    toast({
      title: "VNC Connected",
      description: "Successfully connected to the server console",
    });
  };

  const handleDisconnect = (e: any) => {
    console.log('VNC disconnected:', e.detail);
    setIsConnected(false);
    setIsConnecting(false);

    if (e.detail.clean) {
      toast({
        title: "VNC Disconnected",
        description: "Connection closed normally",
      });
    } else {
      setConnectionError('Connection lost unexpectedly');
      toast({
        title: "VNC Connection Lost",
        description: "The connection was lost unexpectedly",
        variant: "destructive",
      });
    }
  };

  const handleCredentialsRequired = () => {
    console.log('VNC credentials required');
    setConnectionError('Authentication failed - invalid password');
    setIsConnecting(false);
  };

  const handleSecurityFailure = (e: any) => {
    console.log('VNC security failure:', e.detail);
    setConnectionError('Security failure: ' + e.detail.reason);
    setIsConnecting(false);
  };

  const reconnect = () => {
    console.log('Reconnect button clicked - forcing NoVNC library reload');
    setConnectionError(null);
    setIsConnecting(true);
    setIsConnected(false);

    // Clean up existing connection
    if (rfbRef.current) {
      try {
        rfbRef.current.disconnect();
      } catch (error) {
        console.log('Error disconnecting:', error);
      }
      rfbRef.current = null;
    }

    // Force reload NoVNC library by removing any existing scripts
    const existingScripts = document.querySelectorAll('script[src*="novnc-loader"], script[type="module"]');
    console.log('Removing existing NoVNC scripts:', existingScripts.length);
    existingScripts.forEach(script => {
      if (script.getAttribute('src')?.includes('novnc-loader') ||
          script.innerHTML.includes('novnc') ||
          script.innerHTML.includes('RFB')) {
        script.remove();
      }
    });

    // Clear the RFB from window object to force reload
    try {
      (window as any).RFB = undefined;
      (window as any).rfb = undefined;
      (window as any).NoVNC = undefined;
    } catch (error) {
      console.log('Error clearing window objects:', error);
    }

    // Restart the connection process after a short delay
    setTimeout(() => {
      loadNoVNCAndInitialize();
    }, 500);
  };



  if (!host || !port || !password) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <WifiOff className="h-5 w-5 mr-2" />
              Connection Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Missing VNC connection parameters. Please close this window and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card p-4" style={{ borderBottomColor: brandColors.primary.light }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Monitor className="h-6 w-6" style={{ color: brandColors.primary.full }} />
            <div>
              <h1 className="text-lg font-semibold">VNC Console</h1>
              <p className="text-sm text-muted-foreground">
                Server {serverId} - {host}:{port}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge
              variant={isConnected ? "default" : "secondary"}
              className="flex items-center space-x-1"
              style={isConnected ? {
                backgroundColor: brandColors.primary.full,
                color: 'white'
              } : {}}
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span>{isConnected ? 'Connected' : isConnecting ? 'Connecting...' : 'Disconnected'}</span>
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={reconnect}
              disabled={isConnecting}
              style={{
                borderColor: brandColors.primary.full,
                color: brandColors.primary.full
              }}
              className="hover:bg-opacity-10"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = brandColors.primary.light;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reconnect
            </Button>
          </div>
        </div>
      </div>

      {/* VNC Canvas Container */}
      <div className="flex-1 p-4">
        {connectionError ? (
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <WifiOff className="h-5 w-5 mr-2" />
                Connection Failed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{connectionError}</p>
              <Button
                onClick={reconnect}
                className="w-full"
                style={{
                  backgroundColor: brandColors.primary.full,
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primary.dark;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = brandColors.primary.full;
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full h-full bg-black rounded-lg overflow-hidden border">
            <div ref={canvasRef} className="w-full h-full min-h-[600px]" id="vnc-canvas-container" />

            {isConnecting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="bg-card p-6 rounded-lg text-center">
                  <div
                    className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
                    style={{ borderBottomColor: brandColors.primary.full }}
                  ></div>
                  <p className="text-sm text-muted-foreground">Connecting to VNC server...</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VNCConsole;
