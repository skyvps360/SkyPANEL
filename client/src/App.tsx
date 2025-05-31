import { Switch, Route, useLocation, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ForgotUsernamePage from "@/pages/auth/forgot-username-page";
import ResetPasswordPage from "@/pages/auth/reset-password-page";
import VerifyPage from "@/pages/auth/verify-page";
import PackagesPage from "@/pages/packages-page";
import UserServersPage from "@/pages/servers-page";
import UserServerDetailPage from "@/pages/server-detail-page";
import BillingPage from "@/pages/billing-page";
import TransactionDetailPage from "@/pages/transaction-detail-page";
// Invoice-related pages have been removed
import TicketsPage from "@/pages/tickets-page";
import TicketDetailPage from "@/pages/ticket-detail-page";
import NotificationsPage from "@/pages/notifications-page";
import ProfilePage from "@/pages/profile-page";
import UsersPage from "@/pages/admin/users-page";
import UserEditPage from "@/pages/admin/user-edit-page";
import { lazy, Suspense, useEffect, useState } from "react";
import { usePageLoading, PageLoadingProvider } from "@/components/loading/PageLoadingProvider";

// Lazy load the landing page to avoid issues with direct file redirect
const LandingPage = lazy(() => import("./pages/landing-page"));
import { MaintenancePage } from "@/pages/maintenance-page";
import TermsOfServicePage from "@/pages/tos-page";
import PrivacyPolicyPage from "@/pages/privacy-page";

// Import standalone blog and docs pages
import BlogListPage from "@/pages/blog/index";
import DocsListPage from "@/pages/docs/index";
import StatusPage from "@/pages/status/index";
import SpeedTestPage from "@/pages/speed-test/index";
import PlansPage from "@/pages/plans/index";
import TeamsPage from "@/pages/teams-page";

// Admin pages
import AdminDashboard from "@/pages/admin/index";
import SettingsPage from "@/pages/admin/settings-page";
import AdminTicketsPage from "@/pages/admin/tickets-page";
import AdminTicketDetailPage from "@/pages/admin/ticket-detail-page";
import AdminBillingPage from "@/pages/admin/billing-page";
import AdminTransactionDetailPage from "@/pages/admin/transaction-detail-page";
import EmailLogsPage from "@/pages/admin/email-logs-page";
import AdminDocsPage from "@/pages/admin/docs-page";
import AdminBlogPage from "@/pages/admin/blog-page";
import DatacenterLocationsPage from "@/pages/admin/datacenter-locations";
import PlanFeaturesPage from "@/pages/admin/plan-features";
import FaqManagementPage from "@/pages/admin/faq-management";
import PackagePricingPage from "@/pages/admin/package-pricing";
import LegalEditorPage from "@/pages/admin/legal-editor";
import ServerDetailPage from "@/pages/admin/server-detail-page";
import ServersListPage from "@/pages/admin/servers-page";
import ApiDocsAdminPage from "@/pages/admin/api-docs-page";
import VNCConsole from "@/pages/vnc-console";
import { AuthProvider } from "@/hooks/use-auth";
import { AdminProtectedRoute, ProtectedRoute } from "@/lib/protected-route-new";
import { VirtFusionSsoHandler } from "@/components/VirtFusionSsoHandler";
import { DocumentTitle } from "@/components/DocumentTitle";
import { useThemeManager } from "@/hooks/useThemeManager";

// Component to handle maintenance mode redirects
function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [bypassGranted, setBypassGranted] = useState<boolean>(false);

  // Check if a bypass token exists in localStorage, URL, or cookie
  useEffect(() => {
    // Check if the maintenance_bypass cookie is already set
    const cookies = document.cookie.split(';').map(cookie => cookie.trim());
    const maintenanceBypassCookie = cookies.find(cookie => cookie.startsWith('maintenance_bypass='));

    if (maintenanceBypassCookie) {
      console.log('Maintenance bypass cookie already exists');
      setBypassGranted(true);
      return;
    }

    // Check for bypass token in localStorage
    const savedBypassToken = localStorage.getItem('maintenanceBypassToken');

    // Check for URL token parameter
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');

    // If either token exists, validate it
    if (savedBypassToken || urlToken) {
      const tokenToValidate = urlToken || savedBypassToken;

      // Call the API to validate the token
      fetch('/api/maintenance/token/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: tokenToValidate }),
      })
      .then(response => response.json())
      .then(data => {
        if (data.success) {
          // If token is valid, grant bypass and save to localStorage
          console.log('Maintenance bypass granted via token validation');
          setBypassGranted(true);
          if (tokenToValidate) {
            localStorage.setItem('maintenanceBypassToken', tokenToValidate);
          }

          // If there was a token in the URL, remove it to clean the URL
          if (urlToken) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
      })
      .catch(error => {
        console.error('Error validating maintenance token:', error);
      });
    }
  }, []);

  // Allowed paths during maintenance (don't redirect these)
  const allowedPaths = [
    '/maintenance',         // The maintenance page itself
    '/',                    // Landing page should be accessible
    '/tos',                 // Terms of Service page
    '/privacy',             // Privacy Policy page
    '/api/maintenance',     // API endpoints for maintenance
    '/blog',                // Public blog listing
    '/docs',                // Public documentation
    '/status',              // Status page
  ];

  // Check if current path is allowed during maintenance
  const isPathAllowed = () => {
    // Always allow the home page (exact match only)
    if (location === '/' || location === '' || location === '/index.html') {
      console.log('Home page access allowed during maintenance');
      return true;
    }

    // Always allow the maintenance page itself and any variants with query params
    if (location === '/maintenance' || location.startsWith('/maintenance')) {
      console.log('Maintenance page access allowed');
      return true;
    }

    // Direct match for exact paths
    if (allowedPaths.includes(location)) {
      console.log(`Path ${location} is explicitly allowed during maintenance`);
      return true;
    }

    // Prefix match for subpaths
    const isAllowed = allowedPaths.some(path => path !== '/' && location.startsWith(path)) ||
           location.startsWith('/blog/') ||
           location.startsWith('/docs/');

    if (isAllowed) {
      console.log(`Path ${location} is allowed during maintenance due to prefix match`);
    } else {
      console.log(`Path ${location} is not allowed during maintenance`);
    }

    return isAllowed;
  };

  // Check user role
  useEffect(() => {
    async function checkUser() {
      try {
        const response = await fetch('/api/user');
        if (response.ok) {
          const user = await response.json();
          setIsAdmin(user?.role === 'admin');
        }
      } catch (error) {
        console.error('Error checking user:', error);
      }
    }

    checkUser();
  }, []);

  // Check maintenance status when component mounts or location changes
  useEffect(() => {
    let isMounted = true;
    async function checkMaintenanceStatus() {
      try {
        const response = await fetch('/api/maintenance/status');
        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          setIsMaintenanceMode(data.enabled);

          // If maintenance is enabled and we're not on an allowed path,
          // redirect to maintenance page (unless user is admin)
          if (data.enabled && !isPathAllowed() && !isAdmin && !bypassGranted && location !== '/maintenance') {
            setLocation('/maintenance');
          }
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
      }
    }

    checkMaintenanceStatus();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [location, isAdmin, bypassGranted]);

  // If still loading maintenance status, show loading spinner
  if (isMaintenanceMode === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  // Render children if not in maintenance mode or user is admin or on allowed path
  return <>{children}</>;
}

function Router() {
  const { showLoading } = usePageLoading();
  const [location] = useLocation();

  // Initialize global theme manager
  useThemeManager();

  // Show loading screen only on initial render
  useEffect(() => {
    // This should only run once, not on every navigation
    showLoading();
  }, [showLoading]);

  return (
    <MaintenanceGuard>
      <Switch>
        <Route path="/">
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              <p className="ml-4 text-lg text-gray-700">Loading...</p>
            </div>
          }>
            <LandingPage />
          </Suspense>
        </Route>
        <Route path="/maintenance" component={MaintenancePage} />
        <ProtectedRoute path="/dashboard" component={HomePage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/auth/verify" component={VerifyPage} />
        <Route path="/auth/forgot-username" component={ForgotUsernamePage} />
        <Route path="/auth/reset-password" component={ResetPasswordPage} />
        <ProtectedRoute path="/packages" component={PackagesPage} />
        <ProtectedRoute path="/servers" component={UserServersPage} />
        <Route path="/servers/create">
          {() => {
            // Redirect from /servers/create to /servers
            const [, navigate] = useLocation();
            useEffect(() => { navigate('/servers'); }, [navigate]);
            return null;
          }}
        </Route>
        <ProtectedRoute path="/servers/:id" component={UserServerDetailPage} />
        <ProtectedRoute path="/billing" component={BillingPage} allowSuspended={true} />
        <ProtectedRoute path="/billing/transactions/:id" component={TransactionDetailPage} allowSuspended={true} />
        <ProtectedRoute path="/tickets" component={TicketsPage} allowSuspended={true} />
        <ProtectedRoute path="/tickets/:id" component={TicketDetailPage} allowSuspended={true} />
        <ProtectedRoute path="/notifications" component={NotificationsPage} />
        <ProtectedRoute path="/profile" component={ProfilePage} />

        {/* Public standalone blog and docs pages */}
        <Route path="/blog" component={BlogListPage} />
        <Route path="/blog/:slug" component={BlogListPage} />
        <Route path="/docs" component={DocsListPage} />
        <Route path="/docs/:slug" component={DocsListPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/speed-test" component={SpeedTestPage} />
        <Route path="/plans" component={PlansPage} />
        <Route path="/team" component={TeamsPage} />
        <Route path="/tos" component={TermsOfServicePage} />
        <Route path="/privacy" component={PrivacyPolicyPage} />

        {/* VNC Console - User access allowed */}
        <ProtectedRoute path="/vnc-console" component={VNCConsole} />

        {/* Admin Routes */}
        <AdminProtectedRoute path="/admin" component={AdminDashboard} />
        <AdminProtectedRoute path="/admin/users/:id" component={UserEditPage} />
        <AdminProtectedRoute path="/admin/users" component={UsersPage} />
        <AdminProtectedRoute path="/admin/settings" component={SettingsPage} />
        <AdminProtectedRoute path="/admin/tickets/:id" component={AdminTicketDetailPage} />
        <AdminProtectedRoute path="/admin/tickets" component={AdminTicketsPage} />
        <AdminProtectedRoute path="/admin/mail" component={EmailLogsPage} />
        <AdminProtectedRoute path="/admin/docs" component={AdminDocsPage} />
        <AdminProtectedRoute path="/admin/blog" component={AdminBlogPage} />
        <AdminProtectedRoute path="/admin/datacenter-locations" component={DatacenterLocationsPage} />
        <AdminProtectedRoute path="/admin/plan-features" component={PlanFeaturesPage} />
        <AdminProtectedRoute path="/admin/package-pricing" component={PackagePricingPage} />
        <AdminProtectedRoute path="/admin/faq-management" component={FaqManagementPage} />
        <AdminProtectedRoute path="/admin/legal" component={LegalEditorPage} />
        <AdminProtectedRoute path="/admin/servers" component={ServersListPage} />
        <Route path="/admin/servers/create">
          {() => {
            // Redirect from /admin/servers/create to /admin/servers
            const [, navigate] = useLocation();
            useEffect(() => { navigate('/admin/servers'); }, [navigate]);
            return null;
          }}
        </Route>
        <AdminProtectedRoute path="/admin/servers/:id" component={ServerDetailPage} />
        <AdminProtectedRoute path="/admin/api-docs" component={ApiDocsAdminPage} />
        <AdminProtectedRoute path="/admin/billing" component={AdminBillingPage} />
        <AdminProtectedRoute path="/admin/billing/transactions/:id" component={AdminTransactionDetailPage} />

        {/* Catch-all route for 404 pages */}
        <Route path="*" component={NotFound} />
      </Switch>
    </MaintenanceGuard>
  );
}

// PageLoadingProvider is already imported at the top of the file

function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: brandingData } = queryClient.getQueryState<any>(["/api/settings/branding"]) || {};

  // Apply brand theme on mount and when branding data changes
  useEffect(() => {
    if (brandingData && brandingData.primary_color) {
      // Import dynamically to avoid circular dependencies
      import('./lib/brand-theme').then(({ applyBrandColorVars }) => {
        applyBrandColorVars({
          primaryColor: brandingData.primary_color || '',
          secondaryColor: brandingData.secondary_color || '',
          accentColor: brandingData.accent_color || '',
        });
      });
    }
  }, [
    brandingData?.primary_color,
    brandingData?.secondary_color,
    brandingData?.accent_color
  ]);

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <DocumentTitle>
            <Toaster />
            {/* Global SSO handler for VirtFusion redirects */}
            <VirtFusionSsoHandler />
            {/* Wrap the router with PageLoadingProvider to enable loading screen */}
            <PageLoadingProvider>
              <BrandThemeProvider>
                <Router />
              </BrandThemeProvider>
            </PageLoadingProvider>
          </DocumentTitle>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
