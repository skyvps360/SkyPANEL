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
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertCircle, 
  Loader2, 
  SendHorizonal, 
  Server, 
  Network, 
  Cpu,
  Wifi,
  WifiOff,
  ExternalLink 
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Department interface to match the backend schema
interface TicketDepartment {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  requiresVps: boolean;
  displayOrder: number;
}

// VPS Server interface
interface VpsServer {
  id: number;
  name: string;
  hostname: string;
  ip: string;
  status: string;
  isNat: boolean;
  hypervisorId: number | null;
  allIps?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type?: 'ipv4' | 'ipv6';
  }>;
  ipv4s?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type: 'ipv4';
  }>;
  ipv6s?: Array<{
    address: string;
    gateway: string;
    netmask: string;
    resolver1: string;
    resolver2: string;
    enabled: boolean;
    order: number;
    type: 'ipv6';
  }>;
  network?: {
    name: string;
    mac: string;
    isNat: boolean;
    enabled: boolean;
  };
}

// Schema for the ticket form
const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(100, "Subject must be at most 100 characters"),
  priority: z.string().default("medium"),
  departmentId: z.number({ required_error: "Department is required" }),
  vpsId: z.number().optional().nullable(),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000, "Message must be at most 2000 characters"),
});

type TicketFormData = z.infer<typeof ticketSchema>;

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => void;
  defaultValues?: Partial<TicketFormData>;
  isLoading?: boolean;
}

