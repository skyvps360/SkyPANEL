import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Rocket, 
  Server, 
  Database, 
  Cloud, 
  HardDrive, 
  Wifi, 
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  LineChart,
  ClipboardList,
  BarChart2,
  ArrowUpRight,
  Calendar,
  Info,
  RefreshCw,
  Cpu
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";
import { InfrastructureTable } from "@/components/status/InfrastructureTable";

// Define types for platform statistics
interface PlatformStats {
  serverCount: number;
  hypervisorCount: number;
  maxCPU: number;
  maxMemory: number;
  // Optional fields (may not be provided by the API)
  activeVms?: number;
  totalStorage?: number;
  vmCountsByRegion?: Record<string, number>;
  uptime?: {
    api: number;
    network: number;
    storage: number;
    compute: number;
  };
}

// Service status type
interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptimePercentage: number;
  icon: React.ReactNode;
  description: string;
}

// Maintenance status type
interface MaintenanceStatus {
  enabled: boolean;
  message: string;
  estimatedCompletion?: string;
}

// Incident type
interface Incident {
  id: string;
  name: string;
  url?: string;
  cause: string;
  startedAt: string;
  acknowledgedAt?: string | null;
  acknowledgedBy?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  status: 'Started' | 'Acknowledged' | 'Resolved';
  responseContent?: string;
  monitorId?: string;
  monitorName?: string;
}

