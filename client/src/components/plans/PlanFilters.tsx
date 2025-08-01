import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Filter, RotateCcw, Cpu, HardDrive, Shield, Wifi } from 'lucide-react';
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

  const filterOptions = [
    {
      key: 'category',
      label: 'Category',
      icon: Shield,
      component: (
        <Select
          value={categoryFilter ? categoryFilter.toString() : "all"}
          onValueChange={(value) => {
            const newValue = value === "all" ? null : parseInt(value);
            handleFilterChange(setCategoryFilter, newValue);
          }}
        >
          <SelectTrigger className="h-11">
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
      )
    },
    {
      key: 'cpu',
      label: 'CPU Cores',
      icon: Cpu,
      value: cpuFilter,
      maxValue: maxCpu,
      setter: setCpuFilter,
      formatValue: (val: number) => val === 0 ? 'Any' : `${val}+ vCPU`,
      formatMax: (val: number) => `${val}+ vCPU`
    },
    {
      key: 'ram',
      label: 'Memory (RAM)',
      icon: HardDrive,
      value: ramFilter,
      maxValue: maxRam,
      setter: setRamFilter,
      formatValue: (val: number) => val === 0 ? 'Any' : `${val}+ GB`,
      formatMax: (val: number) => `${val}+ GB`
    },
    {
      key: 'storage',
      label: 'Storage',
      icon: Shield,
      value: storageFilter,
      maxValue: maxStorage,
      setter: setStorageFilter,
      formatValue: (val: number) => val === 0 ? 'Any' : `${val}+ GB`,
      formatMax: (val: number) => `${val}+ GB`,
      step: maxStorage > 1000 ? 100 : 10
    },
    {
      key: 'bandwidth',
      label: 'Bandwidth',
      icon: Wifi,
      value: bandwidthFilter,
      maxValue: maxBandwidth,
      setter: setBandwidthFilter,
      formatValue: (val: number) => val === 0 ? 'Any' : `${val}+ GB`,
      formatMax: (val: number) => val >= 1000 ? `${(val/1000).toFixed(1)} TB` : `${val} GB`,
      step: maxBandwidth > 1000 ? 500 : 100
    }
  ];

  return (
    <Card className="mb-8 border-0 shadow-lg bg-gradient-to-r from-white to-gray-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <div className="p-2 rounded-lg" style={{ backgroundColor: brandColors.primary.light }}>
            <Filter className="w-5 h-5" style={{ color: brandColors.primary.full }} />
          </div>
          Filter Plans
          {hasActiveFilters && (
            <Badge 
              variant="secondary" 
              className="ml-2 px-3 py-1"
              style={{
                backgroundColor: brandColors.primary.light,
                color: brandColors.primary.full
              }}
            >
              {filteredCount} of {totalCount} plans
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          
          {filterOptions.map((option) => {
            if (option.key === 'category' && categories.length === 0) return null;
            
            return (
              <div key={option.key} className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-md" style={{ backgroundColor: brandColors.primary.light }}>
                    <option.icon className="w-4 h-4" style={{ color: brandColors.primary.full }} />
                  </div>
                  <label className="text-sm font-semibold text-gray-700">
                    {option.label}
                  </label>
                </div>
                
                {option.key === 'category' ? (
                  option.component
                ) : (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {option.formatValue(option.value)}
                      </span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={option.maxValue} 
                      step={option.step || 1} 
                      value={option.value} 
                      onChange={(e) => handleFilterChange(option.setter, Number(e.target.value))}
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                      style={{ 
                        accentColor: brandColors.primary.full,
                        background: `linear-gradient(to right, ${brandColors.primary.full} 0%, ${brandColors.primary.full} ${(option.value / option.maxValue) * 100}%, #e5e7eb ${(option.value / option.maxValue) * 100}%, #e5e7eb 100%)`
                      }}
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Any</span>
                      <span>{option.formatMax(option.maxValue)}</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Reset Filters Button */}
        {hasActiveFilters && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="flex items-center gap-2 px-6 py-2"
              style={{
                borderColor: brandColors.primary.medium,
                color: brandColors.primary.full
              }}
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