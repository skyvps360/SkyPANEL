import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";
import {
  Eye,
  EyeOff,
  Save,
  Loader2,
  Link as LinkIcon,
  Image as ImageIcon,
  Type as TypeIcon,
  List,
  ListOrdered,
  Bold,
  Italic,
  Code,
  FileCode,
  Table,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  FileText,
  Sparkles
} from "lucide-react";

// Define the form schema with zod
const legalContentSchema = z.object({
  type: z.string().min(2).max(50),
  title: z.string().min(3).max(100),
  content: z.string().min(10),
  version: z.string().min(1).max(20),
});

interface LegalContent {
  id: number;
  type: string;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  createdBy: number | null;
  updatedBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export function LegalEditorPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("tos");
  const [editorContent, setEditorContent] = useState<string>("");
  const [editorViewMode, setEditorViewMode] = useState<"write" | "preview">("write");
  const [editorTheme, setEditorTheme] = useState<string>(
    document.documentElement.classList.contains('dark') ? 'vs-dark' : 'light'
  );
  const editorRef = useRef<typeof Editor | null>(null);
  
  // Fetch all legal content from the server
  const { data: legalContent, error } = useQuery<LegalContent[]>({
    queryKey: ["/api/admin/legal"],
  });
  
  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error fetching legal content",
        description: (error as Error).message || "Could not load legal content",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Create the form with react-hook-form
  const form = useForm<z.infer<typeof legalContentSchema>>({
    resolver: zodResolver(legalContentSchema),
    defaultValues: {
      type: activeTab,
      title: "",
      content: "",
      version: "1.0",
    },
  });

  // Update form values when the active tab changes
  useEffect(() => {
    if (legalContent && Array.isArray(legalContent)) {
      // Find content of the current type (tos, privacy, or sla)
      const contentForType = legalContent.find((item: LegalContent) => item.type === activeTab);
      
      if (contentForType) {
        // If content exists, load it into the form
        form.reset({
          type: contentForType.type,
          title: contentForType.title,
          content: contentForType.content,
          version: contentForType.version,
        });
        setEditorContent(contentForType.content);
      } else {
        // Default values for a new legal content item
        const defaultTitles = {
          tos: "Terms of Service",
          privacy: "Privacy Policy",
          sla: "Service Level Agreement"
        };
        
        form.reset({
          type: activeTab,
          title: defaultTitles[activeTab as keyof typeof defaultTitles] || "Legal Document",
          content: "",
          version: "1.0",
        });
        setEditorContent("");
      }
    }
  }, [activeTab, legalContent, form]);

