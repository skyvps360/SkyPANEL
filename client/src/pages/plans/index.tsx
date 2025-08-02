import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Loader2, Server, Zap, Users, Award, Check, Star, ArrowRight, Shield, Clock, Globe, HardDrive, Cpu, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanCard } from '@/components/plans/PlanCard';
import { PlanFilters } from '@/components/plans/PlanFilters';  
import { PlanFeatures } from '@/components/plans/PlanFeatures';
import { PlanFAQ } from '@/components/plans/PlanFAQ';
import { usePlanFilters } from '@/hooks/use-plan-filters';
import { PlanFeature } from '@shared/schema';
import { getBrandColors, getPatternBackgrounds } from '@/lib/brand-theme';
import HubSpotChat from '@/components/HubSpotChat';
import { GoogleAnalyticsTracker } from '../../components/GoogleAnalyticsTracker';

interface PackageCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface SlaPlan {
  id: number;
  name: string;
  description: string | null;
  price: string;
  uptime_guarantee_percentage: number;
  response_time_hours: number;
  is_active: boolean;
}

interface Package {
  id: number;
  name: string;
  description: string | null;
  enabled: boolean;
  memory: number;
  primaryStorage: number;
  traffic: number;
  cpuCores: number;
  primaryNetworkSpeedIn: number;
  primaryNetworkSpeedOut: number;
  primaryDiskType: string;
  category?: PackageCategory | null;
  sla?: SlaPlan | null;
  sla_plan?: SlaPlan | null;
}

// Default pricing for packages if no pricing data is available
const DEFAULT_PRICES = {
  'starter': 5.99,
  'basic': 9.99,
  'standard': 19.99,
  'premium': 39.99,
  'enterprise': 79.99
};

