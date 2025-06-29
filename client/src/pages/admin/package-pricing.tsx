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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Check, DollarSign, Info, RefreshCw, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

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

interface PackageCategory {
  id: number;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

import { SlaPlan } from '../../../../shared/schemas/sla-schema';

interface PricingRecord {
  id: number;
  virtFusionPackageId: number;
  name: string;
  description: string | null;
  price: number;
  displayOrder: number;
  enabled: boolean;
  categoryId: number | null;
  category: PackageCategory | null;
  slaPlanId: string | null; // New field for SLA Plan ID
  slaPlan: SlaPlan | null; // New field for SLA Plan details
  createdAt: string;
  updatedAt: string;
}

// Form schema for adding/editing pricing (ENHANCED: Added category support)
const pricingFormSchema = z.object({
  // Removed name and description fields to use VirtFusion API values directly
  price: z.coerce.number().min(0, "Price must be 0 or greater"),
  displayOrder: z.coerce.number().int().min(0, "Display order must be 0 or greater"),
  enabled: z.boolean().default(true),
  categoryId: z.coerce.number().nullable().optional(),
  slaPlanId: z.string().uuid("Invalid UUID format").nullable().optional(), // New SLA Plan ID field
});

// Form schema for category management
const categoryFormSchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().min(0, "Display order must be 0 or greater").default(0),
  isActive: z.boolean().default(true),
});

const slaFormSchema = z.object({
  name: z.string().min(1, "SLA name is required"),
  description: z.string().optional(),
  response_time_hours: z.coerce.number().int().min(0, "Response time must be 0 or greater"),
  resolution_time_hours: z.coerce.number().int().min(0, "Resolution time must be 0 or greater"),
  uptime_guarantee_percentage: z.coerce.number().min(0).max(100, "Uptime must be between 0 and 100"),
  is_active: z.boolean().default(true),
});

type PricingFormValues = z.infer<typeof pricingFormSchema>;

type CategoryFormValues = z.infer<typeof categoryFormSchema>;
type SlaFormValues = z.infer<typeof slaFormSchema>;

