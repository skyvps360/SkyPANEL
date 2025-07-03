import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Server, User, HardDrive, Cpu, MemoryStick, Network, CheckCircle, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem
} from "@/components/ui/command";
import { Pagination } from "@/components/ui/pagination";

interface ServerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// VirtFusion server creation and build schema based on API specification
const serverCreateSchema = z.object({
  // Server Creation Fields
  packageId: z.number().int().positive("Package is required"),
  userId: z.number().int().positive("User is required"), 
  hypervisorId: z.number().int().positive("Hypervisor group is required"),
  ipv4: z.number().int().min(0).default(1),
  storage: z.number().int().positive("Storage is required"),
  traffic: z.number().int().min(0, "Traffic must be 0 (unlimited) or a positive integer").default(0),
  memory: z.number().int().positive("Memory is required"),
  cpuCores: z.number().int().positive("CPU cores is required"),
  networkSpeedInbound: z.number().int().positive().default(1000),
  networkSpeedOutbound: z.number().int().positive().default(1000),  
  storageProfile: z.number().int().min(0).default(0),
  networkProfile: z.number().int().optional().default(0),
  firewallRulesets: z.array(z.number().int()).default([]),
  hypervisorAssetGroups: z.array(z.number().int()).default([]),
  additionalStorage1Enable: z.boolean().default(false),
  additionalStorage2Enable: z.boolean().default(false),
  additionalStorage1Profile: z.number().int().positive().optional(),
  additionalStorage2Profile: z.number().int().positive().optional(),
  additionalStorage1Capacity: z.number().int().positive().optional(),
  additionalStorage2Capacity: z.number().int().positive().optional(),
  
  // Server Build Fields
  operatingSystemId: z.number().int().positive("Operating System is required"),
  name: z.string().min(1, "Server name is required").max(255, "Server name too long"),
  hostname: z.string().optional().default(""),
  sshKeys: z.array(z.number().int()).default([]),
  vnc: z.boolean().default(false),
  ipv6: z.boolean().default(false),
  email: z.boolean().default(true),
  swap: z.number().int().min(0).max(8192).default(512) // Values: 256, 512, 768, 1024, 1536, 2048, 3072, 4096, 5120, 6144, 8192
});

type ServerCreateFormData = z.infer<typeof serverCreateSchema>;

