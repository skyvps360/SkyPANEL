import {Switch, Route, useLocation} from "wouter";
import {lazy, Suspense, useEffect} from "react";
import {usePageLoading} from "@/components/loading/PageLoadingProvider";
import {useThemeManager} from "@/hooks/useThemeManager";
import {MaintenanceGuard} from "./MaintenanceGuard";

// Page imports
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
import TicketsPage from "@/pages/tickets-page";
import TicketDetailPage from "@/pages/ticket-detail-page";
import NotificationsPage from "@/pages/notifications-page";
import ProfilePage from "@/pages/profile-page";
import {MaintenancePage} from "@/pages/maintenance-page";
import TermsOfServicePage from "@/pages/tos-page";
import PrivacyPolicyPage from "@/pages/privacy-page";

// Import standalone blog and docs pages
import BlogListPage from "@/pages/blog/index";
import DocsListPage from "@/pages/docs/index";
import StatusPage from "@/pages/status/index";
import SpeedTestPage from "@/pages/speed-test/index";
import PlansPage from "@/pages/plans/index";
import TeamsPage from "@/pages/teams-page";
import DashboardBlogPage from "@/pages/dashboard-blog-page";

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
import AdminChatManagement from "@/pages/admin/AdminChatManagement";
import ServerDetailPage from "@/pages/admin/server-detail-page";
import ServersListPage from "@/pages/admin/servers-page";
import ApiDocsAdminPage from "@/pages/admin/api-docs-page";
import AdminDnsPage from "@/pages/admin/dns-page";
import UsersPage from "@/pages/admin/users-page";
import UserEditPage from "@/pages/admin/user-edit-page";
import VNCConsole from "@/pages/vnc-console";
import LiveChat from "@/pages/LiveChat";
import DnsDomainsPage from "@/pages/dns-domains-page";
import DnsRecordsPage from "@/pages/dns-records-page";
import DnsPlansPage from "@/pages/dns-plans-page";

// Serverless pages
import ServerlessAiPage from "@/pages/serverless/ai";
import ServerlessHostingPage from "@/pages/serverless/hosting";

import {AdminProtectedRoute, ProtectedRoute} from "@/lib/protected-route-new";

// Lazy load the landing page to avoid issues with direct file redirect
const LandingPage = lazy(() => import("@/pages/landing-page"));

