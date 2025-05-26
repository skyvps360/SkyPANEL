import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Server, CreditCard, Package, HardDrive, Settings, Cpu, MemoryStick, Network, MapPin, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

// Schema for server creation form
const createServerSchema = z.object({
  name: z.string()
    .min(3, "Server name must be at least 3 characters")
    .max(64, "Server name must be 64 characters or less")
    .regex(/^[a-zA-Z0-9 ._-]+$/, "Server name can only contain letters, numbers, spaces, and the characters ._-"),

  // Configuration type: package or custom
  configurationType: z.enum(["package", "custom"]).default("package"),

  // Package-based configuration
  packageId: z.coerce.number().optional(),

  // Custom configuration
  cpuCores: z.coerce.number().min(1, "Must have at least 1 CPU core").optional(),
  memory: z.coerce.number().min(512, "Must have at least 512 MB of RAM").optional(),
  storage: z.coerce.number().min(10, "Must have at least 10 GB of storage").optional(),
  networkSpeed: z.coerce.number().min(1, "Must have at least 1 Mbps").optional(),

  // Common fields
  templateId: z.coerce.number().min(1, "Please select an operating system"),
  hypervisorId: z.coerce.number().min(1, "Please select a location"),

  // Additional storage drives
  additionalStorage: z.array(z.object({
    enabled: z.boolean().default(false),
    profileId: z.coerce.number().min(1, "Storage profile ID is required").optional(),
    capacity: z.coerce.number().min(1, "Storage capacity must be at least 1 GB").optional(),
  })).default([]),

  // Additional options
  ipv4Count: z.coerce.number().min(0, "IPv4 count must be 0 or greater").default(1),
  ipv6Enabled: z.boolean().default(true),
  natIpv4: z.boolean().default(false),
  publicIpv4: z.boolean().default(false),
  additionalIpv6: z.coerce.number().min(0, "Additional IPv6 count must be 0 or greater").default(0),
}).refine((data) => {
  // Validate that either packageId is provided (for package mode) or custom resources are provided (for custom mode)
  if (data.configurationType === "package") {
    return data.packageId && data.packageId > 0;
  } else {
    return data.cpuCores && data.memory && data.storage && data.networkSpeed;
  }
}, {
  message: "Please complete the server configuration",
  path: ["configurationType"],
});

type CreateServerFormValues = z.infer<typeof createServerSchema>;

interface Package {
  id: number;
  name: string;
  description: string;
  enabled: boolean;
  memory: number;
  primaryStorage: number;
  traffic: number;
  cpuCores: number;
  primaryNetworkSpeedIn: number;
  primaryNetworkSpeedOut: number;
  pricing?: {
    price: number;
    enabled: boolean;
    displayOrder?: number;
  };
}

interface Hypervisor {
  id: number;
  name: string;
  ip?: string;
  location?: string;
  enabled?: boolean;
}

interface Template {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
}

interface CloudPricing {
  cpuPricePerCore: number;
  ramPricePerGB: number;
  storagePricePerGB: number;
  networkPricePerMbps: number;
  natIpv4Price: number;
  publicIpv4Price: number;
  publicIpv6Price: number;
  cpuPricingEnabled: boolean;
  ramPricingEnabled: boolean;
  storagePricingEnabled: boolean;
  networkPricingEnabled: boolean;
  natIpv4PricingEnabled: boolean;
  publicIpv4PricingEnabled: boolean;
  publicIpv6PricingEnabled: boolean;
}

