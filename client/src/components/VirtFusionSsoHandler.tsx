import { useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

/**
 * Global component that listens for SSO events and handles redirects to VirtFusion
 * This component should be mounted at the application root level to handle
 * SSO events from anywhere in the application
 */
export function VirtFusionSsoHandler() {
  const { toast } = useToast();
  
  // SSO token generation and redirect mutation
  const virtFusionSsoMutation = useMutation({
    mutationFn: async (serverId?: number) => {
      try {
        const endpoint = serverId 
          ? `/api/sso/virtfusion/server/${serverId}/token` 
          : '/api/sso/virtfusion/token';
        
        console.log(`Requesting SSO token from: ${endpoint}`);
        
        // Make the request with proper configuration
        const data = await apiRequest(endpoint, {
          method: 'POST',
          // Explicitly request JSON response
          headers: {
            'Accept': 'application/json'
          }
        });
        
        // Check if we got an HTML response (happens with API docs route conflict)
        if (data && (data as any)._isHtmlResponse) {
          console.error('Received HTML instead of JSON response from SSO endpoint');
          throw new Error('Server returned HTML instead of JSON. This may be due to route conflict with the API docs page.');
        }
        
        console.log('SSO token response data:', data);
        
        // Simple validation of the response data
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format from SSO endpoint');
        }
        
        return data;
      } catch (error) {
        console.error('SSO request error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      if (data.success && data.redirectUrl && data.token) {
        // Log redirect URL before navigation
        console.log(`Redirecting to VirtFusion panel: ${data.redirectUrl}`);
        console.log(`Token received (truncated): ${data.token.substring(0, 10)}...`);
        
        // Use direct window location for redirection to VirtFusion panel
        window.location.href = data.redirectUrl;
        
        toast({
          title: "Success!",
          description: "Connecting to VirtFusion panel...",
          variant: "default"
        });
      } else {
        // Detailed logging for debugging
        console.error('Invalid SSO response format:', data);
        console.error('Response keys:', Object.keys(data));
        
        let missingFields = [];
        if (!data.success) missingFields.push('success');
        if (!data.redirectUrl) missingFields.push('redirectUrl');
        if (!data.token) missingFields.push('token');
        
        console.error(`Missing fields in response: ${missingFields.join(', ')}`);
        
        toast({
          title: "Connection Error",
          description: "Failed to generate VirtFusion access token. Missing: " + missingFields.join(', '),
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("VirtFusion SSO error:", error);
      let errorMessage = "Failed to connect to VirtFusion panel";
      
      try {
        // Extract error message from response if available
        if (error.status) {
          if (error.status === 400) {
            if (error.data?.needsSync) {
              errorMessage = "Your account needs to be synced with VirtFusion first";
            } else if (error.data?.error) {
              errorMessage = error.data.error;
            }
          } else if (error.status === 401) {
            errorMessage = "Authentication required. Please log in.";
          } else if (error.status === 404) {
            errorMessage = "User not found or not authenticated";
          } else if (error.status === 500) {
            errorMessage = "VirtFusion server error. Please try again later.";
            
            // Provide more details from the error response if available
            if (error.data?.details) {
              errorMessage += ` Details: ${error.data.details}`;
            }
          }
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch (parseError) {
        console.error("Error parsing SSO error:", parseError);
      }
      
      toast({
        title: "SSO Connection Error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Listen for SSO events
  useEffect(() => {
    // Handler for main SSO events
    const handleSsoEvent = (event: Event) => {
      try {
        const customEvent = event as CustomEvent;
        console.log('VirtFusion SSO event received:', customEvent.detail);
        
        if (customEvent.detail) {
          const { serverId } = customEvent.detail;
          console.log('Initiating SSO request', serverId ? `for server ID ${serverId}` : 'for main panel');
          virtFusionSsoMutation.mutate(serverId);
        } else {
          console.warn('SSO event has no detail property');
          virtFusionSsoMutation.mutate(undefined);
        }
      } catch (error) {
        console.error('Error handling SSO event:', error);
        toast({
          title: "Error",
          description: "Failed to process SSO request",
          variant: "destructive"
        });
      }
    };
    
    // Handler for test events (used by buttons to check if handler is active)
    const handleTestEvent = (event: Event) => {
      console.log('VirtFusion SSO test event received');
      // Respond to the test event to let buttons know the handler is active
      document.dispatchEvent(new CustomEvent('virtfusion-sso-test-response'));
    };

    // Add event listeners
    document.addEventListener('virtfusion-sso', handleSsoEvent);
    document.addEventListener('virtfusion-sso-test', handleTestEvent);
    console.log('VirtFusion SSO event listeners registered');
    
    // Clean up
    return () => {
      document.removeEventListener('virtfusion-sso', handleSsoEvent);
      document.removeEventListener('virtfusion-sso-test', handleTestEvent);
      console.log('VirtFusion SSO event listeners removed');
    };
  }, [virtFusionSsoMutation, toast]);

  // This component doesn't render anything visible
  return null;
}