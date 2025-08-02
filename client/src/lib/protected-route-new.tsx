import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Loader2, MessageSquare } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";

export function ProtectedRoute({
  path,
  component: Component,
  allowSuspended = false, // By default, suspended users cannot access routes
}: {
  path: string;
  component: any; // Using 'any' to allow for Layout property
  allowSuspended?: boolean; // Add this parameter to allow specific routes for suspended users
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Redirect unverified users to verification page
  if (!user.isVerified) {
    return (
      <Route path={path}>
        <Redirect to="/auth/verify" />
      </Route>
    );
  }

  // For suspended users, only allow specific routes
  if (!user.isActive && !allowSuspended) {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Account Suspended</h1>
          <p className="text-lg text-gray-600 mb-6">Your account has been suspended. You can still access the support tickets page to contact our team.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/tickets" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </a>
            <a href="/billing" className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
              View Billing
            </a>
          </div>
        </div>
      </Route>
    );
  }

  // Check if Component has a Layout property to apply
  return (
    <Route path={path}>
      {Component.Layout ? (
        <Component.Layout>
          <Component />
        </Component.Layout>
      ) : (
        <Component />
      )}
    </Route>
  )
}

export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: any; // Using 'any' to allow for Layout property
}) {
  const { user, isLoading, validateSession } = useAuth();
  
  // Enhanced security check: Verify authentication status on every render
  // This prevents access to admin pages through browser history manipulation during OAuth flows
  const isAuthenticated = !!user && !isLoading;
  const isAdmin = isAuthenticated && user?.role === "admin";
  
  // Force a re-validation of authentication status
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated) {
        // If not authenticated, redirect to auth page
        window.location.href = '/auth';
        return;
      }
      
      // Additional session validation
      const isValidSession = await validateSession();
      if (!isValidSession) {
        window.location.href = '/auth';
        return;
      }
      
      if (!isAdmin) {
        // If authenticated but not admin, redirect to dashboard
        window.location.href = '/dashboard';
        return;
      }
    };
    
    checkAuth();
  }, [isAuthenticated, isAdmin, validateSession]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }
  
  // Redirect unverified users to verification page
  if (!user.isVerified) {
    return (
      <Route path={path}>
        <Redirect to="/auth/verify" />
      </Route>
    );
  }

  // Redirect to dashboard if not admin
  if (user.role !== "admin") {
    return (
      <Route path={path}>
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
          <AlertTriangle className="h-16 w-16 text-alert mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-lg text-gray-600 mb-6">You do not have permission to access this page.</p>
          <a href="/" className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
            Return to Dashboard
          </a>
        </div>
      </Route>
    );
  }

  // Check if Component has a Layout property to apply
  return (
    <Route path={path}>
      {Component.Layout ? (
        <Component.Layout>
          <Component />
        </Component.Layout>
      ) : (
        <Component />
      )}
    </Route>
  )
}