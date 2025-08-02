import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface GoogleAnalyticsSettings {
  google_analytics_enabled?: string;
  google_analytics_code?: string;
  google_analytics_tracking_id?: string;
  google_analytics_selected_pages?: string;
}

export function GoogleAnalyticsTracker() {
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
      : ["/", "/auth", "/blog", "/docs", "/status", "/plans", "/team", "/tos", "/privacy", "/sla-plans", "/sla", "/dashboard", "/servers", "/billing", "/tickets", "/profile", "/dns"];
    
    // Check if current page should have tracking
    const shouldTrack = selectedPages.some((page: string) => {
      if (page === "/" && currentPath === "/") {
        return true;
      }
      if (page === "/auth" && currentPath.startsWith("/auth")) {
        return true;
      }
      if (page === "/blog" && currentPath.startsWith("/blog")) {
        return true;
      }
      if (page === "/docs" && currentPath.startsWith("/docs")) {
        return true;
      }
      if (page === "/status" && currentPath.startsWith("/status")) {
        return true;
      }
      if (page === "/plans" && currentPath.startsWith("/plans")) {
        return true;
      }
      if (page === "/team" && currentPath.startsWith("/team")) {
        return true;
      }
      if (page === "/tos" && currentPath.startsWith("/tos")) {
        return true;
      }
      if (page === "/privacy" && currentPath.startsWith("/privacy")) {
        return true;
      }
      if (page === "/sla" && currentPath.startsWith("/sla")) {
        return true;
      }
      if (page === "/sla-plans" && (currentPath.startsWith("/sla-plans") || currentPath.startsWith("/dashboard/sla"))) {
        return true;
      }
      if (page === "/dashboard" && currentPath.startsWith("/dashboard")) {
        return true;
      }
      if (page === "/servers" && currentPath.startsWith("/servers")) {
        return true;
      }
      if (page === "/billing" && currentPath.startsWith("/billing")) {
        return true;
      }
      if (page === "/tickets" && currentPath.startsWith("/tickets")) {
        return true;
      }
      if (page === "/profile" && currentPath.startsWith("/profile")) {
        return true;
      }
      if (page === "/dns" && currentPath.startsWith("/dns")) {
        return true;
      }
      return false;
    });

    if (!shouldTrack) {
      return;
    }

    // Check if Google Analytics is already loaded
    if (window.gtag) {
      // Send page view for already loaded analytics
      window.gtag("event", "page_view", {
        page_path: currentPath,
        page_title: document.title
      });
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
      const gtag = (...args: any[]) => {
        window.dataLayer.push(args);
      };
      window.gtag = gtag;

      gtag("js", new Date());
      gtag("config", analyticsSettings.google_analytics_tracking_id);
    }
  }, [analyticsSettings]);

  return null;
}