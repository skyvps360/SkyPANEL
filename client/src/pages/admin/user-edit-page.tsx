import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, UseQueryOptions } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  ArrowLeft, 
  BarChart3, 
  Check, 
  Copy, 
  CreditCard, 
  Database, 
  Save, 
  Server, 
  ShieldAlert, 
  User, 
  UserCog, 
  X,
  Info
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";


// User schema (no local credits)
const userSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address"),
  role: z.string().min(1, "Role is required"),
});

type UserFormData = z.infer<typeof userSchema>;

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  virtFusionId?: number;
  isActive?: boolean;
  createdAt: string;
}

// VirtFusion usage data interfaces
interface UsageResource {
  consumed: number;
  allocated: number;
  name: string;
  unit?: string;
}

interface UsageServer {
  id: number;
  name: string;
  hostname: string;
}

interface UsagePeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  resources: UsageResource[];
  servers?: UsageServer[];
}

interface VirtFusionUsageData {
  data: {
    data: {
      user?: {
        id: number;
        name: string;
        email: string;
        selfService: boolean;
        enabled: boolean;
      };
      periods?: UsagePeriod[];
      credit?: {
        tokens: string;
        value: string;
      };
      period?: string;
      servers?: number;
      monthlyTotal?: {
        hours: number;
        tokens: string;
        value: string;
      };
      currency?: {
        code: string;
        prefix: string;
        suffix: string;
      };
    };
  };
}

