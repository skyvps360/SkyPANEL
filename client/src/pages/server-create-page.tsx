import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InfoIcon, ServerIcon, CreditCard, AlertCircle, ArrowLeft } from "lucide-react";

// Create a schema for client server creation validation (without userId)
const createServerSchema = z.object({
  name: z.string()
    .min(1, "Server name is required")
    .max(64, "Server name must be 64 characters or less")
    .regex(/^[a-zA-Z0-9 ._-]+$/, "Server name can only contain letters, numbers, spaces, and the characters ._-"),
  packageId: z.coerce.number().min(1, "Package ID is required"),
  hypervisorId: z.coerce.number().min(1, "Hypervisor Group ID is required"),
  templateId: z.coerce.number().min(1, "OS template is required"),
  ipv4: z.coerce.number().min(0, "IPv4 address count must be 0 or greater"),
  storage: z.coerce.number().min(1, "Storage is required"),
  traffic: z.coerce.number().min(0, "Traffic must be 0 or greater"),
  memory: z.coerce.number().min(1, "Memory is required"),
  cpuCores: z.coerce.number().min(1, "CPU cores are required"),
  networkSpeedInbound: z.coerce.number().optional(),
  networkSpeedOutbound: z.coerce.number().optional(),
  storageProfile: z.coerce.number().optional(),
  networkProfile: z.coerce.number().optional(),
  additionalStorage1Enable: z.boolean().optional().default(false),
  additionalStorage2Enable: z.boolean().optional().default(false),
  additionalStorage1Profile: z.coerce.number().optional(),
  additionalStorage2Profile: z.coerce.number().optional(),
  additionalStorage1Capacity: z.coerce.number().optional(),
  additionalStorage2Capacity: z.coerce.number().optional(),
  forceIPv6: z.boolean().optional().default(true),
  selfService: z.coerce.number().default(1),
  swapSize: z.coerce.number().default(512),
});

type CreateServerFormValues = z.infer<typeof createServerSchema>;

// Define types for balance data
interface BalanceData {
  credits: number;
  virtFusionCredits: number | null;
  virtFusionTokens: number | null;
}

