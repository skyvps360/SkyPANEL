import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertTriangle, CreditCard } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface PayPalCheckoutProps {
  amount: number;
}

declare global {
  interface Window {
    paypal?: {
      Buttons: (options: any) => { render: (container: string) => void };
    };
  }
}

// VirtFusion API test section has been removed

export function PayPalCheckout({ amount }: PayPalCheckoutProps) {
  const { user } = useAuth();
  const paypalContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const { toast } = useToast();

  // Check if user has virtFusionId
  const hasVirtFusionId =
    user && user.virtFusionId !== null && user.virtFusionId !== undefined;

  // Server-side capture mutation (this is the new preferred method)
  const capturePaymentMutation = useMutation({
    mutationFn: async ({ orderID }: { orderID: string }) => {
      console.log("Sending order to server for capture:", orderID);
      return await apiRequest("/api/billing/capture-paypal-payment", {
        method: "POST",
        body: { orderID },
      });
    },
    onError: (error: any) => {
      setPaymentProcessing(false);
      setPaymentError(
        `Payment capture failed: ${error.message || "Unknown error"}`,
      );
      toast({
        title: "Payment capture error",
        description: error.message || "Failed to capture payment with PayPal",
        variant: "destructive",
      });
    },
  });

  // Server-side verification mutation (legacy method)
  const verifyPaymentMutation = useMutation({
    mutationFn: async ({ orderId }: { orderId: string }) => {
      return await apiRequest("/api/billing/verify-paypal-payment", {
        method: "POST",
        body: { orderId },
      });
    },
    onError: (error: any) => {
      setPaymentProcessing(false);
      setPaymentError(
        `Payment verification failed: ${error.message || "Unknown error"}`,
      );
      toast({
        title: "Payment verification error",
        description: error.message || "Failed to verify payment with PayPal",
        variant: "destructive",
      });
    },
  });

  // Add credits mutation
  const addCreditsMutation = useMutation({
    mutationFn: async ({
      amount,
      paymentId,
      verificationData,
    }: {
      amount: number;
      paymentId: string;
      verificationData: any;
    }) => {
      console.log("Sending payment data to server:", {
        amount,
        paymentId,
        verificationData,
      });
      console.log("User has virtFusionId:", user?.virtFusionId);

      return await apiRequest("/api/billing/add-credits", {
        method: "POST",
        body: {
          amount,
          paymentId,
          verificationData,
        },
      });
    },
    onSuccess: (data) => {
      setPaymentProcessing(false);
      console.log("Credits added successfully:", data);
      toast({
        title: "Credits added",
        description: `$${amount.toFixed(2)} has been added to your account and VirtFusion`,
      });
      setPaymentSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
    },
    onError: (error: any) => {
      setPaymentProcessing(false);
      const errorMsg = error.message || "Failed to add credits";
      console.error("Credit addition error:", errorMsg);
      setPaymentError(errorMsg);
      toast({
        title: "Payment processing error",
        description: errorMsg || "Failed to add credits to your account",
        variant: "destructive",
      });
    },
  });

  // Helper functions for PayPal config using environment variables
  const getPayPalClientId = () => {
    // First check if we're in sandbox mode
    const isSandbox = import.meta.env.VITE_PAYPAL_SANDBOX === "true";

    // Get client ID based on mode
    if (isSandbox) {
      return import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID || "sb";
    } else {
      return import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
    }
  };

  const getCurrency = () => {
    return import.meta.env.VITE_PAYPAL_CURRENCY || "USD";
  };

  // Load PayPal script
  useEffect(() => {
    // Create a function to load the script to avoid race conditions
    const loadPayPalScript = () => {
      // Check if PayPal script is already loaded
      if (window.paypal) {
        console.log("PayPal already loaded, skipping script load");
        setScriptLoaded(true);
        return;
      }

      const isSandbox = import.meta.env.VITE_PAYPAL_SANDBOX === "true";
      const clientId = getPayPalClientId();
      const currency = getCurrency();

      // Log PayPal configuration for debugging
      console.log(`PayPal mode: ${isSandbox ? "SANDBOX" : "LIVE"}`);
      console.log(`PayPal client ID: ${clientId || "Not configured"}`);
      console.log(`PayPal currency: ${currency}`);

      if (!clientId) {
        console.error("PayPal client ID not configured");
        setPaymentError(
          "PayPal client ID not configured. Please contact support.",
        );
        return;
      }

      // Check if PayPal script is already in DOM
      const existingScript = document.querySelector(
        `script[src*="paypal.com/sdk/js"]`,
      );
      if (existingScript) {
        console.log("Found existing PayPal script in DOM, removing it first");
        document.body.removeChild(existingScript);
      }

      // Load PayPal script with correct configuration
      console.log("Creating new PayPal script element");
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture&commit=true`;
      script.async = true;
      script.id = "paypal-script";

      script.onload = () => {
        console.log("PayPal SDK loaded successfully");
        if (window.paypal) {
          console.log("window.paypal is available after script load");
          setScriptLoaded(true);
        } else {
          console.error(
            "window.paypal is not available even after script load",
          );
          setPaymentError(
            "PayPal SDK failed to initialize properly. Please refresh and try again.",
          );
        }
      };

      script.onerror = (error) => {
        console.error("PayPal SDK failed to load:", error);
        setPaymentError("Failed to load PayPal SDK. Please try again later.");
        toast({
          title: "PayPal SDK Error",
          description:
            "Failed to load PayPal checkout. Please try again later.",
          variant: "destructive",
        });
      };

      console.log("Appending PayPal script to document body");
      document.body.appendChild(script);
    };

    // Execute the function to load the script
    loadPayPalScript();

    // Cleanup function
    return () => {
      const script = document.getElementById("paypal-script");
      if (script && document.body.contains(script)) {
        console.log("Cleaning up PayPal script on component unmount");
        document.body.removeChild(script);
      }
    };
  }, [toast]);

  // Setup PayPal buttons when script is loaded
  useEffect(() => {
    // First make sure we have a user
    if (!user) {
      console.log("User not loaded yet, not rendering PayPal buttons");
      return;
    }

    if (scriptLoaded && !window.paypal) {
      console.error("PayPal SDK loaded but window.paypal is not available");
      setPaymentError(
        "PayPal SDK failed to initialize properly. Please refresh the page and try again.",
      );
      return;
    }

    // Reset states when amount changes
    setPaymentSuccess(false);
    setPaymentError(null);

    // Track whether this component is mounted to prevent cleanup issues
    let isMounted = true;

    // If script is loaded, render buttons
    if (scriptLoaded && window.paypal && paypalContainerRef.current) {
      console.log("PayPal SDK ready, preparing to render buttons");

      try {
        console.log(
          "PayPal button container ref is available, clearing contents",
        );

        // Clear any existing buttons
        if (paypalContainerRef.current) {
          paypalContainerRef.current.innerHTML = "";
        }

        // Log for debugging
        console.log("Rendering PayPal buttons with amount:", amount);

        // Check if user has VirtFusion ID
        if (!hasVirtFusionId) {
          console.log("User doesn't have VirtFusion ID, showing error message");
          paypalContainerRef.current.innerHTML =
            '<div class="p-4 text-center text-red-500">Your account is not linked to VirtFusion. Please contact support.</div>';
          return;
        }

        console.log("Initializing PayPal Buttons component");

        // Create and render PayPal buttons with correct syntax
        const buttonConfig = {
          // Create order handler
          createOrder: function (_data: any, actions: any) {
            console.log("Creating PayPal order for amount:", amount);
            return actions.order
              .create({
                purchase_units: [
                  {
                    amount: {
                      value: amount.toFixed(2),
                      currency_code: getCurrency(),
                    },
                    description: `Credit purchase - $${amount.toFixed(2)}`,
                  },
                ],
                application_context: {
                  shipping_preference: "NO_SHIPPING",
                  user_action: "CONTINUE", // Force user to explicitly click Continue
                },
              })
              .catch(function (err: any) {
                console.error("PayPal createOrder error:", err);
                setPaymentError(
                  "Failed to create PayPal order. Please try again.",
                );
                throw err;
              });
          },

          // Payment approved handler - SERVER-SIDE CAPTURE APPROACH
          onApprove: function (data: any, _actions: any) {
            console.log("Payment approved by PayPal. Order ID:", data.orderID);

            // Set interim loading message
            setPaymentProcessing(true);

            // Use server-side capture to avoid PayPal window closing issues
            return capturePaymentMutation
              .mutateAsync({
                orderID: data.orderID,
              })
              .then(function (captureResult) {
                console.log(
                  "Payment captured successfully on server:",
                  captureResult,
                );

                if (!captureResult.captured) {
                  throw new Error(
                    "Payment could not be captured by our server",
                  );
                }

                return addCreditsMutation.mutateAsync({
                  amount,
                  paymentId: data.orderID,
                  verificationData: captureResult,
                });
              })
              .then(function () {
                // Success - set payment success
                setPaymentProcessing(false);
                setPaymentSuccess(true);
                toast({
                  title: "Payment Successful",
                  description: `$${amount.toFixed(2)} has been added to your account.`,
                  variant: "default",
                });

                console.log("Payment process completed successfully");
                return true;
              })
              .catch(function (error: any) {
                console.error("Payment processing error:", error);

                // Check for window closed error
                let errorMessage = error.message || "Failed to process payment";
                if (errorMessage.includes("Window closed")) {
                  errorMessage =
                    "PayPal window was closed before completing the transaction. Your payment is being processed server-side.";

                  // If a window closed error occurred, we should check after a slight delay
                  // to see if the server-side capture completed successfully
                  setTimeout(function () {
                    toast({
                      title: "Checking payment status",
                      description:
                        "Please wait while we verify your payment status...",
                    });

                    // We can verify the payment status here by making a call to check
                    // if a transaction exists with this payment ID
                    verifyPaymentMutation
                      .mutateAsync({
                        orderId: data.orderID,
                      })
                      .then(function (verification) {
                        if (verification.verified) {
                          setPaymentProcessing(false);
                          setPaymentSuccess(true);
                          setPaymentError(null);
                          toast({
                            title: "Payment Successful",
                            description: `$${amount.toFixed(2)} has been added to your account.`,
                            variant: "default",
                          });
                        } else {
                          throw new Error("Payment verification failed");
                        }
                      })
                      .catch(function () {
                        // If verification fails, show the original error
                        setPaymentProcessing(false);
                        setPaymentError(errorMessage);
                      });
                  }, 3000);

                  return false;
                }

                setPaymentProcessing(false);
                setPaymentError(errorMessage);
                toast({
                  title: "Payment Error",
                  description: errorMessage,
                  variant: "destructive",
                });
                return false;
              });
          },

          onError: function (err: any) {
            console.error("PayPal error:", err);
            setPaymentError(err.message || "Payment failed. Please try again.");
            toast({
              title: "Payment Error",
              description: err.message || "An error occurred with PayPal",
              variant: "destructive",
            });
          },

          onCancel: function () {
            console.log("Payment cancelled by user");
            // Show a more helpful message about maintaining the window
            toast({
              title: "Payment Cancelled",
              description:
                "You cancelled the payment process. No charges were made. Remember to keep the PayPal window open until payment is completed.",
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

        // Create PayPal buttons
        const buttons = window.paypal?.Buttons(buttonConfig);

        // Use a small timeout to ensure DOM is fully ready
        setTimeout(function () {
          try {
            console.log("Attempting to render PayPal buttons");
            // Check if the container exists before rendering
            const paypalContainer = document.getElementById(
              "paypal-button-container",
            );
            if (!paypalContainer) {
              console.error("PayPal container element not found in DOM");
              return; // Skip rendering without throwing error
            }

            if (buttons) {
              buttons.render("#paypal-button-container");
              console.log("PayPal buttons rendered successfully");
            } else {
              throw new Error("PayPal buttons could not be created");
            }
          } catch (renderError) {
            console.error("Error rendering PayPal buttons:", renderError);
            setPaymentError(
              "Could not initialize PayPal checkout. Please try refreshing the page.",
            );
          }
        }, 500); // Short delay to ensure DOM is ready
      } catch (error) {
        console.error("PayPal button setup error:", error);
        setPaymentError(
          "Failed to initialize PayPal buttons. Please refresh the page.",
        );
      }
    }

    // Return cleanup function to handle component unmount or credit amount changes
    return () => {
      // Set the mounted flag to false to prevent state updates after unmount
      isMounted = false;

      // Instead of clearing the container, we'll use a more gentle approach
      // that allows PayPal to properly clean up its elements
      if (paypalContainerRef.current) {
        console.log(
          "Component cleanup - PayPal container will be recreated on next render",
        );
        // We don't clear innerHTML here to avoid the "container removed" error
        // The container will be recreated with a new key when the component renders again
      }
    };
  }, [
    amount,
    scriptLoaded,
    addCreditsMutation,
    verifyPaymentMutation,
    capturePaymentMutation,
    toast,
    hasVirtFusionId,
    user,
  ]);

  // Check for VirtFusion ID issue
  if (!hasVirtFusionId) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Account Not Linked</h3>
        <p className="text-muted-foreground mb-4">
          Your account is not linked to VirtFusion. Please contact support to
          link your account first.
        </p>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/tickets")}
        >
          Contact Support
        </Button>
      </div>
    );
  }

  // Render success state
  if (paymentSuccess) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Payment Successful!</h3>
        <p className="text-muted-foreground mb-4">
          ${amount.toFixed(2)} has been added to your account and your
          VirtFusion credit balance.
        </p>
        <div className="flex flex-col md:flex-row justify-center space-y-3 md:space-y-0 md:space-x-4">
          <Button onClick={() => setPaymentSuccess(false)}>
            <CreditCard className="h-4 w-4 mr-2" />
            Make Another Payment
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/")}
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Render processing state
  if (paymentProcessing) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
        <p className="text-muted-foreground mb-4">
          Please wait while we verify your payment and add credits to your
          VirtFusion account...
        </p>
        <div className="max-w-md mx-auto mt-6 text-xs text-gray-500">
          <p>This may take a few moments. Please do not refresh the page.</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (paymentError) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">Payment Error</h3>
        <p className="text-muted-foreground mb-4">{paymentError}</p>
        <Button
          onClick={() => {
            setPaymentError(null);
            window.location.reload();
          }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Render default state
  return (
    <div className="py-4">
      {/* PayPal container is always rendered with key={amount} to ensure proper re-mounting */}
      <div
        className="paypal-container-wrapper"
        key={`paypal-wrapper-${amount}`}
      >
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
            key={`paypal-container-${amount}`}
          ></div>
        )}
      </div>
      <div className="mt-4 text-center text-sm text-gray-500 space-y-2">
        <p>
          After payment, credits will be immediately applied to your VirtFusion
          account.
        </p>
        <p className="text-amber-600 font-medium">
          Important: Please keep the PayPal window open until the payment is
          fully completed.
        </p>
      </div>
    </div>
  );
}