export default function UserEditPage() {
  const { id } = useParams();
  const userId = parseInt(id || '0');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [vfAddAmount, setVfAddAmount] = useState("");
  const [vfAddReference, setVfAddReference] = useState("");
  const [vfRemoveCreditId, setVfRemoveCreditId] = useState("");
  const [creditAddedId, setCreditAddedId] = useState<number | null>(null);

  // Custom credits state
  const [customCreditAddAmount, setCustomCreditAddAmount] = useState("");
  const [customCreditAddReason, setCustomCreditAddReason] = useState("");
  const [customCreditRemoveAmount, setCustomCreditRemoveAmount] = useState("");
  const [customCreditRemoveReason, setCustomCreditRemoveReason] = useState("");

  // Fetch user data
  const { data: user, isLoading, error } = useQuery<User, Error, User>({
    queryKey: [`/api/admin/users/${userId}`],
    enabled: !isNaN(userId) && userId > 0,
    retry: 1
  });
  
  // Fetch VirtFusion usage data
  const {
    data: usageData,
    isLoading: isLoadingUsage,
    error: usageError
  } = useQuery<VirtFusionUsageData, Error>({
    queryKey: [`/api/admin/users/${userId}/usage`],
    enabled: !isNaN(userId) && userId > 0 && !!user?.virtFusionId,
    retry: 1
  });

  // Fetch custom credits data
  const {
    data: customCreditsData,
    isLoading: isLoadingCustomCredits,
    error: customCreditsError
  } = useQuery<{
    balance: number;
    transactions: any[];
    user: { id: number; username: string; email: string; fullName: string };
  }, Error>({
    queryKey: [`/api/admin/users/${userId}/custom-credits`],
    enabled: !isNaN(userId) && userId > 0,
    retry: 1
  });

  // Set up form with user data
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      fullName: "",
      email: "",
      role: "",
    },
  });

  // Update form values when user data is loaded
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      });
    }
  }, [user, form]);

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: "PATCH",
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: "User updated",
        description: "User information has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating user",
        description: error.message || "Failed to update user information",
        variant: "destructive",
      });
    }
  });

  // Using the password reset state hooks defined at the top of the component

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        body: {}
      });
    },
    onSuccess: (data) => {
      setTempPassword(data.temporaryPassword);
      setShowPasswordModal(true);
      toast({
        title: "Password reset successful",
        description: "A temporary password has been generated and an email has been sent to the user.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error resetting password",
        description: error.message || "Failed to reset user password",
        variant: "destructive",
      });
    }
  });

  // Update VirtFusion sync mutation
  const updateVirtFusionSyncMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/admin/users/${userId}/sync-virtfusion`, {
        method: "POST",
        body: {}
      });
    },
    onSuccess: () => {
      toast({
        title: "VirtFusion sync complete",
        description: "User has been synced with VirtFusion",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error syncing with VirtFusion",
        description: error.message || "Failed to sync user with VirtFusion",
        variant: "destructive",
      });
    }
  });
  
  // Add VirtFusion credit mutation
  const addVirtFusionCreditMutation = useMutation({
    mutationFn: async (data: { amount: string; reference?: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/virtfusion-credit`, {
        method: "POST",
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Credits added successfully",
        description: `Added ${vfAddAmount} credits to VirtFusion account.`,
      });
      
      // Display the credit ID that was returned
      if (data && data.creditId) {
        setCreditAddedId(data.creditId);
        toast({
          title: "Credit ID Assigned",
          description: `Credit ID: ${data.creditId} - Save this ID if you need to remove these credits later.`,
          variant: "default",
        });
      }
      
      // Clear the input fields
      setVfAddAmount("");
      setVfAddReference("");
      
      // Refresh the usage data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/usage`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding credits",
        description: error.message || "Failed to add credits to VirtFusion account",
        variant: "destructive",
      });
    }
  });
  
  // Remove VirtFusion credit mutation
  const removeVirtFusionCreditMutation = useMutation({
    mutationFn: async (data: { creditId: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/virtfusion-credit`, {
        method: "DELETE",
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Credits removed successfully",
        description: data.message || `Credit ID ${vfRemoveCreditId} removed successfully`,
      });
      
      // Clear the input fields
      setVfRemoveCreditId("");
      
      // Refresh user data and usage data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/usage`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing credits",
        description: error.message || "Failed to remove credits from VirtFusion account",
        variant: "destructive",
      });
    }
  });

  // Add custom credits mutation
  const addCustomCreditsMutation = useMutation({
    mutationFn: async (data: { amount: string; reason: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/custom-credits`, {
        method: "POST",
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Custom credits added successfully",
        description: `Added $${customCreditAddAmount} to user's custom credits balance.`,
      });

      // Clear the input fields
      setCustomCreditAddAmount("");
      setCustomCreditAddReason("");

      // Refresh the custom credits data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/custom-credits`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error adding custom credits",
        description: error.message || "Failed to add custom credits",
        variant: "destructive",
      });
    }
  });

  // Remove custom credits mutation
  const removeCustomCreditsMutation = useMutation({
    mutationFn: async (data: { amount: string; reason: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/custom-credits`, {
        method: "DELETE",
        body: data
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Custom credits removed successfully",
        description: `Removed $${customCreditRemoveAmount} from user's custom credits balance.`,
      });

      // Clear the input fields
      setCustomCreditRemoveAmount("");
      setCustomCreditRemoveReason("");

      // Refresh the custom credits data
      queryClient.invalidateQueries({ queryKey: [`/api/admin/users/${userId}/custom-credits`] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing custom credits",
        description: error.message || "Failed to remove custom credits",
        variant: "destructive",
      });
    }
  });

  // Handle form submission
  const onSubmit = (data: UserFormData) => {
    updateUserMutation.mutate(data);
  };

  // Handle reset password
  const handleResetPassword = () => {
    if (confirm("Are you sure you want to reset this user's password?")) {
      resetPasswordMutation.mutate();
    }
  };

  // Handle VirtFusion sync
  const handleVirtFusionSync = () => {
    updateVirtFusionSyncMutation.mutate();
  };
  
  // Handle adding VirtFusion credit
  const handleAddVirtFusionCredit = () => {
    if (!vfAddAmount || isNaN(Number(vfAddAmount)) || Number(vfAddAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }
    
    addVirtFusionCreditMutation.mutate({
      amount: vfAddAmount,
      reference: vfAddReference || undefined
    });
  };
  
  // Handle removing VirtFusion credit
  const handleRemoveVirtFusionCredit = () => {
    if (!vfRemoveCreditId || isNaN(Number(vfRemoveCreditId)) || Number(vfRemoveCreditId) <= 0) {
      toast({
        title: "Invalid credit ID",
        description: "Please enter a valid credit ID",
        variant: "destructive",
      });
      return;
    }
    
    if (confirm(`Are you sure you want to remove credit ID ${vfRemoveCreditId} from VirtFusion? This action cannot be undone.`)) {
      removeVirtFusionCreditMutation.mutate({
        creditId: vfRemoveCreditId
      });
    }
  };

  // Handle adding custom credits
  const handleAddCustomCredits = () => {
    if (!customCreditAddAmount || isNaN(Number(customCreditAddAmount)) || Number(customCreditAddAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }

    if (!customCreditAddReason || customCreditAddReason.trim().length === 0) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for adding credits",
        variant: "destructive",
      });
      return;
    }

    addCustomCreditsMutation.mutate({
      amount: customCreditAddAmount,
      reason: customCreditAddReason
    });
  };

  // Handle removing custom credits
  const handleRemoveCustomCredits = () => {
    if (!customCreditRemoveAmount || isNaN(Number(customCreditRemoveAmount)) || Number(customCreditRemoveAmount) <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid credit amount",
        variant: "destructive",
      });
      return;
    }

    if (!customCreditRemoveReason || customCreditRemoveReason.trim().length === 0) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for removing credits",
        variant: "destructive",
      });
      return;
    }

    if (confirm(`Are you sure you want to remove $${customCreditRemoveAmount} from this user's custom credits? This action cannot be undone.`)) {
      removeCustomCreditsMutation.mutate({
        amount: customCreditRemoveAmount,
        reason: customCreditRemoveReason
      });
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[500px]">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading user information...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !user) {
    console.error("User data fetch error details:", { 
      error, 
      userId, 
      isDataNull: !user,
      errorType: error ? (error instanceof Error ? 'Error object' : typeof error) : 'No error object',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      request: `/api/admin/users/${userId}`
    });
    
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[500px]">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-2xl font-semibold mb-2">User Not Found</h2>
          <p className="text-gray-600 mb-6">The user you're looking for doesn't exist or you don't have permission to view it.</p>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4 max-w-lg">
              <p className="font-medium text-red-800 mb-1">Error Details:</p>
              <p className="text-red-700 text-sm">{error instanceof Error ? error.message : JSON.stringify(error)}</p>
              <p className="text-red-700 text-sm mt-2">Request URL: {`/api/admin/users/${userId}`}</p>
            </div>
          )}
          <Button onClick={() => navigate("/admin/users")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Using the passwordCopied state defined at the top of the component
  
  // Block users from editing admins unless they're admins themselves
  const canEdit = currentUser?.role === "admin" || user.role !== "admin";

  // Handle copying password to clipboard
  const copyPasswordToClipboard = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword).then(() => {
        setPasswordCopied(true);
        setTimeout(() => setPasswordCopied(false), 2000);
      });
    }
  };

  return (
    <AdminLayout>
      {/* Password Reset Dialog */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset</DialogTitle>
            <DialogDescription>
              The user's password has been reset successfully. An email has been sent to the user with the new password.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 my-2 bg-gray-50 rounded-md border">
            <div className="text-sm text-gray-500 mb-1">Temporary password:</div>
            <div className="flex items-center space-x-2">
              <div className="bg-white p-2 rounded border flex-1 font-mono text-sm">
                {tempPassword}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={copyPasswordToClipboard}
                className="flex items-center gap-1"
              >
                {passwordCopied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </Button>
            </div>
          </div>
          <DialogFooter className="sm:justify-end">
            <Button 
              variant="default" 
              onClick={() => setShowPasswordModal(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center mb-2">
            <Button 
              variant="ghost" 
              className="mr-2 -ml-4" 
              onClick={() => navigate("/admin/users")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold">Edit User: {user.fullName}</h1>
          </div>
          <p className="text-gray-500 mt-1">Update user information and manage their settings</p>
        </div>
        <div className="mt-4 md:mt-0 space-x-2">
          <Button
            variant="secondary"
            onClick={handleResetPassword}
            disabled={resetPasswordMutation.isPending}
          >
            {resetPasswordMutation.isPending ? (
              <>
                <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                Resetting...
              </>
            ) : (
              <>Reset Password</>
            )}
          </Button>
          {user.virtFusionId ? (
            <Button variant="outline" className="text-blue-600" disabled={true}>
              <ShieldAlert className="h-4 w-4 mr-2" />
              VirtFusion Linked
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="text-amber-600"
              onClick={handleVirtFusionSync}
              disabled={updateVirtFusionSyncMutation.isPending}
            >
              {updateVirtFusionSyncMutation.isPending ? (
                <>
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                  Syncing...
                </>
              ) : (
                <>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Sync with VirtFusion
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">User Information</CardTitle>
          <CardDescription>Basic user account details</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Username</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.username}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">VirtFusion ID</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.virtFusionId || <span className="text-amber-600">Not linked</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Joined</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Edit Form */}
      <Card>
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b px-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="profile" className="data-[state=active]:bg-background">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="permissions" className="data-[state=active]:bg-background">
                <UserCog className="h-4 w-4 mr-2" />
                Permissions
              </TabsTrigger>
              <TabsTrigger value="customCredits" className="data-[state=active]:bg-background">
                <CreditCard className="h-4 w-4 mr-2" />
                Custom Credits
              </TabsTrigger>
              {user.virtFusionId && (
                <TabsTrigger value="credits" className="data-[state=active]:bg-background">
                  <CreditCard className="h-4 w-4 mr-2" />
                  VirtFusion Credits
                </TabsTrigger>
              )}
              {user.virtFusionId && (
                <TabsTrigger value="usage" className="data-[state=active]:bg-background">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Usage
                </TabsTrigger>
              )}
            </TabsList>
          </CardHeader>

          <form onSubmit={form.handleSubmit(onSubmit)}>
            <TabsContent value="profile" className="m-0">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName"
                      {...form.register("fullName")}
                      disabled={!canEdit || updateUserMutation.isPending}
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{form.formState.errors.fullName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      {...form.register("email")}
                      disabled={!canEdit || updateUserMutation.isPending}
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </TabsContent>

            <TabsContent value="permissions" className="m-0">
              <CardContent className="p-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(value) => {
                        form.setValue("role", value, { 
                          shouldDirty: true,  // This will mark the form as dirty
                          shouldTouch: true   // This marks the field as touched
                        });
                      }}
                      disabled={!canEdit || currentUser?.id === user.id || updateUserMutation.isPending}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="client">Client</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.role && (
                      <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.getValues("role") === "admin" 
                        ? "Administrators have full access to all features and settings." 
                        : "Clients can manage their own servers and billing."}
                    </p>
                  </div>

                  {currentUser?.id === user.id && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Restricted</AlertTitle>
                      <AlertDescription>
                        You cannot change your own role.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </TabsContent>

            {user.virtFusionId && (
              <TabsContent value="credits" className="m-0">
                <CardContent className="p-6">
                  <div className="space-y-8">
                    {/* VirtFusion Credit Display - Main Credit Source */}
                    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">VirtFusion Credits <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded ml-2">Primary</span></h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="text-sm font-medium text-muted-foreground">Token Balance</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {usageData && usageData.data && usageData.data.data && usageData.data.data.credit && usageData.data.data.credit.tokens
                              ? parseFloat(usageData.data.data.credit.tokens).toLocaleString() 
                              : "0"} <span className="text-sm font-normal">tokens</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            100 tokens = $1.00 USD
                          </p>
                        </div>
                        <div className="bg-white rounded p-3 shadow-sm">
                          <div className="text-sm font-medium text-muted-foreground">USD Value</div>
                          <div className="text-2xl font-bold text-blue-600">
                            ${usageData && usageData.data && usageData.data.data && usageData.data.data.credit && usageData.data.data.credit.value
                              ? parseFloat(usageData.data.data.credit.value.replace(/,/g, '')).toFixed(2)
                              : "0.00"}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on current exchange rate
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 mt-3">
                        <Info className="h-3 w-3 inline mr-1" /> VirtFusion credits are managed through the VirtFusion API
                      </p>
                    </div>
                    {/* VirtFusion Credits Actions */}
                    <div>
                      <h3 className="text-lg font-medium mb-4">VirtFusion Credits</h3>
                      <div className="space-y-6">
                        {/* Add Credits Form */}
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <h4 className="font-medium mb-3">Add Credits to VirtFusion</h4>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="vfAddCredits">Amount (Tokens)</Label>
                              <Input
                                id="vfAddCredits"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="100"
                                value={vfAddAmount}
                                onChange={(e) => setVfAddAmount(e.target.value)}
                                disabled={addVirtFusionCreditMutation.isPending}
                              />
                              <p className="text-xs text-muted-foreground">
                                100 tokens = $1.00 USD in VirtFusion
                              </p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="vfAddReference">Reference (Optional)</Label>
                              <Input
                                id="vfAddReference"
                                placeholder="Invoice #12345"
                                value={vfAddReference}
                                onChange={(e) => setVfAddReference(e.target.value)}
                                disabled={addVirtFusionCreditMutation.isPending}
                              />
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button
                              type="button"
                              onClick={handleAddVirtFusionCredit}
                              disabled={!vfAddAmount || addVirtFusionCreditMutation.isPending}
                              size="sm"
                            >
                              {addVirtFusionCreditMutation.isPending ? (
                                <>
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                                  Adding...
                                </>
                              ) : (
                                <>Add Credits</>
                              )}
                            </Button>
                          </div>
                        </div>
                        {/* Remove Credits Form */}
                        <div className="border rounded-lg p-4 bg-muted/20">
                          <h4 className="font-medium mb-3">Remove Credits from VirtFusion</h4>
                          <div className="grid gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="vfRemoveCredits">Credit ID</Label>
                              <Input
                                id="vfRemoveCredits"
                                type="number"
                                min="1"
                                step="1"
                                placeholder="123"
                                value={vfRemoveCreditId}
                                onChange={(e) => setVfRemoveCreditId(e.target.value)}
                                disabled={removeVirtFusionCreditMutation.isPending}
                              />
                              <p className="text-xs text-muted-foreground">
                                The Credit ID is returned when credits are added to VirtFusion
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-end">
                            <Button
                              type="button"
                              onClick={handleRemoveVirtFusionCredit}
                              disabled={!vfRemoveCreditId || removeVirtFusionCreditMutation.isPending}
                              size="sm"
                              variant="destructive"
                            >
                              {removeVirtFusionCreditMutation.isPending ? (
                                <>
                                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                                  Removing...
                                </>
                              ) : (
                                <>Remove Credits</>
                              )}
                            </Button>
                          </div>
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800">
                          <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-medium">VirtFusion Credits Note</p>
                              <p className="mt-1 text-sm">
                                Credits added to VirtFusion are managed separately from our local system.
                                The Credit ID is required to remove credits and is returned in the API response
                                when credits are added.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </TabsContent>
            )}

            <Separator />
            
            {activeTab !== 'usage' && (
              <CardFooter className="p-6">
                <div className="flex justify-end w-full">
                  <Button 
                    type="submit"
                    disabled={!canEdit || updateUserMutation.isPending || !form.formState.isDirty}
                  >
                    {updateUserMutation.isPending ? (
                      <>
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </CardFooter>
            )}
          </form>
          
          {/* Usage Data Tab */}
          {user.virtFusionId && (
            <TabsContent value="usage" className="m-0">
              <CardContent className="p-6">
                {isLoadingUsage ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                    <p className="text-muted-foreground">Loading usage data...</p>
                  </div>
                ) : usageError ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-lg font-medium mb-2">Failed to load usage data</h3>
                    <p className="text-muted-foreground text-center max-w-md mb-4">
                      We couldn't retrieve the resource usage information from VirtFusion. 
                      This may be due to a temporary connection issue.
                    </p>
                    <p className="text-sm text-red-600">
                      {usageError instanceof Error ? usageError.message : 'Unknown error'}
                    </p>
                  </div>
                ) : !usageData || !usageData.data || !usageData.data.data || !usageData.data.data.credit ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <Database className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No usage data available</h3>
                    <p className="text-muted-foreground text-center max-w-md">
                      This user doesn't have any resource usage data in VirtFusion yet.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* User Information */}
                    <div className="bg-muted/40 rounded-lg p-4">
                      <h3 className="text-lg font-medium mb-2">VirtFusion Account</h3>
                      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {usageData.data.data && usageData.data.data.user && usageData.data.data.user.name ? (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                            <dd className="text-sm">{usageData.data.data.user.name}</dd>
                          </div>
                        ) : (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                            <dd className="text-sm">{user.fullName}</dd>
                          </div>
                        )}
                        
                        {usageData.data.data && usageData.data.data.user && usageData.data.data.user.email ? (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                            <dd className="text-sm">{usageData.data.data.user.email}</dd>
                          </div>
                        ) : (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                            <dd className="text-sm">{user.email}</dd>
                          </div>
                        )}
                        
                        {usageData.data.data && usageData.data.data.user && usageData.data.data.user.hasOwnProperty('enabled') ? (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                            <dd className="text-sm">
                              {usageData.data.data.user.enabled ? (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700">
                                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-50 text-red-700">
                                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                                  Suspended
                                </span>
                              )}
                            </dd>
                          </div>
                        ) : (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                            <dd className="text-sm">
                              {user.isActive ? (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700">
                                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-50 text-red-700">
                                  <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                                  Suspended
                                </span>
                              )}
                            </dd>
                          </div>
                        )}
                        
                        {usageData.data.data && usageData.data.data.user && usageData.data.data.user.hasOwnProperty('selfService') && (
                          <div>
                            <dt className="text-sm font-medium text-muted-foreground">Self Service</dt>
                            <dd className="text-sm">{usageData.data.data.user.selfService ? 'Enabled' : 'Disabled'}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    
                    {/* Token Balance */}
                    {usageData.data && usageData.data.data && usageData.data.data.credit && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-2 text-blue-800">VirtFusion Credit Balance</h3>
                        <div className="flex flex-wrap gap-4">
                          <div className="bg-white rounded p-3 shadow-sm flex-1">
                            <dt className="text-sm font-medium text-muted-foreground">Token Balance</dt>
                            <dd className="text-2xl font-bold text-blue-600">
                              {usageData && usageData.data && usageData.data.data && usageData.data.data.credit && usageData.data.data.credit.tokens
                                ? parseFloat(usageData.data.data.credit.tokens).toLocaleString()
                                : "0"} <span className="text-sm font-normal">tokens</span>
                            </dd>
                            <p className="text-xs text-muted-foreground mt-1">
                              100 tokens = $1.00 USD
                            </p>
                          </div>
                          <div className="bg-white rounded p-3 shadow-sm flex-1">
                            <dt className="text-sm font-medium text-muted-foreground">USD Value</dt>
                            <dd className="text-2xl font-bold text-blue-600">
                              ${usageData && usageData.data && usageData.data.data && usageData.data.data.credit && usageData.data.data.credit.value
                                ? parseFloat(usageData.data.data.credit.value.replace(/,/g, '')).toFixed(2)
                                : "0.00"}
                            </dd>
                            <p className="text-xs text-muted-foreground mt-1">
                              Based on current exchange rate
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Monthly Usage */}
                    {usageData.data && usageData.data.data && usageData.data.data.monthlyTotal && (
                      <div className="bg-muted/30 p-4 rounded-md my-4">
                        <h3 className="text-lg font-medium mb-2">Current Monthly Usage</h3>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Period</p>
                            <p className="text-lg font-medium">{usageData.data.data.period || 'Current Month'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Servers</p>
                            <p className="text-lg font-medium">{usageData.data.data.servers || 0}</p>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-md">
                          <h4 className="text-base font-medium mb-2">Monthly Total</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-muted-foreground">Hours</p>
                              <p className="text-lg font-medium">{usageData.data.data.monthlyTotal.hours || 0}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Value</p>
                              <p className="text-lg font-medium">
                                {usageData.data.data.currency?.prefix || '$'}
                                {usageData.data.data.monthlyTotal.value || '0.00'}
                                {usageData.data.data.currency?.suffix || ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Resource Usage */}
                    {usageData.data && usageData.data.data && usageData.data.data.periods && Array.isArray(usageData.data.data.periods) && usageData.data.data.periods.length > 0 && (
                      <div>
                        <h3 className="text-lg font-medium mb-4">Resource Usage</h3>
                        
                        {usageData.data.data.periods.map((period) => (
                          <div key={period.id || `period-${Math.random()}`} className="mb-6">
                            <div className="flex flex-wrap items-baseline justify-between mb-3">
                              <h4 className="text-base font-medium">{period.name || 'Current Period'}</h4>
                              <p className="text-sm text-muted-foreground">
                                {period.startDate ? formatDate(period.startDate) : ''} 
                                {period.startDate && period.endDate ? ' - ' : ''}
                                {period.endDate ? formatDate(period.endDate) : ''}
                              </p>
                            </div>
                            
                            {/* Resources */}
                            <div className="space-y-5">
                              {period.resources && Array.isArray(period.resources) && period.resources.length > 0 ? (
                                period.resources.map((resource, index) => (
                                  <div key={`${period.id || 'period'}-${index}`} className="bg-muted/30 p-4 rounded-md">
                                    <div className="flex justify-between mb-1">
                                      <div className="font-medium text-sm">
                                        {resource.name || 'Resource'} {resource.unit ? `(${resource.unit})` : ''}
                                      </div>
                                      <div className="text-sm">
                                        {resource.consumed ?? 0} / {resource.allocated ?? 0}
                                      </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div 
                                        className="bg-primary h-2 rounded-full" 
                                        style={{ 
                                          width: `${Math.min(100, (resource.allocated ?? 0) > 0 ? 
                                            ((resource.consumed ?? 0) / (resource.allocated ?? 1)) * 100 : 0
                                          )}%` 
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-muted-foreground text-sm">No resource data available for this period.</p>
                              )}
                            </div>
                            
                            {/* Servers */}
                            {period.servers && Array.isArray(period.servers) && period.servers.length > 0 && (
                              <div className="mt-4">
                                <h5 className="text-sm font-medium mb-2">Servers</h5>
                                <div className="bg-muted/30 rounded-md overflow-hidden">
                                  <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-muted/50">
                                      <tr>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          ID
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Name
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                          Hostname
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                      {period.servers.map((server) => (
                                        <tr key={server.id || `server-${Math.random()}`}>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {server.id || 'N/A'}
                                          </td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {server.name || 'Unnamed Server'}
                                          </td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                                            {server.hostname || 'No hostname'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </TabsContent>
          )}

          {/* Custom Credits Tab */}
          <TabsContent value="customCredits" className="m-0">
            <CardContent className="p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Custom Credits Management</h3>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className={`text-2xl font-bold ${(customCreditsData?.balance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${(customCreditsData?.balance || 0).toFixed(2)}
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Add Credits Section */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-base font-medium mb-4 text-green-800">Add Custom Credits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customCreditAddAmount">Amount ($)</Label>
                      <Input
                        id="customCreditAddAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={customCreditAddAmount}
                        onChange={(e) => setCustomCreditAddAmount(e.target.value)}
                        disabled={addCustomCreditsMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customCreditAddReason">Reason</Label>
                      <Input
                        id="customCreditAddReason"
                        placeholder="Reason for adding credits"
                        value={customCreditAddReason}
                        onChange={(e) => setCustomCreditAddReason(e.target.value)}
                        disabled={addCustomCreditsMutation.isPending}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleAddCustomCredits}
                    disabled={addCustomCreditsMutation.isPending || !customCreditAddAmount || !customCreditAddReason}
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    {addCustomCreditsMutation.isPending ? "Adding..." : "Add Credits"}
                  </Button>
                </div>

                {/* Remove Credits Section */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-base font-medium mb-4 text-red-800">Remove Custom Credits</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customCreditRemoveAmount">Amount ($)</Label>
                      <Input
                        id="customCreditRemoveAmount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={customCreditRemoveAmount}
                        onChange={(e) => setCustomCreditRemoveAmount(e.target.value)}
                        disabled={removeCustomCreditsMutation.isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customCreditRemoveReason">Reason</Label>
                      <Input
                        id="customCreditRemoveReason"
                        placeholder="Reason for removing credits"
                        value={customCreditRemoveReason}
                        onChange={(e) => setCustomCreditRemoveReason(e.target.value)}
                        disabled={removeCustomCreditsMutation.isPending}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleRemoveCustomCredits}
                    disabled={removeCustomCreditsMutation.isPending || !customCreditRemoveAmount || !customCreditRemoveReason}
                    variant="destructive"
                    className="mt-4"
                  >
                    {removeCustomCreditsMutation.isPending ? "Removing..." : "Remove Credits"}
                  </Button>
                </div>

                {/* Transaction History */}
                {customCreditsData?.transactions && customCreditsData.transactions.length > 0 && (
                  <div>
                    <h4 className="text-base font-medium mb-4">Recent Transactions</h4>
                    <div className="bg-muted/30 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-muted/50">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Date
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Type
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Amount
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Balance After
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {customCreditsData.transactions.slice(0, 10).map((transaction, index) => (
                            <tr key={transaction.id || index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {transaction.createdAt ? format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                  transaction.type === 'admin_add' ? 'bg-green-100 text-green-800' :
                                  transaction.type === 'admin_remove' ? 'bg-red-100 text-red-800' :
                                  transaction.type === 'purchase' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {transaction.type?.replace('_', ' ') || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <span className={`font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {transaction.amount >= 0 ? '+' : ''}${transaction.amount?.toFixed(2) || '0.00'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-sm">
                                {transaction.description || 'No description'}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                                ${transaction.balanceAfter?.toFixed(2) || '0.00'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isLoadingCustomCredits && (
                  <div className="flex justify-center items-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="ml-2 text-muted-foreground">Loading custom credits data...</p>
                  </div>
                )}

                {customCreditsError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>
                      Failed to load custom credits data: {customCreditsError.message}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>
    </AdminLayout>
  );
}