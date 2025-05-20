import { useState } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

// Form schema
const formSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters").nonempty("Question is required"),
  answer: z.string().min(5, "Answer must be at least 5 characters").nonempty("Answer is required"),
  category: z.string().min(1, "Category is required").nonempty("Category is required"),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().default(0)
});

type FormData = z.infer<typeof formSchema>;

export default function FaqManagementPage() {
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<any | null>(null);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      question: '',
      answer: '',
      category: 'general',
      isActive: true,
      displayOrder: 0
    }
  });

  // Fetch FAQs
  const { data: faqs = [], isLoading } = useQuery({
    queryKey: ['/api/admin/faqs'],
    retry: 1
  });

  // Add new FAQ
  const addMutation = useMutation({
    mutationFn: (data: FormData) => {
      return apiRequest('/api/admin/faqs', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faqs'] });
      toast({ title: "Success", description: "FAQ added successfully" });
      setIsModalOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add FAQ", 
        variant: "destructive" 
      });
    }
  });

  // Update FAQ
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!editingFaq) return Promise.reject("No FAQ selected for editing");
      console.log('[FAQ][FRONTEND] Sending PATCH request to:', `/api/admin/faqs/${editingFaq.id}`);
      return apiRequest(`/api/admin/faqs/${editingFaq.id}`, {
        method: 'PATCH',
        body: data
      })
      .then(response => {
        console.log('[FAQ][FRONTEND] PATCH response:', response);
        return response;
      })
      .catch(err => {
        console.error('[FAQ][FRONTEND] PATCH error:', err);
        throw err;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faqs'] });
      toast({ title: "Success", description: "FAQ updated successfully" });
      setIsModalOpen(false);
      setEditingFaq(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update FAQ", 
        variant: "destructive" 
      });
    }
  });

  // Delete FAQ
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest(`/api/admin/faqs/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/faqs'] });
      toast({ title: "Success", description: "FAQ deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete FAQ", 
        variant: "destructive" 
      });
    }
  });

  const handleSubmit = (data: FormData) => {
    // Validate required fields before submission
    if (!data.question || !data.answer) {
      toast({
        title: "Validation Error",
        description: "Question and answer fields are required", 
        variant: "destructive"
      });
      return;
    }
    
    if (editingFaq) {
      updateMutation.mutate(data);
    } else {
      addMutation.mutate(data);
    }
  };

  const handleEdit = (faq: any) => {
    setEditingFaq(faq);
    form.reset({
      question: faq.question || '',
      answer: faq.answer || '',
      category: faq.category || 'general',
      isActive: faq.isActive !== undefined ? faq.isActive : true,
      displayOrder: typeof faq.displayOrder === 'number' ? faq.displayOrder : 0
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this FAQ?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleAdd = () => {
    form.reset({
      question: '',
      answer: '',
      category: 'general',
      isActive: true,
      displayOrder: 0
    });
    setEditingFaq(null);
    setIsModalOpen(true);
  };

  // Group FAQs by category
  const faqsByCategory = Array.isArray(faqs) ? faqs.reduce((acc: Record<string, any[]>, faq: any) => {
    const category = faq.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(faq);
    return acc;
  }, {}) : {};

  return (
    <AdminLayout>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>FAQ Management</CardTitle>
              <CardDescription>Manage Frequently Asked Questions for your customers</CardDescription>
            </div>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add FAQ
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              {Object.keys(faqsByCategory).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  No FAQs found. Add your first FAQ item.
                </div>
              ) : (
                <>
                  {/* Table view for management */}
                  {Object.entries(faqsByCategory).map(([category, categoryFaqs]: [string, any]) => (
                    <div key={category} className="mb-6">
                      <h3 className="text-lg font-medium mb-2 capitalize">{category}</h3>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader className="hidden md:table-header-group">
                            <TableRow>
                              <TableHead>Question</TableHead>
                              <TableHead className="hidden md:table-cell">Answer</TableHead>
                              <TableHead className="hidden md:table-cell">Status</TableHead>
                              <TableHead className="hidden md:table-cell">Order</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {categoryFaqs.map((faq: any) => (
                              <TableRow key={faq.id} className="flex flex-col md:table-row border-b md:border-b-0">
                                <TableCell className="font-medium md:w-1/4 flex md:table-cell items-center justify-between">
                                  <span className="overflow-hidden text-ellipsis break-words max-w-[200px] md:max-w-full">{faq.question}</span>
                                  <div className="flex gap-2 md:hidden">
                                    <Button variant="outline" size="icon" onClick={() => handleEdit(faq)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(faq.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                                <TableCell className="md:w-1/2 hidden md:table-cell">
                                  <div className="whitespace-pre-line break-words overflow-hidden max-w-prose">{faq.answer}</div>
                                </TableCell>
                                <TableCell className="flex justify-between md:table-cell border-b md:border-b-0">
                                  <span className="md:hidden text-sm text-muted-foreground">Status:</span>
                                  <span className={`px-2 py-1 rounded text-xs ${faq.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                    {faq.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </TableCell>
                                <TableCell className="flex justify-between md:table-cell border-b md:border-b-0">
                                  <span className="md:hidden text-sm text-muted-foreground">Order:</span>
                                  <span>{faq.displayOrder}</span>
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right">
                                  <div className="flex justify-end gap-2">
                                    <Button variant="outline" size="icon" onClick={() => handleEdit(faq)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="outline" size="icon" onClick={() => handleDelete(faq.id)}>
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

                  {/* Preview of how FAQs will look on the frontend */}
                  <div className="mt-10">
                    <h3 className="text-lg font-medium mb-4">FAQ Preview</h3>
                    <div className="border rounded-md p-4">
                      {Object.entries(faqsByCategory).map(([category, categoryFaqs]: [string, any]) => (
                        <div key={`preview-${category}`} className="mb-6">
                          <h4 className="text-lg font-medium mb-2 capitalize">{category}</h4>
                          <Accordion type="single" collapsible className="w-full">
                            {categoryFaqs
                              .filter((faq: any) => faq.isActive)
                              .sort((a: any, b: any) => a.displayOrder - b.displayOrder)
                              .map((faq: any) => (
                                <AccordionItem key={`preview-item-${faq.id}`} value={`faq-${faq.id}`}>
                                  <AccordionTrigger className="break-words text-left">{faq.question}</AccordionTrigger>
                                  <AccordionContent>
                                    <div className="whitespace-pre-line break-words overflow-hidden">{faq.answer}</div>
                                  </AccordionContent>
                                </AccordionItem>
                              ))}
                          </Accordion>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md md:max-w-2xl sm:max-w-lg w-[95%] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Question</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. How do I reset my password?" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Answer</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter the answer to this question" 
                        className="min-h-[150px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      You can use line breaks for formatting. They will be preserved in the display.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                          <SelectItem value="account">Account</SelectItem>
                          <SelectItem value="billing">Billing</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="services">Services</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Group similar questions together</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="displayOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Order</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="e.g. 1" 
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value === "" ? "0" : e.target.value;
                            field.onChange(Number(value));
                          }}
                          value={field.value}
                        />
                      </FormControl>
                      <FormDescription>Order in which FAQs are displayed</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Only active FAQs will be displayed on the website
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

              <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto order-2 sm:order-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addMutation.isPending || updateMutation.isPending}
                  className="w-full sm:w-auto order-1 sm:order-2"
                >
                  {(addMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingFaq ? 'Update' : 'Add'} FAQ
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}