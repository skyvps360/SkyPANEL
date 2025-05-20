import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: any; // Using 'any' to allow for Layout property
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

  return (
    <Route path={path}>
      <Component />
    </Route>
  )
}

export function AdminProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
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

  return (
    <Route path={path}>
      <Component />
    </Route>
  )
}
