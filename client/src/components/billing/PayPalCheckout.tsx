import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import debounce from "lodash/debounce";

interface PayPalCheckoutProps {
  amount: number;
}

interface PayPalButtonConfig {
  createOrder: (data: any, actions: any) => Promise<string>;
  onApprove: (data: any, actions: any) => Promise<boolean>;
  onError: (error: Error) => void;
  onCancel: () => void;
  style: {
    layout: "vertical";
    color: "blue";
    shape: "rect";
    label: "pay";
  };
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: PayPalButtonConfig) => { 
        render: (container: string) => void;
        close: () => void;
      };
    };
  }
}

export function PayPalCheckout({ amount }: PayPalCheckoutProps) {
  const { user } = useAuth();
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();
  const buttonsInstanceRef = useRef<{ close: () => void } | null>(null);

  // Check if user has virtFusionId
  const hasVirtFusionId = user && user.virtFusionId !== null && user.virtFusionId !== undefined;

  // Server-side capture mutation
  const capturePaymentMutation = useMutation({
    mutationFn: async ({ orderID }: { orderID: string }) => {
      return await apiRequest("/api/billing/capture-paypal-payment", {
        method: "POST",
        body: { orderID },
      });
    },
    onError: (error: Error) => {
      setPaymentProcessing(false);
      setPaymentError(`Payment capture failed: ${error.message || "Unknown error"}`);
      toast({
        title: "Payment capture error",
        description: error.message || "Failed to capture payment with PayPal",
        variant: "destructive",
      });
    },
  });

  // Server-side verification mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return await apiRequest("/api/billing/verify-paypal-payment", {
        method: "POST",
        body: { orderId },
      });
    },
    onError: (error: Error) => {
      setPaymentProcessing(false);
      setPaymentError(`Payment verification failed: ${error.message || "Unknown error"}`);
      toast({
        title: "Payment verification error",
        description: error.message || "Failed to verify payment with PayPal",
        variant: "destructive",
      });
    },
  });

  // Add credits mutation
  const addCreditsMutation = useMutation({
    mutationFn: async ({ amount, paymentId, verificationData }: {
      amount: number;
      paymentId: string;
      verificationData: any;
    }) => {
      return await apiRequest("/api/billing/add-credits", {
        method: "POST",
        body: { amount, paymentId, verificationData },
      });
    },
    onSuccess: () => {
      setPaymentProcessing(false);
      toast({
        title: "Credits added",
        description: `$${amount.toFixed(2)} has been added to your account and VirtFusion`,
      });
      setPaymentSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
    },
    onError: (error: Error) => {
      setPaymentProcessing(false);
      const errorMsg = error.message || "Failed to add credits";
      setPaymentError(errorMsg);
      toast({
        title: "Payment processing error",
        description: errorMsg || "Failed to add credits to your account",
        variant: "destructive",
      });
    },
  });

  // Helper functions for PayPal config
  const getPayPalClientId = () => {
    const isSandbox = import.meta.env.VITE_PAYPAL_SANDBOX === "true";
    return isSandbox ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID || "sb" : import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
  };

  const getCurrency = () => import.meta.env.VITE_PAYPAL_CURRENCY || "USD";

  // Cleanup PayPal buttons
  const cleanupPayPalButtons = useCallback(() => {
    if (buttonsInstanceRef.current) {
      buttonsInstanceRef.current.close();
      buttonsInstanceRef.current = null;
    }
    if (paypalContainerRef.current) {
      paypalContainerRef.current.innerHTML = "";
    }
  }, []);

  // Load PayPal script
  useEffect(() => {
    const loadPayPalScript = () => {
      if (window.paypal) {
        setScriptLoaded(true);
        return;
      }

      const clientId = getPayPalClientId();
      if (!clientId) {
        setPaymentError("PayPal client ID not configured. Please contact support.");
        return;
      }

      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${getCurrency()}&intent=capture&commit=true`;
      script.async = true;
      script.id = "paypal-script";

      script.onload = () => {
        if (window.paypal) {
          setScriptLoaded(true);
        } else {
          setPaymentError("PayPal SDK failed to initialize properly. Please refresh and try again.");
        }
      };

      script.onerror = () => {
        setPaymentError("Failed to load PayPal SDK. Please try again later.");
        toast({
          title: "PayPal SDK Error",
          description: "Failed to load PayPal checkout. Please try again later.",
          variant: "destructive",
        });
      };

      document.body.appendChild(script);
    };

    loadPayPalScript();

    return () => {
      const script = document.getElementById("paypal-script");
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      cleanupPayPalButtons();
    };
  }, [toast, cleanupPayPalButtons]);

  // Debounced render function
  const debouncedRenderButtons = useCallback(
    debounce((currentAmount: number) => {
      if (!scriptLoaded || !window.paypal || !paypalContainerRef.current || !hasVirtFusionId) {
        return;
      }

      cleanupPayPalButtons();

      const buttonConfig: PayPalButtonConfig = {
        createOrder: (_data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [{
              amount: {
                value: currentAmount.toFixed(2),
                currency_code: getCurrency(),
              },
              description: `Credit purchase - $${currentAmount.toFixed(2)}`,
            }],
            application_context: {
              shipping_preference: "NO_SHIPPING",
              user_action: "CONTINUE",
            },
          });
        },

        onApprove: async (data: any) => {
          setPaymentProcessing(true);

          try {
            const captureResult = await capturePaymentMutation.mutateAsync({ orderID: data.orderID });
            
            if (!captureResult.captured) {
              throw new Error("Payment could not be captured by our server");
            }

            await addCreditsMutation.mutateAsync({
              amount: currentAmount,
              paymentId: data.orderID,
              verificationData: captureResult,
            });

            return true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Failed to process payment";
            
            if (errorMessage.includes("Window closed")) {
              setTimeout(async () => {
                try {
                  const verification = await verifyPaymentMutation.mutateAsync({ orderId: data.orderID });
                  if (verification.verified) {
                    setPaymentProcessing(false);
                    setPaymentSuccess(true);
                    setPaymentError(null);
                  } else {
                    throw new Error("Payment verification failed");
                  }
                } catch {
                  setPaymentProcessing(false);
                  setPaymentError(errorMessage);
                }
              }, 3000);
              return false;
            }

            setPaymentProcessing(false);
            setPaymentError(errorMessage);
            return false;
          }
        },

        onError: (error: Error) => {
          setPaymentError(error.message || "Payment failed. Please try again.");
          toast({
            title: "Payment Error",
            description: error.message || "An error occurred with PayPal",
            variant: "destructive",
          });
        },

        onCancel: () => {
          toast({
            title: "Payment Cancelled",
            description: "You cancelled the payment process. No charges were made.",
            variant: "default",
          });
        },

        style: {
          layout: "vertical",
          color: "blue",
          shape: "rect",
          label: "pay",
        },
      };

      try {
        const buttons = window.paypal?.Buttons(buttonConfig);
        if (buttons) {
          buttonsInstanceRef.current = buttons;
          buttons.render("#paypal-button-container");
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Could not initialize PayPal checkout";
        console.error("Error rendering PayPal buttons:", error);
        setPaymentError(`${errorMessage}. Please try refreshing the page.`);
      }
    }, 500),
    [scriptLoaded, hasVirtFusionId, cleanupPayPalButtons, capturePaymentMutation, addCreditsMutation, verifyPaymentMutation, toast]
  );

  // Setup PayPal buttons when amount changes
  useEffect(() => {
    if (!user) return;

    setPaymentSuccess(false);
    setPaymentError(null);

    debouncedRenderButtons(amount);

    return () => {
      debouncedRenderButtons.cancel();
      cleanupPayPalButtons();
    };
  }, [amount, user, debouncedRenderButtons, cleanupPayPalButtons]);

  if (!hasVirtFusionId) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Account Not Linked</h3>
        <p className="text-muted-foreground mb-4">
          Your account is not linked to VirtFusion. Please contact support to link your account first.
        </p>
        <Button variant="outline" onClick={() => window.location.href = "/tickets"}>
          Contact Support
        </Button>
      </div>
    );
  }

  if (paymentSuccess) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground mb-4">
          ${amount.toFixed(2)} has been added to your account and your VirtFusion credit balance.
        </p>
        <div className="flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4">
          <Button onClick={() => setPaymentSuccess(false)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Make Another Payment
          </Button>
          <Button variant="outline" onClick={() => window.location.href = "/"}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (paymentProcessing) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
        <p className="text-muted-foreground mb-4">
          Please wait while we verify your payment and add credits to your VirtFusion account...
        </p>
        <div className="max-w-md mx-auto mt-6 text-xs text-gray-500">
          <p>This may take a few moments. Please do not refresh the page.</p>
        </div>
      </div>
    );
  }

  if (paymentError) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Payment Error</h3>
        <p className="text-muted-foreground mb-4">{paymentError}</p>
        <Button onClick={() => {
          setPaymentError(null);
          window.location.reload();
        }}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="paypal-container-wrapper">
        {!scriptLoaded ? (
          <div className="text-center p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p>Loading PayPal checkout...</p>
          </div>
        ) : (
          <div
            id="paypal-button-container"
            ref={paypalContainerRef}
            className="paypal-button-container"
            style={{
              minHeight: "200px",
              border: "1px solid #e4e4e4",
              borderRadius: "4px",
            }}
          />
        )}
      </div>
      <div className="mt-4 text-center text-sm text-gray-500 space-y-2">
        <p>After payment, credits will be immediately applied to your VirtFusion account.</p>
        <p className="text-amber-600 font-medium">
          Important: Please keep the PayPal window open until the payment is fully completed.
        </p>
      </div>
    </div>
  );
}