export default function ServerCreatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);

  // Fetch balance data for credit checking
  const { data: balanceData, isLoading: balanceLoading } = useQuery<BalanceData>({
    queryKey: ["/api/billing/balance"],
  });

  // Fetch packages from VirtFusion API using existing endpoint
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/packages");
        if (!response.ok) {
          throw new Error("Failed to fetch packages");
        }

        const data = await response.json();
        return data || [];
      } catch (error) {
        console.error("Error fetching packages:", error);
        return [];
      }
    }
  });

  // Fetch hypervisor groups from VirtFusion API (same as admin page)
  const { data: hypervisors, isLoading: hypervisorsLoading } = useQuery({
    queryKey: ["/api/admin/hypervisors"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/admin/hypervisors");
        if (!response.ok) {
          throw new Error("Failed to fetch hypervisors");
        }

        const data = await response.json();
        return data?.data || [];
      } catch (error) {
        console.error("Error fetching hypervisors:", error);
        return [];
      }
    }
  });

  // Fetch OS templates when a package is selected
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["/api/packages/templates", selectedPackageId],
    queryFn: async () => {
      if (!selectedPackageId) return [];

      try {
        const response = await fetch(`/api/packages/${selectedPackageId}/templates`);
        if (!response.ok) {
          throw new Error("Failed to fetch OS templates");
        }

        const result = await response.json();
        // The client endpoint returns the templates directly as an array
        const templatesData = Array.isArray(result) ? result : [];

        // Debug: Log the first template to see its structure
        if (templatesData.length > 0) {
          console.log('Template structure example:', templatesData[0]);
        }

        return templatesData;
      } catch (error) {
        console.error("Error fetching OS templates:", error);
        return [];
      }
    },
    enabled: !!selectedPackageId // Only run this query when a package is selected
  });

  // Form definition with default values
  const form = useForm<CreateServerFormValues>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      name: "",
      packageId: 0,
      hypervisorId: 0,
      templateId: 0,
      ipv4: 1,
      storage: 20,
      traffic: 500,
      memory: 512,
      cpuCores: 1,
      networkSpeedInbound: 100,
      networkSpeedOutbound: 100,
      additionalStorage1Enable: false,
      additionalStorage2Enable: false,
      forceIPv6: true,
      selfService: 1, // Default to hourly server (selfService: 1)
      swapSize: 512, // Default swap size of 512MB
    },
  });

  // Check if user has sufficient credits
  const hasInsufficientCredits = () => {
    if (!balanceData || !selectedPackage) return false;

    // Check VirtFusion tokens/credits first
    const virtFusionBalance = balanceData.virtFusionTokens || balanceData.virtFusionCredits || 0;
    const minimumRequired = selectedPackage.pricing?.price || selectedPackage.price || 0;

    // If no VirtFusion balance, check local credits
    if (virtFusionBalance <= 0) {
      return balanceData.credits < minimumRequired;
    }

    return virtFusionBalance < minimumRequired;
  };

  // Get current balance display
  const getCurrentBalance = () => {
    if (!balanceData) return "Loading...";

    const virtFusionBalance = balanceData.virtFusionTokens || balanceData.virtFusionCredits || 0;
    if (virtFusionBalance > 0) {
      return `${virtFusionBalance.toFixed(2)} VirtFusion ${balanceData.virtFusionTokens ? 'Tokens' : 'Credits'}`;
    }

    return `$${balanceData.credits.toFixed(2)} Credits`;
  };

  // Handler for form submission
  const onSubmit = async (values: CreateServerFormValues) => {
    setIsSubmitting(true);

    try {
      // Check credit balance before proceeding
      if (hasInsufficientCredits()) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough credits to create this server. Please add funds to your account.",
          variant: "destructive",
        });
        return;
      }

      // Submit to client server creation endpoint (will use current user's ID)
      console.log("Submitting server creation request with data:", values);
      const response = await apiRequest("/api/servers", {
        method: "POST",
        data: values
      });

      console.log("Server creation response:", response);

      // Server has been created successfully
      toast({
        title: "Server Created",
        description: "The server has been created. Now installing operating system...",
      });

      // If server was created, trigger the build process
      if (response?.data?.serverId || response?.data?.data?.id) {
        const serverId = response?.data?.serverId || response?.data?.data?.id;
        console.log("Extracted server ID:", serverId);

        try {
          // Build request payload for server build
          const buildData = {
            operatingSystemId: values.templateId, // Use the template ID as the OS ID
            name: values.name || "New Server",
            hostname: values.name ? values.name.toLowerCase().replace(/[^a-z0-9]/g, '') + ".example.com" : "server.example.com",
            vnc: true, // Enable VNC by default
            ipv6: values.forceIPv6 === true,
            email: true, // Send email notifications
            swap: values.swapSize // Use the swap size from the form
          };

          console.log(`Building server ${serverId} with OS template ${values.templateId}`);

          // Call the build endpoint (user version)
          console.log(`Calling build endpoint for server ${serverId} with data:`, buildData);
          const buildResponse = await apiRequest(`/api/user/servers/${serverId}/build`, {
            method: "POST",
            data: buildData
          });

          console.log("Build API response:", buildResponse);

          toast({
            title: "Build Initiated",
            description: "Operating system installation started. This may take a few minutes.",
          });

          // Navigate to the server details page
          navigate(`/servers/${serverId}`);
        } catch (buildError: any) {
          console.error("Error building server:", buildError);
          toast({
            title: "Build Error",
            description: "Server was created but OS installation failed: " + (buildError.message || "Unknown error"),
            variant: "destructive",
          });

          // Still navigate to the server details page
          navigate(`/servers/${serverId}`);
        }
      } else {
        navigate("/servers");
      }
    } catch (error: any) {
      console.error("Error creating server:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update package details when a package is selected
  const handlePackageChange = (packageId: string) => {
    if (!packages) return;

    const pkgId = parseInt(packageId);
    setSelectedPackageId(pkgId);

    // Reset template selection when package changes
    form.setValue("templateId", 0);

    const selectedPackage = packages.find((pkg: any) => pkg.id === pkgId);
    if (selectedPackage) {
      setSelectedPackage(selectedPackage);
      console.log("Selected package details:", selectedPackage);

      // Set values based on the VirtFusion package properties

      // CPU Cores - Handle different possible property names
      const cpuCores = selectedPackage.cpuCores || selectedPackage.cpu || selectedPackage.cores;
      if (cpuCores !== undefined && cpuCores !== null) {
        form.setValue("cpuCores", Number(cpuCores));
      }

      // Memory (MB) - Handle different possible property names
      const memory = selectedPackage.memory || selectedPackage.ram;
      if (memory !== undefined && memory !== null) {
        form.setValue("memory", Number(memory));
      }

      // Storage (GB) - Handle different possible property names
      const storage = selectedPackage.primaryStorage || selectedPackage.storage || selectedPackage.disk;
      if (storage !== undefined && storage !== null) {
        form.setValue("storage", Number(storage));
      }

      // Traffic (GB) - Handle different possible property names
      const traffic = selectedPackage.traffic || selectedPackage.bandwidth;
      if (traffic !== undefined && traffic !== null) {
        form.setValue("traffic", Number(traffic));
      }

      // Network speeds - Handle different possible property names
      const networkSpeedIn = selectedPackage.primaryNetworkSpeedIn || selectedPackage.networkSpeedInbound || selectedPackage.networkSpeedIn;
      if (networkSpeedIn !== undefined && networkSpeedIn !== null) {
        form.setValue("networkSpeedInbound", Number(networkSpeedIn));
      }

      const networkSpeedOut = selectedPackage.primaryNetworkSpeedOut || selectedPackage.networkSpeedOutbound || selectedPackage.networkSpeedOut;
      if (networkSpeedOut !== undefined && networkSpeedOut !== null) {
        form.setValue("networkSpeedOutbound", Number(networkSpeedOut));
      }
    }
  };

  // Update selected package when package ID changes
  useEffect(() => {
    if (selectedPackageId && packages) {
      const pkg = packages.find((p: any) => p.id === selectedPackageId);
      setSelectedPackage(pkg);
    }
  }, [selectedPackageId, packages]);

  // Format network speed for display (converts KB/s to appropriate unit)
  const formatNetworkSpeed = (speedKBps: number | null | undefined) => {
    // Handle null, undefined or zero values
    if (speedKBps === null || speedKBps === undefined || speedKBps === 0) return '0';

    // Ensure we're working with a number
    const speed = Number(speedKBps);
    if (isNaN(speed)) return '0';

    // Convert to different units based on size
    if (speed >= 125000) {
      // 125000 KB/s = 1 Gbps
      return `${(speed / 125000).toFixed(1)} Gbps`;
    } else if (speed >= 125) {
      // 125 KB/s = 1 Mbps
      return `${(speed / 125).toFixed(1)} Mbps`;
    } else {
      return `${speed.toFixed(0)} KB/s`;
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/servers")}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Servers
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <ServerIcon className="mr-3 h-8 w-8" />
                Create New Server
              </h1>
              <p className="text-muted-foreground mt-2">
                Deploy a new virtual server with your selected configuration
              </p>
            </div>
          </div>
        </div>

        {/* Balance Alert */}
        {!balanceLoading && (
          <Alert className="mb-6">
            <CreditCard className="h-4 w-4" />
            <AlertTitle>Current Balance</AlertTitle>
            <AlertDescription>
              Your current balance: <strong>{getCurrentBalance()}</strong>
              {hasInsufficientCredits() && selectedPackage && (
                <span className="text-destructive block mt-1">
                  ⚠️ Insufficient balance to create this server (requires ${selectedPackage.pricing?.price?.toFixed(2) || selectedPackage.price?.toFixed(2) || '0.00'})
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Server Configuration</CardTitle>
            <CardDescription>
              Configure your new server settings below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Server Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter server name"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Package Selection */}
                  <FormField
                    control={form.control}
                    name="packageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package</FormLabel>
                        <Select
                          disabled={packagesLoading || isSubmitting}
                          onValueChange={(value) => {
                            field.onChange(Number(value));
                            handlePackageChange(value);
                          }}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a package" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {packages?.map((pkg: any) => (
                              <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                {pkg.name} - ${pkg.pricing?.price?.toFixed(2) || pkg.price?.toFixed(2) || '0.00'}/month
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Hypervisor and Template */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Hypervisor Group */}
                  <FormField
                    control={form.control}
                    name="hypervisorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hypervisor Group</FormLabel>
                        <Select
                          disabled={hypervisorsLoading || isSubmitting}
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select hypervisor group" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hypervisors?.map((hypervisor: any) => (
                              <SelectItem key={hypervisor.id} value={hypervisor.id.toString()}>
                                {hypervisor.name || `Group ${hypervisor.id}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* OS Template */}
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operating System</FormLabel>
                        <Select
                          disabled={templatesLoading || !selectedPackageId || isSubmitting}
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedPackageId
                                  ? "Select a package first"
                                  : "Select operating system"
                              } />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.isArray(templates) && templates.map((template: any) => {
                              // Create a descriptive display name
                              let displayName = template.name || template.title || template.description || 'Unknown Template';

                              // Check various possible version fields
                              const version = template.version || template.osVersion || template.release || template.versionNumber;

                              // Add version if available and not already in name
                              if (version && !displayName.toLowerCase().includes(version.toString().toLowerCase())) {
                                displayName += ` ${version}`;
                              }

                              // Add type/OS info if available and helpful
                              if (template.type && !displayName.toLowerCase().includes(template.type.toLowerCase())) {
                                displayName += ` (${template.type})`;
                              }

                              // Add architecture if available and not default
                              if (template.architecture && template.architecture !== 'x86_64') {
                                displayName += ` [${template.architecture}]`;
                              }

                              return (
                                <SelectItem key={template.id} value={template.id.toString()}>
                                  {displayName}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resource Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Memory - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Memory</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("memory") ? `${form.watch("memory")} MB` : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>

                  {/* CPU Cores - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">CPU Cores</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("cpuCores") ? `${form.watch("cpuCores")} ${form.watch("cpuCores") > 1 ? 'Cores' : 'Core'}` : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>

                  {/* Storage - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Storage</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("storage") ? `${form.watch("storage")} GB` : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>

                  {/* IPv4 Addresses - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">IPv4 Addresses</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("ipv4") !== undefined ? form.watch("ipv4") : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>
                </div>

                {/* Network Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Traffic - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Traffic</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("traffic") ? `${form.watch("traffic")} GB/month` : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>

                  {/* Inbound Speed - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Inbound Speed</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("networkSpeedInbound") ? formatNetworkSpeed(form.watch("networkSpeedInbound")) : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>

                  {/* Outbound Speed - Display as text */}
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm">Outbound Speed</h3>
                    <div className="p-2 border rounded-md bg-background">
                      <p className="text-base">
                        {form.watch("networkSpeedOutbound") ? formatNetworkSpeed(form.watch("networkSpeedOutbound")) : "Not selected"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Set by selected package</p>
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Advanced Options</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Force IPv6 */}
                    <FormField
                      control={form.control}
                      name="forceIPv6"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Enable IPv6</FormLabel>
                            <p className="text-sm text-muted-foreground">
                              Enable IPv6 connectivity for this server
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isSubmitting}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {/* Swap Size */}
                    <FormField
                      control={form.control}
                      name="swapSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Swap Size (MB)</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value.toString()}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select swap size" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="256">256 MB</SelectItem>
                              <SelectItem value="512">512 MB</SelectItem>
                              <SelectItem value="768">768 MB</SelectItem>
                              <SelectItem value="1024">1 GB</SelectItem>
                              <SelectItem value="1536">1.5 GB</SelectItem>
                              <SelectItem value="2048">2 GB</SelectItem>
                              <SelectItem value="3072">3 GB</SelectItem>
                              <SelectItem value="4096">4 GB</SelectItem>
                              <SelectItem value="5120">5 GB</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/servers")}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || hasInsufficientCredits() || balanceLoading}
                  >
                    {isSubmitting ? (
                      <>
                        <Spinner className="mr-2 h-4 w-4" />
                        Creating Server...
                      </>
                    ) : (
                      "Create Server"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
