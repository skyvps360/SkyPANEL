import { useState, useEffect } from "react";
import {
  Wifi,
  Upload,
  Download,
  Map,
  Loader2,
  BarChart2,
  Gauge,
  Server,
  ArrowRight,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { getBrandColors, getPatternBackgrounds, applyBrandColorVars } from "@/lib/brand-theme";
import { useQuery } from "@tanstack/react-query";

// Interface for brand data from API
interface BrandingData {
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  company_name?: string;
  [key: string]: any; // Allow other properties
}

// Interface for server locations
interface TestServer {
  id: string;
  name: string;
  location: string;
  country: string;
  distance: number; // Distance in km from user
  ping: number; // Estimated ping in ms
}

// Interface for test results
interface TestResult {
  download: number; // Mbps
  upload: number; // Mbps
  ping: number; // ms
  jitter: number; // ms
  timestamp: Date;
  server: TestServer;
}

export default function SpeedTestPage() {
  // Add active tab state to control which tab is shown
  const [activeTab, setActiveTab] = useState<string>("test");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [testRunning, setTestRunning] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [testPhase, setTestPhase] = useState<'idle' | 'ping' | 'download' | 'upload' | 'complete'>('idle');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  
  // Fetch branding information from API
  const { data: brandingData } = useQuery<BrandingData>({
    queryKey: ["/api/settings/branding"],
  });
  
  // iperf3 related states
  const [iperfServer, setIperfServer] = useState<string>("nyc");
  const [iperfTestType, setIperfTestType] = useState<string>("download");
  const [iperfTestRunning, setIperfTestRunning] = useState(false);
  const [iperfTestProgress, setIperfTestProgress] = useState(0);
  const [iperfTestResult, setIperfTestResult] = useState<number | null>(null);

  // Available test servers
  const testServers: TestServer[] = [
    { id: 'ny', name: 'New York', location: 'US East', country: 'United States', distance: 350, ping: 15 },
    { id: 'sf', name: 'San Francisco', location: 'US West', country: 'United States', distance: 2900, ping: 72 },
    { id: 'ams', name: 'Amsterdam', location: 'EU West', country: 'Netherlands', distance: 5900, ping: 88 },
    { id: 'fra', name: 'Frankfurt', location: 'EU Central', country: 'Germany', distance: 6300, ping: 92 },
    { id: 'lon', name: 'London', location: 'EU West', country: 'United Kingdom', distance: 5600, ping: 85 },
    { id: 'sin', name: 'Singapore', location: 'Asia', country: 'Singapore', distance: 15400, ping: 220 },
    { id: 'tok', name: 'Tokyo', location: 'Asia', country: 'Japan', distance: 11000, ping: 170 },
    { id: 'syd', name: 'Sydney', location: 'Oceania', country: 'Australia', distance: 16000, ping: 230 },
    { id: 'sao', name: 'São Paulo', location: 'South America', country: 'Brazil', distance: 7800, ping: 110 },
    { id: 'jnb', name: 'Johannesburg', location: 'Africa', country: 'South Africa', distance: 12800, ping: 190 }
  ];

  // Auto-select closest server
  useEffect(() => {
    const closestServer = [...testServers].sort((a, b) => a.distance - b.distance)[0];
    setSelectedServer(closestServer.id);
  }, []);

  // Start the speed test
  const startTest = () => {
    if (!selectedServer) return;
    
    // Reset previous results
    setTestRunning(true);
    setTestProgress(0);
    setTestPhase('ping');
    setTestResult(null);
    
    // Get the selected server object
    const server = testServers.find(s => s.id === selectedServer);
    if (!server) return;
    
    // Simulate the test with timers
    simulateTest(server);
  };
  
  // Simulate a speed test (in a real app this would make actual network requests)
  const simulateTest = (server: TestServer) => {
    // Simulate ping test (1 second)
    setTimeout(() => {
      setTestProgress(10);
      setTestPhase('download');
      
      // Simulate download test (4 seconds)
      const downloadTimer = setInterval(() => {
        setTestProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 50) {
            clearInterval(downloadTimer);
            setTestPhase('upload');
            
            // Simulate upload test (4 seconds)
            const uploadTimer = setInterval(() => {
              setTestProgress(prev => {
                const newProgress = prev + 5;
                if (newProgress >= 90) {
                  clearInterval(uploadTimer);
                  
                  // Generate final result
                  // In a real app, these would be actual measurements
                  const download = Math.floor(Math.random() * 300) + 400; // 400-700 Mbps
                  const upload = Math.floor(Math.random() * 200) + 200; // 200-400 Mbps
                  const ping = server.ping + (Math.random() * 10 - 5); // Base ping ±5ms
                  const jitter = Math.random() * 3; // 0-3ms
                  
                  const result: TestResult = {
                    download,
                    upload,
                    ping,
                    jitter,
                    timestamp: new Date(),
                    server
                  };
                  
                  setTestResult(result);
                  setTestHistory(prev => [result, ...prev].slice(0, 5));
                  setTestPhase('complete');
                  setTestProgress(100);
                  setTestRunning(false);
                }
                return newProgress;
              });
            }, 200);
          }
          return newProgress;
        });
      }, 200);
    }, 1000);
  };
  
  // Format speed for display
  const formatSpeed = (speed: number): string => {
    if (speed >= 1000) {
      return `${(speed / 1000).toFixed(1)} Gbps`;
    }
    return `${speed.toFixed(1)} Mbps`;
  };
  
  // Get a quality description based on speed
  const getConnectionQuality = (download: number): string => {
    if (download >= 500) return 'Excellent';
    if (download >= 300) return 'Very Good';
    if (download >= 100) return 'Good';
    if (download >= 50) return 'Average';
    if (download >= 25) return 'Poor';
    return 'Very Poor';
  };
  
  // Get a color class based on quality using brand colors
  const getQualityColorClass = (download: number): string => {
    // Use the brandColors instance created below
    if (download >= 500) return `text-[${brandColors.secondary.full}]`;
    if (download >= 300) return `text-[${brandColors.secondary.full}]`;
    if (download >= 100) return `text-[${brandColors.secondary.full}]`;
    if (download >= 50) return `text-[${brandColors.accent.full}]`;
    if (download >= 25) return `text-[${brandColors.accent.dark}]`;
    return 'text-red-500';
  };
  
  // Start the iperf3 test simulation
  const startIperfTest = () => {
    setIperfTestRunning(true);
    setIperfTestProgress(0);
    setIperfTestResult(null);
    
    // Simulate test progress
    const timer = setInterval(() => {
      setIperfTestProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(timer);
          
          // Generate a random result between 1-10 Gbps for download or 500Mbps-5Gbps for upload
          const result = iperfTestType === 'download' 
            ? Math.floor(Math.random() * 9000) + 1000  // 1-10 Gbps (in Mbps)
            : Math.floor(Math.random() * 4500) + 500;  // 500Mbps-5Gbps (in Mbps)
          
          setIperfTestResult(result);
          setIperfTestRunning(false);
        }
        return newProgress;
      });
    }, 50);
  };

  // Generate brand colors from API data
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });
  
  // Apply brand colors as CSS variables to document root
  useEffect(() => {
    if (brandingData) {
      applyBrandColorVars({
        primaryColor: brandingData?.primary_color || '',
        secondaryColor: brandingData?.secondary_color || '',
        accentColor: brandingData?.accent_color || '',
      });
    }
  }, [brandingData]);
  
  return (
    <PublicLayout>
      {/* Hero section with brand color background - matching blog, docs, and status pages */}
      <div 
        style={{ backgroundColor: brandColors.primary.full }} 
        className="relative overflow-hidden w-full"
      >
        {/* Decorative bubbles in the background, matching blog, docs, and status pages */}
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="350" height="350" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="175" cy="175" r="175" fill="white" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 opacity-10 translate-y-1/2 -translate-x-1/4">
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="150" r="150" fill="white" />
          </svg>
        </div>
        <div className="absolute top-1/4 right-1/4 opacity-10">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="40" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-screen-xl mx-auto py-12 px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4 text-white">
              Network Speed Test
            </h1>
            <p className="text-white text-lg opacity-90">
              Test your connection speed to our global server network. Verify download and upload speeds, latency, and overall connection quality.
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
          <TabsList 
            className="mb-6" 
            style={{ 
              '--accent-color': brandColors.primary.light,
              '--brand-tab-active': brandColors.primary.full, 
              '--brand-tab-active-border': brandColors.primary.full 
            } as React.CSSProperties}
          >
            <TabsTrigger 
              value="test" 
              className="data-[state=active]:bg-[var(--brand-tab-active)] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Run Test
            </TabsTrigger>
            <TabsTrigger 
              value="iperf3"
              className="data-[state=active]:bg-[var(--brand-tab-active)] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Iperf3 Test
            </TabsTrigger>
            <TabsTrigger 
              value="results"
              className="data-[state=active]:bg-[var(--brand-tab-active)] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Results
            </TabsTrigger>
            <TabsTrigger 
              value="history"
              className="data-[state=active]:bg-[var(--brand-tab-active)] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              History
            </TabsTrigger>
          </TabsList>
          
          {/* Test tab */}
          <TabsContent value="test" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      <span>Select Test Server</span>
                    </CardTitle>
                    <CardDescription>
                      Choose a server location to run your speed test
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select 
                      value={selectedServer || undefined} 
                      onValueChange={setSelectedServer}
                      disabled={testRunning}
                    >
                      <SelectTrigger style={{ borderColor: brandColors.primary.light }}>
                        <SelectValue placeholder="Select a server location" />
                      </SelectTrigger>
                      <SelectContent 
                        style={{ 
                          "--select-item-highlight": brandColors.primary.light 
                        } as React.CSSProperties}
                      >
                        {testServers.map(server => (
                          <SelectItem 
                            key={server.id} 
                            value={server.id}
                            className={`data-[highlighted]:bg-[var(--brand-primary-light)] data-[highlighted]:text-[var(--brand-primary-dark)]`}
                          >
                            <span className="flex justify-between items-center w-full">
                              <span>{server.name}, {server.country}</span>
                              <Badge 
                                variant="outline" 
                                className="ml-2"
                                style={{ borderColor: brandColors.primary.light }}
                              >
                                {server.ping} ms
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {selectedServer && (
                      <div className="mt-6">
                        <p className="text-sm text-gray-500 mb-2">Server Information</p>
                        <div className="space-y-2">
                          {(() => {
                            const server = testServers.find(s => s.id === selectedServer);
                            if (!server) return null;
                            return (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-sm">Location:</span>
                                  <span className="text-sm font-medium">{server.location}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Distance:</span>
                                  <span className="text-sm font-medium">{server.distance} km</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-sm">Estimated Ping:</span>
                                  <span className="text-sm font-medium">{server.ping} ms</span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter>
                    <Button 
                      onClick={startTest} 
                      disabled={!selectedServer || testRunning}
                      className="w-full"
                      style={{ 
                        backgroundColor: brandColors.primary.full,
                        borderColor: brandColors.primary.full
                      }}
                    >
                      {testRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Running Test...
                        </>
                      ) : (
                        <>Start Speed Test</>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </div>
              
              <div>
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gauge className="h-5 w-5" />
                      <span>Test Progress</span>
                    </CardTitle>
                    <CardDescription>
                      {testPhase === 'idle' && 'Ready to begin testing'}
                      {testPhase === 'ping' && 'Measuring ping and latency...'}
                      {testPhase === 'download' && 'Measuring download speed...'}
                      {testPhase === 'upload' && 'Measuring upload speed...'}
                      {testPhase === 'complete' && 'Test completed'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    {testPhase !== 'idle' && (
                      <div className="mb-6">
                        <div className="flex justify-between mb-2">
                          <span className="text-sm">Progress</span>
                          <span className="text-sm font-medium">{testProgress}%</span>
                        </div>
                        <Progress value={testProgress} className="h-2" />
                      </div>
                    )}
                    
                    {testResult ? (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <Card style={{ background: brandColors.primary.extraLight }}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <Download className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                                <Badge style={{ background: brandColors.primary.full }}>Download</Badge>
                              </div>
                              <div className="text-2xl font-bold">{formatSpeed(testResult.download)}</div>
                            </CardContent>
                          </Card>
                          
                          <Card style={{ background: brandColors.primary.extraLight }}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <Upload className="h-5 w-5" style={{ color: brandColors.secondary.full }} />
                                <Badge style={{ background: brandColors.secondary.full }}>Upload</Badge>
                              </div>
                              <div className="text-2xl font-bold">{formatSpeed(testResult.upload)}</div>
                            </CardContent>
                          </Card>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <Card style={{ background: brandColors.primary.extraLight }}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <Clock className="h-5 w-5" style={{ color: brandColors.accent.full }} />
                                <Badge style={{ background: brandColors.accent.full }}>Ping</Badge>
                              </div>
                              <div className="text-2xl font-bold">{testResult.ping.toFixed(1)} ms</div>
                            </CardContent>
                          </Card>
                          
                          <Card style={{ background: brandColors.primary.extraLight }}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-2">
                                <Wifi className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                                <Badge style={{ backgroundColor: brandColors.primary.full, borderColor: brandColors.primary.full }}>Quality</Badge>
                              </div>
                              <div className={`text-2xl font-bold ${getQualityColorClass(testResult.download)}`}>
                                {getConnectionQuality(testResult.download)}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full">
                        {testPhase === 'idle' ? (
                          <div className="text-center" style={{ color: brandColors.primary.dark }}>
                            <Wifi className="h-20 w-20 mx-auto mb-4 opacity-20" style={{ color: brandColors.primary.full }} />
                            <p>Select a server and click "Start Speed Test" to begin</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            {testPhase === 'ping' && <Clock className="h-20 w-20 mx-auto mb-4 animate-pulse" style={{ color: brandColors.accent.full }} />}
                            {testPhase === 'download' && <Download className="h-20 w-20 mx-auto mb-4 animate-pulse" style={{ color: brandColors.primary.full }} />}
                            {testPhase === 'upload' && <Upload className="h-20 w-20 mx-auto mb-4 animate-pulse" style={{ color: brandColors.secondary.full }} />}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Iperf3 tab */}
          <TabsContent value="iperf3" className="mt-0">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle>Network Speed Test</CardTitle>
                  <CardDescription>
                    Verify our network performance by running an iperf3 speed test from your VPS to our test servers.
                    Our network is optimized for high-throughput and low-latency connections.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* First section - running iperf3 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Run iperf3 from your server</h3>
                    <div className="bg-black text-white p-4 rounded-md font-mono text-sm mb-4 overflow-x-auto">
                      iperf3 -4 -f -m -c nyc.speedtest.is.cc -p 5201 -R
                    </div>
                    <p className="text-sm mb-4" style={{ color: brandColors.primary.dark }}>
                      This command tests download speed from our NYC test server in Mbps. Make sure you have iperf3 installed
                      on your VPS.
                    </p>
                  </div>

                  {/* Second section - installation commands */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">Installation Commands:</h3>
                      <div className="bg-slate-800 text-white p-4 rounded-md font-mono text-sm overflow-x-auto mb-2">
                        <p># Debian/Ubuntu:</p>
                        <p>apt-get update && apt-get install -y iperf3</p>
                      </div>
                      <div className="bg-slate-800 text-white p-4 rounded-md font-mono text-sm overflow-x-auto">
                        <p># CentOS/RHEL:</p>
                        <p>yum install -y iperf3</p>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium mb-4">Test Server:</h3>
                      <ul className="space-y-2">
                        <li className="flex items-start">
                          <span className="text-green-500 mr-2">•</span>
                          <span>nyc.speedtest.is.cc (New York City)</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Third section - interactive demo */}
                  <div>
                    <h3 className="text-xl font-medium mb-6 text-center">Interactive Speed Test Demonstration</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="col-span-1">
                        <Select 
                          value={iperfServer}
                          onValueChange={setIperfServer}
                          disabled={iperfTestRunning}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a test server" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nyc">New York (nyc.speedtest.is.cc)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        <Select 
                          value={iperfTestType}
                          onValueChange={setIperfTestType}
                          disabled={iperfTestRunning}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select test type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="download">Download Speed</SelectItem>
                            <SelectItem value="upload">Upload Speed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1 flex items-center">
                        <Button 
                          className="w-full" 
                          onClick={startIperfTest}
                          disabled={iperfTestRunning}
                          style={{ 
                            backgroundColor: brandColors.primary.full,
                            borderColor: brandColors.primary.full
                          }}
                        >
                          {iperfTestRunning ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Running Test...
                            </>
                          ) : (
                            <>Start Test</>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {iperfTestRunning ? (
                      <div className="py-8">
                        <div className="mb-4">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm">Progress</span>
                            <span className="text-sm font-medium">{iperfTestProgress}%</span>
                          </div>
                          <Progress value={iperfTestProgress} className="h-2" />
                        </div>
                        <div className="text-center text-sm text-gray-500 mt-4">
                          Testing {iperfTestType === 'download' ? 'download' : 'upload'} speed...
                        </div>
                      </div>
                    ) : iperfTestResult ? (
                      <div className="py-8">
                        <Card className="max-w-md mx-auto" style={{ background: brandColors.primary.extraLight }}>
                          <CardContent className="p-6">
                            <div className="flex justify-between items-center mb-4">
                              {iperfTestType === 'download' ? (
                                <Download className="h-6 w-6" style={{ color: brandColors.primary.full }} />
                              ) : (
                                <Upload className="h-6 w-6" style={{ color: brandColors.secondary.full }} />
                              )}
                              <Badge variant="outline" className="text-md">
                                {iperfTestType === 'download' ? 'Download Speed' : 'Upload Speed'}
                              </Badge>
                            </div>
                            <div className="text-4xl font-bold text-center my-6">
                              {formatSpeed(iperfTestResult)}
                            </div>
                            <p className="text-sm text-gray-500 text-center mt-4">
                              Tested with iperf3 from {iperfServer === 'nyc' ? 'New York' : ''} test server
                            </p>
                            <div className="mt-6 text-center">
                              <Button variant="outline" size="sm" onClick={() => setIperfTestResult(null)}>
                                Clear Result
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center py-12">
                        <div className="text-center">
                          <BarChart2 className="h-20 w-20 mx-auto mb-4" style={{ color: brandColors.primary.light }} />
                          <p style={{ color: brandColors.primary.dark }}>Click "Start Test" to run a simulated iperf3 speed test</p>
                          <p className="text-xs mt-2" style={{ color: brandColors.primary.dark }}>This is a visual demonstration. For actual performance testing, please run iperf3 from your VPS.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Results tab */}
          <TabsContent value="results" className="mt-0">
            {testResult ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left column - Results summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Test Results</CardTitle>
                    <CardDescription>
                      {testResult.server.name}, {testResult.server.country} - {new Date(testResult.timestamp).toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Download */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <Download className="h-5 w-5 mr-2" style={{ color: brandColors.primary.full }} />
                            <span className="font-medium">Download</span>
                          </div>
                          <span className="text-2xl font-bold">{formatSpeed(testResult.download)}</span>
                        </div>
                        <Progress value={(testResult.download / 1000) * 100} max={100} className="h-2" />
                      </div>
                      
                      {/* Upload */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <Upload className="h-5 w-5 mr-2" style={{ color: brandColors.secondary.full }} />
                            <span className="font-medium">Upload</span>
                          </div>
                          <span className="text-2xl font-bold">{formatSpeed(testResult.upload)}</span>
                        </div>
                        <Progress value={(testResult.upload / 1000) * 100} max={100} className="h-2" />
                      </div>
                      
                      {/* Ping */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <Clock className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                            <span className="font-medium">Ping</span>
                          </div>
                          <span className="text-2xl font-bold">{testResult.ping.toFixed(1)} ms</span>
                        </div>
                        <Progress 
                          value={100 - (testResult.ping / 300) * 100} 
                          max={100} 
                          className="h-2" 
                        />
                      </div>
                      
                      {/* Jitter */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            <BarChart2 className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                            <span className="font-medium">Jitter</span>
                          </div>
                          <span className="text-2xl font-bold">{testResult.jitter.toFixed(1)} ms</span>
                        </div>
                        <Progress 
                          value={100 - (testResult.jitter / 10) * 100} 
                          max={100} 
                          className="h-2" 
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <div className="w-full">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Connection Quality</span>
                        <Badge 
                          style={{ 
                            backgroundColor: brandColors.primary.full,
                            borderColor: brandColors.primary.full
                          }}
                        >
                          {getConnectionQuality(testResult.download)}
                        </Badge>
                      </div>
                    </div>
                  </CardFooter>
                </Card>
                
                {/* Right column - Server details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Map className="h-5 w-5" style={{ color: brandColors.primary.full }} />
                      Server Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Server Name</span>
                          <span>{testResult.server.name}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Location</span>
                          <span>{testResult.server.location}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Country</span>
                          <span>{testResult.server.country}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b">
                          <span className="font-medium">Distance</span>
                          <span>{testResult.server.distance} km</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="font-medium">Test Date & Time</span>
                          <span>{new Date(testResult.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => startTest()}
                      style={{ 
                        backgroundColor: brandColors.primary.full,
                        borderColor: brandColors.primary.full
                      }}
                    >
                      Run Test Again
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Wifi className="h-20 w-20 mb-4" style={{ color: brandColors.primary.light }} />
                    <h3 className="text-lg font-medium mb-2">No Test Results</h3>
                    <p style={{ color: brandColors.primary.dark }} className="mb-6">You haven't run a speed test yet. Run a test to see your results here.</p>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        // Directly update the active tab state
                        setActiveTab("test");
                      }}
                    >
                      Go to Speed Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          {/* History tab */}
          <TabsContent value="history" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>
                  Your recent speed test results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testHistory.length > 0 ? (
                  <div className="space-y-4">
                    {testHistory.map((result, index) => (
                      <Card key={index} style={{ background: brandColors.primary.extraLight }}>
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <p className="font-medium">{result.server.name}, {result.server.country}</p>
                              <p className="text-sm" style={{ color: brandColors.primary.dark }}>{new Date(result.timestamp).toLocaleString()}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center">
                                <Download className="h-4 w-4 mr-1" style={{ color: brandColors.primary.full }} />
                                <span className="text-sm font-medium">{formatSpeed(result.download)}</span>
                              </div>
                              <ArrowRight className="h-4 w-4" style={{ color: brandColors.primary.medium }} />
                              <div className="flex items-center">
                                <Upload className="h-4 w-4 mr-1" style={{ color: brandColors.secondary.full }} />
                                <span className="text-sm font-medium">{formatSpeed(result.upload)}</span>
                              </div>
                              <ArrowRight className="h-4 w-4" style={{ color: brandColors.primary.medium }} />
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" style={{ color: brandColors.accent.full }} />
                                <span className="text-sm font-medium">{result.ping.toFixed(1)} ms</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p style={{ color: brandColors.primary.dark }}>No test history available yet.</p>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => {
                    // Directly update the active tab state
                    setActiveTab("test");
                  }}
                >
                  Run a New Test
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Card style={{ background: brandColors.primary.extraLight }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4">What do these results mean?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium flex items-center mb-2">
                  <Download className="h-5 w-5 mr-2" style={{ color: brandColors.primary.full }} />
                  Download Speed
                </h3>
                <p className="text-sm" style={{ color: brandColors.primary.dark }}>
                  Download speed measures how quickly data travels from the server to your device. Higher download speeds
                  mean faster web browsing, streaming, and downloading files.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium flex items-center mb-2">
                  <Upload className="h-5 w-5 mr-2" style={{ color: brandColors.secondary.full }} />
                  Upload Speed
                </h3>
                <p className="text-sm" style={{ color: brandColors.primary.dark }}>
                  Upload speed measures how quickly data travels from your device to the server. Higher upload speeds
                  mean faster uploading of files, video conferencing, and cloud backups.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium flex items-center mb-2">
                  <Clock className="h-5 w-5 mr-2" style={{ color: brandColors.accent.full }} />
                  Ping & Jitter
                </h3>
                <p className="text-sm" style={{ color: brandColors.primary.dark }}>
                  Ping measures the time it takes for data to travel to the server and back. Lower ping means better
                  responsiveness. Jitter measures the variation in ping, with lower values providing a more stable connection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}