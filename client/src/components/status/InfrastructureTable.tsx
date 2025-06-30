import { getBrandColors } from '@/lib/brand-theme';
import { Server, HardDrive, Cpu, Database } from 'lucide-react';

interface PlatformStats {
  serverCount: number;
  hypervisorCount: number;
  maxCPU: number;
  maxMemory: number;
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

interface InfrastructureTableProps {
  platformStats: PlatformStats | null | undefined;
  brandColors: ReturnType<typeof getBrandColors>;
  isLoading: boolean;
}

export function InfrastructureTable({ platformStats, brandColors, isLoading }: InfrastructureTableProps) {
  
  const metrics = [
    {
      name: 'Servers',
      value: platformStats?.serverCount || 0,
      description: 'Virtual machines',
      icon: <Server className="h-5 w-5" />,
    },
    {
      name: 'Hypervisors',
      value: platformStats?.hypervisorCount || 0,
      description: 'Physical servers',
      icon: <HardDrive className="h-5 w-5" />,
    },
    {
      name: 'Compute',
      value: platformStats?.maxCPU || 0,
      description: 'CPU cores',
      icon: <Cpu className="h-5 w-5" />,
    },
    {
      name: 'Memory',
      value: platformStats?.maxMemory || 0,
      description: 'GB RAM',
      icon: <Database className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Metric
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Value
              </th>
              <th className="text-left py-3 px-4 font-medium" style={{ color: brandColors.primary.dark }}>
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, index) => (
              <tr 
                key={index}
                className={`hover:bg-gray-50 transition-colors ${index === metrics.length - 1 ? '' : 'border-b border-gray-100'}`}
              >
                {/* Metric (Icon + Name) */}
                <td className="py-4 px-4">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="flex-shrink-0 p-2 rounded-lg"
                      style={{ backgroundColor: brandColors.primary.extraLight }}
                    >
                      <div style={{ color: brandColors.primary.full }}>
                        {metric.icon}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900">{metric.name}</span>
                  </div>
                </td>

                {/* Value */}
                <td className="py-4 px-4">
                  <span 
                    className="text-2xl font-bold"
                    style={{ color: brandColors.primary.full }}
                  >
                    {isLoading ? "..." : metric.value.toLocaleString()}
                  </span>
                </td>

                {/* Description */}
                <td className="py-4 px-4">
                  <span className="text-sm text-gray-600">{metric.description}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - preserving original card functionality */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-5">
        {metrics.map((metric, index) => (
          <div 
            key={index}
            className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all bg-white"
          >
            <div className="h-2 w-full" style={{ backgroundColor: brandColors.primary.full }}></div>
            <div className="pt-5 pb-6 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">{metric.name}</p>
                  <p className="text-3xl font-bold" style={{ color: brandColors.primary.full }}>
                    {isLoading ? "..." : metric.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{metric.description}</p>
                </div>
                <div 
                  className="p-3 rounded-full"
                  style={{ backgroundColor: brandColors.primary.extraLight }}
                >
                  <div style={{ color: brandColors.primary.full }}>
                    {metric.icon}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 