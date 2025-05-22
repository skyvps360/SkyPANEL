// Note: This file was updated to use consistent network speed formatting across all pages.
// Network speeds are displayed as "MB Port" or "GB Port" instead of "Mbps" or "Gbps"
// to match the format used in the /plans and /package pages.
// The conversion used is: 125000 KB/s = 1 Gbps = 0.125 GB/s = "1 GB Port"
//
// This file was also updated to use the package name and description directly from the VirtFusion API
// instead of allowing custom name and description fields in the pricing form.

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import AdminLayout from '@/components/layout/AdminLayout';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, DollarSign, Info, RefreshCw, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Types for VirtFusion packages and our pricing records
interface VirtFusionPackage {
  id: number;
  name: string;
  description: string | null;
  memory: number;
  cpuCores: number;
  primaryStorage: number;
  traffic: number;
  primaryNetworkSpeedIn: number;
  primaryNetworkSpeedOut: number;
  enabled: boolean;
  created: string;
  pricing: PricingRecord | null;
}

interface PricingRecord {
  id: number;
  virtFusionPackageId: number;
  name: string;
  description: string | null;
  price: number;
  displayOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Form schema for adding/editing pricing
const pricingFormSchema = z.object({
  // Removed name and description fields to use VirtFusion API values directly
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  displayOrder: z.coerce.number().int().min(0, "Display order must be 0 or greater"),
  enabled: z.boolean().default(true),
});

type PricingFormValues = z.infer<typeof pricingFormSchema>;

export default function PackagePricingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<VirtFusionPackage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch packages and pricing data
  const { data: packages, isLoading, error, failureReason: errorInfo } = useQuery<VirtFusionPackage[]>({
    queryKey: ['/api/admin/packages'],
    staleTime: 60 * 1000,
    retry: 1, // Only retry once since we expect authentication errors to persist
  });

