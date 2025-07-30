import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface GoogleAnalyticsSettings {
  google_analytics_enabled?: string;
  google_analytics_code?: string;
  google_analytics_tracking_id?: string;
  google_analytics_selected_pages?: string;
}

export function GoogleAnalyticsProvider({ children }: { children: React.ReactNode }) {
  // Fetch Google Analytics settings
  const { data: analyticsSettings } = useQuery<GoogleAnalyticsSettings>({
    queryKey: ["/api/settings/google-analytics"],
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Only inject if Google Analytics is enabled
    if (analyticsSettings?.google_analytics_enabled !== "true") {
      return;
    }

    // Check if current page is in selected pages
    const currentPath = window.location.pathname;
    const selectedPages = analyticsSettings?.google_analytics_selected_pages 
      ? JSON.parse(analyticsSettings.google_analytics_selected_pages) 
      : ["/", "/auth", "/blog", "/docs", "/status", "/plans", "/team", "/tos", "/privacy", "/sla-plans", "/sla"];
    
    // Check if current page should have tracking
    const shouldTrack = selectedPages.some((page: string) => {
      if (page === "/") {
        return currentPath === "/";
      }
      return currentPath.startsWith(page);
    });

    if (!shouldTrack) {
      return;
    }

    // Check if Google Analytics is already loaded
    if (window.gtag) {
      return;
    }

    // If custom code is provided, use it
    if (analyticsSettings?.google_analytics_code) {
      // Create a script element and inject the custom code
      const script = document.createElement("script");
      script.innerHTML = analyticsSettings.google_analytics_code;
      script.async = true;
      document.head.appendChild(script);
      return;
    }

    // If tracking ID is provided, use the standard Google Analytics 4 code
    if (analyticsSettings?.google_analytics_tracking_id) {
      // Load Google Analytics 4 script
      const script = document.createElement("script");
      script.src = `https://www.googletagmanager.com/gtag/js?id=${analyticsSettings.google_analytics_tracking_id}`;
      script.async = true;
      document.head.appendChild(script);

      // Initialize gtag
      window.dataLayer = window.dataLayer || [];
      function gtag(...args: any[]) {
        window.dataLayer.push(args);
      }
      window.gtag = gtag;

      gtag("js", new Date());
      gtag("config", analyticsSettings.google_analytics_tracking_id);
    }
  }, [analyticsSettings]);

  return <>{children}</>;
} 