import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Github,
  Facebook,
  Mail,
  MapPin,
  Phone,
  Globe,
  Headphones,
  ChevronRight,
  Linkedin,
  Youtube,
  Instagram,
} from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";

interface BrandingSettings {
  company_name: string;
  company_color?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface FooterSettings {
  footer_description: string;
  footer_social_icons_enabled: string;
  footer_github_url: string;
  footer_facebook_url: string;
  footer_discord_url: string;
  footer_linkedin_url: string;
  footer_youtube_url: string;
  footer_instagram_url: string;
  footer_contact_email: string;
  footer_contact_support_text: string;
  footer_contact_phone: string;
}

// Map platform names to Lucide icons
const socialIcons: Record<string, React.ComponentType<any>> = {
  github: Github,
  facebook: Facebook,
  linkedin: Linkedin,
  youtube: Youtube,
  instagram: Instagram,
  discord: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h.01M15 12h.01M8.5 17h7a4.5 4.5 0 0 0 4.5-4.5v-2a4.5 4.5 0 0 0-4.5-4.5h-7A4.5 4.5 0 0 0 4 10.5v2A4.5 4.5 0 0 0 8.5 17Z" />
      <path d="m7 16.5-2 3M17 16.5l2 3" />
    </svg>
  )
};

export function SharedFooter() {
  // Fetch branding settings with default values
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
  
  // Fetch public settings for footer data
  const { data: publicSettings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings/public"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Extract footer settings from public settings
  const getSettingValue = (key: string, defaultValue: string = ""): string => {
    return publicSettings[key] || defaultValue;
  };
  
  const footerDescription = getSettingValue(
    "footer_description", 
    "High-performance VPS hosting solutions with exceptional support and reliability."
  );
  
  const socialIconsEnabled = getSettingValue("footer_social_icons_enabled", "true") === "true";
  
  // Get all social media URLs
  const socialUrls = {
    github: getSettingValue("footer_github_url", ""),
    facebook: getSettingValue("footer_facebook_url", ""),
    discord: getSettingValue("footer_discord_url", ""),
    linkedin: getSettingValue("footer_linkedin_url", ""),
    youtube: getSettingValue("footer_youtube_url", ""),
    instagram: getSettingValue("footer_instagram_url", "")
  };
  
  const contactEmail = getSettingValue("footer_contact_email", "support@example.com");
  const contactSupportText = getSettingValue("footer_contact_support_text", "24/7 Available");
  const contactPhone = getSettingValue("footer_contact_phone", "");

  const companyName = branding?.company_name || "SkyVPS360";
  
  // Use the new color system with fallbacks
  const brandColorOptions = {
    primaryColor: branding?.primary_color || branding?.company_color || "2563eb",
    secondaryColor: branding?.secondary_color || "10b981",
    accentColor: branding?.accent_color || "f59e0b"
  };
  
  // Get theme colors using our new color system
  const brandColors = getBrandColors(brandColorOptions);
  const currentYear = new Date().getFullYear();

  // Custom styled link that uses our brand colors
  const FooterLink = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <Link href={href}>
      <span
        className="flex text-gray-600 hover:text-gray-900 transition-colors duration-200 group-hover:text-gray-900"
        style={{ color: "inherit" }}
      >
        <ChevronRight
          className="h-4 w-4 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: brandColors.primary.full }}
        />
        {children}
      </span>
    </Link>
  );

  return (
    <footer className="bg-gray-50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center mb-2">
              <div
                className="h-8 w-10 rounded flex items-center justify-center mr-2 text-white font-bold text-lg"
                style={{ backgroundColor: brandColors.primary.full }}
              >
                {companyName?.charAt(0) || "S"}
              </div>
              <h3 className="text-xl font-bold text-gray-800">{companyName}</h3>
            </div>
            <p className="text-gray-600">
              {footerDescription}
            </p>
            {socialIconsEnabled && (
              <div className="flex flex-wrap gap-3 mt-6">
                {Object.entries(socialUrls).map(([platform, url]) => {
                  if (!url) return null;
                  const IconComponent = socialIcons[platform];
                  if (!IconComponent) return null;
                  
                  return (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full transition-colors duration-200"
                      style={{
                        backgroundColor: brandColors.primary.lighter,
                        color: brandColors.primary.full,
                      }}
                      aria-label={platform.charAt(0).toUpperCase() + platform.slice(1)}
                    >
                      <IconComponent className="h-5 w-5" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Links */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-800">
              Quick Links
            </h3>
            <ul className="space-y-3">
              <li className="group">
                <FooterLink href="/">Home</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/blog">Blog</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/docs">Documentation</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/status">System Status</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/speed-test">Network Speed Test</FooterLink>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-800">
              Our Services
            </h3>
            <ul className="space-y-3">
              <li className="group">
                <FooterLink href="/plans">VPS Plans</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/auth">Client Area</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/auth">Register</FooterLink>
              </li>
              <li className="group">
                <FooterLink href="/tickets">Contact Support</FooterLink>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-gray-800">
              Contact Info
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{ backgroundColor: brandColors.primary.lighter }}
                >
                  <Mail
                    className="h-5 w-5"
                    style={{ color: brandColors.primary.full }}
                  />
                </div>
                <div>
                  <span className="block text-gray-800 font-medium">Email</span>
                  <span className="text-gray-600">{contactEmail}</span>
                </div>
              </li>
              <li className="flex items-start">
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{ backgroundColor: brandColors.primary.lighter }}
                >
                  <Headphones
                    className="h-5 w-5"
                    style={{ color: brandColors.primary.full }}
                  />
                </div>
                <div>
                  <span className="block text-gray-800 font-medium">
                    Support
                  </span>
                  <span className="text-gray-600">{contactSupportText}</span>
                </div>
              </li>
              {contactPhone && (
                <li className="flex items-start">
                  <div
                    className="p-2 rounded-lg mr-3"
                    style={{ backgroundColor: brandColors.primary.lighter }}
                  >
                    <Phone
                      className="h-5 w-5"
                      style={{ color: brandColors.primary.full }}
                    />
                  </div>
                  <div>
                    <span className="block text-gray-800 font-medium">Phone</span>
                    <span className="text-gray-600">{contactPhone}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-12 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500 text-sm">
              &copy; {currentYear} {companyName}. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 md:mt-0">
              <Link href="/blog">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Blog
                </span>
              </Link>
              <Link href="/docs">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Documentation
                </span>
              </Link>
              <Link href="/status">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Status
                </span>
              </Link>
              <Link href="/speed-test">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Speed Test
                </span>
              </Link>
              <Link href="/tos">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Terms of Service
                </span>
              </Link>
              <Link href="/privacy">
                <span 
                  className="text-gray-500 text-sm transition-colors duration-200 hover:text-gray-900"
                  style={{ color: `inherit` }}
                  onMouseOver={(e) => (e.currentTarget.style.color = brandColors.primary.full)}
                  onMouseOut={(e) => (e.currentTarget.style.color = "inherit")}
                >
                  Privacy Policy
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
