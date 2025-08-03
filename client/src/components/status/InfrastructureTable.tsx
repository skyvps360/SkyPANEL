import { getBrandColors } from '@/lib/brand-theme';
import { Server, HardDrive } from 'lucide-react';

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
      name: 'Hypervisors',
      value: platformStats?.hypervisorCount || 0,
      description: 'Physical servers',
      icon: <HardDrive className="h-5 w-5" />,
    },
    {
      name: 'Servers',
      value: platformStats?.serverCount || 0,
      description: 'Virtual machines',
      icon: <Server className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
        <table className="w-full">
          <thead>
            <tr style={{ backgroundColor: brandColors.primary.extraLight }}>
              <th className="text-left py-4 px-6 font-semibold text-sm uppercase tracking-wide" style={{ color: brandColors.primary.dark }}>
                Metric
              </th>
              <th className="text-right py-4 px-6 font-semibold text-sm uppercase tracking-wide" style={{ color: brandColors.primary.dark }}>
                Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {metrics.map((metric, index) => (
              <tr 
                key={index}
                className="hover:bg-gray-50/50 transition-colors duration-200"
              >
                {/* Metric (Icon + Name) */}
                <td className="py-5 px-6">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="flex-shrink-0 p-2.5 rounded-xl shadow-sm"
                      style={{ backgroundColor: brandColors.primary.extraLight }}
                    >
                      <div style={{ color: brandColors.primary.full }}>
                        {metric.icon}
                      </div>
                    </div>
                    <span className="font-semibold text-gray-900 text-base">{metric.name}</span>
                  </div>
                </td>

                {/* Value */}
                <td className="py-5 px-6 text-right">
                  <span 
                    className="text-3xl font-bold tabular-nums"
                    style={{ color: brandColors.primary.full }}
                  >
                    {isLoading ? "..." : metric.value.toLocaleString()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile View - cleaner card design */}
      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {metrics.map((metric, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 bg-white"
          >
            <div className="h-1 w-full" style={{ backgroundColor: brandColors.primary.full }}></div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">{metric.name}</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: brandColors.primary.full }}>
                    {isLoading ? "..." : metric.value.toLocaleString()}
                  </p>
                </div>
                <div 
                  className="p-3 rounded-xl shadow-sm ml-4"
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