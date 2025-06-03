import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Users,
  MessageCircle,
  Server,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

interface SupportDepartment {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
  requiresVps: boolean;
  isActive: boolean;
  displayOrder: number;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentFormData {
  name: string;
  description: string;
  isDefault: boolean;
  requiresVps: boolean;
  isActive: boolean;
  displayOrder: number;
  color: string;
  icon: string;
}

const iconOptions = [
  { value: 'MessageCircle', label: 'Message Circle', icon: MessageCircle },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Server', label: 'Server', icon: Server },
  { value: 'CreditCard', label: 'Credit Card', icon: CreditCard },
  { value: 'ShoppingCart', label: 'Shopping Cart', icon: ShoppingCart },
];

const colorOptions = [
  { value: '#3b82f6', label: 'Blue', color: '#3b82f6' },
  { value: '#10b981', label: 'Green', color: '#10b981' },
  { value: '#f59e0b', label: 'Yellow', color: '#f59e0b' },
  { value: '#8b5cf6', label: 'Purple', color: '#8b5cf6' },
  { value: '#ef4444', label: 'Red', color: '#ef4444' },
  { value: '#06b6d4', label: 'Cyan', color: '#06b6d4' },
];

export function UnifiedDepartmentManager() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<SupportDepartment | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // Fetch unified departments
  const { data: departments = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/unified-departments'],
    queryFn: () => apiRequest('/api/admin/unified-departments')
  });

  // Fetch migration status
  const { data: migrationStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/admin/department-migration/status'],
    queryFn: () => apiRequest('/api/admin/department-migration/status')
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      return apiRequest('/api/admin/unified-departments', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department created',
        description: 'The department has been created successfully.',
      });
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating department',
        description: error.message || 'An error occurred while creating the department.',
        variant: 'destructive',
      });
    }
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<DepartmentFormData> }) => {
      return apiRequest(`/api/admin/unified-departments/${id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department updated',
        description: 'The department has been updated successfully.',
      });
      setEditingDepartment(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating department',
        description: error.message || 'An error occurred while updating the department.',
        variant: 'destructive',
      });
    }
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/unified-departments/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department deleted',
        description: 'The department has been deleted successfully.',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting department',
        description: error.message || 'An error occurred while deleting the department.',
        variant: 'destructive',
      });
    }
  });

  // Sync departments mutation
  const syncDepartmentsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/department-migration/sync', {
        method: 'POST'
      });
    },
    onSuccess: (result) => {
      toast({
        title: 'Departments synchronized',
        description: result.message || 'Departments have been synchronized successfully.',
      });
      refetch();
      refetchStatus();
    },
    onError: (error: any) => {
      toast({
        title: 'Error synchronizing departments',
        description: error.message || 'An error occurred while synchronizing departments.',
        variant: 'destructive',
      });
    }
  });

  const handleCreateDepartment = (data: DepartmentFormData) => {
    createDepartmentMutation.mutate(data);
  };

  const handleUpdateDepartment = (id: number, data: Partial<DepartmentFormData>) => {
    updateDepartmentMutation.mutate({ id, data });
  };

  const handleDeleteDepartment = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete the department "${name}"? This action cannot be undone.`)) {
      deleteDepartmentMutation.mutate(id);
    }
  };

  const handleSyncDepartments = () => {
    if (confirm('This will synchronize departments from legacy tables. Continue?')) {
      syncDepartmentsMutation.mutate();
    }
  };

  const filteredDepartments = departments.filter((dept: SupportDepartment) =>
    showInactive || dept.isActive
  );

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(option => option.value === iconName);
    return iconOption ? iconOption.icon : MessageCircle;
  };

  if (isLoading || isLoadingStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading departments...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Unified Department Management</h2>
          <p className="text-muted-foreground">
            Manage departments for both tickets and live chat from a single interface.
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-inactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="show-inactive" className="flex items-center space-x-1">
              {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span>Show inactive</span>
            </Label>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              refetch();
              refetchStatus();
            }}
            disabled={isLoading || isLoadingStatus}
          >
            {isLoading || isLoadingStatus ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
          {migrationStatus?.syncStatus?.needsSync && (
            <Button
              variant="outline"
              onClick={handleSyncDepartments}
              disabled={syncDepartmentsMutation.isPending}
            >
              {syncDepartmentsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Sync Departments
                </>
              )}
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DepartmentForm
                onSubmit={handleCreateDepartment}
                onCancel={() => setIsCreateDialogOpen(false)}
                isLoading={createDepartmentMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Migration Status Card */}
      {migrationStatus && (
        <Card className={cn(
          "border-l-4",
          migrationStatus.needsMigration ? "border-l-yellow-500 bg-yellow-50" :
          migrationStatus.syncStatus?.needsSync ? "border-l-blue-500 bg-blue-50" :
          "border-l-green-500 bg-green-50"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {migrationStatus.needsMigration ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : migrationStatus.syncStatus?.needsSync ? (
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                )}
                <div>
                  <h3 className="font-medium">
                    {migrationStatus.needsMigration ? 'Migration Required' :
                     migrationStatus.syncStatus?.needsSync ? 'Sync Available' :
                     'System Unified'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {migrationStatus.needsMigration ?
                      'Legacy departments need to be migrated to the unified system.' :
                     migrationStatus.syncStatus?.needsSync ?
                      `${migrationStatus.syncStatus.totalNewDepartments || (migrationStatus.syncStatus.newTicketDepartments?.length || 0) + (migrationStatus.syncStatus.newChatDepartments?.length || 0)} new departments can be synchronized.` :
                      'All departments are unified and synchronized.'}
                  </p>
                </div>
              </div>
              {migrationStatus.syncStatus?.needsSync && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncDepartments}
                  disabled={syncDepartmentsMutation.isPending}
                >
                  {syncDepartmentsMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync Now
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {filteredDepartments.map((department: SupportDepartment) => {
          const IconComponent = getIconComponent(department.icon);
          return (
            <Card key={department.id} className={cn(
              "transition-all duration-200",
              !department.isActive && "opacity-60 border-dashed"
            )}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div 
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${department.color}20`, color: department.color }}
                    >
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{department.name}</h3>
                        {department.isDefault && (
                          <Badge variant="secondary">Default</Badge>
                        )}
                        {department.requiresVps && (
                          <Badge variant="outline">Requires VPS</Badge>
                        )}
                        {!department.isActive && (
                          <Badge variant="destructive">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{department.description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                        <span>Order: {department.displayOrder}</span>
                        <span>ID: {department.id}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DepartmentForm
                          department={department}
                          onSubmit={(data) => handleUpdateDepartment(department.id, data)}
                          onCancel={() => setEditingDepartment(null)}
                          isLoading={updateDepartmentMutation.isPending}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteDepartment(department.id, department.name)}
                      disabled={deleteDepartmentMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredDepartments.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No departments found</h3>
            <p className="text-muted-foreground mb-4">
              {showInactive 
                ? "No departments exist yet. Create your first department to get started."
                : "No active departments found. Try showing inactive departments or create a new one."
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Department
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface DepartmentFormProps {
  department?: SupportDepartment;
  onSubmit: (data: DepartmentFormData) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function DepartmentForm({ department, onSubmit, onCancel, isLoading }: DepartmentFormProps) {
  const [formData, setFormData] = useState<DepartmentFormData>({
    name: department?.name || '',
    description: department?.description || '',
    isDefault: department?.isDefault || false,
    requiresVps: department?.requiresVps || false,
    isActive: department?.isActive ?? true,
    displayOrder: department?.displayOrder || 0,
    color: department?.color || '#3b82f6',
    icon: department?.icon || 'MessageCircle',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = iconOptions.find(option => option.value === iconName);
    return iconOption ? iconOption.icon : MessageCircle;
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {department ? 'Edit Department' : 'Create Department'}
        </DialogTitle>
        <DialogDescription>
          {department 
            ? 'Update the department settings. Changes will be applied to both tickets and live chat.'
            : 'Create a new department for both tickets and live chat support.'
          }
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Department name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayOrder">Display Order</Label>
            <Input
              id="displayOrder"
              type="number"
              value={formData.displayOrder}
              onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Department description"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="icon">Icon</Label>
            <Select value={formData.icon} onValueChange={(value) => setFormData({ ...formData, icon: value })}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    {React.createElement(getIconComponent(formData.icon), { className: "h-4 w-4" })}
                    <span>{iconOptions.find(opt => opt.value === formData.icon)?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <option.icon className="h-4 w-4" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Select value={formData.color} onValueChange={(value) => setFormData({ ...formData, color: value })}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: formData.color }}
                    />
                    <span>{colorOptions.find(opt => opt.value === formData.color)?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {colorOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: option.color }}
                      />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            />
            <Label htmlFor="isActive">Active</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="isDefault"
              checked={formData.isDefault}
              onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
            />
            <Label htmlFor="isDefault">Default department</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="requiresVps"
              checked={formData.requiresVps}
              onCheckedChange={(checked) => setFormData({ ...formData, requiresVps: checked })}
            />
            <Label htmlFor="requiresVps">Requires VPS information</Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {department ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              department ? 'Update Department' : 'Create Department'
            )}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}
