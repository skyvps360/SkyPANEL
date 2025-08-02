import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Eye, Trash2, Send, ToggleLeft, ToggleRight, Copy, Code, Mail, Settings, Info } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/hooks/use-settings';
import { cn } from '@/lib/utils';

// Types
interface EmailTemplate {
  id: number;
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  type: string;
  isActive: boolean;
  variables: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: number;
  updatedBy?: number;
}

interface NewEmailTemplate {
  name: string;
  description?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  type: string;
  isActive: boolean;
  variables: string[];
}

// Email template types
const EMAIL_TEMPLATE_TYPES = [
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'email_verification', label: 'Email Verification' },
  { value: 'forgot_username', label: 'Username Reminder' },
  { value: 'welcome_email', label: 'Welcome Email' },
  { value: 'maintenance_notification', label: 'Maintenance Notification' },
  { value: 'payment_confirmation', label: 'Payment Confirmation' },
  { value: 'invoice_generated', label: 'Invoice Generated' },
  { value: 'server_created', label: 'Server Created' },
  { value: 'server_suspended', label: 'Server Suspended' },
  { value: 'ticket_created', label: 'Ticket Created' },
  { value: 'ticket_replied', label: 'Ticket Replied' },
  { value: 'custom', label: 'Custom' }
];

// Common email variables
const COMMON_VARIABLES = [
  'company_name', 'support_email', 'frontend_url', 'dashboard_url', 
  'support_url', 'docs_url', 'username', 'user_email', 'user_id'
];

// Template-specific variables for different types
const TEMPLATE_VARIABLES: Record<string, string[]> = {
  password_reset: ['reset_code', 'reset_url'],
  email_verification: ['verification_url', 'verification_token'],
  forgot_username: ['username'],
  welcome_email: ['username'],
  maintenance_notification: ['maintenance_message', 'estimated_completion'],
  payment_confirmation: ['amount', 'transaction_id', 'payment_method'],
  invoice_generated: ['invoice_number', 'amount', 'due_date'],
  server_created: ['server_name', 'server_ip', 'server_id'],
  server_suspended: ['server_name', 'reason', 'server_id'],
  ticket_created: ['ticket_id', 'ticket_subject'],
  ticket_replied: ['ticket_id', 'ticket_subject', 'reply_message']
};

