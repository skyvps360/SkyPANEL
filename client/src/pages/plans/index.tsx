import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Check, Loader2, Server } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import * as LucideIcons from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PlanFeature } from '@shared/schema';
import { getBrandColors } from '@/lib/brand-theme';

interface PackageCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
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
  const [cpuFilter, setCpuFilter] = useState<number>(0);
  const [ramFilter, setRamFilter] = useState<number>(0);
  const [storageFilter, setStorageFilter] = useState<number>(0);
  const [bandwidthFilter, setBandwidthFilter] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null); // ENHANCED: Added category filtering
  const [showAllPlans, setShowAllPlans] = useState<boolean>(true);
  
  // Max values for sliders based on available plans
  const [maxCpu, setMaxCpu] = useState<number>(16);
  const [maxRam, setMaxRam] = useState<number>(64);
  const [maxStorage, setMaxStorage] = useState<number>(3200);
  const [maxBandwidth, setMaxBandwidth] = useState<number>(10000);
  
  // Fetch branding data for custom styles
  const { data: brandingData = { 
    company_color: '', 
    company_name: '',
    primary_color: '',
    secondary_color: '',
    accent_color: '' 
  } } = useQuery({
    queryKey: ['/api/settings/branding'],
    staleTime: 24 * 60 * 60 * 1000, // 24 hours
  });
  
  // Get brand colors from branding data using new color system
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

  // Fetch package categories (ENHANCED: Added category filtering)
  const { data: categories } = useQuery<PackageCategory[]>({
    queryKey: ['/api/public/package-categories'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Calculate max values from packages for sliders
  useEffect(() => {
    if (packages && packages.length > 0) {
      // Find max values for each spec
      const maxCpuValue = Math.max(...packages.map(p => p.cpuCores));
      const maxRamValue = Math.max(...packages.map(p => p.memory / 1024)); // Convert to GB
      const maxStorageValue = Math.max(...packages.map(p => p.primaryStorage));
      const maxBandwidthValue = Math.max(...packages.map(p => p.traffic));
      
      // Round up to nearest multiple for better slider increments
      setMaxCpu(maxCpuValue);
      setMaxRam(Math.ceil(maxRamValue));
      setMaxStorage(Math.ceil(maxStorageValue / 100) * 100); // Round to nearest 100
      setMaxBandwidth(Math.ceil(maxBandwidthValue / 1000) * 1000); // Round to nearest 1000
    }
  }, [packages]);
  
  // Fetch plan features (only reload on page refresh)
  const { 
    data: planFeaturesData, 
    isLoading: featuresLoading
  } = useQuery<PlanFeature[]>({
    queryKey: ['/api/plan-features'],
    retry: 1,
    staleTime: Infinity, // Keep data fresh forever (until page refresh)
    refetchOnMount: false, // Don't refetch when component mounts after initial load
    refetchOnWindowFocus: false, // Don't refetch when window gets focus
  });
  
  // Ensure planFeatures is always an array
  const planFeatures = Array.isArray(planFeaturesData) ? planFeaturesData : [];
  
  // Fetch FAQs
  const { data: faqs = [], isLoading: faqsLoading } = useQuery<any[]>({
    queryKey: ['/api/faqs'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Plan features now only reload on page refresh, no auto-refresh needed
  
  // Setup pricing data, either from API or defaults
  useEffect(() => {
    if (pricingData) {
      setPackagePrices(pricingData);
    } else {
      setPackagePrices(DEFAULT_PRICES);
    }
  }, [pricingData]);
  
  // Calculate package display order (sort by memory size)
  const sortedPackages = packages ? [...packages].sort((a, b) => a.memory - b.memory) : [];
  
  // Format bandwidth from GB to TB when appropriate (ENHANCED: Handle unlimited bandwidth)
  const formatBandwidth = (gigabytes: number): string => {
    // Handle unlimited/unmetered bandwidth when traffic is 0
    if (gigabytes === 0) {
      return "Unlimited";
    }

    if (gigabytes >= 1000) {
      // Convert to TB with one decimal place
      return `${(gigabytes / 1000).toFixed(1)} TB/mo`;
    } else {
      return `${gigabytes} GB/mo`;
    }
  };
  
  // Format network speed from KB/s to GB/MB Port (matching packages page logic)
  const formatNetworkSpeed = (speed: number): string => {
    if (!speed || speed === 0) return '1 GB Port';
    
    // VirtFusion provides speed in KB/s, convert to GB
    // 125000 KB/s = 1 Gbps = 0.125 GB/s
    const gbSpeed = speed / 125000;
    
    if (gbSpeed < 1) {
      return `${(gbSpeed * 1000).toFixed(0)} MB Port`;
    } else {
      return `${gbSpeed.toFixed(0)} GB Port`;
    }
  };
  
  // Function to get price for a package, using the token conversion (100 tokens = $1.00)
  const getPackagePrice = (pkg: Package): number => {
    // Try to get price by package ID from pricing API
    const stringId = pkg.id.toString();
    if (packagePrices[stringId]) {
      return packagePrices[stringId];
    }
    
    // Try to get by package name
    if (packagePrices[pkg.name]) {
      return packagePrices[pkg.name];
    }
    
    // Try to get by partial name match
    const nameLower = pkg.name.toLowerCase();
    for (const key of Object.keys(packagePrices)) {
      if (nameLower.includes(key.toLowerCase())) {
        return packagePrices[key];
      }
    }
    
    // If we have tokens property (VirtFusion credit amount), convert to USD
    if ((pkg as any).tokens) {
      return Number(((pkg as any).tokens / 100).toFixed(2));
    }
    
    console.log(`No pricing found for package ${pkg.id} / ${pkg.name}. Available pricing:`, packagePrices);
    
    // Default price if no match using our pricing matrix
    const pricingMatrix: Record<number, number> = {
      1024: 5.99,  // 1GB RAM
      2048: 9.99,  // 2GB RAM
      4096: 19.99, // 4GB RAM
      8192: 39.99, // 8GB RAM
      16384: 79.99 // 16GB RAM
    };
    
    return pricingMatrix[pkg.memory] || 9.99;
  };
  
  return (
    <PublicLayout>
      <div className="w-full">
        {/* Hero section with colored background - matching blog, docs, status, and speed-test pages */}
        <div style={{ backgroundColor: brandColors.primary.full }} className="relative overflow-hidden w-full">
          {/* Decorative bubbles in the background, matching other pages */}
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

          <div className="max-w-screen-xl mx-auto py-16 px-4 sm:px-6 relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center mb-6">
                <div
                  className="p-3 rounded-full mr-4"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Server className="h-8 w-8 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                  Our VPS Plans
                </h1>
              </div>
              <p className="text-white text-lg opacity-90 max-w-xl">
                Choose the perfect VPS plan for your needs with our range of high-performance options.
                All plans include 24/7 support, 99.9% uptime guarantee, and enterprise-grade security.
              </p>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 py-12">
        
        {/* Filters for VPS Configuration */}
        <div className="mb-16 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h3 className="text-xl font-medium mb-6">Customize Your Requirements</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
            {/* Category Filter (ENHANCED: Added category filtering) */}
            {categories && categories.length > 0 && (
              <div className="lg:col-span-1">
                <div className="flex justify-between mb-2">
                  <label className="font-medium">Category</label>
                  <span className="text-gray-600">{categoryFilter ? categories.find(c => c.id === categoryFilter)?.name : 'All Categories'}</span>
                </div>
                <Select
                  value={categoryFilter ? categoryFilter.toString() : "all"}
                  onValueChange={(value) => {
                    setCategoryFilter(value === "all" ? null : parseInt(value));
                    setShowAllPlans(false);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* CPU Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">CPU Cores</label>
                <span className="text-gray-600">{cpuFilter === 0 ? 'Any' : `${cpuFilter}+ vCPU`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={maxCpu} 
                step="1" 
                value={cpuFilter} 
                onChange={(e) => {
                  setCpuFilter(Number(e.target.value));
                  setShowAllPlans(false);
                }}
                className="w-full accent-blue-600" 
                style={{ accentColor: brandColors.primary.full }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Any</span>
                <span>{maxCpu}+ vCPU</span>
              </div>
            </div>
            
            {/* RAM Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">Memory (RAM)</label>
                <span className="text-gray-600">{ramFilter === 0 ? 'Any' : `${ramFilter}+ GB`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={maxRam} 
                step="1" 
                value={ramFilter} 
                onChange={(e) => {
                  setRamFilter(Number(e.target.value));
                  setShowAllPlans(false);
                }}
                className="w-full" 
                style={{ accentColor: brandColors.primary.full }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Any</span>
                <span>{maxRam}+ GB</span>
              </div>
            </div>
            
            {/* Storage Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">Storage</label>
                <span className="text-gray-600">{storageFilter === 0 ? 'Any' : `${storageFilter}+ GB`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={maxStorage} 
                step={maxStorage > 1000 ? 100 : 10} 
                value={storageFilter} 
                onChange={(e) => {
                  setStorageFilter(Number(e.target.value));
                  setShowAllPlans(false);
                }}
                className="w-full" 
                style={{ accentColor: brandColors.primary.full }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Any</span>
                <span>{maxStorage}+ GB</span>
              </div>
            </div>
            
            {/* Bandwidth Slider */}
            <div>
              <div className="flex justify-between mb-2">
                <label className="font-medium">Bandwidth</label>
                <span className="text-gray-600">{bandwidthFilter === 0 ? 'Any' : `${bandwidthFilter}+ GB`}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max={maxBandwidth} 
                step={maxBandwidth > 1000 ? 500 : 100} 
                value={bandwidthFilter} 
                onChange={(e) => {
                  setBandwidthFilter(Number(e.target.value));
                  setShowAllPlans(false);
                }}
                className="w-full" 
                style={{ accentColor: brandColors.primary.full }}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Any</span>
                <span>{maxBandwidth >= 1000 ? `${(maxBandwidth/1000).toFixed(1)} TB` : `${maxBandwidth} GB`}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => {
                setCpuFilter(0);
                setRamFilter(0);
                setStorageFilter(0);
                setBandwidthFilter(0);
                setCategoryFilter(null); // ENHANCED: Reset category filter
                setShowAllPlans(true);
              }}
              className="text-sm"
            >
              Reset Filters
            </Button>
            
            <div className="text-sm text-gray-600">
              {showAllPlans ? 'Showing all available plans' : 'Filtering based on requirements'}
            </div>
          </div>
        </div>
      
        {packagesError ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold text-red-600 mb-2">Unable to load packages</h3>
            <p className="text-gray-600">
              We're experiencing issues retrieving our plan information. Please try again later.
            </p>
          </div>
        ) : packagesLoading ? (
          <div className="w-full border border-gray-200 rounded-lg p-4">
            <Skeleton className="h-8 w-full mb-8" />
            <div className="grid grid-cols-6 gap-4 mb-4">
              <Skeleton className="h-6 col-span-2" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="grid grid-cols-6 gap-4 py-4 border-t border-gray-100">
                <Skeleton className="h-6 col-span-2" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
                <Skeleton className="h-6" />
              </div>
            ))}
          </div>
        ) : sortedPackages.length === 0 ? (
          <div className="text-center py-8">
            <h3 className="text-xl font-semibold mb-2">No packages available</h3>
            <p className="text-gray-600">
              We don't have any packages available at the moment. Please check back later.
            </p>
          </div>
        ) : (
          <div className="w-full max-w-6xl mx-auto">
            {/* Filtered plans notice */}
            {!showAllPlans && (
              <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                <LucideIcons.Info className="text-blue-500 mr-2" size={16} />
                <span>
                  {sortedPackages.filter(pkg =>
                    (cpuFilter === 0 || pkg.cpuCores >= cpuFilter) &&
                    (ramFilter === 0 || pkg.memory/1024 >= ramFilter) &&
                    (storageFilter === 0 || pkg.primaryStorage >= storageFilter) &&
                    (bandwidthFilter === 0 || pkg.traffic >= bandwidthFilter || pkg.traffic === 0) &&
                    (categoryFilter === null || pkg.category?.id === categoryFilter)
                  ).length} plans match your criteria
                </span>
              </div>
            )}
            
            {/* Plans Comparison - Desktop Table (hidden on mobile) */}
            <div className="hidden md:block w-full overflow-x-auto border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left p-4 font-medium text-gray-700">Plan Name</th>
                    <th className="text-center p-4 font-medium text-gray-700">CPU</th>
                    <th className="text-center p-4 font-medium text-gray-700">RAM</th>
                    <th className="text-center p-4 font-medium text-gray-700">Storage</th>
                    <th className="text-center p-4 font-medium text-gray-700">Bandwidth</th>
                    <th className="text-center p-4 font-medium text-gray-700">Network</th>
                    <th className="text-right p-4 font-medium text-gray-700">Price</th>
                    <th className="text-center p-4 font-medium text-gray-700">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPackages
                    .filter(pkg =>
                      showAllPlans || (
                        (cpuFilter === 0 || pkg.cpuCores >= cpuFilter) &&
                        (ramFilter === 0 || pkg.memory/1024 >= ramFilter) &&
                        (storageFilter === 0 || pkg.primaryStorage >= storageFilter) &&
                        (bandwidthFilter === 0 || pkg.traffic >= bandwidthFilter || pkg.traffic === 0) &&
                        (categoryFilter === null || pkg.category?.id === categoryFilter)
                      )
                    )
                    .map((pkg, index) => (
                      <tr 
                        key={pkg.id} 
                        className={`hover:bg-gray-50 border-b border-gray-200 ${!pkg.enabled ? 'bg-amber-50/30' : ''}`}
                      >
                        <td className="p-4">
                          <div className="font-medium" style={{ color: brandColors.primary.full }}>{pkg.name}</div>
                          {!pkg.enabled && (
                            <span className="inline-block bg-amber-100 text-amber-800 text-xs py-0.5 px-2 rounded-full">
                              Unavailable
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">{pkg.cpuCores} vCPU</td>
                        <td className="p-4 text-center">{pkg.memory / 1024} GB</td>
                        <td className="p-4 text-center">{pkg.primaryStorage} GB</td>
                        <td className="p-4 text-center">{formatBandwidth(pkg.traffic)}</td>
                        <td className="p-4 text-center">{formatNetworkSpeed(pkg.primaryNetworkSpeedIn)}</td>
                        <td className="p-4 text-right font-bold">${getPackagePrice(pkg).toFixed(2)}/mo</td>
                        <td className="p-4 text-center">
                          {pkg.enabled ? (
                            <Button 
                              className="w-full md:w-auto"
                              style={{
                                background: brandColors.gradient.primary,
                                color: 'white'
                              }}
                              size="sm"
                              asChild
                            >
                              <Link href="/billing">Order</Link>
                            </Button>
                          ) : (
                            <Button 
                              className="w-full md:w-auto bg-amber-50 text-amber-800 border border-amber-300" 
                              variant="outline" 
                              size="sm"
                              disabled
                            >
                              Unavailable
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View (hidden on desktop) */}
            <div className="md:hidden space-y-4">
              {sortedPackages
                .filter(pkg =>
                  showAllPlans || (
                    (cpuFilter === 0 || pkg.cpuCores >= cpuFilter) &&
                    (ramFilter === 0 || pkg.memory/1024 >= ramFilter) &&
                    (storageFilter === 0 || pkg.primaryStorage >= storageFilter) &&
                    (bandwidthFilter === 0 || pkg.traffic >= bandwidthFilter || pkg.traffic === 0) &&
                    (categoryFilter === null || pkg.category?.id === categoryFilter)
                  )
                )
                .map((pkg) => (
                  <div 
                    key={pkg.id}
                    className={`p-4 border rounded-lg ${!pkg.enabled ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-lg" style={{ color: brandColors.primary.full }}>{pkg.name}</div>
                        {!pkg.enabled && (
                          <span className="inline-block bg-amber-100 text-amber-800 text-xs py-0.5 px-2 rounded-full">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">${getPackagePrice(pkg).toFixed(2)}/mo</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="py-1">
                        <span className="text-gray-500">CPU:</span> {pkg.cpuCores} vCPU
                      </div>
                      <div className="py-1">
                        <span className="text-gray-500">RAM:</span> {pkg.memory / 1024} GB
                      </div>
                      <div className="py-1">
                        <span className="text-gray-500">Storage:</span> {pkg.primaryStorage} GB
                      </div>
                      <div className="py-1">
                        <span className="text-gray-500">Bandwidth:</span> {formatBandwidth(pkg.traffic)}
                      </div>
                      <div className="py-1 col-span-2">
                        <span className="text-gray-500">Network:</span> {formatNetworkSpeed(pkg.primaryNetworkSpeedIn)}
                      </div>
                    </div>
                    
                    {pkg.enabled ? (
                      <Button 
                        className="w-full"
                        style={{
                          background: brandColors.gradient.primary,
                          color: 'white'
                        }}
                        size="sm"
                        asChild
                      >
                        <Link href="/auth">Order Now</Link>
                      </Button>
                    ) : (
                      <Button 
                        className="w-full bg-amber-50 text-amber-800 border border-amber-300" 
                        variant="outline" 
                        size="sm"
                        disabled
                      >
                        Unavailable
                      </Button>
                    )}
                  </div>
                ))}
              
              {/* No matching plans */}
              {!sortedPackages.some(pkg => 
                showAllPlans || (
                  (cpuFilter === 0 || pkg.cpuCores >= cpuFilter) &&
                  (ramFilter === 0 || pkg.memory/1024 >= ramFilter) &&
                  (storageFilter === 0 || pkg.primaryStorage >= storageFilter) &&
                  (bandwidthFilter === 0 || pkg.traffic >= bandwidthFilter || pkg.traffic === 0)
                )
              ) && (
                <div className="p-6 text-center">
                  <p className="text-gray-600">No plans match your current requirements.</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setCpuFilter(0);
                      setRamFilter(0);
                      setStorageFilter(0);
                      setBandwidthFilter(0);
                      setShowAllPlans(true);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Features section */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">All Plans Include</h2>
          
          {featuresLoading ? (
            <div>
              <Skeleton className="h-10 w-full mb-4" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            </div>
          ) : !planFeatures || planFeatures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">
                Our plan features are currently being updated. Please check back soon.
              </p>
            </div>
          ) : (
            <div>
              <div 
                className="text-white text-center py-3 mb-4 rounded-sm"
                style={{ background: brandColors.primary.full }}
              >
                <h3 className="font-medium">ALL PLANS INCLUDE</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {planFeatures.map((feature) => {
                  // Convert kebab-case icon names to PascalCase for Lucide icons
                  const iconName = feature.icon ? feature.icon
                    .split('-')
                    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                    .join('') : 'Server';
                  
                  // Get the icon component dynamically from Lucide icons
                  const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Server;
                  
                  return (
                    <div key={feature.id} className="flex items-start mb-2 py-1">
                      <IconComponent 
                        style={{ color: brandColors.primary.full }} 
                        className="mr-3 flex-shrink-0 mt-1" 
                        size={16} 
                      />
                      <div>
                        <span className="font-medium">{feature.title}</span>
                        {feature.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">{feature.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* FAQ */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
          
          {faqsLoading ? (
            <div className="max-w-4xl mx-auto">
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
              <Skeleton className="h-12 w-full mb-4" />
              <Skeleton className="h-24 w-full mb-4" />
            </div>
          ) : !faqs || !Array.isArray(faqs) || faqs.length === 0 ? (
            <div className="max-w-4xl mx-auto">
              {/* Show default FAQs if no FAQs from database */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Can I upgrade my plan later?</AccordionTrigger>
                  <AccordionContent>
                    Yes, you can easily upgrade your VPS plan at any time from your client dashboard.
                    The upgrade process is seamless with minimal downtime.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-2">
                  <AccordionTrigger>What operating systems are supported?</AccordionTrigger>
                  <AccordionContent>
                    We support a wide range of operating systems including various Linux distributions 
                    (Ubuntu, CentOS, Debian) and Windows Server options.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-3">
                  <AccordionTrigger>Do you offer managed services?</AccordionTrigger>
                  <AccordionContent>
                    Yes, we offer managed services for an additional fee. This includes server setup,
                    security hardening, and regular maintenance.
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="item-4">
                  <AccordionTrigger>What is your uptime guarantee?</AccordionTrigger>
                  <AccordionContent>
                    We offer a 99.9% uptime guarantee for all VPS plans. If we fail to meet this guarantee,
                    you'll receive credit according to our SLA terms.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              {/* Group FAQs by category */}
              {(() => {
                // Create FAQ categories object
                const faqsByCategory = Array.isArray(faqs) ? faqs.reduce((acc: Record<string, any[]>, faq: any) => {
                  const category = faq.category || 'general';
                  if (!acc[category]) {
                    acc[category] = [];
                  }
                  acc[category].push(faq);
                  return acc;
                }, {}) : {};
                
                // Sort categories to ensure 'general' comes first if it exists
                const sortedCategories = Object.keys(faqsByCategory).sort((a, b) => {
                  if (a === 'general') return -1;
                  if (b === 'general') return 1;
                  return a.localeCompare(b);
                });
                
                return sortedCategories.map((category) => (
                  <div key={category} className="mb-8">
                    {sortedCategories.length > 1 && (
                      <h3 className="text-xl font-medium mb-4 capitalize">{category}</h3>
                    )}
                    
                    <Accordion type="single" collapsible className="w-full">
                      {faqsByCategory[category]
                        .filter((faq: any) => faq.isActive)
                        .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                        .map((faq: any) => (
                          <AccordionItem key={`faq-${faq.id}`} value={`faq-${faq.id}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>
                              <div dangerouslySetInnerHTML={{ __html: faq.answer.replace(/\n/g, '<br />') }} />
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </div>
                ));
              })()}
            </div>
          )}
        </div>
      </div>
      </div>
    </PublicLayout>
  );
}
