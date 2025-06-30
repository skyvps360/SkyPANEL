import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import * as LucideIcons from 'lucide-react';
import { getBrandColors } from '@/lib/brand-theme';

interface PlanFeature {
  id: number;
  title: string;
  description?: string;
  icon?: string;
}

interface PlanFeaturesProps {
  features: PlanFeature[];
  isLoading: boolean;
  brandColors: ReturnType<typeof getBrandColors>;
}

export function PlanFeatures({ features, isLoading, brandColors }: PlanFeaturesProps) {
  if (isLoading) {
    return (
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <Skeleton className="h-10 w-64 mx-auto mb-12" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="h-5 w-5 rounded mt-1" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!features || features.length === 0) {
    return (
      <div className="py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">All Plans Include</h2>
          <p className="text-gray-600">
            Our plan features are currently being updated. Please check back soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Everything You Need, Included
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            All of our VPS plans come with these essential features to help you succeed
          </p>
        </div>

        <Card>
          <CardHeader>
            <div 
              className="text-white text-center py-4 rounded-t-lg"
              style={{ background: brandColors.gradient.primary }}
            >
              <CardTitle className="text-xl font-semibold">
                ALL PLANS INCLUDE
              </CardTitle>
            </div>
          </CardHeader>
          
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => {
                // Convert kebab-case icon names to PascalCase for Lucide icons
                const iconName = feature.icon ? feature.icon
                  .split('-')
                  .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                  .join('') : 'Server';
                
                // Get the icon component dynamically from Lucide icons
                const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Server;
                
                return (
                  <div key={feature.id} className="flex items-start space-x-4 group">
                    <div 
                      className="flex-shrink-0 p-2 rounded-lg transition-colors duration-200"
                      style={{ backgroundColor: brandColors.primary.light }}
                    >
                      <IconComponent 
                        style={{ color: brandColors.primary.full }} 
                        className="w-6 h-6" 
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                        {feature.title}
                      </h3>
                      {feature.description && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 