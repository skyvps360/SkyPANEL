import { useState, useMemo, useEffect } from 'react';

interface SlaPlan {
  id: number;
  name: string;
  description: string | null;
  price: string;
  uptime_guarantee_percentage: number;
  response_time_hours: number;
  is_active: boolean;
}

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
  sla?: SlaPlan | null;
  sla_plan?: SlaPlan | null;
}

interface PlanFiltersState {
  cpuFilter: number;
  ramFilter: number;
  storageFilter: number;
  bandwidthFilter: number;
  categoryFilter: number | null;
  showAllPlans: boolean;
}

export function usePlanFilters(packages: Package[] = []) {
  const [filters, setFilters] = useState<PlanFiltersState>({
    cpuFilter: 0,
    ramFilter: 0,
    storageFilter: 0,
    bandwidthFilter: 0,
    categoryFilter: null,
    showAllPlans: true,
  });

  // Calculate max values from packages for sliders
  const maxValues = useMemo(() => {
    if (!packages || packages.length === 0) {
      return {
        maxCpu: 16,
        maxRam: 64,
        maxStorage: 3200,
        maxBandwidth: 10000,
      };
    }

    const maxCpu = Math.max(...packages.map(p => p.cpuCores));
    const maxRam = Math.ceil(Math.max(...packages.map(p => p.memory / 1024)));
    const maxStorage = Math.ceil(Math.max(...packages.map(p => p.primaryStorage)) / 100) * 100;
    const maxBandwidth = Math.ceil(Math.max(...packages.map(p => p.traffic)) / 1000) * 1000;

    return {
      maxCpu,
      maxRam,
      maxStorage,
      maxBandwidth,
    };
  }, [packages]);

  // Sort packages by memory size
  const sortedPackages = useMemo(() => {
    return packages ? [...packages].sort((a, b) => a.memory - b.memory) : [];
  }, [packages]);

  // Filter packages based on current filters
  const filteredPackages = useMemo(() => {
    if (filters.showAllPlans) {
      return sortedPackages;
    }

    return sortedPackages.filter(pkg =>
      (filters.cpuFilter === 0 || pkg.cpuCores >= filters.cpuFilter) &&
      (filters.ramFilter === 0 || pkg.memory / 1024 >= filters.ramFilter) &&
      (filters.storageFilter === 0 || pkg.primaryStorage >= filters.storageFilter) &&
      (filters.bandwidthFilter === 0 || pkg.traffic >= filters.bandwidthFilter || pkg.traffic === 0) &&
      (filters.categoryFilter === null || pkg.category?.id === filters.categoryFilter)
    );
  }, [sortedPackages, filters]);

  // Determine popular and recommended plans
  const enhancedPackages = useMemo(() => {
    return filteredPackages.map((pkg, index) => ({
      ...pkg,
      isPopular: index === Math.floor(filteredPackages.length / 2), // Middle plan is popular
      isRecommended: index === 0 && filteredPackages.length > 2, // First plan for small sets
    }));
  }, [filteredPackages]);

  // Filter setters with automatic showAllPlans update
  const setCpuFilter = (value: number) => {
    setFilters(prev => ({ ...prev, cpuFilter: value, showAllPlans: false }));
  };

  const setRamFilter = (value: number) => {
    setFilters(prev => ({ ...prev, ramFilter: value, showAllPlans: false }));
  };

  const setStorageFilter = (value: number) => {
    setFilters(prev => ({ ...prev, storageFilter: value, showAllPlans: false }));
  };

  const setBandwidthFilter = (value: number) => {
    setFilters(prev => ({ ...prev, bandwidthFilter: value, showAllPlans: false }));
  };

  const setCategoryFilter = (value: number | null) => {
    setFilters(prev => ({ ...prev, categoryFilter: value, showAllPlans: false }));
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      cpuFilter: 0,
      ramFilter: 0,
      storageFilter: 0,
      bandwidthFilter: 0,
      categoryFilter: null,
      showAllPlans: true,
    });
  };

  // Generic filter change handler
  const onFilterChange = () => {
    setFilters(prev => ({ ...prev, showAllPlans: false }));
  };

  // Check if any filters are active
  const hasActiveFilters = filters.cpuFilter > 0 || 
                          filters.ramFilter > 0 || 
                          filters.storageFilter > 0 || 
                          filters.bandwidthFilter > 0 || 
                          filters.categoryFilter !== null;

  return {
    // Filter state
    filters,
    
    // Filter setters
    setCpuFilter,
    setRamFilter,
    setStorageFilter,
    setBandwidthFilter,
    setCategoryFilter,
    
    // Max values
    ...maxValues,
    
    // Processed data
    sortedPackages,
    filteredPackages,
    enhancedPackages,
    
    // Helper functions
    resetFilters,
    onFilterChange,
    hasActiveFilters,
    
    // Counts
    totalCount: packages.length,
    filteredCount: filteredPackages.length,
  };
} 