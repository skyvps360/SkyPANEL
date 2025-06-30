/*
 * Button Styling Consistency & Visibility Fix - Updated 2024
 * 
 * Fixed button hover states and visual consistency issues in the admin blog interface:
 * - Replaced inline style attributes with proper CSS classes for brand color integration
 * - Updated subtle hover states (bg-primary/10) with high-contrast effects (hover:bg-primary hover:text-white)
 * - Added shadow effects and longer transition durations for better visual feedback
 * - Applied transition-all duration-200 for smooth hover animations
 * - Updated "Generate from title", "Write/Preview/AI Generate", and toolbar buttons
 * - Used semantic CSS classes that work with the brand theme system
 * 
 * All buttons now have highly visible hover feedback with proper contrast for accessibility.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
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
  FolderTree,
  Sparkles,
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
  // Start as null to avoid flash of wrong color
  const [brandColors, setBrandColors] = useState<any>(null);
  
  // State for dialogs
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BlogCategory | null>(null);
  const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<BlogCategory | null>(null);
  
  // AI assistance state
  const [isGeminiDialogOpen, setIsGeminiDialogOpen] = useState(false);
  const [geminiContext, setGeminiContext] = useState("");
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<{ content?: string, snippet?: string } | null>(null);
  
  // Editor state
  const [postContentEditorValue, setPostContentEditorValue] = useState<string>("");
  const [postSnippetEditorValue, setPostSnippetEditorValue] = useState<string>("");
  const [editorTheme, setEditorTheme] = useState<string>(
    document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  );
  const [contentViewMode, setContentViewMode] = useState<"write" | "preview">("write");
  const [snippetViewMode, setSnippetViewMode] = useState<"write" | "preview">("write");
  const contentEditorRef = useRef<any>(null);
  const snippetEditorRef = useRef<any>(null);
  const categoryEditorRef = useRef<any>(null);
  
  // Category state
  const [categoryDescriptionEditorValue, setCategoryDescriptionEditorValue] = useState<string>("");
  
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
  
  // Handle editor mounting
  const handleContentEditorDidMount = (editor: any) => {
    contentEditorRef.current = editor;
  };
  
  const handleSnippetEditorDidMount = (editor: any) => {
    snippetEditorRef.current = editor;
  };
  
  const handleCategoryEditorDidMount = (editor: any) => {
    categoryEditorRef.current = editor;
  };
  
  // Function to insert text at cursor in content editor
  const insertTextAtCursor = (textToInsert: string, editorRef: React.MutableRefObject<any>, setValue: (value: string) => void) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      const id = { major: 1, minor: 1 };      
      const op = { identifier: id, range: selection, text: textToInsert, forceMoveMarkers: true };
      editor.executeEdits("my-source", [op]);
      
      // Update the state with the new editor value
      const updatedContent = editor.getValue();
      setValue(updatedContent);
      
      editor.focus();
    }
  };
  
  // Mutations
  const createPostMutation = useMutation({
    mutationFn: async (data: BlogPostFormData) => {
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
      title: post.title,
      slug: post.slug,
      content: post.content,
      snippet: post.snippet,
      excerpt: post.excerpt,
      featuredImageUrl: post.featuredImageUrl,
      author: post.author,
      date: new Date(post.date),
      categoryId: post.categoryId,
      tags: post.tags,
      displayOrder: post.displayOrder,
      published: post.published
    });
    
    // Set editor content values
    setPostContentEditorValue(post.content);
    setPostSnippetEditorValue(post.snippet);
    
    // Reset view modes to write
    setContentViewMode("write");
    setSnippetViewMode("write");
    
    setIsFormOpen(true);
  };
  
  const handleDeleteClick = (post: BlogPost) => {
    setPostToDelete(post);
    setIsDeleteDialogOpen(true);
  };
  
  const onSubmit = async (data: BlogPostFormData) => {
    // Use the editor values for content and snippet
    const submissionData = {
      ...data,
      content: postContentEditorValue,
      snippet: postSnippetEditorValue
    };
    
    if (selectedPost) {
      await updatePostMutation.mutateAsync({ id: selectedPost.id, data: submissionData });
    } else {
      await createPostMutation.mutateAsync(submissionData);
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
      title: "",
      slug: "",
      content: "",
      snippet: "",
      excerpt: null,
      featuredImageUrl: null,
      author: null,
      date: new Date(),
      categoryId: null,
      tags: null,
      displayOrder: 0,
      published: false
    });
    
    // Reset editor content
    setPostContentEditorValue("");
    setPostSnippetEditorValue("");
    
    // Reset view modes
    setContentViewMode("write");
    setSnippetViewMode("write");
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
    
    // Set editor content
    setCategoryDescriptionEditorValue(category.description || "");
    
    setIsCategoryFormOpen(true);
  };
  
  const handleDeleteCategoryClick = (category: BlogCategory) => {
    setCategoryToDelete(category);
    setIsDeleteCategoryDialogOpen(true);
  };
  
  const onCategorySubmit = async (data: CategoryFormData) => {
    if (selectedCategory) {
      await updateCategoryMutation.mutateAsync({ id: selectedCategory.id, data });
    } else {
      await createCategoryMutation.mutateAsync(data);
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
      name: "",
      slug: "",
      description: "",
      displayOrder: 0,
      active: true
    });
    
    // Reset editor content
    setCategoryDescriptionEditorValue("");
  };

  // Handle Gemini AI generated content
  const handleGeminiAssist = async () => {
    if (!geminiContext.trim()) {
      toast({
        title: "Error",
        description: "Please provide context for the blog post",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingContent(true);
    try {
      // Call the Gemini API endpoint
      const response = await apiRequest('/api/admin/blog/gemini-assist', {
        method: 'POST',
        data: { context: geminiContext }
      });

      if (response && response.response) {
        // Parse the JSON response
        let parsedContent;
        try {
          // The response might be a JSON string inside the response field
          let jsonContent = response.response;
          
          // Handle case where Gemini wraps the JSON in markdown code blocks
          if (typeof jsonContent === 'string') {
            // Remove markdown code block formatting if present
            const codeBlockMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (codeBlockMatch && codeBlockMatch[1]) {
              jsonContent = codeBlockMatch[1].trim();
            }
            
            // Additional cleanup for any leftover markdown or formatting
            jsonContent = jsonContent.replace(/^```json/gm, '').replace(/```$/gm, '').trim();
            
            console.log("Cleaned JSON content for parsing:", jsonContent);
            
            try {
              parsedContent = JSON.parse(jsonContent);
            } catch (innerError) {
              // Fallback: Try to manually extract content and snippet from the text
              console.warn("JSON parsing failed, attempting manual extraction:", innerError);
              
              // Attempt to extract content and snippet using regex
              const contentMatch = jsonContent.match(/"content"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
              const snippetMatch = jsonContent.match(/"snippet"\s*:\s*"([^"]*(?:"[^"]*"[^"]*)*)"/);
              
              if (contentMatch && snippetMatch) {
                parsedContent = {
                  content: contentMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
                  snippet: snippetMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n')
                };
                console.log("Manual extraction succeeded:", parsedContent);
              } else {
                throw new Error("Could not extract content from response");
              }
            }
          } else {
            parsedContent = response.response;
          }

          if (parsedContent && parsedContent.content && parsedContent.snippet) {
            setGeneratedContent(parsedContent);
            toast({
              title: "Success",
              description: "Blog content generated successfully!",
            });
          } else {
            throw new Error("Invalid response format from AI service");
          }
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          console.error("Raw response:", response.response);
          toast({
            title: "Error",
            description: "Failed to parse AI generated content",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Invalid response from AI service");
      }
    } catch (error: any) {
      console.error("Error generating blog content:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate blog content",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingContent(false);
      // Close the dialog only if content was successfully generated
      if (generatedContent) {
        setIsGeminiDialogOpen(false);
      }
    }
  };

  // Apply generated content to editors
  const applyGeneratedContent = () => {
    if (generatedContent) {
      if (generatedContent.content) {
        setPostContentEditorValue(generatedContent.content);
        form.setValue("content", generatedContent.content, { shouldValidate: true });
      }
      
      if (generatedContent.snippet) {
        setPostSnippetEditorValue(generatedContent.snippet);
        form.setValue("snippet", generatedContent.snippet, { shouldValidate: true });
      }
      
      // Clear the generated content and close the dialog
      setGeneratedContent(null);
      setIsGeminiDialogOpen(false);
      
      toast({
        title: "Content Applied",
        description: "AI generated content has been applied to the form",
      });
    }
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
                  style={brandColors ? {
                    backgroundColor: `#${brandColors.primary?.hex}`,
                    borderColor: `#${brandColors.primary?.hex}`
                  } : {}}
                  disabled={!brandColors}
                >
                  {brandColors ? (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      New Post
                    </>
                  ) : (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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
                      style={brandColors ? {
                        backgroundColor: `#${brandColors.primary?.hex}`,
                        borderColor: `#${brandColors.primary?.hex}`
                      } : {}}
                      disabled={!brandColors}
                    >
                      {brandColors ? (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Post
                        </>
                      ) : (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
                    backgroundColor: `#${brandColors?.secondary?.hex}`,
                    borderColor: `#${brandColors?.secondary?.hex}`
                  }}
                  disabled={!brandColors}
                >
                  {brandColors ? (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      New Category
                    </>
                  ) : (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
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
                        backgroundColor: `#${brandColors?.secondary?.hex}`,
                        borderColor: `#${brandColors?.secondary?.hex}`
                      }}
                      disabled={!brandColors}
                    >
                      {brandColors ? (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Category
                        </>
                      ) : (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
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
          <DialogContent className="max-w-3xl p-0 overflow-auto max-h-[90vh] bg-white dark:bg-gray-950 rounded-xl shadow-lg">
            <DialogHeader className="px-5 pt-5 pb-3 border-b bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
              <DialogTitle className="text-xl font-bold flex items-center">
                <FileText className="h-5 w-5 mr-2" style={{ color: `#${brandColors?.primary?.hex}` }} />
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
                        className="h-7 px-2 text-xs text-primary hover:text-white hover:bg-primary hover:shadow-md transition-all duration-200"
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
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="content">Content <span className="text-red-500">*</span></Label>
                    <div className="text-xs text-gray-500 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m18 7 4 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l4-2"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5l-6-3-6 3v17"/><path d="M12 7v5"/><path d="M10 9h4"/></svg>
                      Supports markdown formatting
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg" 
                    style={{ 
                      borderColor: `#${brandColors?.primary?.lighter}`,
                      backgroundColor: `#${brandColors?.primary?.extraLight}`,
                      border: '1px solid'
                    }}>
                    <div className="flex justify-between items-center py-2 px-2 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-800">
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={contentViewMode === "write" ? "default" : "outline"} 
                          size="sm" 
                          className={`h-8 text-xs transition-all duration-200 ${
                            contentViewMode === "write" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                              : "border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md"
                          }`} 
                          onClick={() => setContentViewMode("write")}
                        >
                          Write
                        </Button>
                        <Button 
                          type="button" 
                          variant={contentViewMode === "preview" ? "default" : "outline"} 
                          size="sm" 
                          className={`h-8 text-xs transition-all duration-200 ${
                            contentViewMode === "preview" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                              : "border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md"
                          }`} 
                          onClick={() => setContentViewMode("preview")}
                        >
                          Preview
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs flex items-center gap-1 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md transition-all duration-200" 
                          onClick={() => setIsGeminiDialogOpen(true)}
                          disabled={contentViewMode === "preview"}
                        >
                          <Sparkles size={14} />
                          <span>AI Generate</span>
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {contentViewMode === "write" && (
                        <>
                          <div className="flex flex-wrap gap-1 py-2 border-x border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2">
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('# ', contentEditorRef, setPostContentEditorValue)} title="Heading 1">H1</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('## ', contentEditorRef, setPostContentEditorValue)} title="Heading 2">H2</Button>
                            </div>
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('**Bold Text**', contentEditorRef, setPostContentEditorValue)} title="Bold">B</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 italic hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('*Italic Text*', contentEditorRef, setPostContentEditorValue)} title="Italic">I</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('> ', contentEditorRef, setPostContentEditorValue)} title="Blockquote">"</Button>
                            </div>
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('- ', contentEditorRef, setPostContentEditorValue)} title="Unordered List">•</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('1. ', contentEditorRef, setPostContentEditorValue)} title="Ordered List">1.</Button>
                            </div>
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('[Link Text](https://example.com)', contentEditorRef, setPostContentEditorValue)} title="Link"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('![Image Alt](image.jpg)', contentEditorRef, setPostContentEditorValue)} title="Image"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('`inline code`', contentEditorRef, setPostContentEditorValue)} title="Inline Code"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('```\nCode block\n```', contentEditorRef, setPostContentEditorValue)} title="Code Block"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('---', contentEditorRef, setPostContentEditorValue)} title="Horizontal Rule"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></Button>
                            </div>
                          </div>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden">
                            <Editor
                              height="320px"
                              defaultLanguage="markdown"
                              value={postContentEditorValue}
                              onChange={(value) => {
                                setPostContentEditorValue(value || "");
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
                              onMount={handleContentEditorDidMount}
                            />
                          </div>
                        </>
                      )}
                      {contentViewMode === "preview" && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden p-4 min-h-[320px] max-h-[600px] overflow-y-auto bg-white dark:bg-gray-900">
                          {postContentEditorValue ? (
                            <ReactMarkdown>{postContentEditorValue}</ReactMarkdown>
                          ) : (
                            <div className="text-gray-400 dark:text-gray-600 italic text-center mt-12">
                              No content to preview
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {form.formState.errors.content && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.content.message}</p>
                    )}
                    <details className="mt-2 text-xs text-gray-500">
                      <summary className="cursor-pointer font-medium hover:text-gray-700 dark:hover:text-gray-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
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
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="snippet">Excerpt/Snippet <span className="text-red-500">*</span></Label>
                    <div className="text-xs text-gray-500">
                      A brief summary shown in blog listings
                    </div>
                  </div>
                  {/* --- SNIPPET EDITOR POPUP REFACTOR --- */}
                  <div className="p-3 rounded-lg" 
                    style={{ 
                      borderColor: `#${brandColors?.primary?.lighter}`,
                      backgroundColor: `#${brandColors?.primary?.extraLight}`,
                      border: '1px solid'
                    }}>
                    <div className="flex justify-between items-center py-2 px-2 border border-gray-200 dark:border-gray-700 border-b-0 rounded-t-md bg-gray-50 dark:bg-gray-800">
                      <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={snippetViewMode === "write" ? "default" : "outline"} 
                          size="sm" 
                          className={`h-8 text-xs transition-all duration-200 ${
                            snippetViewMode === "write" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                              : "border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md"
                          }`} 
                          onClick={() => setSnippetViewMode("write")}
                        >
                          Write
                        </Button>
                        <Button 
                          type="button" 
                          variant={snippetViewMode === "preview" ? "default" : "outline"} 
                          size="sm" 
                          className={`h-8 text-xs transition-all duration-200 ${
                            snippetViewMode === "preview" 
                              ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm" 
                              : "border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md"
                          }`} 
                          onClick={() => setSnippetViewMode("preview")}
                        >
                          Preview
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          className="h-8 text-xs flex items-center gap-1 border-primary text-primary hover:bg-primary hover:text-white hover:shadow-md transition-all duration-200" 
                          onClick={() => setIsGeminiDialogOpen(true)}
                          disabled={snippetViewMode === "preview"}
                        >
                          <Sparkles size={14} />
                          <span>AI Generate</span>
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {snippetViewMode === "write" && (
                        <>
                          <div className="flex flex-wrap gap-1 py-2 border-x border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-2">
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 font-bold hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('**Bold**', snippetEditorRef, setPostSnippetEditorValue)} title="Bold">B</Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 italic hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('*Italic*', snippetEditorRef, setPostSnippetEditorValue)} title="Italic">I</Button>
                            </div>
                            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('[Link](url)', snippetEditorRef, setPostSnippetEditorValue)} title="Link"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('![Image Alt](image.jpg)', snippetEditorRef, setPostSnippetEditorValue)} title="Image"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></Button>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('`inline code`', snippetEditorRef, setPostSnippetEditorValue)} title="Inline Code"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('```\nCode block\n```', snippetEditorRef, setPostSnippetEditorValue)} title="Code Block"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></Button>
                              <Button type="button" variant="ghost" size="sm" className="h-8 hover:bg-primary hover:text-white hover:shadow-sm transition-all duration-200" onClick={() => insertTextAtCursor('---', snippetEditorRef, setPostSnippetEditorValue)} title="Horizontal Rule"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg></Button>
                            </div>
                          </div>
                          <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden">
                            <Editor
                              height="150px"
                              defaultLanguage="markdown"
                              value={postSnippetEditorValue}
                              onChange={(value) => {
                                setPostSnippetEditorValue(value || "");
                                form.setValue("snippet", value || "", { shouldValidate: true });
                              }}
                              theme={editorTheme}
                              options={{
                                minimap: { enabled: false },
                                lineNumbers: 'off',
                                fontSize: 14,
                                wordWrap: 'on',
                                scrollBeyondLastLine: false,
                                automaticLayout: true
                              }}
                              onMount={handleSnippetEditorDidMount}
                            />
                          </div>
                        </>
                      )}
                      {snippetViewMode === "preview" && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-b-md overflow-hidden p-4 min-h-[150px] max-h-[300px] overflow-auto bg-white dark:bg-gray-900">
                          {postSnippetEditorValue ? (
                            <ReactMarkdown>{postSnippetEditorValue}</ReactMarkdown>
                          ) : (
                            <div className="text-gray-400 dark:text-gray-600 italic text-center py-8">
                              No excerpt to preview
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {form.formState.errors.snippet && (
                      <p className="text-xs text-red-500 mt-1">{form.formState.errors.snippet.message}</p>
                    )}
                    <details className="mt-2 text-xs text-gray-500">
                      <summary className="cursor-pointer font-medium hover:text-gray-700 dark:hover:text-gray-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
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
                              <td className="py-2 pr-4">Bold</td>
                              <td className="py-2 font-mono">**bold text**</td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <td className="py-2 pr-4">Italic</td>
                              <td className="py-2 font-mono">*italicized text*</td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <td className="py-2 pr-4">Link</td>
                              <td className="py-2 font-mono">[title](https://www.example.com)</td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <td className="py-2 pr-4">Code</td>
                              <td className="py-2 font-mono">`code`</td>
                            </tr>
                            <tr className="border-b border-gray-200 dark:border-gray-700">
                              <td className="py-2 pr-4">Code Block</td>
                              <td className="py-2 font-mono">```<br />code block<br />```</td>
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
                  style={{ backgroundColor: `#${brandColors?.primary?.hex}` }}
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
          <DialogContent className="max-w-2xl p-0 overflow-auto max-h-[90vh] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg rounded-xl">
            <DialogHeader className="px-5 pt-5 pb-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 sticky top-0">
              <DialogTitle className="text-xl font-bold flex items-center">
                <FolderTree className="h-5 w-5 mr-2" style={{ color: `#${brandColors?.secondary?.hex}` }} />
                {selectedCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedCategory ? "Update category details" : "Create a new category for your blog"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className="px-5 py-4">
              <div className="grid gap-5">
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold flex items-center"
                        style={{ color: `#${brandColors?.secondary?.hex}` }}>
                      <FolderTree className="h-4 w-4 mr-1.5" />
                      Category Details
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium flex items-center">
                          Name <span className="text-red-500 ml-0.5">*</span>
                        </Label>
                        <Input 
                          {...categoryForm.register("name")} 
                          placeholder="Enter category name" 
                          className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                        />
                  {categoryForm.formState.errors.name && (
                          <p className="text-xs text-red-500 mt-1">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                          <Label htmlFor="slug" className="text-sm font-medium flex items-center">
                            Slug <span className="text-red-500 ml-0.5">*</span>
                          </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateCategorySlug}
                      className="h-7 px-2 text-xs text-secondary hover:text-white hover:bg-secondary hover:shadow-md transition-all duration-200"
                    >
                      <span className="mr-1">Generate from name</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/><path d="M13 17l6-6"/><path d="M22 10V4h-6"/></svg>
                    </Button>
                  </div>
                        <div className="relative">
                          <Input 
                            {...categoryForm.register("slug")} 
                            placeholder="category-slug" 
                            className="w-full border-gray-200 dark:border-gray-700 focus:ring-blue-500 pl-8"
                          />
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                          </span>
                        </div>
                  {categoryForm.formState.errors.slug && (
                          <p className="text-xs text-red-500 mt-1">{categoryForm.formState.errors.slug.message}</p>
                  )}
                      </div>
                    </div>
                  </div>
                </div>
                
                                  <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-sm font-semibold flex items-center"
                        style={{ color: `#${brandColors?.secondary?.hex}` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Description
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
                          value={categoryDescriptionEditorValue}
                          onChange={(value) => {
                            setCategoryDescriptionEditorValue(value || "");
                            categoryForm.setValue("description", value || "");
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
                    </div>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold flex items-center"
                        style={{ color: `#${brandColors?.secondary?.hex}` }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/></svg>
                      Settings
                    </h3>
                  </div>
                  
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                        <Label htmlFor="displayOrder" className="text-sm font-medium">Display Order</Label>
                  <Input 
                    type="number" 
                    {...categoryForm.register("displayOrder", { 
                      valueAsNumber: true,
                      value: categoryForm.getValues("displayOrder") || 0
                    })}
                          className="w-full max-w-[150px] border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                          placeholder="0" 
                  />
                        <p className="text-xs text-gray-500 mt-1">
                          Lower numbers appear first in navigation
                        </p>
                </div>
                
                <div className="space-y-2">
                        <Label htmlFor="active" className="text-sm font-medium">Status</Label>
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
                        <p className="text-xs text-gray-500 mt-1">
                          Inactive categories won't appear on the site
                        </p>
                      </div>
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
                  style={{ backgroundColor: `#${brandColors?.secondary?.hex}` }}
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

        {/* Add the Gemini AI dialog for generating content */}
        <Dialog open={isGeminiDialogOpen} onOpenChange={setIsGeminiDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: `#${brandColors?.primary?.hex}` }} />
                Generate Blog Content with AI
              </DialogTitle>
              <DialogDescription>
                Provide some context or topic details for your blog post and Google Gemini will generate content for you.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="gemini-context">Context or Topic</Label>
                <Textarea
                  id="gemini-context"
                  placeholder="Describe the topic, key points, or context for your blog post..."
                  rows={6}
                  value={geminiContext}
                  onChange={(e) => setGeminiContext(e.target.value)}
                  className="resize-none"
                  disabled={isGeneratingContent}
                />
                <p className="text-xs text-muted-foreground">
                  Be specific and include key points you want covered in the blog post.
                </p>
              </div>

              {generatedContent && (
                <div className="space-y-2 border rounded-md p-3 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <Label className="font-medium">Generated Content Preview</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setGeneratedContent(null)}
                      className="h-8 text-xs"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="max-h-40 overflow-y-auto text-sm border rounded-md p-2 bg-background">
                    <div className="font-medium mb-1">Main Content (excerpt):</div>
                    <div className="text-muted-foreground">
                      {generatedContent.content ? generatedContent.content.substring(0, 150) + '...' : 'No content generated'}
                    </div>
                    
                    <div className="font-medium mb-1 mt-3">Snippet:</div>
                    <div className="text-muted-foreground">
                      {generatedContent.snippet || 'No snippet generated'}
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline" 
                onClick={() => setIsGeminiDialogOpen(false)}
                disabled={isGeneratingContent}
              >
                Cancel
              </Button>
              
              {generatedContent ? (
                <Button
                  type="button"
                  className="text-white"
                  style={{ backgroundColor: `#${brandColors?.primary?.hex}` }}
                  onClick={applyGeneratedContent}
                >
                  Apply Generated Content
                </Button>
              ) : (
                <Button
                  type="button"
                  className="text-white"
                  style={{ backgroundColor: `#${brandColors?.primary?.hex}` }}
                  onClick={handleGeminiAssist}
                  disabled={isGeneratingContent || !geminiContext.trim()}
                >
                  {isGeneratingContent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Content
                    </>
                  )}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}