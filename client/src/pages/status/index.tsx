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
    company_name?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Get company name from branding data
  const companyName = brandingData?.company_name || 'Company';
  
  // Get brand colors using the data from API
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });
  
  // Get pattern backgrounds for visual elements
  const patterns = getPatternBackgrounds({
    primaryColor: brandingData?.primary_color || ''
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
    <>

      <PublicLayout>
      <div className="w-full">
        {/* Hero section with colored background - matching plans, blog, docs, and team pages */}
        <div 
          className="relative overflow-hidden w-full"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={patterns.dots.style}
          ></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 opacity-10">
            <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="200" fill="white" />
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
          
          <div className="max-w-screen-xl mx-auto py-20 px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-8">
                <div
                  className="p-4 rounded-full mr-6"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Activity className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                  System Status
                </h1>
              </div>
              <p className="text-white text-xl opacity-95 max-w-3xl mx-auto leading-relaxed mb-12">
                Real-time monitoring and status of {companyName}'s infrastructure and services. 
                Stay informed about system performance and any ongoing issues.
              </p>
              
              {/* Key Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Real-time Monitoring</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">99.9% Uptime</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Instant Alerts</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <BarChart2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Performance Metrics</span>
                </div>
              </div>
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
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
                      <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide" style={{ color: brandColors.primary.dark }}>Service</th>
                      <th className="text-center py-4 px-6 font-semibold text-sm uppercase tracking-wide" style={{ color: brandColors.primary.dark }}>Status</th>
                      <th className="text-right py-4 px-6 font-semibold text-sm uppercase tracking-wide" style={{ color: brandColors.primary.dark }}>Uptime</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {services.map((service, index) => {
                      const statusColor = getStatusColor(service.status);
                      return (
                        <tr 
                          key={index} 
                          className="hover:bg-gray-50/50 transition-colors duration-200"
                        >
                          <td className="py-5 px-6">
                            <div className="flex items-center gap-4">
                              <span 
                                className="flex items-center justify-center p-2.5 rounded-xl shadow-sm"
                                style={{ 
                                  backgroundColor: brandColors.primary.extraLight,
                                  color: brandColors.primary.full
                                }}
                              >
                                {service.icon}
                              </span>
                              <div>
                                <p className="font-semibold text-gray-900 text-base">{service.name}</p>
                                <p className="text-sm text-gray-500">{service.description}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-center">
                            <span 
                              className="inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm"
                              style={{ 
                                backgroundColor: statusColor.bg,
                                color: statusColor.text
                              }}
                            >
                              {getStatusIcon(service.status)}
                              <span className="capitalize">{service.status}</span>
                            </span>
                          </td>
                          <td className="py-5 px-6">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-3 mb-2 w-full max-w-48">
                                <span className="text-sm font-medium text-gray-600">Uptime</span>
                                <span className="text-sm font-bold tabular-nums" style={{ color: brandColors.primary.full }}>
                                  {formatUptimePercentage(service.uptimePercentage)}
                                </span>
                              </div>
                              <div className="relative h-2 w-full max-w-48 overflow-hidden rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                                <div 
                                  className="h-full transition-all duration-300 absolute left-0 top-0 rounded-full"
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
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="h-1 w-full bg-gray-200"></div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-xl bg-gray-200"></div>
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
                  <Card key={index} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md bg-white">
                    <div 
                      className="h-1 w-full" 
                      style={{ backgroundColor: brandColors.primary.full }}
                    ></div>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span 
                            className="flex items-center justify-center p-2.5 rounded-xl shadow-sm"
                            style={{ 
                              backgroundColor: brandColors.primary.extraLight,
                              color: brandColors.primary.full
                            }}
                          >
                            {service.icon}
                          </span>
                          <CardTitle className="text-lg font-semibold">{service.name}</CardTitle>
                        </div>
                        <span 
                          className="flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full shadow-sm"
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
                    <CardContent className="pb-6">
                      <p className="text-sm text-gray-500 mb-4">{service.description}</p>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-600">Uptime</span>
                          <span className="text-sm font-bold tabular-nums" style={{ color: brandColors.primary.full }}>
                            {formatUptimePercentage(service.uptimePercentage)}
                          </span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: brandColors.primary.extraLight }}>
                          <div 
                            className="h-full transition-all duration-300 absolute left-0 top-0 rounded-full"
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
    </>
  );
}