export default function ServerCreateModal({ open, onOpenChange, onSuccess }: ServerCreateModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedHypervisorGroup, setSelectedHypervisorGroup] = useState<any>(null);
  const [selectedOsTemplate, setSelectedOsTemplate] = useState<any>(null);
  const [step, setStep] = useState<'create' | 'building' | 'success'>('create');
  const [createdServer, setCreatedServer] = useState<any>(null);
  const queryClient = useQueryClient();
  // OS template dropdown helpers
  const [osSelectOpen, setOsSelectOpen] = useState(false);
  const [osSearch, setOsSearch] = useState("");
  const [osPage, setOsPage] = useState(1);
  const pageSize = 5;

  // Fetch VirtFusion packages
  const { data: packagesData, isLoading: packagesLoading, error: packagesError } = useQuery({
    queryKey: ['/api/admin/packages'],
    queryFn: async () => {
      const response = await fetch('/api/admin/packages');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch packages');
      }
      return response.json();
    },
    enabled: open, // Only fetch when modal is open
  });

  // Fetch SkyPANEL users
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch users');
      }
      return response.json();
    },
    enabled: open,
  });

  // Fetch VirtFusion hypervisor groups (required for server creation)
  const { data: hypervisorsData, isLoading: hypervisorsLoading, error: hypervisorsError } = useQuery({
    queryKey: ['/api/admin/hypervisor-groups'],
    queryFn: async () => {
      const response = await fetch('/api/admin/hypervisor-groups');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch hypervisor groups');
      }
      return response.json();
    },
    enabled: open,
  });

  // Fetch VirtFusion OS templates
  const { data: osTemplatesData, isLoading: osTemplatesLoading, error: osTemplatesError } = useQuery({
    queryKey: ['/api/admin/os-templates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/os-templates');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch OS templates');
      }
      return response.json();
    },
    enabled: open,
  });

  const form = useForm<ServerCreateFormData>({
    resolver: zodResolver(serverCreateSchema),
    defaultValues: {
      ipv4: 1,
      storage: 20,
      traffic: 0,
      memory: 1024,
      cpuCores: 1,
      networkSpeedInbound: 1000,
      networkSpeedOutbound: 1000,
      storageProfile: 0,
      networkProfile: 0,
      firewallRulesets: [],
      hypervisorAssetGroups: [],
      additionalStorage1Enable: false,
      additionalStorage2Enable: false,
      // Build fields
      name: "",
      hostname: "",
      sshKeys: [],
      vnc: false,
      ipv6: false,
      email: true,
      swap: 512,
    },
  });

  // Server creation and build mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: ServerCreateFormData) => {
      console.log('Creating and building server with data:', data);
      
      // Step 1: Create the server
      console.log('Step 1: Creating server...');
      setStep('building');
      
      // Prepare server creation data (without OS template - that's for build step only)
      const createData = {
        packageId: data.packageId,
        userId: data.userId,
        hypervisorId: data.hypervisorId,
        ipv4: data.ipv4,
        storage: data.storage,
        traffic: data.traffic,
        memory: data.memory,
        cpuCores: data.cpuCores,
        networkSpeedInbound: data.networkSpeedInbound,
        networkSpeedOutbound: data.networkSpeedOutbound,
        storageProfile: data.storageProfile,
        networkProfile: data.networkProfile,
        firewallRulesets: data.firewallRulesets,
        hypervisorAssetGroups: data.hypervisorAssetGroups,
        additionalStorage1Enable: data.additionalStorage1Enable,
        additionalStorage2Enable: data.additionalStorage2Enable,
        additionalStorage1Profile: data.additionalStorage1Profile,
        additionalStorage2Profile: data.additionalStorage2Profile,
        additionalStorage1Capacity: data.additionalStorage1Capacity,
        additionalStorage2Capacity: data.additionalStorage2Capacity,
      };
      
      console.log('Sending create request with data:', createData);
      const createResponse = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });
      
      if (!createResponse.ok) {
        const error = await createResponse.json();
        console.error('Server creation failed:', error);
        throw new Error(`VirtFusion API Error ${createResponse.status}: ${error.message || 'Request failed with status code ' + createResponse.status}`);
      }
      
      const createResult = await createResponse.json();
      const serverId = createResult.data?.id;
      
      if (!serverId) {
        throw new Error('Server created but no ID returned');
      }
      
      console.log(`Step 2: Building server ${serverId}...`);
      
      // Step 2: Build the server
      const buildData = {
        operatingSystemId: data.operatingSystemId,
        name: data.name,
        hostname: data.hostname || data.name,
        sshKeys: data.sshKeys,
        vnc: data.vnc,
        ipv6: data.ipv6,
        email: data.email,
        swap: data.swap,
      };
      
      console.log('Sending build request with data:', buildData);
      const buildResponse = await fetch(`/api/admin/servers/${serverId}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildData),
      });
      
      if (!buildResponse.ok) {
        const error = await buildResponse.json();
        console.error('Server build failed:', error);
        throw new Error(`Server created but build failed: ${error.message || 'Unknown error'}`);
      }
      
      const buildResult = await buildResponse.json();
      
      return {
        server: createResult.data,
        build: buildResult.data,
        serverId: serverId
      };
    },
    onSuccess: (data) => {
      console.log('Server created and built successfully:', data);
      toast({
        title: "Server Created & Built Successfully",
        description: `Server "${form.getValues('name')}" (ID: ${data.serverId}) has been created and is installing the OS.`,
      });
      setCreatedServer(data.server);
      setStep('success');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers'] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      console.error('Server creation/build error:', error);
      setStep('create'); // Reset to create step on error
      toast({
        title: "Server Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Extract data arrays from API responses
  const packages = packagesData?.data || packagesData || [];
  const users = Array.isArray(usersData) ? usersData : usersData?.data || [];
  const hypervisors = hypervisorsData?.data || hypervisorsData || [];
  const osTemplates = osTemplatesData?.data || [];

  // Flatten OS template categories for easier searching / paging
  const flatOsTemplates = useMemo(() => {
    const templates: any[] = [];
    for (const category of osTemplates) {
      if (category.templates) {
        templates.push(
          ...category.templates.map((t: any) => ({ ...t, categoryName: category.name }))
        );
      }
    }
    return templates;
  }, [osTemplates]);

  // Filter by search term
  const filteredOsTemplates = useMemo(() => {
    if (!osSearch) return flatOsTemplates;
    return flatOsTemplates.filter((t) =>
      `${t.name} ${t.version} ${t.variant || ""}`.toLowerCase().includes(osSearch.toLowerCase())
    );
  }, [flatOsTemplates, osSearch]);

  // Pagination
  const totalOsPages = Math.max(1, Math.ceil(filteredOsTemplates.length / pageSize));
  const paginatedOsTemplates = useMemo(
    () => filteredOsTemplates.slice((osPage - 1) * pageSize, osPage * pageSize),
    [filteredOsTemplates, osPage]
  );

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setOsPage(1);
  }, [osSearch]);

  // Update form when package is selected
  useEffect(() => {
    if (selectedPackage) {
      // Map VirtFusion package fields to form fields
      form.setValue('storage', selectedPackage.primaryStorage || 20);
      if (typeof selectedPackage.traffic === 'number') {
        form.setValue('traffic', selectedPackage.traffic);
      } else {
        form.setValue('traffic', 1000);
      }
      form.setValue('memory', selectedPackage.memory || 1024);
      form.setValue('cpuCores', selectedPackage.cpuCores || 1);
      form.setValue('networkSpeedInbound', selectedPackage.primaryNetworkSpeedIn || 1000); // 1000 Mbps
      form.setValue('networkSpeedOutbound', selectedPackage.primaryNetworkSpeedOut || 1000); // 1000 Mbps
      form.setValue('storageProfile', selectedPackage.primaryStorageProfile || 0);
      form.setValue('networkProfile', selectedPackage.primaryNetworkProfile || 0);
    }
  }, [selectedPackage, form]);

  const onSubmit = (data: ServerCreateFormData) => {
    console.log('Form submitted with data:', data);
    createServerMutation.mutate(data);
  };

  const handleClose = () => {
    setStep('create');
    setCreatedServer(null);
    setSelectedPackage(null);
    setSelectedUser(null);
    setSelectedHypervisorGroup(null);
    setSelectedOsTemplate(null);
    form.reset({
      ipv4: 1,
      storage: 20,
      traffic: 0,
      memory: 1024,
      cpuCores: 1,
      networkSpeedInbound: 1000,
      networkSpeedOutbound: 1000,
      storageProfile: 0,
      networkProfile: 0,
      firewallRulesets: [],
      hypervisorAssetGroups: [],
      additionalStorage1Enable: false,
      additionalStorage2Enable: false,
      name: "",
      hostname: "",
      sshKeys: [],
      vnc: false,
      ipv6: false,
      email: true,
      swap: 512,
    });
    onOpenChange(false);
  };

  const isLoading = packagesLoading || usersLoading || hypervisorsLoading || osTemplatesLoading;
  const hasErrors = packagesError || usersError || hypervisorsError || osTemplatesError;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {step === 'create' ? 'Create & Build VirtFusion Server' : 
             step === 'building' ? 'Building Server...' : 
             'Server Created Successfully'}
          </DialogTitle>
          <DialogDescription>
            {step === 'create' 
              ? 'Create and build a new virtual server by configuring hardware resources, selecting an OS template, and server settings.'
              : step === 'building'
              ? 'Creating server hardware and installing the operating system. This may take a few moments.'
              : 'Your server has been successfully created and the OS installation is in progress.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'create' ? (
          <>
            {hasErrors && (
              <Card className="border-destructive bg-destructive/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-destructive text-sm">Configuration Error</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-destructive">
                    {packagesError?.message || usersError?.message || hypervisorsError?.message || osTemplatesError?.message || 'Failed to load required data'}
                  </p>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="text-center">
                  <Spinner size="lg" />
                  <p className="text-sm text-muted-foreground mt-2">Loading VirtFusion configuration...</p>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Package Selection */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          VirtFusion Package
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="packageId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Package</FormLabel>
                              <Select
                                value={field.value ? field.value.toString() : ""}
                                onValueChange={(value) => {
                                  const packageId = parseInt(value);
                                  field.onChange(packageId);
                                  const pkg = packages?.find((p: any) => p.id === packageId);
                                  setSelectedPackage(pkg);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a VirtFusion package" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {packages?.filter((pkg: any) => pkg.enabled).map((pkg: any) => (
                                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{pkg.name}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {pkg.cpuCores}C • {pkg.memory}MB • {pkg.primaryStorage}GB
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Select a VirtFusion package that defines the server resources
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {selectedPackage && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Package Details:</h4>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>CPU: {selectedPackage.cpuCores} cores</div>
                              <div>Memory: {selectedPackage.memory} MB</div>
                              <div>Storage: {selectedPackage.primaryStorage} GB</div>
                              <div>Traffic: {selectedPackage.traffic === 0 ? 'Unlimited' : `${selectedPackage.traffic} GB`}</div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* User Assignment */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <User className="h-4 w-4" />
                          User Assignment
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <FormField
                          control={form.control}
                          name="userId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Assign to User</FormLabel>
                              <Select
                                value={field.value ? field.value.toString() : ""}
                                onValueChange={(value) => {
                                  const userId = parseInt(value);
                                  field.onChange(userId);
                                  const user = users?.find((u: any) => u.id === userId);
                                  setSelectedUser(user);
                                }}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a user" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {users?.map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{user.username}</span>
                                        {user.fullName && (
                                          <span className="text-muted-foreground">({user.fullName})</span>
                                        )}
                                        <Badge variant="outline" className="text-xs">
                                          ID: {user.id}
                                        </Badge>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                The SkyPANEL user who will own this server
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {selectedUser && (
                          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">User Details:</h4>
                            <div className="text-xs space-y-1">
                              <div>Username: {selectedUser.username}</div>
                              {selectedUser.fullName && <div>Name: {selectedUser.fullName}</div>}
                              {selectedUser.email && <div>Email: {selectedUser.email}</div>}
                              {selectedUser.virtFusionId && <div>VirtFusion ID: {selectedUser.virtFusionId}</div>}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                                      {/* Hypervisor Group Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        Hypervisor Group Selection
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="hypervisorId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hypervisor Group</FormLabel>
                            <Select
                              value={field.value ? field.value.toString() : ""}
                              onValueChange={(value) => {
                                const hypervisorGroupId = parseInt(value);
                                field.onChange(hypervisorGroupId);
                                const hypervisorGroup = hypervisors?.find((h: any) => h.id === hypervisorGroupId);
                                setSelectedHypervisorGroup(hypervisorGroup);
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a hypervisor group" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {hypervisors?.filter((h: any) => h.enabled).map((hypervisorGroup: any) => (
                                  <SelectItem key={hypervisorGroup.id} value={hypervisorGroup.id.toString()}>
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{hypervisorGroup.name}</span>
                                      {hypervisorGroup.default && (
                                        <Badge variant="outline" className="text-xs">
                                          Default
                                        </Badge>
                                      )}
                                      <Badge variant="secondary" className="text-xs">
                                        Distribution: {hypervisorGroup.distributionType}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              The hypervisor group where this server will be placed (VirtFusion will auto-select the best hypervisor)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Resource Configuration (Advanced) */}
                  {selectedPackage && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Cpu className="h-4 w-4" />
                          Resource Configuration
                        </CardTitle>
                        <CardDescription>
                          Advanced settings (automatically populated from package)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <FormField
                            control={form.control}
                            name="cpuCores"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>CPU Cores</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="memory"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Memory (MB)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={512}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 512)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="storage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Storage (GB)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={10}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 10)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="ipv4"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>IPv4 Addresses</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    max={10}
                                    value={field.value || ""}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* OS Template Selection */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Operating System
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <FormField
                        control={form.control}
                        name="operatingSystemId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>OS Template</FormLabel>
                            <Popover open={osSelectOpen} onOpenChange={setOsSelectOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                  {selectedOsTemplate
                                    ? `${selectedOsTemplate.name} ${selectedOsTemplate.version}`
                                    : "Select an operating system"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command shouldFilter={false}>
                                  <CommandInput
                                    placeholder="Search operating systems..."
                                    value={osSearch}
                                    onValueChange={setOsSearch}
                                    className="h-9"
                                  />
                                  <CommandList className="max-h-[200px]">
                                    <CommandEmpty>No operating systems found.</CommandEmpty>
                                    {paginatedOsTemplates.map((template: any) => (
                                      <CommandItem
                                        key={template.id}
                                        value={`${template.name} ${template.version} ${template.variant || ""}`}
                                        onSelect={(value) => {
                                          field.onChange(template.id);
                                          setSelectedOsTemplate(template);
                                          setOsSelectOpen(false);
                                        }}
                                        className="px-3 py-2"
                                      >
                                        <div className="flex items-center justify-between w-full">
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <span className="font-medium truncate">{template.name}</span>
                                            <span className="text-sm text-muted-foreground">{template.version}</span>
                                            {template.variant && (
                                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                                {template.variant}
                                              </Badge>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1 ml-2">
                                            {template.eol && (
                                              <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                                EOL
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandList>
                                  {totalOsPages > 1 && (
                                    <div className="border-t bg-muted/30 p-2">
                                      <Pagination
                                        currentPage={osPage}
                                        totalPages={totalOsPages}
                                        onPageChange={setOsPage}
                                        className="justify-center [&>*]:h-7 [&>*]:text-xs"
                                      />
                                    </div>
                                  )}
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              The operating system template to install on the server
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {selectedOsTemplate && (
                        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                          <h4 className="font-medium text-sm mb-2">OS Details:</h4>
                          <div className="text-xs space-y-1">
                            <div>Name: {selectedOsTemplate.name} {selectedOsTemplate.version}</div>
                            <div>Type: {selectedOsTemplate.type}</div>
                            {selectedOsTemplate.description && (
                              <div>Description: {selectedOsTemplate.description}</div>
                            )}
                            <div>VNC Support: {selectedOsTemplate.vnc ? 'Yes' : 'No'}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Server Configuration */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MemoryStick className="h-4 w-4" />
                        Server Configuration
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Server Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="e.g., web-server-01"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Display name for the server
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="hostname"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Hostname (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="web-server-01.example.com"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Server hostname (defaults to server name)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <FormField
                          control={form.control}
                          name="swap"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Swap Size (MB)</FormLabel>
                              <Select
                                value={field.value ? field.value.toString() : ""}
                                onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="512" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="0">Disabled</SelectItem>
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

                        <FormField
                          control={form.control}
                          name="vnc"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">VNC Console</FormLabel>
                                <FormDescription className="text-xs">
                                  Enable VNC access
                                </FormDescription>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="ipv6"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">IPv6</FormLabel>
                                <FormDescription className="text-xs">
                                  Enable IPv6 networking
                                </FormDescription>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                              <div className="space-y-0.5">
                                <FormLabel className="text-sm">Email Notifications</FormLabel>
                                <FormDescription className="text-xs">
                                  Send build notifications
                                </FormDescription>
                              </div>
                              <FormControl>
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  checked={field.value}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Separator />

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={handleClose} disabled={createServerMutation.isPending}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createServerMutation.isPending || !selectedPackage || !selectedUser || !selectedHypervisorGroup || !selectedOsTemplate || !form.watch('name')}
                    >
                      {createServerMutation.isPending ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Creating & Building Server...
                        </>
                      ) : (
                        'Create & Build Server'
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </>
        ) : step === 'building' ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-4">
                  <Spinner className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium">Building Server...</h3>
                <p className="text-muted-foreground mt-2">
                  Creating hardware resources and installing {selectedOsTemplate?.name} {selectedOsTemplate?.version}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  This process may take several minutes. Please do not close this window.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="outline" disabled>
                    Please Wait...
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-medium">Server Created & Built Successfully!</h3>
                <p className="text-muted-foreground mt-2">
                  Server ID: {createdServer?.id} • UUID: {createdServer?.uuid}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  The server has been created and the OS installation is in progress. You can monitor the build status from the server details page.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                  <Button onClick={handleClose}>
                    View Servers
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}