  // Setup form for pricing
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      price: 0,
      displayOrder: 0,
      enabled: true,
    },
  });

  // Mutation for updating pricing
  const updatePricingMutation = useMutation({
    mutationFn: async (data: PricingFormValues) => {
      if (!selectedPackage) return null;
      
      return apiRequest(`/api/admin/packages/${selectedPackage.id}/pricing`, {
        method: 'POST',
        data: {
          ...data,
          // Use VirtFusion API values directly
          name: selectedPackage.name,
          description: selectedPackage.description,
          // Store price in cents (100 = $1.00)
          price: data.price * 100,
        }
      });
    },
    onSuccess: () => {
      toast({
        title: "Pricing updated",
        description: "Package pricing has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
      setDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error updating pricing",
        description: "There was an error updating the package pricing. Please try again.",
        variant: "destructive",
      });
      console.error("Error updating pricing:", error);
    }
  });

  // Mutation for deleting pricing
  const deletePricingMutation = useMutation({
    mutationFn: async (packageId: number) => {
      return apiRequest(`/api/admin/packages/${packageId}/pricing`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Pricing deleted",
        description: "Package pricing has been removed successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/packages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/packages'] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting pricing",
        description: "There was an error deleting the package pricing. Please try again.",
        variant: "destructive",
      });
      console.error("Error deleting pricing:", error);
    }
  });

  // Format memory size (MB to GB)
  const formatMemory = (memoryMB: number) => {
    return (memoryMB / 1024).toFixed(1) + ' GB';
  };

  // Format storage size (GB)
  const formatStorage = (storageGB: number) => {
    return storageGB + ' GB';
  };

  // Format network speed from KB/s to GB/MB Port (consistent with plans and packages pages)
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

  // Handle editing a package's pricing
  const handleEditPackage = (pkg: VirtFusionPackage) => {
    setSelectedPackage(pkg);
    
    // Set form values from existing pricing or defaults
    if (pkg.pricing) {
      form.reset({
        // Convert price from cents to dollars for display/editing
        price: pkg.pricing.price / 100,
        displayOrder: pkg.pricing.displayOrder,
        enabled: pkg.pricing.enabled,
      });
    } else {
      // Default values when no pricing exists
      form.reset({
        price: 0,
        displayOrder: 0,
        enabled: true,
      });
    }
    
    setDialogOpen(true);
  };

  // Handle form submission
  const onSubmit = (data: PricingFormValues) => {
    updatePricingMutation.mutate(data);
  };

  // Handle delete pricing
  const handleDeletePricing = (packageId: number) => {
    if (confirm("Are you sure you want to delete this pricing? This will remove it from the plans page.")) {
      deletePricingMutation.mutate(packageId);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Package Pricing Management</h1>
            <p className="text-gray-500 mt-1">Manage pricing for VirtFusion packages to display on your plans page</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  if (error) {
    // Determine the specific error type
    const errorResponse = (errorInfo as any)?.response;
    const statusCode = errorResponse?.status;
    const errorType = errorResponse?.data?.errorType || 'unknown';
    const errorDetail = errorResponse?.data?.errorDetail || 'An unknown error occurred';
    
    let errorTitle = 'VirtFusion API Error';
    let errorDescription = (
      <div className="space-y-2">
        <p>Failed to load package data from VirtFusion. The API returned an error.</p>
        <p>This could be due to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>An expired API token</li>
          <li>Invalid credentials</li>
          <li>API access restrictions</li>
          <li>Network connectivity issues</li>
        </ul>
        <p>Please check your VirtFusion API settings in the admin settings page.</p>
      </div>
    );
    
    // Customize error message based on status code
    if (statusCode === 401) {
      errorTitle = 'VirtFusion API Authentication Error';
      errorDescription = (
        <div className="space-y-2">
          <p>Failed to authenticate with the VirtFusion API (401 Unauthorized).</p>
          <p>This means your API token is invalid or has expired.</p>
          <p>Please update your VirtFusion API token in the admin settings page.</p>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded mt-2 font-mono text-xs">
            Error details: {errorDetail}
          </div>
        </div>
      );
    } else if (statusCode === 403) {
      errorTitle = 'VirtFusion API Permission Error';
      errorDescription = (
        <div className="space-y-2">
          <p>Your account doesn't have permission to access the VirtFusion API (403 Forbidden).</p>
          <p>Please check that your API token has the correct permissions.</p>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded mt-2 font-mono text-xs">
            Error details: {errorDetail}
          </div>
        </div>
      );
    } else if (statusCode === 404) {
      errorTitle = 'VirtFusion API Endpoint Not Found';
      errorDescription = (
        <div className="space-y-2">
          <p>The VirtFusion API endpoint was not found (404 Not Found).</p>
          <p>Please check that your VirtFusion API URL is correct.</p>
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded mt-2 font-mono text-xs">
            Error details: {errorDetail}
          </div>
        </div>
      );
    }
    
    return (
      <AdminLayout>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Package Pricing Management</h1>
            <p className="text-gray-500 mt-1">Manage pricing for VirtFusion packages to display on your plans page</p>
          </div>
        </div>
        
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{errorTitle}</AlertTitle>
          <AlertDescription>{errorDescription}</AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick API Token Update</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can quickly update your VirtFusion API token below or visit the settings page for full configuration.
              </p>
              
              <div className="space-y-2">
                <Label htmlFor="quickApiToken">VirtFusion API Token</Label>
                <div className="flex space-x-2">
                  <Input
                    id="quickApiToken"
                    type="password"
                    placeholder="Enter your VirtFusion API token"
                    className="flex-1"
                  />
                  <Button variant="secondary" size="sm" onClick={() => {
                    const token = (document.getElementById('quickApiToken') as HTMLInputElement).value;
                    if (token && token.length > 10) {
                      apiRequest('/api/admin/settings/virtfusion', {
                        method: 'POST',
                        data: {
                          apiToken: token
                        }
                      }).then(() => {
                        toast({
                          title: "API Token Updated",
                          description: "Your VirtFusion API token has been updated. Refreshing...",
                        });
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      }).catch(err => {
                        toast({
                          title: "Update Failed",
                          description: "Could not update API token. Please try again.",
                          variant: "destructive"
                        });
                        console.error("Error updating token:", err);
                      });
                    } else {
                      toast({
                        title: "Invalid Token",
                        description: "Please enter a valid API token (at least 10 characters)",
                        variant: "destructive"
                      });
                    }
                  }}>Update Token</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter only the token value without the "Bearer" prefix
                </p>
              </div>
              
              <div className="flex justify-between pt-2">
                <Link href="/admin/settings?tab=virtfusion">
                  <Button variant="outline">Full Settings Page</Button>
                </Link>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Package Pricing Management</h1>
          <p className="text-gray-500 mt-1">Manage pricing for VirtFusion packages to display on your plans page</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="flex items-center h-9"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Packages
          </Button>
        </div>
      </div>
      
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader className="py-4">
          <CardTitle className="text-base">Pricing Information</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="flex items-start xs:items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-1 xs:mt-0" />
            <p className="break-words">
              Prices are displayed in dollars (e.g., $2.50) but stored in cents (250) for precision.
              Only packages with pricing configured will appear on the plans page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="w-full overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4 border-b">
          <CardTitle className="text-xl">Available Packages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto w-full">
            <Table className="w-full table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap w-[30%]">Name</TableHead>
                  <TableHead className="hidden md:table-cell">Specs</TableHead>
                  <TableHead className="hidden sm:table-cell">Pricing</TableHead>
                  <TableHead className="whitespace-nowrap w-[25%]">Status</TableHead>
                  <TableHead className="text-right w-[20%]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(packages) && packages.map((pkg) => (
                  <TableRow key={pkg.id}>
                    <TableCell className="font-medium p-2 sm:p-4">
                      <div className="truncate max-w-[100px] xs:max-w-full">{pkg.name}</div>
                      <div className="md:hidden mt-1">
                        <span className="text-xs text-muted-foreground">
                          {pkg.pricing 
                            ? `$${(pkg.pricing.price / 100).toFixed(2)}` 
                            : "No pricing"
                          }
                        </span>
                      </div>
                      <div className="sm:hidden mt-2 space-y-1">
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">CPU:</span> {pkg.cpuCores} Cores
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Memory:</span> {formatMemory(pkg.memory)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell p-2 sm:p-4">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-semibold">CPU:</span> {pkg.cpuCores} Cores
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Memory:</span> {formatMemory(pkg.memory)}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Storage:</span> {formatStorage(pkg.primaryStorage)}
                        </div>
                        <div className="text-sm">
                          <span className="font-semibold">Network:</span> {formatNetworkSpeed(pkg.primaryNetworkSpeedIn)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell p-2 sm:p-4">
                      {pkg.pricing ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-semibold">Price:</span> ${(pkg.pricing.price / 100).toFixed(2)}
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">Order:</span> {pkg.pricing.displayOrder}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>Using VirtFusion name</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No pricing</span>
                      )}
                    </TableCell>
                    <TableCell className="p-2 sm:p-4">
                      <div className="flex flex-col gap-1 items-start">
                        {pkg.enabled ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs w-fit truncate max-w-full">
                            <Check className="h-3 w-3 mr-0.5 flex-shrink-0" />
                            <span className="truncate">Available</span>
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs w-fit truncate max-w-full">
                            <X className="h-3 w-3 mr-0.5 flex-shrink-0" />
                            <span className="truncate">Disabled</span>
                          </Badge>
                        )}
                        
                        {pkg.pricing && (
                          pkg.pricing.enabled ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs w-fit truncate max-w-full">
                              <Check className="h-3 w-3 mr-0.5 flex-shrink-0" />
                              <span className="truncate">Priced</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs w-fit truncate max-w-full">
                              <X className="h-3 w-3 mr-0.5 flex-shrink-0" />
                              <span className="truncate">Hidden</span>
                            </Badge>
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right p-2 sm:p-4">
                      <div className="flex flex-col justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleEditPackage(pkg)} 
                          className="h-7 w-full px-1 text-xs"
                        >
                          {pkg.pricing ? "Edit" : "Add"}
                        </Button>
                        
                        {pkg.pricing && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-500 hover:text-red-700 h-7 w-full px-1 text-xs mt-1" 
                            onClick={() => handleDeletePricing(pkg.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                
                {(!packages || !Array.isArray(packages) || packages.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No packages found. Check your VirtFusion API configuration.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      
      {/* Edit/Add Pricing Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedPackage?.pricing ? "Edit Package Pricing" : "Add Package Pricing"}
            </DialogTitle>
            <DialogDescription>
              {selectedPackage?.pricing 
                ? "Update pricing information for this package" 
                : "Configure pricing for this package to display it on your plans page"}
              <p className="mt-1 text-xs">Using name and description directly from VirtFusion.</p>
            </DialogDescription>
          </DialogHeader>
          
          {selectedPackage && (
            <div className="py-2">
              <h3 className="font-medium">{selectedPackage.name}</h3>
              <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                <div>
                  <span className="text-muted-foreground">CPU:</span> {selectedPackage.cpuCores} Cores
                </div>
                <div>
                  <span className="text-muted-foreground">Memory:</span> {formatMemory(selectedPackage.memory)}
                </div>
                <div>
                  <span className="text-muted-foreground">Storage:</span> {formatStorage(selectedPackage.primaryStorage)}
                </div>
                <div>
                  <span className="text-muted-foreground">Network:</span> {formatNetworkSpeed(selectedPackage.primaryNetworkSpeedIn)}
                </div>
              </div>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Note: Name and description fields have been removed - using VirtFusion values directly */}
              <div className="bg-primary/5 p-4 rounded-md mb-2">
                <p className="text-sm font-medium">Package Details from VirtFusion</p>
                <p className="text-sm mt-1"><span className="font-semibold">Name:</span> {selectedPackage?.name}</p>
                {selectedPackage?.description && (
                  <p className="text-sm mt-1"><span className="font-semibold">Description:</span> {selectedPackage?.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Package name and description are now used directly from VirtFusion
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            step="0.01" 
                            min="0" 
                            placeholder="0.00" 
                            {...field} 
                            className="pl-8"
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Monthly price in dollars (e.g., 2.50 = $2.50)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Order on plans page (lowest first)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enabled</FormLabel>
                      <FormDescription>
                        Show this package on the plans page
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePricingMutation.isPending}>
                  {updatePricingMutation.isPending ? "Saving..." : "Save Pricing"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}