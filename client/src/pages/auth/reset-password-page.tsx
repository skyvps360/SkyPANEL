import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, MailCheck, CheckCircle2, Copy } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getBrandColors } from "@/lib/brand-theme";

// Step 1: Request reset code schema
const requestResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

// Step 2: Verify reset code schema
const verifyCodeSchema = z.object({
  resetCode: z.string().min(1, "Reset code is required"),
});

// We don't need a reset password schema since we're using VirtFusion-generated passwords

type RequestResetFormData = z.infer<typeof requestResetSchema>;
type VerifyCodeFormData = z.infer<typeof verifyCodeSchema>;

// Reset password flow steps
enum ResetStep {
  REQUEST = 'request',  // Step 1: Request reset code
  VERIFY = 'verify',    // Step 2: Verify reset code
  RESET = 'reset',      // Step 3: Set new password
  COMPLETE = 'complete' // Step 4: Reset complete
}

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<ResetStep>(ResetStep.REQUEST);
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [resetCode, setResetCode] = useState("");
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [passwordCopied, setPasswordCopied] = useState(false);
  
  // Brand-related state
  const [brandColors, setBrandColors] = useState<ReturnType<typeof getBrandColors> | null>(null);
  const [brandStyle, setBrandStyle] = useState<React.CSSProperties>({});
  const [brandingLoaded, setBrandingLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Fetch branding settings
  useEffect(() => {
    // Fetch branding settings on component mount
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return { 
          company_name: 'SkyVPS360', 
          primary_color: '2563eb',
          secondary_color: '10b981',
          accent_color: 'f59e0b'
        };
      })
      .then(data => {
        // Generate brand colors using the new system
        const colors = getBrandColors({
          primaryColor: data.primary_color || data.company_color || '2563eb',
          secondaryColor: data.secondary_color || '10b981',
          accentColor: data.accent_color || 'f59e0b'
        });
        
        // Store colors for use throughout the component
        setBrandColors(colors);
        
        // Set consistent brand styles
        setBrandStyle({
          backgroundColor: colors.primary.full,
          color: 'white',
          borderColor: colors.primary.full
        });
        
        // Update CSS variables for components that use them
        document.documentElement.style.setProperty('--color-brand', colors.primary.full);
        
        // Override the ring color for input focus
        document.documentElement.style.setProperty('--ring', colors.primary.hex);
        
        // Create a style that targets input focus rings
        // Remove any existing focus style element first to prevent duplicates
        const existingStyle = document.getElementById('brand-focus-style-reset');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const focusStyle = document.createElement('style');
        focusStyle.id = 'brand-focus-style-reset';
        focusStyle.innerHTML = `
          input:focus-visible, 
          input:focus,
          textarea:focus,
          select:focus,
          button:focus {
            outline-color: ${colors.primary.full} !important;
            border-color: ${colors.primary.full} !important;
            ring-color: ${colors.primary.full} !important;
            --ring-color: ${colors.primary.full} !important;
            box-shadow: 0 0 0 1px ${colors.primary.full} !important;
          }
          
          input::selection {
            background-color: ${colors.primary.full}30 !important;
          }
        `;
        document.head.appendChild(focusStyle);
        
        // Mark branding as loaded to trigger rendering
        setBrandingLoaded(true);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch branding settings:', error);
        setIsLoading(false);
      });
  }, []);
  
  // Step 1: Request reset code form
  const requestForm = useForm<RequestResetFormData>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Step 2: Verify reset code form
  const verifyForm = useForm<VerifyCodeFormData>({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: {
      resetCode: "",
    },
  });
  
  // We don't need a reset form anymore since we're using VirtFusion-generated passwords
  
  // Step 1: Request password reset mutation
  const requestResetMutation = useMutation({
    mutationFn: async (data: RequestResetFormData) => {
      return await apiRequest("/api/auth/request-password-reset", {
        method: "POST", 
        body: data
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setEmail(requestForm.getValues().email);
        setCurrentStep(ResetStep.VERIFY);
        toast({
          title: "Reset code sent",
          description: "Check your email for the reset code.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send reset code. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset code. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Step 2: Verify reset code mutation
  const verifyCodeMutation = useMutation({
    mutationFn: async (data: { email: string, resetCode: string }) => {
      return await apiRequest("/api/auth/verify-reset-code", {
        method: "POST",
        body: data
      });
    },
    onSuccess: (data) => {
      if (data.success && data.userId) {
        setUserId(data.userId);
        setResetCode(verifyForm.getValues().resetCode);
        setCurrentStep(ResetStep.RESET);
      } else {
        toast({
          title: "Invalid code",
          description: data.message || "The reset code is invalid or has expired.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to verify reset code. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Step 3: Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { userId: number, resetCode: string }) => {
      return await apiRequest("/api/auth/reset-password", {
        method: "POST",
        body: data
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        if (data.temporaryPassword) {
          // Store the temporary password returned by VirtFusion
          setTemporaryPassword(data.temporaryPassword);
        }
        setCurrentStep(ResetStep.COMPLETE);
        toast({
          title: "Password reset successful",
          description: "Your password has been reset successfully.",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to reset password. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Form submission handlers
  const onRequestSubmit = async (data: RequestResetFormData) => {
    try {
      await requestResetMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled by the mutation
    }
  };
  
  const onVerifySubmit = async (data: VerifyCodeFormData) => {
    try {
      await verifyCodeMutation.mutateAsync({
        email,
        resetCode: data.resetCode,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };
  
  const resetPassword = async () => {
    try {
      if (userId === null) {
        toast({
          title: "Error",
          description: "User ID is missing. Please start the password reset process again.",
          variant: "destructive",
        });
        return;
      }
      
      await resetPasswordMutation.mutateAsync({
        userId,
        resetCode,
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };
  
  // Copy password to clipboard
  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(temporaryPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };
  
  // Return loading state if branding isn't loaded yet
  if (isLoading || !brandingLoaded) {
    return (
      <AuthLayout
        heroTitle="Reset Your Password"
        heroSubtitle="Follow the steps to securely reset your password and regain access to your account."
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heroTitle="Reset Your Password"
      heroSubtitle="Follow the steps to securely reset your password and regain access to your account."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">
            {currentStep === ResetStep.REQUEST && "Forgot Password"}
            {currentStep === ResetStep.VERIFY && "Verify Reset Code"}
            {currentStep === ResetStep.RESET && "Create New Password"}
            {currentStep === ResetStep.COMPLETE && "Password Reset Complete"}
          </CardTitle>
          <CardDescription>
            {currentStep === ResetStep.REQUEST && "Enter your email to receive a password reset code"}
            {currentStep === ResetStep.VERIFY && "Enter the 6-digit code sent to your email"}
            {currentStep === ResetStep.RESET && "Create a new secure password for your account"}
            {currentStep === ResetStep.COMPLETE && "Your password has been reset successfully"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentStep === ResetStep.REQUEST && (
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@example.com"
                  {...requestForm.register("email")}
                />
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{requestForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                style={brandStyle}
                disabled={requestResetMutation.isPending}
              >
                {requestResetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Code"
                )}
              </Button>
            </form>
          )}
          
          {currentStep === ResetStep.VERIFY && (
            <form onSubmit={verifyForm.handleSubmit(onVerifySubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetCode">Reset Code</Label>
                <Input
                  id="resetCode"
                  type="text"
                  placeholder="Enter 6-digit code"
                  {...verifyForm.register("resetCode")}
                />
                {verifyForm.formState.errors.resetCode && (
                  <p className="text-sm text-destructive">{verifyForm.formState.errors.resetCode.message}</p>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                <p>A reset code has been sent to: <span className="font-medium">{email}</span></p>
                <p className="mt-1">Check your spam folder if you don't see it in your inbox.</p>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep(ResetStep.REQUEST)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  style={brandStyle}
                  disabled={verifyCodeMutation.isPending}
                >
                  {verifyCodeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </div>
              <Button
                type="button"
                variant="link"
                className="w-full"
                disabled={requestResetMutation.isPending}
                onClick={() => onRequestSubmit(requestForm.getValues())}
                style={{ color: brandColors?.primary.full || '#2563eb' }}
              >
                {requestResetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Didn't receive a code? Send again"
                )}
              </Button>
            </form>
          )}
          
          {currentStep === ResetStep.RESET && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-md text-amber-800">
                <h3 className="text-lg font-medium mb-2">System-Generated Password</h3>
                <p className="text-sm mb-2">
                  For security reasons, we use system-generated passwords that sync with your datacenter account.
                </p>
                <p className="text-sm">
                  Click the button below to reset your password. You will receive a temporary password to log in with.
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep(ResetStep.VERIFY)}
                >
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  style={brandStyle}
                  onClick={resetPassword}
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Generate New Password"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {currentStep === ResetStep.COMPLETE && (
            <div className="text-center py-6">
              <CheckCircle2 
                className="h-12 w-12 mx-auto mb-4" 
                style={{ color: brandColors?.primary.full || '#2563eb' }}
              />
              <h3 className="text-lg font-medium mb-2">Password Reset Successful</h3>
              
              {temporaryPassword ? (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-2">
                    Your password has been reset successfully. Use the temporary password below to log in.
                  </p>
                  <div className="p-4 my-4 bg-gray-50 rounded-md border mx-auto max-w-xs">
                    <div className="text-sm text-gray-500 mb-1">Temporary password:</div>
                    <div className="flex items-center space-x-2">
                      <div className="bg-white p-2 rounded border flex-1 font-mono text-sm overflow-x-auto">
                        {temporaryPassword}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copyPasswordToClipboard}
                        className="flex items-center gap-1"
                      >
                        {passwordCopied ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5" />
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
                  <p className="text-sm text-amber-600 font-medium">
                    Please copy this password now. For security, it won't be shown again.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-6">
                  Your password has been reset successfully. You can now log in.
                </p>
              )}
              
              <Button
                onClick={() => navigate("/auth")}
                className="mx-auto"
                style={brandStyle}
              >
                Return to Login
              </Button>
            </div>
          )}
        </CardContent>
        {currentStep !== ResetStep.COMPLETE && (
          <CardFooter className="flex justify-between">
            <Button
              variant="link"
              size="sm"
              className="px-0"
              onClick={() => navigate("/auth")}
              style={{ color: brandColors?.primary.full || '#2563eb' }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
            {currentStep === ResetStep.REQUEST && (
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate("/auth/forgot-username")}
                style={{ color: brandColors?.primary.full || '#2563eb' }}
              >
                Forgot Username?
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </AuthLayout>
  );
}