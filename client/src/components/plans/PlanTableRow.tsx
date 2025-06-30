import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { Star, Zap, X } from 'lucide-react';
import { Link } from 'wouter';
import { getBrandColors } from '@/lib/brand-theme';

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
  isPopular?: boolean;
  isRecommended?: boolean;
}

interface PlanTableRowProps {
  package: Package;
  getPackagePrice: (pkg: Package) => number;
  formatBandwidth: (gigabytes: number) => string;
  formatNetworkSpeed: (speed: number) => string;
  brandColors: ReturnType<typeof getBrandColors>;
  onOrder: (pkg: Package) => void;
}

// Helper function to render plan name cell
function renderPlanNameCell(pkg: Package, brandColors: ReturnType<typeof getBrandColors>) {
  return (
    <TableCell className="font-medium">
      <div className="space-y-2 min-w-[200px]">
        <div className="flex items-center space-x-2 flex-wrap">
          <span 
            className="text-lg font-semibold"
            style={{ color: brandColors.primary.full }}
          >
            {pkg.name}
          </span>
          {pkg.isPopular && (
            <Badge 
              className="text-xs flex items-center gap-1"
              style={{
                backgroundColor: brandColors.primary.full,
                color: 'white'
              }}
            >
              <Star className="w-3 h-3" />
              Popular
            </Badge>
          )}
          {pkg.isRecommended && (
            <Badge 
              className="text-xs flex items-center gap-1"
              style={{
                backgroundColor: brandColors.accent.full,
                color: 'white'
              }}
            >
              <Zap className="w-3 h-3" />
              Recommended
            </Badge>
          )}
        </div>
        {pkg.description && (
          <p className="text-sm text-gray-600">{pkg.description}</p>
        )}
        <div className="flex flex-wrap gap-1">
          {pkg.category && (
            <Badge variant="outline" className="text-xs">
              {pkg.category.name}
            </Badge>
          )}
          {!pkg.enabled && (
            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-300">
              Temporarily Unavailable
            </Badge>
          )}
        </div>
      </div>
    </TableCell>
  );
}

// Helper function to render SLA cell
function renderSlaCell(pkg: Package) {
  const sla = pkg.sla ?? pkg.sla_plan;
  return (
    <TableCell className="text-center">
      {sla ? (
        <Link href={`/sla-plans?sla=${encodeURIComponent(sla.name ?? '')}&from=plans`}>
          <span className="text-blue-600 hover:underline cursor-pointer font-medium">
            {sla.uptime_guarantee_percentage}% Uptime
          </span>
        </Link>
      ) : (
        <div className="flex justify-center">
          <X className="w-4 h-4 text-gray-400" />
        </div>
      )}
    </TableCell>
  );
}

// Helper function to render action cell
function renderActionCell(pkg: Package, brandColors: ReturnType<typeof getBrandColors>, onOrder: (pkg: Package) => void) {
  return (
    <TableCell className="text-center">
      <Button 
        size="sm"
        disabled={!pkg.enabled}
        onClick={() => onOrder(pkg)}
        style={{
          backgroundColor: pkg.enabled ? brandColors.primary.full : undefined,
          color: pkg.enabled ? 'white' : undefined
        }}
        variant={pkg.enabled ? "default" : "outline"}
        className="min-w-[100px]"
      >
        {pkg.enabled ? 'Order Now' : 'Unavailable'}
      </Button>
    </TableCell>
  );
}

export function PlanTableRow({ 
  package: pkg, 
  getPackagePrice, 
  formatBandwidth, 
  formatNetworkSpeed, 
  brandColors, 
  onOrder 
}: PlanTableRowProps) {
  return (
    <TableRow 
      className={`hover:bg-gray-50 transition-colors ${!pkg.enabled ? 'opacity-60' : ''}`}
    >
      {renderPlanNameCell(pkg, brandColors)}

      {/* CPU */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-medium text-lg">{pkg.cpuCores}</span>
          <span className="text-sm text-gray-500">vCPU</span>
        </div>
      </TableCell>

      {/* Memory */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-medium text-lg">{pkg.memory / 1024}</span>
          <span className="text-sm text-gray-500">GB RAM</span>
        </div>
      </TableCell>

      {/* Storage */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="font-medium text-lg">{pkg.primaryStorage}</span>
          <span className="text-sm text-gray-500">GB {pkg.primaryDiskType}</span>
        </div>
      </TableCell>

      {/* Bandwidth */}
      <TableCell className="text-center">
        <span className="font-medium">{formatBandwidth(pkg.traffic)}</span>
      </TableCell>

      {/* Network */}
      <TableCell className="text-center">
        <span className="font-medium">{formatNetworkSpeed(pkg.primaryNetworkSpeedIn)}</span>
      </TableCell>

      {renderSlaCell(pkg)}

      {/* Price */}
      <TableCell className="text-center">
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-900">${getPackagePrice(pkg).toFixed(2)}</span>
          <span className="text-sm text-gray-500">/month</span>
        </div>
      </TableCell>

      {renderActionCell(pkg, brandColors, onOrder)}
    </TableRow>
  );
} 