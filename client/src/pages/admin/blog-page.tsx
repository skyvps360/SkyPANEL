import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";
import {
  FileText,
  Save,
  Loader2,
  Plus,
  PencilLine,
  Trash2,
  Eye,
  EyeOff,
  FolderTree
} from "lucide-react";
import { format } from "date-fns";

// Type definitions
interface BlogCategory {
  id: number;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  snippet: string;
  excerpt?: string | null;
  featuredImageUrl?: string | null;
  author?: string | null;
  date: Date | string;
  categoryId?: number | null;
  categoryName?: string | null;
  tags?: string | null;
  displayOrder: number;
  published: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Form schemas
const blogPostSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.string().min(1, "Content is required"),
  snippet: z.string().min(1, "Snippet is required"),
  excerpt: z.string().nullable(),
  featuredImageUrl: z.string().nullable(),
  author: z.string().nullable(),
  date: z.date(),
  categoryId: z.number().nullable(),
  tags: z.string().nullable(),
  displayOrder: z.number().default(0),
  published: z.boolean().default(false)
});

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  description: z.string().optional(),
  displayOrder: z.number().default(0),
  active: z.boolean().default(true)
});

type BlogPostFormData = z.infer<typeof blogPostSchema>;
type CategoryFormData = z.infer<typeof categorySchema>;

