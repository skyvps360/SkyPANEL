import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Slider } from "@/components/ui/slider";
import { toast } from "@/hooks/use-toast";
import { 
  Cpu, 
  MemoryStick, 
  HardDrive,
  ServerCrash 
} from "lucide-react";

interface Hypervisor {
  id: number;
  name: string;
  maxCpu: number;
  maxMemory: number;
  enabled: boolean;
}

interface OsTemplate {
  id: string;
  name: string;
}

interface CreateServerFormProps {
  hypervisors: Hypervisor[];
  osTemplates: OsTemplate[];
  availableCredits: number;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

export function CreateServerForm({
  hypervisors,
  osTemplates,
  availableCredits,
  onSubmit,
  isLoading
}: CreateServerFormProps) {
  const [selectedHypervisor, setSelectedHypervisor] = useState<Hypervisor | null>(null);
  const [estimatedCost, setEstimatedCost] = useState(0);
  
  // Schema for server creation
  const serverSchema = z.object({
    name: z.string().min(3, "Server name must be at least 3 characters").max(50, "Server name must be at most 50 characters"),
    hypervisorId: z.number({
      required_error: "Please select a hypervisor"
    }),
    operatingSystem: z.string({
      required_error: "Please select an operating system"
    }),
    cpu: z.number().min(1, "Must have at least 1 CPU core"),
    memory: z.number().min(1024, "Must have at least 1 GB of RAM"),
    storage: z.number().min(10, "Must have at least 10 GB of storage"),
  });

  // Setup form
  const form = useForm<z.infer<typeof serverSchema>>({
    resolver: zodResolver(serverSchema),
    defaultValues: {
      name: "",
      cpu: 1,
      memory: 1024, // 1 GB
      storage: 25, // 25 GB
    },
  });

  // Watch values for price calculation
  const cpu = form.watch("cpu");
  const memory = form.watch("memory");
  const storage = form.watch("storage");
  
  // Update selected hypervisor when form value changes
  useEffect(() => {
    const hypervisorId = form.getValues("hypervisorId");
    if (hypervisorId) {
      const selected = hypervisors.find(h => h.id === hypervisorId);
      if (selected) {
        setSelectedHypervisor(selected);
      }
    }
  }, [form, hypervisors]);
  
  // Calculate cost when resource values change
  useEffect(() => {
    // Simple pricing model: $5 per CPU core, $10 per GB of RAM, $0.1 per GB of storage per month
    const cpuCost = cpu * 5;
    const memoryCost = (memory / 1024) * 10;
    const storageCost = storage * 0.1;
    const total = cpuCost + memoryCost + storageCost;
    setEstimatedCost(total);
  }, [cpu, memory, storage]);
  
  // Form submission handler
  const handleSubmit = (values: z.infer<typeof serverSchema>) => {
    // Check if user has enough credits
    if (estimatedCost > availableCredits) {
      toast({
        title: "Insufficient credits",
        description: "Please add more credits to create this server",
        variant: "destructive"
      });
      return;
    }
    
    // Pass data to parent component
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {/* Server Name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Name</FormLabel>
              <FormControl>
                <Input placeholder="My Web Server" {...field} />
              </FormControl>
              <FormDescription>
                A descriptive name for your server
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
              <Select 
                onValueChange={(value) => {
                  field.onChange(parseInt(value));
                  const selected = hypervisors.find(h => h.id === parseInt(value));
                  setSelectedHypervisor(selected || null);
                }}
                defaultValue={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a hypervisor" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {hypervisors
                    .filter(h => h.enabled)
                    .map((hypervisor) => (
                      <SelectItem 
                        key={hypervisor.id} 
                        value={hypervisor.id.toString()}
                      >
                        {hypervisor.name} ({hypervisor.maxCpu} CPU, {hypervisor.maxMemory} MB RAM)
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              <FormDescription>
                The physical server where your virtual machine will be hosted
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Operating System Selection */}
        <FormField
          control={form.control}
          name="operatingSystem"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Operating System</FormLabel>
              <Select 
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operating system" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {osTemplates.map((os) => (
                    <SelectItem 
                      key={os.id} 
                      value={os.id}
                    >
                      {os.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The operating system to install on your server
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* CPU Cores */}
        <FormField
          control={form.control}
          name="cpu"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CPU Cores</FormLabel>
              <div className="flex items-center space-x-4">
                <Cpu className="h-5 w-5 text-muted-foreground" />
                <FormControl className="flex-1">
                  <Slider
                    min={1}
                    max={selectedHypervisor ? Math.min(selectedHypervisor.maxCpu, 32) : 8}
                    step={1}
                    defaultValue={[field.value]}
                    onValueChange={(values) => field.onChange(values[0])}
                  />
                </FormControl>
                <div className="w-12 text-center font-medium">
                  {field.value}
                </div>
              </div>
              <FormDescription>
                Number of virtual CPU cores
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* MemoryStick (RAM) */}
        <FormField
          control={form.control}
          name="memory"
          render={({ field }) => (
            <FormItem>
              <FormLabel>MemoryStick (RAM)</FormLabel>
              <div className="flex items-center space-x-4">
                <MemoryStick className="h-5 w-5 text-muted-foreground" />
                <FormControl className="flex-1">
                  <Slider
                    min={1024}
                    max={selectedHypervisor ? Math.min(selectedHypervisor.maxMemory, 32768) : 16384}
                    step={1024}
                    defaultValue={[field.value]}
                    onValueChange={(values) => field.onChange(values[0])}
                  />
                </FormControl>
                <div className="w-16 text-center font-medium">
                  {(field.value / 1024).toFixed(0)} GB
                </div>
              </div>
              <FormDescription>
                Amount of RAM in GB
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
              <FormLabel>Storage</FormLabel>
              <div className="flex items-center space-x-4">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <FormControl className="flex-1">
                  <Slider
                    min={10}
                    max={500}
                    step={5}
                    defaultValue={[field.value]}
                    onValueChange={(values) => field.onChange(values[0])}
                  />
                </FormControl>
                <div className="w-16 text-center font-medium">
                  {field.value} GB
                </div>
              </div>
              <FormDescription>
                Storage space in GB
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Pricing Information */}
        <div className="rounded-lg border p-4 bg-muted/30">
          <h3 className="font-medium mb-2">Estimated Monthly Cost</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>CPU ({cpu} cores):</span>
              <span>${(cpu * 5).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>MemoryStick ({(memory / 1024).toFixed(0)} GB):</span>
              <span>${((memory / 1024) * 10).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Storage ({storage} GB):</span>
              <span>${(storage * 0.1).toFixed(2)}</span>
            </div>
            <div className="border-t pt-2 mt-2 flex justify-between font-medium">
              <span>Total:</span>
              <span>${estimatedCost.toFixed(2)}/month</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Your available credit:</span>
              <span className={availableCredits < estimatedCost ? "text-destructive" : "text-accent"}>
                ${availableCredits.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <Button 
            type="submit" 
            disabled={isLoading || estimatedCost > availableCredits}
            className="px-8"
          >
            {isLoading ? (
              <>
                <ServerCrash className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Server'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
