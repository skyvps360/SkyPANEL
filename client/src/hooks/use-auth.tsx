import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Extended user type to include registration response fields
interface ExtendedUser extends SelectUser {
  emailVerificationSent?: boolean;
  message?: string;
}

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<ExtendedUser, Error, InsertUser>;
  validateSession: () => Promise<boolean>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        
        const data = await res.json();
        
        // Special handling for verification requirement
        if (res.status === 403 && data.needsVerification) {
          const error = new Error(data.error || "Email verification required");
          (error as any).response = {
            status: res.status,
            data: data
          };
          throw error;
        }
        
        // Handle other errors
        if (!res.ok) {
          throw new Error(data.error || `${res.status}: ${res.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error;
      }
    },
    onSuccess: async (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      
      // Update login streak and check for new awards after successful login
      try {
        await apiRequest("/api/awards/user/login-streak/update", {
          method: "POST"
        });
        
        // Invalidate awards queries to refresh the dashboard
        queryClient.invalidateQueries({ queryKey: ["/api/awards/user/awards"] });
      } catch (error) {
        console.error("Failed to update login streak:", error);
        // Don't fail the login if streak update fails
      }
    },
    onError: (error: Error) => {
      // Skip toast notification for verification errors - they're handled by the auth page
      if (!(error as any).response?.data?.needsVerification) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      try {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
          credentials: "include",
        });
        
        const data = await res.json();
        
        // Handle errors
        if (!res.ok) {
          throw new Error(data.error || `${res.status}: ${res.statusText}`);
        }
        
        return data;
      } catch (error) {
        console.error("Registration error:", error);
        throw error;
      }
    },
    onSuccess: (response: ExtendedUser) => {
      // Store the user data
      if (response.id) {
        queryClient.setQueryData(["/api/user"], response);
        
        // Show toast with verification instructions if email was sent
        if (response.emailVerificationSent) {
          toast({
            title: "Registration successful",
            description: "Please check your email for verification instructions.",
            variant: "default",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("/api/logout", { 
        method: "POST" 
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Session validation function
  const validateSession = async () => {
    try {
      const response = await fetch("/api/user", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        // Clear user data if not authenticated
        queryClient.setQueryData(["/api/user"], null);
        return false;
      }
      
      const userData = await response.json();
      if (!userData || userData.error) {
        // Clear user data if response is invalid
        queryClient.setQueryData(["/api/user"], null);
        return false;
      }
      
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], userData);
      return true;
    } catch (error) {
      console.error("Session validation failed:", error);
      // Clear user data on validation error
      queryClient.setQueryData(["/api/user"], null);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        validateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
