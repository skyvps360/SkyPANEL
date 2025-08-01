import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getBrandColors } from "@/lib/brand-theme";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Calendar,
  Coins,
  Users,
  TrendingUp,
  RefreshCw,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  Power,
  PowerOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Coupon interface
interface Coupon {
  id: number;
  code: string;
  description: string | null;
  maxUses: number | null;
  currentUses: number;
  tokensAmount: number;
  isActive: boolean;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// Coupon usage interface
interface CouponUsage {
  id: number;
  couponId: number;
  userId: number;
  tokensReceived: number;
  virtfusionCreditId: string | null;
  transactionId: number | null;
  usedAt: string;
  username: string;
  email: string;
}

// Form schema for coupon creation/editing
const couponSchema = z.object({
  code: z.string().min(3, { message: "Coupon code must be at least 3 characters" }),
  description: z.string().optional(),
  maxUses: z.coerce.number().min(0, { message: "Max uses must be 0 or greater (0 = unlimited)" }).nullable(),
  tokensAmount: z.coerce.number().min(0.01, { message: "Tokens amount must be greater than 0" }),
  isActive: z.boolean().default(true),
});

type CouponFormData = z.infer<typeof couponSchema>;

/**
 * Admin page for managing coupons
 * Allows admins to create, edit, delete, and track coupon usage
 */
export default function CouponManagementPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [selectedCouponUsage, setSelectedCouponUsage] = useState<number | null>(null);
  const [isUsageDialogOpen, setIsUsageDialogOpen] = useState(false);
  const [usageSearchTerm, setUsageSearchTerm] = useState("");
  const [usageCurrentPage, setUsageCurrentPage] = useState(1);
  const usageItemsPerPage = 5;

