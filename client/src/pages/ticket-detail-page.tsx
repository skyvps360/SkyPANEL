import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MessageList } from "@/components/tickets/MessageList";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { getBrandColors } from "@/lib/brand-theme";
import { 
  ArrowLeft, 
  Send, 
  Check, 
  AlertCircle, 
  Download, 
  RefreshCw, 
  Server, 
  Network, 
  Cpu,
  Wifi,
  WifiOff,
  ExternalLink,
  Coins
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface VpsServer {
  id: number;
  name: string;
  hostname: string;
  ip: string;
  status: string;
  isNat: boolean;
  hypervisorId: number | null;
  allIps?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type?: 'ipv4' | 'ipv6';
  }>;
  ipv4s?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type: 'ipv4';
  }>;
  ipv6s?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type: 'ipv6';
  }>;
  network?: {
    name: string;
    mac: string;
    isNat: boolean;
    enabled: boolean;
  };
  os?: string;
  package?: string;
}

interface Ticket {
  id: number;
  userId: number;
  departmentId: number;
  subject: string;
  status: string;
  priority: string;
  vpsId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  requiresVps: boolean;
  displayOrder: number;
}

interface Balance {
  credits: number;
  virtFusionCredits: number;
  virtFusionTokens: number;
}

interface TicketDetailResponse {
  ticket: Ticket;
  messages: TicketMessage[];
  server?: VpsServer;
  department?: Department;
}