export default function CreateServerPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedHypervisorId, setSelectedHypervisorId] = useState<number | null>(null);
  const [estimatedCost, setEstimatedCost] = useState<number>(0);
  const [configurationType, setConfigurationType] = useState<"package" | "custom">("package");

  // Fetch packages with improved sorting
  const { data: packages = [], isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const response = await apiRequest("/api/packages");
      // Sort packages by display order, then price, then alphabetically
      return response.sort((a: Package, b: Package) => {
        // Primary: Display order (if available)
        const orderA = a.pricing?.displayOrder ?? 999;
        const orderB = b.pricing?.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;

        // Secondary: Price (ascending - cheapest first)
        const priceA = a.pricing?.price ?? 999;
        const priceB = b.pricing?.price ?? 999;
        if (priceA !== priceB) return priceA - priceB;

        // Tertiary: Alphabetical by name
        return a.name.localeCompare(b.name);
      });
    },
  });

  // Fetch hypervisors
  const { data: hypervisors = [], isLoading: hypervisorsLoading } = useQuery<Hypervisor[]>({
    queryKey: ["/api/hypervisors"],
    queryFn: async () => {
      const response = await apiRequest("/api/hypervisors");
      return response || [];
    },
  });

  // Fetch templates based on package and hypervisor selection
  const { data: templates = [], isLoading: templatesLoading } = useQuery<Template[]>({
    queryKey: ["/api/packages", selectedPackageId || (configurationType === "custom" ? "first" : null), "templates", selectedHypervisorId],
    queryFn: async () => {
      // Need both package and hypervisor for proper template loading
      if (configurationType === "package" && (!selectedPackageId || !selectedHypervisorId)) return [];

      // For custom configuration, use the first available package for templates
      if (configurationType === "custom") {
        if (packages.length > 0 && selectedHypervisorId) {
          const response = await apiRequest(`/api/packages/${packages[0].id}/templates`);
          return response;
        }
        return [];
      }

      // For package configuration, use the selected package
      if (selectedPackageId && selectedHypervisorId) {
        const response = await apiRequest(`/api/packages/${selectedPackageId}/templates`);
        return response;
      }

      return [];
    },
    enabled: (configurationType === "package" && !!selectedPackageId && !!selectedHypervisorId) ||
             (configurationType === "custom" && packages.length > 0 && !!selectedHypervisorId),
  });

  // Fetch user balance
  const { data: balance } = useQuery({
    queryKey: ["/api/billing/balance"],
    queryFn: async () => {
      const response = await apiRequest("/api/billing/balance");
      return response;
    },
  });

  // Fetch cloud pricing settings
  const { data: cloudPricing } = useQuery<CloudPricing>({
    queryKey: ["/api/cloud-pricing"],
    queryFn: async () => {
      const response = await apiRequest("/api/cloud-pricing");
      return response;
    },
  });

  // Form setup
  const form = useForm<CreateServerFormValues>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      name: "",
      configurationType: "package",
      packageId: 0,
      cpuCores: 1,
      memory: 1024,
      storage: 25,
      networkSpeed: 100,
      templateId: 0,
      hypervisorId: 0,
      additionalStorage: [],
      ipv4Count: 1,
      ipv6Enabled: true,
      natIpv4: false,
      publicIpv4: false,
      additionalIpv6: 0,
    },
  });

  // Watch form values for pricing calculation
  const watchedValues = form.watch();
  const watchedConfigurationType = form.watch("configurationType");
  const watchedPackageId = form.watch("packageId");
  const watchedHypervisorId = form.watch("hypervisorId");

  // Update configuration type state
  useEffect(() => {
    if (watchedConfigurationType !== configurationType) {
      setConfigurationType(watchedConfigurationType);
      // Reset template selection when configuration type changes
      form.setValue("templateId", 0);
      setSelectedPackageId(null);
    }
  }, [watchedConfigurationType, configurationType, form]);

  // Update selected package when package changes
  useEffect(() => {
    if (configurationType === "package" && watchedPackageId && watchedPackageId !== selectedPackageId) {
      setSelectedPackageId(watchedPackageId);
      // Reset template selection when package changes
      form.setValue("templateId", 0);
    }
  }, [watchedPackageId, selectedPackageId, configurationType, form]);

  // Update selected hypervisor when hypervisor changes
  useEffect(() => {
    if (watchedHypervisorId && watchedHypervisorId !== selectedHypervisorId) {
      setSelectedHypervisorId(watchedHypervisorId);
      // Reset template selection when hypervisor changes
      form.setValue("templateId", 0);
    }
  }, [watchedHypervisorId, selectedHypervisorId, form]);

  // Calculate pricing based on configuration type
  const calculatePricing = () => {
    if (!cloudPricing) return 0;

    let totalCost = 0;

    if (configurationType === "package") {
      // Package-based pricing
      const selectedPackage = packages.find(pkg => pkg.id === watchedPackageId);
      if (selectedPackage?.pricing) {
        totalCost = selectedPackage.pricing.price;
      }
    } else {
      // Custom cloud pricing
      const cpuCores = watchedValues.cpuCores || 1;
      const memory = watchedValues.memory || 1024;
      const storage = watchedValues.storage || 25;
      const networkSpeed = watchedValues.networkSpeed || 100;
      const natIpv4 = watchedValues.natIpv4 || false;
      const publicIpv4 = watchedValues.publicIpv4 || false;
      const additionalIpv6 = watchedValues.additionalIpv6 || 0;

      // Calculate hourly costs and convert to monthly (24 * 30 = 720 hours)
      const hoursPerMonth = 720;

      if (cloudPricing.cpuPricingEnabled) {
        totalCost += cpuCores * cloudPricing.cpuPricePerCore * hoursPerMonth;
      }

      if (cloudPricing.ramPricingEnabled) {
        totalCost += (memory / 1024) * cloudPricing.ramPricePerGB * hoursPerMonth;
      }

      if (cloudPricing.storagePricingEnabled) {
        totalCost += storage * cloudPricing.storagePricePerGB * hoursPerMonth;
      }

      if (cloudPricing.networkPricingEnabled) {
        totalCost += networkSpeed * cloudPricing.networkPricePerMbps * hoursPerMonth;
      }

      if (cloudPricing.natIpv4PricingEnabled && natIpv4) {
        totalCost += cloudPricing.natIpv4Price * hoursPerMonth;
      }

      if (cloudPricing.publicIpv4PricingEnabled && publicIpv4) {
        totalCost += cloudPricing.publicIpv4Price * hoursPerMonth;
      }

      if (cloudPricing.publicIpv6PricingEnabled && additionalIpv6 > 0) {
        totalCost += additionalIpv6 * cloudPricing.publicIpv6Price * hoursPerMonth;
      }
    }

    return totalCost;
  };

  // Update estimated cost when relevant values change
  useEffect(() => {
    const newCost = calculatePricing();
    setEstimatedCost(newCost);
  }, [watchedValues, configurationType, packages, cloudPricing]);

  // Create server mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: CreateServerFormValues) => {
      // Prepare server data based on configuration type
      const serverData: any = {
        name: data.name,
        templateId: data.templateId,
        hypervisorId: data.hypervisorId,
        ipv4: data.ipv4Count,
        forceIPv6: data.ipv6Enabled,
      };

      // Add additional storage drives if any
      if (data.additionalStorage && data.additionalStorage.length > 0) {
        data.additionalStorage.forEach((storage, index) => {
          if (storage.enabled && storage.profileId && storage.capacity) {
            serverData[`additionalStorage${index + 1}Enable`] = true;
            serverData[`additionalStorage${index + 1}Profile`] = storage.profileId;
            serverData[`additionalStorage${index + 1}Capacity`] = storage.capacity;
          }
        });
      }

      if (data.configurationType === "package") {
        // Package-based configuration
        serverData.packageId = data.packageId;
      } else {
        // Custom configuration - send individual resource specifications
        serverData.cpuCores = data.cpuCores;
        serverData.memory = data.memory;
        serverData.storage = data.storage;
        serverData.networkSpeedInbound = data.networkSpeed;
        serverData.networkSpeedOutbound = data.networkSpeed;

        // For custom configuration, we need to find a suitable package or create a custom one
        // For now, we'll use the first available package and override its specs
        if (packages.length > 0) {
          serverData.packageId = packages[0].id;
        }
      }

      return await apiRequest("/api/servers", {
        method: "POST",
        data: serverData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Server created successfully",
        description: `Your server "${form.getValues("name")}" is being deployed.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/servers"] });
      navigate("/servers");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create server",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  const onSubmit = (values: CreateServerFormValues) => {
    createServerMutation.mutate(values);
  };

  const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId);
  const userCredits = balance?.credits || 0;
  const hasInsufficientCredits = estimatedCost > userCredits;

  const isLoading = packagesLoading || hypervisorsLoading || templatesLoading || createServerMutation.isPending;



  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Server className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Create New Server</h1>
            <p className="text-muted-foreground">Deploy a new virtual server instance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Server Configuration</CardTitle>
                <CardDescription>
                  Configure your new server settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Server Name */}
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server Name</FormLabel>
                          <FormControl>
                            <Input placeholder="my-web-server" {...field} />
                          </FormControl>
                          <FormDescription>
                            A unique name for your server (3-64 characters)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Configuration Type Tabs */}
                    <FormField
                      control={form.control}
                      name="configurationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Configuration Type</FormLabel>
                          <FormControl>
                            <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="package" className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Pre-configured Packages
                                </TabsTrigger>
                                <TabsTrigger value="custom" className="flex items-center gap-2">
                                  <Settings className="h-4 w-4" />
                                  Custom Configuration
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="package" className="space-y-4 mt-4">
                                {/* Package Selection */}
                                <FormField
                                  control={form.control}
                                  name="packageId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Server Package</FormLabel>
                                      <Select
                                        onValueChange={(value) => field.onChange(parseInt(value))}
                                        value={field.value?.toString() || ""}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a server package" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {packages.map((pkg) => (
                                            <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                              <div className="flex items-center justify-between w-full">
                                                <span>{pkg.name}</span>
                                                {pkg.pricing && (
                                                  <Badge variant="secondary" className="ml-2">
                                                    ${pkg.pricing.price.toFixed(2)}/mo
                                                  </Badge>
                                                )}
                                              </div>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormDescription>
                                        Choose a pre-configured server package
                                      </FormDescription>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="custom" className="space-y-4 mt-4">
                                {/* Custom Resource Configuration */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* CPU Cores */}
                                  <FormField
                                    control={form.control}
                                    name="cpuCores"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <Cpu className="h-4 w-4" />
                                          CPU Cores: {field.value}
                                        </FormLabel>
                                        <FormControl>
                                          <Slider
                                            min={1}
                                            max={16}
                                            step={1}
                                            value={[field.value || 1]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className="w-full"
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Number of CPU cores (1-16)
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Memory */}
                                  <FormField
                                    control={form.control}
                                    name="memory"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <MemoryStick className="h-4 w-4" />
                                          RAM: {((field.value || 1024) / 1024).toFixed(1)} GB
                                        </FormLabel>
                                        <FormControl>
                                          <Slider
                                            min={512}
                                            max={32768}
                                            step={512}
                                            value={[field.value || 1024]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className="w-full"
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Memory in MB (0.5-32 GB)
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Storage */}
                                  <FormField
                                    control={form.control}
                                    name="storage"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <HardDrive className="h-4 w-4" />
                                          Storage: {field.value} GB
                                        </FormLabel>
                                        <FormControl>
                                          <Slider
                                            min={10}
                                            max={1000}
                                            step={5}
                                            value={[field.value || 25]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className="w-full"
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Storage in GB (10-1000)
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />

                                  {/* Network Speed */}
                                  <FormField
                                    control={form.control}
                                    name="networkSpeed"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="flex items-center gap-2">
                                          <Network className="h-4 w-4" />
                                          Network: {field.value} Mbps
                                        </FormLabel>
                                        <FormControl>
                                          <Slider
                                            min={10}
                                            max={1000}
                                            step={10}
                                            value={[field.value || 100]}
                                            onValueChange={(value) => field.onChange(value[0])}
                                            className="w-full"
                                          />
                                        </FormControl>
                                        <FormDescription>
                                          Network speed in Mbps (10-1000)
                                        </FormDescription>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </TabsContent>
                            </Tabs>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Location (Hypervisor) Selection */}
                    <FormField
                      control={form.control}
                      name="hypervisorId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Location
                          </FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ""}
                            disabled={hypervisorsLoading}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  hypervisorsLoading
                                    ? "Loading locations..."
                                    : "Select a server location"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hypervisors.map((hypervisor) => (
                                <SelectItem key={hypervisor.id} value={hypervisor.id.toString()}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    {hypervisor.location || hypervisor.name}
                                    {hypervisor.ip && (
                                      <span className="text-xs text-muted-foreground">
                                        ({hypervisor.ip})
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the geographic location for your server
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Operating System Selection */}
                    <FormField
                      control={form.control}
                      name="templateId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operating System</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value?.toString() || ""}
                            disabled={
                              (configurationType === "package" && (!selectedPackageId || !selectedHypervisorId || templatesLoading)) ||
                              (configurationType === "custom" && (!selectedHypervisorId || templatesLoading))
                            }
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={
                                  configurationType === "package" && !selectedPackageId
                                    ? "Select a package first"
                                    : !selectedHypervisorId
                                    ? "Select a location first"
                                    : templatesLoading
                                    ? "Loading templates..."
                                    : "Select an operating system"
                                } />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates.map((template) => (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose the operating system for your server
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Additional Storage Drives */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium">Additional Storage</h3>
                          <p className="text-sm text-muted-foreground">
                            Add extra storage drives to your server
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const currentStorage = form.getValues("additionalStorage");
                            form.setValue("additionalStorage", [
                              ...currentStorage,
                              { enabled: true, profileId: 1, capacity: 10 }
                            ]);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Storage Drive
                        </Button>
                      </div>

                      {watchedValues.additionalStorage?.map((storage, index) => (
                        <div key={index} className="border rounded-lg p-4 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Storage Drive {index + 1}</h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const currentStorage = form.getValues("additionalStorage");
                                const newStorage = currentStorage.filter((_, i) => i !== index);
                                form.setValue("additionalStorage", newStorage);
                              }}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name={`additionalStorage.${index}.profileId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Profile ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="1"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`additionalStorage.${index}.capacity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Capacity (GB)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="10"
                                      {...field}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3">
                      <Button
                        type="submit"
                        disabled={isLoading || hasInsufficientCredits}
                        className="flex-1"
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Server
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate("/servers")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Configuration Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {configurationType === "package" ? (
                    <Package className="h-5 w-5" />
                  ) : (
                    <Settings className="h-5 w-5" />
                  )}
                  {configurationType === "package" ? "Package Details" : "Custom Configuration"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {configurationType === "package" && selectedPackage ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>CPU Cores:</div>
                    <div className="font-medium">{selectedPackage.cpuCores}</div>

                    <div>Memory:</div>
                    <div className="font-medium">{selectedPackage.memory} MB</div>

                    <div>Storage:</div>
                    <div className="font-medium">{selectedPackage.primaryStorage} GB</div>

                    <div>Traffic:</div>
                    <div className="font-medium">{selectedPackage.traffic} GB</div>
                  </div>
                ) : configurationType === "custom" ? (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>CPU Cores:</div>
                    <div className="font-medium">{watchedValues.cpuCores || 1}</div>

                    <div>Memory:</div>
                    <div className="font-medium">{((watchedValues.memory || 1024) / 1024).toFixed(1)} GB</div>

                    <div>Storage:</div>
                    <div className="font-medium">{watchedValues.storage || 25} GB</div>

                    <div>Network:</div>
                    <div className="font-medium">{watchedValues.networkSpeed || 100} Mbps</div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {configurationType === "package"
                      ? "Select a package to see details"
                      : "Configure your custom server resources"}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Pricing Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {configurationType === "custom" && cloudPricing && (
                  <div className="space-y-2 text-sm border-b pb-3 mb-3">
                    <div className="font-medium text-muted-foreground">Cost Breakdown:</div>

                    {cloudPricing.cpuPricingEnabled && (
                      <div className="flex justify-between">
                        <span>CPU ({watchedValues.cpuCores || 1} cores):</span>
                        <span>${(((watchedValues.cpuCores || 1) * cloudPricing.cpuPricePerCore * 720)).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.ramPricingEnabled && (
                      <div className="flex justify-between">
                        <span>RAM ({((watchedValues.memory || 1024) / 1024).toFixed(1)} GB):</span>
                        <span>${((((watchedValues.memory || 1024) / 1024) * cloudPricing.ramPricePerGB * 720)).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.storagePricingEnabled && (
                      <div className="flex justify-between">
                        <span>Storage ({watchedValues.storage || 25} GB):</span>
                        <span>${(((watchedValues.storage || 25) * cloudPricing.storagePricePerGB * 720)).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.networkPricingEnabled && (
                      <div className="flex justify-between">
                        <span>Network ({watchedValues.networkSpeed || 100} Mbps):</span>
                        <span>${(((watchedValues.networkSpeed || 100) * cloudPricing.networkPricePerMbps * 720)).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.natIpv4PricingEnabled && watchedValues.natIpv4 && (
                      <div className="flex justify-between">
                        <span>NAT IPv4:</span>
                        <span>${(cloudPricing.natIpv4Price * 720).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.publicIpv4PricingEnabled && watchedValues.publicIpv4 && (
                      <div className="flex justify-between">
                        <span>Public IPv4:</span>
                        <span>${(cloudPricing.publicIpv4Price * 720).toFixed(2)}</span>
                      </div>
                    )}

                    {cloudPricing.publicIpv6PricingEnabled && (watchedValues.additionalIpv6 || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>Additional IPv6 ({watchedValues.additionalIpv6} /80):</span>
                        <span>${((watchedValues.additionalIpv6 || 0) * cloudPricing.publicIpv6Price * 720).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between text-lg font-semibold">
                  <span>Monthly Cost:</span>
                  <span>
                    ${estimatedCost.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Your Balance:</span>
                  <span className={`font-medium ${hasInsufficientCredits ? 'text-destructive' : 'text-green-600'}`}>
                    ${userCredits.toFixed(2)}
                  </span>
                </div>

                {hasInsufficientCredits && (
                  <Alert>
                    <AlertDescription>
                      Insufficient credits. Please add funds to your account.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
