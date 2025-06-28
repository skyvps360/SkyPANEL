import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";
import { useQuery } from "@tanstack/react-query";

// Define branding data type with new color system
interface BrandingData {
  company_name: string;
  company_color?: string; // Legacy - kept for backward compatibility
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface VirtFusionSsoButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  serverId?: number; // Optional server ID for direct server access
  packageId?: number; // Optional package ID for purchase flow
  text?: string; // Optional custom button text
}

/**
 * Button component that triggers SSO redirection to VirtFusion panel
 * This component dispatches a custom event that is handled by VirtFusionSsoHandler
 */
export function VirtFusionSsoButton({ 
  variant = "default", 
  size = "default", 
  className = "",
  serverId,
  packageId,
  text
}: VirtFusionSsoButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isListenerActive, setIsListenerActive] = useState(false);
  const { toast } = useToast();
  
  // Fetch brand settings
  const { data: brandingData = { 
    company_name: '', 
    primary_color: '2563eb',
    secondary_color: '10b981',
    accent_color: 'f59e0b'
  } } = useQuery<BrandingData>({
    queryKey: ['/api/settings/branding'],
  });
  
  // Get brand colors using the new color system
  const brandColorOptions = {
    primaryColor: brandingData?.primary_color || brandingData?.company_color || '2563eb',
    secondaryColor: brandingData?.secondary_color || '10b981',
    accentColor: brandingData?.accent_color || 'f59e0b'
  };
  const brandColors = getBrandColors(brandColorOptions);
  
  // Monitor if SSO handler is registered
  useEffect(() => {
    // Create a test event to check if our handler is registered
    // Using a separate event name to avoid triggering actual redirection
    const testEvent = new CustomEvent('virtfusion-sso-test', {
      detail: { test: true }
    });
    
    // Add a one-time listener just for this test
    const testListener = () => {
      setIsListenerActive(true);
    };
    
    document.addEventListener('virtfusion-sso-test-response', testListener, { once: true });
    
    // Dispatch the test event
    document.dispatchEvent(testEvent);
    
    // Cleanup
    return () => {
      document.removeEventListener('virtfusion-sso-test-response', testListener);
    };
  }, []);
  
  // Dispatch event to trigger SSO
  const handleVirtFusionRedirect = () => {
    try {
      setIsLoading(true);
      
      // Create and dispatch SSO event with more detailed info for debugging
      const eventDetail = serverId
        ? { serverId, timestamp: Date.now(), source: 'VirtFusionSsoButton' }
        : packageId
        ? { packageId, timestamp: Date.now(), source: 'VirtFusionSsoButton' }
        : { timestamp: Date.now(), source: 'VirtFusionSsoButton' };
            
      const event = new CustomEvent('virtfusion-sso', {
        detail: eventDetail
      });
      
      document.dispatchEvent(event);
      
      // Keep button in loading state for a reasonable time
      // long enough for the handler to process but not indefinitely
      setTimeout(() => {
        setIsLoading(false);
      }, 10000); // 10 seconds timeout
    } catch (error) {
      console.error('Error dispatching SSO event:', error);
      setIsLoading(false);
      
      toast({
        title: "Connection Error",
        description: "Failed to initiate connection to VirtFusion",
        variant: "destructive"
      });
    }
  };
  
  // Determine the button text
  const buttonText = text || (serverId ? 'Manage Server' : 'VirtFusion Panel');
  
  // Custom class for hover effect since we can't use :hover in inline styles
  const buttonClass = `flex items-center brand-button ${className}`;
  
  // Create custom CSS for the button with brand color
  const customButtonStyles = document.createElement('style');
  customButtonStyles.textContent = `
    .brand-button {
      border: 1px solid ${brandColors.primary.full || '#0070f3'};
      color: ${brandColors.primary.full || '#0070f3'};
      background-color: transparent;
      transition: all 0.2s ease-in-out;
    }
    .brand-button:hover:not(:disabled) {
      background-color: ${brandColors.primary.lighter || 'rgba(0, 112, 243, 0.1)'};
      color: ${brandColors.primary.full || '#0070f3'};
      border-color: ${brandColors.primary.full || '#0070f3'};
    }
    .brand-button:active:not(:disabled) {
      background-color: ${brandColors.primary.light || 'rgba(0, 112, 243, 0.2)'};
      color: ${brandColors.primary.full || '#0070f3'};
      border-color: ${brandColors.primary.full || '#0070f3'};
    }
  `;
  
  // Add the styles to document head
  useEffect(() => {
    document.head.appendChild(customButtonStyles);
    return () => {
      document.head.removeChild(customButtonStyles);
    };
  }, [brandColors.primary.full]);

  return (
    <Button 
      variant="outline"
      size={size}
      className={buttonClass}
      onClick={handleVirtFusionRedirect}
      disabled={isLoading}
      title={isListenerActive ? "Connect to VirtFusion panel" : "VirtFusion connection service not detected"}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      ) : (
        <ExternalLink className="h-4 w-4 mr-2" />
      )}
      {buttonText}
    </Button>
  );
}