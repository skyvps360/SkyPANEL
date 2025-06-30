import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlanTableRow } from './PlanTableRow';
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

interface PlanTableProps {
  packages: Package[];
  getPackagePrice: (pkg: Package) => number;
  brandColors: ReturnType<typeof getBrandColors>;
  onOrder: (pkg: Package) => void;
}

// Utility functions for formatting
const formatBandwidth = (gigabytes: number): string => {
  if (gigabytes === 0) return "Unlimited";
  if (gigabytes >= 1000) {
    return `${(gigabytes / 1000).toFixed(1)} TB/mo`;
  }
  return `${gigabytes} GB/mo`;
};

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

export function PlanTable({ packages, getPackagePrice, brandColors, onOrder }: PlanTableProps) {
  return (
    <div className="w-full overflow-x-auto bg-white rounded-lg border border-gray-200 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold text-gray-900 text-left">Plan</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">CPU</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Memory</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Storage</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Bandwidth</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Network</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">SLA</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Price</TableHead>
            <TableHead className="font-semibold text-gray-900 text-center">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => (
            <PlanTableRow
              key={pkg.id}
              package={pkg}
              getPackagePrice={getPackagePrice}
              formatBandwidth={formatBandwidth}
              formatNetworkSpeed={formatNetworkSpeed}
              brandColors={brandColors}
              onOrder={onOrder}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 