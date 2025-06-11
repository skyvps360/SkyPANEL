import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Plus, 
  Globe, 
  Trash2, 
  Edit, 
  ExternalLink,
  Loader2,
  Folder,
  Upload,
  RefreshCw,
  Copy,
  Check,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { getBrandColors } from '@/lib/brand-theme';
import { useToast } from '@/hooks/use-toast';

interface BrandingSettings {
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface HostedSite {
  subdomain: string;
  uid: string;
  dirPath?: string;
  url: string;
}

const ServerlessHostingPage: React.FC = () => {
  const [sites, setSites] = useState<HostedSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [newDirPath, setNewDirPath] = useState('');
  const [brandColors, setBrandColors] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch branding settings
  const { data: brandingData } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  // Apply brand colors
  useEffect(() => {
    if (brandingData) {
      const colors = getBrandColors({
        primaryColor: brandingData.primary_color || '2563eb',
        secondaryColor: brandingData.secondary_color || '10b981',
        accentColor: brandingData.accent_color || 'f59e0b'
      });
      setBrandColors(colors);
    }
  }, [brandingData]);

  // Load Puter.js SDK
  useEffect(() => {
    if ((window as any).puter) {
      loadSites();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    script.onload = () => {
      console.log('Puter.js SDK loaded for hosting');
      loadSites();
    };
    script.onerror = () => {
      toast({
        title: "Error",
        description: "Failed to load Puter.js SDK",
        variant: "destructive",
      });
    };
    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const loadSites = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded');
      }

      setIsLoading(true);
      const puter = (window as any).puter;
      
      // Use Puter.js hosting.list() API
      const sitesList = await puter.hosting.list();
      console.log('Loaded sites:', sitesList);
      
      const formattedSites = sitesList.map((site: any) => ({
        subdomain: site.subdomain,
        uid: site.uid,
        dirPath: site.dirPath,
        url: `https://${site.subdomain}.puter.site`
      }));
      
      setSites(formattedSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast({
        title: "Error",
        description: "Failed to load hosted sites",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSite = async () => {
    if (!newSubdomain.trim()) {
      toast({
        title: "Error",
        description: "Please enter a subdomain name",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const puter = (window as any).puter;
      
      // Use Puter.js hosting.create() API
      const site = await puter.hosting.create(newSubdomain.trim(), newDirPath.trim() || undefined);
      console.log('Created site:', site);
      
      toast({
        title: "Success",
        description: `Website created at ${site.subdomain}.puter.site`,
      });
      
      setNewSubdomain('');
      setNewDirPath('');
      setCreateDialogOpen(false);
      await loadSites();
    } catch (error) {
      console.error('Error creating site:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create website",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteSite = async (subdomain: string) => {
    try {
      const puter = (window as any).puter;
      
      // Use Puter.js hosting.delete() API
      await puter.hosting.delete(subdomain);
      console.log('Deleted site:', subdomain);
      
      toast({
        title: "Success",
        description: `Website ${subdomain}.puter.site deleted`,
      });
      
      await loadSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      toast({
        title: "Error",
        description: "Failed to delete website",
        variant: "destructive",
      });
    }
  };

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(null), 2000);
      toast({
        title: "Copied",
        description: "URL copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive",
      });
    }
  };

  const generateRandomName = () => {
    if ((window as any).puter && (window as any).puter.randName) {
      const randomName = (window as any).puter.randName();
      setNewSubdomain(randomName);
    } else {
      // Fallback random name generator
      const adjectives = ['cool', 'awesome', 'amazing', 'fantastic', 'brilliant'];
      const nouns = ['site', 'app', 'web', 'page', 'project'];
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(Math.random() * 1000);
      setNewSubdomain(`${randomAdj}-${randomNoun}-${randomNum}`);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Sophisticated Hosting</h1>
                <p className="text-gray-600 mt-2">
                  Deploy and manage your websites with Puter.js hosting. Create subdomains and serve your content instantly.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Powered by{' '}
                  <a 
                    href="https://puter.com" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Puter.com
                  </a>
                </p>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    style={{ 
                      backgroundColor: brandColors?.primary.full || '#2563eb',
                      color: 'white'
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Website
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Website</DialogTitle>
                    <DialogDescription>
                      Create a new subdomain to host your website. Optionally specify a directory to serve.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="subdomain">Subdomain Name</Label>
                      <div className="flex space-x-2">
                        <Input
                          id="subdomain"
                          value={newSubdomain}
                          onChange={(e) => setNewSubdomain(e.target.value)}
                          placeholder="my-awesome-site"
                          className="flex-1"
                        />
                        <Button
                          variant="outline"
                          onClick={generateRandomName}
                          type="button"
                        >
                          Random
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Will be available at: {newSubdomain || 'subdomain'}.puter.site
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="dirpath">Directory Path (Optional)</Label>
                      <Input
                        id="dirpath"
                        value={newDirPath}
                        onChange={(e) => setNewDirPath(e.target.value)}
                        placeholder="/path/to/your/website"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty to create an empty website
                      </p>
                    </div>
                    <Button
                      onClick={createSite}
                      disabled={isCreating || !newSubdomain.trim()}
                      className="w-full"
                      style={{ 
                        backgroundColor: brandColors?.primary.full || '#2563eb',
                        color: 'white'
                      }}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Website
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Sites Grid */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : sites.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No websites yet</h3>
                  <p className="text-gray-600 mb-4">
                    Create your first website to get started with Puter.js hosting.
                  </p>
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    style={{ 
                      backgroundColor: brandColors?.primary.full || '#2563eb',
                      color: 'white'
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Website
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map((site) => (
                  <Card key={site.uid} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Globe className="h-5 w-5 mr-2 text-gray-600" />
                          <CardTitle className="text-lg">{site.subdomain}</CardTitle>
                        </div>
                        <Badge 
                          variant="secondary"
                          style={{ 
                            backgroundColor: brandColors?.secondary.light || '#10b9811a',
                            color: brandColors?.secondary.full || '#10b981'
                          }}
                        >
                          Active
                        </Badge>
                      </div>
                      <CardDescription>
                        {site.dirPath ? (
                          <span className="flex items-center">
                            <Folder className="h-4 w-4 mr-1" />
                            {site.dirPath}
                          </span>
                        ) : (
                          'Empty website'
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <span className="text-sm font-mono text-gray-600 truncate">
                            {site.url}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyUrl(site.url)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedUrl === site.url ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(site.url, '_blank')}
                            className="flex-1"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Visit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteSite(site.subdomain)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Refresh Button */}
          <div className="mt-8 text-center">
            <Button
              variant="outline"
              onClick={loadSites}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Sites
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessHostingPage;
