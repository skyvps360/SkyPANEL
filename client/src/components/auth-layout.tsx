import { ReactNode, useState, useEffect } from "react";
import { getBrandColors, BrandColorsResult } from "../lib/brand-theme";
import { Link } from "wouter";

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const [companyName, setCompanyName] = useState<string>("SkyVPS360");
  const [primaryColor, setPrimaryColor] = useState<string>("2563eb"); // Default blue
  const [secondaryColor, setSecondaryColor] = useState<string>("818cf8"); // Default purple
  const [accentColor, setAccentColor] = useState<string>("f59e0b"); // Default amber
  const [recentBlogPosts, setRecentBlogPosts] = useState<any[]>([]);
  
  // Generate brand colors based on the brand color system
  const colors: BrandColorsResult = getBrandColors({
    primaryColor,
    secondaryColor,
    accentColor
  });
  
  useEffect(() => {
    // Fetch branding settings on component mount
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return { 
          company_name: 'SkyVPS360', 
          primary_color: '2563eb',
          secondary_color: '818cf8',
          accent_color: 'f59e0b'
        };
      })
      .then(data => {
        // The API returns either { company_name: "SkyVPS360" } directly 
        // or an array of settings. Handle both formats.
        if (data.company_name) {
          setCompanyName(data.company_name);
          
          // Set colors if available, with fallbacks
          if (data.primary_color) {
            setPrimaryColor(data.primary_color);
          } else if (data.company_color) {
            // For backward compatibility
            setPrimaryColor(data.company_color);
          }
          
          if (data.secondary_color) {
            setSecondaryColor(data.secondary_color);
          }
          
          if (data.accent_color) {
            setAccentColor(data.accent_color);
          }
        } else if (Array.isArray(data)) {
          // Handle array format
          const companySetting = data.find(s => s.key === 'company_name');
          if (companySetting && companySetting.value) {
            setCompanyName(companySetting.value);
          }
          
          // Handle color settings in array format
          const primaryColorSetting = data.find(s => s.key === 'primary_color');
          if (primaryColorSetting && primaryColorSetting.value) {
            setPrimaryColor(primaryColorSetting.value);
          } else {
            // Fall back to legacy company_color
            const legacyColorSetting = data.find(s => s.key === 'company_color');
            if (legacyColorSetting && legacyColorSetting.value) {
              setPrimaryColor(legacyColorSetting.value);
            }
          }
          
          const secondaryColorSetting = data.find(s => s.key === 'secondary_color');
          if (secondaryColorSetting && secondaryColorSetting.value) {
            setSecondaryColor(secondaryColorSetting.value);
          }
          
          const accentColorSetting = data.find(s => s.key === 'accent_color');
          if (accentColorSetting && accentColorSetting.value) {
            setAccentColor(accentColorSetting.value);
          }
        }
      })
      .catch(error => {
        console.error('Failed to fetch branding settings:', error);
        // Set default name if fetch fails
        setCompanyName('SkyVPS360');
      });
      
    // Fetch recent blog posts
    fetch('/api/public/blog')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return [];
      })
      .then(data => {
        // Get only the 3 most recent posts
        const recent = Array.isArray(data) ? data.slice(0, 3) : [];
        setRecentBlogPosts(recent);
      })
      .catch(error => {
        console.error('Failed to fetch recent blog posts:', error);
      });
  }, []);

  return (
    <div className="container relative min-h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex">
        {/* Use dynamic company color instead of hardcoded bg-primary */}
        <div className="absolute inset-0" style={{ backgroundColor: colors.primary.full }} />
        <div className="relative z-20 flex items-center text-lg font-medium">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="h-10 w-auto mr-2"
            onError={(e) => {
              // If logo fails to load, hide the img element
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          {companyName}
        </div>
        
        {/* Recent blog posts section */}
        {recentBlogPosts.length > 0 && (
          <div className="relative z-20 mt-12">
            <h3 className="text-xl font-bold mb-4">Recent News</h3>
            <div className="space-y-4">
              {recentBlogPosts.map((post) => (
                <div key={post.id} className="group">
                  <h4 className="font-medium group-hover:underline">
                    <Link href={`/blog/${post.slug}`}>
                      {post.title}
                    </Link>
                  </h4>
                  <p className="text-sm text-white/80 line-clamp-2">{post.snippet}</p>
                  <span className="text-xs text-white/70 block mt-1">
                    {new Date(post.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/blog">
              <span className="mt-4 inline-block text-sm hover:underline">
                View all posts →
              </span>
            </Link>
          </div>
        )}
        
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Fast, reliable and secure server hosting for all your needs."
            </p>
            <footer className="text-sm">{companyName} Team</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
          {children}
        </div>
      </div>
    </div>
  );
}