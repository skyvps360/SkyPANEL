import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/layout/AdminLayout";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InfoIcon, ServerIcon } from "lucide-react";

// Create a schema for server creation validation
const createServerSchema = z.object({
  name: z.string()
    .min(1, "Server name is required")
    .max(64, "Server name must be 64 characters or less")
    .regex(/^[a-zA-Z0-9 ._-]+$/, "Server name can only contain letters, numbers, spaces, and the characters ._-"),
  packageId: z.coerce.number().min(1, "Package ID is required"),
  userId: z.coerce.number().min(1, "User ID is required"),
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

export default function ServerCreatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  // Fetch all users
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/admin/users"],
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

  // Fetch hypervisor groups from VirtFusion API
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
    queryKey: ["/api/admin/packages/templates", selectedPackageId],
    queryFn: async () => {
      if (!selectedPackageId) return null;
      
      try {
        const response = await fetch(`/api/admin/packages/${selectedPackageId}/templates`);
        if (!response.ok) {
          throw new Error("Failed to fetch OS templates");
        }
        
        const data = await response.json();
        return data || [];
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
      userId: 0,
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
  
  // Handler for form submission
  const onSubmit = async (values: CreateServerFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest("/api/admin/servers", {
        method: "POST",
        data: values
      });
      
      // Server has been created successfully
      toast({
        title: "Server Created",
        description: "The server has been created. Now installing operating system...",
      });
      
      // If server was created, trigger the build process
      if (response?.data?.data?.id) {
        const serverId = response.data.data.id;
        
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
          
          // Call the build endpoint
          const buildResponse = await apiRequest(`/api/admin/servers/${serverId}/build`, {
            method: "POST",
            data: buildData
          });
          
          console.log("Build response:", buildResponse);
          
          toast({
            title: "Build Initiated",
            description: "Operating system installation started. This may take a few minutes.",
          });
          
          // Navigate to the server details page
          navigate(`/admin/servers/${serverId}`);
        } catch (buildError: any) {
          console.error("Error building server:", buildError);
          toast({
            title: "Build Error",
            description: "Server was created but OS installation failed: " + (buildError.message || "Unknown error"),
            variant: "destructive",
          });
          
          // Still navigate to the server details page
          navigate(`/admin/servers/${serverId}`);
        }
      } else {
        navigate("/admin/servers");
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
  
  // Convert human-readable network speed to KB/s
  const parseNetworkSpeed = (input: string): number => {
    if (!input || input.trim() === '') return 0;
    
    input = input.trim().toLowerCase();
    
    // First try to parse as a simple number (assumes KB/s)
    const simpleNumber = parseFloat(input);
    if (!isNaN(simpleNumber) && /^\d+(\.\d+)?$/.test(input)) {
      return simpleNumber;
    }
    
    // Extract numeric value and unit
    const match = input.match(/^(\d+(?:\.\d+)?)\s*(kbps|kb\/s|mbps|mb\/s|gbps|gb\/s)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2];
    
    // Convert to KB/s based on the unit
    if (unit === 'gbps' || unit === 'gb/s') {
      return value * 125000; // 1 Gbps = 125000 KB/s
    } else if (unit === 'mbps' || unit === 'mb/s') {
      return value * 125;   // 1 Mbps = 125 KB/s
    } else {
      return value;  // Already in KB/s
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
      
      // Network Speed In (KB/s) - Handle different possible property names
      const networkSpeedIn = selectedPackage.primaryNetworkSpeedIn || 
                             selectedPackage.networkSpeedInbound || 
                             selectedPackage.speedIn;
      if (networkSpeedIn !== undefined && networkSpeedIn !== null) {
        form.setValue("networkSpeedInbound", Number(networkSpeedIn));
      }
      
      // Network Speed Out (KB/s) - Handle different possible property names
      const networkSpeedOut = selectedPackage.primaryNetworkSpeedOut || 
                              selectedPackage.networkSpeedOutbound || 
                              selectedPackage.speedOut;
      if (networkSpeedOut !== undefined && networkSpeedOut !== null) {
        form.setValue("networkSpeedOutbound", Number(networkSpeedOut));
      }
      
      // Network Profile - Handle different possible property names
      const networkProfile = selectedPackage.primaryNetworkProfile || selectedPackage.networkProfile;
      if (networkProfile !== undefined && networkProfile !== null) {
        form.setValue("networkProfile", networkProfile);
      }
      
      // Storage Profile - Handle different possible property names
      const storageProfile = selectedPackage.primaryStorageProfile || 
                            selectedPackage.storageProfile || 
                            selectedPackage.diskProfile;
      if (storageProfile !== undefined && storageProfile !== null) {
        form.setValue("storageProfile", storageProfile);
      }
      
      // Log the values we've set
      console.log("Set package values:", {
        cpuCores: form.getValues("cpuCores"),
        memory: form.getValues("memory"),
        storage: form.getValues("storage"),
        traffic: form.getValues("traffic"),
        networkSpeedInbound: form.getValues("networkSpeedInbound"),
        networkSpeedOutbound: form.getValues("networkSpeedOutbound")
      });
    }
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Breadcrumb>
            <Breadcrumb.Item href="/admin">Admin</Breadcrumb.Item>
            <Breadcrumb.Item href="/admin/servers">Servers</Breadcrumb.Item>
            <Breadcrumb.Item>Create New Server</Breadcrumb.Item>
          </Breadcrumb>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create New Server</h1>
            <p className="text-muted-foreground mt-1">
              Provision a new VPS server through VirtFusion
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Server Creation Form */}
          <div className="col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Server Details</CardTitle>
                <CardDescription>
                  Enter the specifications for the new server
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(packagesLoading || hypervisorsLoading) ? (
                  <div className="flex flex-col items-center justify-center p-6">
                    <Spinner size="lg" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Loading configuration data...
                    </p>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      {/* Validation mode has been removed */}
                      
                      {/* Server Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Server Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Enter a name for your server" 
                                {...field} 
                              />
                            </FormControl>
                            <div className="text-xs text-muted-foreground mt-1">
                              This name will be used for both the server and hostname
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Package Selection */}
                        <FormField
                          control={form.control}
                          name="packageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Package</FormLabel>
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => {
                                  field.onChange(parseInt(value));
                                  handlePackageChange(value);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a package" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {packages && packages.map((pkg: any) => (
                                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                      {pkg.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* User Selection */}
                        <FormField
                          control={form.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>User</FormLabel>
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users && users.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.username} ({user.email})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Hypervisor Group */}
                        <FormField
                          control={form.control}
                          name="hypervisorId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hypervisor Group</FormLabel>
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a hypervisor group" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {hypervisors && hypervisors.map((hypervisor: any) => (
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
                        
                        {/* OS Template - Only enabled when package is selected */}
                        <FormField
                          control={form.control}
                          name="templateId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Operating System</FormLabel>
                              <Select
                                value={field.value.toString()}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                                disabled={!selectedPackageId || templatesLoading}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder={
                                      !selectedPackageId 
                                        ? "Select a package first" 
                                        : templatesLoading 
                                          ? "Loading templates..." 
                                          : "Select an OS template"
                                    } />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {templatesLoading ? (
                                    <div className="flex items-center justify-center p-2">
                                      <Spinner size="sm" className="mr-2" />
                                      <span>Loading templates...</span>
                                    </div>
                                  ) : templates?.data ? (
                                    templates.data.map((template: any) => (
                                      <SelectItem key={template.id} value={template.id.toString()}>
                                        {template.name} {template.version ? template.version : ''} {template.architecture ? `(${template.architecture})` : template.variant ? `(${template.variant})` : ''}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="0" disabled>No templates available</SelectItem>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* IPv4 Count */}
                        <FormField
                          control={form.control}
                          name="ipv4"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>IPv4 Addresses</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="1"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {/* Force IPv6 Toggle */}
                        <FormField
                          control={form.control}
                          name="forceIPv6"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Force IPv6</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Enable IPv6 support for this server
                                </p>
                              </div>
                              <FormControl>
                                <div 
                                  className={`flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent p-[2px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${field.value ? 'bg-primary' : 'bg-input'}`}
                                  onClick={() => field.onChange(!field.value)}
                                  role="checkbox"
                                  aria-checked={field.value}
                                  tabIndex={0}
                                >
                                  <div
                                    className={`pointer-events-none h-[20px] w-[20px] rounded-full bg-background shadow-sm transition-transform ${field.value ? 'translate-x-[20px]' : 'translate-x-0'}`}
                                  ></div>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {/* Self Service Toggle (Hourly Server) */}
                        <FormField
                          control={form.control}
                          name="selfService"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                              <div className="space-y-0.5">
                                <FormLabel>Hourly Server</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  Create as an hourly billing server
                                </p>
                              </div>
                              <FormControl>
                                <div 
                                  className={`flex h-[24px] w-[44px] shrink-0 cursor-pointer rounded-full border-2 border-transparent p-[2px] shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${field.value === 1 ? 'bg-primary' : 'bg-input'}`}
                                  onClick={() => field.onChange(field.value === 1 ? 0 : 1)}
                                  role="checkbox"
                                  aria-checked={field.value === 1}
                                  tabIndex={0}
                                >
                                  <div
                                    className={`pointer-events-none h-[20px] w-[20px] rounded-full bg-background shadow-sm transition-transform ${field.value === 1 ? 'translate-x-[20px]' : 'translate-x-0'}`}
                                  ></div>
                                </div>
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
                                  <SelectItem value="6144">6 GB</SelectItem>
                                  <SelectItem value="8192">8 GB</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* CPU Cores */}
                        <FormField
                          control={form.control}
                          name="cpuCores"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CPU Cores</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                />
                              </FormControl>
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
                              <FormLabel>Memory (MB)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="256"
                                  placeholder="512"
                                  {...field}
                                />
                              </FormControl>
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
                              <FormLabel>Storage (GB)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="5"
                                  placeholder="20"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Traffic */}
                        <FormField
                          control={form.control}
                          name="traffic"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Traffic (GB, 0=unlimited)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  placeholder="500"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Network Speed Inbound */}
                        <FormField
                          control={form.control}
                          name="networkSpeedInbound"
                          render={({ field }) => {
                            const [speedText, setSpeedText] = useState('');

                            // Update speedText when field.value changes
                            useEffect(() => {
                              if (field.value && !speedText) {
                                setSpeedText(formatNetworkSpeed(field.value));
                              }
                            }, [field.value]);
                            
                            return (
                              <FormItem>
                                <FormLabel>Network Speed Inbound</FormLabel>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="100"
                                      {...field}
                                    />
                                  </FormControl>
                                  <Input
                                    placeholder="e.g. 10 Mbps or 1 Gbps"
                                    value={speedText}
                                    onChange={(e) => {
                                      setSpeedText(e.target.value);
                                      try {
                                        const kbpsValue = parseNetworkSpeed(e.target.value);
                                        if (kbpsValue > 0) {
                                          field.onChange(kbpsValue);
                                        }
                                      } catch (err) {
                                        // Invalid format, ignore
                                      }
                                    }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Enter a value in KB/s or a human-readable format like "10 Mbps" or "1 Gbps"
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {field.value ? `Current value: ${formatNetworkSpeed(field.value)}` : ''}
                                </div>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        {/* Network Speed Outbound */}
                        <FormField
                          control={form.control}
                          name="networkSpeedOutbound"
                          render={({ field }) => {
                            const [speedText, setSpeedText] = useState('');

                            // Update speedText when field.value changes
                            useEffect(() => {
                              if (field.value && !speedText) {
                                setSpeedText(formatNetworkSpeed(field.value));
                              }
                            }, [field.value]);
                            
                            return (
                              <FormItem>
                                <FormLabel>Network Speed Outbound</FormLabel>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="0"
                                      placeholder="100"
                                      {...field}
                                    />
                                  </FormControl>
                                  <Input
                                    placeholder="e.g. 10 Mbps or 1 Gbps"
                                    value={speedText}
                                    onChange={(e) => {
                                      setSpeedText(e.target.value);
                                      try {
                                        const kbpsValue = parseNetworkSpeed(e.target.value);
                                        if (kbpsValue > 0) {
                                          field.onChange(kbpsValue);
                                        }
                                      } catch (err) {
                                        // Invalid format, ignore
                                      }
                                    }}
                                  />
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  Enter a value in KB/s or a human-readable format like "10 Mbps" or "1 Gbps"
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {field.value ? `Current value: ${formatNetworkSpeed(field.value)}` : ''}
                                </div>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      </div>

                      {/* Additional Storage 1 */}
                      <div className="space-y-4 border p-4 rounded-md">
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="additionalStorage1Enable"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Enable Additional Storage 1</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("additionalStorage1Enable") && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="additionalStorage1Profile"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Profile ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="1"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="additionalStorage1Capacity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Capacity (GB)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="10"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>

                      {/* Additional Storage 2 */}
                      <div className="space-y-4 border p-4 rounded-md">
                        <div className="flex items-center gap-2">
                          <FormField
                            control={form.control}
                            name="additionalStorage2Enable"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Enable Additional Storage 2</FormLabel>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>

                        {form.watch("additionalStorage2Enable") && (
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="additionalStorage2Profile"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Profile ID</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="1"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="additionalStorage2Capacity"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Storage Capacity (GB)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder="10"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" variant="outline" className="mr-2" onClick={() => navigate("/admin/servers")}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? <Spinner className="mr-2" /> : <ServerIcon className="mr-2 h-4 w-4" />}
                          Create & Deploy Server
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Information</CardTitle>
              </CardHeader>
              <CardContent>
                <Alert className="mb-4">
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Required Fields</AlertTitle>
                  <AlertDescription>
                    Server Name, Package, User, Hypervisor Group, and OS Template are required to create a server.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Creation Process</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Creating a server is a two-step process:
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Server is created in VirtFusion</li>
                        <li>OS template is installed automatically</li>
                      </ol>
                      The complete process may take a few minutes.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Resource Allocation</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Selecting a package will auto-fill the resource allocation fields, 
                      but you can customize these values as needed.
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">OS Templates</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      You must select a package first before OS templates become available.
                      The OS template you select will be installed during the deployment.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}