  // Function to handle editor mounting
  const handleEditorDidMount = (editor: typeof Editor) => {
    editorRef.current = editor;
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

  // Save legal content mutation
  const saveMutation = useMutation({
    mutationFn: async (values: z.infer<typeof legalContentSchema>) => {
      return await apiRequest("/api/admin/legal", {
        method: "POST",
        data: values,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Legal content saved successfully",
      });
      // Invalidate and refetch legal content data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/legal"] });
      queryClient.invalidateQueries({ queryKey: [`/api/legal/${activeTab}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving content",
        description: error.message || "Failed to save legal content",
        variant: "destructive",
      });
    },
  });

  // Gemini AI assistance mutation
  const geminiAssistMutation = useMutation({
    mutationFn: async (prompt: string) => {
      return await apiRequest("/api/admin/legal/gemini-assist", {
        method: "POST",
        data: { prompt },
      });
    },
    onSuccess: (data) => {
      if (data && data.response) {
        insertTextAtCursor(data.response);
        toast({
          title: "AI Assistance",
          description: "AI-generated content inserted successfully.",
        });
      } else {
        toast({
          title: "AI Assistance Error",
          description: "No content received from AI.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "AI Assistance Error",
        description: error.message || "Failed to get AI assistance.",
        variant: "destructive",
      });
    },
  });

  const handleGeminiAssist = () => {
    // Get the current content of the editor
    const currentContent = editorRef.current ? editorRef.current.getValue() : "";
    // Use the current content as a prompt for the AI
    geminiAssistMutation.mutate(currentContent);
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof legalContentSchema>) => {
    saveMutation.mutate(values);
  };

  // Handle editor content change
  const handleEditorChange = (value: string | undefined) => {
    const content = value || "";
    setEditorContent(content);
    form.setValue("content", content, { shouldValidate: true });
  };

  return (
    <>
      <Helmet>
        <title>Legal Content Editor - Admin Dashboard</title>
      </Helmet>

      <AdminLayout>
        <div className="py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Legal Content Editor</h1>
          </div>

          <Tabs
            defaultValue="tos"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6">
              <TabsTrigger value="tos">Terms of Service</TabsTrigger>
              <TabsTrigger value="privacy">Privacy Policy</TabsTrigger>
              <TabsTrigger value="sla">Service Level Agreement</TabsTrigger>
            </TabsList>

            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "tos" ? "Terms of Service" : activeTab === "privacy" ? "Privacy Policy" : "Service Level Agreement"} Editor
                </CardTitle>
                <CardDescription>
                  Manage your {activeTab === "tos" ? "Terms of Service" : activeTab === "privacy" ? "Privacy Policy" : "Service Level Agreement"} content here. Use the HTML editor to create rich content with formatting.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter title" {...field} />
                          </FormControl>
                          <FormDescription>
                            The title displayed at the top of the page.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="version"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Version</FormLabel>
                          <FormControl>
                            <Input placeholder="1.0" {...field} />
                          </FormControl>
                          <FormDescription>
                            The version number of this document (e.g., 1.0, 2.1, etc.).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label>Content (HTML)</Label>
                        <div className="flex items-center">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleGeminiAssist}
                            className="mr-2 flex items-center gap-1"
                            disabled={geminiAssistMutation.isPending || editorViewMode === "preview"}
                          >
                            {geminiAssistMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>AI Thinking...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-4 w-4" />
                                <span>AI Assist</span>
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setEditorViewMode(editorViewMode === "write" ? "preview" : "write")}
                            className="flex items-center gap-1"
                          >
                            {editorViewMode === "write" ? (
                              <>
                                <Eye className="h-4 w-4" />
                                <span>Preview</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-4 w-4" />
                                <span>Edit</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="border rounded-md">
                        {editorViewMode === "write" ? (
                          <div>
                            <div className="flex flex-wrap gap-1 py-2 border-b px-2 bg-gray-50 dark:bg-gray-800">
                              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 p-0" 
                                  onClick={() => insertTextAtCursor('<h1 class="text-4xl font-bold mb-6 text-center text-gray-900">Heading 1</h1>')}
                                  title="Heading 1"
                                >
                                  <Heading1 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor('<h2 class="text-3xl font-bold mb-4 text-gray-900">Heading 2</h2>')}
                                  title="Heading 2"
                                >
                                  <Heading2 className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor('<h3 class="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900">Heading 3</h3>')}
                                  title="Heading 3"
                                >
                                  <Heading3 className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor("<strong>Bold text</strong>")}
                                  title="Bold"
                                >
                                  <Bold className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    insertTextAtCursor("<em>Italic text</em>");
                                  }}
                                  title="Italic"
                                >
                                  <Italic className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor('<blockquote class="border-l-4 border-gray-300 pl-4 py-2 my-4 italic text-gray-700">Quote text here</blockquote>')}
                                  title="Blockquote"
                                >
                                  <Quote className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor('<ul class="list-disc ml-6 mb-4">\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>')}
                                  title="Unordered List"
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0"
                                  onClick={() => insertTextAtCursor('<ol class="list-decimal ml-6 mb-4">\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>')}
                                  title="Ordered List"
                                >
                                  <ListOrdered className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-gray-300 dark:border-gray-600">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => {
                                    insertTextAtCursor('<a href="https://example.com" class="text-blue-600 hover:underline">Link text</a>');
                                  }}
                                  title="Link"
                                >
                                  <LinkIcon className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => insertTextAtCursor('<img src="image.jpg" alt="Image description" class="max-w-full h-auto rounded-lg shadow-sm my-4" />')}
                                  title="Image"
                                >
                                  <ImageIcon className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <div className="flex items-center gap-1">
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => { insertTextAtCursor('<code class="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm font-mono">inline code</code>'); }}
                                  title="Inline Code"
                                >
                                  <Code className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => insertTextAtCursor('<pre class="bg-gray-100 border border-gray-200 rounded-lg p-4 my-4 overflow-x-auto"><code class="text-sm font-mono text-gray-800">\nCode block\n</code></pre>')}
                                  title="Code Block"
                                >
                                  <FileCode className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => insertTextAtCursor('<hr class="border-t border-gray-300 my-6" />')}
                                  title="Horizontal Rule"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                <Button 
                                  type="button" 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8"
                                  onClick={() => {
                                    insertTextAtCursor('<table class="w-full border-collapse border border-gray-300 my-4">\n  <tr class="bg-gray-50">\n    <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Header 1</th>\n    <th class="border border-gray-300 px-4 py-2 text-left font-semibold">Header 2</th>\n  </tr>\n  <tr>\n    <td class="border border-gray-300 px-4 py-2">Cell 1</td>\n    <td class="border border-gray-300 px-4 py-2">Cell 2</td>\n  </tr>\n</table>');
                                  }}
                                  title="Table"
                                >
                                  <Table className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <FormField
                              control={form.control}
                              name="content"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Editor
                                      height="500px"
                                      language="html"
                                      value={editorContent}
                                      onChange={handleEditorChange}
                                      theme={editorTheme}
                                      onMount={handleEditorDidMount}
                                      options={{
                                        minimap: { enabled: false },
                                        wordWrap: "on",
                                        fontSize: 14,
                                      }}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        ) : (
                          <div className="bg-white dark:bg-gray-900 p-4 h-[500px] overflow-auto">
                            <div className="prose dark:prose-invert max-w-none"
                                 dangerouslySetInnerHTML={{ __html: editorContent }}
                            />
                          </div>
                        )}
                      </div>
                      <FormDescription>
                        You can use HTML tags for formatting. Use {"{company_name}"} as a placeholder for the company name.
                      </FormDescription>
                      
                      <details className="mt-2 text-xs text-gray-500">
                        <summary className="cursor-pointer font-medium hover:text-gray-700 dark:hover:text-gray-300">
                          HTML Formatting Cheatsheet
                        </summary>
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th className="pb-2 pr-4 font-medium">Element</th>
                                <th className="pb-2 font-medium">HTML Syntax</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Heading</td>
                                <td className="py-2 font-mono">&lt;h1 class="text-4xl font-bold mb-6 text-center text-gray-900"&gt;Heading 1&lt;/h1&gt;<br />&lt;h2 class="text-3xl font-bold mb-4 text-gray-900"&gt;Heading 2&lt;/h2&gt;<br />&lt;h3 class="text-xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-300 text-gray-900"&gt;Heading 3&lt;/h3&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Bold</td>
                                <td className="py-2 font-mono">&lt;strong&gt;bold text&lt;/strong&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Italic</td>
                                <td className="py-2 font-mono">&lt;em&gt;italicized text&lt;/em&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Paragraph</td>
                                <td className="py-2 font-mono">&lt;p&gt;paragraph text&lt;/p&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Link</td>
                                <td className="py-2 font-mono">&lt;a href="url"&gt;link text&lt;/a&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Unordered List</td>
                                <td className="py-2 font-mono">&lt;ul&gt;<br />&nbsp;&lt;li&gt;Item 1&lt;/li&gt;<br />&nbsp;&lt;li&gt;Item 2&lt;/li&gt;<br />&lt;/ul&gt;</td>
                              </tr>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <td className="py-2 pr-4">Ordered List</td>
                                <td className="py-2 font-mono">&lt;ol&gt;<br />&nbsp;&lt;li&gt;Item 1&lt;/li&gt;<br />&nbsp;&lt;li&gt;Item 2&lt;/li&gt;<br />&lt;/ol&gt;</td>
                              </tr>
                              <tr>
                                <td className="py-2 pr-4">Image</td>
                                <td className="py-2 font-mono">&lt;img src="image.jpg" alt="description" /&gt;</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </details>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button
                        type="submit"
                        className="flex items-center gap-2"
                        disabled={saveMutation.isPending}
                      >
                        {saveMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            <span>Save Changes</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </AdminLayout>
    </>
  );
}

export default LegalEditorPage;