import { ReactNode, useEffect, useState } from "react";
import { Link } from "wouter";
import { getBrandColors } from "@/lib/brand-theme";

interface AuthLayoutProps {
  children: ReactNode;
  heroTitle?: string;
  heroSubtitle?: string;
}

interface BrandingSettings {
  company_name?: string;
  company_logo?: string;
  company_color?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

export function AuthLayout({
  children,
  heroTitle = "Cloud Management Made Simple",
  heroSubtitle = "Virtual infrastructure management with powerful tools and real-time monitoring.",
}: AuthLayoutProps) {
  const [branding, setBranding] = useState<BrandingSettings>({
    company_name: 'VirtFusion',
    company_color: '2563eb'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [brandColors, setBrandColors] = useState<ReturnType<typeof getBrandColors> | null>(null);
  
  useEffect(() => {
    // Fetch branding settings when component mounts
    fetch('/api/settings/branding')
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return { 
          company_name: 'VirtFusion',
          primary_color: '2563eb',
          secondary_color: '10b981',
          accent_color: 'f59e0b' 
        };
      })
      .then(data => {
        setBranding(data);
        
        // Generate brand colors using the new system
        const colors = getBrandColors({
          primaryColor: data.primary_color || data.company_color || '2563eb',
          secondaryColor: data.secondary_color || '10b981',
          accentColor: data.accent_color || 'f59e0b'
        });
        
        setBrandColors(colors);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Failed to fetch branding settings:', error);
        setIsLoading(false);
      });
  }, []);
  
  // Show loading state if still fetching brand settings
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-gray-50 items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 rounded-full border-t-transparent" 
          style={{ borderColor: '#2563eb transparent #2563eb #2563eb' }}>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Form Side */}
      <div className="flex flex-col justify-center flex-1 px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="w-full max-w-sm mx-auto lg:w-96">
          <div className="mb-10">
            <div className="flex justify-center">
              <Link to="/" className="flex items-center">
                <div className="flex items-center justify-center h-12 w-14 mr-3 rounded-lg text-white font-bold text-xl"
                  style={{ backgroundColor: brandColors?.primary.full || '#2563eb' }}>
                  {branding.company_name?.charAt(0) || "V"}
                </div>
                <span
                  className="text-2xl font-bold"
                  style={{ color: brandColors?.primary.full || '#2563eb' }}
                >
                  {branding.company_name}
                </span>
              </Link>
            </div>
          </div>

          {children}
        </div>
      </div>

      {/* Hero Side */}
      <div className="relative flex-1 hidden w-0 lg:block">
        <div className="absolute inset-0 bg-green-600" 
          style={{ 
            backgroundColor: brandColors?.primary.full || '#2563eb' 
          }}>
          <div className="flex flex-col justify-center h-full px-10 text-white">
            <div className="max-w-xl">
              <h1 className="text-4xl font-extrabold">{heroTitle}</h1>
              <p className="mt-4 text-xl">{heroSubtitle}</p>

              <div className="mt-12">
                <h3 className="text-lg font-semibold mb-4">Key Features:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Instant server provisioning and deployment</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Comprehensive server management tools</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Real-time resource monitoring</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Secure PayPal payment integration</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="h-6 w-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Responsive 24/7 technical support</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Abstract Decoration */}
            <div className="absolute bottom-0 right-0 opacity-20">
              <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <path fill="white" d="M43.7,-57.7C55.5,-43.9,63,-28.8,67.8,-12.4C72.6,4,74.7,21.6,68.5,35.3C62.3,49,47.7,58.7,31.8,64.1C15.9,69.5,-1.4,70.6,-19.2,67.4C-36.9,64.2,-55.1,56.8,-64.5,42.7C-73.9,28.7,-74.5,8,-70.3,-10.6C-66,-29.3,-57,-45.8,-43.7,-59.3C-30.5,-72.7,-15.2,-83.2,0.2,-83.4C15.5,-83.6,31.9,-71.6,43.7,-57.7Z" transform="translate(100 100)" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
