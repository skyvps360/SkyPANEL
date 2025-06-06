import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Globe, Plus } from "lucide-react";
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Domain added successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add domain",
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
            Add a new domain to be managed through InterServer DNS. The domain will be configured
            with basic DNS records pointing to the specified IP address.
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