export default function PackagePricingPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPackage, setSelectedPackage] = useState<VirtFusionPackage | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<PackageCategory | null>(null);
  const [categoryFormMode, setCategoryFormMode] = useState<'create' | 'edit'>('create');
  const [slaDialogOpen, setSlaDialogOpen] = useState(false);
  const [selectedSlaPlan, setSelectedSlaPlan] = useState<SlaPlan | null>(null);
  const [slaFormMode, setSlaFormMode] = useState<'create' | 'edit'>('create');

  // Fetch packages and pricing data
  const { data: packages, isLoading, error, refetch } = useQuery<VirtFusionPackage[]>({
    queryKey: ['/api/admin/packages'],
    staleTime: 60 * 1000,
    retry: 1, // Only retry once since we expect authentication errors to persist
  });

  // Fetch categories for dropdown (ENHANCED: Added category management)
  const { data: categories } = useQuery<PackageCategory[]>({
    queryKey: ['/api/admin/package-categories'],
    staleTime: 60 * 1000,
  });

  // Fetch SLA plans for dropdown
  const { data: slaPlans, isLoading: isLoadingSlaPlans } = useQuery<SlaPlan[]>({
    queryKey: ['/api/sla'],
    staleTime: 60 * 1000,
  });

  // Setup form for pricing (ENHANCED: Added categoryId support)
  const form = useForm<PricingFormValues>({
    resolver: zodResolver(pricingFormSchema),
    defaultValues: {
      price: 0,
      displayOrder: 0,
      enabled: true,
      categoryId: null,
      slaPlanId: null,
    },
  });

  // Setup form for category management (ENHANCED: Added category management)
  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
    },
  });

  // Setup form for SLA management
  const slaForm = useForm<SlaFormValues>({
    resolver: zodResolver(slaFormSchema),
    defaultValues: {
      name: '',
      description: '',
      response_time_hours: 24,
      resolution_time_hours: 48,
      uptime_guarantee_percentage: 99.9,
      is_active: true,
    },
  });

  // Mutation for updating pricing (ENHANCED: Added categoryId support)
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
          // Include category assignment
          categoryId: data.categoryId,
          slaPlanId: data.slaPlanId,
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

  // Category management mutations (ENHANCED: Added category management)
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      return apiRequest('/api/admin/package-categories', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/package-categories'] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues & { id: number }) => {
      return apiRequest(`/api/admin/package-categories/${data.id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/package-categories'] });
      setCategoryDialogOpen(false);
      categoryForm.reset();
      setSelectedCategory(null);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      return apiRequest(`/api/admin/package-categories/${categoryId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/package-categories'] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    },
  });

  // SLA management mutations
  const createSlaMutation = useMutation({
    mutationFn: async (data: SlaFormValues) => {
      return apiRequest('/api/sla', {
        method: 'POST',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sla'] });
      setSlaDialogOpen(false);
      slaForm.reset();
      toast({
        title: "Success",
        description: "SLA Plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create SLA Plan",
        variant: "destructive",
      });
    },
  });

  const updateSlaMutation = useMutation({
    mutationFn: async (data: SlaFormValues & { id: string }) => {
      return apiRequest(`/api/sla/${data.id}`, {
        method: 'PUT',
        data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sla'] });
      setSlaDialogOpen(false);
      slaForm.reset();
      setSelectedSlaPlan(null);
      toast({
        title: "Success",
        description: "SLA Plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update SLA Plan",
        variant: "destructive",
      });
    },
  });

  const deleteSlaMutation = useMutation({
    mutationFn: async (slaId: string) => {
      return apiRequest(`/api/sla/${slaId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sla'] });
      toast({
        title: "Success",
        description: "SLA Plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete SLA Plan",
        variant: "destructive",
      });
    },
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

  // Handle editing a package's pricing (ENHANCED: Added categoryId support)
  const handleEditPackage = (pkg: VirtFusionPackage) => {
    setSelectedPackage(pkg);

    // Set form values from existing pricing or defaults
    if (pkg.pricing) {
      form.reset({
        // Convert price from cents to dollars for display/editing
        price: pkg.pricing.price / 100,
        displayOrder: pkg.pricing.displayOrder,
        enabled: pkg.pricing.enabled,
        categoryId: pkg.pricing.categoryId,
        slaPlanId: pkg.pricing.slaPlanId,
      });
    } else {
      // Default values when no pricing exists
      form.reset({
        price: 0,
        displayOrder: 0,
        enabled: true,
        categoryId: null,
        slaPlanId: null,
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

  // Category management handlers (ENHANCED: Added category management)
  const handleCreateCategory = () => {
    setCategoryFormMode('create');
    setSelectedCategory(null);
    categoryForm.reset({
      name: '',
      description: '',
      displayOrder: 0,
      isActive: true,
    });
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: PackageCategory) => {
    setCategoryFormMode('edit');
    setSelectedCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || '',
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    });
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category? This action cannot be undone.")) {
      deleteCategoryMutation.mutate(categoryId);
    }
  };

  const onCategorySubmit = (data: CategoryFormValues) => {
    if (categoryFormMode === 'create') {
      createCategoryMutation.mutate(data);
    } else if (selectedCategory) {
      updateCategoryMutation.mutate({ ...data, id: selectedCategory.id });
    }
  };

  // SLA management handlers
  const handleCreateSlaPlan = () => {
    setSlaFormMode('create');
    setSelectedSlaPlan(null);
    slaForm.reset({
      name: '',
      description: '',
      response_time_hours: 24,
      resolution_time_hours: 48,
      uptime_guarantee_percentage: 99.9,
      is_active: true,
    });
    setSlaDialogOpen(true);
  };

  const handleEditSlaPlan = (sla: SlaPlan) => {
    setSlaFormMode('edit');
    setSelectedSlaPlan(sla);
    slaForm.reset({
      name: sla.name,
      description: sla.description || '',
      response_time_hours: sla.response_time_hours,
      resolution_time_hours: sla.resolution_time_hours,
      uptime_guarantee_percentage: sla.uptime_guarantee_percentage,
      is_active: sla.is_active,
    });
    setSlaDialogOpen(true);
  };

  const handleDeleteSlaPlan = (slaId: string) => {
    if (confirm("Are you sure you want to delete this SLA plan? This action cannot be undone.")) {
      deleteSlaMutation.mutate(slaId);
    }
  };

  const onSlaSubmit = (data: SlaFormValues) => {
    if (slaFormMode === 'create') {
      createSlaMutation.mutate(data);
    } else if (selectedSlaPlan) {
      updateSlaMutation.mutate({ ...data, id: selectedSlaPlan.id });
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
    const errorInfo = error as any;
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-6 w-6" />
                <span>VirtFusion API Error</span>
              </CardTitle>
              <CardDescription>
                Failed to load package data from VirtFusion. This can happen if the API token is invalid, expired, or lacks the required permissions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p>
                  Please ensure your VirtFusion API token is correctly configured in the{' '}
                  <Link to="/admin/settings" className="font-medium text-primary hover:underline">
                    admin settings page
                  </Link>
                  . The token must have permissions to read packages.
                </p>
                {errorInfo?.response?.data?.errorDetail && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>API Error Details</AlertTitle>
                    <AlertDescription>
                      <pre className="mt-2 rounded-md bg-slate-950 p-4 text-xs">
                        <code className="text-white">{JSON.stringify(errorInfo.response.data, null, 2)}</code>
                      </pre>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => refetch()} className="w-full">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="break-words">
              Prices are displayed in dollars (e.g., $2.50) but stored in cents (250) for precision.
              Only packages with pricing configured will appear on the plans page.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Service Level Agreements (SLAs)</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Define and manage Service Level Agreement plans for your packages.
              </p>
            </div>
            <Button onClick={handleCreateSlaPlan} className="mt-4 sm:mt-0">
              Add SLA Plan
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {slaPlans && slaPlans.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead>Response Time</TableHead>
                    <TableHead>Resolution Time</TableHead>
                    <TableHead>Uptime</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slaPlans.map((sla) => (
                    <TableRow key={sla.id}>
                      <TableCell className="font-medium">
                        {sla.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {sla.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>{sla.response_time_hours} hours</TableCell>
                      <TableCell>{sla.resolution_time_hours} hours</TableCell>
                      <TableCell>{sla.uptime_guarantee_percentage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant={sla.is_active ? "default" : "secondary"}
                          className={sla.is_active ? "bg-green-100 text-green-800" : ""}
                        >
                          {sla.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditSlaPlan(sla)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteSlaPlan(sla.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No SLA plans created yet.</p>
              <p className="text-sm mt-1">Create your first SLA plan to assign to packages.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Management Section (ENHANCED: Added category management) */}
      <Card className="mb-6 w-full overflow-hidden">
        <CardHeader className="px-4 sm:px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-xl">Package Categories</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Organize packages into categories for better client navigation
              </p>
            </div>
            <Button onClick={handleCreateCategory} className="mt-4 sm:mt-0">
              Add Category
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {categories && categories.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Description</TableHead>
                    <TableHead className="hidden md:table-cell">Display Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {category.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {category.displayOrder}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={category.isActive ? "default" : "secondary"}
                          className={category.isActive ? "bg-green-100 text-green-800" : ""}
                        >
                          {category.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              <p>No categories created yet.</p>
              <p className="text-sm mt-1">Create your first category to organize packages.</p>
            </div>
          )}
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
            <TableHead className="whitespace-nowrap w-[25%]">Name</TableHead>
            <TableHead className="hidden md:table-cell">Specs</TableHead>
            <TableHead className="hidden sm:table-cell">Pricing</TableHead>
            <TableHead className="hidden lg:table-cell">SLA Plan</TableHead>
            <TableHead className="whitespace-nowrap w-[20%]">Status</TableHead>
            <TableHead className="text-right w-[15%]">Actions</TableHead>
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
                            ? `${(pkg.pricing.price / 100).toFixed(2)}` 
                            : "No pricing"
                          }
                        </span>
                        {pkg.pricing?.slaPlan && (
                          <div className="text-xs text-muted-foreground mt-1">
                            <span className="font-medium">SLA:</span> {pkg.pricing.slaPlan.name}
                          </div>
                        )}
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
                          {/* Category Display (ENHANCED: Added category info) */}
                          {pkg.pricing.category && (
                            <div className="text-sm">
                              <span className="font-semibold">Category:</span> {pkg.pricing.category.name}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            <span>Using VirtFusion name</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No pricing</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell p-2 sm:p-4">
                      {pkg.pricing?.slaPlan ? (
                        <div className="space-y-1">
                          <div className="text-sm">
                            <span className="font-semibold">{pkg.pricing.slaPlan.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Response: {pkg.pricing.slaPlan.response_time_hours}h
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Uptime: {pkg.pricing.slaPlan.uptime_guarantee_percentage}%
                          </div>
                          <Badge
                            variant={pkg.pricing.slaPlan.is_active ? "default" : "secondary"}
                            className={`text-xs ${pkg.pricing.slaPlan.is_active ? "bg-green-100 text-green-800" : ""}`}
                          >
                            {pkg.pricing.slaPlan.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">No SLA</span>
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
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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

              {/* Category Selection (ENHANCED: Added category support) */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      value={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign this package to a category for better organization
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slaPlanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SLA Plan (Optional)</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                      value={field.value ? field.value.toString() : "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an SLA plan (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No SLA Plan</SelectItem>
                        {slaPlans?.map((sla) => (
                          <SelectItem key={sla.id} value={sla.id}>
                            {sla.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Assign a Service Level Agreement plan to this package.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

      {/* Category Management Dialog (ENHANCED: Added category management) */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {categoryFormMode === 'create' ? "Create Package Category" : "Edit Package Category"}
            </DialogTitle>
            <DialogDescription>
              {categoryFormMode === 'create'
                ? "Create a new category to organize your packages"
                : "Update the category information"}
            </DialogDescription>
          </DialogHeader>

          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., KVM VPS, Storage VPS"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this package category
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this category"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help clients understand this category
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={categoryForm.control}
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
                        Order in category list (lowest first)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={categoryForm.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Active</FormLabel>
                          <FormDescription className="text-xs">
                            Show in category filters
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {createCategoryMutation.isPending || updateCategoryMutation.isPending
                    ? "Saving..."
                    : categoryFormMode === 'create' ? "Create Category" : "Update Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* SLA Management Dialog */}
      <Dialog open={slaDialogOpen} onOpenChange={setSlaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {slaFormMode === 'create' ? "Create SLA Plan" : "Edit SLA Plan"}
            </DialogTitle>
            <DialogDescription>
              {slaFormMode === 'create'
                ? "Create a new Service Level Agreement plan"
                : "Update the SLA plan information"}
            </DialogDescription>
          </DialogHeader>

          <Form {...slaForm}>
            <form onSubmit={slaForm.handleSubmit(onSlaSubmit)} className="space-y-4">
              <FormField
                control={slaForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SLA Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Standard SLA, Premium SLA"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      A descriptive name for this SLA plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={slaForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Brief description of this SLA plan"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description to help clients understand this SLA plan
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={slaForm.control}
                  name="response_time_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response Time (Hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="24"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Guaranteed response time for support tickets
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={slaForm.control}
                  name="resolution_time_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution Time (Hours)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="48"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Guaranteed resolution time for issues
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={slaForm.control}
                name="uptime_guarantee_percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Uptime Guarantee (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        placeholder="99.9"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Guaranteed monthly uptime percentage
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={slaForm.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end">
                    <div className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm">Active</FormLabel>
                        <FormDescription className="text-xs">
                          Show this SLA plan as available
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSlaDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createSlaMutation.isPending || updateSlaMutation.isPending}
                >
                  {createSlaMutation.isPending || updateSlaMutation.isPending
                    ? "Saving..."
                    : slaFormMode === 'create' ? "Create SLA Plan" : "Update SLA Plan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}