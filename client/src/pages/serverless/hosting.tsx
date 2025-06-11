import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
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
  AlertCircle,
  FileText,
  Code,
  Save,
  FolderPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { getBrandColors } from '@/lib/brand-theme';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

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
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<HostedSite | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [fileName, setFileName] = useState('index.html');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();

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

      // Import and apply the brand color variables to both CSS variables and Shadcn theme
      import('@/lib/brand-theme').then(({ applyBrandColorVars, applyToShadcnTheme }) => {
        applyBrandColorVars({
          primaryColor: brandingData.primary_color || '2563eb',
          secondaryColor: brandingData.secondary_color || '10b981',
          accentColor: brandingData.accent_color || 'f59e0b'
        });
        
        // Apply the colors to the Shadcn theme as well
        applyToShadcnTheme(colors);
        console.log('Applied brand colors to Shadcn theme in Serverless Hosting page');
      });
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
        console.warn('Puter.js SDK not loaded yet');
        return;
      }

      setIsLoading(true);
      const puter = (window as any).puter;
      console.log('Loading sites with Puter.js...');

      // Use Puter.js hosting.list() API - exact syntax from docs
      const sitesList = await puter.hosting.list();
      console.log('Raw sites response:', sitesList);

      if (!Array.isArray(sitesList)) {
        console.error('Expected array from hosting.list(), got:', typeof sitesList);
        setSites([]);
        return;
      }

      const formattedSites = sitesList.map((site: any) => ({
        subdomain: site.subdomain,
        uid: site.uid,
        dirPath: site.dirPath,
        url: `https://${site.subdomain}.puter.site`
      }));

      console.log('Formatted sites:', formattedSites);
      setSites(formattedSites);
    } catch (error) {
      console.error('Error loading sites:', error);

      let errorMessage = 'Failed to load hosted sites';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "Load Error",
        description: errorMessage,
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
    // Show a confirmation dialog
    if (confirm(`To delete your website (${subdomain}.puter.site), you need to create a support ticket. Our team will explain how to properly delete your website data, as we don't have direct control over your website content. Would you like to create a ticket now?`)) {
      // Navigate to the tickets page
      navigate('/tickets');
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

  const openFileManager = (site: HostedSite) => {
    setSelectedSite(site);
    setFileManagerOpen(true);
    setHtmlContent(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${site.subdomain}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #333;
            text-align: center;
        }
        .container {
            background: #f4f4f4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <h1>Welcome to ${site.subdomain}.puter.site</h1>
    <div class="container">
        <p>This is your new website! Edit this HTML to customize your site.</p>
        <p>You can add more pages, styles, and content as needed.</p>
    </div>
</body>
</html>`);
  };

  const saveHtmlFile = async () => {
    if (!selectedSite || !htmlContent.trim()) {
      toast({
        title: "Error",
        description: "Please enter HTML content",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      const puter = (window as any).puter;

      // Create directory for the site if it doesn't exist
      const dirName = selectedSite.subdomain;

      try {
        await puter.fs.mkdir(dirName);
        console.log('Created directory:', dirName);
      } catch (error) {
        // Directory might already exist, that's okay
        console.log('Directory might already exist:', error);
      }

      // Save the HTML file
      const filePath = `${dirName}/${fileName}`;
      await puter.fs.write(filePath, htmlContent);
      console.log('Saved file:', filePath);

      // Update the hosting to point to this directory
      await puter.hosting.update(selectedSite.subdomain, dirName);
      console.log('Updated hosting for:', selectedSite.subdomain);

      toast({
        title: "Success",
        description: `${fileName} saved and website updated!`,
      });

      setFileManagerOpen(false);
      await loadSites();
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "Error",
        description: "Failed to save HTML file",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header matching tickets page */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Globe className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Web Hosting
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Create and manage website hosting with Puter.js
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Website
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Main content */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Your Websites</CardTitle>
            <CardDescription>
              Deploy and manage your websites with Puter.js hosting. Create subdomains and serve your content instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sites.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {sites.map((site) => (
                  <Card key={site.uid} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-base">{site.subdomain}.puter.site</CardTitle>
                        <Badge variant="outline" className="ml-2">Active</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Website URL:</span>
                          <div className="flex items-center">
                            <a 
                              href={site.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline mr-2"
                            >
                              {site.url}
                            </a>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => copyUrl(site.url)}
                            >
                              {copiedUrl === site.url ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        {site.dirPath && (
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Directory Path:</span>
                            <span className="text-sm">{site.dirPath}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <div className="p-4 pt-0 border-t mt-2 bg-muted/10 flex justify-between">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => window.open(site.url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit
                      </Button>
                      
                      <div className="space-x-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedSite(site);
                            setFileManagerOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-destructive/30 hover:border-destructive hover:bg-destructive/10"
                          onClick={() => deleteSite(site.subdomain)}
                        >
                          <Trash2 className="h-4 w-4 mr-2 text-destructive" />
                          <span className="text-destructive">Delete</span>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="flex justify-center">
                  <Globe className="h-16 w-16 text-muted-foreground/40" />
                </div>
                <h3 className="mt-4 text-lg font-medium">No websites yet</h3>
                <p className="mt-2 text-muted-foreground">
                  Create your first website to get started with Puter.js hosting.
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Website
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create website dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a New Website</DialogTitle>
              <DialogDescription>
                Choose a subdomain name and optional directory path for your new website.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain">Subdomain</Label>
                <div className="flex space-x-2">
                  <Input
                    id="subdomain"
                    value={newSubdomain}
                    onChange={(e) => setNewSubdomain(e.target.value)}
                    placeholder="your-website-name"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateRandomName}
                  >
                    Random
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your website will be available at <span className="font-medium">{newSubdomain || 'example'}.puter.site</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dirPath">Directory Path (Optional)</Label>
                <Input
                  id="dirPath"
                  value={newDirPath}
                  onChange={(e) => setNewDirPath(e.target.value)}
                  placeholder="/path/to/website/files"
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to create a new directory
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={createSite}
                disabled={isCreating || !newSubdomain.trim()}
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
    </DashboardLayout>
  );
};

export default ServerlessHostingPage;
