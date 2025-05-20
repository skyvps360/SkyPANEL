import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { User, Lock, Mail, UserCheck, Copy, Check, KeyRound, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Profile schema
const profileSchema = z.object({
  fullName: z.string().min(1, "FullName is required"),
  email: z.string().email("Invalid email address"),
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

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
    },
  });

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
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your username has been updated successfully and synced with VirtFusion.",
      });
      // Invalidate the user query to reflect changes
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
            </TabsList>
          </CardHeader>

          <TabsContent value="profile" className="m-0">
            <CardContent className="p-6">
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input 
                      id="fullName"
                      {...profileForm.register("fullName")}
                    />
                    {profileForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.fullName.message}</p>
                    )}
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
  );
}