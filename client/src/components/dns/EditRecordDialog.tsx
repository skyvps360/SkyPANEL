import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Edit } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { updateDnsRecord } from "@/lib/api";

// DNS record types
const DNS_RECORD_TYPES = [
  { value: "A", label: "A - IPv4 Address" },
  { value: "AAAA", label: "AAAA - IPv6 Address" },
  { value: "CNAME", label: "CNAME - Canonical Name" },
  { value: "MX", label: "MX - Mail Exchange" },
  { value: "TXT", label: "TXT - Text Record" },
  { value: "NS", label: "NS - Name Server" },
  { value: "PTR", label: "PTR - Pointer Record" },
  { value: "SRV", label: "SRV - Service Record" },
  { value: "CAA", label: "CAA - Certificate Authority Authorization" },
];

// Form validation schema
const recordSchema = z.object({
  name: z.string().min(1, "Record name is required"),
  type: z.enum(["A", "AAAA", "CNAME", "MX", "TXT", "NS", "PTR", "SRV", "CAA"]),
  content: z.string().min(1, "Record content is required"),
  ttl: z.number().min(60, "TTL must be at least 60 seconds").max(86400, "TTL cannot exceed 24 hours"),
  priority: z.number().min(0).max(65535),
});

type RecordFormData = z.infer<typeof recordSchema>;

interface DnsRecord {
  id: number;
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority: number;
  disabled: boolean;
}

interface EditRecordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  domainId: number;
  domainName: string;
  record: DnsRecord;
  onSuccess: () => void;
}

export function EditRecordDialog({ 
  open, 
  onOpenChange, 
  domainId, 
  domainName, 
  record,
  onSuccess 
}: EditRecordDialogProps) {
  const { toast } = useToast();

  const form = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      name: record.name,
      type: record.type as any,
      content: record.content,
      ttl: record.ttl,
      priority: record.priority,
    },
  });

  // Update form when record changes
  useEffect(() => {
    if (record) {
      form.reset({
        name: record.name,
        type: record.type as any,
        content: record.content,
        ttl: record.ttl,
        priority: record.priority,
      });
    }
  }, [record, form]);

  const selectedType = form.watch("type");

  const updateMutation = useMutation({
    mutationFn: (data: RecordFormData) => updateDnsRecord(domainId, record.id, {
      name: data.name,
      type: data.type,
      content: data.content,
      ttl: data.ttl,
      priority: data.priority,
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DNS record updated successfully",
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update DNS record",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RecordFormData) => {
    updateMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  // Get placeholder text based on record type
  const getContentPlaceholder = (type: string) => {
    switch (type) {
      case "A":
        return "192.168.1.1";
      case "AAAA":
        return "2001:db8::1";
      case "CNAME":
        return "example.com";
      case "MX":
        return "mail.example.com";
      case "TXT":
        return "v=spf1 include:_spf.google.com ~all";
      case "NS":
        return "ns1.example.com";
      case "PTR":
        return "example.com";
      case "SRV":
        return "10 5 443 target.example.com";
      case "CAA":
        return "0 issue \"letsencrypt.org\"";
      default:
        return "";
    }
  };

  // Get description based on record type
  const getContentDescription = (type: string) => {
    switch (type) {
      case "A":
        return "IPv4 address (e.g., 192.168.1.1)";
      case "AAAA":
        return "IPv6 address (e.g., 2001:db8::1)";
      case "CNAME":
        return "Canonical name (domain name)";
      case "MX":
        return "Mail server hostname";
      case "TXT":
        return "Text content (often used for verification)";
      case "NS":
        return "Name server hostname";
      case "PTR":
        return "Pointer to hostname";
      case "SRV":
        return "Service record (weight port target)";
      case "CAA":
        return "Certificate authority authorization";
      default:
        return "Record content";
    }
  };

  const showPriorityField = selectedType === "MX" || selectedType === "SRV";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit DNS Record
          </DialogTitle>
          <DialogDescription>
            Edit DNS record for {domainName}
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
                      disabled={updateMutation.isPending}
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
                    value={field.value}
                    disabled={updateMutation.isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select record type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DNS_RECORD_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Type of DNS record
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
                      disabled={updateMutation.isPending}
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
                        disabled={updateMutation.isPending}
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
                          disabled={updateMutation.isPending}
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
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {updateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    Update Record
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
