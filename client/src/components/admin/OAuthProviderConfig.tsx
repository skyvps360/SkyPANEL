import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Loader2, CheckCircle, XCircle, Settings, Eye, EyeOff, Info, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface OAuthProviderConfigProps {
  provider: OAuthProvider;
  onUpdate: (providerName: string, config: Partial<OAuthProvider>) => void;
}

const defaultScopes = {
  discord: 'identify email',
  github: 'read:user user:email',
  google: 'openid email profile',
  linkedin: 'r_liteprofile r_emailaddress',
};

const setupInstructions = {
  discord: {
    title: 'Discord OAuth Setup',
    steps: [
      'Go to Discord Developer Portal (https://discord.com/developers/applications)',
      'Create a new application or select an existing one',
      'Navigate to the "OAuth2" section in the left sidebar',
      'Add your redirect URL: https://yourdomain.com/api/oauth/callback/discord',
      'Copy the Client ID and Client Secret',
      'Save the configuration below'
    ],
    redirectUrl: 'https://yourdomain.com/api/oauth/callback/discord',
    scopes: 'identify email'
  },
  github: {
    title: 'GitHub OAuth Setup',
    steps: [
      'Go to GitHub Developer Settings (https://github.com/settings/developers)',
      'Click "New OAuth App"',
      'Fill in the application details',
      'Set Authorization callback URL: https://yourdomain.com/api/oauth/callback/github',
      'Copy the Client ID and Client Secret',
      'Save the configuration below'
    ],
    redirectUrl: 'https://yourdomain.com/api/oauth/callback/github',
    scopes: 'read:user user:email'
  },
  google: {
    title: 'Google OAuth Setup',
    steps: [
      'Go to Google Cloud Console (https://console.cloud.google.com/)',
      'Create a new project or select an existing one',
      'Enable the Google+ API',
      'Go to "Credentials" and create an OAuth 2.0 Client ID',
      'Add your redirect URI: https://yourdomain.com/api/oauth/callback/google',
      'Copy the Client ID and Client Secret',
      'Save the configuration below'
    ],
    redirectUrl: 'https://yourdomain.com/api/oauth/callback/google',
    scopes: 'openid email profile'
  },
  linkedin: {
    title: 'LinkedIn OAuth Setup',
    steps: [
      'Go to LinkedIn Developer Portal (https://www.linkedin.com/developers/)',
      'Create a new app or select an existing one',
      'Go to "Auth" tab',
      'Add your redirect URL: https://yourdomain.com/api/oauth/callback/linkedin',
      'Copy the Client ID and Client Secret',
      'Save the configuration below'
    ],
    redirectUrl: 'https://yourdomain.com/api/oauth/callback/linkedin',
    scopes: 'r_liteprofile r_emailaddress'
  }
};

export function OAuthProviderConfig({ provider, onUpdate }: OAuthProviderConfigProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [config, setConfig] = useState({
    clientId: provider.clientId || '',
    clientSecret: provider.clientSecret || '',
    redirectUrl: provider.redirectUrl || '',
    scope: provider.scope || defaultScopes[provider.providerName as keyof typeof defaultScopes] || '',
    enabled: provider.enabled,
  });

  // Update local state when provider prop changes (after refresh)
  useEffect(() => {
    setConfig({
      clientId: provider.clientId || '',
      clientSecret: provider.clientSecret || '',
      redirectUrl: provider.redirectUrl || '',
      scope: provider.scope || defaultScopes[provider.providerName as keyof typeof defaultScopes] || '',
      enabled: provider.enabled,
    });
  }, [provider]);

  const isConfigured = config.clientId && config.clientSecret && config.redirectUrl;
  const instructions = setupInstructions[provider.providerName as keyof typeof setupInstructions];

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onUpdate(provider.providerName, {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        redirectUrl: config.redirectUrl,
        scope: config.scope,
      });
      toast({
        title: "Configuration Updated",
        description: `${provider.displayName} configuration updated successfully`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Failed to update ${provider.displayName} configuration`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!isConfigured) {
      toast({
        title: "Configuration Required",
        description: "Please configure the provider before enabling it",
        variant: "destructive",
      });
      return;
    }

    // Don't update local state immediately, wait for backend response
    try {
      await onUpdate(provider.providerName, { enabled });
      // Update local state only after successful backend update
      setConfig(prev => ({ ...prev, enabled }));
      toast({
        title: "Provider Status Updated",
        description: `${provider.displayName} ${enabled ? 'enabled' : 'disabled'} successfully`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: `Failed to ${enabled ? 'enable' : 'disable'} ${provider.displayName}`,
        variant: "destructive",
      });
      // Don't update local state if backend update failed
    }
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

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${getProviderColor(provider.providerName)}`}>
              <span className="text-lg">{getProviderIcon(provider.providerName)}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{provider.displayName}</CardTitle>
              <CardDescription>
                {isConfigured ? 'Configured' : 'Not configured'}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              checked={config.enabled}
              onCheckedChange={handleToggle}
              disabled={!isConfigured}
            />
            <Badge variant={isConfigured ? 'default' : 'secondary'}>
              {isConfigured ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Setup Instructions */}
        {instructions && (
          <Collapsible open={showInstructions} onOpenChange={setShowInstructions}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center space-x-2">
                  <Info className="h-4 w-4" />
                  <span>Setup Instructions</span>
                </div>
                {showInstructions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <h4 className="font-medium">{instructions.title}</h4>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      {instructions.steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                    <div className="mt-3 p-2 bg-muted rounded text-xs">
                      <strong>Redirect URL:</strong> {instructions.redirectUrl}<br/>
                      <strong>Scopes:</strong> {instructions.scopes}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`clientId-${provider.providerName}`}>Client ID</Label>
            <Input
              id={`clientId-${provider.providerName}`}
              type="text"
              value={config.clientId}
              onChange={(e) => setConfig(prev => ({ ...prev, clientId: e.target.value }))}
              placeholder="Enter Client ID"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`clientSecret-${provider.providerName}`}>Client Secret</Label>
            <div className="relative">
              <Input
                id={`clientSecret-${provider.providerName}`}
                type={showSecret ? 'text' : 'password'}
                value={config.clientSecret}
                onChange={(e) => setConfig(prev => ({ ...prev, clientSecret: e.target.value }))}
                placeholder="Enter Client Secret"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor={`redirectUrl-${provider.providerName}`}>Redirect URL</Label>
          <Input
            id={`redirectUrl-${provider.providerName}`}
            type="url"
            value={config.redirectUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, redirectUrl: e.target.value }))}
            placeholder={instructions?.redirectUrl || "https://yourdomain.com/api/oauth/callback/provider"}
          />
          <p className="text-sm text-muted-foreground">
            Set this URL in your OAuth application settings
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`scope-${provider.providerName}`}>Scopes</Label>
          <Input
            id={`scope-${provider.providerName}`}
            type="text"
            value={config.scope}
            onChange={(e) => setConfig(prev => ({ ...prev, scope: e.target.value }))}
            placeholder={instructions?.scopes || "Enter required scopes"}
          />
          <p className="text-sm text-muted-foreground">
            Space-separated list of required OAuth scopes
          </p>
        </div>

        {!isConfigured && (
          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              Configure the Client ID, Client Secret, and Redirect URL to enable this provider.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end space-x-2">
          <Button
            onClick={handleSave}
            disabled={isLoading || !config.clientId || !config.clientSecret || !config.redirectUrl}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 