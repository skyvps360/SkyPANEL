import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet";
import { getBrandColors } from "@/lib/brand-theme";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users } from "lucide-react";

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
    <PublicLayout>
      <Helmet>
        <title>Our Team - {companyName}</title>
        <meta name="description" content={`Meet the team behind ${companyName} - dedicated professionals providing excellent VPS hosting services.`} />
      </Helmet>

      {/* Hero Section - matching blog, docs, status, and speed-test pages */}
      <div style={{ backgroundColor: brandColors.primary.full }} className="relative overflow-hidden w-full">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {teamMembers
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((member) => (
                  <Card key={member.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-gray-300">
                    <CardContent className="p-6 text-center">
                      {/* Avatar */}
                      <div className="mb-4">
                        {member.discordAvatarUrl ? (
                          <img
                            src={member.discordAvatarUrl}
                            alt={`${member.displayName || member.discordUsername}'s avatar`}
                            className="w-20 h-20 rounded-full mx-auto border-4 border-gray-100 group-hover:border-gray-200 transition-colors"
                          />
                        ) : (
                          <div
                            className="w-20 h-20 rounded-full mx-auto border-4 border-gray-100 group-hover:border-gray-200 transition-colors flex items-center justify-center text-white font-bold text-xl"
                            style={{ backgroundColor: brandColors.primary.full }}
                          >
                            {(member.displayName || member.discordUsername).charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>

                      {/* Name */}
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {member.displayName || member.discordUsername}
                      </h3>

                      {/* Role Badge */}
                      <Badge
                        variant="secondary"
                        className="mb-3 text-white"
                        style={{ backgroundColor: brandColors.primary.full }}
                      >
                        {member.role}
                      </Badge>

                      {/* About Me */}
                      {member.aboutMe && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {member.aboutMe}
                        </p>
                      )}

                      {/* Discord ID (subtle) */}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400">
                          Discord: {member.discordUserId}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </section>
    </PublicLayout>
  );
}
