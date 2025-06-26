import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import "@/styles/markdown.css";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getBrandColors } from "@/lib/brand-theme";
import { DataTable } from "@/components/ui/data-table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Save,
  Loader2,
  Plus,
  PencilLine,
  Trash2,
  Eye,
  EyeOff,
  FolderTree,
  Folder,
  Search
} from "lucide-react";
import { format } from "date-fns";

// Define the Doc Category type
interface DocCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

// Define the Doc type
interface Doc {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  categoryId: number | null;
  displayOrder: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
  updatedBy: number;
}

// Form schema for creating/editing docs
const docSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  slug: z.string().min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
  content: z.string().min(1, { message: "Content is required" }),
  categoryId: z.coerce.number().nullable().optional(),
  displayOrder: z.coerce.number().int().default(0),
  published: z.boolean().default(false),
});

// Category form schema
const categorySchema = z.object({
  name: z.string().min(1, { message: "Category name is required" }),
  slug: z.string().min(1, { message: "Slug is required" })
    .regex(/^[a-z0-9-]+$/, {
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    }),
  description: z.string().optional(),
  displayOrder: z.coerce.number().int().default(0),
});

type DocFormData = z.infer<typeof docSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;

export default function DocsPage() {
  const { toast } = useToast();
  const [selectedDoc, setSelectedDoc] = useState<Doc | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Doc | null>(null);
  const [activeTab, setActiveTab] = useState<string>("documents");
  const [editorContent, setEditorContent] = useState<string>("");
  const [editorTheme, setEditorTheme] = useState<string>(
    document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  );
  const [editorTab, setEditorTab] = useState<string>("write");
  const editorRef = useRef<any>(null);
  
  // Category state
  const [selectedCategory, setSelectedCategory] = useState<DocCategory | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<DocCategory | null>(null);
  const [categoryDescriptionContent, setCategoryDescriptionContent] = useState<string>("");
  const categoryEditorRef = useRef<any>(null);
  
  // Function to handle editor mounting
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };
  
  // Function to handle category editor mounting
  const handleCategoryEditorDidMount = (editor: any) => {
    categoryEditorRef.current = editor;
  };
  
  // Function to insert text at cursor position
  const insertTextAtCursor = (textToInsert: string) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };      
      const op = { identifier: id, range: selection, text: textToInsert, forceMoveMarkers: true };
      editor.executeEdits("my-source", [op]);
      
      // Update the form with the new editor value
      const updatedContent = editor.getValue();
      setEditorContent(updatedContent);
      form.setValue("content", updatedContent, { shouldValidate: true });
      
      editor.focus();
    } else {
      // Fallback if editor ref isn't available
      setEditorContent((prev) => prev + textToInsert);
      form.setValue("content", editorContent + textToInsert, { shouldValidate: true });
    }
  };
  
  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDarkMode = document.documentElement.classList.contains('dark');
          setEditorTheme(isDarkMode ? 'vs-dark' : 'light');
        }
      });
    });
    
    observer.observe(document.documentElement, { attributes: true });
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
  // Fetch brand colors from settings
  const { data: brandingData } = useQuery<{
    primary_color?: string;
    secondary_color?: string;
    company_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
  });
  
  // Set up brand colors
  const brandColorOptions = {
    primaryColor: brandingData?.primary_color || brandingData?.company_color,
    secondaryColor: brandingData?.secondary_color,
  };
  const brandColors = getBrandColors(brandColorOptions);
  
  // Fetch all docs
  const { data: docs = [], isLoading, refetch } = useQuery<Doc[]>({
    queryKey: ["/api/admin/docs"],
    refetchOnMount: true, // Ensure the data is always fresh when the component mounts
  });
  
  // Fetch all categories
  const { data: categories = [], isLoading: isCategoriesLoading, refetch: refetchCategories } = useQuery<DocCategory[]>({
    queryKey: ["/api/admin/doc-categories"],
    initialData: [], // Ensure we always have an empty array initially
    refetchOnMount: true, // Ensure the data is always fresh when the component mounts
  });
  
  // Form for creating/editing docs
  const form = useForm<DocFormData>({
    resolver: zodResolver(docSchema),
    defaultValues: {
      title: "",
      slug: "",
      content: "",
      categoryId: null,
      displayOrder: 0,
      published: false,
    },
  });
  
  // State to track the selected category for the document form
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  
  // Form for creating/editing categories
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      displayOrder: 0,
    },
  });
  
  // Generate category slug from name
  const generateCategorySlug = () => {
    const name = categoryForm.getValues("name");
    if (name) {
      const slug = name
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      categoryForm.setValue("slug", slug);
    }
  };
  
  // Update form values when selected doc changes
  useEffect(() => {
    if (selectedDoc) {
      form.reset({
        title: selectedDoc.title,
        slug: selectedDoc.slug,
        content: selectedDoc.content,
        categoryId: selectedDoc.categoryId,
        displayOrder: selectedDoc.displayOrder,
        published: selectedDoc.published,
      });
      
      // Set the editor content
      setEditorContent(selectedDoc.content);
      
      // Set the selected category ID for the dropdown
      setSelectedCategoryId(selectedDoc.categoryId ? String(selectedDoc.categoryId) : "null");
    } else {
      form.reset({
        title: "",
        slug: "",
        content: "",
        categoryId: null,
        displayOrder: 0,
        published: false,
      });
      
      // Reset the editor content
      setEditorContent("");
      
      // Reset the selected category ID
      setSelectedCategoryId("null");
    }
  }, [selectedDoc, form]);
  
  // Update form values when selected category changes
  useEffect(() => {
    if (selectedCategory) {
      categoryForm.reset({
        name: selectedCategory.name,
        slug: selectedCategory.slug,
        description: selectedCategory.description,
        displayOrder: selectedCategory.displayOrder,
      });
      
      // Set the category description editor content
      setCategoryDescriptionContent(selectedCategory.description || "");
    } else {
      categoryForm.reset({
        name: "",
        slug: "",
        description: "",
        displayOrder: 0,
      });
      
      // Reset the category description editor content
      setCategoryDescriptionContent("");
    }
  }, [selectedCategory, categoryForm]);
  
  // Automatically generate category slug when name changes
  useEffect(() => {
    const nameSubscription = categoryForm.watch((value, { name }) => {
      if (name === "name" && !selectedCategory) {
        generateCategorySlug();
      }
    });
    
    return () => nameSubscription.unsubscribe();
  }, [categoryForm, selectedCategory]);
  
  // Create doc mutation
  const createDocMutation = useMutation({
    mutationFn: async (data: DocFormData) => {
      return apiRequest("/api/admin/docs", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Doc created",
        description: "Documentation page has been created successfully",
      });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating doc",
        description: error.message || "Failed to create documentation page",
        variant: "destructive",
      });
    },
  });
  
  // Update doc mutation
  const updateDocMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: DocFormData }) => {
      return apiRequest(`/api/admin/docs/${id}`, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Doc updated",
        description: "Documentation page has been updated successfully",
      });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating doc",
        description: error.message || "Failed to update documentation page",
        variant: "destructive",
      });
    },
  });
  
  // Delete doc mutation
  const deleteDocMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/docs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Doc deleted",
        description: "Documentation page has been deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting doc",
        description: error.message || "Failed to delete documentation page",
        variant: "destructive",
      });
    },
  });
  
  // Toggle doc published status mutation
  const togglePublishedMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      return apiRequest(`/api/admin/docs/${id}`, {
        method: "PATCH",
        body: { published },
      });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Document publish status has been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update document status",
        variant: "destructive",
      });
    },
  });
  
  // Open form for creating a new doc
  const handleCreateDoc = () => {
    setSelectedDoc(null);
    setIsFormOpen(true);
  };
  
  // Open form for editing a doc
  const handleEditDoc = (doc: Doc) => {
    setSelectedDoc(doc);
    setIsFormOpen(true);
  };
  
  // Handle form submission
  const onSubmit = async (data: DocFormData) => {
    // Make sure categoryId is properly handled
    const categoryId = selectedCategoryId === "null" ? null : selectedCategoryId ? parseInt(selectedCategoryId) : null;
    
    const submissionData = {
      ...data,
      categoryId // Explicit assignment to make sure it's included
    };

    
    try {
      if (selectedDoc) {
        // Update existing doc
        await updateDocMutation.mutateAsync({ id: selectedDoc.id, data: submissionData });
      } else {
        // Create new doc
        await createDocMutation.mutateAsync(submissionData);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };
  
  // Handle doc deletion
  const handleDeleteDoc = async () => {
    if (docToDelete) {
      await deleteDocMutation.mutateAsync(docToDelete.id);
    }
  };
  
  // Handle toggling published status
  const handleTogglePublished = async (doc: Doc) => {
    await togglePublishedMutation.mutateAsync({
      id: doc.id,
      published: !doc.published,
    });
  };
  
  // Generate a slug from the title
  const generateSlug = () => {
    const title = form.getValues("title");
    if (title) {
      const slug = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-");
      form.setValue("slug", slug);
    }
  };
  
  // Automatically generate slug when title changes
  useEffect(() => {
    const titleSubscription = form.watch((value, { name }) => {
      if (name === "title" && !selectedDoc) {
        generateSlug();
      }
    });
    
    return () => titleSubscription.unsubscribe();
  }, [form, selectedDoc]);
  
  // Make sure we refetch data when tab changes to documents
  useEffect(() => {
    if (activeTab === "documents") {
      refetch();
      refetchCategories();
    }
  }, [activeTab, refetch, refetchCategories]);
  
  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return apiRequest("/api/admin/doc-categories", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "Documentation category has been created successfully",
      });
      setIsCategoryFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/doc-categories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating category",
        description: error.message || "Failed to create documentation category",
        variant: "destructive",
      });
    },
  });
  
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      return apiRequest(`/api/admin/doc-categories/${id}`, {
        method: "PATCH",
        body: data,
      });
    },
    onSuccess: () => {
      toast({
        title: "Category updated",
        description: "Documentation category has been updated successfully",
      });
      setIsCategoryFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/doc-categories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating category",
        description: error.message || "Failed to update documentation category",
        variant: "destructive",
      });
    },
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/doc-categories/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Documentation category has been deleted successfully",
      });
      setIsDeleteCategoryDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/doc-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/docs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting category",
        description: error.message || "Failed to delete documentation category",
        variant: "destructive",
      });
    },
  });
  
  // Category handlers
  const handleCreateCategory = () => {
    setSelectedCategory(null);
    setIsCategoryFormOpen(true);
  };
  
  const handleEditCategory = (category: DocCategory) => {
    setSelectedCategory(category);
    setIsCategoryFormOpen(true);
  };
  
  const onCategorySubmit = async (data: CategoryFormData) => {
    if (selectedCategory) {
      await updateCategoryMutation.mutateAsync({ id: selectedCategory.id, data });
    } else {
      await createCategoryMutation.mutateAsync(data);
    }
  };
  
  const handleDeleteCategory = async () => {
    if (categoryToDelete) {
      await deleteCategoryMutation.mutateAsync(categoryToDelete.id);
    }
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Documentation Management</h1>
            <p className="text-muted-foreground mt-1">
              Manage categories for organizing your documentation
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>
          
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Documentation Pages</CardTitle>
                <CardDescription>
                  Manage documentation pages that will appear on your site
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : docs.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-gray-500">No documentation pages found.</p>
                    <Button 
                      onClick={handleCreateDoc} 
                      className="mt-4 text-white hover:text-white"
                      style={{
                        backgroundColor: `#${brandColors.primary?.hex}`,
                        borderColor: `#${brandColors.primary?.hex}`
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Doc
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div></div>
                      <Button
                        onClick={handleCreateDoc}
                        className="text-white hover:text-white"
                        style={{
                          backgroundColor: `#${brandColors.primary?.hex}`,
                          borderColor: `#${brandColors.primary?.hex}`
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New Document
                      </Button>
                    </div>
                    
                    <DataTable
                      data={docs}
                      searchKey="title"
                      columns={[
                        {
                          header: "Title",
                          accessorKey: "title",
                          cell: (doc) => (
                            <div className="font-medium">{doc.title}</div>
                          ),
                        },
                        {
                          header: "Slug",
                          accessorKey: "slug",
                          hidden: true,
                        },
                        {
                          header: "Category",
                          id: "category",
                          cell: (doc) => (
                            <div>
                              {doc.categoryId && categories.length > 0
                                ? (categories.find(c => c.id === doc.categoryId)?.name || "-")
                                : (doc.category || "-")}
                            </div>
                          ),
                          hidden: true,
                        },
                        {
                          header: "Order",
                          accessorKey: "displayOrder",
                          hidden: true,
                        },
                        {
                          header: "Status",
                          id: "published",
                          cell: (doc) => (
                            <div className="flex items-center">
                              {doc.published ? (
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                  <span>Published</span>
                                </div>
                              ) : (
                                <div className="flex items-center">
                                  <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
                                  <span>Draft</span>
                                </div>
                              )}
                            </div>
                          ),
                        },
                        {
                          header: "Updated",
                          id: "updatedAt",
                          cell: (doc) => (
                            <div>
                              {doc.updatedAt ? format(new Date(doc.updatedAt), 'MMM d, yyyy') : '-'}
                            </div>
                          ),
                          hidden: true,
                        },
                      ]}
                      actions={(doc) => (
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleTogglePublished(doc)}
                            title={doc.published ? "Unpublish" : "Publish"}
                          >
                            {doc.published ? (
                              <EyeOff className="h-4 w-4" style={{ color: `#${brandColors.primary?.hex}` }} />
                            ) : (
                              <Eye className="h-4 w-4" style={{ color: `#${brandColors.primary?.hex}` }} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditDoc(doc)}
                          >
                            <PencilLine className="h-4 w-4" style={{ color: `#${brandColors.primary?.hex}` }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setDocToDelete(doc);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: `#${brandColors.primary?.hex}` }} />
                          </Button>
                        </div>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Document Categories</CardTitle>
                <CardDescription>
                  Manage categories for organizing your documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isCategoriesLoading ? (
                  <div className="flex justify-center items-center p-4">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : categories.length === 0 ? (
                  <div className="text-center p-4">
                    <p className="text-gray-500">No categories found.</p>
                    <Button 
                      onClick={handleCreateCategory} 
                      className="mt-4 text-white hover:text-white"
                      style={{
                        backgroundColor: `#${brandColors.secondary?.hex}`,
                        borderColor: `#${brandColors.secondary?.hex}`
                      }}
                    >
                      <FolderTree className="mr-2 h-4 w-4" />
                      Create Your First Category
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div></div>
                      <Button
                        onClick={handleCreateCategory}
                        className="text-white hover:text-white"
                        style={{
                          backgroundColor: `#${brandColors.secondary?.hex}`,
                          borderColor: `#${brandColors.secondary?.hex}`
                        }}
                      >
                        <FolderTree className="mr-2 h-4 w-4" />
                        New Category
                      </Button>
                    </div>
                    
                    <DataTable
                      data={categories}
                      searchKey="name"
                      columns={[
                        {
                          header: "Name",
                          accessorKey: "name",
                          cell: (category) => (
                            <div className="font-medium">{category.name}</div>
                          ),
                        },
                        {
                          header: "Slug",
                          accessorKey: "slug",
                          hidden: true,
                        },
                        {
                          header: "Description",
                          accessorKey: "description",
                          cell: (category) => (
                            <div>{category.description || "-"}</div>
                          ),
                          hidden: true,
                        },
                        {
                          header: "Order",
                          accessorKey: "displayOrder",
                          hidden: true,
                        },
                        {
                          header: "Updated",
                          id: "updatedAt",
                          cell: (category) => (
                            <div>
                              {category.updatedAt ? format(new Date(category.updatedAt), 'MMM d, yyyy') : '-'}
                            </div>
                          ),
                        },
                      ]}
                      actions={(category) => (
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditCategory(category)}
                          >
                            <PencilLine className="h-4 w-4" style={{ color: `#${brandColors.secondary?.hex}` }} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setCategoryToDelete(category);
                              setIsDeleteCategoryDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" style={{ color: `#${brandColors.secondary?.hex}` }} />
                          </Button>
                        </div>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Doc Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-auto max-h-[90vh] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0">
            <DialogTitle className="text-xl font-bold flex items-center">
              <FileText className="h-5 w-5 mr-2" style={{ color: `#${brandColors.primary?.hex}` }} />
              {selectedDoc ? "Edit Documentation Page" : "Create Documentation Page"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedDoc
                ? "Update the details of this documentation page to improve your site's content"
                : "Create a new documentation page to enhance your knowledge base"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="px-5 py-3 overflow-y-auto">
            <div className="grid gap-4">
              {/* Basic Details Section */}
              <div className="p-3 rounded-lg" 
                style={{ 
                  borderColor: `#${brandColors.primary?.lighter}`,
                  backgroundColor: `#${brandColors.primary?.extraLight}`,
                  border: '1px solid'
                }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center"
                    style={{ color: `#${brandColors.primary?.hex}` }}>
                  <FileText className="h-4 w-4 mr-1.5" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-sm font-medium flex items-center">
                      Title <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="title"
                      {...form.register("title")}
                      placeholder="Enter document title"
                      className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                    />
                    {form.formState.errors.title && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        {form.formState.errors.title.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="slug" className="text-sm font-medium flex items-center">
                        URL Slug <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      {!selectedDoc && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateSlug}
                          className="h-7 px-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/20"
                          style={{ color: `#${brandColors.primary?.hex}` }}
                        >
                          <span className="mr-1">Auto-generate</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/><path d="M13 17l6-6"/><path d="M22 10V4h-6"/></svg>
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="slug"
                        {...form.register("slug")}
                        placeholder="your-document-slug"
                        readOnly={!!selectedDoc}
                        className={`w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500 pl-8 ${selectedDoc ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </span>
                    </div>
                    {form.formState.errors.slug && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        {form.formState.errors.slug.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Organization Section */}
              <div className="p-3 rounded-lg" 
                style={{ 
                  borderColor: `#${brandColors.primary?.lighter}`,
                  backgroundColor: `#${brandColors.primary?.extraLight}`,
                  border: '1px solid'
                }}>
                <h3 className="text-sm font-semibold mb-2 flex items-center"
                    style={{ color: `#${brandColors.primary?.hex}` }}>
                  <Folder className="h-4 w-4 mr-1.5" />
                  Organization
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="categoryId" className="text-sm font-medium">Category</Label>
                    <Select
                      value={selectedCategoryId || "null"}
                      onValueChange={(value) => {
                        setSelectedCategoryId(value);
                        // Update the form field too
                        form.setValue("categoryId", value === "null" ? null : parseInt(value));
                      }}
                    >
                      <SelectTrigger className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500 bg-white dark:bg-gray-900">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null" className="text-gray-500">
                          <span className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                            Uncategorized
                          </span>
                        </SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                              {category.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      Categorizing helps users find related content
                    </p>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label htmlFor="displayOrder" className="text-sm font-medium">Display Order</Label>
                    <Input
                      id="displayOrder"
                      type="number"
                      {...form.register("displayOrder", { valueAsNumber: true })}
                      className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                    />
                    {form.formState.errors.displayOrder && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        {form.formState.errors.displayOrder.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                      Lower numbers appear first in the list
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Content Section */}
              <div className="p-3 rounded-lg" 
                style={{ 
                  borderColor: `#${brandColors.primary?.lighter}`,
                  backgroundColor: `#${brandColors.primary?.extraLight}`,
                  border: '1px solid'
                }}>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold flex items-center"
                    style={{ color: `#${brandColors.primary?.hex}` }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Document Content <span className="text-red-500 ml-0.5">*</span>
                </h3>
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-gray-500">
                      {editorTab === "write" ? "Edit mode" : "Preview mode"}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditorTab(editorTab === "write" ? "preview" : "write")}
                      title={editorTab === "write" ? "Switch to preview" : "Switch to edit"}
                    >
                      {editorTab === "write" ? "Show Preview" : "Edit Content"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center py-2 px-2 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-800">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={editorTab === "write" ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs ${editorTab === "write" ? "text-white" : ""}`}
                        onClick={() => setEditorTab("write")}
                        style={editorTab === "write" ? {
                          backgroundColor: `#${brandColors.primary?.hex}`,
                          borderColor: `#${brandColors.primary?.hex}`
                        } : {}}
                      >
                        Write
                      </Button>
                      <Button
                        type="button"
                        variant={editorTab === "preview" ? "default" : "outline"}
                        size="sm"
                        className={`h-8 text-xs ${editorTab === "preview" ? "text-white" : ""}`}
                        onClick={() => setEditorTab("preview")}
                        style={editorTab === "preview" ? {
                          backgroundColor: `#${brandColors.primary?.hex}`,
                          borderColor: `#${brandColors.primary?.hex}`
                        } : {}}
                      >
                        Preview
                      </Button>
                    </div>
                  </div>
                  
                  {editorTab === "write" && (
                    <>
                      <div className="flex flex-wrap gap-1 py-2 border-x border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2">
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm"
                            className="h-8 w-8 p-0" 
                            onClick={() => {
                              const insertText = "# ";
                              insertTextAtCursor(insertText);
                            }}
                            title="Heading 1"
                          >
                            H1
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const insertText = "## ";
                              insertTextAtCursor(insertText);
                            }}
                            title="Heading 2"
                          >
                            H2
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 font-bold"
                            onClick={() => {
                              const insertText = "**Bold Text**";
                              insertTextAtCursor(insertText);
                            }}
                            title="Bold"
                          >
                            B
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 italic"
                            onClick={() => {
                              const insertText = "*Italic Text*";
                              insertTextAtCursor(insertText);
                            }}
                            title="Italic"
                          >
                            I
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const insertText = "> ";
                              insertTextAtCursor(insertText);
                            }}
                            title="Blockquote"
                          >
                            "
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const insertText = "- ";
                              insertTextAtCursor(insertText);
                            }}
                            title="Unordered List"
                          >
                            •
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={() => {
                              const insertText = "1. ";
                              insertTextAtCursor(insertText);
                            }}
                            title="Ordered List"
                          >
                            1.
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const insertText = "[Link Text](https://example.com)";
                              insertTextAtCursor(insertText);
                            }}
                            title="Link"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const insertText = "![Image Alt](image.jpg)";
                              insertTextAtCursor(insertText);
                            }}
                            title="Image"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const insertText = "`inline code`";
                              insertTextAtCursor(insertText);
                            }}
                            title="Inline Code"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const insertText = "```\nCode block\n```";
                              insertTextAtCursor(insertText);
                            }}
                            title="Code Block"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-8"
                            onClick={() => {
                              const insertText = "---";
                              insertTextAtCursor(insertText);
                            }}
                            title="Horizontal Rule"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                          </Button>
                        </div>
                      </div>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden">
                        <Editor
                          height="320px"
                          defaultLanguage="markdown"
                          value={editorContent}
                          onChange={(value) => {
                            setEditorContent(value || "");
                            form.setValue("content", value || "", { shouldValidate: true });
                          }}
                          theme={editorTheme}
                          options={{
                            minimap: { enabled: false },
                            lineNumbers: 'on',
                            fontSize: 14,
                            wordWrap: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true
                          }}
                          onMount={handleEditorDidMount}
                        />
                      </div>
                    </>
                  )}
                  
                  {editorTab === "preview" && (
                    <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden p-4 min-h-[320px] max-h-[600px] overflow-y-auto bg-white dark:bg-gray-900">
                      {editorContent ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none markdown-dark dark:markdown-light">
                          <ReactMarkdown>
                            {editorContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="text-gray-400 dark:text-gray-600 italic text-center mt-12">
                          No content to preview
                        </div>
                      )}
                    </div>
                  )}
                  {form.formState.errors.content && (
                    <p className="text-xs text-red-500 mt-1 flex items-center">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                      {form.formState.errors.content.message}
                    </p>
                  )}
                  <details className="mt-2 text-xs text-gray-500">
                    <summary className="cursor-pointer font-medium hover:text-gray-700 dark:hover:text-gray-300">
                      Markdown Cheatsheet
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="pb-2 pr-4 font-medium">Element</th>
                            <th className="pb-2 font-medium">Markdown Syntax</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Heading</td>
                            <td className="py-2 font-mono"># H1<br />## H2<br />### H3</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Bold</td>
                            <td className="py-2 font-mono">**bold text**</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Italic</td>
                            <td className="py-2 font-mono">*italicized text*</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Blockquote</td>
                            <td className="py-2 font-mono">&gt; blockquote</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Ordered List</td>
                            <td className="py-2 font-mono">1. First item<br />2. Second item</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Unordered List</td>
                            <td className="py-2 font-mono">- First item<br />- Second item</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Code</td>
                            <td className="py-2 font-mono">`code`</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Code Block</td>
                            <td className="py-2 font-mono">```<br />code block<br />```</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Horizontal Rule</td>
                            <td className="py-2 font-mono">---</td>
                          </tr>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <td className="py-2 pr-4">Link</td>
                            <td className="py-2 font-mono">[title](https://www.example.com)</td>
                          </tr>
                          <tr>
                            <td className="py-2 pr-4">Image</td>
                            <td className="py-2 font-mono">![alt text](image.jpg)</td>
                          </tr>
                        </tbody>
                      </table>
                  </div>
                  </details>
                </div>
              </div>
              
              {/* Publishing Options */}
              <div className="flex items-center justify-between p-3 rounded-lg" 
                style={{ 
                  borderColor: `#${brandColors.primary?.lighter}`,
                  backgroundColor: `#${brandColors.primary?.extraLight}`,
                  border: '1px solid'
                }}>
                <div className="flex items-center space-x-3">
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center 
                    ${form.watch("published") 
                      ? 'text-white' 
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}
                    style={{
                      backgroundColor: form.watch("published") ? `#${brandColors.primary?.hex}` : ''
                    }}
                  >
                    {form.watch("published") ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">
                      {form.watch("published") ? "Published" : "Draft"} 
                    </p>
                    <p className="text-xs text-gray-500">
                      {form.watch("published") ? "Document is visible to users" : "Document is hidden"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="published"
                  checked={form.watch("published")}
                  onCheckedChange={(checked) => form.setValue("published", checked)}
                  style={{
                    backgroundColor: form.watch("published") ? `#${brandColors.primary?.hex}` : ''
                  }}
                />
              </div>
            </div>
            
            <DialogFooter className="mt-5 pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-between sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white hover:text-white"
                style={{
                  backgroundColor: `#${brandColors.primary?.hex}`,
                  borderColor: `#${brandColors.primary?.hex}`
                }}
                disabled={
                  createDocMutation.isPending || updateDocMutation.isPending
                }
              >
                {(createDocMutation.isPending || updateDocMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedDoc ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedDoc ? "Update" : "Create"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md border border-gray-200 dark:border-gray-800 shadow-lg">
          <AlertDialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Delete Document</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-1">
              Are you sure you want to delete{" "}
              {docToDelete && (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  "{docToDelete.title}"
                </span>
              )}?
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone. This document will be permanently removed from the system.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-2">
            <AlertDialogCancel className="mt-2 sm:mt-0 border-gray-300 dark:border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteDoc} 
              disabled={deleteDocMutation.isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              {deleteDocMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Document
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Form Dialog */}
      <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-auto max-h-[90vh] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl">
          <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0">
            <DialogTitle className="text-xl font-bold flex items-center">
              <FolderTree className="h-5 w-5 mr-2" style={{ color: `#${brandColors.secondary?.hex}` }} />
              {selectedCategory ? "Edit Category" : "Create Category"}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {selectedCategory
                ? "Update this category to better organize your documentation"
                : "Create a new category to group related documentation pages"}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="px-5 py-3 overflow-y-auto">
            <div className="grid gap-5">
              {/* Basic Information */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold flex items-center"
                    style={{ color: `#${brandColors.secondary?.hex}` }}>
                  <FolderTree className="h-4 w-4 mr-1.5" />
                  Category Details
                </h3>
                </div>
                
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium flex items-center">
                      Category Name <span className="text-red-500 ml-0.5">*</span>
                    </Label>
                    <Input
                      id="name"
                      {...categoryForm.register("name")}
                      placeholder="Enter category name"
                      className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                    />
                    {categoryForm.formState.errors.name && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        {categoryForm.formState.errors.name.message}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                      Choose a clear, descriptive name for this category
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="categorySlug" className="text-sm font-medium flex items-center">
                        URL Slug <span className="text-red-500 ml-0.5">*</span>
                      </Label>
                      {!selectedCategory && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateCategorySlug}
                          className="h-7 px-2 text-xs hover:bg-gray-50 dark:hover:bg-gray-800/20"
                          style={{ color: `#${brandColors.secondary?.hex}` }}
                        >
                          <span className="mr-1">Auto-generate</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/><path d="M13 17l6-6"/><path d="M22 10V4h-6"/></svg>
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="categorySlug"
                        {...categoryForm.register("slug")}
                        placeholder="category-slug"
                        readOnly={!!selectedCategory}
                        className={`w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500 pl-8 ${selectedCategory ? 'bg-gray-50 dark:bg-gray-800/50' : ''}`}
                      />
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                      </span>
                    </div>
                    {categoryForm.formState.errors.slug && (
                      <p className="text-xs text-red-500 mt-1 flex items-center">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                        {categoryForm.formState.errors.slug.message}
                      </p>
                    )}
                    {!!selectedCategory && (
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                        The slug cannot be changed once created
                      </p>
                    )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-sm font-semibold flex items-center"
                      style={{ color: `#${brandColors.secondary?.hex}` }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Category Description
                  </h3>
                  <div className="text-xs text-gray-500">
                    Supports markdown formatting
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                      <Editor
                        height="180px"
                        defaultLanguage="markdown"
                        value={categoryDescriptionContent}
                        onChange={(value) => {
                          setCategoryDescriptionContent(value || "");
                          categoryForm.setValue("description", value || "", { shouldValidate: true });
                        }}
                        theme={editorTheme}
                        options={{
                          minimap: { enabled: false },
                          lineNumbers: 'off',
                          fontSize: 14,
                          wordWrap: 'on',
                          scrollBeyondLastLine: false,
                          automaticLayout: true,
                          padding: { top: 8, bottom: 8 }
                        }}
                        onMount={handleCategoryEditorDidMount}
                      />
                    </div>
                      {categoryForm.formState.errors.description && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                          {categoryForm.formState.errors.description.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        A short description helps users understand what content to expect
                      </p>
                  </div>
                </div>
                    </div>
                    
              {/* Display Order */}
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold flex items-center"
                      style={{ color: `#${brandColors.secondary?.hex}` }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                    Display Settings
                  </h3>
                </div>
                
                <div className="p-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryDisplayOrder" className="text-sm font-medium">Display Order</Label>
                      <Input
                        id="categoryDisplayOrder"
                        type="number"
                        {...categoryForm.register("displayOrder", { valueAsNumber: true })}
                        className="w-full max-w-[150px] border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                      />
                      {categoryForm.formState.errors.displayOrder && (
                        <p className="text-xs text-red-500 mt-1 flex items-center">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 mr-1.5"></span>
                          {categoryForm.formState.errors.displayOrder.message}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                        Lower numbers appear first in navigation menus
                      </p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between sm:justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCategoryFormOpen(false)}
                className="border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="text-white hover:text-white"
                style={{
                  backgroundColor: `#${brandColors.secondary?.hex}`,
                  borderColor: `#${brandColors.secondary?.hex}`
                }}
                disabled={
                  createCategoryMutation.isPending || updateCategoryMutation.isPending
                }
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedCategory ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {selectedCategory ? "Update" : "Create"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
        <AlertDialogContent className="max-w-md border border-gray-200 dark:border-gray-800 shadow-lg">
          <AlertDialogHeader className="pb-2">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
              <FolderTree className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-xl font-semibold text-center">Delete Category</AlertDialogTitle>
            <AlertDialogDescription className="text-center pt-1">
              Are you sure you want to delete{" "}
              {categoryToDelete && (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  "{categoryToDelete.name}"
                </span>
              )}?
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Any documents assigned to this category will be uncategorized.
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-center gap-2 pt-2">
            <AlertDialogCancel className="mt-2 sm:mt-0 border-gray-300 dark:border-gray-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCategory} 
              disabled={deleteCategoryMutation.isPending}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white"
            >
              {deleteCategoryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Category
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}