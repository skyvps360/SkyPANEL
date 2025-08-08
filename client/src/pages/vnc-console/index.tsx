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

  // Fetch brand colors from database with caching
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });


  // Load NoVNC and initialize when parameters are available
  useEffect(() => {
    console.log('VNC Console mounted with params:', { 
      host, 
      port, 
      password: password ? '***' : 'missing',
      serverId 
    });
    
    if (host && port && password) {
      console.log('All VNC parameters present, loading NoVNC...');
      loadNoVNCAndInitialize();
    } else {
      console.error('Missing VNC connection parameters:', { 
        host: host || 'missing', 
        port: port || 'missing', 
        password: password ? 'present' : 'missing' 
      });
      setConnectionError('Missing VNC connection parameters');
    }

    return () => {
      // Cleanup on unmount
      if (rfbRef.current) {
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
      console.log('loadNoVNCAndInitialize called');
      
      // Check if NoVNC is already loaded
      if ((window as any).RFB) {
        console.log('RFB already loaded, initializing...');
        waitForCanvasAndInitialize();
        return;
      }

      console.log('RFB not loaded, loading script...');

      // Set up event listeners first
      const handleNoVNCReady = () => {
        console.log('NoVNC ready event received');
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
      
      script.onload = () => {
        console.log('RealVNC client script loaded successfully');
      };

      script.onerror = () => {
        console.error('Failed to load RealVNC client script from:', script.src);
        window.removeEventListener('novnc-ready', handleNoVNCReady);
        window.removeEventListener('novnc-error', handleNoVNCError);
        setConnectionError('Failed to load RealVNC client script');
      };

      console.log('Appending script to document head...');
      document.head.appendChild(script);

    } catch (error) {
      console.error('Error loading NoVNC:', error);
      setConnectionError('Failed to load NoVNC library: ' + (error as Error).message);
    }
  };

  const waitForCanvasAndInitialize = () => {
    // Wait for canvas to be rendered in DOM with optimized polling
    let attempts = 0;
    const maxAttempts = 30; // 3 seconds max wait (reduced from 5)

    const checkCanvas = () => {
      attempts++;

      if (canvasRef.current) {
        initializeVNC();
      } else if (attempts < maxAttempts) {
        // Use requestAnimationFrame for better performance
        requestAnimationFrame(() => {
          setTimeout(checkCanvas, 100);
        });
      } else {
        console.error('Canvas element not found after maximum attempts');
        setConnectionError('VNC display container not ready');
      }
    };

    // Start checking after a shorter delay
    setTimeout(checkCanvas, 100);
  };

  const initializeVNC = () => {
    console.log('initializeVNC called');

    if (!canvasRef.current) {
      console.error('Canvas ref not available');
      setConnectionError('VNC display container not ready');
      return;
    }

    console.log('Canvas ref available:', canvasRef.current);

    if (!(window as any).RFB) {
      console.error('RFB class not available on window');
      setConnectionError('NoVNC library not loaded');
      return;
    }

    console.log('RFB class available, creating connection...');

    try {
      setIsConnecting(true);
      setConnectionError(null);

      // RealVNCClient expects the URL with host and port as query params
      // It will construct its own WebSocket URL internally
      const vncUrl = `/vnc-proxy?host=${encodeURIComponent(host!)}&port=${port}`;

      console.log('VNC URL:', vncUrl);
      console.log('VNC Password:', password ? '***' : 'missing');
      console.log('VNC Host:', host);
      console.log('VNC Port:', port);

      // Create the RFB (RealVNCClient) connection
      // RealVNCClient constructor: (target, url, options)
      // - target: DOM element to render to
      // - url: URL with host and port params (NOT a WebSocket URL)
      // - options: includes credentials
      try {
        console.log('Creating RealVNCClient...');
        rfbRef.current = new (window as any).RFB(canvasRef.current, vncUrl, {
          credentials: { password: password }
        });

        // Set up event handlers
        rfbRef.current.addEventListener('connect', handleConnect);
        rfbRef.current.addEventListener('disconnect', handleDisconnect);
        rfbRef.current.addEventListener('credentialsrequired', handleCredentialsRequired);
        rfbRef.current.addEventListener('securityfailure', handleSecurityFailure);

        console.log('RealVNCClient created successfully');

      } catch (rfbError) {
        console.error('Error creating RealVNCClient:', rfbError);
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
    console.log('VNC Connected successfully!');
    // Batch state updates for better performance
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionError(null);

    // Use requestAnimationFrame to avoid blocking the main thread
    requestAnimationFrame(() => {
      toast({
        title: "VNC Connected",
        description: "Successfully connected to the server console",
      });
    });
  };

  const handleDisconnect = (e: any) => {
    console.log('VNC Disconnected:', e);
    setIsConnected(false);
    setIsConnecting(false);

    // Add null checks to prevent errors when e or e.detail is null
    if (e && e.detail && e.detail.clean) {
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
    console.error('VNC credentials required - authentication failed');
    setConnectionError('Authentication failed - invalid password');
    setIsConnecting(false);
  };

  const handleSecurityFailure = (e: any) => {
    console.error('VNC security failure:', e);
    // Add null check to prevent errors when e or e.detail is null
    const reason = e && e.detail && e.detail.reason ? e.detail.reason : 'Unknown security failure';
    setConnectionError('Security failure: ' + reason);
    setIsConnecting(false);
  };

  const reconnect = () => {
    setConnectionError(null);
    setIsConnecting(true);
    setIsConnected(false);

    // Clean up existing connection with proper event listener removal
    if (rfbRef.current) {
      try {
        // Remove event listeners before disconnecting to prevent unwanted events
        rfbRef.current.removeEventListener('connect', handleConnect);
        rfbRef.current.removeEventListener('disconnect', handleDisconnect);
        rfbRef.current.removeEventListener('credentialsrequired', handleCredentialsRequired);
        rfbRef.current.removeEventListener('securityfailure', handleSecurityFailure);
        
        rfbRef.current.disconnect();
      } catch (error) {
        console.log('Error during cleanup:', error);
      }
      rfbRef.current = null;
    }

    // Force reload NoVNC library by removing any existing scripts
    const existingScripts = document.querySelectorAll('script[src*="novnc-loader"], script[type="module"]');
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
                {host}:{port}
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
          <div className="w-full h-full bg-black rounded-lg overflow-hidden border relative">
            <div 
              ref={canvasRef} 
              className="w-full h-full min-h-[600px]" 
              id="vnc-canvas-container"
              style={{
                // Optimize canvas rendering
                imageRendering: 'crisp-edges',
                // Disable text selection for better performance
                userSelect: 'none',
                // Optimize for GPU acceleration
                transform: 'translateZ(0)',
                backfaceVisibility: 'hidden',
                perspective: '1000px',
              }}
            />

            {isConnecting && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
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
