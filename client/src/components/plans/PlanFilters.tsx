import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, RotateCcw } from 'lucide-react';
import { getBrandColors } from '@/lib/brand-theme';

interface PackageCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface PlanFiltersProps {
  // Filter states
  cpuFilter: number;
  ramFilter: number;
  storageFilter: number;
  bandwidthFilter: number;
  categoryFilter: number | null;
  
  // Filter setters
  setCpuFilter: (value: number) => void;
  setRamFilter: (value: number) => void;
  setStorageFilter: (value: number) => void;
  setBandwidthFilter: (value: number) => void;
  setCategoryFilter: (value: number | null) => void;
  
  // Max values for sliders
  maxCpu: number;
  maxRam: number;
  maxStorage: number;
  maxBandwidth: number;
  
  // Categories data
  categories?: PackageCategory[];
  
  // Brand colors
  brandColors: ReturnType<typeof getBrandColors>;
  
  // Callbacks
  onFilterChange: () => void;
  onResetFilters: () => void;
  
  // Results count
  filteredCount: number;
  totalCount: number;
}

export function PlanFilters({
  cpuFilter,
  ramFilter,
  storageFilter,
  bandwidthFilter,
  categoryFilter,
  setCpuFilter,
  setRamFilter,
  setStorageFilter,
  setBandwidthFilter,
  setCategoryFilter,
  maxCpu,
  maxRam,
  maxStorage,
  maxBandwidth,
  categories = [],
  brandColors,
  onFilterChange,
  onResetFilters,
  filteredCount,
  totalCount
}: PlanFiltersProps) {
  
  const hasActiveFilters = cpuFilter > 0 || ramFilter > 0 || storageFilter > 0 || bandwidthFilter > 0 || categoryFilter !== null;

  const handleFilterChange = (filterSetter: (value: any) => void, value: any) => {
    filterSetter(value);
    onFilterChange();
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" style={{ color: brandColors.primary.full }} />
          Filter Plans
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              {filteredCount} of {totalCount} plans
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          
          {/* Category Filter */}
          {categories.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Category
              </label>
              <Select
                value={categoryFilter ? categoryFilter.toString() : "all"}
                onValueChange={(value) => {
                  const newValue = value === "all" ? null : parseInt(value);
                  handleFilterChange(setCategoryFilter, newValue);
                }}
              >
                <SelectTrigger>
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

          {/* CPU Filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">CPU Cores</label>
              <span className="text-sm text-gray-600">
                {cpuFilter === 0 ? 'Any' : `${cpuFilter}+ vCPU`}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxCpu} 
              step="1" 
              value={cpuFilter} 
              onChange={(e) => handleFilterChange(setCpuFilter, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ 
                accentColor: brandColors.primary.full,
                background: `linear-gradient(to right, ${brandColors.primary.full} 0%, ${brandColors.primary.full} ${(cpuFilter / maxCpu) * 100}%, #e5e7eb ${(cpuFilter / maxCpu) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Any</span>
              <span>{maxCpu}+ vCPU</span>
            </div>
          </div>

          {/* RAM Filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Memory (RAM)</label>
              <span className="text-sm text-gray-600">
                {ramFilter === 0 ? 'Any' : `${ramFilter}+ GB`}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxRam} 
              step="1" 
              value={ramFilter} 
              onChange={(e) => handleFilterChange(setRamFilter, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ 
                accentColor: brandColors.primary.full,
                background: `linear-gradient(to right, ${brandColors.primary.full} 0%, ${brandColors.primary.full} ${(ramFilter / maxRam) * 100}%, #e5e7eb ${(ramFilter / maxRam) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Any</span>
              <span>{maxRam}+ GB</span>
            </div>
          </div>

          {/* Storage Filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Storage</label>
              <span className="text-sm text-gray-600">
                {storageFilter === 0 ? 'Any' : `${storageFilter}+ GB`}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxStorage} 
              step={maxStorage > 1000 ? 100 : 10} 
              value={storageFilter} 
              onChange={(e) => handleFilterChange(setStorageFilter, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ 
                accentColor: brandColors.primary.full,
                background: `linear-gradient(to right, ${brandColors.primary.full} 0%, ${brandColors.primary.full} ${(storageFilter / maxStorage) * 100}%, #e5e7eb ${(storageFilter / maxStorage) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Any</span>
              <span>{maxStorage}+ GB</span>
            </div>
          </div>

          {/* Bandwidth Filter */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-medium text-gray-700">Bandwidth</label>
              <span className="text-sm text-gray-600">
                {bandwidthFilter === 0 ? 'Any' : `${bandwidthFilter}+ GB`}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxBandwidth} 
              step={maxBandwidth > 1000 ? 500 : 100} 
              value={bandwidthFilter} 
              onChange={(e) => handleFilterChange(setBandwidthFilter, Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{ 
                accentColor: brandColors.primary.full,
                background: `linear-gradient(to right, ${brandColors.primary.full} 0%, ${brandColors.primary.full} ${(bandwidthFilter / maxBandwidth) * 100}%, #e5e7eb ${(bandwidthFilter / maxBandwidth) * 100}%, #e5e7eb 100%)`
              }}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Any</span>
              <span>{maxBandwidth >= 1000 ? `${(maxBandwidth/1000).toFixed(1)} TB` : `${maxBandwidth} GB`}</span>
            </div>
          </div>
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All Filters
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 