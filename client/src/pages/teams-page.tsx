import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet";
import { getBrandColors } from "@/lib/brand-theme";
import { TeamCards } from "@/components/teams/TeamCards";
import { Loader2, Users } from "lucide-react";
import { GoogleAnalyticsTracker } from "../components/GoogleAnalyticsTracker";

interface TeamMember {
  id: number;
  discordUserId: string;
  discordUsername: string;
  displayName?: string; // Optional custom display name
  discordAvatarUrl?: string;
  role: string;
  aboutMe?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BrandingSettings {
  company_name: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export default function teamPage() {
  // Fetch branding settings
  const {
    data: branding = {
      company_name: "SkyVPS360",
      primary_color: "",
      secondary_color: "",
      accent_color: ""
    },
  } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch team members
  const {
    data: teamMembers = [],
    isLoading,
    error,
  } = useQuery<TeamMember[]>({
    queryKey: ["/api/team"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const companyName = branding?.company_name;

  // Get brand colors
  const brandColorOptions = {
    primaryColor: branding?.primary_color,
    secondaryColor: branding?.secondary_color,
    accentColor: branding?.accent_color
  };
  const brandColors = getBrandColors(brandColorOptions);

  if (isLoading) {
    return (
      <PublicLayout>
        <Helmet>
          <title>Our Team - {companyName}</title>
          <meta name="description" content={`Meet the team behind ${companyName} - dedicated professionals providing excellent VPS hosting services.`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: brandColors.primary.full }} />
            <span className="text-lg">Loading team members...</span>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (error) {
    return (
      <PublicLayout>
        <Helmet>
          <title>Our Team - {companyName}</title>
          <meta name="description" content={`Meet the team behind ${companyName} - dedicated professionals providing excellent VPS hosting services.`} />
        </Helmet>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to load team members</h2>
            <p className="text-gray-600">Please try again later.</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <>
      <GoogleAnalyticsTracker />
      <PublicLayout>
      <Helmet>
        <title>Our Team - {companyName}</title>
        <meta name="description" content={`Meet the team behind ${companyName} - dedicated professionals providing excellent VPS hosting services.`} />
      </Helmet>

              {/* Hero Section - matching blog, docs, and status pages */}
      <div 
        className="relative overflow-hidden w-full"
        style={{ 
          backgroundColor: brandColors.primary.full,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)]" style={{ backgroundSize: '20px 20px' }}></div>
        
        {/* Decorative bubbles in the background, matching other pages */}
        <div className="absolute top-0 right-0 opacity-10">
          <svg width="350" height="350" viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="175" cy="175" r="175" fill="white" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 opacity-10 translate-y-1/2 -translate-x-1/4">
          <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="150" cy="150" r="150" fill="white" />
          </svg>
        </div>
        <div className="absolute top-1/4 right-1/4 opacity-10">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="40" cy="40" r="40" fill="white" />
          </svg>
        </div>

        <div className="max-w-screen-xl mx-auto py-16 px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="flex items-center mb-6">
              <div
                className="p-3 rounded-full mr-4"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
              >
                <Users className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-white">
                Meet Our Team
              </h1>
            </div>
            <p className="text-white text-lg opacity-90 max-w-xl leading-relaxed">
              Get to know the dedicated professionals behind {companyName} who work tirelessly
              to provide you with exceptional VPS hosting services and support.
            </p>
          </div>
        </div>
      </div>

      {/* Team Members Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {teamMembers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No team members yet</h3>
              <p className="text-gray-600">Check back soon to meet our team!</p>
            </div>
          ) : (
            <TeamCards teamMembers={teamMembers} brandColors={brandColors} />
          )}
        </div>
      </section>
    </PublicLayout>
    </>
  );
}
