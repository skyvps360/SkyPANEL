import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Monitor, Wifi, WifiOff, Maximize2, Minimize2, RotateCcw } from 'lucide-react';
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
  const [isFullscreen, setIsFullscreen] = useState(false);
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

      console.log('Loading NoVNC library...');

      // Load NoVNC from the installed package
      const script = document.createElement('script');
      script.src = '/node_modules/@novnc/novnc/lib/rfb.js';
      script.type = 'text/javascript';

      script.onload = () => {
        console.log('NoVNC library loaded successfully');
        if ((window as any).RFB) {
          console.log('RFB class is available');
          waitForCanvasAndInitialize();
        } else {
          console.error('RFB class not available after loading');
          setConnectionError('NoVNC library failed to load properly');
        }
      };

      script.onerror = () => {
        console.error('Failed to load NoVNC library');
        setConnectionError('Failed to load NoVNC library');
      };

      document.head.appendChild(script);
    } catch (error) {
      console.error('Error loading NoVNC:', error);
      setConnectionError('Failed to load VNC client');
    }
  };

  const waitForCanvasAndInitialize = () => {
    // Wait for canvas to be rendered in DOM
    const checkCanvas = () => {
      if (canvasRef.current) {
        console.log('Canvas is ready, initializing VNC...');
        initializeVNC();
      } else {
        console.log('Canvas not ready yet, retrying...');
        setTimeout(checkCanvas, 100);
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

      console.log('VNC Connection Details:', {
        protocol,
        host: window.location.host,
        vncHost: host,
        vncPort: port,
        wsUrl,
        hasPassword: !!password,
        canvasElement: canvasRef.current
      });

      // Test WebSocket connection first
      console.log('Testing WebSocket connection to:', wsUrl);
      const testWs = new WebSocket(wsUrl);

      testWs.onopen = () => {
        console.log('WebSocket test connection successful');
        testWs.close();

        // Now create the RFB connection
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
      };

      testWs.onerror = (error) => {
        console.error('WebSocket test connection failed:', error);
        setConnectionError('Failed to connect to VNC proxy server');
        setIsConnecting(false);
      };

      testWs.onclose = (event) => {
        if (event.code !== 1000) { // 1000 is normal closure
          console.error('WebSocket test connection closed unexpectedly:', event.code, event.reason);
          setConnectionError(`WebSocket connection failed (Code: ${event.code})`);
          setIsConnecting(false);
        }
      };

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
    if (rfbRef.current) {
      rfbRef.current.disconnect();
    }
    setTimeout(() => {
      initializeVNC();
    }, 1000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

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
                color: brandColors.primary.foreground
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

            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullscreen}
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
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
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
                  color: brandColors.primary.foreground
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
