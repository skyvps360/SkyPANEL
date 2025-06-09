import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/hooks/use-toast";
import { Server, User, Settings } from "lucide-react";

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
  hostname: string;
  groupId?: number;
  groupName?: string;
}

interface Package {
  id: number;
  name: string;
  description?: string;
  cpu: number;
  memory: number;
  storage: number;
  price?: number;
}

interface AdminCreateServerFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

// Schema for admin server creation
const adminServerSchema = z.object({
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
  hostname: z.string().optional(),
  dryRun: z.boolean().default(false),
});

export function AdminCreateServerForm({ onClose, onSuccess }: AdminCreateServerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup form
  const form = useForm<z.infer<typeof adminServerSchema>>({
    resolver: zodResolver(adminServerSchema),
    defaultValues: {
      name: "",
      hostname: "",
      dryRun: false,
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

  // Form submission handler
  const handleSubmit = (values: z.infer<typeof adminServerSchema>) => {
    setIsSubmitting(true);
    createServerMutation.mutate(values);
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
              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{user.username}</span>
                        {user.fullName && (
                          <span className="text-muted-foreground">({user.fullName})</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a hypervisor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hypervisors?.map((hypervisor) => (
                    <SelectItem key={hypervisor.id} value={hypervisor.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Server className="h-4 w-4" />
                        <span>{hypervisor.name}</span>
                        <span className="text-muted-foreground">({hypervisor.hostname})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select onValueChange={(value) => field.onChange(parseInt(value))}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {packages?.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>{pkg.name}</span>
                        <span className="text-muted-foreground">
                          ({pkg.cpu} CPU, {pkg.memory}MB RAM, {pkg.storage}GB Storage)
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
