import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import confetti from "canvas-confetti";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function VerifyPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, logoutMutation } = useAuth();
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [isSubmittingCode, setIsSubmittingCode] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("VirtFusion");
  const [redirecting, setRedirecting] = useState<boolean>(false);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [rateLimitInfo, setRateLimitInfo] = useState<{
    waitTimeSeconds?: number;
    attemptsRemaining?: number;
    nextAllowedTime?: Date;
  }>({});
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    // Fetch branding settings on component mount
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return { company_name: 'VirtFusion' };
      })
      .then(data => {
        if (data.company_name) {
          setCompanyName(data.company_name);
        }
      })
      .catch(error => {
        console.error('Failed to fetch branding settings:', error);
      });
  }, []);

  // Fetch rate limit status on component mount
  useEffect(() => {
    if (user) {
      fetch(`/api/verification-rate-limit-status?userId=${user.id}&email=${encodeURIComponent(user.email)}`)
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            setRateLimitInfo({
              waitTimeSeconds: data.waitTimeSeconds,
              attemptsRemaining: data.attemptsRemaining,
              nextAllowedTime: data.nextAllowedTime ? new Date(data.nextAllowedTime) : undefined
            });
            if (data.waitTimeSeconds) {
              setCountdown(data.waitTimeSeconds);
            }
          }
        })
        .catch(error => {
          console.error('Failed to fetch rate limit status:', error);
        });
    }
  }, [user]);

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && rateLimitInfo.waitTimeSeconds) {
      // Clear rate limit info when countdown reaches 0
      setRateLimitInfo(prev => ({
        ...prev,
        waitTimeSeconds: undefined,
        nextAllowedTime: undefined
      }));
    }
  }, [countdown, rateLimitInfo.waitTimeSeconds]);

  // Handle redirections through useEffect instead of early returns
  useEffect(() => {
    // If not logged in, redirect to auth page
    if (!isLoading && !user && !redirecting) {
      setRedirecting(true);
      navigate("/auth");
    }

    // If user is already verified, redirect to dashboard
    if (!isLoading && user && user.isVerified && !redirecting) {
      setRedirecting(true);
      navigate("/dashboard");
    }
  }, [isLoading, user, navigate, redirecting]);

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
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ['#00AAFF', '#4285F4', '#0F9D58', '#F4B400']
      });
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ['#00AAFF', '#4285F4', '#0F9D58', '#F4B400']
      });
    }, 250);
  };

  // Handle verification code submission
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
          userId: user?.id,
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
            title: "Redirecting to dashboard",
            description: "Please wait while we redirect you to your dashboard.",
            variant: "default",
          });
        }, 1500);
        
        // Wait a moment for the celebration before redirecting
        setTimeout(() => {
          // Force refresh to update user data in context
          window.location.href = '/dashboard';
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
    if (!user || isResending) return;

    setIsResending(true);
    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update rate limiting info and start countdown
        setRateLimitInfo({
          attemptsRemaining: data.attemptsRemaining,
          waitTimeSeconds: 300, // 5 minutes cooldown
          nextAllowedTime: new Date(Date.now() + 300 * 1000)
        });
        setCountdown(300); // 5 minutes in seconds

        toast({
          title: "Verification code sent",
          description: data.message,
          variant: "default",
        });
      } else {
        // Handle rate limiting
        if (response.status === 429 && data.waitTimeSeconds) {
          setRateLimitInfo({
            waitTimeSeconds: data.waitTimeSeconds,
            nextAllowedTime: new Date(Date.now() + data.waitTimeSeconds * 1000)
          });
          setCountdown(data.waitTimeSeconds);
        }

        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error resending verification code:", error);
      toast({
        title: "Error",
        description: "Failed to resend verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  // Handle back to login with proper logout
  const handleBackToLogin = async () => {
    try {
      await logoutMutation.mutateAsync();
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
      // Navigate anyway in case of error
      navigate("/auth");
    }
  };

  // Render loading state or main content
  return (
    <AuthLayout>
      {isLoading || redirecting ? (
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl text-center">Email Verification Required</CardTitle>
            <CardDescription className="text-center">
              Please verify your email address to continue to {companyName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                A verification code has been sent to {user?.email}
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
                {countdown > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Resend available in {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="link"
                    onClick={handleResendVerification}
                    className="text-sm"
                    disabled={isResending || countdown > 0}
                  >
                    {isResending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Didn't receive the code? Resend"
                    )}
                  </Button>
                )}
                {rateLimitInfo.attemptsRemaining !== undefined && rateLimitInfo.attemptsRemaining < 3 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {rateLimitInfo.attemptsRemaining} attempts remaining
                  </p>
                )}
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={handleBackToLogin}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Back to Login"
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
    </AuthLayout>
  );
}