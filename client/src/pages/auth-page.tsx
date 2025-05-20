import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { insertUserSchema } from "@shared/schema";
import { Loader2, AlertCircle } from "lucide-react";
import confetti from "canvas-confetti";
import { PasswordStrengthMeter } from "@/components/password-strength-meter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getBrandColors } from "@/lib/brand-theme";

// Extend schema for validation
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string()
    .min(8, "Password must be at least 8 characters long")
    .refine((password) => {
      // Basic password strength requirements
      const hasLowerCase = /[a-z]/.test(password);
      const hasUpperCase = /[A-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);
      
      // Require at least 3 of the 4 criteria for a strong password
      const criteriaCount = [hasLowerCase, hasUpperCase, hasNumber, hasSpecialChar].filter(Boolean).length;
      return criteriaCount >= 2;
    }, "Password should contain at least 2 of the following: lowercase letters, uppercase letters, numbers, special characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, loginMutation, registerMutation, isLoading } = useAuth();
  const [companyName, setCompanyName] = useState<string>("VirtFusion");
  const [verificationNeeded, setVerificationNeeded] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string>("");
  const [userId, setUserId] = useState<number | null>(null);
  const [redirectingToDashboard, setRedirectingToDashboard] = useState<boolean>(false);
  
  // Track brand colors for consistent theming
  const [brandColors, setBrandColors] = useState<ReturnType<typeof getBrandColors> | null>(null);
  const [brandStyle, setBrandStyle] = useState<{ [key: string]: string }>({});
  // Add a state to track if branding is loaded
  const [brandingLoaded, setBrandingLoaded] = useState<boolean>(false);

  useEffect(() => {
    // Fetch branding settings on component mount
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return { 
          company_name: 'VirtFusion', 
          primary_color: '2563eb',
          secondary_color: '10b981',
          accent_color: 'f59e0b'
        };
      })
      .then(data => {
        if (data.company_name) {
          setCompanyName(data.company_name);
        }
        
        // Generate brand colors using the new system
        const colors = getBrandColors({
          primaryColor: data.primary_color || data.company_color || '2563eb',
          secondaryColor: data.secondary_color || '10b981',
          accentColor: data.accent_color || 'f59e0b'
        });
        
        // Store the colors for use throughout the component
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
        const existingStyle = document.getElementById('brand-focus-style');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const focusStyle = document.createElement('style');
        focusStyle.id = 'brand-focus-style';
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
      })
      .catch(error => {
        console.error('Failed to fetch branding settings:', error);
      });
  }, []);
  
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      fullName: "",
    },
  });

  // Handle redirect if already logged in
  useEffect(() => {
    if (user && !redirectingToDashboard) {
      setRedirectingToDashboard(true);
      navigate("/dashboard");
    }
  }, [user, navigate, redirectingToDashboard]);

  // Function to trigger confetti celebration
  const triggerConfettiCelebration = () => {
    const duration = 2000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      // Burst confetti from both sides
      // Get the brand color dynamically
      const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--color-brand').trim() || '#2563eb';
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: [brandColor, brandColor + 'CC', brandColor + '99', '#F4B400']
      });
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: [brandColor, brandColor + 'CC', brandColor + '99', '#F4B400']
      });
    }, 250);
  };

  // Store registration data for post-registration effects
  const [registrationData, setRegistrationData] = useState<{
    response: any;
    email: string;
  } | null>(null);

  // Handle post-registration effects separately from form submission
  useEffect(() => {
    if (!registrationData) return;
    
    const { response, email } = registrationData;
    
    // Only show verification needed if the registration succeeded and email verification is required
    if (response && response.id && !response.isVerified) {
      console.log("Setting verification mode for new user:", { 
        email, 
        userId: response.id, 
        emailSent: response.emailVerificationSent === true
      });
      
      // Set verification mode instead of redirecting
      setVerificationNeeded(true);
      setVerificationEmail(email);
      setUserId(response.id);
      
      toast({
        title: "Registration successful",
        description: "Please check your email for a verification code.",
      });
    } else {
      // If the user is already verified or verification is not required
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully.",
      });
      
      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
    }
    
    // Clear registration data to prevent duplicate effects
    setRegistrationData(null);
  }, [registrationData, navigate, toast]);

  const onRegisterSubmit = async (data: RegisterFormData) => {
    try {
      // Reset any existing verification state
      setVerificationNeeded(false);
      setVerificationEmail("");
      setUserId(null);
      
      const { confirmPassword, ...registrationData } = data;
      const response = await registerMutation.mutateAsync(registrationData);
      
      console.log("Registration response:", response);
      
      // Trigger confetti celebration for successful registration
      triggerConfettiCelebration();
      
      // Store the response data to be processed in the useEffect
      setRegistrationData({
        response,
        email: data.email
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      // Error handling is done by the mutation
    }
  };

  // Handle verification code submission
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>("");

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length < 6) {
      setVerificationError("Please enter a valid verification code");
      return;
    }

    setIsSubmittingCode(true);
    setVerificationError("");

    try {
      const response = await fetch("/api/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          verificationCode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success! Show confetti celebration
        triggerConfettiCelebration();
        
        toast({
          title: "Email verified",
          description: "Your email has been verified successfully.",
          variant: "default",
        });
        
        // Let user know what's happening next
        setTimeout(() => {
          toast({
            title: "Logging you in",
            description: "Please wait while we log you into your account.",
            variant: "default",
          });
        }, 1500);
        
        // Wait a moment for the celebration before redirecting
        setTimeout(() => {
          setVerificationNeeded(false);
          // Try to log in automatically or redirect to login
          navigate("/dashboard");
        }, 2500);
      } else {
        setVerificationError(data.message || "Verification failed. Please try again.");
      }
    } catch (error) {
      console.error("Error verifying email:", error);
      setVerificationError("An error occurred while verifying your email.");
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Handle resending verification code
  const handleResendVerification = async () => {
    if (!userId || !verificationEmail) return;

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          email: verificationEmail,
        }),
      });

      const data = await response.json();

      toast({
        title: data.success ? "Verification code sent" : "Error",
        description: data.message,
        variant: data.success ? "default" : "destructive",
      });
    } catch (error) {
      console.error("Error resending verification code:", error);
      toast({
        title: "Error",
        description: "Failed to resend verification code. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Store login error data for verification handling
  const [loginVerificationData, setLoginVerificationData] = useState<{
    error: any;
  } | null>(null);
  
  // Handle login verification needed via useEffect
  useEffect(() => {
    if (!loginVerificationData) return;
    
    const { error } = loginVerificationData;
    console.log("Processing login error:", error);
    
    // Check for verification error in the format provided by our updated queryClient
    if (error?.response?.status === 403 && error?.response?.data?.needsVerification) {
      console.log("Verification needed detected:", error.response.data);
      setVerificationNeeded(true);
      setVerificationEmail(error.response.data.email);
      setUserId(error.response.data.userId);
      
      // Show toast to inform user about verification
      toast({
        title: "Verification Required",
        description: "Your email address needs to be verified before you can log in.",
        variant: "default",
      });
    }
    
    // Clear the error data to prevent duplicate processing
    setLoginVerificationData(null);
  }, [loginVerificationData, toast]);

  // Handle login submission with verification check
  const onLoginSubmitWithVerification = async (data: LoginFormData) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({
        title: "Login successful",
        description: `Welcome back to ${companyName}`,
      });
      navigate("/dashboard");
    } catch (error: any) {
      // Store the error for processing in useEffect
      setLoginVerificationData({ error });
    }
  };

  // Render the appropriate content based on state
  const renderContent = () => {
    if (verificationNeeded) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Email Verification Required</CardTitle>
            <CardDescription className="text-center">
              Please check your email for a verification code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A verification code has been sent to {verificationEmail}
              </AlertDescription>
            </Alert>
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  placeholder="Enter your verification code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                />
                {verificationError && (
                  <p className="text-sm text-destructive">{verificationError}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmittingCode}
              >
                {isSubmittingCode ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="link"
                  onClick={handleResendVerification}
                  className="text-sm"
                >
                  Didn't receive the code? Resend
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVerificationNeeded(false)}
            >
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      );
    } else {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome to {companyName}</CardTitle>
            <CardDescription className="text-center">
              Manage your cloud servers with ease
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:text-white"
                  style={{
                    '--tab-brand-color': brandColors?.primary.full || '#2563eb',
                    ...(activeTab === "login" ? { backgroundColor: brandColors?.primary.full || '#2563eb', color: 'white' } : {})
                  } as React.CSSProperties}
                >
                  Login
                </TabsTrigger>
                <TabsTrigger 
                  value="register" 
                  className="data-[state=active]:text-white"
                  style={{
                    '--tab-brand-color': brandColors?.primary.full || '#2563eb',
                    ...(activeTab === "register" ? { backgroundColor: brandColors?.primary.full || '#2563eb', color: 'white' } : {})
                  } as React.CSSProperties}
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLoginSubmitWithVerification)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input 
                      id="login-username"
                      type="text"
                      {...loginForm.register("username")}
                    />
                    {loginForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{loginForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="flex justify-end mb-2">
                    <div className="space-x-4">
                      <Button 
                        type="button"
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto hover:opacity-80"
                        style={{ color: brandColors?.primary.full || '#2563eb' }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/auth/forgot-username");
                        }}
                      >
                        Forgot Username?
                      </Button>
                      <Button 
                        type="button"
                        variant="link" 
                        size="sm" 
                        className="p-0 h-auto hover:opacity-80"
                        style={{ color: brandColors?.primary.full || '#2563eb' }}
                        onClick={(e) => {
                          e.preventDefault();
                          navigate("/auth/reset-password");
                        }}
                      >
                        Forgot Password?
                      </Button>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    style={brandStyle}
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-fullname">Full Name</Label>
                    <Input 
                      id="register-fullname"
                      type="text"
                      {...registerForm.register("fullName")}
                    />
                    {registerForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.fullName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input 
                      id="register-email"
                      type="email"
                      {...registerForm.register("email")}
                    />
                    {registerForm.formState.errors.email && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.email.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input 
                      id="register-username"
                      type="text"
                      {...registerForm.register("username")}
                    />
                    {registerForm.formState.errors.username && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.username.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input 
                      id="register-password"
                      type="password"
                      {...registerForm.register("password")}
                    />
                    <PasswordStrengthMeter password={registerForm.watch("password")} />
                    {registerForm.formState.errors.password && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input 
                      id="register-confirm-password"
                      type="password"
                      {...registerForm.register("confirmPassword")}
                    />
                    {registerForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">{registerForm.formState.errors.confirmPassword.message}</p>
                    )}
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    style={brandStyle}
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              {activeTab === "login" ? (
                <>
                  Don't have an account?{" "}
                  <Button 
                    type="button"
                    variant="link" 
                    className="p-0 hover:opacity-80"
                    style={{ color: brandColors?.primary.full || '#2563eb' }}
                    onClick={() => setActiveTab("register")}
                  >
                    Register
                  </Button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <Button 
                    type="button"
                    variant="link" 
                    className="p-0 hover:opacity-80"
                    style={{ color: brandColors?.primary.full || '#2563eb' }}
                    onClick={() => setActiveTab("login")}
                  >
                    Login
                  </Button>
                </>
              )}
            </p>
          </CardFooter>
        </Card>
      );
    }
  };

  // Render the Auth Layout with the appropriate content
  return (
    <AuthLayout>
      {isLoading || redirectingToDashboard || !brandingLoaded ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : (
        renderContent()
      )}
    </AuthLayout>
  );
}