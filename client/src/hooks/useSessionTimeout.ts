import { useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

/**
 * Hook to handle automatic session timeout and logout
 * Monitors session expiration and provides user feedback
 */
export function useSessionTimeout() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();

  /**
   * Handle session timeout by logging out user and showing notification
   */
  const handleSessionTimeout = useCallback(async () => {
    if (user) {
      try {
        await logoutMutation.mutateAsync();
        toast({
          title: "Session Expired",
          description: "You have been automatically logged out for security reasons. Please log in again.",
          variant: "destructive",
        });
      } catch (error) {
        console.error('Error during automatic logout:', error);
      }
    }
  }, [user, logoutMutation, toast]);

  /**
   * Check if session is still valid by making a request to the user endpoint
   */
  const checkSessionValidity = useCallback(async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/user', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 401) {
        // Session has expired
        await handleSessionTimeout();
      }
    } catch (error) {
      console.error('Error checking session validity:', error);
      // On network error, don't automatically log out
    }
  }, [user, handleSessionTimeout]);

  useEffect(() => {
    if (!user) return;

    // Check session validity every 5 minutes
    const interval = setInterval(checkSessionValidity, 5 * 60 * 1000);

    // Also check when the page becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkSessionValidity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, checkSessionValidity]);

  return {
    checkSessionValidity,
    handleSessionTimeout,
  };
}