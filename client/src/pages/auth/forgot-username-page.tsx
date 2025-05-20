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
import { Loader2, ArrowLeft, MailCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getBrandColors } from "@/lib/brand-theme";

const forgotUsernameSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type ForgotUsernameFormData = z.infer<typeof forgotUsernameSchema>;

export default function ForgotUsernamePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);
  
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
        const existingStyle = document.getElementById('brand-focus-style-username');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const focusStyle = document.createElement('style');
        focusStyle.id = 'brand-focus-style-username';
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
  
  const form = useForm<ForgotUsernameFormData>({
    resolver: zodResolver(forgotUsernameSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const requestUsernameMutation = useMutation({
    mutationFn: async (data: ForgotUsernameFormData) => {
      return await apiRequest("/api/auth/request-username", {
        method: "POST",
        body: data
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process your request. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = async (data: ForgotUsernameFormData) => {
    try {
      await requestUsernameMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled by the mutation
    }
  };
  
  // Return loading state if branding isn't loaded yet
  if (isLoading || !brandingLoaded) {
    return (
      <AuthLayout
        heroTitle="Recover Your Account"
        heroSubtitle="We'll help you get back to managing your cloud infrastructure in no time."
      >
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      heroTitle="Recover Your Account"
      heroSubtitle="We'll help you get back to managing your cloud infrastructure in no time."
    >
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Username</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you your username.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSubmitted ? (
            <div className="text-center py-6">
              <MailCheck 
                className="h-12 w-12 mx-auto mb-4" 
                style={{ color: brandColors?.primary.full || '#2563eb' }}
              />
              <h3 className="text-lg font-medium mb-2">Check Your Email</h3>
              <p className="text-sm text-muted-foreground mb-6">
                If your email is registered, we've sent your username to your email address.
              </p>
              <Button
                variant="outline"
                onClick={() => navigate("/auth")}
                className="mx-auto"
                style={{ borderColor: brandColors?.primary.full || '#2563eb', color: brandColors?.primary.full || '#2563eb' }}
              >
                Return to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="yourname@example.com"
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                style={brandStyle}
                disabled={requestUsernameMutation.isPending}
              >
                {requestUsernameMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Send Username"
                )}
              </Button>
            </form>
          )}
        </CardContent>
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
          <Button
            variant="link"
            size="sm"
            onClick={() => navigate("/auth/reset-password")}
            style={{ color: brandColors?.primary.full || '#2563eb' }}
          >
            Forgot Password?
          </Button>
        </CardFooter>
      </Card>
    </AuthLayout>
  );
}