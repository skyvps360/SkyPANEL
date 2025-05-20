import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as LucideIcons from 'lucide-react';
import { z } from 'zod';
import { Loader2, Plus, Trash2, Edit, Server } from 'lucide-react';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { getBrandColors, BrandColorsResult } from '@/lib/brand-theme';

// Form schema
const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(3, "Description is required"),
  category: z.string().min(1, "Category is required"),
  icon: z.string().min(1, "Icon is required"),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().default(0)
});

type FormData = z.infer<typeof formSchema>;

export default function PlanFeaturesPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<any | null>(null);
  const [brandColors, setBrandColors] = useState<BrandColorsResult>({
    primary: { hex: '2563eb', full: '#2563eb', light: '#2563eb1a', medium: '#2563eb40', lighter: '#2563eb0a', dark: '#1e50bd', extraLight: '#2563eb05', border: '#2563eb20' },
    secondary: { hex: '10b981', full: '#10b981', light: '#10b9811a', medium: '#10b98140', lighter: '#10b9810a', dark: '#0d9468', extraLight: '#10b98105', border: '#10b98120' },
    accent: { hex: 'f59e0b', full: '#f59e0b', light: '#f59e0b1a', medium: '#f59e0b40', lighter: '#f59e0b0a', dark: '#c47e09', extraLight: '#f59e0b05', border: '#f59e0b20' },
    full: '#2563eb',
    light: '#2563eb1a',
    medium: '#2563eb40',
    lighter: '#2563eb0a',
    hex: '2563eb',
    gradient: {
      primary: 'linear-gradient(to right, #2563eb, #2563ebdd)',
      secondary: 'linear-gradient(to right, #10b981, #10b981dd)',
      accent: 'linear-gradient(to right, #f59e0b, #f59e0bdd)',
      dark: 'linear-gradient(to right bottom, #2563eb20, #111827)',
      card: 'linear-gradient(to bottom right, #2563eb05, #2563eb10)',
    }
  });

  // Fetch branding settings
  useEffect(() => {
    // Fetch brand settings from API
    fetch('/api/settings/branding')
      .then(res => res.json())
      .then(data => {
        // Apply brand colors
        const colors = getBrandColors({
          primaryColor: data.primary_color || data.company_color,
          secondaryColor: data.secondary_color,
          accentColor: data.accent_color
        });
        setBrandColors(colors);
      })
      .catch(err => {
        console.error('Error loading brand settings:', err);
      });
  }, []);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'general',
      icon: '',
      isActive: true,
      displayOrder: 0
    }
  });

  // Fetch plan features
  const { data: features = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/plan-features'],
    retry: 1
  });

  // Add new plan feature
  const addMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest('/api/admin/plan-features', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plan-features'] });
      toast({ title: "Success", description: "Plan feature added successfully" });
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add plan feature", 
        variant: "destructive" 
      });
    }
  });

  // Update plan feature
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!editingFeature) return Promise.reject("No feature selected for editing");
      return apiRequest(`/api/admin/plan-features/${editingFeature.id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plan-features'] });
      toast({ title: "Success", description: "Plan feature updated successfully" });
      setIsModalOpen(false);
      setEditingFeature(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update plan feature", 
        variant: "destructive" 
      });
    }
  });

  // Delete plan feature
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/admin/plan-features/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/plan-features'] });
      toast({ title: "Success", description: "Plan feature deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete plan feature", 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (data: FormData) => {
    if (editingFeature) {
      updateMutation.mutate(data);
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (feature: any) => {
    setEditingFeature(feature);
    form.reset({
      title: feature.title,
      description: feature.description || '',
      category: feature.category || 'general',
      icon: feature.icon || '',
      isActive: feature.isActive,
      displayOrder: typeof feature.displayOrder === 'number' ? feature.displayOrder : 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this plan feature?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdd = () => {
    form.reset({
      title: '',
      description: '',
      category: 'general',
      icon: '',
      isActive: true,
      displayOrder: 0
    });
    setEditingFeature(null);
    setIsModalOpen(true);
  };

  // Group features by category
  const featuresByCategory = features.reduce((acc: any, feature: any) => {
    const category = feature.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(feature);
    return acc;
  }, {});

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Plan Features</h1>
          <p className="text-gray-500 mt-1">Manage features displayed on your plans page</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
          <Button 
            onClick={handleAdd}
            style={{ 
              backgroundColor: brandColors.primary.full,
              borderColor: brandColors.primary.full
            }}
            className="transition-colors hover:bg-opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Feature
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 
                className="h-8 w-8 animate-spin" 
                style={{ color: brandColors.primary.full }}
              />
            </div>
          ) : (
            <>
              {Object.keys(featuresByCategory).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                  <Server className="h-12 w-12 mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No plan features found</h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Plan features are displayed on your plans page to showcase what your service offers.
                  </p>
                  <Button 
                    onClick={handleAdd}
                    style={{ 
                      backgroundColor: brandColors.primary.full,
                      borderColor: brandColors.primary.full
                    }}
                    className="transition-colors hover:bg-opacity-90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first feature
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 p-6">
                  {Object.entries(featuresByCategory).map(([category, categoryFeatures]: [string, any]) => (
                    <div key={category} className="mb-6">
                      <div className="flex items-center mb-3">
                        <h3 className="text-lg font-medium capitalize">{category}</h3>
                        <div 
                          className="ml-3 h-px flex-1 bg-border"
                          style={{ backgroundColor: brandColors.primary.lighter }}
                        ></div>
                      </div>
                      <div className="rounded-md border overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">Title</TableHead>
                              <TableHead className="hidden md:table-cell">Description</TableHead>
                              <TableHead className="hidden sm:table-cell">Icon</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden sm:table-cell">Order</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryFeatures.map((feature: any) => (
                              <TableRow key={feature.id}>
                                <TableCell className="font-medium">{feature.title}</TableCell>
                                <TableCell className="max-w-md truncate hidden md:table-cell">{feature.description}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  {feature.icon ? (
                                    <div className="flex items-center gap-2">
                                      {(() => {
                                        const iconName = feature.icon
                                          .split('-')
                                          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                                          .join('');
                                        const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Server;
                                        return <IconComponent className="h-4 w-4" />;
                                      })()}
                                      <span>{feature.icon}</span>
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span 
                                    className={`px-2 py-1 rounded text-xs ${
                                      feature.isActive 
                                        ? 'text-white' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                    style={feature.isActive ? { backgroundColor: brandColors.primary.full } : {}}
                                  >
                                    {feature.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">{feature.displayOrder}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => handleEdit(feature)}
                                      className="h-8 w-8"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => handleDelete(feature.id)}
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingFeature ? 'Edit Plan Feature' : 'Add Plan Feature'}</DialogTitle>
            <DialogDescription>
              {editingFeature 
                ? 'Update the details of this plan feature.' 
                : 'Create a new feature to display on your plans page.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feature Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. High Performance NVMe Storage" {...field} />
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
                        placeholder="Enter a detailed description of this feature" 
                        className="min-h-[100px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="network">Network</SelectItem>
                          <SelectItem value="security">Security</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Group similar features together</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an icon" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="server">Server</SelectItem>
                          <SelectItem value="hard-drive">Hard Drive</SelectItem>
                          <SelectItem value="cpu">CPU</SelectItem>
                          <SelectItem value="wifi">WiFi</SelectItem>
                          <SelectItem value="shield">Shield</SelectItem>
                          <SelectItem value="shield-check">Shield Check</SelectItem>
                          <SelectItem value="zap">Zap (Lightning)</SelectItem>
                          <SelectItem value="clock">Clock</SelectItem>
                          <SelectItem value="headset">Support</SelectItem>
                          <SelectItem value="globe">Globe</SelectItem>
                          <SelectItem value="database">Database</SelectItem>
                          <SelectItem value="lock">Lock</SelectItem>
                          <SelectItem value="check-circle">Check Circle</SelectItem>
                          <SelectItem value="cloud">Cloud</SelectItem>
                          <SelectItem value="settings">Settings</SelectItem>
                          <SelectItem value="code">Code</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Icon to display next to the feature</FormDescription>
                      {field.value && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="p-1.5 bg-muted rounded-md inline-block">
                            {(() => {
                              const iconName = field.value
                                .split('-')
                                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                                .join('');
                              const IconComponent = (LucideIcons as any)[iconName] || LucideIcons.Server;
                              return <IconComponent className="h-5 w-5" />;
                            })()}
                          </div>
                          <span className="text-sm text-muted-foreground">Icon preview</span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 1" {...field} />
                      </FormControl>
                      <FormDescription>Order in which features are displayed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div></div>
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Only active features will be displayed on the plans page
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

              <DialogFooter className="mt-6 gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  style={{ 
                    backgroundColor: brandColors.primary.full,
                    borderColor: brandColors.primary.full
                  }}
                  className="transition-colors hover:bg-opacity-90"
                >
                  {(addMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingFeature ? 'Update' : 'Add'} Feature
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}