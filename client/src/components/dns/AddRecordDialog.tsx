import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Plus, Info } from "lucide-react";
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
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { addDnsRecord } from "@/lib/api";
import {
  DNS_RECORD_CATEGORIES,
  VALID_DNS_RECORD_TYPES,
  getContentPlaceholder,
  getContentDescription,
  requiresPriority,
  validateDnsRecordContent
} from "@shared/dns-record-types";

// Form validation schema
const recordSchema = z.object({
  name: z.string().min(1, "Record name is required"),
  type: z.enum(VALID_DNS_RECORD_TYPES as [string, ...string[]]),
  content: z.string().min(1, "Record content is required").refine((content, ctx) => {
    const type = ctx.parent.type;
    if (type && !validateDnsRecordContent(type, content)) {
      return false;
    }
    return true;
  }, "Invalid content format for this record type"),
  ttl: z.number().min(60, "TTL must be at least 60 seconds").max(86400, "TTL cannot exceed 24 hours"),
  priority: z.number().min(0).max(65535).optional(),
});

type RecordFormData = z.infer<typeof recordSchema>;

interface AddRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: number;
  domainName: string;
  onSuccess: () => void;
}

export function AddRecordDialog({ 
  open, 
  onOpenChange, 
  domainId, 
  domainName, 
  onSuccess 
}: AddRecordDialogProps) {
  const { toast } = useToast();

  const form = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      name: "",
      type: "A",
      content: "",
      ttl: 3600,
      priority: 0,
    },
  });

  const selectedType = form.watch("type");

  const addMutation = useMutation({
    mutationFn: (data: RecordFormData) => addDnsRecord(domainId, {
      name: data.name,
      type: data.type,
      content: data.content,
      ttl: data.ttl,
      priority: data.priority || 0,
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DNS record added successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add DNS record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecordFormData) => {
    addMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  const showPriorityField = requiresPriority(selectedType);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add DNS Record
          </DialogTitle>
          <DialogDescription>
            Add a new DNS record for {domainName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="www"
                      {...field}
                      disabled={addMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Subdomain name (use @ for root domain, or leave empty for root)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                    disabled={addMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-80">
                      {/* Basic Records */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                        Basic Records
                      </div>
                      {DNS_RECORD_CATEGORIES.Basic.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="pl-4">
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{type.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      ))}

                      {/* Mail Records */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-2">
                        Mail Records
                      </div>
                      {DNS_RECORD_CATEGORIES.Mail.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="pl-4">
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{type.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      ))}

                      {/* Security Records */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-2">
                        Security Records
                      </div>
                      {DNS_RECORD_CATEGORIES.Security.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="pl-4">
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{type.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      ))}

                      {/* Advanced Records */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-2">
                        Advanced Records
                      </div>
                      {DNS_RECORD_CATEGORIES.Advanced.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="pl-4">
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{type.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      ))}

                      {/* Legacy Records */}
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30 mt-2">
                        Legacy Records
                      </div>
                      {DNS_RECORD_CATEGORIES.Legacy.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="pl-4">
                          <div className="flex items-center gap-2">
                            <span>{type.label}</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="left" className="max-w-xs">
                                  <p className="text-sm">{type.description}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Type of DNS record to create
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={getContentPlaceholder(selectedType)}
                      {...field}
                      disabled={addMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    {getContentDescription(selectedType)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ttl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TTL (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="60"
                        max="86400"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 3600)}
                        disabled={addMutation.isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Time to live (60-86400)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showPriorityField && (
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          max="65535"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          disabled={addMutation.isPending}
                        />
                      </FormControl>
                      <FormDescription>
                        Record priority (0-65535)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={addMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
