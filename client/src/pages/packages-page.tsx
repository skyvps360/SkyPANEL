import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Cpu, MemoryStick, HardDrive, Zap, Server, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrandColors } from "@/lib/brand-theme";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Define the Package interface based on the VirtFusion API response
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
  backupPlanId: number;
  primaryStorageReadBytesSec: number | null;
  primaryStorageWriteBytesSec: number | null;
  primaryStorageReadIopsSec: number | null;
  primaryStorageWriteIopsSec: number | null;
  primaryStorageProfile: number;
  primaryNetworkProfile: number;
  created: string;
}

export default function PackagesPage() {
  const { toast } = useToast();
  
  // Fetch packages from our new API endpoint
  const { 
    data, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["/api/public/packages"] as const
  });

  // Fetch package pricing
  const {
    data: pricingData,
    isLoading: isPricingLoading,
    error: pricingError
  } = useQuery({
    queryKey: ["/api/public/package-pricing"] as const
  });
  
  // Fetch branding data
  const { data: brandingData } = useQuery<{ 
    company_name: string; 
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ['/api/settings/branding'],
  });
  
  // Get brand colors using the newer structure
  const brandColors = getBrandColors(brandingData?.primary_color);

  // Type assertion for the packages data
  const packages = data as Package[] || [];
  const pricing = pricingData as Record<string, number> || {};

  // Log successful data fetching
  React.useEffect(() => {
    if (data) {
      console.log("Packages loaded successfully:", data);
    }
  }, [data]);

  // Handle errors by watching the error state
  React.useEffect(() => {
    if (error) {
      console.error("Error loading packages:", error);
      toast({
        title: "Error loading packages",
        description: (error as Error).message || "Could not load packages from VirtFusion",
        variant: "destructive",
      });
    }
  }, [error, toast]);
  
  // Handle pricing error
  React.useEffect(() => {
    if (pricingError) {
      console.error("Error loading package pricing:", pricingError);
      toast({
        title: "Error loading pricing",
        description: (pricingError as Error).message || "Could not load package pricing information",
        variant: "destructive",
      });
    }
  }, [pricingError, toast]);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  // Format network speed from KB/s to GB/MB Port
  const formatNetworkSpeed = (speed: number) => {
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
  
  // Format bandwidth display for better readability
  const formatBandwidth = (gb: number): string => {
    if (gb >= 1000) {
      return `${(gb / 1000).toFixed(1)} TB`;
    }
    return `${gb} GB`;
  };
  
  // Get package price using id or name
  const getPackagePrice = (pkg: Package): number => {
    // Try to get price by id first
    if (pricing && pricing[pkg.id.toString()]) {
      return pricing[pkg.id.toString()];
    }
    
    // Then try by name
    if (pricing && pricing[pkg.name]) {
      return pricing[pkg.name];
    }
    
    // Try legacy string IDs
    const stringId = pkg.id.toString();
    if (pricing && pricing[stringId]) {
      return pricing[stringId];
    }
    
    console.log(`No pricing found for package ${pkg.id} / ${pkg.name}. Available pricing:`, pricing);
    
    // Default fallback (no price found)
    return 0;
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Available Packages</h1>
          <p className="text-gray-500 mt-1">View Our Plans</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-7 w-40 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load packages</CardTitle>
            <CardDescription>
              There was an error connecting to the VirtFusion API. Please check your connection settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{(error as Error).message}</p>
          </CardContent>
        </Card>
      )}

      {/* No Data State */}
      {!isLoading && !error && packages.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Packages Available</CardTitle>
            <CardDescription>
              There are no packages available from your VirtFusion instance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Please contact your administrator to add packages to your VirtFusion account.</p>
          </CardContent>
        </Card>
      )}

      {/* Packages Grid */}
      {!isLoading && !error && packages.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {packages.map((pkg: Package) => (
            <Card key={pkg.id} className="overflow-hidden flex flex-col h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-semibold">{pkg.name}</CardTitle>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {pkg.enabled ? (
                          <div className="flex items-center">
                            <CheckCircle 
                              className="h-5 w-5" 
                              style={{ color: brandColors?.primary?.full || '#33be00' }}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center">
                            <XCircle 
                              className="h-5 w-5"
                              style={{ color: 'rgb(113, 113, 122)' }} 
                            />
                          </div>
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{pkg.enabled ? 'Active and available for ordering' : 'Currently unavailable'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                {pkg.description && (
                  <CardDescription className="line-clamp-2 min-h-[2.5rem]">{pkg.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="space-y-4">
                  {/* Package Specs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <Cpu 
                        className="h-5 w-5 mr-2 flex-shrink-0" 
                        style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{pkg.cpuCores} Cores</p>
                        <p className="text-xs text-muted-foreground">CPU</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <MemoryStick 
                        className="h-5 w-5 mr-2 flex-shrink-0" 
                        style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{pkg.memory / 1024} GB</p>
                        <p className="text-xs text-muted-foreground">Memory</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <HardDrive 
                        className="h-5 w-5 mr-2 flex-shrink-0" 
                        style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{pkg.primaryStorage} GB</p>
                        <p className="text-xs text-muted-foreground">Storage</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Zap 
                        className="h-5 w-5 mr-2 flex-shrink-0" 
                        style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }}
                      />
                      <div>
                        <p className="text-sm font-medium">{formatBandwidth(pkg.traffic)}</p>
                        <p className="text-xs text-muted-foreground">Bandwidth</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Additional Details */}
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Disk Type:</span>
                      <span className="font-medium">{pkg.primaryDiskType === "inherit" ? "Default" : pkg.primaryDiskType}</span>
                    </div>
                    {pkg.primaryNetworkSpeedIn > 0 && (
                      <div className="flex justify-between">
                        <span>Network Speed In:</span>
                        <span className="font-medium">{formatNetworkSpeed(pkg.primaryNetworkSpeedIn)}</span>
                      </div>
                    )}
                    {pkg.primaryNetworkSpeedOut > 0 && (
                      <div className="flex justify-between">
                        <span>Network Speed Out:</span>
                        <span className="font-medium">{formatNetworkSpeed(pkg.primaryNetworkSpeedOut)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
              {/* Card Footer - Fixed at bottom with price and availability */}
              <CardFooter className="mt-auto border-t pt-4 flex flex-col gap-2">
                {/* Price Information */}
                <div className="flex justify-between w-full text-base font-semibold">
                  <span className="flex items-center">
                    <DollarSign 
                      className="h-4 w-4 mr-1 inline" 
                      style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }}
                    />
                    Price:
                  </span>
                  <span style={{ color: brandColors?.primary?.full || '#33be00' }}>
                    ${getPackagePrice(pkg).toFixed(2)}/month
                  </span>
                </div>
                
                {/* Availability Status */}
                <div className="w-full text-center text-sm flex items-center justify-center gap-1.5">
                  {pkg.enabled ? (
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle 
                        className="h-3.5 w-3.5" 
                        style={{ color: brandColors?.primary?.medium || 'rgba(51, 190, 0, 0.25)' }} 
                      />
                      Available for order
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <XCircle className="h-3.5 w-3.5 text-zinc-400" />
                      Currently Unavailable
                    </span>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}