export default function EmailTemplatesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  
  // Form state
  const [formData, setFormData] = useState<NewEmailTemplate>({
    name: '',
    description: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    type: '',
    isActive: true,
    variables: []
  });

  // Fetch email templates
  const { data: templates = [], isLoading, error } = useQuery<EmailTemplate[]>({
    queryKey: ['/api/admin/email-templates'],
    retry: false
  });

  // Fetch common variables
  const { data: commonVariables } = useQuery<{ variables: string[] }>({
    queryKey: ['/api/admin/email-templates/variables/common'],
    retry: false
  });

  // Fetch settings for support email
  const { data: settings = [] } = useQuery<{ id: number; key: string; value: string }[]>({
    queryKey: ['/api/admin/settings'],
    retry: false
  });

  // Use settings hook
  const { getSupportEmail } = useSettings(settings);

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (templateData: NewEmailTemplate) => {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Success', description: 'Email template created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to create template',
        variant: 'destructive'
      });
    }
  });

  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<EmailTemplate> }) => {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      resetForm();
      toast({ title: 'Success', description: 'Email template updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to update template',
        variant: 'destructive'
      });
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/email-templates/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete template');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      toast({ title: 'Success', description: 'Email template deleted successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete template',
        variant: 'destructive'
      });
    }
  });

  // Toggle template status mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/admin/email-templates/${id}/toggle`, {
        method: 'PATCH'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle template status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-templates'] });
      toast({ title: 'Success', description: 'Template status updated successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to toggle template status',
        variant: 'destructive'
      });
    }
  });

  // Preview template mutation
  const previewMutation = useMutation({
    mutationFn: async ({ id, variables }: { id: number; variables: Record<string, string> }) => {
      console.log('Previewing template:', id, 'with variables:', variables);
      const response = await fetch(`/api/admin/email-templates/${id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variables })
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Preview API error:', response.status, errorText);
        let errorMessage = 'Failed to preview template';
        try {
          const error = JSON.parse(errorText);
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const result = await response.json();
      console.log('Preview result:', result);
      return result;
    },
    onError: (error: any) => {
      console.error('Preview mutation error:', error);
      toast({ 
        title: 'Preview Error', 
        description: error.message || 'Failed to preview email template',
        variant: 'destructive'
      });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      subject: '',
      htmlContent: '',
      textContent: '',
      type: '',
      isActive: true,
      variables: []
    });
  };

  const openEditDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description || '',
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      type: template.type,
      isActive: template.isActive,
      variables: template.variables
    });
    setIsEditDialogOpen(true);
  };

  const openPreviewDialog = (template: EmailTemplate) => {
    setEditingTemplate(template);
    
    // Initialize preview variables with sample data
    const allVariables = [...COMMON_VARIABLES, ...(TEMPLATE_VARIABLES[template.type] || [])];
    const sampleVariables: Record<string, string> = {};
    allVariables.forEach(variable => {
      switch (variable) {
        case 'company_name':
          sampleVariables[variable] = 'SkyPANEL';
          break;
        case 'username':
          sampleVariables[variable] = 'john_doe';
          break;
        case 'user_email':
          sampleVariables[variable] = 'john@example.com';
          break;
        case 'reset_code':
          sampleVariables[variable] = '123456';
          break;
        case 'verification_url':
          sampleVariables[variable] = 'https://example.com/verify/token123';
          break;
        case 'support_email':
          sampleVariables[variable] = getSupportEmail();
          break;
        default:
          sampleVariables[variable] = `sample_${variable}`;
      }
    });
    
    setPreviewVariables(sampleVariables);
    setIsPreviewDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const extractVariablesFromContent = (content: string): string[] => {
    const variablePattern = /{{\\s*([^}]+)\\s*}}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1].trim());
    }
    
    return Array.from(variables);
  };

  const handleContentChange = (field: 'subject' | 'htmlContent' | 'textContent', value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-extract variables from all content fields
      const allContent = `${updated.subject} ${updated.htmlContent} ${updated.textContent}`;
      const extractedVars = extractVariablesFromContent(allContent);
      
      return {
        ...updated,
        variables: extractedVars
      };
    });
  };

  const getAvailableVariables = (templateType: string) => {
    const commonVars = commonVariables?.variables || COMMON_VARIABLES;
    const typeSpecificVars = TEMPLATE_VARIABLES[templateType] || [];
    return [...commonVars, ...typeSpecificVars];
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto px-4 py-6">
          <Alert variant="destructive">
            <AlertDescription>Failed to load email templates. Please try again.</AlertDescription>
          </Alert>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground">
              Create and manage email templates for automated communications
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>
                  Create a new email template for automated communications
                </DialogDescription>
              </DialogHeader>
              
              <EmailTemplateForm
                formData={formData}
                setFormData={setFormData}
                onContentChange={handleContentChange}
                availableVariables={getAvailableVariables(formData.type)}
                isLoading={createMutation.isPending}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setIsCreateDialogOpen(false);
                  resetForm();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {template.name}
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {EMAIL_TEMPLATE_TYPES.find(t => t.value === template.type)?.label || template.type}
                      </CardDescription>
                    </div>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
                      <p className="text-sm truncate">{template.subject}</p>
                    </div>
                    
                    {template.variables.length > 0 && (
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Variables</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.variables.slice(0, 3).map((variable) => (
                            <Badge key={variable} variant="outline" className="text-xs">
                              {variable}
                            </Badge>
                          ))}
                          {template.variables.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.variables.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openPreviewDialog(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(template)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleMutation.mutate(template.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {template.isActive ? 
                            <ToggleRight className="h-4 w-4 text-green-600" /> : 
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          }
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this template?')) {
                              deleteMutation.mutate(template.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>
                Modify the email template settings and content
              </DialogDescription>
            </DialogHeader>
            
            <EmailTemplateForm
              formData={formData}
              setFormData={setFormData}
              onContentChange={handleContentChange}
              availableVariables={getAvailableVariables(formData.type)}
              isLoading={updateMutation.isPending}
              onSubmit={handleSubmit}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setEditingTemplate(null);
                resetForm();
              }}
              isEditing
            />
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preview Email Template</DialogTitle>
              <DialogDescription>
                Preview how the email will look with sample variables
              </DialogDescription>
            </DialogHeader>
            
            {editingTemplate && (
              <EmailTemplatePreview
                template={editingTemplate}
                variables={previewVariables}
                setVariables={setPreviewVariables}
                onPreview={(vars) => previewMutation.mutate({ id: editingTemplate.id, variables: vars })}
                previewData={previewMutation.data}
                isLoading={previewMutation.isPending}
                error={previewMutation.error}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Email Template Variables
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Common Variables (available in all templates):</h4>
                <div className="flex flex-wrap gap-2">
                  {COMMON_VARIABLES.map((variable) => (
                    <Badge key={variable} variant="outline">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Template-specific Variables:</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(TEMPLATE_VARIABLES).map(([type, variables]) => (
                    <div key={type}>
                      <h5 className="text-sm font-medium text-muted-foreground mb-1">
                        {EMAIL_TEMPLATE_TYPES.find(t => t.value === type)?.label || type}:
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {variables.map((variable) => (
                          <Badge key={variable} variant="outline" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

// Email Template Form Component
interface EmailTemplateFormProps {
  formData: NewEmailTemplate;
  setFormData: (data: NewEmailTemplate) => void;
  onContentChange: (field: 'subject' | 'htmlContent' | 'textContent', value: string) => void;
  availableVariables: string[];
  isLoading: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  isEditing?: boolean;
}

function EmailTemplateForm({
  formData,
  setFormData,
  onContentChange,
  availableVariables,
  isLoading,
  onSubmit,
  onCancel,
  isEditing = false
}: EmailTemplateFormProps) {
  const insertVariable = (field: 'subject' | 'htmlContent' | 'textContent', variable: string) => {
    const currentValue = formData[field];
    const newValue = currentValue + `{{${variable}}}`;
    onContentChange(field, newValue);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Template Name*</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter template name"
          />
        </div>
        <div>
          <Label htmlFor="type">Template Type*</Label>
          <Select
            value={formData.type}
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template type" />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_TEMPLATE_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the template"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="subject">Email Subject*</Label>
          <div className="flex gap-1">
            {availableVariables.slice(0, 5).map((variable) => (
              <Button
                key={variable}
                variant="outline"
                size="sm"
                onClick={() => insertVariable('subject', variable)}
                className="text-xs"
              >
                {variable}
              </Button>
            ))}
          </div>
        </div>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => onContentChange('subject', e.target.value)}
          placeholder="Enter email subject"
        />
      </div>

      <Tabs defaultValue="html" className="w-full">
        <TabsList>
          <TabsTrigger value="html">HTML Content</TabsTrigger>
          <TabsTrigger value="text">Text Content</TabsTrigger>
          <TabsTrigger value="variables">Variables</TabsTrigger>
        </TabsList>
        
        <TabsContent value="html" className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>HTML Content*</Label>
            <div className="flex gap-1">
              {availableVariables.slice(0, 5).map((variable) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('htmlContent', variable)}
                  className="text-xs"
                >
                  {variable}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            value={formData.htmlContent}
            onChange={(e) => onContentChange('htmlContent', e.target.value)}
            placeholder="Enter HTML email content"
            rows={12}
            className="font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="text" className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Text Content (optional)</Label>
            <div className="flex gap-1">
              {availableVariables.slice(0, 5).map((variable) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('textContent', variable)}
                  className="text-xs"
                >
                  {variable}
                </Button>
              ))}
            </div>
          </div>
          <Textarea
            value={formData.textContent}
            onChange={(e) => onContentChange('textContent', e.target.value)}
            placeholder="Enter plain text email content"
            rows={12}
            className="font-mono text-sm"
          />
        </TabsContent>
        
        <TabsContent value="variables" className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Available Variables</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Click to insert into your template content
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {availableVariables.map((variable) => (
                <Button
                  key={variable}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Copy to clipboard
                    navigator.clipboard.writeText(`{{${variable}}}`);
                  }}
                  className="justify-start text-xs"
                >
                  <Copy className="mr-1 h-3 w-3" />
                  {variable}
                </Button>
              ))}
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium">Detected Variables</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Variables automatically detected in your template
            </p>
            <div className="flex flex-wrap gap-2">
              {formData.variables.map((variable) => (
                <Badge key={variable} variant="default">
                  {variable}
                </Badge>
              ))}
              {formData.variables.length === 0 && (
                <p className="text-sm text-muted-foreground">No variables detected</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex items-center space-x-2">
        <Switch
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
        />
        <Label htmlFor="isActive">Template is active</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
        </Button>
      </div>
    </div>
  );
}

// Email Template Preview Component
interface EmailTemplatePreviewProps {
  template: EmailTemplate;
  variables: Record<string, string>;
  setVariables: (variables: Record<string, string>) => void;
  onPreview: (variables: Record<string, string>) => void;
  previewData?: any;
  isLoading: boolean;
  error?: any;
}

function EmailTemplatePreview({
  template,
  variables,
  setVariables,
  onPreview,
  previewData,
  isLoading,
  error
}: EmailTemplatePreviewProps) {
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  useEffect(() => {
    // Auto-preview when variables change (with debouncing)
    const timer = setTimeout(() => {
      console.log('Triggering preview for template:', template.id);
      onPreview(variables);
      setHasInitialLoad(true);
    }, hasInitialLoad ? 500 : 100); // Faster initial load, slower updates
    
    return () => clearTimeout(timer);
  }, [variables, template.id]); // Removed onPreview from dependencies to avoid infinite loops

  return (
    <div className="space-y-6">
      {/* Variable Inputs */}
      <div>
        <Label className="text-sm font-medium mb-3 block">Preview Variables</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-40 overflow-y-auto">
          {Object.entries(variables).map(([key, value]) => (
            <div key={key}>
              <Label htmlFor={`var-${key}`} className="text-xs">
                {key}
              </Label>
              <Input
                id={`var-${key}`}
                value={value}
                onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                placeholder={`Enter ${key}`}
                className="text-sm"
              />
            </div>
          ))}
        </div>
      </div>

              {/* Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <Label className="font-medium">Email Preview</Label>
            {isLoading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                Preview Error: {error.message || 'Failed to preview template'}
              </AlertDescription>
            </Alert>
          )}
          
          {previewData && !error && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium text-muted-foreground">Subject</Label>
              <div className="border rounded p-3 bg-gray-50">
                <p className="text-sm">{previewData.subject}</p>
              </div>
            </div>
            
            <Tabs defaultValue="html">
              <TabsList>
                <TabsTrigger value="html">HTML Preview</TabsTrigger>
                <TabsTrigger value="text">Text Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="html">
                <div className="border rounded">
                  <div className="bg-gray-50 p-2 border-b">
                    <Label className="text-xs font-medium text-muted-foreground">HTML Content</Label>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <div 
                      dangerouslySetInnerHTML={{ __html: previewData.htmlContent }}
                      className="prose prose-sm max-w-none"
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="text">
                <div className="border rounded">
                  <div className="bg-gray-50 p-2 border-b">
                    <Label className="text-xs font-medium text-muted-foreground">Text Content</Label>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {previewData.textContent || 'No text content available'}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}