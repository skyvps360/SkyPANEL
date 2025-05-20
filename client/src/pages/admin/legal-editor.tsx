import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { useToast } from "@/hooks/use-toast";
import AdminLayout from "@/components/layout/AdminLayout";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const [previewContent, setPreviewContent] = useState<string>("");
  
  // Fetch all legal content from the server
  const { data: legalContent, isLoading, error } = useQuery<LegalContent[]>({
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
      // Find content of the current type (tos or privacy)
      const contentForType = legalContent.find((item: LegalContent) => item.type === activeTab);
      
      if (contentForType) {
        // If content exists, load it into the form
        form.reset({
          type: contentForType.type,
          title: contentForType.title,
          content: contentForType.content,
          version: contentForType.version,
        });
        setPreviewContent(contentForType.content);
      } else {
        // Default values for a new legal content item
        form.reset({
          type: activeTab,
          title: activeTab === "tos" ? "Terms of Service" : "Privacy Policy",
          content: "",
          version: "1.0",
        });
        setPreviewContent("");
      }
    }
  }, [activeTab, legalContent, form]);

  // Handle preview update
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPreviewContent(e.target.value);
    form.setValue("content", e.target.value);
  };

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

  // Handle form submission
  const onSubmit = (values: z.infer<typeof legalContentSchema>) => {
    saveMutation.mutate(values);
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
            </TabsList>

            <Card>
              <CardHeader>
                <CardTitle>
                  {activeTab === "tos" ? "Terms of Service" : "Privacy Policy"} Editor
                </CardTitle>
                <CardDescription>
                  Manage your {activeTab === "tos" ? "Terms of Service" : "Privacy Policy"} content here. Use the HTML editor to create rich content with formatting.
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="content"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Content (HTML)</FormLabel>
                              <FormControl>
                                <Textarea
                                  placeholder="Enter HTML content"
                                  className="font-mono h-[500px]"
                                  value={field.value}
                                  onChange={(e) => {
                                    field.onChange(e);
                                    handleContentChange(e);
                                  }}
                                />
                              </FormControl>
                              <FormDescription>
                                You can use HTML tags for formatting. Use {"{company_name}"} as a placeholder for the company name.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div>
                        <Label htmlFor="preview">Preview</Label>
                        <div
                          id="preview"
                          className="border rounded-md p-4 mt-2 h-[500px] overflow-auto bg-white"
                        >
                          <div
                            dangerouslySetInnerHTML={{
                              __html: previewContent.replace(/\{company_name\}/g, "Company Name"),
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={saveMutation.isPending}
                        className="w-32"
                      >
                        {saveMutation.isPending ? "Saving..." : "Save"}
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