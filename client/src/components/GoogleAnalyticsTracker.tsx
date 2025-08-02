import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter"; // Using wouter for routing

interface GoogleAnalyticsSettings {
  google_analytics_enabled?: string;
  google_analytics_code?: string;
  google_analytics_tracking_id?: string;
  google_analytics_selected_pages?: string;
}

export function GoogleAnalyticsTracker() {
  const [location] = useLocation();

  // Fetch Google Analytics settings
  const { data: analyticsSettings } = useQuery<GoogleAnalyticsSettings>({
    queryKey: ["/api/settings/google-analytics"],
    queryFn: async () => {
      const response = await fetch('/api/settings/google-analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch Google Analytics settings');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    console.log("🔍 GoogleAnalyticsTracker: Checking analytics for path:", location);
    console.log("🔍 GoogleAnalyticsTracker: Analytics settings:", analyticsSettings);

    // Only proceed if Google Analytics is enabled
    if (analyticsSettings?.google_analytics_enabled !== "true") {
      console.log("❌ GoogleAnalyticsTracker: Analytics not enabled");
      return;
    }

    // Check if current page is in selected pages
    const currentPath = location;
    const selectedPages = analyticsSettings?.google_analytics_selected_pages
      ? JSON.parse(analyticsSettings.google_analytics_selected_pages)
      : ["/", "/auth", "/blog", "/docs", "/status", "/plans", "/team", "/tos", "/privacy", "/sla-plans", "/sla", "/dashboard", "/servers", "/billing", "/tickets", "/profile", "/dns"];

    console.log("🔍 GoogleAnalyticsTracker: Selected pages:", selectedPages);
    console.log("🔍 GoogleAnalyticsTracker: Current path:", currentPath);

    // Check if current page should have tracking - EXACT matching for all pages
    const shouldTrack = selectedPages.some((page: string) => {
      // Exact match for root page
      if (page === "/" && currentPath === "/") {
        console.log("✅ GoogleAnalyticsTracker: Root page match");
        return true;
      }

      // Exact match for specific pages or their sub-routes
      if (page === "/auth" && currentPath.startsWith("/auth")) {
        console.log("✅ GoogleAnalyticsTracker: Auth page match");
        return true;
      }
      if (page === "/blog" && currentPath.startsWith("/blog")) {
        console.log("✅ GoogleAnalyticsTracker: Blog page match");
        return true;
      }
      if (page === "/docs" && currentPath.startsWith("/docs")) {
        console.log("✅ GoogleAnalyticsTracker: Docs page match");
        return true;
      }
      if (page === "/status" && currentPath.startsWith("/status")) {
        console.log("✅ GoogleAnalyticsTracker: Status page match");
        return true;
      }
      if (page === "/plans" && currentPath.startsWith("/plans")) {
        console.log("✅ GoogleAnalyticsTracker: Plans page match");
        return true;
      }
      if (page === "/team" && currentPath.startsWith("/team")) {
        console.log("✅ GoogleAnalyticsTracker: Team page match");
        return true;
      }
      if (page === "/tos" && currentPath.startsWith("/tos")) {
        console.log("✅ GoogleAnalyticsTracker: TOS page match");
        return true;
      }
      if (page === "/privacy" && currentPath.startsWith("/privacy")) {
        console.log("✅ GoogleAnalyticsTracker: Privacy page match");
        return true;
      }
      if (page === "/sla" && currentPath.startsWith("/sla")) {
        console.log("✅ GoogleAnalyticsTracker: SLA page match");
        return true;
      }
      if (page === "/sla-plans" && (currentPath.startsWith("/sla-plans") || currentPath.startsWith("/dashboard/sla"))) {
        console.log("✅ GoogleAnalyticsTracker: SLA Plans page match");
        return true;
      }
      if (page === "/dashboard" && currentPath.startsWith("/dashboard")) {
        console.log("✅ GoogleAnalyticsTracker: Dashboard page match");
        return true;
      }
      if (page === "/servers" && currentPath.startsWith("/servers")) {
        console.log("✅ GoogleAnalyticsTracker: Servers page match");
        return true;
      }
      if (page === "/billing" && currentPath.startsWith("/billing")) {
        console.log("✅ GoogleAnalyticsTracker: Billing page match");
        return true;
      }
      if (page === "/tickets" && currentPath.startsWith("/tickets")) {
        console.log("✅ GoogleAnalyticsTracker: Tickets page match");
        return true;
      }
      if (page === "/profile" && currentPath.startsWith("/profile")) {
        console.log("✅ GoogleAnalyticsTracker: Profile page match");
        return true;
      }
      if (page === "/dns" && currentPath.startsWith("/dns")) {
        console.log("✅ GoogleAnalyticsTracker: DNS page match");
        return true;
      }

      return false;
    });

    if (!shouldTrack) {
      console.log("❌ GoogleAnalyticsTracker: Page not selected for tracking");
      return;
    }

    console.log("✅ GoogleAnalyticsTracker: Page should be tracked, injecting analytics");

    // If Google Analytics is already loaded, just track the page view
    if (window.gtag) {
      console.log("✅ GoogleAnalyticsTracker: Analytics already loaded, sending page view");
      window.gtag("event", "page_view", {
        page_path: currentPath,
        page_title: document.title
      });
      return;
    }

    // If custom code is provided, use it
    if (analyticsSettings?.google_analytics_code) {
      console.log("✅ GoogleAnalyticsTracker: Injecting custom analytics code");
      // Create a script element and inject the custom code
      const script = document.createElement("script");
      script.innerHTML = analyticsSettings.google_analytics_code;
      script.async = true;
      document.head.appendChild(script);
      return;
    }

    // If tracking ID is provided, use the standard Google Analytics 4 code
    if (analyticsSettings?.google_analytics_tracking_id) {
      console.log("✅ GoogleAnalyticsTracker: Injecting GA4 tracking code for ID:", analyticsSettings.google_analytics_tracking_id);
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
  }, [analyticsSettings, location]);

  return null; // This component does not render any visible UI
}