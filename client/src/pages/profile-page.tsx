import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Lock, Mail, UserCheck, Copy, Check, KeyRound, RefreshCw, ExternalLink, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getGravatarUrl, getUserInitials } from "@/lib/avatar-utils";
import { getBrandColors } from "@/lib/brand-theme";
import OAuthAccountLinking from "@/components/profile/OAuthAccountLinking";

// Profile schema
const profileSchema = z.object({
  fullName: z.string().min(1, "FullName is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
});

// Password reset schema (only needs current password)
const passwordResetSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordResetFormData = z.infer<typeof passwordResetSchema>;

export default function ProfilePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Fetch branding information for company name
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"]
  });


  
  // Brand colors for styling
  const brandColors = getBrandColors({
    primaryColor: '2563eb',
    secondaryColor: '10b981',
    accentColor: 'f59e0b'
  });

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      company: user?.company || "",
      address: user?.address || "",
    },
  });

  // Reset form when user data changes
  useEffect(() => {
    if (user) {
      profileForm.reset({
        fullName: user.fullName || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        company: user.company || "",
        address: user.address || "",
      });
    }
  }, [user, profileForm]);

  // Password reset form
  const passwordResetForm = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      currentPassword: "",
    },
  });

  // Copy password to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      return await apiRequest("/api/user/profile", {
        method: "PATCH",
        body: data
      });
    },
    onSuccess: (updatedUser) => {
      const companyName = branding?.company_name || "SkyPANEL";
      toast({
        title: "Profile updated",
        description: `Your ${companyName} account has been synced with VirtFusion.`,
      });
      // Update the user data in the cache with the response
      queryClient.setQueryData(["/api/user"], updatedUser);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "An error occurred while updating your profile",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation (gets new password from VirtFusion)
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: PasswordResetFormData) => {
      return await apiRequest("/api/auth/change-password", {
        method: "POST",
        body: {
          currentPassword: data.currentPassword,
          reset: true // Tell the server we want to reset, not change
        }
      });
    },
    onSuccess: (data) => {
      // Display the temporary password
      if (data.temporaryPassword) {
        setTemporaryPassword(data.temporaryPassword);
        setShowResetDialog(true);

        // Show warning toast if VirtFusion sync failed
        if (data.virtFusionWarning) {
          toast({
            title: "VirtFusion Synchronization Warning",
            description: `${data.virtFusionWarning}: ${data.virtFusionError || 'Unknown error'}`,
            variant: "destructive",
            duration: 6000,
          });
        } else {
          toast({
            title: "Password reset successful",
            description: "Your password has been reset. A confirmation email has been sent to your inbox.",
            duration: 4000,
          });
        }
      }
      passwordResetForm.reset();
    },
    onError: (error: any) => {
      console.error("Password reset error:", error);
      
      // Extract the error message from the response
      let errorMessage = "An error occurred while resetting your password";
      
      // Check if the error is a 401 authentication error (incorrect password)
      if (error.message?.includes("401")) {
        errorMessage = "The current password you entered is incorrect. Please try again.";
      } else if (error.message) {
        // Use the error message from the server
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to reset password",
        description: errorMessage,
        variant: "destructive",
        duration: 6000,
      });
    },
  });

  // Handle profile update
  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle password reset
  const onPasswordReset = (data: PasswordResetFormData) => {
    resetPasswordMutation.mutate(data);
  };

  return (
    <>

      <DashboardLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Account Settings</h1>
        <p className="text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      {/* Settings Tabs */}
      <Card>
        <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="border-b px-6">
            <TabsList className="bg-muted/50">
              <TabsTrigger value="profile" className="data-[state=active]:bg-background">
                <User className="h-4 w-4 mr-2" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="password" className="data-[state=active]:bg-background">
                <Lock className="h-4 w-4 mr-2" />
                Password
              </TabsTrigger>
              <TabsTrigger value="oauth" className="data-[state=active]:bg-background">
                <Shield className="h-4 w-4 mr-2" />
                OAuth Accounts
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <TabsContent value="profile" className="m-0">
            <CardContent className="p-6">
              {/* Profile Information Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium">Profile Information</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Manage your account details and preferences. Changes are automatically synchronized across all connected services.
                </p>
                
                {/* Enhanced explanation about profile fields */}
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-green-800 dark:text-green-200">
                      <p className="font-medium mb-1">Profile Field Types</p>
                      <p className="mb-2">
                        Your profile contains different types of information that serve various purposes across the platform.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Full Name:</strong> Synchronized with VirtFusion VPS management account</li>
                        <li><strong>First/Last Name:</strong> Used for internal CRM and account management</li>
                        <li><strong>Email Address:</strong> Primary contact method and login credential</li>
                        <li><strong>Profile Picture:</strong> Managed through Gravatar for consistency across services</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Avatar with Gravatar */}
              <div className="flex flex-col items-center mb-6">
                <Avatar className="h-24 w-24 mb-3">
                  <AvatarImage src={getGravatarUrl(user?.email, 192)} alt={user?.fullName || "User"} />
                  <AvatarFallback 
                    style={{ backgroundColor: brandColors.primary.full, color: 'white', fontSize: '1.5rem' }}
                  >
                    {getUserInitials(user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-gray-500 mb-2">
                  Profile picture provided by Gravatar
                </p>
                <a 
                  href="https://gravatar.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs flex items-center text-blue-600 hover:underline"
                >
                  Change at Gravatar.com <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </div>

              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <div className="space-y-6">
                  {/* Full Name - Syncs with VirtFusion */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName"
                      {...profileForm.register("fullName")}
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This field syncs with your VirtFusion account
                    </p>
                  </div>

                  {/* First Name and Last Name - Internal/HubSpot use */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input 
                        id="firstName"
                        {...profileForm.register("firstName")}
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.firstName.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Used for internal CRM and account management
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input 
                        id="lastName"
                        {...profileForm.register("lastName")}
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.lastName.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Used for internal CRM and account management
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input 
                      id="email"
                      type="email"
                      {...profileForm.register("email")}
                    />
                    {profileForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.email.message}</p>
                    )}
                  </div>

                  {/* Additional Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input 
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...profileForm.register("phone")}
                      />
                      {profileForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.phone.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Used for account support and notifications
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input 
                        id="company"
                        placeholder="Your Company Name"
                        {...profileForm.register("company")}
                      />
                      {profileForm.formState.errors.company && (
                        <p className="text-sm text-destructive">{profileForm.formState.errors.company.message}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Used for billing and account management
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address"
                      placeholder="123 Main St, City, State 12345"
                      {...profileForm.register("address")}
                    />
                    {profileForm.formState.errors.address && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.address.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Used for billing and account management
                    </p>
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-4 w-4 mr-2" />
                          Update Profile
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </TabsContent>

          <TabsContent value="password" className="m-0">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium">Reset Password</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Let the system generate a secure password for you. This will update your password for both this dashboard and VirtFusion.
                </p>
                
                {/* Enhanced explanation about dual password system */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">Dual Password System</p>
                      <p className="mb-2">
                        Your password is synchronized between your {branding?.company_name || "SkyPANEL"} account and your VirtFusion VPS management account. 
                        When you reset your password here, it will be updated in both systems simultaneously.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Use the same password to log into this dashboard</li>
                        <li>Use the same password to access your VirtFusion VPS control panel</li>
                        <li>Password changes are automatically synchronized between both systems</li>
                        <li>This ensures consistent access across all your hosting services</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={passwordResetForm.handleSubmit(onPasswordReset)}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="resetCurrentPassword">Current Password</Label>
                    <Input 
                      id="resetCurrentPassword"
                      type="password"
                      {...passwordResetForm.register("currentPassword")}
                    />
                    {passwordResetForm.formState.errors.currentPassword && (
                      <p className="text-sm text-destructive">{passwordResetForm.formState.errors.currentPassword.message}</p>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit"
                      disabled={resetPasswordMutation.isPending}
                    >
                      {resetPasswordMutation.isPending ? (
                        <>
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reset Password
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </TabsContent>

          <TabsContent value="oauth" className="m-0">
            <CardContent className="p-6">
              <div className="mb-6">
                <h3 className="text-lg font-medium">Social Account Linking</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Link your social accounts to enable OAuth login. You can link multiple accounts and use any of them to sign in.
                </p>
                
                {/* Enhanced explanation about OAuth SSO system */}
                <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-purple-800 dark:text-purple-200">
                      <p className="font-medium mb-1">OAuth Single Sign-On (SSO) System</p>
                      <p className="mb-2">
                        Connect your social accounts to enable secure, password-free authentication. This system allows you to sign in using your existing social media accounts.
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li><strong>Multiple Providers:</strong> Link Discord, GitHub, Google, and LinkedIn accounts</li>
                        <li><strong>Flexible Login:</strong> Use any linked account to sign in to your dashboard</li>
                        <li><strong>Secure Authentication:</strong> OAuth provides secure, token-based authentication</li>
                        <li><strong>Account Management:</strong> Link and unlink accounts at any time</li>
                        <li><strong>Fallback Access:</strong> Always maintain email/password access as backup</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <OAuthAccountLinking />
            </CardContent>
          </TabsContent>
        </Tabs>
      </Card>

      {/* Password Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Password Reset Successful</DialogTitle>
            <DialogDescription>
              Your password has been reset. A confirmation email has also been sent to your inbox.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 mt-2 bg-muted rounded-md">
            <div className="mb-2 text-sm font-medium">Your temporary password:</div>
            <div className="flex items-center gap-2">
              <div className="bg-background p-2 rounded font-mono text-sm w-full overflow-x-auto">
                {temporaryPassword}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyToClipboard} 
                className="shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-end gap-2 mt-2">
            <p className="text-sm text-muted-foreground sm:hidden">
              Use this password to log in
            </p>
            <Button 
              variant="default" 
              onClick={() => setShowResetDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
    </>
  );
}