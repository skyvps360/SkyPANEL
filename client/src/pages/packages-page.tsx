import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Cpu, MemoryStick, HardDrive, Zap, DollarSign, CheckCircle, XCircle, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { getBrandColors } from "@/lib/brand-theme";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Define interfaces for package categories (ENHANCED: Added category support)
interface PackageCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
}

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
  category?: PackageCategory | null;
}

export default function PackagesPage() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null); // ENHANCED: Added category filtering

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

  // Fetch package categories (ENHANCED: Added category filtering)
  const { data: categories } = useQuery<PackageCategory[]>({
    queryKey: ['/api/public/package-categories'],
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
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

  // Filter packages by category (ENHANCED: Added category filtering)
  const filteredPackages = packages.filter(pkg =>
    categoryFilter === null || pkg.category?.id === categoryFilter
  );

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

  // Format bandwidth display for better readability (ENHANCED: Handle unlimited bandwidth)
  const formatBandwidth = (gb: number): string => {
    // Handle unlimited/unmetered bandwidth when traffic is 0
    if (gb === 0) {
      return "Unlimited";
    }

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
      <div className="container mx-auto px-4 py-8 space-y-8">


        {/* Modern Hero Header */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Available Packages
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Choose the perfect plan for your needs
                    </p>
                  </div>
                </div>

                {/* Package Stats Summary */}
                <div className="flex flex-wrap gap-6 mt-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {filteredPackages.filter(pkg => pkg.enabled).length} Available Plans
                      {categoryFilter && ` in ${categories?.find(c => c.id === categoryFilter)?.name}`}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-secondary" />
                    <span className="text-sm font-medium text-foreground">
                      Starting from ${Math.min(...filteredPackages.map(pkg => getPackagePrice(pkg)).filter(price => price > 0)).toFixed(2)}/month
                    </span>
                  </div>
                </div>


              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                {/* Category Filter (ENHANCED: Added category filtering) */}
                {categories && categories.length > 0 && (
                  <div className="min-w-[200px]">
                    <Select
                      value={categoryFilter ? categoryFilter.toString() : "all"}
                      onValueChange={(value) => setCategoryFilter(value === "all" ? null : parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
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
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden bg-card border border-border">
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
          <Card className="border-destructive bg-card">
            <CardHeader>
              <CardTitle className="text-destructive">Could not load packages</CardTitle>
              <CardDescription>
                There was an error connecting to the VirtFusion API. Please check your connection settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{(error as Error).message}</p>
            </CardContent>
          </Card>
        )}

        {/* No Data State */}
        {!isLoading && !error && packages.length === 0 && (
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">No Packages Available</CardTitle>
              <CardDescription>
                There are no packages available from your VirtFusion instance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Please contact your administrator to add packages to your VirtFusion account.</p>
            </CardContent>
          </Card>
        )}

        {/* No Filtered Results State (ENHANCED: Added category filtering) */}
        {!isLoading && !error && packages.length > 0 && filteredPackages.length === 0 && (
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="text-foreground">No Packages in Selected Category</CardTitle>
              <CardDescription>
                No packages are available in the selected category.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Try selecting a different category or view all packages.</p>
            </CardContent>
          </Card>
        )}

        {/* Packages Display */}
        {!isLoading && !error && filteredPackages.length > 0 && (
          /* Table View */
          <Card className="bg-card border border-border shadow-sm">
            <CardHeader>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <CardTitle className="text-foreground">Package Comparison</CardTitle>
                  <CardDescription>Compare all available packages side by side</CardDescription>
                </div>
                {/* Billing Method Badge */}
                <div
                  className="inline-flex items-center px-4 py-2 rounded-lg border-2 shadow-sm"
                  style={{
                    backgroundColor: brandColors.accent.light,
                    borderColor: brandColors.accent.medium,
                  }}
                >
                  <DollarSign
                    className="h-4 w-4 mr-2"
                    style={{ color: brandColors.accent.dark }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: brandColors.accent.dark }}
                  >
                    VirtFusion Token Billing
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-foreground">Package</TableHead>
                      <TableHead className="text-foreground">CPU</TableHead>
                      <TableHead className="text-foreground">Memory</TableHead>
                      <TableHead className="text-foreground">Storage</TableHead>
                      <TableHead className="text-foreground">Bandwidth</TableHead>
                      <TableHead className="text-foreground">Price</TableHead>
                      <TableHead className="text-foreground">Status</TableHead>
                      <TableHead className="text-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPackages.map((pkg: Package) => (
                      <TableRow key={pkg.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-foreground">{pkg.name}</div>
                            {pkg.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">{pkg.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Cpu className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-foreground">{pkg.cpuCores} Cores</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <MemoryStick className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-foreground">{pkg.memory / 1024} GB</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <HardDrive className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-foreground">{pkg.primaryStorage} GB</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Zap className="h-4 w-4 mr-2 text-primary" />
                            <span className="text-foreground">{formatBandwidth(pkg.traffic)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1 text-primary" />
                            <span className="font-semibold text-primary">${getPackagePrice(pkg).toFixed(2)}/mo</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pkg.enabled ? (
                            <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-muted text-muted-foreground">
                              <XCircle className="h-3 w-3 mr-1" />
                              Unavailable
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {pkg.enabled ? (
                            <VirtFusionSsoButton
                              variant="default"
                              size="sm"
                              text="Purchase"
                            />
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              Unavailable
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}