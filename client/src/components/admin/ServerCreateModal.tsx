import { useState, useEffect } from "react";
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
import { toast } from "@/hooks/use-toast";
import { Server, User, HardDrive, Cpu, MemoryStick, Network } from "lucide-react";

interface ServerCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

// Server creation schema based on VirtFusion API requirements
const serverCreateSchema = z.object({
  packageId: z.number().int().positive("Package ID is required"),
  userId: z.number().int().positive("User ID is required"),
  hypervisorId: z.number().int().positive("Hypervisor ID is required"),
  ipv4: z.number().int().min(0).default(1),
  storage: z.number().int().positive("Storage is required"),
  traffic: z.number().int().positive("Traffic is required"),
  memory: z.number().int().positive("Memory is required"),
  cpuCores: z.number().int().positive("CPU cores is required"),
  networkSpeedInbound: z.number().int().positive().default(1000),
  networkSpeedOutbound: z.number().int().positive().default(1000),
  storageProfile: z.number().int().positive().default(1),
  networkProfile: z.number().int().positive().default(1),
  firewallRulesets: z.array(z.number().int()).default([]),
  hypervisorAssetGroups: z.array(z.number().int()).default([]),
  additionalStorage1Enable: z.boolean().default(false),
  additionalStorage2Enable: z.boolean().default(false),
  additionalStorage1Profile: z.number().int().positive().optional(),
  additionalStorage2Profile: z.number().int().positive().optional(),
  additionalStorage1Capacity: z.number().int().positive().optional(),
  additionalStorage2Capacity: z.number().int().positive().optional()
});

type ServerCreateFormData = z.infer<typeof serverCreateSchema>;

export default function ServerCreateModal({ open, onOpenChange, onSuccess }: ServerCreateModalProps) {
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [step, setStep] = useState<'create' | 'build'>('create');
  const [createdServerId, setCreatedServerId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery({
    queryKey: ['/api/admin/packages'],
    queryFn: async () => {
      const response = await fetch('/api/admin/packages');
      if (!response.ok) throw new Error('Failed to fetch packages');
      return response.json();
    },
  });

  // Fetch users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
  });

  // Fetch hypervisors
  const { data: hypervisors, isLoading: hypervisorsLoading } = useQuery({
    queryKey: ['/api/admin/hypervisors'],
    queryFn: async () => {
      const response = await fetch('/api/admin/hypervisors');
      if (!response.ok) throw new Error('Failed to fetch hypervisors');
      return response.json();
    },
  });

  const form = useForm<ServerCreateFormData>({
    resolver: zodResolver(serverCreateSchema),
    defaultValues: {
      ipv4: 1,
      networkSpeedInbound: 1000,
      networkSpeedOutbound: 1000,
      storageProfile: 1,
      networkProfile: 1,
      firewallRulesets: [],
      hypervisorAssetGroups: [],
      additionalStorage1Enable: false,
      additionalStorage2Enable: false,
    },
  });

  // Server creation mutation
  const createServerMutation = useMutation({
    mutationFn: async (data: ServerCreateFormData) => {
      const response = await fetch('/api/admin/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        description: "Server has been created successfully. You can now build it with an OS template.",
      });
      setCreatedServerId(data.data?.id);
      setStep('build');
      queryClient.invalidateQueries({ queryKey: ['/api/admin/servers'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update form when package is selected
  useEffect(() => {
    if (selectedPackage) {
      form.setValue('storage', selectedPackage.storage || 25);
      form.setValue('traffic', selectedPackage.traffic || 1000);
      form.setValue('memory', selectedPackage.memory || 1024);
      form.setValue('cpuCores', selectedPackage.cpuCores || 1);
    }
  }, [selectedPackage, form]);

  const onSubmit = (data: ServerCreateFormData) => {
    createServerMutation.mutate(data);
  };

  const handleClose = () => {
    setStep('create');
    setCreatedServerId(null);
    setSelectedPackage(null);
    setSelectedUser(null);
    form.reset();
    onOpenChange(false);
  };

  const isLoading = packagesLoading || usersLoading || hypervisorsLoading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            {step === 'create' ? 'Create New Server' : 'Build Server'}
          </DialogTitle>
          <DialogDescription>
            {step === 'create' 
              ? 'Create a new virtual server by selecting a package, user, and hypervisor.'
              : 'Server created successfully! You can now build it with an OS template from the server details page.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'create' ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  {/* Package Selection */}
                  <FormField
                    control={form.control}
                    name="packageId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            const packageId = parseInt(value);
                            field.onChange(packageId);
                            const pkg = packages?.find((p: any) => p.id === packageId);
                            setSelectedPackage(pkg);
                          }}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a package" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {packages?.map((pkg: any) => (
                              <SelectItem key={pkg.id} value={pkg.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span>{pkg.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {pkg.cpuCores}C/{pkg.memory}MB/{pkg.storage}GB
                                  </Badge>
                                </div>
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
                                  <User className="h-4 w-4" />
                                  <span>{user.username || user.fullName}</span>
                                  <Badge variant="outline" className="text-xs">
                                    ID: {user.id}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                        <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a hypervisor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {hypervisors?.data?.map((hypervisor: any) => (
                              <SelectItem key={hypervisor.id} value={hypervisor.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <span>{hypervisor.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {hypervisor.location || 'Unknown Location'}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Resource Configuration (auto-filled from package) */}
                  {selectedPackage && (
                    <div className="grid grid-cols-2 gap-4">
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
                        name="memory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Memory (MB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={512}
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
                        name="storage"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Storage (GB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={10}
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
                        name="traffic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Traffic (GB)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={100}
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createServerMutation.isPending}>
                      {createServerMutation.isPending ? (
                        <>
                          <Spinner className="mr-2 h-4 w-4" />
                          Creating...
                        </>
                      ) : (
                        'Create Server'
                      )}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <Server className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium">Server Created Successfully!</h3>
              <p className="text-muted-foreground mt-2">
                Server ID: {createdServerId}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                You can now build this server with an OS template from the server details page.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button onClick={() => {
                onSuccess?.();
                handleClose();
              }}>
                View Servers
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
