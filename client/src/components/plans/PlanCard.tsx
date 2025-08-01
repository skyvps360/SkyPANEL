import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Zap, Cpu, HardDrive, Wifi, Shield, Clock, ArrowRight } from 'lucide-react';
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
}

interface PlanCardProps {
  package: Package;
  price: number;
  isPopular?: boolean;
  isRecommended?: boolean;
  brandColors: ReturnType<typeof getBrandColors>;
  onOrder: (pkg: Package) => void;
}

export function PlanCard({ 
  package: pkg, 
  price, 
  isPopular = false, 
  isRecommended = false,
  brandColors,
  onOrder 
}: PlanCardProps) {
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

  const features = [
    { 
      label: 'CPU', 
      value: `${pkg.cpuCores} vCPU`,
      icon: Cpu,
      color: 'text-blue-600'
    },
    { 
      label: 'Memory', 
      value: `${pkg.memory / 1024} GB RAM`,
      icon: HardDrive,
      color: 'text-green-600'
    },
    { 
      label: 'Storage', 
      value: `${pkg.primaryStorage} GB ${pkg.primaryDiskType}`,
      icon: Shield,
      color: 'text-purple-600'
    },
    { 
      label: 'Bandwidth', 
      value: formatBandwidth(pkg.traffic),
      icon: Wifi,
      color: 'text-orange-600'
    },
    { 
      label: 'Network', 
      value: formatNetworkSpeed(pkg.primaryNetworkSpeedIn),
      icon: Wifi,
      color: 'text-indigo-600'
    },
  ];

  return (
    <Card className={`relative h-full transition-all duration-300 hover:shadow-xl hover:scale-105 group ${
      isPopular ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:ring-2 hover:ring-gray-200'
    } ${!pkg.enabled ? 'opacity-60' : ''}`}>
      {/* Popular/Recommended Badge */}
      {(isPopular || isRecommended) && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
          <Badge 
            className="px-4 py-2 text-sm font-semibold shadow-lg"
            style={{
              backgroundColor: isPopular ? brandColors.primary.full : brandColors.accent.full,
              color: 'white'
            }}
          >
            {isPopular ? (
              <><Star className="w-4 h-4 mr-2" /> Most Popular</>
            ) : (
              <><Zap className="w-4 h-4 mr-2" /> Recommended</>
            )}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-6 pt-8">
        <CardTitle 
          className="text-2xl font-bold mb-2"
          style={{ color: brandColors.primary.full }}
        >
          {pkg.name}
        </CardTitle>
        {pkg.description && (
          <CardDescription className="text-sm text-gray-600 leading-relaxed">
            {pkg.description}
          </CardDescription>
        )}
        
        {/* Pricing */}
        <div className="mt-6">
          <div className="flex items-center justify-center mb-2">
            <span className="text-5xl font-bold" style={{ color: brandColors.primary.full }}>
              ${price.toFixed(2)}
            </span>
            <span className="text-gray-500 ml-2 text-lg">/month</span>
          </div>
          {pkg.category && (
            <Badge 
              variant="outline" 
              className="mt-3 text-xs"
              style={{
                borderColor: brandColors.primary.medium,
                color: brandColors.primary.full
              }}
            >
              {pkg.category.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col px-6 pb-6">
        {/* Features List */}
        <div className="space-y-4 mb-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div key={index} className="flex items-center justify-between group/feature">
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg mr-3 ${feature.color} bg-opacity-10`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{feature.label}</span>
                </div>
                <span className="text-sm text-gray-900 font-semibold">{feature.value}</span>
              </div>
            );
          })}
          
          {/* SLA Information */}
          {(pkg.sla ?? pkg.sla_plan) && (
            <div className="flex items-center justify-between group/feature">
              <div className="flex items-center">
                <div className="p-2 rounded-lg mr-3 text-green-600 bg-green-100">
                  <Clock className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700">SLA</span>
              </div>
              <Link href={`/sla-plans?sla=${encodeURIComponent((pkg.sla ?? pkg.sla_plan)?.name ?? '')}&from=plans`}>
                <span 
                  className="text-sm font-semibold hover:underline cursor-pointer"
                  style={{ color: brandColors.primary.full }}
                >
                  {(pkg.sla ?? pkg.sla_plan)?.uptime_guarantee_percentage}% Uptime
                </span>
              </Link>
            </div>
          )}
        </div>

        {/* Status Badge */}
        {!pkg.enabled && (
          <div className="mb-6">
            <Badge 
              variant="outline" 
              className="bg-amber-50 text-amber-800 border-amber-300 w-full justify-center"
            >
              Temporarily Unavailable
            </Badge>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-auto">
          <Button 
            className="w-full font-semibold text-base py-3 transition-all duration-200 group-hover:shadow-lg"
            disabled={!pkg.enabled}
            onClick={() => onOrder(pkg)}
            style={{
              backgroundColor: pkg.enabled ? brandColors.primary.full : undefined,
              color: pkg.enabled ? 'white' : undefined,
              borderColor: pkg.enabled ? brandColors.primary.full : undefined
            }}
            variant={pkg.enabled ? "default" : "outline"}
          >
            {pkg.enabled ? (
              <>
                Order Now
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </>
            ) : (
              'Unavailable'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 