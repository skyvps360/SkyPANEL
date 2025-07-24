import { useState } from "react";
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
  Gift,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  Calendar,
  Coins,
  Users,
  TrendingUp,
} from "lucide-react";

// Award Setting interface
interface AwardSetting {
  id: number;
  name: string;
  description: string | null;
  loginDaysRequired: number;
  virtFusionTokens: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Award statistics interface
interface AwardStats {
  totalActiveSettings: number;
  totalUsersWithStreaks: number;
  totalTokensAwarded: number;
  averageStreak: number;
}

// Award system status interface
interface AwardSystemStatus {
  enabled: boolean;
}

// Form schema for award settings
const awardSettingSchema = z.object({
  name: z.string().min(1, { message: "Award name is required" }),
  description: z.string().optional(),
  loginDaysRequired: z.coerce.number().min(7, { message: "Login days must be at least 7 days to prevent abuse" }),
  virtFusionTokens: z.coerce.number().min(0, { message: "Tokens must be 0 or greater" }),
  isActive: z.boolean().default(true),
});

type AwardSettingFormData = z.infer<typeof awardSettingSchema>;

/**
 * Admin page for managing user award settings and daily login rewards
 * Allows admins to configure login streak requirements and token rewards
 */
export default function UserAwardsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<AwardSetting | null>(null);

  // Form setup
  const form = useForm<AwardSettingFormData>({
    resolver: zodResolver(awardSettingSchema),
    defaultValues: {
      name: "",
      description: "",
      loginDaysRequired: 7,
      virtFusionTokens: 10,
      isActive: true,
    },
  });

  // Fetch award settings
  const { data: awardSettings, isLoading: settingsLoading } = useQuery<AwardSetting[]>({
    queryKey: ["/api/awards/admin/award-settings"],
    retry: false,
  });

  // Fetch award statistics
  const { data: awardStats, isLoading: statsLoading } = useQuery<AwardStats>({
    queryKey: ["/api/awards/admin/award-stats"],
    retry: false,
  });

  // Fetch award system status
  const { data: awardSystemStatus, isLoading: statusLoading } = useQuery<AwardSystemStatus>({
    queryKey: ["/api/admin/settings/award-system/status"],
    retry: false,
  });

  // Create award setting mutation
  const createAwardMutation = useMutation({
    mutationFn: (data: AwardSettingFormData) =>
      apiRequest("/api/awards/admin/award-settings", {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-stats"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Award setting created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create award setting",
        variant: "destructive",
      });
    },
  });

  // Update award setting mutation
  const updateAwardMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: AwardSettingFormData }) =>
      apiRequest(`/api/awards/admin/award-settings/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-stats"] });
      setIsDialogOpen(false);
      setEditingAward(null);
      form.reset();
      toast({
        title: "Success",
        description: "Award setting updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update award setting",
        variant: "destructive",
      });
    },
  });

  // Delete award setting mutation
  const deleteAwardMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/awards/admin/award-settings/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/awards/admin/award-stats"] });
      toast({
        title: "Success",
        description: "Award setting deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete award setting",
        variant: "destructive",
      });
    },
  });

  // Toggle award system mutation
  const toggleAwardSystemMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("/api/admin/settings/award-system/toggle", {
        method: "PUT",
        body: { enabled },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings/award-system/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/award-system-status"] });
      toast({
        title: "Success",
        description: "Award system status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update award system status",
        variant: "destructive",
      });
    },
  });

  /**
   * Handle form submission for creating or updating award settings
   */
  const onSubmit = (data: AwardSettingFormData) => {
    if (editingAward) {
      updateAwardMutation.mutate({ id: editingAward.id, data });
    } else {
      createAwardMutation.mutate(data);
    }
  };

  /**
   * Open dialog for editing an existing award setting
   */
  const handleEdit = (award: AwardSetting) => {
    setEditingAward(award);
    form.reset({
      name: award.name,
      description: award.description || "",
      loginDaysRequired: award.loginDaysRequired,
      virtFusionTokens: award.virtFusionTokens,
      isActive: award.isActive,
    });
    setIsDialogOpen(true);
  };

  /**
   * Open dialog for creating a new award setting
   */
  const handleCreate = () => {
    setEditingAward(null);
    form.reset({
      name: "",
      description: "",
      loginDaysRequired: 7,
      virtFusionTokens: 10,
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  /**
   * Handle deleting an award setting
   */
  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this award setting?")) {
      deleteAwardMutation.mutate(id);
    }
  };

  /**
   * Handle toggling the award system
   */
  const handleToggleAwardSystem = (enabled: boolean) => {
    toggleAwardSystemMutation.mutate(enabled);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Awards</h1>
            <p className="text-muted-foreground">
              Manage daily login rewards and award settings
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <Label htmlFor="award-system-toggle" className="text-sm font-medium">
                Award System
              </Label>
              <Switch
                id="award-system-toggle"
                checked={awardSystemStatus?.enabled ?? true}
                onCheckedChange={handleToggleAwardSystem}
                disabled={statusLoading || toggleAwardSystemMutation.isPending}
              />
            </div>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Award
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Awards</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  awardStats?.totalActiveSettings || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Award settings configured
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Users with Streaks</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  awardStats?.totalUsersWithStreaks || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Users with login streaks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tokens Awarded</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  awardStats?.totalTokensAwarded || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Total VirtFusion tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  Math.round(awardStats?.averageStreak || 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Days average streak
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Award Settings Table */}
        <Card>
          <CardHeader>
            <CardTitle>Award Settings</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Login Days</TableHead>
                    <TableHead>VirtFusion Tokens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awardSettings?.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell className="font-medium">{award.name}</TableCell>
                      <TableCell>{award.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {award.loginDaysRequired}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-muted-foreground" />
                          {award.virtFusionTokens}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            award.isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
                          }`}
                        >
                          {award.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(award)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(award.id)}
                            disabled={deleteAwardMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!awardSettings?.length && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Gift className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            No award settings configured yet
                          </p>
                          <Button onClick={handleCreate} variant="outline">
                            Create your first award
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingAward ? "Edit Award Setting" : "Create Award Setting"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Award Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Daily Login Reward" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Reward for logging in daily"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="loginDaysRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Login Days Required</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of consecutive login days required
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="virtFusionTokens"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VirtFusion Tokens</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="10"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Amount of VirtFusion tokens to award
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
                        <FormLabel className="text-base">Active</FormLabel>
                        <FormDescription>
                          Enable this award setting
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

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createAwardMutation.isPending || updateAwardMutation.isPending
                    }
                  >
                    {createAwardMutation.isPending ||
                    updateAwardMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {editingAward ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}