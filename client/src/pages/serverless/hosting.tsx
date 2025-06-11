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
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Hosting</h1>
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

              {/* File Manager Dialog */}
              <Dialog open={fileManagerOpen} onOpenChange={setFileManagerOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
                  <DialogHeader>
                    <DialogTitle>HTML Editor - {selectedSite?.subdomain}.puter.site</DialogTitle>
                    <DialogDescription>
                      Create and edit HTML files for your website. Files must be .html format.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 overflow-y-auto">
                    <div className="flex space-x-4">
                      <div className="flex-1">
                        <Label htmlFor="filename">File Name</Label>
                        <Input
                          id="filename"
                          value={fileName}
                          onChange={(e) => setFileName(e.target.value)}
                          placeholder="index.html"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Must end with .html (e.g., index.html, about.html)
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="htmlcontent">HTML Content</Label>
                      <Textarea
                        id="htmlcontent"
                        value={htmlContent}
                        onChange={(e) => setHtmlContent(e.target.value)}
                        placeholder="Enter your HTML code here..."
                        className="min-h-[400px] font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Write your HTML code here. Include CSS in &lt;style&gt; tags and JavaScript in &lt;script&gt; tags.
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        onClick={() => setFileManagerOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveHtmlFile}
                        disabled={isSaving || !htmlContent.trim() || !fileName.endsWith('.html')}
                        style={{
                          backgroundColor: brandColors?.primary.full || '#2563eb',
                          color: 'white'
                        }}
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save & Deploy
                          </>
                        )}
                      </Button>
                    </div>
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
                            onClick={() => openFileManager(site)}
                            className="flex-1"
                            style={{
                              borderColor: brandColors?.primary.full || '#2563eb',
                              color: brandColors?.primary.full || '#2563eb'
                            }}
                          >
                            <Code className="h-4 w-4 mr-1" />
                            Edit Files
                          </Button>
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

        </div>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessHostingPage;
