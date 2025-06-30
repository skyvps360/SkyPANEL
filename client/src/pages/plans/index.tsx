import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Loader2, Server, Zap, Users, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PlanTable } from '@/components/plans/PlanTable';
import { PlanFilters } from '@/components/plans/PlanFilters';  
import { PlanFeatures } from '@/components/plans/PlanFeatures';
import { PlanFAQ } from '@/components/plans/PlanFAQ';
import { usePlanFilters } from '@/hooks/use-plan-filters';
import { PlanFeature } from '@shared/schema';
import { getBrandColors } from '@/lib/brand-theme';

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

  return (
    <PublicLayout>
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <div className="flex items-center justify-center mb-6">
              <Server className="w-12 h-12 mr-4" style={{ color: brandColors.primary.full }} />
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
                Choose Your Perfect VPS Plan
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              High-performance virtual private servers with enterprise-grade infrastructure, 
              24/7 support, and flexible configurations to meet your specific needs.
            </p>
            
            {/* Key Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="flex items-center justify-center space-x-3">
                <Zap className="w-6 h-6" style={{ color: brandColors.primary.full }} />
                <span className="font-semibold text-gray-700">Instant Deployment</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <Users className="w-6 h-6" style={{ color: brandColors.primary.full }} />
                <span className="font-semibold text-gray-700">24/7 Expert Support</span>
              </div>
              <div className="flex items-center justify-center space-x-3">
                <Award className="w-6 h-6" style={{ color: brandColors.primary.full }} />
                <span className="font-semibold text-gray-700">99.9% Uptime SLA</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Filter Section */}
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

          {/* Plans Section */}
          {packagesError ? (
            <Alert className="mb-8">
              <AlertDescription>
                <div className="text-center py-8">
                  <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load packages</h3>
                  <p className="text-gray-600">
                    We're experiencing issues retrieving our plan information. Please try again later.
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ) : packagesLoading ? (
            <div className="mb-16">
              <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  {/* Table Header Skeleton */}
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
                  {/* Table Rows Skeleton */}
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
            </div>
          ) : enhancedPackages.length === 0 ? (
            <div className="text-center py-16">
              <Server className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-2xl font-semibold mb-4">No plans match your criteria</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your filters to see more options.
              </p>
              <Button onClick={resetFilters} variant="outline">
                Reset All Filters
              </Button>
            </div>
          ) : (
            <>
              {/* Filtered plans notice */}
              {hasActiveFilters && (
                <Alert className="mb-8">
                  <AlertDescription className="flex items-center">
                    <span>
                      Showing {filteredCount} plan{filteredCount !== 1 ? 's' : ''} that match your requirements
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Plans Table */}
              <div className="mb-16">
                <PlanTable
                  packages={enhancedPackages}
                  getPackagePrice={getPackagePrice}
                  brandColors={brandColors}
                  onOrder={handleOrder}
                />
              </div>
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
      </div>
    </PublicLayout>
  );
} 