import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { AuthProvider } from "@/hooks/use-auth";
import { VirtFusionSsoHandler } from "@/components/VirtFusionSsoHandler";
import { DocumentTitle } from "@/components/DocumentTitle";
import {PageLoadingProvider} from "@/components/loading/PageLoadingProvider";
import {AppRouter} from "@/components/app/AppRouter";
import {BrandThemeProvider} from "@/components/app/BrandThemeProvider";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";


/**
 * Session timeout monitoring component
 * Handles automatic logout when session expires
 */
function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  useSessionTimeout();
  return <>{children}</>;
}

function App() {
  // PayPal configuration
  const paypalOptions = {
    clientId: import.meta.env.VITE_PAYPAL_SANDBOX === "true"
      ? import.meta.env.VITE_PAYPAL_SANDBOX_CLIENT_ID
      : import.meta.env.VITE_PAYPAL_CLIENT_ID,
    currency: import.meta.env.VITE_PAYPAL_CURRENCY || "USD",
    intent: "capture",
    // Disable Pay Later and Credit funding sources for digital services
    "disable-funding": "paylater,credit",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <PayPalScriptProvider options={paypalOptions}>
        <AuthProvider>
          <SessionTimeoutProvider>
            <TooltipProvider>
              <DocumentTitle>
                <Toaster />
                {/* Global SSO handler for VirtFusion redirects */}
                <VirtFusionSsoHandler />
                {/* Wrap the router with PageLoadingProvider to enable loading screen */}
                <PageLoadingProvider>
                  <BrandThemeProvider>
                      <AppRouter/>
                  </BrandThemeProvider>
                </PageLoadingProvider>
              </DocumentTitle>
            </TooltipProvider>
          </SessionTimeoutProvider>
        </AuthProvider>
      </PayPalScriptProvider>
    </QueryClientProvider>
  );
}

export default App;