export function TicketForm({ onSubmit, defaultValues, isLoading = false }: TicketFormProps) {
  const [charCount, setCharCount] = useState(0);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDepartment, setSelectedDepartment] = useState<TicketDepartment | null>(null);
  const [selectedServer, setSelectedServer] = useState<VpsServer | null>(null);
  const totalSteps = 3; // 1: Department/VPS, 2: Subject/Priority, 3: Message

  // Fetch departments
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery({
    queryKey: ['/api/ticket-departments'],
    retry: 1,
  });

  // Fetch VPS servers if needed
  const { data: servers = [], isLoading: isLoadingServers } = useQuery({
    queryKey: ['/api/user/servers'],
    retry: 1,
    enabled: selectedDepartment?.requiresVps === true,
  });

  // Initialize form with default values
  const form = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: defaultValues?.subject || "",
      priority: defaultValues?.priority || "medium",
      departmentId: defaultValues?.departmentId || undefined,
      vpsId: defaultValues?.vpsId || null,
      message: defaultValues?.message || "",
    },
  });

  // Step navigation
  const goToNextStep = () => {
    // Basic validation before proceeding
    if (currentStep === 1) {
      const deptId = form.getValues('departmentId');
      if (!deptId) {
        form.setError('departmentId', { 
          type: 'manual', 
          message: 'Please select a department' 
        });
        return;
      }
      
      const dept = departments.find((d: TicketDepartment) => d.id === deptId);
      if (dept?.requiresVps && !form.getValues('vpsId')) {
        form.setError('vpsId', { 
          type: 'manual', 
          message: 'Please select a VPS server' 
        });
        return;
      }
    }
    
    if (currentStep === 2) {
      const subject = form.getValues('subject');
      if (!subject || subject.length < 5) {
        form.setError('subject', { 
          type: 'manual', 
          message: 'Subject must be at least 5 characters' 
        });
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Update selected department when form value changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'departmentId') {
        const deptId = form.getValues('departmentId');
        const dept = departments.find((d: TicketDepartment) => d.id === deptId);
        setSelectedDepartment(dept || null);
        
        // Reset VPS selection if the department doesn't require VPS
        if (dept && !dept.requiresVps) {
          form.setValue('vpsId', null);
          setSelectedServer(null);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, departments]);

  // Set default department if one is marked as default
  useEffect(() => {
    if (departments.length > 0 && !form.getValues('departmentId')) {
      const defaultDepartment = departments.find((d: TicketDepartment) => d.isDefault);
      if (defaultDepartment) {
        form.setValue('departmentId', defaultDepartment.id);
        setSelectedDepartment(defaultDepartment);
      } else {
        // If no default, use the first department
        form.setValue('departmentId', departments[0].id);
        setSelectedDepartment(departments[0]);
      }
    }
  }, [departments, form]);

  // Update character count when message changes
  const updateCharCount = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharCount(e.target.value.length);
  };
  
  // Update selected server when vpsId changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'vpsId') {
        const vpsId = form.getValues('vpsId');
        if (vpsId) {
          const server = servers.find((s: VpsServer) => s.id === vpsId);
          setSelectedServer(server || null);
        } else {
          setSelectedServer(null);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, servers]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Progress Steps */}
        <div className="flex justify-between mb-6 relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-muted-foreground/20"></div>
          {[1, 2, 3].map((step) => (
            <div key={step} className="relative z-10 flex flex-col items-center">
              <div 
                className={`flex h-7 w-7 items-center justify-center rounded-full font-medium ${
                  step === currentStep 
                    ? 'bg-primary text-primary-foreground' 
                    : step < currentStep 
                      ? 'bg-primary/80 text-primary-foreground' 
                      : 'bg-muted-foreground/20 text-muted-foreground'
                }`}
              >
                {step}
              </div>
              <div className="mt-1 text-xs">
                {step === 1 && "Department"}
                {step === 2 && "Details"}
                {step === 3 && "Message"}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Department and VPS Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            {/* Department Field */}
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">Department</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                    disabled={isLoadingDepartments}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments.map((dept: TicketDepartment) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedDepartment?.description && (
                    <FormDescription className="text-xs mt-1">
                      {selectedDepartment.description}
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* VPS Selection Field - only show if the selected department requires VPS */}
            {selectedDepartment?.requiresVps && (
              <FormField
                control={form.control}
                name="vpsId"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">
                      <Server className="h-4 w-4 inline mr-1" /> VPS Server
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString() || ""}
                      disabled={isLoadingServers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select VPS server" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {servers.map((server: VpsServer) => (
                          <SelectItem key={server.id} value={server.id.toString()}>
                            {server.name} ({server.ip || "No IP"})
                          </SelectItem>
                        ))}
                        {servers.length === 0 && !isLoadingServers && (
                          <SelectItem value="-1" disabled>
                            No VPS servers found
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs mt-1">
                      Please select the VPS server related to your issue
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {/* VPS Server Details - only show if a VPS server is selected */}
            {selectedServer && (
              <Card className="overflow-hidden border-muted-foreground/20 shadow-sm mb-4">
                <CardHeader className="bg-muted/50 py-2 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center">
                      <Server className="h-4 w-4 mr-2" /> {selectedServer.name}
                      <Badge variant="outline" className="ml-2 text-xs py-0">
                        {selectedServer.status}
                      </Badge>
                    </CardTitle>
                    {selectedServer.hypervisorId && (
                      <span className="text-xs text-muted-foreground">
                        Hypervisor ID: {selectedServer.hypervisorId}
                      </span>
                    )}
                  </div>
                  <CardDescription className="text-xs mt-1">
                    Hostname: {selectedServer.hostname || "Unknown"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 text-sm space-y-3">
                  <div>
                    <h4 className="font-semibold text-xs mb-2 flex items-center">
                      <Network className="h-4 w-4 mr-1 inline-block" /> Network Information
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="rounded-md border border-muted-foreground/20 p-2 bg-muted/20">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center">
                            {selectedServer.isNat ? (
                              <Wifi className="h-4 w-4 mr-1 text-yellow-500" />
                            ) : (
                              <WifiOff className="h-4 w-4 mr-1 text-green-500" />
                            )}
                            <span className="text-xs font-medium">
                              {selectedServer.isNat ? "NAT Enabled" : "Direct Connection"}
                            </span>
                          </div>
                          {selectedServer.network?.mac && (
                            <span className="text-xs text-muted-foreground">
                              MAC: {selectedServer.network.mac}
                            </span>
                          )}
                        </div>
                        
                        {/* IP Addresses */}
                        {selectedServer.allIps && selectedServer.allIps.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {selectedServer.allIps.map((ip, index) => (
                              <div key={index} className="p-2 bg-background rounded-md text-xs">
                                <div className="font-semibold mb-1 flex items-center">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  IP Address: {ip.address}
                                  {ip.type && (
                                    <Badge 
                                      variant="outline" 
                                      className={`ml-1 text-[10px] py-0 px-1 h-4 ${
                                        ip.type === 'ipv4' ? 'bg-blue-500/10' : 'bg-purple-500/10'
                                      }`}
                                    >
                                      {ip.type === 'ipv4' ? 'IPv4' : 'IPv6'}
                                    </Badge>
                                  )}
                                  {ip.enabled && (
                                    <Badge 
                                      variant="outline" 
                                      className="ml-1 text-[10px] py-0 px-1 h-4 bg-green-500/10"
                                    >
                                      Active
                                    </Badge>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-muted-foreground mt-1">
                                  <div>Gateway: {ip.gateway}</div>
                                  <div>Netmask: {ip.netmask}</div>
                                  <div>DNS 1: {ip.resolver1}</div>
                                  <div>DNS 2: {ip.resolver2}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2 text-xs text-muted-foreground">
                            No IP address information available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Subject and Priority */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {/* Subject Field */}
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">Subject</FormLabel>
                  <FormControl>
                    <Input placeholder="Brief description of issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority Field */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">Priority</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Compact Tips for Step 2 */}
            <div className="rounded-md bg-muted/50 p-2.5">
              <div className="flex items-start gap-1.5">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <p className="font-medium">Subject Guidelines:</p>
                  <p className="text-muted-foreground">Use a clear and concise subject that accurately describes your issue.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Message */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Message Field */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <FormLabel className="text-sm">Message</FormLabel>
                    <span className={`text-xs ${charCount > 2000 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {charCount}/2000
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your issue..."
                      className="min-h-[150px] resize-y text-sm"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        updateCharCount(e);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Compact Tips */}
            <div className="rounded-md bg-muted/50 p-2.5">
              <div className="flex items-start gap-1.5 mb-1">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div className="text-xs space-y-1">
                  <p className="font-medium">Include in your request:</p>
                  <ul className="text-muted-foreground pl-4 list-disc space-y-0.5">
                    <li>What happened and when</li>
                    <li>Steps to reproduce (if possible)</li>
                    <li>Any error messages received</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex justify-between pt-2">
          {currentStep > 1 ? (
            <Button 
              type="button" 
              variant="outline" 
              onClick={goToPreviousStep}
              style={{borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)'}}
            >
              Back
            </Button>
          ) : (
            <div></div> // Empty div for spacing
          )}

          {currentStep < totalSteps ? (
            <Button 
              type="button" 
              onClick={goToNextStep}
              style={{backgroundColor: 'var(--brand-primary)', color: 'white'}}
            >
              Continue
            </Button>
          ) : (
            <Button 
              type="submit" 
              disabled={isLoading}
              style={{backgroundColor: 'var(--brand-primary)', color: 'white'}}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <SendHorizonal className="mr-2 h-4 w-4" />
                  Submit Ticket
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
