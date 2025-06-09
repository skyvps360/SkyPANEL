import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Server, User, Settings, Check, ChevronsUpDown, Network, HardDrive, Cpu, MemoryStick, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: number;
  username: string;
  fullName?: string;
  email: string;
  virtFusionId?: number;
}

interface Hypervisor {
  id: number;
  name: string;
  hostname?: string;
  groupId?: number;
  groupName?: string;
  ip?: string;
  enabled?: boolean;
}

interface Package {
  id: number;
  name: string;
  description?: string;
  enabled: boolean;
  memory: number;                    // Memory in MB
  primaryStorage: number;            // Storage in GB
  traffic: number;                   // Traffic in GB
  cpuCores: number;                  // CPU cores
  primaryNetworkSpeedIn: number;     // Inbound network speed (kB/s)
  primaryNetworkSpeedOut: number;    // Outbound network speed (kB/s)
  primaryDiskType?: string;
  backupPlanId?: number;
  primaryStorageProfile?: number;    // Storage profile ID
  primaryNetworkProfile?: number;    // Network profile ID
  created?: string;
  price?: number;                    // Local pricing (not from VirtFusion)
}

interface OSTemplate {
  id: number;
  name: string;
  version: string;
  variant?: string;
  arch: number;
  description?: string;
  icon?: string;
  eol: boolean;
  eol_date?: string;
  eol_warning: boolean;
  deploy_type: number;
  vnc: boolean;
  type: string; // 'linux', 'windows', 'unix', etc.
}



interface AdminCreateServerFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Schema for admin server creation
const adminServerSchema = z.object({
  // Required fields
  name: z.string().min(3, "Server name must be at least 3 characters").max(50, "Server name must be at most 50 characters"),
  userId: z.number({
    required_error: "Please select a user"
  }),
  hypervisorId: z.number({
    required_error: "Please select a hypervisor"
  }),
  packageId: z.number({
    required_error: "Please select a package"
  }),

  // Optional basic fields
  hostname: z.string().optional(),
  dryRun: z.boolean().default(false),

  // OS Template and Build Options
  operatingSystemId: z.number().min(1, "Operating system is required"),
  enableVnc: z.boolean().default(false),
  enableIpv6: z.boolean().default(false),
  enableEmail: z.boolean().default(true),
  swapSize: z.number().min(0).default(512),

  // Optional resource overrides
  ipv4: z.number().min(0).max(10).optional(),
  storage: z.number().min(1).optional(),
  traffic: z.number().min(0).optional(), // 0 = unlimited
  memory: z.number().min(128).optional(),
  cpuCores: z.number().min(1).optional(),

  // Optional network settings
  networkSpeedInbound: z.number().min(0).optional(),
  networkSpeedOutbound: z.number().min(0).optional(),



  // Optional additional storage
  additionalStorage1Enable: z.boolean().default(false),
  additionalStorage2Enable: z.boolean().default(false),
  additionalStorage1Profile: z.number().optional(),
  additionalStorage2Profile: z.number().optional(),
  additionalStorage1Capacity: z.number().min(1).optional(),
  additionalStorage2Capacity: z.number().min(1).optional(),
});

