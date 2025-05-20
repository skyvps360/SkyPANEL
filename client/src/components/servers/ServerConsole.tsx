import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Terminal, RefreshCcw, AlertTriangle, Loader2 } from "lucide-react";

interface ServerConsoleProps {
  serverId: number;
  serverStatus: string;
}

export function ServerConsole({ serverId, serverStatus }: ServerConsoleProps) {
  const { toast } = useToast();
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("console");

  // Function to get console URL from VirtFusion API
  const fetchConsoleUrl = async () => {
    if (serverStatus !== "running") {
      setError("Server must be running to access the console");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // This would be a real API call in production
      // const response = await fetch(`/api/servers/${serverId}/console`, {
      //   method: 'POST',
      //   credentials: 'include',
      // });
      
      // if (!response.ok) {
      //   throw new Error('Failed to get console access');
      // }
      
      // const data = await response.json();
      // setConsoleUrl(data.consoleUrl);

      // For demo purposes, simulate a console URL
      setTimeout(() => {
        setConsoleUrl(`https://console.example.com/vm/${serverId}?token=demo-token-${Date.now()}`);
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
      
      toast({
        title: "Console Access Error",
        description: err instanceof Error ? err.message : 'Failed to get console access',
        variant: "destructive",
      });
    }
  };

  // Fetch console URL when component mounts or server status changes
  useEffect(() => {
    if (activeTab === "console" && serverStatus === "running") {
      fetchConsoleUrl();
    }
  }, [activeTab, serverStatus]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Terminal className="h-5 w-5 mr-2" />
          Server Console
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="console" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="console">Console</TabsTrigger>
            <TabsTrigger value="logs">Server Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="console" className="h-[500px] bg-muted/30 rounded-md overflow-hidden">
            {serverStatus !== "running" ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <AlertTriangle className="h-16 w-16 text-amber-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Server Not Running</h3>
                <p className="text-muted-foreground text-center mb-4">
                  The server must be running to access the console. Please start the server first.
                </p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Refresh Status
                </Button>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
                <h3 className="text-lg font-medium">Loading Console</h3>
                <p className="text-muted-foreground text-center">
                  Establishing secure connection to your server...
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
                <h3 className="text-lg font-medium mb-2">Console Access Error</h3>
                <p className="text-muted-foreground text-center mb-4">{error}</p>
                <Button onClick={fetchConsoleUrl}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : consoleUrl ? (
              <div className="h-full w-full">
                <Alert className="mb-4">
                  <AlertDescription>
                    For security reasons, this console session will expire after 30 minutes of inactivity.
                  </AlertDescription>
                </Alert>
                <div className="relative h-[400px] w-full">
                  <iframe 
                    src={consoleUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    title="Server Console"
                    sandbox="allow-same-origin allow-scripts allow-forms"
                  ></iframe>
                </div>
                <div className="mt-4 flex justify-between">
                  <Button variant="outline" onClick={fetchConsoleUrl}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Refresh Console
                  </Button>
                  <Button onClick={() => window.open(consoleUrl, '_blank')}>
                    Open in New Window
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6">
                <Terminal className="h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Console Access</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Click the button below to access the server console.
                </p>
                <Button onClick={fetchConsoleUrl}>
                  Access Console
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="logs" className="h-[500px] bg-muted/30 rounded-md">
            <div className="flex flex-col items-center justify-center h-full p-6">
              <Terminal className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Server Logs</h3>
              <p className="text-muted-foreground text-center mb-4">
                Server logs will be displayed here in the full application.
              </p>
              <Button variant="outline" disabled>
                View Logs
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