export default function TicketDetailPage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/tickets/:id');
  const { toast } = useToast();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  
  // State for brand colors
  const [brandColors, setBrandColors] = useState<{
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  }>({
    primaryColor: "2563eb", // Default blue
    secondaryColor: "10b981", // Default green
    accentColor: "f59e0b" // Default amber
  });
  const [brandColorLoaded, setBrandColorLoaded] = useState<boolean>(false);
  
  // Fetch brand colors on component mount
  useEffect(() => {
    async function fetchBrandingSettings() {
      try {
        const response = await apiRequest('/api/settings/branding');
        if (response) {
          const colors = {
            primaryColor: (response.primary_color || response.company_color || "2563eb").replace('#', ''),
            secondaryColor: (response.secondary_color || "10b981").replace('#', ''),
            accentColor: (response.accent_color || "f59e0b").replace('#', '')
          };
          setBrandColors(colors);
        }
        setBrandColorLoaded(true);
      } catch (error) {
        console.error('Failed to load branding settings:', error);
        setBrandColorLoaded(true); // Continue even if settings fail to load
      }
    }
    
    fetchBrandingSettings();
  }, []);
  
  // Helper functions for styling with brand colors
  const colors = getBrandColors(brandColors);

  // Helper for status badge styling
  const getStatusBadgeStyle = (status: string) => {
    if (status === 'open') {
      return {
        backgroundColor: colors.accent.light,
        color: colors.accent.dark,
        borderColor: colors.accent.border
      };
    } else if (status === 'closed') {
      return {
        backgroundColor: colors.secondary.light,
        color: colors.secondary.dark,
        borderColor: colors.secondary.border
      };
    } else if (status === 'pending') {
      return {
        backgroundColor: colors.primary.light,
        color: colors.primary.dark,
        borderColor: colors.primary.border
      };
    }
    return {};
  };
  
  // Helper for priority badge styling
  const getPriorityBadgeStyle = (priority: string) => {
    if (priority === 'high') {
      return {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        color: 'rgb(185, 28, 28)',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      };
    } else if (priority === 'medium') {
      return {
        backgroundColor: colors.accent.light,
        color: colors.accent.dark,
        borderColor: colors.accent.border
      };
    } else {
      return {
        backgroundColor: colors.secondary.light,
        color: colors.secondary.dark,
        borderColor: colors.secondary.border
      };
    }
  };

  // Helper for server info card styling
  const getServerCardStyle = () => {
    return {
      borderBottom: `1px solid ${colors.primary.border}`,
      backgroundColor: colors.primary.extraLight
    };
  };

  // Helper for server header icon styling
  const getServerIconStyle = () => {
    return { color: colors.primary.full };
  };

  // Helper for network status badge styling
  const getNetworkStatusStyle = (isActive: boolean) => {
    return {
      borderColor: isActive ? colors.secondary.border : 'rgba(239, 68, 68, 0.3)',
      color: isActive ? colors.secondary.dark : 'rgb(185, 28, 28)'
    };
  };

  const ticketId = params?.id ? parseInt(params.id) : 0;

  // Fetch account balance for VirtFusion credits and custom credits
  const { data: balance } = useQuery<Balance>({
    queryKey: ['/api/billing/balance'],
    retry: 1,
  });



  // Fetch ticket details
  const { 
    data, 
    isLoading, 
    error,
    refetch
  } = useQuery<TicketDetailResponse>({
    queryKey: [`/api/tickets/${ticketId}`],
    enabled: !!ticketId,
  });

  // Add message mutation
  const addMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return await apiRequest(`/api/tickets/${ticketId}/messages`, {
        method: "POST", 
        body: { message }
      });
    },
    onSuccess: () => {
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
      setMessage("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error sending message",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Close ticket mutation
  const closeTicketMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tickets/${ticketId}/close`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket closed",
        description: "The ticket has been closed successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error closing ticket",
        description: error.message || "Failed to close ticket",
        variant: "destructive",
      });
    },
  });
  
  // Reopen ticket mutation
  const reopenTicketMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/tickets/${ticketId}/reopen`, {
        method: "POST"
      });
    },
    onSuccess: () => {
      toast({
        title: "Ticket reopened",
        description: "The ticket has been reopened successfully",
      });
      refetch();
      queryClient.invalidateQueries({ queryKey: ["/api/tickets"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error reopening ticket",
        description: error.message || "Failed to reopen ticket",
        variant: "destructive",
      });
    },
  });

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Ticket not found or you don't have access",
        variant: "destructive",
      });
      navigate("/tickets");
    }
  }, [error, navigate, toast]);

  // Handle message submission
  const handleSendMessage = () => {
    if (!message.trim()) return;
    addMessageMutation.mutate(message);
  };

  // Get badge for ticket status
  const getStatusBadge = (status: string) => {
    const primaryColor = brandColors.primaryColor;
    
    let opacity = 0.2;
    switch (status?.toLowerCase()) {
      case "open":
        opacity = 0.2;
        return (
          <Badge 
            style={{ 
              backgroundColor: hexToRgba(primaryColor, opacity),
              color: hexToRgba(primaryColor, 0.9)
            }}
          >
            Open
          </Badge>
        );
      case "in-progress":
        opacity = 0.15;
        return (
          <Badge 
            style={{ 
              backgroundColor: hexToRgba(primaryColor, opacity),
              color: hexToRgba(primaryColor, 0.9)
            }}
          >
            In Progress
          </Badge>
        );
      case "closed":
        return (
          <Badge 
            style={{ 
              backgroundColor: hexToRgba(primaryColor, 0.1),
              color: hexToRgba(primaryColor, 0.7)
            }}
          >
            Closed
          </Badge>
        );
      default:
        return (
          <Badge 
            style={{ 
              backgroundColor: hexToRgba(primaryColor, 0.15),
              color: hexToRgba(primaryColor, 0.9)
            }}
          >
            {status}
          </Badge>
        );
    }
  };

  // Helper function to convert hex to rgba string with opacity
  const hexToRgba = (hexColor: string, opacity: number = 1) => {
    const r = parseInt(hexColor.slice(0,2), 16);
    const g = parseInt(hexColor.slice(2,4), 16);
    const b = parseInt(hexColor.slice(4,6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  };
  
  // Helper function to create a consistent style for containers
  const getContainerStyle = (opacity = 0.05) => {
    return {
      borderBottom: `1px solid ${hexToRgba(brandColors.primaryColor, 0.1)}`,
      backgroundColor: hexToRgba(brandColors.primaryColor, opacity)
    };
  };

  // Get badge for ticket priority
  const getPriorityBadge = (priority: string) => {
    // Use different colors based on priority
    const primaryColor = brandColors.primaryColor;
    const secondaryColor = brandColors.secondaryColor;
    const accentColor = brandColors.accentColor;
    
    let opacity = 0.15;
    let colorHex: string;
    
    switch (priority?.toLowerCase()) {
      case "low":
        // Use secondary color (green) for low priority
        colorHex = secondaryColor;
        opacity = 0.1;
        break;
      case "medium":
        // Use primary color (blue) for medium priority
        colorHex = primaryColor;
        opacity = 0.15;
        break;
      case "high":
        // Use accent color (amber/orange) for high priority
        colorHex = accentColor;
        opacity = 0.2;
        break;
      default:
        // Default to primary color
        colorHex = primaryColor;
        opacity = 0.15;
        break;
    }
    
    return (
      <Badge 
        style={{ 
          backgroundColor: hexToRgba(colorHex, opacity),
          color: hexToRgba(colorHex, 0.9)
        }}
      >
        {priority}
      </Badge>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2">Loading ticket...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // If ticket not found or data is not loaded yet
  if (!data) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p>Ticket not found or you don't have access.</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => navigate("/tickets")}
            >
              Back to Tickets
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { ticket, messages, server, department } = data;

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            size="icon"
            className="mr-4"
            onClick={() => navigate("/tickets")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <h1 className="text-2xl font-semibold">{ticket.subject}</h1>
              <div className="ml-1">{getStatusBadge(ticket.status)}</div>
              <div className="ml-1">{getPriorityBadge(ticket.priority)}</div>
              {department && (
                <Badge variant="outline" className="text-xs py-0 bg-primary/10">
                  {department.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center text-gray-500 mt-1 text-sm">
              <span>Created on {format(new Date(ticket.createdAt), 'MMM d, yyyy')}</span>
              <span className="mx-2">•</span>
              <span>Last updated {format(new Date(ticket.updatedAt), 'MMM d, yyyy h:mm a')}</span>
            </div>
          </div>
        </div>
        <div className="mt-4 md:mt-0 flex gap-2">
          {/* Download button - always visible */}
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => window.open(`/api/tickets/${ticketId}/download`, '_blank')}
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          
          {/* Close button - only visible for open tickets */}
          {ticket.status !== "closed" && (
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => closeTicketMutation.mutate()}
              disabled={closeTicketMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              {closeTicketMutation.isPending ? "Closing..." : "Close Ticket"}
            </Button>
          )}
          
          {/* Reopen button - only visible for closed tickets */}
          {ticket.status === "closed" && (
            <Button 
              variant="outline" 
              className="flex items-center"
              onClick={() => reopenTicketMutation.mutate()}
              disabled={reopenTicketMutation.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {reopenTicketMutation.isPending ? "Reopening..." : "Reopen Ticket"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content - Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Chat Section - Left Side */}
        <div className="md:col-span-2">
          {/* Ticket Messages */}
          <Card className="mb-6">
            <CardHeader className="py-3 px-4" style={getContainerStyle()}>
              <CardTitle className="text-md font-medium">Ticket Messages</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {messages.length > 0 ? (
                <MessageList messages={messages} currentUserId={user?.id || 0} />
              ) : (
                <div className="flex justify-center items-center h-32">
                  <p className="text-gray-500">No messages yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reply Form */}
          {ticket.status !== "closed" ? (
            <Card className="mb-6">
              <CardHeader className="py-3 px-4" style={getContainerStyle()}>
                <CardTitle className="text-md font-medium">Reply</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Type your message here..."
                    className="min-h-32"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    style={{ 
                      borderColor: colors.primary.border,
                      "--tw-ring-color": colors.primary.border
                    } as React.CSSProperties}
                  />
                  <div className="flex justify-end">
                    <Button 
                      className="flex items-center hover:opacity-90 transition-opacity" 
                      onClick={handleSendMessage}
                      disabled={!message.trim() || addMessageMutation.isPending}
                      style={{ 
                        backgroundColor: colors.primary.full,
                        borderColor: colors.primary.full
                      }}
                    >
                      {addMessageMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-6 bg-gray-50">
              <CardContent className="p-6">
                <div className="flex items-center justify-center text-gray-500">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  <p>This ticket is closed. Reopen it to send more messages.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar - Information Cards */}
        <div className="md:col-span-1 space-y-6">
          {/* Server Info if available */}
          {server && (
            <Card>
              <CardHeader className="py-3 px-4" style={getContainerStyle()}>
                <CardTitle className="text-md font-medium flex items-center">
                  <Server className="h-4 w-4 mr-2" style={{ color: colors.primary.full }} />
                  Server Information
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Server Name</p>
                    <p className="text-sm">{server.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Hostname</p>
                    <p className="text-sm">{server.hostname || "Unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <Badge 
                      variant="outline" 
                      className="text-xs mt-1"
                      style={{ 
                        borderColor: colors.primary.border,
                        color: colors.primary.dark,
                        backgroundColor: hexToRgba(brandColors.primaryColor, 0.05)
                      }}
                    >
                      {server.status}
                    </Badge>
                  </div>
                  
                  {/* IP Address Information */}
                  {server.allIps && server.allIps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mt-2 mb-1">IP Addresses</p>
                      {(() => {
                        const firstIpv4 = server.allIps.find(ip => ip.type === 'ipv4');
                        const firstIpv6 = server.allIps.find(ip => ip.type === 'ipv6');
                        const displayIps = [];
                        
                        if (firstIpv4) displayIps.push(firstIpv4);
                        if (firstIpv6) displayIps.push(firstIpv6);
                        
                        return displayIps.map((ip, index) => (
                          <div key={index} className="border rounded p-2 mb-2 text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{ip.type?.toUpperCase()}</span>
                              {ip.enabled && (
                                <Badge 
                                  variant="outline" 
                                  className="text-[10px] h-4"
                                  style={{ 
                                    backgroundColor: colors.secondary.light,
                                    borderColor: colors.secondary.border,
                                    color: colors.secondary.dark
                                  }}
                                >
                                  <Wifi className="h-3 w-3 mr-1" /> Active
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 mb-1">{ip.address}</p>
                            <div className="text-gray-500 space-y-1">
                              <p>Gateway: {ip.gateway}</p>
                              <p>Netmask: {ip.netmask}</p>
                            </div>
                          </div>
                        ));
                      })()}
                      
                      {/* Show count of additional IPs if there are more */}
                      {server.allIps.length > 2 && (
                        <div className="text-xs text-gray-500 italic mt-2">
                          +{server.allIps.length - 2} additional IP addresses
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department Information */}
          {department && (
            <Card>
              <CardHeader className="py-3 px-4" style={getContainerStyle()}>
                <CardTitle className="text-md font-medium">Department</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm">{department.name}</p>
                  </div>
                  
                  {department.description && (
                    <div>
                      <p className="text-sm font-medium">Description</p>
                      <p className="text-sm">{department.description}</p>
                    </div>
                  )}
                  
                  <div>
                    <p className="text-sm font-medium">Requires VPS</p>
                    <p className="text-sm">{department.requiresVps ? "Yes" : "No"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display VirtFusion credits if available */}
          {balance && (
            <Card>
              <CardHeader className="py-3 px-4" style={getContainerStyle()}>
                <CardTitle className="text-md font-medium flex items-center">
                  <Coins className="h-4 w-4 mr-2" style={{ color: colors.accent.full }} />
                  VirtFusion Credits
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  100 tokens = $1.00 USD
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">VirtFusion Balance:</span>
                    <span className="font-medium">${balance.virtFusionCredits.toFixed(5)} USD</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">VirtFusion Tokens:</span>
                    <span className="font-medium text-secondary">
                      {balance.virtFusionTokens.toLocaleString()} tokens
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      </div>
    </DashboardLayout>
  );
}