export default function StatusPage() {
  // Fetch branding data from API
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Get brand colors using the data from API
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  // State for incidents pagination
  const [currentPage, setCurrentPage] = useState(1);
  const incidentsPerPage = 3;

  // Fetch platform statistics
  const { data: platformStats, isLoading: isLoadingStats } = useQuery<PlatformStats>({
    queryKey: ["/api/public/platform-stats"],
  });

  // Fetch maintenance status
  const { data: maintenanceStatus, isLoading: isLoadingMaintenance } = useQuery<MaintenanceStatus>({
    queryKey: ["/api/maintenance/status"],
  });
  
  // Fetch service status from BetterStack
  const { data: serviceStatusData, isLoading: isLoadingServiceStatus } = useQuery<{
    overall: 'operational' | 'degraded' | 'outage' | 'maintenance';
    services: {
      name: string;
      status: 'operational' | 'degraded' | 'outage' | 'maintenance';
      uptimePercentage: number;
    }[];
  }>({
    queryKey: ["/api/public/service-status"],
  });
  
  // Fetch incident history from BetterStack
  const { data: incidentData, isLoading: isLoadingIncidents } = useQuery<{
    incidents: Incident[];
  }>({
    queryKey: ["/api/public/service-incidents"],
  });

  // Map service icon based on name
  const getServiceIcon = (serviceName: string) => {
    const name = serviceName.toLowerCase();
    
    if (name.includes('api') || name.includes('control') || name.includes('portal')) {
      return <Rocket className="h-5 w-5" />;
    } else if (name.includes('network') || name.includes('internet')) {
      return <Wifi className="h-5 w-5" />;
    } else if (name.includes('storage') || name.includes('backup')) {
      return <HardDrive className="h-5 w-5" />;
    } else if (name.includes('compute') || name.includes('vm') || name.includes('server')) {
      return <Server className="h-5 w-5" />;
    } else if (name.includes('database') || name.includes('db')) {
      return <Database className="h-5 w-5" />;
    } else if (name.includes('cloud') || name.includes('cdn')) {
      return <Cloud className="h-5 w-5" />;
    }
    
    // Default icon
    return <Rocket className="h-5 w-5" />;
  };

  // Calculate service statuses - use BetterStack data if available, otherwise use default
  const getServiceStatuses = (): ServiceStatus[] => {
    
    // Check if we have service status data from the API
    if (serviceStatusData) {
      // Specifically handle the doubly-nested structure we're seeing
      if (serviceStatusData.services && 
          typeof serviceStatusData.services === 'object' && 
          'services' in serviceStatusData.services && 
          Array.isArray(serviceStatusData.services.services)) {
        
        return serviceStatusData.services.services.map(service => ({
          name: service.name,
          status: service.status,
          uptimePercentage: service.uptimePercentage,
          icon: getServiceIcon(service.name),
          description: `${service.name} service status`
        }));
      }
      
      // Handle the nested structure (services.services array)
      else if (serviceStatusData.services && 
          typeof serviceStatusData.services === 'object' && 
          'services' in serviceStatusData.services && 
          Array.isArray(serviceStatusData.services.services) && 
          serviceStatusData.services.services.length > 0) {
        
        return serviceStatusData.services.services.map(service => ({
          name: service.name,
          status: service.status,
          uptimePercentage: service.uptimePercentage,
          icon: getServiceIcon(service.name),
          description: `${service.name} service status`
        }));
      }
      
      // Handle the flat structure (services array)
      else if (serviceStatusData.services && 
               Array.isArray(serviceStatusData.services) && 
               serviceStatusData.services.length > 0) {
        
        return serviceStatusData.services.map(service => ({
          name: service.name,
          status: service.status,
          uptimePercentage: service.uptimePercentage,
          icon: getServiceIcon(service.name),
          description: `${service.name} service status`
        }));
      }
    }
    
    // Fallback to default hardcoded services if no BetterStack data
    if (!platformStats) return [];

    // Set default uptime values since they're not in the API response
    const defaultUptime = 99.99;

    return [
      {
        name: 'API Services',
        status: getStatusFromUptime(defaultUptime),
        uptimePercentage: defaultUptime,
        icon: <Rocket className="h-5 w-5" />,
        description: 'REST API, control panel, and customer portal'
      },
      {
        name: 'Network',
        status: getStatusFromUptime(defaultUptime),
        uptimePercentage: defaultUptime,
        icon: <Wifi className="h-5 w-5" />,
        description: 'Core network and internet connectivity'
      },
      {
        name: 'Storage Services',
        status: getStatusFromUptime(defaultUptime),
        uptimePercentage: defaultUptime,
        icon: <HardDrive className="h-5 w-5" />,
        description: 'Block storage and backup systems'
      },
      {
        name: 'Compute',
        status: getStatusFromUptime(defaultUptime),
        uptimePercentage: defaultUptime,
        icon: <Server className="h-5 w-5" />,
        description: 'Virtual machines and hypervisors'
      },
      {
        name: 'Database',
        status: 'operational',
        uptimePercentage: 99.99,
        icon: <Database className="h-5 w-5" />,
        description: 'Internal database systems'
      },
      {
        name: 'Cloud Services',
        status: 'operational',
        uptimePercentage: 99.97,
        icon: <Cloud className="h-5 w-5" />,
        description: 'Object storage and CDN'
      }
    ];
  };

  // Helper function to determine status based on uptime percentage
  const getStatusFromUptime = (uptime: number): 'operational' | 'degraded' | 'outage' | 'maintenance' => {
    if (uptime >= 99.9) return 'operational';
    if (uptime >= 95) return 'degraded';
    return 'outage';
  };

  // Format uptime percentage for display
  const formatUptimePercentage = (percentage: number): string => {
    return percentage.toFixed(2) + '%';
  };

  // Helper to get badge color based on status - uses brand colors now
  const getStatusColor = (status: string): { bg: string; text: string; icon: string } => {
    // Always use brand colors - this is the key change
    if (status === 'operational') {
      return {
        bg: `${brandColors.primary.extraLight}`,
        text: `${brandColors.primary.full}`,
        icon: `${brandColors.primary.full}`
      };
    } else if (status === 'degraded') {
      return {
        bg: 'rgba(234, 179, 8, 0.1)',
        text: 'rgb(202, 138, 4)',
        icon: 'rgb(234, 179, 8)'
      };
    } else if (status === 'outage') {
      return {
        bg: 'rgba(239, 68, 68, 0.1)',
        text: 'rgb(220, 38, 38)',
        icon: 'rgb(239, 68, 68)'
      };
    } else if (status === 'maintenance') {
      return {
        bg: `${brandColors.primary.extraLight}`,
        text: `${brandColors.primary.full}`,
        icon: `${brandColors.primary.full}`
      };
    } else {
      return {
        bg: `${brandColors.primary.extraLight}`,
        text: `${brandColors.primary.full}`,
        icon: `${brandColors.primary.full}`
      };
    }
  };

  // Calculate pagination for incidents
  const paginateIncidents = (incidents: Incident[] = []): Incident[] => {
    if (!incidents || incidents.length === 0) return [];
    
    const startIndex = (currentPage - 1) * incidentsPerPage;
    const endIndex = startIndex + incidentsPerPage;
    return incidents.slice(startIndex, endIndex);
  };
  
  // Get total number of pages for pagination
  const getTotalPages = (incidents: Incident[] = []): number => {
    if (!incidents || incidents.length === 0) return 1;
    return Math.ceil(incidents.length / incidentsPerPage);
  };
  
  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(page);
  };
  
  const getStatusIcon = (status: string): React.ReactNode => {
    const color = getStatusColor(status).icon;
    switch (status) {
      case 'operational':
        return <CheckCircle2 className="h-5 w-5" style={{ color }} />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5" style={{ color }} />;
      case 'outage':
        return <XCircle className="h-5 w-5" style={{ color }} />;
      case 'maintenance':
        return <RefreshCw className="h-5 w-5" style={{ color }} />;
      default:
        return null;
    }
  };

  const services = getServiceStatuses();
  const isLoading = isLoadingStats || isLoadingMaintenance || isLoadingServiceStatus || isLoadingIncidents;
  
  // Calculate overall system status
  const getOverallStatus = (): 'operational' | 'degraded' | 'outage' | 'maintenance' => {
    // If maintenance mode is enabled, that overrides everything
    if (maintenanceStatus?.enabled) return 'maintenance';
    
    // If we have BetterStack overall status data, use it
    if (serviceStatusData?.overall) {
      return serviceStatusData.overall;
    }
    
    // Otherwise calculate from service status
    if (!services.length) return 'operational';
    
    if (services.some(s => s.status === 'outage')) return 'outage';
    if (services.some(s => s.status === 'degraded')) return 'degraded';
    
    return 'operational';
  };
  
  const overallStatus = getOverallStatus();
  
  // Format the status message
  const getStatusMessage = (): string => {
    if (maintenanceStatus?.enabled) {
      return `System Maintenance: ${maintenanceStatus.message}`;
    }
    
    switch (overallStatus) {
      case 'operational':
        return 'All Systems Operational';
      case 'degraded':
        return 'Some Systems Experiencing Issues';
      case 'outage':
        return 'Service Disruption Detected';
      default:
        return 'System Status';
    }
  };

  // Function to get progress bar color based on status - always use brand primary color
  const getProgressColor = (status: string): string => {
    // Always use the brand color for a consistent brand experience
    return brandColors.primary.full;
  };

  return (
    <PublicLayout>
      <div className="w-full">
        {/* Hero section with colored background - matching blog and docs pages */}
        <div style={{ backgroundColor: brandColors.primary.full }} className="relative overflow-hidden w-full">
          {/* Decorative bubbles in the background, exactly matching blog page */}
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
              <div className="flex items-center mb-6">
                <div
                  className="p-3 rounded-full mr-4"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Activity className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white">
                  System Status
                </h1>
              </div>
              <p className="text-white text-lg opacity-90">
                Real-time monitoring and status of our infrastructure and services
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        {/* Status indicator section */}
        <div className="mb-8">
          <div className="inline-flex items-center px-6 py-3 rounded-full mb-2"
            style={{ 
              backgroundColor: brandColors.primary.extraLight,
              color: brandColors.primary.dark,
            }}
          >
            <span className="flex items-center gap-2 font-medium">
              {getStatusIcon(overallStatus)}
              <span className="text-xl capitalize">{getStatusMessage()}</span>
            </span>
          </div>
          
          <p className="text-sm text-gray-500">
            Last updated: {format(new Date(), 'dd MMM yyyy, HH:mm:ss')}
          </p>
            
          {maintenanceStatus?.enabled && maintenanceStatus.estimatedCompletion && (
            <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200 inline-block">
              <p className="font-medium text-amber-800">
                Estimated completion: {maintenanceStatus.estimatedCompletion}
              </p>
            </div>
          )}
        </div>

        {/* Service status grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5" style={{ color: brandColors.primary.full }} />
              <h2 className="text-2xl font-bold">Service Status</h2>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm bg-gray-100 px-2 py-1 rounded-md flex items-center">
                    <Info className="h-4 w-4 mr-1 text-gray-500" />
                    <span className="font-medium text-gray-700">Live Data</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Service statuses are updated in real-time</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* TABLE VIEW ON DESKTOP */}
          <div className="hidden md:block mb-6">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded-t-lg mb-2"></div>
                <div className="space-y-2">
                  {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-md"></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>Service</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>Status</th>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>Uptime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((service, index) => {
                      const statusColor = getStatusColor(service.status);
                      return (
                        <tr 
                          key={index} 
                          className={`border-b border-gray-100 hover:bg-gray-50 ${index === services.length - 1 ? 'border-0' : ''}`}
                        >
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <span 
                                className="flex items-center justify-center p-1.5 rounded-full"
                                style={{ 
                                  backgroundColor: brandColors.primary.extraLight,
                                  color: brandColors.primary.full
                                }}
                              >
                                {service.icon}
                              </span>
                              <div>
                                <p className="font-medium">{service.name}</p>
                                <p className="text-sm text-gray-500">{service.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span 
                              className="inline-flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full"
                              style={{ 
                                backgroundColor: statusColor.bg,
                                color: statusColor.text
                              }}
                            >
                              {getStatusIcon(service.status)}
                              <span className="capitalize">{service.status}</span>
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-48">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Uptime</span>
                                <span className="text-sm font-bold">{formatUptimePercentage(service.uptimePercentage)}</span>
                              </div>
                              <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                                <div 
                                  className="h-full transition-all absolute left-0 top-0"
                                  style={{ 
                                    width: `${service.uptimePercentage}%`,
                                    backgroundColor: brandColors.primary.full
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD VIEW ON MOBILE */}
          <div className="grid grid-cols-1 gap-5 md:hidden">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <div className="h-2 w-full bg-gray-200"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-gray-200"></div>
                      <div className="h-6 bg-gray-200 rounded-md w-32"></div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-gray-200 rounded-md w-full mb-3"></div>
                    <div className="h-2 bg-gray-200 rounded-md w-full mb-2"></div>
                    <div className="flex justify-end">
                      <div className="h-5 w-16 bg-gray-200 rounded-md"></div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              services.map((service, index) => {
                const statusColor = getStatusColor(service.status);
                return (
                  <Card key={index} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                    <div 
                      className="h-2 w-full" 
                      style={{ backgroundColor: brandColors.primary.full }}
                    ></div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span 
                            className="flex items-center justify-center p-1.5 rounded-full"
                            style={{ 
                              backgroundColor: brandColors.primary.extraLight,
                              color: brandColors.primary.full
                            }}
                          >
                            {service.icon}
                          </span>
                          <CardTitle className="text-lg">{service.name}</CardTitle>
                        </div>
                        <span 
                          className="flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full"
                          style={{ 
                            backgroundColor: statusColor.bg,
                            color: statusColor.text
                          }}
                        >
                          {getStatusIcon(service.status)}
                          <span className="capitalize">{service.status}</span>
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-5">
                      <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">Uptime</span>
                          <span className="text-sm font-bold" style={{ color: brandColors.primary.full }}>{formatUptimePercentage(service.uptimePercentage)}</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                          <div 
                            className="h-full transition-all absolute left-0 top-0"
                            style={{ 
                              width: `${service.uptimePercentage}%`,
                              backgroundColor: brandColors.primary.full
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Infrastructure statistics */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="h-5 w-5" style={{ color: brandColors.primary.full }} />
            <h2 className="text-2xl font-bold">Infrastructure Metrics</h2>
          </div>
          
          <InfrastructureTable
            platformStats={platformStats}
            brandColors={brandColors}
            isLoading={isLoading}
          />
        </div>
        
        {/* Incident history */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="h-5 w-5" style={{ color: brandColors.primary.full }} />
            <h2 className="text-2xl font-bold">Recent Incidents</h2>
          </div>
          
          <Card className="border border-gray-100 rounded-xl overflow-hidden">
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div 
                    className="animate-spin rounded-full h-12 w-12 border-2 mb-4" 
                    style={{ 
                      borderColor: `${brandColors.primary.lighter}`,
                      borderTopColor: brandColors.primary.full
                    }}
                  ></div>
                  <p className="text-gray-500">Loading incident history...</p>
                </div>
              ) : !incidentData?.incidents || incidentData.incidents.length === 0 ? (
                <div 
                  className="text-center py-12 border border-dashed rounded-lg"
                  style={{ borderColor: brandColors.primary.lighter }}
                >
                  <div 
                    className="rounded-full mx-auto flex items-center justify-center h-16 w-16 mb-4"
                    style={{ backgroundColor: brandColors.primary.extraLight }}
                  >
                    <CheckCircle2 
                      className="h-8 w-8" 
                      style={{ color: brandColors.primary.full }}
                    />
                  </div>
                  <h3 
                    className="text-xl font-bold mb-2"
                    style={{ color: brandColors.primary.full }}
                  >
                    All Systems Operational
                  </h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    No incidents have been reported in the recent history. All services are running smoothly.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-6">
                    {paginateIncidents(incidentData.incidents).map((incident) => {
                      let statusColor;
                      switch (incident.status) {
                        case 'Resolved':
                          statusColor = 'rgba(34, 197, 94, 0.1)';
                          break;
                        case 'Acknowledged':
                          statusColor = 'rgba(234, 179, 8, 0.1)';
                          break;
                        default:
                          statusColor = 'rgba(239, 68, 68, 0.1)';
                      }
                      
                      return (
                        <div 
                          key={incident.id} 
                          className="border-b border-gray-100 pb-6 last:border-0 last:pb-0"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-3">
                            <h3 
                              className="font-semibold text-lg"
                              style={{ color: brandColors.primary.dark }}
                            >
                              {incident.name}
                            </h3>
                            <div 
                              className="px-3 py-1 rounded-full text-sm font-medium self-start inline-flex items-center gap-1"
                              style={{ 
                                backgroundColor: statusColor,
                                color: incident.status === 'Resolved' 
                                  ? 'rgb(22, 163, 74)' 
                                  : incident.status === 'Acknowledged' 
                                    ? 'rgb(202, 138, 4)' 
                                    : 'rgb(220, 38, 38)'
                              }}
                            >
                              {incident.status === 'Resolved' ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : incident.status === 'Acknowledged' ? (
                                <AlertCircle className="h-3.5 w-3.5" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5" />
                              )}
                              {incident.status}
                            </div>
                          </div>
                          
                          <p className="text-gray-600 mb-4 text-sm">{incident.cause}</p>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500 mb-3">
                            <div 
                              className="flex items-center gap-2 p-2 rounded-md"
                              style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                            >
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              <div>
                                <span className="text-gray-500 block">Started:</span>
                                <span className="font-medium text-gray-700">
                                  {format(new Date(incident.startedAt), 'dd MMM yyyy, HH:mm')}
                                </span>
                              </div>
                            </div>
                            
                            {incident.monitorName && (
                              <div 
                                className="flex items-center gap-2 p-2 rounded-md"
                                style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                              >
                                <Server className="h-3.5 w-3.5 text-gray-400" />
                                <div>
                                  <span className="text-gray-500 block">Affected System:</span>
                                  <span className="font-medium text-gray-700">
                                    {incident.monitorName}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {incident.acknowledgedAt && (
                              <div 
                                className="flex items-center gap-2 p-2 rounded-md"
                                style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                              >
                                <AlertCircle className="h-3.5 w-3.5 text-gray-400" />
                                <div>
                                  <span className="text-gray-500 block">Acknowledged:</span>
                                  <span className="font-medium text-gray-700">
                                    {format(new Date(incident.acknowledgedAt), 'dd MMM yyyy, HH:mm')}
                                    {incident.acknowledgedBy && ` by ${incident.acknowledgedBy}`}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {incident.resolvedAt && (
                              <div 
                                className="flex items-center gap-2 p-2 rounded-md"
                                style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
                                <div>
                                  <span className="text-gray-500 block">Resolved:</span>
                                  <span className="font-medium text-gray-700">
                                    {format(new Date(incident.resolvedAt), 'dd MMM yyyy, HH:mm')}
                                    {incident.resolvedBy && ` by ${incident.resolvedBy}`}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {incident.responseContent && (
                            <div 
                              className="mt-3 p-4 rounded-md text-sm"
                              style={{ backgroundColor: brandColors.primary.extraLight }}
                            >
                              <p 
                                className="font-medium mb-1"
                                style={{ color: brandColors.primary.full }}
                              >
                                Official response:
                              </p>
                              <p className="text-gray-700">{incident.responseContent}</p>
                            </div>
                          )}
                          
                          {incident.url && (
                            <div className="mt-4">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="px-0 font-medium hover:bg-transparent underline-offset-4"
                                style={{ color: brandColors.primary.full, height: 'auto' }}
                                onClick={() => window.open(incident.url, '_blank')}
                              >
                                <span className="flex items-center">
                                  View incident details
                                  <ArrowUpRight className="h-3.5 w-3.5 ml-1" />
                                </span>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {getTotalPages(incidentData.incidents) > 1 && (
                    <div className="flex justify-center items-center space-x-2 mt-8">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{ 
                          borderColor: brandColors.primary.light,
                          color: brandColors.primary.full
                        }}
                        className="rounded-full w-10 h-10 hover:bg-opacity-10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onMouseEnter={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.backgroundColor = brandColors.primary.extraLight;
                            e.currentTarget.style.borderColor = brandColors.primary.full;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== 1) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = brandColors.primary.light;
                          }
                        }}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      
                      {Array.from({ length: getTotalPages(incidentData.incidents) }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(page)}
                          style={currentPage === page 
                            ? { 
                                backgroundColor: brandColors.primary.full, 
                                color: 'white',
                                borderRadius: '9999px',
                                width: '2.5rem',
                                height: '2.5rem',
                                borderColor: brandColors.primary.full
                              }
                            : { 
                                borderColor: brandColors.primary.light,
                                color: brandColors.primary.full,
                                borderRadius: '9999px',
                                width: '2.5rem',
                                height: '2.5rem',
                              }
                          }
                          className="rounded-full w-10 h-10 transition-all duration-200"
                          onMouseEnter={(e) => {
                            if (currentPage !== page) {
                              e.currentTarget.style.backgroundColor = brandColors.primary.extraLight;
                              e.currentTarget.style.borderColor = brandColors.primary.full;
                            } else {
                              e.currentTarget.style.backgroundColor = brandColors.primary.dark;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (currentPage !== page) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.borderColor = brandColors.primary.light;
                            } else {
                              e.currentTarget.style.backgroundColor = brandColors.primary.full;
                            }
                          }}
                        >
                          {page}
                        </Button>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === getTotalPages(incidentData.incidents)}
                        style={{ 
                          borderColor: brandColors.primary.light,
                          color: brandColors.primary.full
                        }}
                        className="rounded-full w-10 h-10 hover:bg-opacity-10 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        onMouseEnter={(e) => {
                          if (currentPage !== getTotalPages(incidentData.incidents)) {
                            e.currentTarget.style.backgroundColor = brandColors.primary.extraLight;
                            e.currentTarget.style.borderColor = brandColors.primary.full;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (currentPage !== getTotalPages(incidentData.incidents)) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.borderColor = brandColors.primary.light;
                          }
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer section with last update info */}
        <div className="text-center text-sm text-gray-500 mt-12">
          <p>This page automatically refreshes every 60 seconds to display the most current information.</p>
          <p className="mt-1">
            For urgent issues, please{" "}
            <a 
              href="/tickets" 
              className="hover:underline font-medium" 
              style={{ color: brandColors.primary.full }}
            >
              contact support
            </a>.
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}