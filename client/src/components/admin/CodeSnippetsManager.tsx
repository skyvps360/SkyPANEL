import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  Plus,
  Edit,
  Trash2,
  Code,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";

interface CodeSnippet {
  id: number;
  name: string;
  code: string;
  displayLocation: string;
  customUrl?: string;
  isActive: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

const codeSnippetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  displayLocation: z.string().min(1, "Display location is required"),
  customUrl: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CodeSnippetFormData = z.infer<typeof codeSnippetSchema>;

const displayLocations = [
  { value: "header", label: "Header" },
  { value: "footer", label: "Footer" },
  { value: "sidebar", label: "Sidebar" },
  { value: "custom", label: "Custom" },
];

export default function CodeSnippetsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showCustomUrlInput, setShowCustomUrlInput] = useState(false);

  const form = useForm<CodeSnippetFormData>({
    resolver: zodResolver(codeSnippetSchema),
    defaultValues: {
      name: "",
      code: "",
      displayLocation: "header",
      customUrl: "",
      description: "",
      isActive: true,
    },
  });

  // Fetch available routes for custom URL selection
  const { data: availableRoutes = [] } = useQuery<Array<{ value: string; label: string }>>({
    queryKey: ["/api/admin/code-snippets/available-routes"],
  });

  // Fetch code snippets
  const { data: snippets = [], isLoading } = useQuery<CodeSnippet[]>({
    queryKey: ["/api/admin/code-snippets"],
  });

  // Create/Update mutation
  const createUpdateMutation = useMutation({
    mutationFn: async (data: CodeSnippetFormData) => {
      if (editingSnippet) {
        return apiRequest(`/api/admin/code-snippets/${editingSnippet.id}`, {
          method: "PUT",
          body: data,
        });
      } else {
        return apiRequest("/api/admin/code-snippets", {
          method: "POST",
          body: data,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/code-snippets"] });
      toast({
        title: editingSnippet ? "Snippet updated" : "Snippet created",
        description: editingSnippet
          ? "Code snippet has been updated successfully"
          : "Code snippet has been created successfully",
      });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save snippet",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/code-snippets/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/code-snippets"] });
      toast({
        title: "Snippet deleted",
        description: "Code snippet has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete snippet",
        variant: "destructive",
      });
    },
  });

  // Toggle active status mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest(`/api/admin/code-snippets/${id}`, {
        method: "PUT",
        body: { isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/code-snippets"] });
      toast({
        title: "Status updated",
        description: "Snippet status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CodeSnippetFormData) => {
    createUpdateMutation.mutate(data);
  };

  const handleEdit = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    form.reset({
      name: snippet.name,
      code: snippet.code,
      displayLocation: snippet.displayLocation,
      customUrl: snippet.customUrl || "",
      description: snippet.description || "",
      isActive: snippet.isActive,
    });
    setShowCustomUrlInput(snippet.displayLocation === "custom");
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleToggleActive = (id: number, isActive: boolean) => {
    toggleActiveMutation.mutate({ id, isActive: !isActive });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingSnippet(null);
    setShowCustomUrlInput(false);
    form.reset({
      name: "",
      code: "",
      displayLocation: "header",
      customUrl: "",
      description: "",
      isActive: true,
    });
  };

  const handleCopyCode = async (code: string, id: number) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: "Code copied",
        description: "Code has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy code",
        variant: "destructive",
      });
    }
  };

  const getLocationBadgeColor = (location: string) => {
    switch (location) {
      case "header":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
      case "footer":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "sidebar":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300";
      case "custom":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Code Snippets</h2>
          <p className="text-muted-foreground">
            Manage custom code snippets that will be injected into your website
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Snippet
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSnippet ? "Edit Code Snippet" : "Add Code Snippet"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Enter snippet name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayLocation">Display Location</Label>
                  <Select
                    value={form.watch("displayLocation")}
                    onValueChange={(value) => {
                      form.setValue("displayLocation", value);
                      if (value === "custom") {
                        setShowCustomUrlInput(true);
                      } else {
                        setShowCustomUrlInput(false);
                        form.setValue("customUrl", "");
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayLocations.map((location) => (
                        <SelectItem key={location.value} value={location.value}>
                          {location.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.displayLocation && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.displayLocation.message}
                    </p>
                  )}
                </div>

                {showCustomUrlInput && (
                  <div className="space-y-2">
                    <Label htmlFor="customUrl">Custom URL</Label>
                    <div className="space-y-2">
                      <Input
                        id="customUrl"
                        {...form.register("customUrl")}
                        placeholder="Enter custom URL (e.g., /plans, /servers)"
                      />
                      <div className="text-sm text-muted-foreground">
                        <p className="mb-2">Or select from available routes:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {availableRoutes.slice(0, 10).map((route) => (
                            <Button
                              key={route.value}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => form.setValue("customUrl", route.value)}
                              className="text-xs"
                            >
                              {route.label}
                            </Button>
                          ))}
                        </div>
                        {availableRoutes.length > 10 && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-xs text-blue-500">
                              Show more routes ({availableRoutes.length - 10})
                            </summary>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              {availableRoutes.slice(10).map((route) => (
                                <Button
                                  key={route.value}
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => form.setValue("customUrl", route.value)}
                                  className="text-xs"
                                >
                                  {route.label}
                                </Button>
                              ))}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                    {form.formState.errors.customUrl && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.customUrl.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Textarea
                  id="code"
                  {...form.register("code")}
                  placeholder="Enter your HTML, CSS, or JavaScript code"
                  rows={8}
                  className="font-mono text-sm"
                />
                {form.formState.errors.code && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.code.message}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUpdateMutation.isPending}>
                  {createUpdateMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : editingSnippet ? (
                    "Update Snippet"
                  ) : (
                    "Create Snippet"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Snippets List */}
      <div className="grid gap-4">
        {snippets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center p-8">
              <Code className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No code snippets</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first code snippet
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Snippet
              </Button>
            </CardContent>
          </Card>
        ) : (
          snippets.map((snippet) => (
            <Card key={snippet.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div>
                      <CardTitle className="text-lg">{snippet.name}</CardTitle>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge className={getLocationBadgeColor(snippet.displayLocation)}>
                          {snippet.displayLocation}
                        </Badge>
                        {snippet.displayLocation === "custom" && snippet.customUrl && (
                          <Badge variant="outline" className="text-xs">
                            {snippet.customUrl}
                          </Badge>
                        )}
                        <Badge variant={snippet.isActive ? "default" : "secondary"}>
                          {snippet.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(snippet.id, snippet.isActive)}
                      disabled={toggleActiveMutation.isPending}
                    >
                      {snippet.isActive ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyCode(snippet.code, snippet.id)}
                    >
                      {copiedId === snippet.id ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(snippet)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Snippet</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{snippet.name}"? This action
                            cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(snippet.id)}
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
                {snippet.description && (
                  <p className="text-muted-foreground mb-3">{snippet.description}</p>
                )}
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                    {snippet.code}
                  </pre>
                </div>
                <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                  <span>Created: {new Date(snippet.createdAt).toLocaleDateString()}</span>
                  <span>Updated: {new Date(snippet.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
} 