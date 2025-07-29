import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { getBrandColors } from '@/lib/brand-theme';

interface OAuthProvider {
  providerName: string;
  displayName: string;
  clientId?: string;
  clientSecret?: string;
  redirectUrl?: string;
  scope?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

const getProviderIcon = (providerName: string) => {
  switch (providerName) {
    case 'discord':
      return '🎮';
    case 'github':
      return '🐙';
    case 'google':
      return '🔍';
    case 'linkedin':
      return '💼';
    default:
      return '🔗';
  }
};



export function OAuthLoginButtons() {
  const { toast } = useToast();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  // Fetch enabled OAuth providers
  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['/api/oauth/providers/enabled/public'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/providers/enabled/public');
      return response.providers || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Filter for providers that are enabled and have required configuration
  const enabledProviders = providers.filter((p: OAuthProvider) => 
    p.enabled && p.clientId && p.clientSecret && p.redirectUrl
  );

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (enabledProviders.length === 0) {
    return null;
  }

  const handleProviderClick = async (providerName: string) => {
    setLoadingProvider(providerName);
    try {
      const response = await apiRequest(`/api/oauth/login/${providerName}`);
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('No authentication URL received');
      }
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to initiate OAuth login',
        variant: 'destructive',
      });
    } finally {
      setLoadingProvider(null);
    }
  };

  // Get brand colors for theming
  const brandColors = getBrandColors();

  return (
    <div className="space-y-3">
      {enabledProviders.map((provider: OAuthProvider) => (
        <Button
          key={provider.providerName}
          variant="outline"
          style={{
            borderColor: brandColors.primary.medium,
            color: brandColors.primary.full,
            backgroundColor: 'transparent',
          }}
          className="w-full h-12 relative transition-all duration-200"
          onClick={() => handleProviderClick(provider.providerName)}
          disabled={loadingProvider === provider.providerName}
          onMouseEnter={(e) => {
            if (!loadingProvider) {
              e.currentTarget.style.backgroundColor = brandColors.primary.lighter;
              e.currentTarget.style.borderColor = brandColors.primary.full;
            }
          }}
          onMouseLeave={(e) => {
            if (!loadingProvider) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = brandColors.primary.medium;
            }
          }}
        >
          <div className="flex items-center justify-center space-x-3">
            {loadingProvider === provider.providerName ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="text-xl">{getProviderIcon(provider.providerName)}</span>
            )}
            <span className="font-medium">
              Continue with {provider.displayName}
            </span>
            <ExternalLink className="h-4 w-4 ml-auto" />
          </div>
        </Button>
      ))}
    </div>
  );
}

export default OAuthLoginButtons; 