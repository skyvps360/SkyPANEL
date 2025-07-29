import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/AdminLayout';
import { OAuthProviderConfig } from '@/components/admin/OAuthProviderConfig';
import { OAuthAnalytics } from '@/components/admin/OAuthAnalytics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Settings, BarChart3, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OAuthProvider {
  id: number;
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

interface OAuthAnalytics {
  loginStats: Array<{
    providerName: string;
    totalLogins: string;
    successfulLogins: string;
    failedLogins: string;
  }>;
  linkedAccounts: Array<{
    providerName: string;
    count: string;
  }>;
  recentActivity: Array<{
    id: number;
    userId?: number;
    providerName: string;
    providerUserId?: string;
    loginType: 'link' | 'login' | 'unlink';
    status: 'success' | 'failed' | 'pending';
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    createdAt: string;
  }>;
}

export default function OAuthSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('providers');

  // Fetch OAuth providers
  const {
    data: providers = [],
    isLoading: providersLoading,
    error: providersError,
    refetch: refetchProviders,
  } = useQuery({
    queryKey: ['/api/oauth/providers'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/providers');
      return response as OAuthProvider[];
    },
  });

  // Fetch OAuth analytics
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['/api/oauth/analytics'],
    queryFn: async () => {
      const response = await apiRequest('/api/oauth/analytics');
      return response as OAuthAnalytics;
    },
  });

  // Update provider mutation
  const updateProviderMutation = useMutation({
    mutationFn: async ({ providerName, config }: { providerName: string; config: Partial<OAuthProvider> }) => {
      return await apiRequest(`/api/oauth/providers/${providerName}`, {
        method: 'PUT',
        body: config,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/providers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/oauth/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Update Failed',
        description: error.message || 'Failed to update OAuth provider',
        variant: 'destructive',
      });
    },
  });

  const handleProviderUpdate = async (providerName: string, config: Partial<OAuthProvider>) => {
    await updateProviderMutation.mutateAsync({ providerName, config });
  };

  const handleRefresh = () => {
    refetchProviders();
    refetchAnalytics();
    toast({
      title: 'Refreshed',
      description: 'OAuth data has been refreshed',
    });
  };

  if (providersError) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600">Error Loading OAuth Settings</h2>
            <p className="text-gray-600 mt-2">
              {providersError.message || 'Failed to load OAuth providers'}
            </p>
            <Button onClick={() => refetchProviders()} className="mt-4">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">OAuth SSO Settings</h1>
            <p className="text-gray-500 mt-1">
              Configure OAuth providers for Single Sign-On authentication
            </p>
          </div>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providers.length}</div>
            <p className="text-xs text-muted-foreground">Available providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled Providers</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter(p => p.enabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Active providers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configured Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {providers.filter(p => p.clientId && p.clientSecret && p.redirectUrl).length}
            </div>
            <p className="text-xs text-muted-foreground">Ready to use</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.loginStats.reduce((sum, stat) => sum + parseInt(stat.totalLogins), 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">OAuth logins</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="providers" className="flex items-center space-x-2">
            <Settings className="h-4 w-4" />
            <span>Providers</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          {providersLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {providers.map((provider) => (
                <OAuthProviderConfig
                  key={provider.id}
                  provider={provider}
                  onUpdate={handleProviderUpdate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : analyticsError ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-red-600">Error Loading Analytics</h2>
                  <p className="text-gray-600 mt-2">
                    {analyticsError.message || 'Failed to load OAuth analytics'}
                  </p>
                  <Button onClick={() => refetchAnalytics()} className="mt-4">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Retry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : analytics ? (
            <OAuthAnalytics analytics={analytics} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <h2 className="text-xl font-semibold text-gray-600">No Analytics Data</h2>
                  <p className="text-gray-500 mt-2">
                    OAuth analytics will appear here once providers are configured and used.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
} 