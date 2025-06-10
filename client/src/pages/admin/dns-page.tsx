import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  DollarSign,
  Users,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

interface DnsPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  maxDomains: number;
  maxRecords: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    subscriptions: number;
  };
}

interface BrandingData {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

export default function AdminDnsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for dialogs
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<DnsPlan | null>(null);

  // State for features management
  const [newFeature, setNewFeature] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    maxDomains: 1,
    maxRecords: 10,
    features: [] as string[],
    isActive: true,
    displayOrder: 0
  });

  // Fetch branding data
  const { data: brandingData } = useQuery<BrandingData>({
    queryKey: ['/api/settings/branding'],
  });

  const brandColors = getBrandColors({
    primaryColor: brandingData?.primary_color,
    secondaryColor: brandingData?.secondary_color,
    accentColor: brandingData?.accent_color
  });

  // Fetch DNS plans
  const { data: dnsPlans = [], isLoading } = useQuery<DnsPlan[]>({
    queryKey: ["/api/admin/dns-plans"],
  });

  // Create DNS plan mutation
  const createPlanMutation = useMutation({
    mutationFn: async (planData: Omit<DnsPlan, 'id' | 'createdAt' | 'updatedAt'>) => {
      const response = await fetch("/api/admin/dns-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      if (!response.ok) throw new Error("Failed to create DNS plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dns-plans"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "DNS plan created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create DNS plan",
        variant: "destructive",
      });
    },
  });

  // Update DNS plan mutation
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, ...planData }: Partial<DnsPlan> & { id: number }) => {
      const response = await fetch(`/api/admin/dns-plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
      });
      if (!response.ok) throw new Error("Failed to update DNS plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dns-plans"] });
      setIsEditDialogOpen(false);
      resetForm();
      toast({
        title: "Success",
        description: "DNS plan updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update DNS plan",
        variant: "destructive",
      });
    },
  });

  // Delete DNS plan mutation
  const deletePlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/dns-plans/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete DNS plan");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dns-plans"] });
      setIsDeleteDialogOpen(false);
      setSelectedPlan(null);
      toast({
        title: "Success",
        description: "DNS plan deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete DNS plan",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 0,
      maxDomains: 1,
      maxRecords: 10,
      features: [],
      isActive: true,
      displayOrder: 0
    });
    setNewFeature("");
  };

  const handleAdd = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleEdit = (plan: DnsPlan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      maxDomains: plan.maxDomains,
      maxRecords: plan.maxRecords,
      features: plan.features || [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (plan: DnsPlan) => {
    setSelectedPlan(plan);
    setIsDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedPlan) {
      updatePlanMutation.mutate({ id: selectedPlan.id, ...formData });
    } else {
      createPlanMutation.mutate(formData);
    }
  };

  const handleToggleActive = (plan: DnsPlan) => {
    updatePlanMutation.mutate({ 
      id: plan.id, 
      isActive: !plan.isActive 
    });
  };

  const columns: DataTableColumn<DnsPlan>[] = [
    {
      accessorKey: "name",
      header: "Plan Name",
      cell: (plan: DnsPlan) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{plan.name}</span>
          {!plan.isActive && (
            <Badge variant="secondary" className="text-xs">
              Inactive
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: (plan: DnsPlan) => (
        <span className="font-medium">
          ${plan.price.toFixed(2)}/month
        </span>
      ),
    },
    {
      accessorKey: "maxDomains",
      header: "Max Domains",
      cell: (plan: DnsPlan) => plan.maxDomains,
    },
    {
      accessorKey: "maxRecords",
      header: "Max Records",
      cell: (plan: DnsPlan) => plan.maxRecords,
    },
    {
      accessorKey: "features",
      header: "Features",
      cell: (plan: DnsPlan) => (
        <div className="max-w-xs">
          {plan.features && plan.features.length > 0 ? (
            <div className="space-y-1">
              {plan.features.slice(0, 2).map((feature, index) => (
                <div key={index} className="text-xs bg-muted px-2 py-1 rounded">
                  {feature}
                </div>
              ))}
              {plan.features.length > 2 && (
                <div className="text-xs text-muted-foreground">
                  +{plan.features.length - 2} more
                </div>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">No features</span>
          )}
        </div>
      ),
    },
    {
      id: "subscriptions",
      header: "Active Users",
      cell: (plan: DnsPlan) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{plan._count?.subscriptions || 0}</span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: (plan: DnsPlan) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleToggleActive(plan)}
            title={plan.isActive ? "Deactivate plan" : "Activate plan"}
          >
            {plan.isActive ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(plan)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(plan)}
            disabled={!!(plan._count?.subscriptions && plan._count.subscriptions > 0)}
            title={!!(plan._count?.subscriptions && plan._count.subscriptions > 0) ? "Cannot delete plan with active subscriptions" : "Delete plan"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">DNS Management</h1>
            <p className="text-muted-foreground">
              Manage DNS plans and configurations
            </p>
          </div>
          <Button
            onClick={handleAdd}
            style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
            className="hover:opacity-90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add DNS Plan
          </Button>
        </div>

        {/* DNS Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              DNS Plans ({dnsPlans.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={dnsPlans}
              columns={columns}
              isLoading={isLoading}
              enableSearch={true}
              searchKey="name"
              searchPlaceholder="Search DNS plans..."
              emptyMessage="No DNS plans found"
            />
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
          if (!open) {
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            resetForm();
            setSelectedPlan(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedPlan ? "Edit DNS Plan" : "Add DNS Plan"}
              </DialogTitle>
              <DialogDescription>
                {selectedPlan ? "Update the DNS plan details below." : "Create a new DNS plan with the details below."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic, Pro, Enterprise"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Plan description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price (USD/month)</Label>
                  <Input
                    id="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input
                    id="displayOrder"
                    type="number"
                    min="0"
                    value={formData.displayOrder}
                    onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="maxDomains">Max Domains</Label>
                  <Input
                    id="maxDomains"
                    type="number"
                    min="1"
                    value={formData.maxDomains}
                    onChange={(e) => setFormData({ ...formData, maxDomains: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div>
                  <Label htmlFor="maxRecords">Max Records per Domain</Label>
                  <Input
                    id="maxRecords"
                    type="number"
                    min="1"
                    value={formData.maxRecords}
                    onChange={(e) => setFormData({ ...formData, maxRecords: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              {/* Features Configuration Section */}
              <div className="space-y-3">
                <Label>Plan Features</Label>
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <span className="flex-1 text-sm">{feature}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newFeatures = formData.features.filter((_, i) => i !== index);
                          setFormData({ ...formData, features: newFeatures });
                        }}
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                      >
                        ×
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a new feature..."
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
                            setFormData({
                              ...formData,
                              features: [...formData.features, newFeature.trim()]
                            });
                            setNewFeature("");
                          }
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
                          setFormData({
                            ...formData,
                            features: [...formData.features, newFeature.trim()]
                          });
                          setNewFeature("");
                        }
                      }}
                      disabled={!newFeature.trim() || formData.features.includes(newFeature.trim())}
                    >
                      Add
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Add features that describe what this plan includes (e.g., "Basic DNS management", "24/7 support", "Advanced analytics")
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Plan</Label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                  resetForm();
                  setSelectedPlan(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                className="hover:opacity-90"
              >
                {createPlanMutation.isPending || updatePlanMutation.isPending ? "Saving..." : selectedPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete DNS Plan</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the "{selectedPlan?.name}" DNS plan? This action cannot be undone.
                {selectedPlan?._count?.subscriptions && selectedPlan._count.subscriptions > 0 && (
                  <div className="mt-2 p-2 bg-destructive/10 text-destructive rounded">
                    This plan has {selectedPlan._count.subscriptions} active subscription(s) and cannot be deleted.
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedPlan && deletePlanMutation.mutate(selectedPlan.id)}
                disabled={deletePlanMutation.isPending || !!(selectedPlan?._count?.subscriptions && selectedPlan._count.subscriptions > 0)}
              >
                {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
