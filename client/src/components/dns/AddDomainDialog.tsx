import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Globe, Plus, Server, Info } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { addDnsDomain } from "@/lib/api";

// SkyPANEL Nameservers
const SKYPANEL_NAMESERVERS = [
  'cdns.ns1.skyvps360.xyz',
  'cdns.ns2.skyvps360.xyz',
  'cdns.ns3.skyvps360.xyz'
];

// Form validation schema
const domainSchema = z.object({
  name: z
    .string()
    .min(1, "Domain name is required")
    .regex(
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
      "Invalid domain name format"
    )
    .max(253, "Domain name too long"),
  ip: z
    .string()
    .min(1, "IP address is required")
    .regex(
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      "Invalid IP address format"
    ),
});

type DomainFormData = z.infer<typeof domainSchema>;

interface AddDomainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddDomainDialog({ open, onOpenChange, onSuccess }: AddDomainDialogProps) {
  const { toast } = useToast();

  const form = useForm<DomainFormData>({
    resolver: zodResolver(domainSchema),
    defaultValues: {
      name: "",
      ip: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: ({ name, ip }: { name: string; ip: string }) => addDnsDomain(name, ip),
    onSuccess: (responseData: any) => {
      console.log('Domain creation response:', responseData);

      // The axios interceptor already extracts response.data, so responseData is the actual data
      const { whitelabelStatus, message, domain } = responseData;

      if (whitelabelStatus?.success) {
        // Full success - domain created and nameservers replaced
        toast({
          title: "Success",
          description: `${message || 'Domain created successfully with SkyPANEL nameservers'} Your domain is now using SkyPANEL nameservers.`,
        });
      } else if (whitelabelStatus?.nameserversReplaced > 0) {
        // Partial success - domain created but some nameserver replacement issues
        toast({
          title: "Domain Created",
          description: `Domain added successfully, but some nameserver records couldn't be replaced. ${whitelabelStatus.nameserversReplaced} records were updated.`,
          variant: "default",
        });
      } else if (domain) {
        // Domain created but no nameserver replacement
        toast({
          title: "Domain Created",
          description: "Domain added successfully, but nameserver replacement failed. You may need to manually update DNS records.",
          variant: "default",
        });
      } else {
        // Fallback success message
        toast({
          title: "Success",
          description: message || "Domain created successfully",
        });
      }

      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Domain creation error:', error);
      toast({
        title: "Error",
        description: error.data?.error || error.message || "Failed to add domain",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DomainFormData) => {
    addMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Add DNS Domain
          </DialogTitle>
          <DialogDescription>
            Add a new domain to be managed through SkyPANEL DNS. After adding, you'll need to update
            your domain's nameservers at your registrar to point to SkyPANEL nameservers.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="example.com"
                      {...field}
                      disabled={addMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the domain name without www or any subdomain
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IP Address</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="192.168.1.1"
                      {...field}
                      disabled={addMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    The IP address where the domain should point (IPv4 or IPv6)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nameserver Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Server className="h-4 w-4 text-blue-600" />
                <h4 className="text-sm font-semibold text-blue-900">Required: Update Nameservers at Your Registrar</h4>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                After adding your domain here, you must update your domain's nameservers at your registrar to:
              </p>
              <div className="space-y-1">
                {SKYPANEL_NAMESERVERS.map((ns, index) => (
                  <div key={ns} className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-600">
                        {index + 1}
                      </span>
                    </div>
                    <code className="text-xs font-mono text-blue-800 bg-blue-100 px-2 py-1 rounded">
                      {ns}
                    </code>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 mt-3 p-2 bg-blue-100 rounded">
                <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  DNS changes may take 24-48 hours to propagate globally. Your domain won't resolve until nameservers are updated.
                </p>
              </div>
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
                    Add Domain
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