  // Form setup
  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: "",
      description: "",
      maxUses: 0,
      tokensAmount: 10,
      isActive: true,
    },
  });

  // Fetch coupons
  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/admin/coupons"],
    retry: false,
  });

  // Fetch branding data for brand colors
  const { data: brandingData } = useQuery<{
    primary_color: string;
    secondary_color: string;
    accent_color: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });

  // Get brand colors for styling
  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color || '',
    secondaryColor: brandingData?.secondary_color || '',
    accentColor: brandingData?.accent_color || '',
  });

  // Fetch coupon usage for selected coupon
  const { data: couponUsage, isLoading: usageLoading } = useQuery<CouponUsage[]>({
    queryKey: [`/api/admin/coupons/${selectedCouponUsage}/usage`],
    enabled: !!selectedCouponUsage,
    retry: false,
  });

  // Filter and paginate coupon usage data
  const filteredAndPaginatedUsage = useMemo(() => {
    if (!couponUsage) return { data: [], totalPages: 0, totalItems: 0 };

    // Filter by search term
    const filtered = couponUsage.filter(usage =>
      usage.username.toLowerCase().includes(usageSearchTerm.toLowerCase()) ||
      usage.email.toLowerCase().includes(usageSearchTerm.toLowerCase()) ||
      usage.transactionId?.toString().includes(usageSearchTerm)
    );

    // Calculate pagination
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / usageItemsPerPage);
    const startIndex = (usageCurrentPage - 1) * usageItemsPerPage;
    const endIndex = startIndex + usageItemsPerPage;
    const paginatedData = filtered.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      totalPages,
      totalItems
    };
  }, [couponUsage, usageSearchTerm, usageCurrentPage]);

  // Generate coupon code mutation
  const generateCodeMutation = useMutation({
    mutationFn: () => apiRequest("/api/admin/coupons/generate-code", { method: "POST" }),
    onSuccess: (data: { code: string }) => {
      form.setValue("code", data.code);
      toast({
        title: "Success",
        description: "Coupon code generated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate coupon code",
        variant: "destructive",
      });
    },
  });

  // Create coupon mutation
  const createCouponMutation = useMutation({
    mutationFn: (data: CouponFormData) =>
      apiRequest("/api/admin/coupons", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    },
  });

  // Update coupon mutation
  const updateCouponMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CouponFormData> }) =>
      apiRequest(`/api/admin/coupons/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      setIsDialogOpen(false);
      setEditingCoupon(null);
      form.reset();
      toast({
        title: "Success",
        description: "Coupon updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      });
    },
  });

  // Delete coupon mutation
  const deleteCouponMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/admin/coupons/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete coupon",
        variant: "destructive",
      });
    },
  });

  // Toggle coupon status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      apiRequest(`/api/admin/coupons/${id}/status`, {
        method: "PATCH",
        body: { isActive },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/coupons"] });
      toast({
        title: "Success",
        description: "Coupon status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon status",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CouponFormData) => {
    if (editingCoupon) {
      updateCouponMutation.mutate({ id: editingCoupon.id, data });
    } else {
      createCouponMutation.mutate(data);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    form.reset({
      code: coupon.code,
      description: coupon.description || "",
      maxUses: coupon.maxUses,
      tokensAmount: coupon.tokensAmount,
      isActive: coupon.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleViewUsage = (couponId: number) => {
    setSelectedCouponUsage(couponId);
    setIsUsageDialogOpen(true);
    setUsageSearchTerm("");
    setUsageCurrentPage(1);
  };

  // Handle usage search
  const handleUsageSearch = (term: string) => {
    setUsageSearchTerm(term);
    setUsageCurrentPage(1); // Reset to first page when searching
  };

  // Handle usage pagination
  const handleUsagePageChange = (page: number) => {
    setUsageCurrentPage(page);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCoupon(null);
    form.reset();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUsagePercentage = (current: number, max: number | null) => {
    if (max === null || max === 0) return 0; // Unlimited
    return Math.round((current / max) * 100);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
            <p className="text-muted-foreground">
              Create and manage coupon codes for token and VirtFusion credit rewards
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setEditingCoupon(null)}
                style={{
                  backgroundColor: brandColors?.primary?.full || 'var(--brand-primary)',
                  color: 'white'
                }}
                className="hover:opacity-90 transition-opacity"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>
                  {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
                </DialogTitle>
                <DialogDescription>
                  {editingCoupon ? "Update the coupon details below." : "Create a new coupon with tokens reward for users."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Coupon Code</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter coupon code" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => generateCodeMutation.mutate()}
                        disabled={generateCodeMutation.isPending}
                        className="hover:bg-primary hover:text-primary-foreground"
                      >
                        {generateCodeMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter coupon description"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tokensAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tokens Amount</FormLabel>
                        <FormControl>
                          <Input type="number" min="0.01" step="0.01" {...field} />
                        </FormControl>
                        <FormDescription>
                          Number of tokens to award when claimed
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxUses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Maximum Uses</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0 for unlimited"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Maximum number of times this coupon can be used (0 = unlimited)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active Status</FormLabel>
                          <FormDescription>
                            Enable or disable this coupon
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseDialog}
                      className="hover:bg-primary hover:text-primary-foreground"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createCouponMutation.isPending || updateCouponMutation.isPending}
                      style={{
                        backgroundColor: brandColors?.primary?.full || 'var(--brand-primary)',
                        color: 'white'
                      }}
                      className="hover:opacity-90 transition-opacity"
                    >
                      {createCouponMutation.isPending || updateCouponMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      {editingCoupon ? "Update" : "Create"} Coupon
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Coupons Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Coupons
            </CardTitle>
          </CardHeader>
          <CardContent>
            {couponsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rewards</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coupons?.map((coupon) => (
                    <TableRow key={coupon.id}>
                      <TableCell className="font-mono font-medium">
                        {coupon.code}
                      </TableCell>
                      <TableCell>
                        {coupon.description || (
                          <span className="text-muted-foreground italic">No description</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Coins className="h-3 w-3" />
                          {coupon.tokensAmount} tokens
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm">
                            {coupon.currentUses} / {coupon.maxUses || '∞'} uses
                          </div>
                          <div className="w-full bg-secondary rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{
                                width: `${getUsagePercentage(coupon.currentUses, coupon.maxUses)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={coupon.isActive ? "default" : "secondary"}>
                          {coupon.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(coupon.createdAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewUsage(coupon.id)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(coupon)}
                            className="hover:bg-primary hover:text-primary-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              toggleStatusMutation.mutate({
                                id: coupon.id,
                                isActive: !coupon.isActive,
                              })
                            }
                            disabled={toggleStatusMutation.isPending}
                            className="hover:bg-primary hover:text-primary-foreground"
                            title={coupon.isActive ? "Deactivate coupon" : "Activate coupon"}
                          >
                            {coupon.isActive ? (
                              <Power className="h-4 w-4" />
                            ) : (
                              <PowerOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteCouponMutation.mutate(coupon.id)}
                            disabled={deleteCouponMutation.isPending}
                            className="hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Coupon Usage Dialog */}
        <Dialog open={isUsageDialogOpen} onOpenChange={setIsUsageDialogOpen}>
          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Coupon Usage History</DialogTitle>
              <DialogDescription>
                View all users who have used this coupon and their transaction details.
              </DialogDescription>
            </DialogHeader>

            {/* Search and Stats */}
            {couponUsage && couponUsage.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by user, email, or transaction ID..."
                      value={usageSearchTerm}
                      onChange={(e) => handleUsageSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {filteredAndPaginatedUsage.totalItems} total usage{filteredAndPaginatedUsage.totalItems !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-[400px] overflow-y-auto">
              {usageLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : couponUsage && couponUsage.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Tokens Received</TableHead>
                        <TableHead>Used At</TableHead>
                        <TableHead>Transaction ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndPaginatedUsage.data.map((usage) => (
                        <TableRow key={usage.id}>
                          <TableCell>{usage.username}</TableCell>
                          <TableCell>{usage.email}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Coins className="h-3 w-3" />
                              {usage.tokensReceived}
                            </div>
                          </TableCell>
                          <TableCell>{formatDate(usage.usedAt)}</TableCell>
                          <TableCell>
                            {usage.transactionId ? (
                              <span className="font-mono text-sm">#{usage.transactionId}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {filteredAndPaginatedUsage.totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 py-4">
                      <div className="text-sm text-muted-foreground">
                        Showing {((usageCurrentPage - 1) * usageItemsPerPage) + 1} to {Math.min(usageCurrentPage * usageItemsPerPage, filteredAndPaginatedUsage.totalItems)} of {filteredAndPaginatedUsage.totalItems} entries
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUsagePageChange(usageCurrentPage - 1)}
                          disabled={usageCurrentPage <= 1}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                          {Array.from({ length: filteredAndPaginatedUsage.totalPages }, (_, i) => i + 1).map((page) => (
                            <Button
                              key={page}
                              variant={page === usageCurrentPage ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleUsagePageChange(page)}
                              style={page === usageCurrentPage ? {
                                backgroundColor: brandColors?.primary?.full || 'var(--brand-primary)',
                                color: 'white'
                              } : {}}
                              className={page === usageCurrentPage ? "" : "hover:bg-primary hover:text-primary-foreground"}
                            >
                              {page}
                            </Button>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUsagePageChange(usageCurrentPage + 1)}
                          disabled={usageCurrentPage >= filteredAndPaginatedUsage.totalPages}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {usageSearchTerm ? (
                    <>
                      <Search className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p>No usage history found matching "{usageSearchTerm}".</p>
                      <Button
                        variant="link"
                        onClick={() => setUsageSearchTerm("")}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    </>
                  ) : (
                    "No usage history found for this coupon."
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}