export default function BlogPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("posts");
  
  // Brand colors
  const [brandColors, setBrandColors] = useState<any>({
    primary: { hex: '33be00', full: '#33be00' },
    secondary: { hex: 'f59e0b', full: '#f59e0b' }
  });
  
  // State for dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(null);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  
  // Forms
  const form = useForm<BlogPostFormData>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: "", slug: "", content: "", snippet: "", excerpt: null,
      featuredImageUrl: null, author: null, date: new Date(),
      categoryId: null, tags: null, displayOrder: 0, published: false
    }
  });
  
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "", slug: "", description: "", displayOrder: 0, active: true
    }
  });
  
  // Data fetching
  const { data: posts = [], isLoading: isLoadingPosts } = useQuery<BlogPost[]>({
    queryKey: ["/api/admin/blog"],
    refetchOnMount: true
  });
  
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery<BlogCategory[]>({
    queryKey: ["/api/admin/blog-categories"],
    initialData: [],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchInterval: 3000 // Refetch every 3 seconds to ensure data is always current
  });
  
  // Effect to fetch brand colors
  useEffect(() => {
    async function fetchBrandColors() {
      try {
        const response = await queryClient.fetchQuery({ 
          queryKey: ['/api/settings/branding', { t: new Date().getTime() }] 
        });
        
        const primaryColor = response && typeof response === 'object' && 'primary_color' in response
          ? response.primary_color as string : '33be00';
        const secondaryColor = response && typeof response === 'object' && 'secondary_color' in response
          ? response.secondary_color as string : 'f59e0b';
          
        const colors = await getBrandColors({
          primaryColor, secondaryColor
        });
        
        setBrandColors(colors);
      } catch (error) {
        console.error('Failed to fetch brand colors:', error);
        const colors = await getBrandColors('33be00');
        setBrandColors(colors);
      }
    }
    fetchBrandColors();
  }, [queryClient]);
  
  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: BlogPostFormData) => {
      console.log("Creating blog post with data:", data); // Debugging
      return apiRequest("/api/admin/blog", { method: "POST", data });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog post created successfully" });
      setIsFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error creating blog post:", error); // Debugging
      toast({
        title: "Error creating blog post",
        description: error.message || "Failed to create blog post",
        variant: "destructive",
      });
    }
  });
  
  const updatePostMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BlogPostFormData }) => {
      return apiRequest(`/api/admin/blog/${id}`, { method: "PATCH", data });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog post updated successfully" });
      setIsFormOpen(false);
      setSelectedPost(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating blog post",
        description: error.message || "Failed to update blog post",
        variant: "destructive",
      });
    }
  });
  
  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/blog/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog post deleted successfully" });
      setIsDeleteDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting blog post",
        description: error.message || "Failed to delete blog post",
        variant: "destructive",
      });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      return apiRequest("/api/admin/blog-categories", { method: "POST", data });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog category created successfully" });
      setIsCategoryFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-categories"] });
      categoryForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error creating category",
        description: error.message || "Failed to create blog category",
        variant: "destructive",
      });
    }
  });
  
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormData }) => {
      return apiRequest(`/api/admin/blog-categories/${id}`, { method: "PATCH", data });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog category updated successfully" });
      setIsCategoryFormOpen(false);
      setSelectedCategory(null);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-categories"] });
      categoryForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating category",
        description: error.message || "Failed to update blog category",
        variant: "destructive",
      });
    }
  });
  
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/blog-categories/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog category deleted successfully" });
      setIsDeleteCategoryDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-categories"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting category",
        description: error.message || "Failed to delete blog category",
        variant: "destructive",
      });
    }
  });
  
  const togglePublishedMutation = useMutation({
    mutationFn: async ({ id, published }: { id: number; published: boolean }) => {
      return apiRequest(`/api/admin/blog/${id}`, { method: "PATCH", data: { published } });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Blog post status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update post status",
        variant: "destructive",
      });
    }
  });
  
  const toggleCategoryActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      return apiRequest(`/api/admin/blog-categories/${id}`, { method: "PATCH", data: { active } });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Category status updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/blog-categories"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating status",
        description: error.message || "Failed to update category status",
        variant: "destructive",
      });
    }
  });

  // Helper functions
  const handleEditPost = (post: BlogPost) => {
    setSelectedPost(post);
    form.reset({
      ...post,
      date: new Date(post.date),
      categoryId: post.categoryId || null,
      featuredImageUrl: post.featuredImageUrl || null,
      excerpt: post.excerpt || null,
      author: post.author || null,
      tags: post.tags || null
    });
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (post: BlogPost) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };
  
  const onSubmit = async (data: BlogPostFormData) => {
    console.log("Form submitted with data:", data); // Debugging
    if (selectedPost) {
      console.log("Updating post:", selectedPost.id); // Debugging
      updatePostMutation.mutate({ id: selectedPost.id, data });
    } else {
      console.log("Creating new post"); // Debugging
      createPostMutation.mutate(data);
    }
  };
  
  const handleDeletePost = () => {
    if (postToDelete) {
      deletePostMutation.mutate(postToDelete.id);
    }
  };
  
  const handleTogglePublished = async (post: BlogPost) => {
    togglePublishedMutation.mutate({
      id: post.id,
      published: !post.published
    });
  };
  
  const handleToggleCategoryActive = async (category: BlogCategory) => {
    toggleCategoryActiveMutation.mutate({
      id: category.id,
      active: !category.active
    });
  };
  
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
  
  const resetForm = () => {
    setSelectedPost(null);
    form.reset({
      title: "", slug: "", content: "", snippet: "", excerpt: null,
      featuredImageUrl: null, author: null, date: new Date(),
      categoryId: null, tags: null, displayOrder: 0, published: false
    });
  };
  
  const handleEditCategory = (category: BlogCategory) => {
    setSelectedCategory(category);
    categoryForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      displayOrder: category.displayOrder,
      active: category.active
    });
    setIsCategoryFormOpen(true);
  };
  
  const handleDeleteCategoryClick = (category: BlogCategory) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryDialogOpen(true);
  };
  
  const onCategorySubmit = async (data: CategoryFormData) => {
    if (selectedCategory) {
      updateCategoryMutation.mutate({ id: selectedCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };
  
  const handleDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };
  
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
  
  const resetCategoryForm = () => {
    setSelectedCategory(null);
    categoryForm.reset({
      name: "", slug: "", description: "", displayOrder: 0, active: true
    });
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Blog Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage blog posts and categories for your website.
            </p>
          </div>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts" className="flex items-center">
              <FileText className="mr-2 h-4 w-4" />
              Blog Posts
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center">
              <FolderTree className="mr-2 h-4 w-4" />
              Categories
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Blog Posts</CardTitle>
                  <CardDescription>
                    Manage your website's blog content
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetForm();
                    setIsFormOpen(true);
                  }}
                  className="text-white hover:text-white"
                  style={{ 
                    backgroundColor: `#${brandColors.primary?.hex}`,
                    borderColor: `#${brandColors.primary?.hex}`
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Post
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingPosts ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading posts...</span>
                  </div>
                ) : posts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium mb-1">No blog posts yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get started by creating your first blog post.
                    </p>
                    <Button 
                      onClick={() => {
                        resetForm();
                        setIsFormOpen(true);
                      }}
                      className="text-white hover:text-white"
                      style={{ 
                        backgroundColor: `#${brandColors.primary?.hex}`,
                        borderColor: `#${brandColors.primary?.hex}` 
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Post
                    </Button>
                  </div>
                ) : (
                  <DataTable
                    data={posts}
                    searchKey="title"
                    columns={[
                      {
                        header: "Title",
                        accessorKey: "title",
                        cell: (post) => (
                          <div className="font-medium">{post.title}</div>
                        ),
                      },
                      {
                        header: "Category",
                        id: "category",
                        cell: (post) => (
                          <div>{post.categoryName || "Uncategorized"}</div>
                        ),
                      },
                      {
                        header: "Date",
                        id: "date",
                        cell: (post) => (
                          <div className="whitespace-nowrap">
                            {format(new Date(post.date), "MMM d, yyyy")}
                          </div>
                        ),
                      },
                      {
                        header: "Status",
                        id: "published",
                        cell: (post) => (
                          <div className="flex items-center">
                            {post.published ? (
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
                    ]}
                    actions={(post) => (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleTogglePublished(post)}
                          title={post.published ? "Unpublish" : "Publish"}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          {post.published ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditPost(post)}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(post)}
                          className="hover:bg-primary hover:text-primary-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle>Blog Categories</CardTitle>
                  <CardDescription>
                    Organize your blog posts with categories
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    resetCategoryForm();
                    setIsCategoryFormOpen(true);
                  }}
                  className="text-white hover:text-white"
                  style={{ 
                    backgroundColor: `#${brandColors.secondary?.hex}`,
                    borderColor: `#${brandColors.secondary?.hex}`
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Category
                </Button>
              </CardHeader>
              <CardContent>
                {isLoadingCategories ? (
                  <div className="flex justify-center items-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading categories...</span>
                  </div>
                ) : categories.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <FolderTree className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-xl font-medium mb-1">No categories yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Get started by creating your first category.
                    </p>
                    <Button 
                      onClick={() => {
                        resetCategoryForm();
                        setIsCategoryFormOpen(true);
                      }}
                      className="text-white hover:text-white"
                      style={{ 
                        backgroundColor: `#${brandColors.secondary?.hex}`,
                        borderColor: `#${brandColors.secondary?.hex}` 
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Category
                    </Button>
                  </div>
                ) : (
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
                      },
                      {
                        header: "Status",
                        accessorKey: "active",
                        cell: (category) => (
                          <div className="flex items-center">
                            {category.active ? (
                              <div className="flex items-center">
                                <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                                <span>Active</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <span className="h-2 w-2 rounded-full bg-gray-400 mr-2"></span>
                                <span>Inactive</span>
                              </div>
                            )}
                          </div>
                        ),
                      },
                    ]}
                    actions={(category) => (
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleCategoryActive(category)}
                          title={category.active ? "Disable" : "Enable"}
                          className="hover:bg-secondary hover:text-secondary-foreground"
                        >
                          {category.active ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditCategory(category)}
                          className="hover:bg-secondary hover:text-secondary-foreground"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteCategoryClick(category)}
                          className="hover:bg-secondary hover:text-secondary-foreground"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Post Form Dialog */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-3xl p-0 overflow-auto max-h-[90vh]">
            <DialogHeader className="px-5 pt-5 pb-3 border-b bg-gray-50 dark:bg-gray-900 sticky top-0">
              <DialogTitle className="text-xl font-bold flex items-center">
                <FileText className="h-5 w-5 mr-2" style={{ color: `#${brandColors.primary?.hex}` }} />
                {selectedPost ? "Edit Blog Post" : "Create New Blog Post"}
              </DialogTitle>
              <DialogDescription>
                {selectedPost ? "Update the details of this blog post" : "Create a new blog post for your website"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={form.handleSubmit(onSubmit)} className="px-5 py-4">
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
                    <Input {...form.register("title")} placeholder="Enter blog post title" />
                    {form.formState.errors.title && (
                      <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={generateSlug}
                        className="h-7 px-2 text-xs"
                        style={{ color: `#${brandColors.primary?.hex}` }}
                      >
                        Generate from title
                      </Button>
                    </div>
                    <Input {...form.register("slug")} placeholder="blog-post-slug" />
                    {form.formState.errors.slug && (
                      <p className="text-xs text-red-500">{form.formState.errors.slug.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Enter the full content of your blog post"
                        className="min-h-[200px]"
                      />
                    )}
                  />
                  {form.formState.errors.content && (
                    <p className="text-xs text-red-500">{form.formState.errors.content.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="snippet">Excerpt/Snippet <span className="text-red-500">*</span></Label>
                  <FormField
                    control={form.control}
                    name="snippet"
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Enter a short excerpt or snippet for this post"
                        className="min-h-[100px]"
                      />
                    )}
                  />
                  {form.formState.errors.snippet && (
                    <p className="text-xs text-red-500">{form.formState.errors.snippet.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="featuredImageUrl">Featured Image URL</Label>
                  <FormField
                    control={form.control}
                    name="featuredImageUrl"
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || ''}
                        onChange={e => field.onChange(e.target.value || null)}
                        placeholder="https://example.com/image.jpg"
                      />
                    )}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter a URL for the featured image that will be displayed with the blog post.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <Select
                          value={field.value === null ? "null" : field.value.toString()}
                          onValueChange={(value) => {
                            field.onChange(value === "null" ? null : parseInt(value));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="null">Uncategorized</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="published">Status</Label>
                    <FormField
                      control={form.control}
                      name="published"
                      render={({ field }) => (
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            id="published"
                          />
                          <Label htmlFor="published">
                            {field.value ? "Published" : "Draft"}
                          </Label>
                        </div>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="text-white"
                  style={{ backgroundColor: `#${brandColors.primary?.hex}` }}
                  disabled={createPostMutation.isPending || updatePostMutation.isPending}
                >
                  {(createPostMutation.isPending || updatePostMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!createPostMutation.isPending && !updatePostMutation.isPending && (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {selectedPost ? "Update Post" : "Create Post"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Category Form Dialog */}
        <Dialog open={isCategoryFormOpen} onOpenChange={setIsCategoryFormOpen}>
          <DialogContent className="max-w-md p-0 overflow-auto max-h-[90vh]">
            <DialogHeader className="px-5 pt-5 pb-3 border-b bg-gray-50 dark:bg-gray-900 sticky top-0">
              <DialogTitle className="text-xl font-bold flex items-center">
                <FolderTree className="h-5 w-5 mr-2" style={{ color: `#${brandColors.secondary?.hex}` }} />
                {selectedCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
              <DialogDescription>
                {selectedCategory ? "Update category details" : "Create a new category for your blog"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="px-5 py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                  <Input {...categoryForm.register("name")} placeholder="Enter category name" />
                  {categoryForm.formState.errors.name && (
                    <p className="text-xs text-red-500">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="slug">Slug <span className="text-red-500">*</span></Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateCategorySlug}
                      className="h-7 px-2 text-xs"
                      style={{ color: `#${brandColors.secondary?.hex}` }}
                    >
                      Generate from name
                    </Button>
                  </div>
                  <Input {...categoryForm.register("slug")} placeholder="category-slug" />
                  {categoryForm.formState.errors.slug && (
                    <p className="text-xs text-red-500">{categoryForm.formState.errors.slug.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    {...categoryForm.register("description")}
                    placeholder="Enter a description for this category"
                    className="min-h-[100px]"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="displayOrder">Display Order</Label>
                  <Input 
                    type="number" 
                    {...categoryForm.register("displayOrder", { 
                      valueAsNumber: true,
                      value: categoryForm.getValues("displayOrder") || 0
                    })}
                    placeholder="Enter display order (lower numbers appear first)" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="active">Status</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={categoryForm.getValues("active") ?? true}
                      onCheckedChange={(checked) => {
                        categoryForm.setValue("active", checked);
                      }}
                      id="active"
                    />
                    <Label htmlFor="active">
                      {categoryForm.getValues("active") ? "Active" : "Inactive"}
                    </Label>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="mt-6">
                <Button
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCategoryFormOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="text-white"
                  style={{ backgroundColor: `#${brandColors.secondary?.hex}` }}
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {!createCategoryMutation.isPending && !updateCategoryMutation.isPending && (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {selectedCategory ? "Update Category" : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* Delete Post Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Blog Post</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this blog post? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setPostToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeletePost}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deletePostMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Delete Category Confirmation Dialog */}
        <AlertDialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Category</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this category? Posts in this category will be uncategorized.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCategoryToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCategory}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteCategoryMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}