import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Server, User, HardDrive, Cpu, MemoryStick, Network, CheckCircle, ChevronsUpDown, Dices, Key, AlertCircle, CreditCard, Clock, Loader2, Monitor, Terminal, Smartphone } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandItem
} from "@/components/ui/command";
import { Pagination } from "@/components/ui/pagination";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";

interface ClientServerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  companyName?: string;
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

  // Self-Service Billing Flags
  selfService: z.number().int().min(0).max(1).default(1),
  selfServiceHourlyCredit: z.boolean().default(true),
  selfServiceHourlyResourcePack: z.number().int().positive().default(1),
  
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

export default function ClientServerCreateModal({ open, onOpenChange, onSuccess, companyName }: ClientServerCreateModalProps) {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  // Fetch public settings to obtain self-service billing flag defaults
  const { data: publicSettings } = useQuery({
    queryKey: ["/api/settings/public"],
    queryFn: async () => {
      const res = await fetch("/api/settings/public");
      if (!res.ok) throw new Error("Failed to fetch public settings");
      return res.json();
    },
    staleTime: 10 * 60 * 1000 // cache for 10 minutes
  });

  // Fetch branding data for consistent theming
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedHypervisorGroup, setSelectedHypervisorGroup] = useState<any>(null);
  const [selectedOsTemplate, setSelectedOsTemplate] = useState<any>(null);
  const [step, setStep] = useState<'create' | 'building' | 'installing' | 'success' | 'failed'>('create');
  const [currentStep, setCurrentStep] = useState<'package' | 'location' | 'os' | 'details' | 'review'>('package');
  const [createdServer, setCreatedServer] = useState<any>(null);
  const [serverName, setServerName] = useState<string>('');
  const queryClient = useQueryClient();
  const [pollId, setPollId] = useState<NodeJS.Timeout | null>(null);
  // Stores VirtFusion queue ID returned by the build request (used for polling)
  const [queueId, setQueueId] = useState<number | null>(null);
  // OS template dropdown helpers
  const [osSelectOpen, setOsSelectOpen] = useState(false);
  const [osSearch, setOsSearch] = useState("");
  const [osPage, setOsPage] = useState(1);
  const pageSize = 5;

  // Package dropdown helpers
  const [packageSelectOpen, setPackageSelectOpen] = useState(false);
  const [packageSearch, setPackageSearch] = useState("");
  const [packagePage, setPackagePage] = useState(1);

  // Check if user has VirtFusion tokens
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['/api/billing/balance'],
    queryFn: async () => {
      const response = await fetch('/api/billing/balance');
      if (!response.ok) {
        throw new Error('Failed to fetch balance');
      }
      return response.json();
    },
    enabled: open && !!user,
  });

  const hasVirtFusionTokens = balanceData?.virtFusionTokens > 0;
  const hasVirtFusionAccount = !!user?.virtFusionId;

  // Fetch VirtFusion packages
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ["/api/packages"],
    queryFn: async () => {
      const response = await fetch("/api/packages");
      if (!response.ok) throw new Error("Failed to fetch packages");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch VirtFusion cron settings for hours per month calculation
  const { data: virtfusionCronData } = useQuery({
    queryKey: ['cron-status'],
    queryFn: async () => {
      const response = await fetch('/api/admin/cron/status');
      if (!response.ok) throw new Error('Failed to fetch VirtFusion cron settings');
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch VirtFusion settings to check billing mode (hourly vs monthly)
  const { data: virtfusionSettings } = useQuery({
    queryKey: ['virtfusion-settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings/virtfusion');
      if (!response.ok) throw new Error('Failed to fetch VirtFusion settings');
      return response.json();
    },
    staleTime: 30000,
  });

  // Fetch VirtFusion hypervisor groups (required for server creation)
  const { data: hypervisorsData, isLoading: hypervisorsLoading, error: hypervisorsError } = useQuery({
    queryKey: ['/api/hypervisor-groups'],
    queryFn: async () => {
      const response = await fetch('/api/hypervisor-groups');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch hypervisor groups');
      }
      return response.json();
    },
    enabled: open,
  });

  // Fetch VirtFusion OS templates – now package-specific like admin modal
  const selectedPackageId = selectedPackage?.id;
  const { data: osTemplatesData, isLoading: osTemplatesLoading, error: osTemplatesError } = useQuery({
    queryKey: ['/api/os-templates', selectedPackageId],
    queryFn: async () => {
      // Require a package before fetching templates
      if (!selectedPackageId) return { data: [] };
      const response = await fetch(`/api/os-templates?packageId=${selectedPackageId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch OS templates');
      }
      return response.json();
    },
    enabled: open && !!selectedPackageId,
  });

  // Fetch SSH keys for the current user
  const { data: sshKeysData, isLoading: sshKeysLoading, error: sshKeysError } = useQuery({
    queryKey: ['/api/admin/ssh-keys/user', user?.id],
    queryFn: async () => {
      if (!user?.id) return { data: [] };
      const response = await fetch(`/api/admin/ssh-keys/user/${user.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch SSH keys');
      }
      return response.json();
    },
    enabled: open && !!user?.id,
  });

  // ---------------- OS template filtering / pagination ----------------
  // Process OS templates data for filtering and pagination
  const osTemplates = osTemplatesData?.data || osTemplatesData || [];
  
  // Flatten OS template categories for easier searching / paging (like admin modal)
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

  const filteredOsTemplates = useMemo(() => {
    if (!osSearch) return flatOsTemplates;
    return flatOsTemplates.filter((template: any) =>
      `${template.name} ${template.version} ${template.variant || ""} ${template.description || ""}`
        .toLowerCase()
        .includes(osSearch.toLowerCase())
    );
  }, [flatOsTemplates, osSearch]);

  const totalOsPages = Math.ceil(filteredOsTemplates.length / pageSize);
  const paginatedOsTemplates = useMemo(() => {
    const startIndex = (osPage - 1) * pageSize;
    return filteredOsTemplates.slice(startIndex, startIndex + pageSize);
  }, [filteredOsTemplates, osPage, pageSize]);

  // Reset OS search and page when modal opens/closes
  useEffect(() => {
    if (!open) {
      setOsSearch("");
      setOsPage(1);
    }
  }, [open]);

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
      operatingSystemId: 0,
      name: "",
      hostname: "",
      sshKeys: [],
      vnc: false,
      ipv6: false,
      email: true,
      swap: 512
    }
  });

  // Auto-set user ID when user is available
  useEffect(() => {
    if (user?.id) {
      form.setValue('userId', user.id);
    }
  }, [user, form]);

  // Auto-populate form when package is selected
  useEffect(() => {
    if (selectedPackage && form) {
      form.setValue('packageId', selectedPackage.id);
      form.setValue('storage', selectedPackage.primaryStorage || 20);
      if (typeof selectedPackage.traffic === 'number') {
        form.setValue('traffic', selectedPackage.traffic);
      } else {
        form.setValue('traffic', 1000);
      }
      form.setValue('memory', selectedPackage.memory || 1024);
      form.setValue('cpuCores', selectedPackage.cpuCores || 1);
      form.setValue('networkSpeedInbound', selectedPackage.primaryNetworkSpeedIn || 1000);
      form.setValue('networkSpeedOutbound', selectedPackage.primaryNetworkSpeedOut || 1000);
      form.setValue('storageProfile', selectedPackage.primaryStorageProfile || 0);
      form.setValue('networkProfile', selectedPackage.primaryNetworkProfile || 0);
      
      // Reset OS selection when package changes since OS templates are package-specific
      setSelectedOsTemplate(null);
      form.setValue('operatingSystemId', 0);
    }
  }, [selectedPackage, form]);

  // Auto-populate form when hypervisor group is selected
  useEffect(() => {
    if (selectedHypervisorGroup && form) {
      form.setValue('hypervisorId', selectedHypervisorGroup.id);
    }
  }, [selectedHypervisorGroup, form]);

  // Auto-populate form when OS template is selected
  useEffect(() => {
    if (selectedOsTemplate && form) {
      form.setValue('operatingSystemId', selectedOsTemplate.id);
    }
  }, [selectedOsTemplate, form]);

  // ---------------- Package dropdown filtering / pagination ----------------
  const processedPackages = Array.isArray(packages) ? packages : [];
  console.log('Client packages data:', packages);
  console.log('Processed packages:', processedPackages);
  const filteredPackages = useMemo(() => {
    if (!packageSearch) return processedPackages;
    return processedPackages.filter((p: any) =>
      `${p.name} ${p.cpuCores} ${p.memory} ${p.primaryStorage}`.toLowerCase().includes(packageSearch.toLowerCase())
    );
  }, [processedPackages, packageSearch]);

  const totalPackagePages = Math.max(1, Math.ceil(filteredPackages.length / pageSize));
  const paginatedPackages = useMemo(
    () => filteredPackages.slice((packagePage - 1) * pageSize, packagePage * pageSize),
    [filteredPackages, packagePage]
  );

  useEffect(() => {
    setPackagePage(1);
  }, [packageSearch]);

  const generateRandomServerName = () => {
    const adjectives = ['swift', 'mighty', 'brave', 'noble', 'wise', 'bright', 'calm', 'eager', 'fair', 'gentle'];
    const nouns = ['server', 'node', 'instance', 'host', 'machine', 'system', 'unit', 'box', 'station', 'terminal'];
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    return `${adjective}-${noun}-${number}`;
  };

  const getOSIcon = (osName: string) => {
    const name = osName.toLowerCase();
    
    // Windows
    if (name.includes('windows')) {
      return Monitor;
    }
    
    // Linux distributions
    if (name.includes('ubuntu') || name.includes('debian') || name.includes('centos') || 
        name.includes('redhat') || name.includes('fedora') || name.includes('almalinux') ||
        name.includes('rocky') || name.includes('arch') || name.includes('suse') ||
        name.includes('mint') || name.includes('kali') || name.includes('linux')) {
      return Terminal;
    }
    
    // Mobile/Android
    if (name.includes('android') || name.includes('mobile')) {
      return Smartphone;
    }
    
    // Default fallback
    return HardDrive;
  };

  // Step navigation functions
  const nextStep = () => {
    const steps: Array<'package' | 'location' | 'os' | 'details' | 'review'> = ['package', 'location', 'os', 'details', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Array<'package' | 'location' | 'os' | 'details' | 'review'> = ['package', 'location', 'os', 'details', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const canGoNext = () => {
    switch (currentStep) {
      case 'package':
        return !!selectedPackage;
      case 'location':
        return !!selectedHypervisorGroup;
      case 'os':
        return !!selectedOsTemplate;
      case 'details':
        return !!form.watch('name')?.trim();
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const canGoPrev = () => {
    const steps: Array<'package' | 'location' | 'os' | 'details' | 'review'> = ['package', 'location', 'os', 'details', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    return currentIndex > 0;
  };

  // Helper to poll VirtFusion queue item status (preferred when we have queueId)
  const startQueuePolling = (vfQueueId: number, serverId: number) => {
    // Clear any existing poller first
    if (pollId) clearInterval(pollId);

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/queue/${vfQueueId}`);
        if (!res.ok) throw new Error("Failed to fetch queue item");
        const queueItem = await res.json();

        // VirtFusion returns a 'data' wrapper; fall back to root when absent
        const itemData: any = queueItem.data || queueItem;

        const finished = itemData.finished !== null && itemData.finished !== undefined;
        const failed = itemData.failed === true || itemData.failed === 1;

        if (finished) {
          clearInterval(id);
          setPollId(null);
          if (!failed) {
            setStep("success");
            toast({
              title: "Server Ready!",
              description: `Server "${serverName}" has been successfully created and is now ready to use.`,
            });
          } else {
            setStep("failed");
            toast({
              title: "Server Build Failed",
              description: "The server build process failed. Please try again.",
              variant: "destructive",
            });
          }
          // Invalidate server list cache once done so UI refreshes
          queryClient.invalidateQueries({ queryKey: ["/api/user/servers"] });
        }
      } catch (err) {
        console.error("Queue polling error:", err);
      }
    }, 10000); // 10-second interval

    setPollId(id);
  };

  // Helper to poll VirtFusion for build status (fallback when no queueId)
  const startBuildPolling = (serverId: number) => {
    // Clear any existing poller
    if (pollId) clearInterval(pollId);

    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/user/servers/${serverId}`);
        if (!res.ok) throw new Error('Failed to fetch server status');
        const serverResp = await res.json();

        // VirtFusion API usually wraps the response in a data property
        const serverData: any = serverResp.data || serverResp;
        const state: string | undefined = serverData.state;
        const buildFailed: boolean = serverData.buildFailed === true;
        const tasksActiveFlag = serverData.tasks?.active;

        // If tasksActiveFlag is explicitly false the queue finished processing
        if (tasksActiveFlag === false) {
          clearInterval(id);
          setPollId(null);
          if (!buildFailed) {
            setStep('success');
            toast({
              title: "Server Ready!",
              description: `Server "${serverName}" has been successfully created and is now ready to use.`,
            });
          } else {
            setStep('failed');
            toast({
              title: "Server Build Failed",
              description: "The server build process failed. Please try again.",
              variant: "destructive",
            });
          }
          queryClient.invalidateQueries({ queryKey: ['/api/user/servers'] });
          return;
        }

        // If tasks are still active keep waiting
        if (tasksActiveFlag === true) {
          return;
        }

        // Fallback – rely on explicit state flags if tasks info is missing
        if (state === 'complete') {
          clearInterval(id);
          setPollId(null);
          setStep('success');
          toast({
            title: "Server Ready!",
            description: `Server "${serverName}" has been successfully created and is now ready to use.`,
          });
          queryClient.invalidateQueries({ queryKey: ['/api/user/servers'] });
        } else if (buildFailed || state === 'failed' || state === 'error') {
          clearInterval(id);
          setPollId(null);
          setStep('failed');
          toast({
            title: "Server Build Failed",
            description: "The server build process failed. Please try again.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 10000); // 10-second interval

    setPollId(id);
  };

  const createServerMutation = useMutation({
    mutationFn: async (data: ServerCreateFormData) => {
      console.log("Creating server with data:", data);
      
      // Step 1: Create server hardware
      setStep('building');
      const createResponse = await fetch('/api/user/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.message || 'Failed to create server');
      }

      const createResult = await createResponse.json();
      console.log("Server creation result:", createResult);
      setCreatedServer(createResult);

      // Step 2: Build server with OS
      setStep('installing');
      const buildData = {
        operatingSystemId: data.operatingSystemId,
        name: data.name,
        hostname: data.hostname || data.name,
        sshKeys: data.sshKeys,
        vnc: data.vnc,
        ipv6: data.ipv6,
        email: data.email,
        swap: data.swap
      };

      const buildResponse = await fetch(`/api/user/servers/${createResult.data.id}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildData)
      });

      if (!buildResponse.ok) {
        const error = await buildResponse.json();
        throw new Error(error.message || 'Failed to build server');
      }

      const buildResult = await buildResponse.json();
      console.log("Server build result:", buildResult);

      // Start polling based on available information
      const qId = buildResult.data?.queueId ?? buildResult.data?.queue_id ?? null;
      setQueueId(qId ?? null);
      
      if (qId) {
        // Prefer queue polling when we have a queue ID
        startQueuePolling(qId, createResult.data.id);
      } else {
        // Fall back to server polling
        startBuildPolling(createResult.data.id);
      }

      return { createResult, buildResult };
    },
    onSuccess: (data) => {
      // Invalidate servers list to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/user/servers'] });
      // Call the onSuccess prop if provided
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Server creation failed:", error);
      setStep('failed');
      toast({
        title: "Server Creation Failed",
        description: error.message || "An error occurred while creating the server.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ServerCreateFormData) => {
    setServerName(data.name);

    // Merge self-service billing flags from settings (fallback defaults)
    const settings: Record<string, any> = publicSettings?.data ?? publicSettings ?? {};
    const payload = {
      ...data,
      selfService: Number(settings["virtfusion_self_service"] ?? 1),
      selfServiceHourlyCredit: (settings["virtfusion_self_service_hourly_credit"] ?? "true") === "true",
      selfServiceHourlyResourcePack: Number(settings["virtfusion_self_service_hourly_resource_pack_id"] ?? 1)
    } as ServerCreateFormData;

    createServerMutation.mutate(payload);
  };

  // Clear poller on unmount
  useEffect(() => {
    return () => {
      if (pollId) clearInterval(pollId);
    };
  }, [pollId]);

  const resetAndClose = () => {
    // Clear any active polling
    if (pollId) {
      clearInterval(pollId);
      setPollId(null);
    }
    
    setSelectedPackage(null);
    setSelectedHypervisorGroup(null);
    setSelectedOsTemplate(null);
    setStep('create');
    setCurrentStep('package');
    setCreatedServer(null);
    setServerName('');
    setQueueId(null);
    setOsSelectOpen(false);
    setOsSearch("");
    setOsPage(1);
    setPackageSelectOpen(false);
    setPackageSearch("");
    setPackagePage(1);
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // Prevent closing during building or installing steps
    if (!nextOpen && (step === 'building' || step === 'installing')) {
      return;
    }
    
    if (!nextOpen) {
      resetAndClose();
    } else {
      onOpenChange(true);
    }
  };

  // Check if user can create servers
  const canCreateServer = hasVirtFusionAccount && hasVirtFusionTokens;
  const isLoading = balanceLoading || packagesLoading || hypervisorsLoading || osTemplatesLoading;

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className={cn(
          "max-w-6xl max-h-[95vh] overflow-y-auto",
          // Hide close button during building/installing
          (step === 'building' || step === 'installing') && "[&>button]:hidden"
        )}
        onPointerDownOutside={(e) => {
          // Prevent closing on backdrop click during building/installing
          if (step === 'building' || step === 'installing') {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing on escape key during building/installing
          if (step === 'building' || step === 'installing') {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'building' && <Loader2 className="h-5 w-5 animate-spin" />}
            {step === 'installing' && <Loader2 className="h-5 w-5 animate-spin" />}
            {step === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {step === 'failed' && <AlertCircle className="h-5 w-5 text-destructive" />}
            {step === 'create' && <Server className="h-5 w-5" />}
            {step === 'create' && `Create Server in ${companyName || 'SkyPANEL'}`}
            {step === 'building' && 'Creating Server Hardware'}
            {step === 'installing' && 'Installing Operating System'}
            {step === 'success' && 'Server Ready!'}
            {step === 'failed' && 'Server Creation Failed'}
          </DialogTitle>
          <DialogDescription>
            {step === 'create' && 'Create a new virtual server with your preferred configuration.'}
            {step === 'building' && `Setting up your server "${serverName}" with the selected configuration...`}
            {step === 'installing' && `Installing ${selectedOsTemplate?.name} ${selectedOsTemplate?.version} on your server...`}
            {step === 'success' && `Your server "${serverName}" has been successfully created and is now ready to use.`}
            {step === 'failed' && 'An error occurred while creating your server. Please try again.'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        {step === 'create' && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-muted-foreground">Server Creation Progress</h3>
              <span className="text-xs text-muted-foreground">
                Step {['package', 'location', 'os', 'details', 'review'].indexOf(currentStep) + 1} of 5
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {['package', 'location', 'os', 'details', 'review'].map((stepName, index) => {
                const isActive = currentStep === stepName;
                const isCompleted = ['package', 'location', 'os', 'details', 'review'].indexOf(currentStep) > index;
                const stepLabels = {
                  package: 'Package',
                  location: 'Location', 
                  os: 'OS',
                  details: 'Details',
                  review: 'Review'
                };
                
                return (
                  <div key={stepName} className="flex items-center">
                    <div className="flex items-center">
                      <div 
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium border-2",
                          isActive 
                            ? "bg-primary text-primary-foreground border-primary" 
                            : isCompleted
                            ? "bg-green-500 text-white border-green-500"
                            : "bg-muted text-muted-foreground border-muted"
                        )}
                      >
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </div>
                      <span 
                        className={cn(
                          "ml-2 text-xs font-medium",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {stepLabels[stepName as keyof typeof stepLabels]}
                      </span>
                    </div>
                    {index < 4 && (
                      <div 
                        className={cn(
                          "w-8 h-0.5 mx-2",
                          isCompleted ? "bg-green-500" : "bg-muted"
                        )}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner className="h-8 w-8" />
            <span className="ml-2">Loading server creation options...</span>
          </div>
        ) : !hasVirtFusionAccount ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">VirtFusion Account Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to link your account to VirtFusion before creating servers.
            </p>
            <Button onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : !hasVirtFusionTokens ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Insufficient Credits</h3>
            <p className="text-muted-foreground mb-4">
              You need VirtFusion tokens to create servers. Please add credits to your account.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button onClick={() => {
                onOpenChange(false);
                // Redirect to billing page
                window.location.href = '/billing';
              }}>
                Add Credits
              </Button>
            </div>
          </div>
        ) : step === 'building' ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Creating Server Hardware</h3>
            <p className="text-muted-foreground mb-4">
              Setting up your server "{serverName}" with the selected configuration...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              This usually takes 1-2 minutes
            </div>
          </div>
        ) : step === 'installing' ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-orange-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Installing Operating System</h3>
            <p className="text-muted-foreground mb-4">
              Installing {selectedOsTemplate?.name} {selectedOsTemplate?.version} on your server...
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              This may take 5-15 minutes depending on the OS
            </div>
          </div>
        ) : step === 'success' ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Server Ready!</h3>
            <p className="text-muted-foreground mb-4">
              Your server "{serverName}" has been successfully created and is now ready to use.
            </p>
            {createdServer?.data && (
              <div className="mb-4 p-4 bg-muted/50 rounded-lg text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">Server Details:</h4>
                <div className="text-sm space-y-1">
                  <div>ID: {createdServer.data.id}</div>
                  <div>Name: {createdServer.data.name || serverName}</div>
                  {createdServer.data.primaryIpv4 && (
                    <div>IP Address: {createdServer.data.primaryIpv4}</div>
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button 
                onClick={() => {
                  if (createdServer?.data?.id) {
                    navigate(`/servers/${createdServer.data.id}`);
                    resetAndClose();
                  }
                }}
                disabled={!createdServer?.data?.id}
              >
                View Server
              </Button>
              <Button variant="outline" onClick={resetAndClose}>
                Close
              </Button>
            </div>
          </div>
        ) : step === 'failed' ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Server Creation Failed</h3>
            <p className="text-muted-foreground mb-4">
              An error occurred while creating your server. Please try again.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setStep('create')}>
                Try Again
              </Button>
              <Button onClick={resetAndClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* User Information Header */}
              <div 
                className="p-6 rounded-xl border"
                style={{
                  background: `linear-gradient(to right, ${brandColors.primary.extraLight}, ${brandColors.primary.lighter})`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: brandColors.primary.light }}
                  >
                    <User 
                      className="h-6 w-6" 
                      style={{ color: brandColors.primary.full }}
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      <div>
                        <label className="text-sm font-medium">Username</label>
                        <p className="text-sm text-muted-foreground">{user.username}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">
                          VirtFusion Credits {(() => {
                            const settings = publicSettings?.data ?? publicSettings ?? {};
                            const isHourlyBilling = (settings["virtfusion_self_service_hourly_credit"] ?? "true") === "true";
                            return (
                              <span className="text-xs font-normal text-muted-foreground">
                                ({isHourlyBilling ? 'Hourly Billing' : 'Monthly Billing'})
                              </span>
                            );
                          })()}
                        </label>
                        <p 
                          className="text-sm font-semibold"
                          style={{ color: brandColors.secondary.full }}
                        >
                          ${balanceData?.virtFusionCredits?.toFixed(2) || '0.00'} USD
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step Content */}
              {currentStep === 'package' && (
                <div className="space-y-6">
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.primary.light }}
                      >
                        <Server 
                          className="h-5 w-5" 
                          style={{ color: brandColors.primary.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">Server Package</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="packageId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={selectedPackage?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const pkg = packages.find((p: any) => p.id.toString() === value);
                              if (pkg) {
                                field.onChange(pkg.id);
                                setSelectedPackage(pkg);
                              }
                            }}
                            disabled={packagesLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select a package...">
                                  {selectedPackage && (
                                    <div className="flex items-center justify-between w-full px-2 py-1">
                                      <div className="flex items-center gap-4">
                                        <div 
                                          className="p-2 rounded"
                                          style={{ backgroundColor: brandColors.primary.extraLight }}
                                        >
                                          <Cpu 
                                            className="h-4 w-4" 
                                            style={{ color: brandColors.primary.full }}
                                          />
                                        </div>
                                        <span className="font-medium text-sm">{selectedPackage.name}</span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                          <span>{selectedPackage.cpuCores} vCPU</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                          <span>{selectedPackage.memory}MB RAM</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                          <span>{selectedPackage.primaryStorage}GB SSD</span>
                                        </div>
                                        {(selectedPackage.pricing || selectedPackage.price) && (
                                          <div 
                                            className="px-3 py-1 rounded-full text-xs font-semibold text-white ml-3"
                                            style={{ backgroundColor: brandColors.primary.full }}
                                          >
                                            ${(() => {
                                              const monthlyPrice = selectedPackage.pricing?.price || selectedPackage.price || 0;
                                              
                                              // Check if hourly billing is enabled from public settings
                                              const settings = publicSettings?.data ?? publicSettings ?? {};
                                              const isHourlyBilling = (settings["virtfusion_self_service_hourly_credit"] ?? "true") === "true";
                                              
                                              if (isHourlyBilling) {
                                                const hoursPerMonth = virtfusionCronData?.hoursPerMonth || 730;
                                                const hourlyRate = monthlyPrice / hoursPerMonth;
                                                return hourlyRate.toFixed(4) + ' /hr';
                                              } else {
                                                return monthlyPrice.toFixed(2) + ' /mo';
                                              }
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </SelectValue>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[28rem]">
                              <div className="p-2">
                                <Input
                                  placeholder="Search packages..."
                                  value={packageSearch}
                                  onChange={(e) => setPackageSearch(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {paginatedPackages.map((pkg: any) => {
                                const isSelected = selectedPackage?.id === pkg.id;
                                return (
                                  <SelectItem 
                                    key={pkg.id} 
                                    value={pkg.id.toString()} 
                                    className="p-3 hover:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 text-gray-900 hover:text-gray-900 data-[highlighted]:text-gray-900 data-[state=checked]:text-gray-900 relative [&>span:first-child]:hidden overflow-hidden"
                                  >
                                    <div className="flex items-center w-full gap-3">
                                      {/* Selection Indicator */}
                                      {isSelected && (
                                        <div 
                                          className="w-1 h-8 rounded-full shrink-0"
                                          style={{ backgroundColor: brandColors.primary.full }}
                                        />
                                      )}
                                      {!isSelected && (
                                        <div className="w-1 h-8 shrink-0" />
                                      )}
                                      
                                      {/* Icon */}
                                      <div 
                                        className="p-2 rounded shrink-0 mt-0.5"
                                        style={{ 
                                          backgroundColor: isSelected ? brandColors.primary.light : brandColors.primary.extraLight,
                                          border: isSelected ? `2px solid ${brandColors.primary.full}` : 'none'
                                        }}
                                      >
                                        <Cpu 
                                          className="h-4 w-4" 
                                          style={{ color: brandColors.primary.full }}
                                        />
                                      </div>
                                    
                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                      {/* Package Name */}
                                      <div className="mb-1.5">
                                        <h4 className="font-medium text-foreground truncate">{pkg.name}</h4>
                                      </div>
                                      
                                      {/* Specifications and Price Row */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                            <span>{pkg.cpuCores} vCPU</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                            <span>{pkg.memory}MB RAM</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500"></div>
                                            <span>{pkg.primaryStorage}GB SSD</span>
                                          </div>
                                        </div>
                                        
                                        {/* Price Badge */}
                                        {(pkg.pricing || pkg.price) && (
                                          <div 
                                            className="px-2.5 py-1 rounded-full text-xs font-semibold text-white shrink-0 ml-2"
                                            style={{ backgroundColor: brandColors.primary.full }}
                                          >
                                            ${(() => {
                                              const monthlyPrice = pkg.pricing?.price || pkg.price || 0;
                                              
                                              // Check if hourly billing is enabled from public settings
                                              const settings = publicSettings?.data ?? publicSettings ?? {};
                                              const isHourlyBilling = (settings["virtfusion_self_service_hourly_credit"] ?? "true") === "true";
                                              
                                              if (isHourlyBilling) {
                                                const hoursPerMonth = virtfusionCronData?.hoursPerMonth || 730;
                                                const hourlyRate = monthlyPrice / hoursPerMonth;
                                                return hourlyRate.toFixed(4) + ' /hr';
                                              } else {
                                                return monthlyPrice.toFixed(2) + ' /mo';
                                              }
                                            })()}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </SelectItem>
                                );
                              })}
                              {totalPackagePages > 1 && (
                                <div className="border-t bg-muted/30 p-2">
                                  <Pagination
                                    currentPage={packagePage}
                                    totalPages={totalPackagePages}
                                    onPageChange={setPackagePage}
                                    className="justify-center [&>*]:h-7 [&>*]:text-xs"
                                  />
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs mt-2">
                            Choose the hardware specifications for your server
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {currentStep === 'location' && (
                <div className="space-y-6">
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.secondary.light }}
                      >
                        <Network 
                          className="h-5 w-5" 
                          style={{ color: brandColors.secondary.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">Datacenter Location</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="hypervisorId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={selectedHypervisorGroup?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const group = hypervisorsData?.find((g: any) => g.id.toString() === value);
                              setSelectedHypervisorGroup(group);
                            }}
                            disabled={hypervisorsLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select a datacenter..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {hypervisorsData?.map((group: any) => {
                                const isSelected = selectedHypervisorGroup?.id === group.id;
                                return (
                                  <SelectItem 
                                    key={group.id} 
                                    value={group.id.toString()} 
                                    className="p-3 hover:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 text-gray-900 hover:text-gray-900 data-[highlighted]:text-gray-900 data-[state=checked]:text-gray-900 relative [&>span:first-child]:hidden overflow-hidden"
                                  >
                                    <div className="flex items-center gap-3">
                                      {/* Selection Indicator */}
                                      {isSelected && (
                                        <div 
                                          className="w-1 h-8 rounded-full shrink-0"
                                          style={{ backgroundColor: brandColors.secondary.full }}
                                        />
                                      )}
                                      {!isSelected && (
                                        <div className="w-1 h-8 shrink-0" />
                                      )}
                                      
                                      <div 
                                        className="p-2 rounded"
                                        style={{ 
                                          backgroundColor: isSelected ? brandColors.secondary.light : brandColors.secondary.extraLight,
                                          border: isSelected ? `2px solid ${brandColors.secondary.full}` : 'none'
                                        }}
                                      >
                                        <Network 
                                          className="h-4 w-4" 
                                          style={{ color: brandColors.secondary.full }}
                                        />
                                      </div>
                                      <span className="font-medium text-foreground">{group.name}</span>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs mt-2">
                            Choose the geographical location for your server
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {currentStep === 'os' && (
                <div className="space-y-6">
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.primary.light }}
                      >
                        {(() => {
                          const OSIcon = selectedOsTemplate ? getOSIcon(selectedOsTemplate.name) : HardDrive;
                          return (
                            <OSIcon 
                              className="h-5 w-5" 
                              style={{ color: brandColors.primary.full }}
                            />
                          );
                        })()}
                      </div>
                      <h3 className="text-lg font-semibold">Operating System</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="operatingSystemId"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value={selectedOsTemplate?.id?.toString() || ""}
                            onValueChange={(value) => {
                              const template = flatOsTemplates.find((t: any) => t.id.toString() === value);
                              if (template) {
                                field.onChange(template.id);
                                setSelectedOsTemplate(template);
                              }
                            }}
                            disabled={!selectedPackage || osTemplatesLoading || flatOsTemplates.length === 0}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select an operating system" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-80">
                              <div className="p-2">
                                <Input
                                  placeholder="Search operating systems..."
                                  value={osSearch}
                                  onChange={(e) => setOsSearch(e.target.value)}
                                  className="mb-2"
                                />
                              </div>
                              {paginatedOsTemplates.map((template: any) => {
                                const OSIcon = getOSIcon(template.name);
                                const isSelected = selectedOsTemplate?.id === template.id;
                                return (
                                  <SelectItem 
                                    key={template.id} 
                                    value={template.id.toString()} 
                                    className="p-3 hover:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 text-gray-900 hover:text-gray-900 data-[highlighted]:text-gray-900 data-[state=checked]:text-gray-900 relative [&>span:first-child]:hidden overflow-hidden"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <div className="flex items-center gap-3 min-w-0 flex-1">
                                        {/* Selection Indicator */}
                                        {isSelected && (
                                          <div 
                                            className="w-1 h-8 rounded-full shrink-0"
                                            style={{ backgroundColor: brandColors.primary.full }}
                                          />
                                        )}
                                        {!isSelected && (
                                          <div className="w-1 h-8 shrink-0" />
                                        )}
                                        
                                        <div 
                                          className="p-2 rounded"
                                          style={{ 
                                            backgroundColor: isSelected ? brandColors.primary.light : brandColors.primary.extraLight,
                                            border: isSelected ? `2px solid ${brandColors.primary.full}` : 'none'
                                          }}
                                        >
                                          <OSIcon 
                                            className="h-4 w-4" 
                                            style={{ color: brandColors.primary.full }}
                                          />
                                        </div>
                                        <div>
                                          <div className="font-medium truncate text-foreground">{template.name}</div>
                                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>{template.version}</span>
                                            {template.variant && (
                                              <>
                                                <span>•</span>
                                                <span>{template.variant}</span>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2">
                                        {template.eol && (
                                          <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                                            EOL
                                          </Badge>
                                        )}
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
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
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs mt-2">
                            Choose the operating system to install
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {selectedOsTemplate && (
                      <div 
                        className="mt-4 p-4 rounded-lg border"
                        style={{
                          background: `linear-gradient(to right, ${brandColors.secondary.extraLight}, ${brandColors.secondary.lighter})`,
                        }}
                      >
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <CheckCircle 
                            className="h-4 w-4" 
                            style={{ color: brandColors.secondary.full }}
                          />
                          OS Details
                        </h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <div className="font-medium">{selectedOsTemplate.name} {selectedOsTemplate.version}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <div className="font-medium">{selectedOsTemplate.type}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">VNC:</span>
                            <div className="font-medium">{selectedOsTemplate.vnc ? 'Supported' : 'Not Available'}</div>
                          </div>
                          {selectedOsTemplate.description && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Description:</span>
                              <div className="font-medium">{selectedOsTemplate.description}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 'details' && (
                <div className="space-y-6">
                  {/* Server Name */}
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.accent.light }}
                      >
                        <Server 
                          className="h-5 w-5" 
                          style={{ color: brandColors.accent.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">Server Name <span className="text-red-500">*</span></h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                placeholder="Enter server name (required)..." 
                                className="h-12" 
                                {...field} 
                              />
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-12 w-12 shrink-0"
                              onClick={() => field.onChange(generateRandomServerName())}
                            >
                              <Dices className="h-4 w-4" />
                            </Button>
                          </div>
                          <FormDescription className="text-xs mt-2">
                            Choose a unique identifier for your server (required field)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* SSH Keys */}
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.accent.light }}
                      >
                        <Key 
                          className="h-5 w-5" 
                          style={{ color: brandColors.accent.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">SSH Keys</h3>
                      <Badge variant="secondary" className="text-xs">Optional</Badge>
                    </div>
                    <FormField
                      control={form.control}
                      name="sshKeys"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            value=""
                            onValueChange={(value) => {
                              const keyId = parseInt(value);
                              const currentKeys = field.value || [];
                              if (!currentKeys.includes(keyId)) {
                                field.onChange([...currentKeys, keyId]);
                              }
                            }}
                            disabled={sshKeysLoading}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Add SSH key..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sshKeysData?.data?.map((key: any) => (
                                <SelectItem 
                                  key={key.id} 
                                  value={key.id.toString()} 
                                  className="p-3 hover:bg-gray-100 data-[highlighted]:bg-gray-100 data-[state=checked]:bg-gray-100 text-gray-900 hover:text-gray-900 data-[highlighted]:text-gray-900 data-[state=checked]:text-gray-900 [&>span:first-child]:hidden"
                                >
                                  <div className="flex items-center gap-3">
                                    <div 
                                      className="p-2 rounded"
                                      style={{ backgroundColor: brandColors.accent.extraLight }}
                                    >
                                      <Key 
                                        className="h-4 w-4" 
                                        style={{ color: brandColors.accent.full }}
                                      />
                                    </div>
                                    <span className="font-medium text-foreground">{key.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {field.value && field.value.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {field.value.map((keyId: number) => {
                                const key = sshKeysData?.data?.find((k: any) => k.id === keyId);
                                return key ? (
                                  <div 
                                    key={keyId} 
                                    className="flex items-center justify-between p-3 rounded-lg border"
                                    style={{
                                      background: `linear-gradient(to right, ${brandColors.secondary.extraLight}, ${brandColors.secondary.lighter})`,
                                      borderColor: brandColors.secondary.border
                                    }}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div 
                                        className="p-1.5 rounded"
                                        style={{ backgroundColor: brandColors.secondary.light }}
                                      >
                                        <Key 
                                          className="h-3 w-3" 
                                          style={{ color: brandColors.secondary.full }}
                                        />
                                      </div>
                                      <span className="text-sm font-medium">{key.name}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      onClick={() => {
                                        field.onChange(field.value.filter((id: number) => id !== keyId));
                                      }}
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                          <FormDescription className="text-xs mt-2">
                            Add SSH keys for secure server access
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Additional Options */}
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.primary.light }}
                      >
                        <CheckCircle 
                          className="h-5 w-5" 
                          style={{ color: brandColors.primary.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">Additional Options</h3>
                    </div>
                    <FormField
                      control={form.control}
                      name="vnc"
                      render={({ field }) => (
                        <FormItem 
                          className="flex flex-row items-start space-x-3 space-y-0 p-4 rounded-lg border"
                          style={{
                            background: `linear-gradient(to right, ${brandColors.accent.extraLight}, ${brandColors.accent.lighter})`,
                            borderColor: brandColors.accent.border
                          }}
                        >
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-medium">Enable VNC Console</FormLabel>
                            <FormDescription className="text-xs">
                              Allow remote desktop access to your server console
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {currentStep === 'review' && (
                <div className="space-y-6">
                  <div className="bg-card border rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: brandColors.primary.light }}
                      >
                        <CheckCircle 
                          className="h-5 w-5" 
                          style={{ color: brandColors.primary.full }}
                        />
                      </div>
                      <h3 className="text-lg font-semibold">Review Configuration</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Package Review */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Server Package
                        </h4>
                        {selectedPackage && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Name:</span>
                              <div className="font-medium">{selectedPackage.name}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Price:</span>
                              <div className="font-medium">
                                ${(() => {
                                  const monthlyPrice = selectedPackage.pricing?.price || selectedPackage.price || 0;
                                  const settings = publicSettings?.data ?? publicSettings ?? {};
                                  const isHourlyBilling = (settings["virtfusion_self_service_hourly_credit"] ?? "true") === "true";
                                  
                                  if (isHourlyBilling) {
                                    const hoursPerMonth = virtfusionCronData?.hoursPerMonth || 730;
                                    const hourlyRate = monthlyPrice / hoursPerMonth;
                                    return hourlyRate.toFixed(4) + ' /hr';
                                  } else {
                                    return monthlyPrice.toFixed(2) + ' /mo';
                                  }
                                })()}
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">CPU:</span>
                              <div className="font-medium">{selectedPackage.cpuCores} vCPU</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">RAM:</span>
                              <div className="font-medium">{selectedPackage.memory}MB</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Storage:</span>
                              <div className="font-medium">{selectedPackage.primaryStorage}GB SSD</div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Location Review */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Network className="h-4 w-4" />
                          Datacenter Location
                        </h4>
                        {selectedHypervisorGroup && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Location:</span>
                            <div className="font-medium">{selectedHypervisorGroup.name}</div>
                          </div>
                        )}
                      </div>

                      {/* OS Review */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          Operating System
                        </h4>
                        {selectedOsTemplate && (
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">OS:</span>
                              <div className="font-medium">{selectedOsTemplate.name} {selectedOsTemplate.version}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>
                              <div className="font-medium">{selectedOsTemplate.type}</div>
                            </div>
                            {selectedOsTemplate.variant && (
                              <div>
                                <span className="text-muted-foreground">Variant:</span>
                                <div className="font-medium">{selectedOsTemplate.variant}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Server Details Review */}
                      <div className="p-4 rounded-lg border bg-muted/30">
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Server Details
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Name:</span>
                            <div className="font-medium">{form.watch('name') || 'Not set'}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">SSH Keys:</span>
                            <div className="font-medium">
                              {form.watch('sshKeys')?.length > 0 
                                ? `${form.watch('sshKeys').length} key(s)` 
                                : 'None'
                              }
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">VNC Console:</span>
                            <div className="font-medium">{form.watch('vnc') ? 'Enabled' : 'Disabled'}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step Navigation */}
              <div className="flex justify-between gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={prevStep}
                  disabled={!canGoPrev()}
                  className="px-8"
                >
                  Previous
                </Button>
                
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => onOpenChange(false)}
                    className="px-8"
                  >
                    Cancel
                  </Button>
                  
                  {currentStep === 'review' ? (
                    <Button
                      type="submit"
                      size="lg"
                      disabled={createServerMutation.isPending || !canGoNext()}
                      className="px-8"
                      style={{
                        background: `linear-gradient(to right, ${brandColors.primary.full}, ${brandColors.primary.dark})`,
                        color: 'white'
                      }}
                    >
                      {createServerMutation.isPending ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Creating Server...
                        </>
                      ) : (
                        <>
                          <Server className="mr-2 h-4 w-4" />
                          Create Server
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      onClick={nextStep}
                      disabled={!canGoNext()}
                      className="px-8"
                      style={{
                        background: `linear-gradient(to right, ${brandColors.primary.full}, ${brandColors.primary.dark})`,
                        color: 'white'
                      }}
                    >
                      Next
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}