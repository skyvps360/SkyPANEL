import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MaintenanceBanner } from "@/components/maintenance-banner";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Server, CheckCircle, Globe, Shield, Cpu, Zap } from "lucide-react";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Button } from "@/components/ui/button";
import { DatacenterLeafletMap } from "@/components/datacenter/DatacenterLeafletMap";
import { getBrandColors } from "@/lib/brand-theme";
import { GoogleAnalyticsTracker } from "../components/GoogleAnalyticsTracker";

/**
 * Landing Page Component
 * 
 * This component handles the main landing page at the root URL (/).
 * Shows the landing page content regardless of login status
 */
export default function LandingPage() {
  const { user, isLoading } = useAuth();
  const [maintenanceMode, setMaintenanceMode] = useState({
    enabled: false,
    message: "System is currently under maintenance",
    estimatedCompletion: ""
  });
  
  // Fetch platform statistics
  const { data: platformStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/public/platform-stats"],
    queryFn: async () => {
      const response = await fetch('/api/public/platform-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch platform statistics');
      }
      return response.json();
    },
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch branding settings
  const { data: branding = { company_name: 'SkyVPS360', company_color: '2563eb', primary_color: '2563eb', secondary_color: '2563eb', accent_color: '2563eb' } } = useQuery<{
    company_name: string;
    company_color: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Fetch public settings for enterprise features section
  const { data: publicSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings/public"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  useEffect(() => {
    // Fetch maintenance status from server
    const fetchMaintenanceStatus = async () => {
      try {
        const response = await fetch('/api/maintenance/status');
        if (response.ok) {
          const data = await response.json();
          setMaintenanceMode(data);
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status:', error);
      }
    };
    
    fetchMaintenanceStatus();
  }, []);

  // While checking auth status, show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // Extract company information and branding
  const companyName = branding?.company_name || 'SkyVPS360';
  
  // Get brand colors using the utility function
  const brandColors = getBrandColors({
    primaryColor: branding?.primary_color || branding?.company_color || '2563eb',
    secondaryColor: branding?.secondary_color || '3b82f6',
    accentColor: branding?.accent_color || '10b981'
  });
  
  return (
    <>
      <GoogleAnalyticsTracker />
      <PublicLayout>
        {/* Maintenance Banner - Only shown when maintenance mode is enabled */}
        {maintenanceMode.enabled && (
          <MaintenanceBanner 
            message={maintenanceMode.message} 
            estimatedCompletion={maintenanceMode.estimatedCompletion} 
          />
        )}
        
        {/* Hero Section - Modern, bold design with animated gradient */}
        <section 
          className="relative py-28 px-6 bg-gradient-to-br from-gray-900 to-gray-800 overflow-hidden"
          style={{ 
            background: `radial-gradient(ellipse at top, #111827, #1f2937), 
                         linear-gradient(to bottom right, ${brandColors.primary.extraLight}, #111827)`
          }}
        >
          {/* Animated background patterns */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-full h-full" 
                 style={{ 
                   backgroundImage: `radial-gradient(${brandColors.primary.full} 1px, transparent 1px)`,
                   backgroundSize: '30px 30px' 
                 }}></div>
          </div>
          
          <div className="container mx-auto relative">
            <div className="flex flex-col lg:flex-row items-center max-w-7xl mx-auto">
              <div className="w-full lg:w-1/2 text-center lg:text-left mb-12 lg:mb-0">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white mb-6 leading-tight">
                  Enterprise Cloud <span style={{ color: brandColors.primary.full }}>Infrastructure</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0">
                  Power your digital transformation with our high-performance VirtFusion-powered VPS solutions, engineered for reliability and scalability.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button 
                    className="w-full sm:w-auto text-white" 
                    style={{ backgroundColor: brandColors.primary.full }}
                    onClick={() => window.location.href = "#features"}
                  >
                    Explore Features
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto backdrop-blur-sm text-white transition-all hover-custom-button"
                    style={{
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white'
                    }}
                    onClick={(e) => {
                      window.location.href = "/plans";
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = brandColors.primary.light;
                      e.currentTarget.style.borderColor = brandColors.primary.full;
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.color = 'white';
                    }}
                  >
                    View Plans
                  </Button>
                </div>
              </div>
              
              {/* Server status cards */}
              <div className="w-full lg:w-1/2 flex justify-center">
                <div className="bg-gray-900/50 backdrop-blur-sm p-8 rounded-2xl border border-gray-700 w-full max-w-md">
                  <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                    <Server className="mr-3 h-6 w-6" style={{ color: brandColors.primary.full }} />
                    Platform Status
                  </h3>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                      <div className="text-gray-300">Active Servers</div>
                      {statsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : (
                        <div className="text-xl font-bold text-white">
                          {platformStats?.serverCount?.toLocaleString() || '0'}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-700">
                      <div className="text-gray-300">Hypervisors</div>
                      {statsLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : (
                        <div className="text-xl font-bold text-white">
                          {platformStats?.hypervisorCount?.toLocaleString() || '0'}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-gray-300">Service Status</div>
                      <div className="flex items-center">
                        <span className="h-3 w-3 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                        <span className="text-green-400 font-medium">Operational</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Enterprise-Grade Features Section - Dynamic from Admin Settings */}
        <section id="features" className="py-20 px-6 bg-white">
          <div className="container mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                {publicSettings.enterprise_features_heading || "Enterprise-Grade Features"}
              </h2>
              <p className="text-lg text-gray-600">
                {publicSettings.enterprise_features_subheading || "Our platform delivers the performance, security, and flexibility you need to build and scale with confidence."}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* First feature card - dynamic from settings */}
              {(publicSettings.enterprise_feature_title_1 || publicSettings['enterpriseFeatureCards.0.title']) && (
                <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200">
                  <div className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center" 
                      style={{ backgroundColor: brandColors.primary.extraLight }}>
                    {(() => {
                      const icon = publicSettings['enterpriseFeatureCards.0.icon'] || publicSettings.enterprise_feature_icon_1 || "zap";
                      switch (icon) {
                        case "zap": return <Zap className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "cpu": return <Cpu className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "globe": return <Globe className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "shield": return <Shield className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        default: return <Zap className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                      }
                    })()}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{publicSettings['enterpriseFeatureCards.0.title'] || publicSettings.enterprise_feature_title_1 || "KVM Performance"}</h3>
                  <p className="text-gray-600">{publicSettings['enterpriseFeatureCards.0.description'] || publicSettings.enterprise_feature_description_1 || "Leveraging powerful KVM virtualization and Network SATA for superior speed and responsiveness."}</p>
                </div>
              )}
              
              {/* Second feature card - dynamic from settings */}
              {(publicSettings.enterprise_feature_title_2 || publicSettings['enterpriseFeatureCards.1.title']) && (
                <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200">
                  <div className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center" 
                      style={{ backgroundColor: brandColors.primary.extraLight }}>
                    {(() => {
                      const icon = publicSettings['enterpriseFeatureCards.1.icon'] || publicSettings.enterprise_feature_icon_2 || "cpu";
                      switch (icon) {
                        case "zap": return <Zap className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "cpu": return <Cpu className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "globe": return <Globe className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "shield": return <Shield className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        default: return <Cpu className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                      }
                    })()}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{publicSettings['enterpriseFeatureCards.1.title'] || publicSettings.enterprise_feature_title_2 || "VirtFusion Control"}</h3>
                  <p className="text-gray-600">{publicSettings['enterpriseFeatureCards.1.description'] || publicSettings.enterprise_feature_description_2 || "Manage your VPS effortlessly with our modern control panel: boot, reboot, reinstall, console access, and more."}</p>
                </div>
              )}
              
              {/* Third feature card - dynamic from settings */}
              {(publicSettings.enterprise_feature_title_3 || publicSettings['enterpriseFeatureCards.2.title']) && (
                <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200">
                  <div className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center" 
                      style={{ backgroundColor: brandColors.primary.extraLight }}>
                    {(() => {
                      const icon = publicSettings['enterpriseFeatureCards.2.icon'] || publicSettings.enterprise_feature_icon_3 || "globe";
                      switch (icon) {
                        case "zap": return <Zap className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "cpu": return <Cpu className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "globe": return <Globe className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "shield": return <Shield className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        default: return <Globe className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                      }
                    })()}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{publicSettings['enterpriseFeatureCards.2.title'] || publicSettings.enterprise_feature_title_3 || "Flexible Connectivity"}</h3>
                  <p className="text-gray-600">{publicSettings['enterpriseFeatureCards.2.description'] || publicSettings.enterprise_feature_description_3 || "Get connected with NAT IPv4 (20 ports included) and a dedicated /80 IPv6 subnet for future-proofing."}</p>
                </div>
              )}
              
              {/* Fourth feature card - dynamic from settings */}
              {(publicSettings.enterprise_feature_title_4 || publicSettings['enterpriseFeatureCards.3.title']) && (
                <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-200">
                  <div className="w-12 h-12 rounded-lg mb-6 flex items-center justify-center" 
                      style={{ backgroundColor: brandColors.primary.extraLight }}>
                    {(() => {
                      const icon = publicSettings['enterpriseFeatureCards.3.icon'] || publicSettings.enterprise_feature_icon_4 || "shield";
                      switch (icon) {
                        case "zap": return <Zap className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "cpu": return <Cpu className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "globe": return <Globe className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        case "shield": return <Shield className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                        default: return <Shield className="h-6 w-6" style={{ color: brandColors.primary.full }} />;
                      }
                    })()}
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-gray-900">{publicSettings['enterpriseFeatureCards.3.title'] || publicSettings.enterprise_feature_title_4 || "Easy OS Deployment"}</h3>
                  <p className="text-gray-600">{publicSettings['enterpriseFeatureCards.3.description'] || publicSettings.enterprise_feature_description_4 || "Quickly deploy your preferred operating system using a wide range of templates available via VirtFusion."}</p>
                </div>
              )}
            </div>
          </div>
        </section>
        
        {/* Infrastructure Showcase Section */}
        <section className="py-20 px-6 bg-gray-50">
          <div className="container mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">
                Global Infrastructure
              </h2>
              <p className="text-lg text-gray-600">
                Deploy your services on our worldwide network of high-performance data centers.
              </p>
            </div>
            
            {/* Interactive Datacenter Map with List Selection */}
            <div className="mb-16">
              <DatacenterLeafletMap />
            </div>
            
            {/* Dynamic Region Cards from API */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
              {/* Fetch datacenter locations */}
              {(() => {
                // Fetch locations from API
                const { data: locations = [] } = useQuery<{
                  id: number;
                  name: string;
                  code: string;
                  city: string;
                  country: string;
                  regionName: string;
                  regionCode: string;
                  isActive: boolean;
                }[]>({
                  queryKey: ["/api/datacenter-locations"],
                  refetchOnWindowFocus: false,
                  staleTime: 1000 * 60 * 5, // 5 minutes
                });
                
                // Group locations by region
                const groupedByRegion = locations.reduce((acc, location) => {
                  const region = location.regionCode;
                  if (!acc[region]) {
                    acc[region] = [];
                  }
                  acc[region].push(location);
                  return acc;
                }, {} as Record<string, any[]>);
                
                // Define region display order and info
                const regions = [
                  { code: 'NA', name: 'North America', color: '#3b82f6' },
                  { code: 'EU', name: 'Europe', color: '#22c55e' },
                  { code: 'APAC', name: 'Asia-Pacific', color: '#a855f7' }
                ];
                
                return regions.map(region => {
                  const regionLocations = groupedByRegion[region.code] || [];
                  
                  return (
                    <div key={region.code} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                      <h3 className="text-xl font-bold mb-6 text-gray-900 flex items-center">
                        <div className="w-10 h-10 rounded-full mr-3 flex items-center justify-center" 
                            style={{ backgroundColor: brandColors.primary.extraLight }}>
                          <span className="font-bold" style={{ color: brandColors.primary.full }}>{region.code === 'APAC' ? 'AP' : region.code}</span>
                        </div>
                        {region.name}
                      </h3>
                      <ul className="space-y-3">
                        {regionLocations.length > 0 ? (
                          regionLocations.map(location => (
                            <li key={location.id} className="flex items-center">
                              <CheckCircle className="h-5 w-5 mr-3" style={{ color: location.isActive ? brandColors.primary.full : '#9ca3af' }} />
                              <span className="text-gray-700">{location.city}, {location.country}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-500">No locations available in this region</li>
                        )}
                      </ul>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-20 px-6" style={{ backgroundColor: brandColors.primary.extraLight }}>
          <div className="container mx-auto">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-gray-700 mb-8">
                Join thousands of businesses that trust {companyName} for their cloud infrastructure needs.
              </p>
              
              {user ? (
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button
                    className="w-full sm:w-auto text-white"
                    style={{ backgroundColor: brandColors.primary.full }}
                    onClick={() => window.location.href = "/dashboard"}
                  >
                    Go to Dashboard
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <Button
                    className="w-full sm:w-auto text-white"
                    style={{ backgroundColor: brandColors.primary.full }}
                    onClick={() => window.location.href = "/auth"}
                  >
                    Sign up now
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto transition-all"
                    style={{ 
                      borderColor: brandColors.primary.full, 
                      color: brandColors.primary.full 
                    }}
                    onClick={() => window.location.href = "/plans"}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = brandColors.primary.light;
                      e.currentTarget.style.borderColor = brandColors.primary.full;
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.borderColor = brandColors.primary.full;
                      e.currentTarget.style.color = brandColors.primary.full;
                    }}
                  >
                    View Pricing
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      </PublicLayout>
    </>
  );
}