import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Link, Unlink, ExternalLink, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OAuthAccount {
  id: number;
  userId: number;
  providerName: string;
  providerUserId: string;
  providerUserEmail?: string;
  providerUserName?: string;
  providerUserAvatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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

export function OAuthAccountLinking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);

  // Fetch user's OAuth accounts
  const {
    data: accounts = [],
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useQuery({
    queryKey: ['/api/oauth/accounts'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/accounts');
      return response as OAuthAccount[];
    },
  });

  // Fetch available OAuth providers
  const {
    data: providers = [],
    isLoading: providersLoading,
  } = useQuery({
    queryKey: ['/api/oauth/providers/enabled'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/providers/enabled');
      return response.providers as OAuthProvider[];
    },
  });

  // Unlink account mutation
  const unlinkMutation = useMutation({
    mutationFn: async (providerName: string) => {
      return await apiRequest(`/api/oauth/accounts/${providerName}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/accounts'] });
      toast({
        title: 'Account Unlinked',
        description: 'OAuth account has been unlinked successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Unlink Failed',
        description: error.message || 'Failed to unlink OAuth account',
        variant: 'destructive',
      });
    },
  });

  const handleLinkAccount = async (providerName: string) => {
    setLinkingProvider(providerName);
    try {
      const response = await apiRequest(`/api/oauth/login/${providerName}?redirect=${encodeURIComponent('/profile')}`);
      if (response.authUrl) {
        window.location.href = response.authUrl;
      } else {
        throw new Error('No authentication URL received');
      }
    } catch (error: any) {
      toast({
        title: 'Link Failed',
        description: error.message || 'Failed to initiate account linking',
        variant: 'destructive',
      });
      setLinkingProvider(null);
    }
  };

  const handleUnlinkAccount = async (providerName: string) => {
    await unlinkMutation.mutateAsync(providerName);
  };

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

  const getProviderColor = (providerName: string) => {
    switch (providerName) {
      case 'discord':
        return 'bg-[#5865F2]';
      case 'github':
        return 'bg-[#333]';
      case 'google':
        return 'bg-[#4285F4]';
      case 'linkedin':
        return 'bg-[#0077B5]';
      default:
        return 'bg-gray-500';
    }
  };

  const getProviderDisplayName = (providerName: string) => {
    const names: Record<string, string> = {
      discord: 'Discord',
      github: 'GitHub',
      google: 'Google',
      linkedin: 'LinkedIn',
    };
    return names[providerName] || providerName;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const availableProviders = providers.filter(p => p.enabled && p.clientId && p.clientSecret && p.redirectUrl);
  const linkedProviders = accounts.map(account => account.providerName);
  const unlinkedProviders = availableProviders.filter(p => !linkedProviders.includes(p.providerName));

  if (accountsLoading || providersLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Linked Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Link className="h-5 w-5" />
              <span>Linked Accounts</span>
              <Badge variant="secondary">{accounts.length}</Badge>
            </CardTitle>
            <CardDescription>
              Your accounts linked for OAuth authentication
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getProviderColor(account.providerName)}`}>
                    <span className="text-lg">{getProviderIcon(account.providerName)}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {getProviderDisplayName(account.providerName)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {account.providerUserEmail || account.providerUserName || account.providerUserId}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Linked on {formatDate(account.createdAt)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnlinkAccount(account.providerName)}
                  disabled={unlinkMutation.isPending}
                >
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Available Providers */}
      {unlinkedProviders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Link New Account</span>
            </CardTitle>
            <CardDescription>
              Link additional social accounts for convenient login
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {unlinkedProviders.map((provider) => (
              <div key={provider.providerName} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getProviderColor(provider.providerName)}`}>
                    <span className="text-lg">{getProviderIcon(provider.providerName)}</span>
                  </div>
                  <div>
                    <span className="font-medium">
                      {provider.displayName}
                    </span>
                    <div className="text-sm text-muted-foreground">
                      Secure OAuth authentication
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleLinkAccount(provider.providerName)}
                  disabled={linkingProvider === provider.providerName}
                >
                  {linkingProvider === provider.providerName ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link className="h-4 w-4 mr-2" />
                      Link Account
                    </>
                  )}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Providers Available */}
      {availableProviders.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No OAuth providers are currently configured</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Linked accounts are used for secure authentication. You can unlink accounts at any time, 
          but you'll need to use your email and password to sign in if you unlink all accounts.
        </AlertDescription>
      </Alert>
    </div>
  );
}

export default OAuthAccountLinking; 