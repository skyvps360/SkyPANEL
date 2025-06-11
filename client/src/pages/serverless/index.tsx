import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Cloud,
  MessageSquare,
  Sparkles,

  ArrowRight,
  Zap,
  Globe,

  Bot,
  Rocket,
  Shield,
  Infinity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getBrandColors } from '@/lib/brand-theme';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface BrandingSettings {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

const ServerlessOverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();

  // Fetch branding settings
  const { data: brandingData } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  // Memoize brand colors to prevent infinite re-renders
  const brandColors = useMemo(() => {
    return getBrandColors({
      primaryColor: brandingData?.primary_color || '2563eb',
      secondaryColor: brandingData?.secondary_color || '10b981',
      accentColor: brandingData?.accent_color || 'f59e0b'
    });
  }, [
    brandingData?.primary_color,
    brandingData?.secondary_color,
    brandingData?.accent_color
  ]);

  // Apply brand colors to the page
  useEffect(() => {
    if (brandColors && brandingData) {
      // Import and apply the brand color variables to both CSS variables and Shadcn theme
      import('@/lib/brand-theme').then(({ applyBrandColorVars, applyToShadcnTheme }) => {
        applyBrandColorVars({
          primaryColor: brandingData.primary_color || '2563eb',
          secondaryColor: brandingData.secondary_color || '10b981',
          accentColor: brandingData.accent_color || 'f59e0b'
        });

        // Apply the colors to the Shadcn theme as well
        applyToShadcnTheme(brandColors);
        console.log('Applied brand colors to Shadcn theme in Serverless Overview page');
      });
    }
  }, [brandColors, brandingData?.primary_color, brandingData?.secondary_color, brandingData?.accent_color]);

  const serverlessServices = [
    {
      title: "AI Services",
      description: "Access 28+ AI models including GPT-4, Claude, and more with unlimited conversations and streaming responses.",
      icon: <MessageSquare className="h-8 w-8" />,
      href: "/serverless/ai",
      features: ["28+ AI Models", "Unlimited Conversations", "Streaming Responses", "Function Calling"]
    },
    {
      title: "Web Hosting",
      description: "Deploy static websites instantly with custom subdomains and integrated file management.",
      icon: <Sparkles className="h-8 w-8" />,
      href: "/serverless/hosting",
      features: ["Instant Deployment", "Custom Subdomains", "File Management", "Static Sites"]
    }
  ];

  const benefits = [
    {
      icon: <Zap className="h-6 w-6" />,
      title: "No Backend Required",
      description: "Build powerful applications with just frontend code"
    },
    {
      icon: <Infinity className="h-6 w-6" />,
      title: "Infinitely Scalable",
      description: "Your costs stay the same whether you have 1 or 1 million users"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Privacy Focused",
      description: "No tracking, no data collection, complete privacy"
    },
    {
      icon: <Rocket className="h-6 w-6" />,
      title: "Instant Setup",
      description: "Just include a script tag and start building"
    }
  ];

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header - Matching My Servers design */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Cloud className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Serverless Services
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Build powerful applications with AI and hosting - all serverless, all free for developers.
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant="secondary" className="bg-muted text-muted-foreground">
                    <Globe className="h-4 w-4 mr-2" />
                    Powered by Puter.js
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                <Button
                  variant="outline"
                  className="border-border hover:bg-muted"
                >
                  Request a Feature
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Services Grid - Matching brand theme */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {serverlessServices.map((service, index) => (
            <Card
              key={index}
              className="group hover:shadow-lg transition-all duration-300 cursor-pointer border hover:border-primary/50"
              onClick={() => setLocation(service.href)}
            >
              <CardHeader>
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center mb-4"
                  style={{
                    backgroundColor: brandColors.primary.lighter
                  }}
                >
                  <div
                    style={{
                      color: brandColors.primary.full
                    }}
                  >
                    {service.icon}
                  </div>
                </div>
                <CardTitle className="text-xl">{service.title}</CardTitle>
                <CardDescription className="text-base">
                  {service.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {service.features.map((feature, featureIndex) => (
                      <div key={featureIndex} className="flex items-center text-sm text-muted-foreground">
                        <div
                          className="w-1.5 h-1.5 rounded-full mr-2"
                          style={{
                            backgroundColor: brandColors.primary.full
                          }}
                        />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button
                    className="w-full transition-colors bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(service.href);
                    }}
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Benefits Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-center">Why Choose Serverless?</CardTitle>
            <CardDescription className="text-center text-lg">
              Experience the future of web development with our serverless platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div
                      className="p-3 rounded-full"
                      style={{
                        backgroundColor: brandColors.primary.lighter
                      }}
                    >
                      <div
                        style={{
                          color: brandColors.primary.full
                        }}
                      >
                        {benefit.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Getting Started Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Getting Started</CardTitle>
            <CardDescription>
              Start building with serverless services in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center space-y-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-bold text-white"
                  style={{
                    backgroundColor: brandColors.primary.full
                  }}
                >
                  1
                </div>
                <h3 className="font-semibold">Choose a Service</h3>
                <p className="text-sm text-muted-foreground">
                  Select from AI or Hosting services based on your needs
                </p>
              </div>
              <div className="text-center space-y-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-bold text-white"
                  style={{
                    backgroundColor: brandColors.primary.full
                  }}
                >
                  2
                </div>
                <h3 className="font-semibold">Sign in to Puter.js</h3>
                <p className="text-sm text-muted-foreground">
                  Authenticate with your Puter.js account to access serverless features
                </p>
              </div>
              <div className="text-center space-y-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-bold text-white"
                  style={{
                    backgroundColor: brandColors.primary.full
                  }}
                >
                  3
                </div>
                <h3 className="font-semibold">Start Building</h3>
                <p className="text-sm text-muted-foreground">
                  Begin creating with unlimited scalability and zero infrastructure costs
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <div className="text-center space-y-4 py-8">
          <h2 className="text-3xl font-bold">Ready to Go Serverless?</h2>
          <p className="text-lg text-muted-foreground">
            Choose a service below and start building your next project
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => setLocation('/serverless/ai')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Bot className="h-5 w-5 mr-2" />
              Try AI Services
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setLocation('/serverless/hosting')}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-5 w-5 mr-2" />
              Deploy a Website
            </Button>

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessOverviewPage;
