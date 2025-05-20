import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getBrandColors } from "@/lib/brand-theme";

// Define updated branding data type with the new color system
interface BrandingData {
  company_name: string;
  company_color?: string; // Legacy - for backward compatibility
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: string;
    positive?: boolean;
  };
  className?: string;
}

export function StatCard({
  title,
  value,
  icon,
  iconColor = "text-primary",
  iconBgColor = "bg-primary bg-opacity-10",
  trend,
  className,
}: StatCardProps) {
  // Fetch brand settings
  const { data: brandingData = { company_name: '' } } = useQuery<BrandingData>({
    queryKey: ['/api/settings/branding'],
  });
  
  // Get brand colors using the new system
  const brandColorOptions = {
    primaryColor: brandingData?.primary_color || brandingData?.company_color, // Fallback to company_color for backward compatibility
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  };
  const brandColors = getBrandColors(brandColorOptions);
  
  return (
    <Card className={cn("border border-gray-200", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-semibold mt-1">{value}</h3>
            {trend && (
              <p
                style={{ 
                  color: trend.positive 
                    ? brandColors.primary.full || 'hsl(var(--primary))' 
                    : 'hsl(var(--destructive))' 
                }}
                className="text-xs mt-2 flex items-center"
              >
                {trend.positive ? (
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3 h-3 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                )}
                <span>{trend.value}</span>
              </p>
            )}
          </div>
          <div 
            style={{ 
              backgroundColor: `${brandColors.primary.lighter || 'hsl(var(--primary-light))'}`
            }}
            className="rounded-full p-3"
          >
            <div 
              style={{ 
                color: `${brandColors.primary.full || 'hsl(var(--primary))'}`
              }}
              className="text-xl"
            >
              {icon}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatCard;
