import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Settings,
  UserPlus,
  UserMinus,
  Shield,
  CheckCircle,
  XCircle,
  Star,
  Palette,
  MessageCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBrandColors } from '@/lib/brand-theme';

interface ChatDepartment {
  id: number;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  color: string;
  icon: string;
  createdAt: string;
  updatedAt: string;
}

interface DepartmentAdmin {
  id: number;
  departmentId: number;
  adminId: number;
  canManage: boolean;
  isActive: boolean;
  admin: {
    id: number;
    fullName: string;
    email: string;
  };
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

const ICON_OPTIONS = [
  { value: 'MessageCircle', label: 'Message Circle', icon: MessageCircle },
  { value: 'Users', label: 'Users', icon: Users },
  { value: 'Settings', label: 'Settings', icon: Settings },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Star', label: 'Star', icon: Star },
];

const COLOR_OPTIONS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
];

export default function DepartmentManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const brandColors = getBrandColors();

  // State for department form
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<ChatDepartment | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    description: '',
    color: '#3b82f6',
    icon: 'MessageCircle',
    isDefault: false,
    displayOrder: 0,
  });

  // State for admin assignment
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedDepartmentForAssign, setSelectedDepartmentForAssign] = useState<ChatDepartment | null>(null);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  // Fetch departments
  const { data: departments = [], refetch: refetchDepartments } = useQuery<ChatDepartment[]>({
    queryKey: ['/api/chat/admin/departments'],
    queryFn: async () => {
      const response = await fetch('/api/chat/admin/departments');
      if (!response.ok) throw new Error('Failed to fetch departments');
      return response.json();
    },
  });

  // Fetch admin users
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      if (!response.ok) throw new Error('Failed to fetch admin users');
      return response.json();
    },
  });

  // Filter to only admin users and apply search
  const adminUsers = allUsers
    .filter((user: User) => user.role === 'admin')
    .filter((user: User) =>
      adminSearchQuery === '' ||
      user.fullName.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(adminSearchQuery.toLowerCase())
    );

  // Fetch department admins for selected department
  const { data: departmentAdmins = [] } = useQuery<DepartmentAdmin[]>({
    queryKey: ['/api/chat/admin/departments', selectedDepartmentForAssign?.id, 'admins'],
    queryFn: async () => {
      if (!selectedDepartmentForAssign) return [];
      const response = await fetch(`/api/chat/admin/departments/${selectedDepartmentForAssign.id}/admins`);
      if (!response.ok) throw new Error('Failed to fetch department admins');
      return response.json();
    },
    enabled: !!selectedDepartmentForAssign,
  });

  // Create department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: typeof departmentForm) => {
      const response = await fetch('/api/chat/admin/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create department');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Department created successfully' });
      setIsCreateDialogOpen(false);
      resetForm();
      refetchDepartments();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create department',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<typeof departmentForm> }) => {
      const response = await fetch(`/api/chat/admin/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update department');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Department updated successfully' });
      setIsEditDialogOpen(false);
      setEditingDepartment(null);
      resetForm();
      refetchDepartments();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update department',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/chat/admin/departments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete department');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Department deleted successfully' });
      refetchDepartments();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete department',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Assign admin mutation
  const assignAdminMutation = useMutation({
    mutationFn: async ({ departmentId, adminId, canManage }: { departmentId: number; adminId: number; canManage: boolean }) => {
      const response = await fetch(`/api/chat/admin/departments/${departmentId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, canManage }),
      });
      if (!response.ok) throw new Error('Failed to assign admin');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Admin assigned successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/admin/departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to assign admin',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove admin mutation
  const removeAdminMutation = useMutation({
    mutationFn: async ({ departmentId, adminId }: { departmentId: number; adminId: number }) => {
      const response = await fetch(`/api/chat/admin/departments/${departmentId}/admins/${adminId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove admin');
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Admin removed successfully' });
      queryClient.invalidateQueries({ queryKey: ['/api/chat/admin/departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to remove admin',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setDepartmentForm({
      name: '',
      description: '',
      color: '#3b82f6',
      icon: 'MessageCircle',
      isDefault: false,
      displayOrder: 0,
    });
  };

  const handleCreateDepartment = () => {
    createDepartmentMutation.mutate(departmentForm);
  };

  const handleEditDepartment = (department: ChatDepartment) => {
    setEditingDepartment(department);
    setDepartmentForm({
      name: department.name,
      description: department.description || '',
      color: department.color,
      icon: department.icon,
      isDefault: department.isDefault,
      displayOrder: department.displayOrder,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateDepartment = () => {
    if (!editingDepartment) return;
    updateDepartmentMutation.mutate({
      id: editingDepartment.id,
      data: departmentForm,
    });
  };

  const handleDeleteDepartment = (id: number) => {
    deleteDepartmentMutation.mutate(id);
  };

  const handleAssignAdmin = (adminId: number, canManage: boolean) => {
    if (!selectedDepartmentForAssign) return;
    assignAdminMutation.mutate({
      departmentId: selectedDepartmentForAssign.id,
      adminId,
      canManage,
    });
  };

  const handleRemoveAdmin = (departmentId: number, adminId: number) => {
    removeAdminMutation.mutate({ departmentId, adminId });
  };

  const getIconComponent = (iconName: string) => {
    const iconOption = ICON_OPTIONS.find(option => option.value === iconName);
    return iconOption ? iconOption.icon : MessageCircle;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Department Management</h2>
          <p className="text-gray-600 mt-1">
            Manage chat departments and assign administrators
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="flex items-center space-x-2"
              style={{ backgroundColor: brandColors.primary.full }}
            >
              <Plus className="h-4 w-4" />
              <span>Create Department</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Department</DialogTitle>
              <DialogDescription>
                Create a new chat support department with custom settings.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Department Name</Label>
                <Input
                  id="name"
                  value={departmentForm.name}
                  onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Technical Support"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={departmentForm.description}
                  onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this department"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_OPTIONS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-8 h-8 rounded-full border-2 ${
                          departmentForm.color === color ? 'border-gray-900' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setDepartmentForm(prev => ({ ...prev, color }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon</Label>
                  <Select
                    value={departmentForm.icon}
                    onValueChange={(value) => setDepartmentForm(prev => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map((option) => {
                        const IconComponent = option.icon;
                        return (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center space-x-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{option.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={departmentForm.isDefault}
                  onCheckedChange={(checked) => setDepartmentForm(prev => ({ ...prev, isDefault: checked }))}
                />
                <Label htmlFor="isDefault">Set as default department</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateDepartment}
                disabled={createDepartmentMutation.isPending || !departmentForm.name.trim()}
                style={{ backgroundColor: brandColors.primary.full }}
              >
                {createDepartmentMutation.isPending ? 'Creating...' : 'Create Department'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Departments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((department) => {
          const IconComponent = getIconComponent(department.icon);
          return (
            <Card key={department.id} className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: department.color + '20' }}
                    >
                      <IconComponent
                        className="h-5 w-5"
                        style={{ color: department.color }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                        <span>{department.name}</span>
                        {department.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            Default
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        Order: {department.displayOrder}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditDepartment(department)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Department</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{department.name}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteDepartment(department.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  {department.description || 'No description provided'}
                </p>
                <div className="flex items-center justify-between">
                  <Badge
                    variant={department.isActive ? 'default' : 'secondary'}
                    className="text-xs"
                  >
                    {department.isActive ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3 w-3 mr-1" />
                        Inactive
                      </>
                    )}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDepartmentForAssign(department);
                      setIsAssignDialogOpen(true);
                    }}
                    className="text-xs"
                  >
                    <UserPlus className="h-3 w-3 mr-1" />
                    Manage Admins
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Department Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update department settings and configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name</Label>
              <Input
                id="edit-name"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Technical Support"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of this department"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-color">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full border-2 ${
                        departmentForm.color === color ? 'border-gray-900' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setDepartmentForm(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-icon">Icon</Label>
                <Select
                  value={departmentForm.icon}
                  onValueChange={(value) => setDepartmentForm(prev => ({ ...prev, icon: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map((option) => {
                      const IconComponent = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center space-x-2">
                            <IconComponent className="h-4 w-4" />
                            <span>{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-order">Display Order</Label>
              <Input
                id="edit-order"
                type="number"
                value={departmentForm.displayOrder}
                onChange={(e) => setDepartmentForm(prev => ({ ...prev, displayOrder: parseInt(e.target.value) || 0 }))}
                min="0"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-isDefault"
                checked={departmentForm.isDefault}
                onCheckedChange={(checked) => setDepartmentForm(prev => ({ ...prev, isDefault: checked }))}
              />
              <Label htmlFor="edit-isDefault">Set as default department</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateDepartment}
              disabled={updateDepartmentMutation.isPending || !departmentForm.name.trim()}
              style={{ backgroundColor: brandColors.primary.full }}
            >
              {updateDepartmentMutation.isPending ? 'Updating...' : 'Update Department'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Assignment Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open);
        if (!open) {
          setAdminSearchQuery('');
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Department Admins</DialogTitle>
            <DialogDescription>
              Assign administrators to "{selectedDepartmentForAssign?.name}" department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Current Admins */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Current Administrators</h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {departmentAdmins.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No administrators assigned</p>
                ) : (
                  departmentAdmins.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {assignment.admin.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {assignment.admin.email}
                          </p>
                        </div>
                        {assignment.canManage && (
                          <Badge variant="secondary" className="text-xs">
                            <Shield className="h-3 w-3 mr-1" />
                            Manager
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAdmin(assignment.departmentId, assignment.adminId)}
                        className="h-8 w-8 p-0 hover:bg-red-100 hover:text-red-600"
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Available Admins */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Available Administrators</h4>
                <div className="flex-1 max-w-xs ml-4">
                  <Input
                    placeholder="Search administrators..."
                    value={adminSearchQuery}
                    onChange={(e) => setAdminSearchQuery(e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {adminUsers
                  .filter(admin => !departmentAdmins.some(assignment => assignment.adminId === admin.id))
                  .map((admin) => (
                    <div
                      key={admin.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                          <Users className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {admin.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {admin.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignAdmin(admin.id, false)}
                          className="text-xs"
                        >
                          <UserPlus className="h-3 w-3 mr-1" />
                          Assign
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignAdmin(admin.id, true)}
                          className="text-xs"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Assign as Manager
                        </Button>
                      </div>
                    </div>
                  ))}
                {adminUsers.filter(admin => !departmentAdmins.some(assignment => assignment.adminId === admin.id)).length === 0 && (
                  <div className="text-center py-4">
                    {adminSearchQuery ? (
                      <div>
                        <p className="text-sm text-gray-500 mb-2">No administrators found matching "{adminSearchQuery}"</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setAdminSearchQuery('')}
                          className="text-xs"
                        >
                          Clear search
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">All administrators are already assigned</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
