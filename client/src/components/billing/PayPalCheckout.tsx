import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js";

interface PayPalCheckoutProps {
  amount: number;
}

export function PayPalCheckout({ amount }: PayPalCheckoutProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [{ isPending }] = usePayPalScriptReducer();

  // Get brand colors
  const brandColors = getBrandColors({});

  const addTokensMutation = useMutation({
    mutationFn: async ({ amount, paymentId, verificationData }: {
      amount: number;
      paymentId: string;
      verificationData: any;
    }) => {
      const response = await fetch("/api/billing/add-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentId, verificationData }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add VirtFusion tokens");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "VirtFusion Tokens Added Successfully!",
        description: `${data.tokensAdded} tokens ($${amount.toFixed(2)}) have been added to your VirtFusion account.`,
      });

      // Refresh balance and transactions
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      setIsProcessing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Payment Failed",
        description: error.message || "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const handlePayPalSuccess = async (details: any) => {
    setIsProcessing(true);

    try {
      // First verify the payment with PayPal
      const verifyResponse = await fetch("/api/billing/verify-paypal-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: details.id }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Payment verification failed");
      }

      const verificationData = await verifyResponse.json();

      // Then add tokens to VirtFusion account
      await addTokensMutation.mutateAsync({
        amount,
        paymentId: details.id,
        verificationData,
      });
    } catch (error: any) {
      toast({
        title: "Payment Processing Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const handlePayPalError = (error: any) => {
    console.error("PayPal error:", error);
    toast({
      title: "Payment Error",
      description: "PayPal payment failed. Please try again.",
      variant: "destructive",
    });
    setIsProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/60 p-4 shadow-sm bg-card/30">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="mr-4 p-2 bg-blue-50 rounded-lg">
              <img
                src="https://www.paypalobjects.com/webstatic/mktg/logo/pp_cc_mark_37x23.jpg"
                alt="PayPal"
                className="h-8"
              />
            </div>
            <div>
              <h5 className="font-medium">PayPal Payment</h5>
              <p className="text-sm text-muted-foreground">Purchase ${amount.toFixed(2)} in VirtFusion tokens (digital service)</p>
            </div>
          </div>
        </div>

        {isPending ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
            <span>Loading PayPal...</span>
          </div>
        ) : (
          <div className="paypal-buttons-container">
            <PayPalButtons
              style={{
                layout: "vertical",
                color: "blue",
                shape: "rect",
                label: "pay", // Use "Pay with PayPal" for digital goods
                tagline: false, // Remove "Pay in 4" tagline for digital services
                height: 45, // Consistent button height
              }}
            disabled={isProcessing}
            forceReRender={[amount]} // Re-render when amount changes
            createOrder={(data, actions) => {
              return actions.order.create({
                purchase_units: [
                  {
                    amount: {
                      value: amount.toFixed(2),
                      currency_code: "USD",
                    },
                    description: `VirtFusion Tokens - ${(amount * 100).toLocaleString()} tokens`,
                    // @ts-ignore - 'category' is valid in PayPal API but not in type definitions
                    category: "DIGITAL_GOODS", // Specify this is for digital goods
                  },
                ],
                intent: "CAPTURE",
                application_context: {
                  shipping_preference: "NO_SHIPPING", // Disable shipping address collection
                  user_action: "PAY_NOW", // Show "Pay Now" instead of "Continue"
                  brand_name: "SkyPANEL", // Custom brand name in PayPal checkout
                  locale: "en-US",
                  landing_page: "BILLING", // Direct to billing page instead of login
                  payment_method: {
                    payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED"
                  }
                },
              });
            }}
            onApprove={async (data, actions) => {
              if (!actions.order) {
                throw new Error("PayPal order actions not available");
              }

              setIsProcessing(true);

              try {
                // Capture the order
                const details = await actions.order.capture();

                // Handle the successful payment
                await handlePayPalSuccess(details);
              } catch (error) {
                handlePayPalError(error);
              }
            }}
            onError={(error) => {
              handlePayPalError(error);
            }}
            onCancel={() => {
              toast({
                title: "Payment Cancelled",
                description: "PayPal payment was cancelled.",
                variant: "destructive",
              });
              setIsProcessing(false);
            }}
          />
          </div>
        )}

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center py-2">
            <div className="animate-spin mr-2 h-4 w-4 border-2 border-b-0 border-r-0 rounded-full"></div>
            <span className="text-sm text-muted-foreground">Processing payment...</span>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground text-center">
        <p>Secure payment processing via PayPal • Digital Service • No Shipping Required</p>
        <p>VirtFusion tokens will be instantly added to your account (100 tokens = $1.00 USD)</p>
      </div>
    </div>
  );
}
