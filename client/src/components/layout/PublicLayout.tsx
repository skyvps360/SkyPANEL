import React from "react";
import { SharedNavbar } from "./SharedNavbar";
import { SharedFooter } from "./SharedFooter";
import { useQuery } from "@tanstack/react-query";
import { getBrandColors } from "@/lib/brand-theme";
import { TrustpilotWidget } from "../TrustpilotWidget";


interface PublicLayoutProps {
  children: React.ReactNode;
}

interface BrandingSettings {
  company_name: string;
  company_color: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  // Fetch branding settings for consistent theme across the app
  const {
    data: branding = { 
      company_name: "SkyVPS360", 
      company_color: "2563eb",
      primary_color: "2563eb",
      secondary_color: "10b981",
      accent_color: "f59e0b"
    },
  } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Get brand colors for theme, using the new color system
  const brandColorOptions = {
    primaryColor: branding?.primary_color || branding?.company_color || "2563eb", // Fallback to company_color for backward compatibility
    secondaryColor: branding?.secondary_color || "10b981",
    accentColor: branding?.accent_color || "f59e0b"
  };
  const brandColors = getBrandColors(brandColorOptions);

  // Define CSS variables for global access to company colors throughout the app
  const cssVariables = {
    // Primary color variables (main brand color)
    "--color-primary": brandColors.primary.full,
    "--color-primary-light": brandColors.primary.light,
    "--color-primary-medium": brandColors.primary.medium,
    "--color-primary-lighter": brandColors.primary.lighter,
    "--color-primary-dark": brandColors.primary.dark,
    
    // Secondary color variables
    "--color-secondary": brandColors.secondary.full,
    "--color-secondary-light": brandColors.secondary.light,
    "--color-secondary-medium": brandColors.secondary.medium,
    "--color-secondary-lighter": brandColors.secondary.lighter,
    "--color-secondary-dark": brandColors.secondary.dark,
    
    // Accent color variables
    "--color-accent": brandColors.accent.full,
    "--color-accent-light": brandColors.accent.light,
    "--color-accent-medium": brandColors.accent.medium,
    "--color-accent-lighter": brandColors.accent.lighter,
    "--color-accent-dark": brandColors.accent.dark,
    
    // Hover, focus, and active states
    "--hover-bg-color": brandColors.primary.lighter,
    "--hover-text-color": brandColors.primary.full,
    "--focus-ring-color": brandColors.primary.full,
    "--active-bg-color": brandColors.primary.light,
    
    // Legacy variables for backward compatibility (will be removed in future)
    "--color-brand": brandColors.primary.full,
    "--color-brand-light": brandColors.primary.light,
    "--color-brand-medium": brandColors.primary.medium,
    "--color-brand-lighter": brandColors.primary.lighter,
    "--color-brand-legacy": brandColors.primary.full,
    "--color-brand-light-legacy": brandColors.primary.light,
    "--color-brand-medium-legacy": brandColors.primary.medium,
    "--color-brand-lighter-legacy": brandColors.primary.lighter,
  } as React.CSSProperties;

  return (
    <div className="flex flex-col min-h-screen" style={cssVariables}>

      <SharedNavbar />
      {/* Trustpilot Review Collector widget - visible near header */}
      <TrustpilotWidget />
      <main className="flex-grow">{children}</main>
      <SharedFooter />
    </div>
  );
}