export default function PlansPage() {
  const [packagePrices, setPackagePrices] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  
  // Fetch branding data for custom styles
  const { data: brandingData = { 
    company_color: '', 
    company_name: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '' 
  } } = useQuery<{
    company_color: string;
    company_name: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ['/api/settings/branding'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Get brand colors from branding data
  const brandColors = getBrandColors({
    primaryColor: brandingData.primary_color || brandingData.company_color,
    secondaryColor: brandingData.secondary_color,
    accentColor: brandingData.accent_color
  });

  // Get pattern backgrounds for visual elements
  const patterns = getPatternBackgrounds({
    primaryColor: brandingData.primary_color || brandingData.company_color
  });
  
  // Fetch VirtFusion packages
  const { data: packages, isLoading: packagesLoading, error: packagesError } = useQuery<Package[]>({
    queryKey: ['/api/public/packages'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch package pricing data
  const { data: pricingData } = useQuery<Record<string, number>>({
    queryKey: ['/api/public/package-pricing'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch package categories
  const { data: categories } = useQuery<PackageCategory[]>({
    queryKey: ['/api/public/package-categories'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch plan features
  const { 
    data: planFeaturesData, 
    isLoading: featuresLoading
  } = useQuery<PlanFeature[]>({
    queryKey: ['/api/plan-features'],
    retry: 1,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  
  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<any[]>({
    queryKey: ['/api/faqs'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Use the custom hook for filtering
  const {
    filters,
    setCpuFilter,
    setRamFilter,
    setStorageFilter,
    setBandwidthFilter,
    setCategoryFilter,
    maxCpu,
    maxRam,
    maxStorage,
    maxBandwidth,
    enhancedPackages,
    resetFilters,
    onFilterChange,
    hasActiveFilters,
    totalCount,
    filteredCount,
  } = usePlanFilters(packages);
  
  // Setup pricing data
  useEffect(() => {
    if (pricingData) {
      setPackagePrices(pricingData);
    } else {
      setPackagePrices(DEFAULT_PRICES);
    }
  }, [pricingData]);
  
  // Get package price
  const getPackagePrice = (pkg: Package): number => {
    const priceKey = pkg.name.toLowerCase().replace(/\s+/g, '_');
    return packagePrices[priceKey] || packagePrices[pkg.name] || 29.99;
  };
  
  // Handle order action
  const handleOrder = (pkg: Package) => {
    // Navigate to billing/order page or auth page
    window.location.href = '/auth';
  };

  // Determine popular and recommended plans
  const getPlanBadges = (pkg: Package, index: number) => {
    const isPopular = pkg.name.toLowerCase().includes('standard') || index === 1;
    const isRecommended = pkg.name.toLowerCase().includes('premium') || index === 2;
    return { isPopular, isRecommended };
  };

  return (
    <>
      <GoogleAnalyticsTracker />
      <PublicLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section */}
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
          
          <div className="max-w-screen-xl mx-auto py-20 px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-8">
                <div
                  className="p-4 rounded-full mr-6"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Server className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                  Choose Your Perfect VPS Plan
                </h1>
              </div>
              <p className="text-white text-xl opacity-95 max-w-3xl mx-auto leading-relaxed mb-12">
                High-performance virtual private servers with enterprise-grade infrastructure, 
                24/7 expert support, and flexible configurations to meet your specific needs.
              </p>
              
              {/* Key Benefits Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Instant Deployment</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">24/7 Expert Support</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">99.9% Uptime SLA</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Enterprise Security</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* View Mode Toggle */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <h2 className="text-3xl font-bold text-gray-900">Available Plans</h2>
              {hasActiveFilters && (
                <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                  {filteredCount} of {totalCount} plans
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="text-xs"
                style={{
                  backgroundColor: viewMode === 'cards' ? brandColors.primary.full : 'transparent',
                  color: viewMode === 'cards' ? 'white' : brandColors.primary.full
                }}
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs"
                style={{
                  backgroundColor: viewMode === 'table' ? brandColors.primary.full : 'transparent',
                  color: viewMode === 'table' ? 'white' : brandColors.primary.full
                }}
              >
                Table
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          <div className="mb-12">
            <PlanFilters
              cpuFilter={filters.cpuFilter}
              ramFilter={filters.ramFilter}
              storageFilter={filters.storageFilter}
              bandwidthFilter={filters.bandwidthFilter}
              categoryFilter={filters.categoryFilter}
              setCpuFilter={setCpuFilter}
              setRamFilter={setRamFilter}
              setStorageFilter={setStorageFilter}
              setBandwidthFilter={setBandwidthFilter}
              setCategoryFilter={setCategoryFilter}
              maxCpu={maxCpu}
              maxRam={maxRam}
              maxStorage={maxStorage}
              maxBandwidth={maxBandwidth}
              categories={categories}
              brandColors={brandColors}
              onFilterChange={onFilterChange}
              onResetFilters={resetFilters}
              filteredCount={filteredCount}
              totalCount={totalCount}
            />
          </div>

          {/* Plans Section */}
          {packagesError ? (
            <Alert className="mb-8">
              <AlertDescription>
                <div className="text-center py-12">
                  <Server className="w-16 h-16 mx-auto mb-4 text-red-500" />
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load packages</h3>
                  <p className="text-gray-600">
                    We're experiencing issues retrieving our plan information. Please try again later.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : packagesLoading ? (
            <div className="mb-16">
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-12 w-24" />
                        <div className="space-y-2">
                          {[1, 2, 3, 4, 5].map(j => (
                            <Skeleton key={j} className="h-4 w-full" />
                          ))}
                        </div>
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                  <div className="p-6">
                    <div className="grid grid-cols-9 gap-4 mb-4 pb-3 border-b">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="grid grid-cols-9 gap-4 py-4 border-b last:border-b-0">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-4 w-8 mx-auto" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                        <Skeleton className="h-4 w-16 mx-auto" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                        <div className="flex flex-col items-center space-y-1">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-3 w-12" />
                        </div>
                        <Skeleton className="h-8 w-20 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : enhancedPackages.length === 0 ? (
            <div className="text-center py-16">
              <Server className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-semibold mb-4">No plans match your criteria</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters to see more options.
              </p>
              <Button 
                onClick={resetFilters} 
                variant="outline"
                style={{
                  borderColor: brandColors.primary.medium,
                  color: brandColors.primary.full
                }}
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Filtered plans notice */}
              {hasActiveFilters && (
                <Alert className="mb-8">
                  <AlertDescription className="flex items-center">
                    <Check className="w-4 h-4 mr-2" />
                    <span>
                      Showing {filteredCount} plan{filteredCount !== 1 ? 's' : ''} that match your requirements
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Plans Display */}
              {viewMode === 'cards' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-16">
                  {enhancedPackages.map((pkg, index) => {
                    const { isPopular, isRecommended } = getPlanBadges(pkg, index);
                    return (
                      <PlanCard
                        key={pkg.id}
                        package={pkg}
                        price={getPackagePrice(pkg)}
                        isPopular={isPopular}
                        isRecommended={isRecommended}
                        brandColors={brandColors}
                        onOrder={handleOrder}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="mb-16">
                  <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left p-6 font-semibold text-gray-900">Plan</th>
                          <th className="text-center p-6 font-semibold text-gray-900">CPU</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Memory</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Storage</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Bandwidth</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Network</th>
                          <th className="text-center p-6 font-semibold text-gray-900">SLA</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Price</th>
                          <th className="text-center p-6 font-semibold text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enhancedPackages.map((pkg) => (
                          <tr key={pkg.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="p-6">
                              <div>
                                <h3 className="font-semibold text-gray-900">{pkg.name}</h3>
                                {pkg.description && (
                                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                                )}
                              </div>
                            </td>
                            <td className="text-center p-6">
                              <div className="flex items-center justify-center">
                                <Cpu className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="font-medium">{pkg.cpuCores} vCPU</span>
                              </div>
                            </td>
                            <td className="text-center p-6">
                              <div className="flex items-center justify-center">
                                <HardDrive className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="font-medium">{pkg.memory / 1024} GB</span>
                              </div>
                            </td>
                            <td className="text-center p-6">
                              <span className="font-medium">{pkg.primaryStorage} GB {pkg.primaryDiskType}</span>
                            </td>
                            <td className="text-center p-6">
                              <span className="font-medium">
                                {pkg.traffic === 0 ? 'Unlimited' : `${pkg.traffic} GB/mo`}
                              </span>
                            </td>
                            <td className="text-center p-6">
                              <div className="flex items-center justify-center">
                                <Wifi className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="font-medium">
                                  {pkg.primaryNetworkSpeedIn ? `${(pkg.primaryNetworkSpeedIn / 125000).toFixed(0)} GB` : '1 GB'} Port
                                </span>
                              </div>
                            </td>
                            <td className="text-center p-6">
                              {(pkg.sla ?? pkg.sla_plan) ? (
                                <span className="font-medium text-green-600">
                                  {(pkg.sla ?? pkg.sla_plan)?.uptime_guarantee_percentage}%
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                            <td className="text-center p-6">
                              <div className="text-center">
                                <div className="text-2xl font-bold" style={{ color: brandColors.primary.full }}>
                                  ${getPackagePrice(pkg).toFixed(2)}
                                </div>
                                <div className="text-sm text-gray-500">/month</div>
                              </div>
                            </td>
                            <td className="text-center p-6">
                              <Button
                                onClick={() => handleOrder(pkg)}
                                disabled={!pkg.enabled}
                                className="font-semibold"
                                style={{
                                  backgroundColor: pkg.enabled ? brandColors.primary.full : undefined,
                                  color: pkg.enabled ? 'white' : undefined
                                }}
                              >
                                {pkg.enabled ? 'Order Now' : 'Unavailable'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Features Section */}
        <PlanFeatures
          features={Array.isArray(planFeaturesData) ? planFeaturesData : []}
          isLoading={featuresLoading}
          brandColors={brandColors}
        />

        {/* FAQ Section */}
        <PlanFAQ
          faqs={faqs}
          isLoading={faqsLoading}
          brandColors={brandColors}
        />

        {/* HubSpot Chat Widget */}
        <HubSpotChat />
      </div>
    </PublicLayout>
    </>
  );
} 