export function AdminCreateServerForm({ onClose, onSuccess }: AdminCreateServerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // State for searchable dropdowns
  const [userOpen, setUserOpen] = useState(false);
  const [hypervisorOpen, setHypervisorOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [osTemplateOpen, setOsTemplateOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Setup form
  const form = useForm<z.infer<typeof adminServerSchema>>({
    resolver: zodResolver(adminServerSchema),
    defaultValues: {
      name: "",
      hostname: "",
      dryRun: false,
      ipv4: 1,
      enableVnc: false,
      enableIpv6: false,
      enableEmail: true,
      swapSize: 512,
      additionalStorage1Enable: false,
      additionalStorage2Enable: false,
    },
  });



  // Fetch users with VirtFusion accounts
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      const data = await response.json();
      // Filter users that have VirtFusion accounts
      return Array.isArray(data) ? data.filter((user: User) => user.virtFusionId) : [];
    },
  });

  // Fetch hypervisors
  const { data: hypervisors, isLoading: hypervisorsLoading } = useQuery<Hypervisor[]>({
    queryKey: ['/api/admin/hypervisors'],
    queryFn: async () => {
      const response = await fetch('/api/admin/hypervisors');
      if (!response.ok) {
        throw new Error('Failed to fetch hypervisors');
      }
      const data = await response.json();
      return data.data || [];
    },
  });

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery<Package[]>({
    queryKey: ['/api/packages'],
    queryFn: async () => {
      const response = await fetch('/api/packages');
      if (!response.ok) {
        throw new Error('Failed to fetch packages');
      }
      const data = await response.json();
      return Array.isArray(data) ? data : data.data || [];
    },
  });

  // Watch for package changes and auto-populate advanced configuration
  const selectedPackageId = form.watch("packageId");

  // Fetch OS templates for the selected package
  const { data: osTemplates, isLoading: osTemplatesLoading } = useQuery<OSTemplate[]>({
    queryKey: ['/api/admin/packages', selectedPackageId, 'templates'],
    queryFn: async () => {
      if (!selectedPackageId) return [];
      const response = await fetch(`/api/admin/packages/${selectedPackageId}/templates`);
      if (!response.ok) {
        throw new Error('Failed to fetch OS templates');
      }
      const data = await response.json();
      return data.data || [];
    },
    enabled: !!selectedPackageId,
  });

  useEffect(() => {
    if (selectedPackageId && packages) {
      const selectedPackage = packages.find(pkg => pkg.id === selectedPackageId);
      if (selectedPackage) {
        console.log(`Auto-populating fields for package: ${selectedPackage.name}`, selectedPackage);

        // Auto-populate advanced configuration fields with package defaults
        // Always update when package changes (not just empty fields)
        const updates: Partial<z.infer<typeof adminServerSchema>> = {};

        // Map VirtFusion package properties to form fields
        if (selectedPackage.cpuCores != null) {
          updates.cpuCores = selectedPackage.cpuCores;
        }
        if (selectedPackage.memory != null) {
          updates.memory = selectedPackage.memory;
        }
        if (selectedPackage.primaryStorage != null) {
          updates.storage = selectedPackage.primaryStorage;
        }
        if (selectedPackage.traffic != null) {
          updates.traffic = selectedPackage.traffic;
        }
        if (selectedPackage.primaryNetworkSpeedIn != null && selectedPackage.primaryNetworkSpeedIn > 0) {
          updates.networkSpeedInbound = selectedPackage.primaryNetworkSpeedIn;
        }
        if (selectedPackage.primaryNetworkSpeedOut != null && selectedPackage.primaryNetworkSpeedOut > 0) {
          updates.networkSpeedOutbound = selectedPackage.primaryNetworkSpeedOut;
        }

        // Update ALL fields when package changes (dynamic switching behavior)
        Object.entries(updates).forEach(([key, value]) => {
          if (value != null) {
            form.setValue(key as keyof z.infer<typeof adminServerSchema>, value);
            console.log(`Updated ${key} to ${value}`);
          }
        });
      }
    } else if (!selectedPackageId) {
      // Clear fields when no package is selected
      console.log("No package selected, clearing auto-populated fields");
      form.setValue("cpuCores", 0);
      form.setValue("memory", 0);
      form.setValue("storage", 0);
      form.setValue("traffic", 0);
      form.setValue("networkSpeedInbound", 0);
      form.setValue("networkSpeedOutbound", 0);
    }
  }, [selectedPackageId, packages, form]);








  // Create server mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: z.infer<typeof adminServerSchema>) => {
      const response = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create server');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Server Created",
        description: data.dryRun 
          ? "Server creation dry run completed successfully" 
          : "The server has been created successfully.",
      });
      if (!data.dryRun) {
        onSuccess();
      }
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: error.message || "There was a problem creating the server.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });

  // Form submission handler - Two-step process: Create then Build
  const handleSubmit = async (values: z.infer<typeof adminServerSchema>) => {
    setIsSubmitting(true);

    try {
      console.log('Step 1: Creating server...', values);

      // Step 1: Create the server (without OS installation)
      const createResponse = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          dryRun: false, // Ensure we're actually creating
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create server');
      }

      const serverData = await createResponse.json();
      const serverId = serverData.data?.id || serverData.id;

      if (!serverId) {
        throw new Error('Server created but no ID returned');
      }

      console.log('Step 1 Complete: Server created with ID:', serverId);
      console.log('Step 2: Building server with OS...', {
        serverId,
        operatingSystemId: values.operatingSystemId,
        serverName: values.name,
      });

      // Step 2: Build the server with the selected OS
      const buildResponse = await fetch(`/api/admin/servers/${serverId}/build`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operatingSystemId: values.operatingSystemId,
          serverName: values.name || `Server ${serverId}`,
          enableVnc: values.enableVnc || false,
          enableIpv6: values.enableIpv6 || false,
          enableEmail: values.enableEmail !== false, // Default to true
          swapSize: values.swapSize || 512,
        }),
      });

      if (!buildResponse.ok) {
        const errorData = await buildResponse.json();
        console.error('Build failed:', errorData);
        // Server was created but build failed - show partial success message
        toast({
          title: "Partial Success",
          description: `Server created successfully (ID: ${serverId}), but build failed: ${errorData.message || 'Unknown error'}. You can manually build it later.`,
          variant: "destructive",
        });
      } else {
        const buildData = await buildResponse.json();
        console.log('Step 2 Complete: Server built successfully', buildData);
        toast({
          title: "Success",
          description: 'Server created and build started successfully!',
        });
      }

      // Refresh the servers list and close the form
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers'] });
      onClose();

    } catch (error) {
      console.error('Server creation/build error:', error);
      toast({
        title: "Creation Failed",
        description: error instanceof Error ? error.message : 'Failed to create server',
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle dry run
  const handleDryRun = () => {
    const values = form.getValues();
    const validation = adminServerSchema.safeParse({ ...values, dryRun: true });
    
    if (!validation.success) {
      // Trigger form validation to show errors
      form.trigger();
      return;
    }

    setIsSubmitting(true);
    createServerMutation.mutate({ ...values, dryRun: true });
  };

  const isLoading = usersLoading || hypervisorsLoading || packagesLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="lg" />
      </div>
    );
  }

  // Helper component for searchable and paginated combobox
  const SearchableCombobox = ({
    value,
    onValueChange,
    options,
    placeholder,
    searchPlaceholder,
    emptyMessage,
    open,
    onOpenChange,
    renderOption,
    renderSelected,
    disabled = false,
    loading = false,
    searchFunction
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: any[];
    placeholder: string;
    searchPlaceholder: string;
    emptyMessage: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    renderOption: (option: any) => React.ReactNode;
    renderSelected?: (option: any) => React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    searchFunction: (option: any, query: string) => boolean;
  }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    const selectedOption = options.find(option => option.id.toString() === value);

    // Filter options based on search query
    const filteredOptions = searchQuery
      ? options.filter(option => searchFunction(option, searchQuery.toLowerCase()))
      : options;

    // Calculate pagination
    const totalPages = Math.ceil(filteredOptions.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedOptions = filteredOptions.slice(startIndex, endIndex);

    // Reset to first page when search changes
    useEffect(() => {
      setCurrentPage(1);
    }, [searchQuery]);

    // Reset search and page when dropdown closes
    useEffect(() => {
      if (!open) {
        setSearchQuery("");
        setCurrentPage(1);
      }
    }, [open]);

    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={disabled || loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Loading...</span>
              </div>
            ) : selectedOption ? (
              renderSelected ? renderSelected(selectedOption) : renderOption(selectedOption)
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" style={{ width: 'var(--radix-popover-trigger-width)' }}>
          <Command shouldFilter={false} className="w-full">
            <div className="flex items-center border-b px-3 w-full">
              <Search className="mr-2 h-4 w-4 shrink-0 text-gray-500" />
              <input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-none focus:ring-0"
              />
            </div>
            <CommandList className="w-full">
              {filteredOptions.length === 0 ? (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              ) : (
                <>
                  <CommandGroup className="w-full">
                    {paginatedOptions.map((option) => (
                      <CommandItem
                        key={option.id}
                        value={option.id.toString()}
                        onSelect={(currentValue) => {
                          onValueChange(currentValue === value ? "" : currentValue);
                          onOpenChange(false);
                        }}
                        className="w-full"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value === option.id.toString() ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {renderOption(option)}
                      </CommandItem>
                    ))}
                  </CommandGroup>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="border-t p-2 space-y-2 w-full">
                      <div className="flex items-center justify-center text-xs text-muted-foreground w-full">
                        <span>
                          Showing {startIndex + 1}-{Math.min(endIndex, filteredOptions.length)} of {filteredOptions.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="h-6 px-2 text-xs"
                        >
                          Previous
                        </Button>
                        <span className="text-xs text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="h-6 px-2 text-xs"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Server Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Name</FormLabel>
              <FormControl>
                <Input placeholder="web-server-01" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for the server
              </FormDescription>
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
              <FormControl>
                <SearchableCombobox
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  options={users || []}
                  placeholder="Select a user"
                  searchPlaceholder="Search users..."
                  emptyMessage="No users found."
                  open={userOpen}
                  onOpenChange={setUserOpen}
                  searchFunction={(user, query) =>
                    user.username?.toLowerCase().includes(query) ||
                    (user.fullName && user.fullName.toLowerCase().includes(query)) ||
                    user.email?.toLowerCase().includes(query)
                  }
                  renderOption={(user) => (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{user.username}</span>
                      {user.fullName && (
                        <span className="text-muted-foreground">({user.fullName})</span>
                      )}
                    </div>
                  )}
                />
              </FormControl>
              <FormDescription>
                Select the user who will own this server (only users with VirtFusion accounts are shown)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hypervisor Selection */}
        <FormField
          control={form.control}
          name="hypervisorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hypervisor</FormLabel>
              <FormControl>
                <SearchableCombobox
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  options={hypervisors || []}
                  placeholder="Select a hypervisor"
                  searchPlaceholder="Search hypervisors..."
                  emptyMessage="No hypervisors found."
                  open={hypervisorOpen}
                  onOpenChange={setHypervisorOpen}
                  searchFunction={(hypervisor, query) =>
                    hypervisor.name?.toLowerCase().includes(query) ||
                    (hypervisor.hostname && hypervisor.hostname.toLowerCase().includes(query)) ||
                    (hypervisor.ip && hypervisor.ip.toLowerCase().includes(query))
                  }
                  renderOption={(hypervisor) => (
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      <span>{hypervisor.name}</span>
                      {hypervisor.hostname && (
                        <span className="text-muted-foreground">({hypervisor.hostname})</span>
                      )}
                      {hypervisor.ip && !hypervisor.hostname && (
                        <span className="text-muted-foreground">({hypervisor.ip})</span>
                      )}
                    </div>
                  )}
                />
              </FormControl>
              <FormDescription>
                Select the hypervisor where the server will be created
              </FormDescription>
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
              <FormControl>
                <SearchableCombobox
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  options={packages || []}
                  placeholder="Select a package"
                  searchPlaceholder="Search packages..."
                  emptyMessage="No packages found."
                  open={packageOpen}
                  onOpenChange={setPackageOpen}
                  searchFunction={(pkg, query) =>
                    pkg.name?.toLowerCase().includes(query) ||
                    (pkg.cpuCores != null && pkg.cpuCores.toString().includes(query)) ||
                    (pkg.memory != null && pkg.memory.toString().includes(query)) ||
                    (pkg.primaryStorage != null && pkg.primaryStorage.toString().includes(query))
                  }
                  renderOption={(pkg) => (
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>{pkg.name}</span>
                      <span className="text-muted-foreground">
                        ({pkg.cpuCores ?? 'N/A'} CPU, {pkg.memory ?? 'N/A'}MB RAM, {pkg.primaryStorage ?? 'N/A'}GB Storage)
                      </span>
                    </div>
                  )}
                  renderSelected={(pkg) => (
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span className="truncate">{pkg.name}</span>
                    </div>
                  )}
                />
              </FormControl>
              <FormDescription>
                Select the server package that defines CPU, memory, and storage
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hostname (Optional) */}
        <FormField
          control={form.control}
          name="hostname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hostname (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="server.example.com" {...field} />
              </FormControl>
              <FormDescription>
                Optional hostname for the server
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* OS Template Selection */}
        <FormField
          control={form.control}
          name="operatingSystemId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operating System</FormLabel>
              <FormControl>
                <SearchableCombobox
                  value={field.value?.toString()}
                  onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                  options={osTemplates || []}
                  placeholder={selectedPackageId ? "Select an operating system" : "Select a package first"}
                  searchPlaceholder="Search operating systems..."
                  emptyMessage={selectedPackageId ? "No operating systems found." : "Please select a package first."}
                  open={osTemplateOpen}
                  onOpenChange={setOsTemplateOpen}
                  disabled={!selectedPackageId || osTemplatesLoading}
                  loading={osTemplatesLoading}
                  searchFunction={(template, query) =>
                    template.name?.toLowerCase().includes(query) ||
                    template.version?.toLowerCase().includes(query) ||
                    template.variant?.toLowerCase().includes(query) ||
                    template.type?.toLowerCase().includes(query)
                  }
                  renderOption={(template) => (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="font-medium">
                          {template.name} {template.version}
                          {template.variant && (
                            <span className="text-sm text-muted-foreground font-normal"> | {template.variant}</span>
                          )}
                          <span className="text-sm text-muted-foreground font-normal capitalize"> | {template.type}</span>
                        </div>
                      </div>
                      {template.eol && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">EOL</span>
                      )}
                    </div>
                  )}
                  renderSelected={(template) => (
                    <div className="flex items-center gap-2">
                      <span className="truncate">{template.name} {template.version}</span>
                      {template.eol && (
                        <span className="text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">EOL</span>
                      )}
                    </div>
                  )}
                />
              </FormControl>
              <FormDescription>
                Choose the operating system to install on the server
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Server Build Configuration */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg">Server Build Configuration</CardTitle>
            <CardDescription>
              Configure how the server will be built and deployed. The server name from above will be used as the display name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="swapSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Swap Size (MB)</FormLabel>
                    <FormControl>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                        <SelectTrigger>
                          <SelectValue placeholder="512 MB" />
                        </SelectTrigger>
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
                    </FormControl>
                    <FormDescription>Amount of swap space to allocate</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="enableVnc"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable VNC</FormLabel>
                      <FormDescription className="text-xs">
                        Remote desktop access
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableIpv6"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Enable IPv6</FormLabel>
                      <FormDescription className="text-xs">
                        IPv6 networking support
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableEmail"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Email Notifications</FormLabel>
                      <FormDescription className="text-xs">
                        Server status emails
                      </FormDescription>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Advanced Configuration Toggle */}
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? "Hide" : "Show"} Advanced Configuration
          </Button>
        </div>

        {/* Advanced Configuration Section */}
        {showAdvanced && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-lg">Advanced Configuration</CardTitle>
              <CardDescription>
                Override package defaults and configure advanced server settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resource Overrides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="ipv4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        IPv4 Addresses
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          placeholder="1"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Number of IPv4 addresses (0-10)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <HardDrive className="h-4 w-4" />
                        Storage (GB)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Package default"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Primary storage in GB
                        {selectedPackageId && packages?.find(p => p.id === selectedPackageId) && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Auto-populated from selected package)
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="memory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <MemoryStick className="h-4 w-4" />
                        Memory (MB)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="128"
                          placeholder="Package default"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Memory in MB
                        {selectedPackageId && packages?.find(p => p.id === selectedPackageId) && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Auto-populated from selected package)
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpuCores"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Cpu className="h-4 w-4" />
                        CPU Cores
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Package default"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of CPU cores
                        {selectedPackageId && packages?.find(p => p.id === selectedPackageId) && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Auto-populated from selected package)
                          </span>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="traffic"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Network className="h-4 w-4" />
                        Traffic (GB)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0 (unlimited)"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Monthly traffic limit (0 = unlimited)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="networkSpeedInbound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Inbound Speed (kB/s)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Package default"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Inbound network speed limit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="networkSpeedOutbound"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outbound Speed (kB/s)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="Package default"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        />
                      </FormControl>
                      <FormDescription>Outbound network speed limit</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>



              {/* Additional Storage */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Additional Storage</h4>

                {/* Additional Storage 1 */}
                <div className="space-y-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name="additionalStorage1Enable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Additional Storage 1</FormLabel>
                          <FormDescription>
                            Add a second storage disk to the server
                          </FormDescription>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("additionalStorage1Enable") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalStorage1Capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity (GB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="10"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
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
                <div className="space-y-4 p-4 border rounded-lg">
                  <FormField
                    control={form.control}
                    name="additionalStorage2Enable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Enable Additional Storage 2</FormLabel>
                          <FormDescription>
                            Add a third storage disk to the server
                          </FormDescription>
                        </div>
                        <FormControl>
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="h-4 w-4"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch("additionalStorage2Enable") && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="additionalStorage2Capacity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Capacity (GB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="20"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />


                    </div>
                  )}
                </div>
              </div>


            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleDryRun}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              Dry Run
            </Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" className="mr-2" /> : null}
              Create Server
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
