import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { Helmet } from "react-helmet";
import { getBrandColors, getPatternBackgrounds } from "@/lib/brand-theme";
import { TeamCards } from "@/components/teams/TeamCards";
import { Loader2, Users, Award, Shield, Clock, Heart, Star } from "lucide-react";


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

  // Get pattern backgrounds for visual elements
  const patterns = getPatternBackgrounds({
    primaryColor: branding?.primary_color
  });

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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        {/* Hero Section - Enhanced to match plan page design */}
        <div 
          className="relative overflow-hidden w-full"
          style={{ 
            background: `linear-gradient(135deg, ${brandColors.primary.full} 0%, ${brandColors.primary.dark} 100%)`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}
        >
          {/* Pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={patterns.dots.style}
          ></div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 opacity-10">
            <svg width="400" height="400" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="200" fill="white" />
            </svg>
          </div>
          <div className="absolute bottom-0 left-0 opacity-10 translate-y-1/2 -translate-x-1/4">
            <svg width="300" height="300" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="150" cy="150" r="150" fill="white" />
            </svg>
          </div>
          
          <div className="max-w-screen-xl mx-auto py-20 px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex items-center justify-center mb-8">
                <div
                  className="p-4 rounded-full mr-6"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <Users className="h-10 w-10 text-white" />
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight">
                  Meet Our Amazing Team
                </h1>
              </div>
              <p className="text-white text-xl opacity-95 max-w-3xl mx-auto leading-relaxed mb-12">
                Get to know the dedicated professionals behind {companyName} who work tirelessly
                to provide you with exceptional VPS hosting services and support.
              </p>
              
              {/* Key Benefits Grid - matching plan page */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto">
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Passionate Experts</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">24/7 Support</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Industry Experience</span>
                </div>
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-white/20">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm">Trusted Partners</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Section */}
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Team Members</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Meet the talented individuals who make {companyName} the leading VPS hosting provider.
            </p>
          </div>

          {teamMembers.length === 0 ? (
            <div className="text-center py-16">
              <Users className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-2xl font-semibold mb-4">No team members yet</h3>
              <p className="text-gray-600 mb-6">Check back soon to meet our amazing team!</p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Star className="w-4 h-4" />
                <span>We're building something special</span>
              </div>
            </div>
          ) : (
            <TeamCards teamMembers={teamMembers} brandColors={brandColors} />
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