export function AppRouter() {
    const {showLoading} = usePageLoading();
    const [location] = useLocation();

    // Initialize global theme manager
    useThemeManager();

    // Show loading screen only on initial render
    useEffect(() => {
        // This should only run once, not on every navigation
        showLoading();
    }, []); // Empty dependency array to run only once

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
                        <LandingPage/>
                    </Suspense>
                </Route>
                <Route path="/maintenance" component={MaintenancePage}/>
                <ProtectedRoute path="/dashboard" component={HomePage}/>
                <ProtectedRoute path="/dashboard/blog" component={DashboardBlogPage}/>
                <Route path="/auth" component={AuthPage}/>
                <Route path="/auth/verify" component={VerifyPage}/>
                <Route path="/auth/forgot-username" component={ForgotUsernamePage}/>
                <Route path="/auth/reset-password" component={ResetPasswordPage}/>
                <ProtectedRoute path="/packages" component={PackagesPage}/>
                <ProtectedRoute path="/servers" component={UserServersPage}/>
                <Route path="/servers/create">
                    {() => {
                        // Redirect from /servers/create to /servers
                        const [, navigate] = useLocation();
                        useEffect(() => {
                            navigate('/servers');
                        }, [navigate]);
                        return null;
                    }}
                </Route>
                <ProtectedRoute path="/servers/:id" component={UserServerDetailPage}/>
                <ProtectedRoute path="/billing" component={BillingPage} allowSuspended={true}/>
                <ProtectedRoute path="/billing/transactions/:id" component={TransactionDetailPage}
                                allowSuspended={true}/>
                <ProtectedRoute path="/tickets" component={TicketsPage} allowSuspended={true}/>
                <ProtectedRoute path="/tickets/:id" component={TicketDetailPage} allowSuspended={true}/>
                <ProtectedRoute path="/notifications" component={NotificationsPage}/>
                <ProtectedRoute path="/profile" component={ProfilePage}/>
                <ProtectedRoute path="/live-chat" component={LiveChat}/>

                {/* Public standalone blog and docs pages */}
                <Route path="/blog" component={BlogListPage}/>
                <Route path="/blog/:slug" component={BlogListPage}/>
                <Route path="/docs" component={DocsListPage}/>
                <Route path="/docs/:slug" component={DocsListPage}/>
                <Route path="/status" component={StatusPage}/>
                <Route path="/speed-test" component={SpeedTestPage}/>
                <Route path="/plans" component={PlansPage}/>
                <Route path="/team" component={TeamsPage}/>
                <Route path="/tos" component={TermsOfServicePage}/>
                <Route path="/privacy" component={PrivacyPolicyPage}/>

                {/* VNC Console - User access allowed */}
                <ProtectedRoute path="/vnc-console" component={VNCConsole}/>

                {/* DNS Management - User access allowed */}
                <ProtectedRoute path="/dns" component={DnsDomainsPage}/>
                <ProtectedRoute path="/dns/domains/:id/records" component={DnsRecordsPage}/>
                <ProtectedRoute path="/dns-plans" component={DnsPlansPage}/>

                {/* Serverless Services - User access allowed */}
                <ProtectedRoute path="/serverless/ai" component={ServerlessAiPage}/>
                <ProtectedRoute path="/serverless/hosting" component={ServerlessHostingPage}/>

                {/* Admin Routes */}
                <AdminProtectedRoute path="/admin" component={AdminDashboard}/>
                <AdminProtectedRoute path="/admin/users/:id" component={UserEditPage}/>
                <AdminProtectedRoute path="/admin/users" component={UsersPage}/>
                <AdminProtectedRoute path="/admin/settings" component={SettingsPage}/>

                {/* Routes for admin/tickets/ are accessible but we redirect users to admin/settings
            since we use the unified department system - tickets tab is hidden but still functional */}
                <Route path="/admin/settings/tickets">
                    {() => {
                        const [, navigate] = useLocation();
                        useEffect(() => {
                            navigate('/admin/settings');
                        }, [navigate]);
                        return null;
                    }}
                </Route>
                <AdminProtectedRoute path="/admin/tickets/:id" component={AdminTicketDetailPage}/>
                <AdminProtectedRoute path="/admin/tickets" component={AdminTicketsPage}/>
                <AdminProtectedRoute path="/admin/mail" component={EmailLogsPage}/>
                <AdminProtectedRoute path="/admin/docs" component={AdminDocsPage}/>
                <AdminProtectedRoute path="/admin/blog" component={AdminBlogPage}/>
                <AdminProtectedRoute path="/admin/datacenter-locations" component={DatacenterLocationsPage}/>
                <AdminProtectedRoute path="/admin/plan-features" component={PlanFeaturesPage}/>
                <AdminProtectedRoute path="/admin/package-pricing" component={PackagePricingPage}/>
                <AdminProtectedRoute path="/admin/faq-management" component={FaqManagementPage}/>
                <AdminProtectedRoute path="/admin/legal" component={LegalEditorPage}/>
                <AdminProtectedRoute path="/admin/servers" component={ServersListPage}/>

                <AdminProtectedRoute path="/admin/servers/:id" component={ServerDetailPage}/>
                <AdminProtectedRoute path="/admin/api-docs" component={ApiDocsAdminPage}/>
                <AdminProtectedRoute path="/admin/billing" component={AdminBillingPage}/>
                <AdminProtectedRoute path="/admin/billing/transactions/:id" component={AdminTransactionDetailPage}/>
                <AdminProtectedRoute path="/admin/dns" component={AdminDnsPage}/>
                <AdminProtectedRoute path="/admin/chat" component={AdminChatManagement}/>

                {/* Catch-all route for 404 pages */}
                <Route path="*" component={NotFound}/>
            </Switch>
        </MaintenanceGuard>
    );
}
