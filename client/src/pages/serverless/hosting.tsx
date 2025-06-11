import React, { useState, useEffect, useCallback, Suspense, lazy, useRef } from 'react';
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
  FolderPlus,
  FilePlus,
  Paintbrush,
  FileEdit,
  X,
  LogIn,
  Lock,
  LogOut,
  FileCode,
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
// Replace the Node.js pug import with browser-compatible version or handle differently
// import * as pug from 'pug';
import { Checkbox } from '@/components/ui/checkbox';
import Editor from "@monaco-editor/react";

// Declare a simple interface for pug browser usage
interface PugBrowser {
  render: (template: string, options?: any) => string;
}

// We'll handle pug compilation differently in the browser
const pugBrowser: PugBrowser = {
  render: (template: string, options?: any) => {
    // In browser environment, we'll just return the template as-is
    // and display a message that Pug compilation isn't available in browser
    return `<!-- Pug compilation is not available in the browser -->
<!-- Original template:
${template}
-->
<!DOCTYPE html>
<html>
<head>
  <title>Pug Template Preview</title>
</head>
<body>
  <h1>Pug Template Preview</h1>
  <p>Pug templates are processed on the server side. This is a placeholder preview.</p>
  <details>
    <summary>View Source Template</summary>
    <pre>${template.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
  </details>
</body>
</html>`;
  }
};

interface BrandingSettings {
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface HostedSite {
  id?: string;
  subdomain: string;
  url: string;
  dirPath?: string;
  dir?: string;  // Add dir property to match API response
  createdAt?: string;
  uid?: string;
}

interface FileInfo {
  name: string;
  type: 'html' | 'css' | 'js' | 'pug';
}

const ServerlessHostingPage: React.FC = () => {
  const [sites, setSites] = useState<HostedSite[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSubdomain, setNewSubdomain] = useState('');
  const [brandColors, setBrandColors] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fileManagerOpen, setFileManagerOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<HostedSite | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [fileName, setFileName] = useState('index.html');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [fileList, setFileList] = useState<FileInfo[]>([]);
  const [fileType, setFileType] = useState<'html' | 'css' | 'js' | 'pug'>('html');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isValidSubdomain, setIsValidSubdomain] = useState(true);
  const [subdomainErrorMessage, setSubdomainErrorMessage] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [editorTheme, setEditorTheme] = useState('vs-light');
  const [autoCompile, setAutoCompile] = useState(true);
  const [compiledOutput, setCompiledOutput] = useState('');
  const [compilationError, setCompilationError] = useState('');
  const editorRef = useRef<any>(null);

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

  // Check if user is logged into Puter.js
  const checkPuterLogin = async () => {
    try {
      setIsCheckingLogin(true);
      const puter = (window as any).puter;
      
      if (puter && typeof puter.auth?.isSignedIn === 'function') {
        const signedIn = await puter.auth.isSignedIn();
        setIsLoggedIn(signedIn);
        console.log('Puter.js login status:', signedIn ? 'Signed in' : 'Not signed in');
      } else {
        // If we can't check, assume not logged in
        console.warn('Puter.js auth API not available');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking Puter.js login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsCheckingLogin(false);
    }
  };

  // Handle Puter.js login
  const handlePuterLogin = async () => {
    try {
      const puter = (window as any).puter;
      if (puter && typeof puter.auth.signIn === 'function') {
        console.log('Initiating Puter.js sign in...');
        
        // Use Puter.js signIn API as documented
        const result = await puter.auth.signIn();
        console.log('Sign in result:', result);
        
        // Check auth status after sign in attempt
        await checkPuterLogin();
        
        // Now check if we're really signed in
        if (puter.auth.isSignedIn()) {
          toast({
            title: "Success",
            description: "Successfully signed in to Puter.js",
          });
          loadSites(); // Refresh sites after login
        } else {
          toast({
            title: "Error",
            description: "Sign in was not completed",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Puter.js authentication API not available",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error signing in to Puter.js:', error);
      toast({
        title: "Error",
        description: "Failed to sign in to Puter.js",
        variant: "destructive",
      });
    }
  };

  // Handle Puter.js logout
  const signOutPuter = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded');
      }

      const puter = (window as any).puter;
      console.log('Signing out from Puter...');

      // Use Puter.js sign out API as documented
      puter.auth.signOut();

      // Update auth status
      setIsLoggedIn(false);

      toast({
        title: "Signed Out",
        description: "Successfully signed out from Puter.js",
      });
      
      // Clear sites after logout
      setSites([]);
    } catch (error) {
      console.error('Puter.js sign out failed:', error);
      toast({
        title: "Error",
        description: `Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Effect to load Puter.js and check login status
  useEffect(() => {
    // Check if Puter.js is already loaded
    if ((window as any).puter) {
      console.log('Puter.js SDK already loaded');
      checkPuterLogin();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;
    
    script.onload = () => {
      console.log('Puter.js SDK loaded successfully');
      
      // Wait a moment for Puter.js to initialize fully
      setTimeout(async () => {
        // Verify the API is available
        if ((window as any).puter && (window as any).puter.auth) {
          console.log('Puter.js Auth API is ready');
          await checkPuterLogin();
          // Only load sites if logged in
          if (await (window as any).puter.auth.isSignedIn()) {
            loadSites();
          }
        } else {
          console.error('Puter.js loaded but Auth API not available');
          setIsCheckingLogin(false);
          setIsLoading(false);
          toast({
            title: "Error",
            description: "Puter.js Auth API not available",
            variant: "destructive",
          });
        }
      }, 500);
    };
    
    script.onerror = () => {
      console.error('Failed to load Puter.js SDK');
      setIsCheckingLogin(false);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load Puter.js SDK",
        variant: "destructive",
      });
    };
    
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const loadSites = async () => {
    try {
      setIsLoading(true);
      const puter = (window as any).puter;
      
      if (!puter || !puter.hosting) {
        setIsLoading(false);
        return;
      }
      
      // Only try to load sites if the user is signed in
      if (!(await puter.auth.isSignedIn())) {
        console.log('User not signed in, skipping site loading');
        setSites([]);
        setIsLoading(false);
        return;
      }

      console.log('Loading sites with Puter.js...');
      
      // Call the list API directly as per documentation
      const sitesList = await puter.hosting.list();
      
      console.log('Raw sites response:', sitesList);
      
      // Map to our internal format
      const formattedSites = sitesList.map((site: any) => ({
        id: site.subdomain || '', 
        subdomain: site.subdomain || '',
        url: site.subdomain ? `https://${site.subdomain}.puter.site` : '',
        dirPath: site.dir || '',  // Use the 'dir' property from the API
        dir: site.dir || '',      // Keep original property name for reference too
        createdAt: site.created_at || new Date().toISOString()
      }));

      console.log('Formatted sites:', formattedSites);
      setSites(formattedSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      setSites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createSite = async () => {
    if (!newSubdomain.trim()) {
      toast({
        title: "Error",
        description: "Subdomain name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      const puter = (window as any).puter;

      if (!puter || !puter.hosting) {
        throw new Error("Puter.js SDK not loaded properly. Please refresh the page and try again.");
      }
      
      // Create standard directory path
      let dirPath;
      try {
        // Get standardized directory path for this site
        dirPath = await createStandardDirPath(newSubdomain);
        console.log(`Creating directory structure: ${dirPath}`);
        
        // Create the directory with parent directories as needed
        await puter.fs.mkdir(dirPath, { createMissingParents: true });
        console.log('Directory structure created successfully');
        
        // Create default index.html file
        const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${newSubdomain}</title>
    <link rel="stylesheet" href="style.css">
    <script src="main.js"></script>
</head>
<body>
    <h1>Welcome to ${newSubdomain}.puter.site</h1>
    <p>This is your new website!</p>
</body>
</html>`;

        const defaultCss = `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.6;
    color: #333;
    background-color: #f8f9fa;
}

h1 {
    color: #2563eb;
    text-align: center;
}`;

        const defaultJs = `// JavaScript for ${newSubdomain}
document.addEventListener('DOMContentLoaded', () => {
    console.log('Welcome to ${newSubdomain}.puter.site!');
    
    // Add a click event to the h1 element
    const header = document.querySelector('h1');
    if (header) {
        header.addEventListener('click', () => {
            alert('Hello from ${newSubdomain}!');
        });
    }
});`;
        
        // Write the files exactly like in the docs
        await puter.fs.write(`${dirPath}/index.html`, defaultHtml);
        await puter.fs.write(`${dirPath}/style.css`, defaultCss);
        await puter.fs.write(`${dirPath}/main.js`, defaultJs);
        console.log('Default files created');
      } catch (error) {
        console.error('Error creating directory or files:', error);
        throw new Error(`Could not create directory or files: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // Simple direct call to create website following the docs exactly
      console.log(`Creating website with subdomain: ${newSubdomain}, directory: ${dirPath}`);
      const site = await puter.hosting.create(newSubdomain, dirPath);
      console.log('Website created successfully:', site);

      toast({
        title: "Success",
        description: (
          <div className="space-y-2">
            <p>Website created successfully!</p>
            <p className="font-medium">
              <a 
                href={`https://${site.subdomain}.puter.site`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {site.subdomain}.puter.site
              </a>
            </p>
          </div>
        ),
      });

      // Reset form
      setNewSubdomain("");
      setCreateDialogOpen(false);
      
      // Reload sites
      await loadSites();
    } catch (error) {
      console.error('Error creating site:', error);
      
      // Detailed error logging to help debug the issue
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to create website: ${error.message}` 
          : "Failed to create website. Please try a different subdomain name.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<HostedSite | null>(null);

  const deleteSite = async (subdomain: string) => {
    const matchingSite = sites.find(site => site.subdomain === subdomain);
    setDeleteDialogOpen(true);
    setSiteToDelete(matchingSite || { subdomain, uid: '', url: `https://${subdomain}.puter.site` });
  };
  
  const confirmDelete = async () => {
    if (!siteToDelete) return;
    
    try {
      setIsDeleting(siteToDelete.subdomain);
      const puter = (window as any).puter;
      
      // Delete the website
      console.log(`Attempting to delete website: ${siteToDelete.subdomain}`);
      await puter.hosting.delete(siteToDelete.subdomain);
      console.log(`Website ${siteToDelete.subdomain} deleted successfully`);
      
      // Optionally clean up the directory if it matches the expected pattern
      if (siteToDelete.dirPath && 
          (siteToDelete.dirPath.startsWith(`/websites/${siteToDelete.subdomain}`) || 
           siteToDelete.dirPath === `/${siteToDelete.subdomain}-website`)) {
        try {
          console.log(`Attempting to clean up directory: ${siteToDelete.dirPath}`);
          await puter.fs.delete(siteToDelete.dirPath, { recursive: true });
          console.log(`Directory ${siteToDelete.dirPath} deleted successfully`);
        } catch (dirErr) {
          console.warn(`Could not delete directory ${siteToDelete.dirPath}:`, dirErr);
          // Non-blocking error - we still deleted the website successfully
        }
      }
      
      toast({
        title: "Success",
        description: `Website ${siteToDelete.subdomain}.puter.site deleted successfully`,
      });
      
      // Reload sites
      await loadSites();
      setDeleteDialogOpen(false);
      setSiteToDelete(null);
    } catch (error) {
      console.error('Error deleting site:', error);
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to delete website: ${error.message}` 
          : "Failed to delete website. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
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

  // Validate subdomain format
  const validateSubdomain = (subdomain: string) => {
    // Empty is handled separately
    if (!subdomain.trim()) {
      setIsValidSubdomain(false);
      setSubdomainErrorMessage('Subdomain is required');
      return false;
    }
    
    // Very basic validation - allow most characters
    if (subdomain.length < 1 || subdomain.length > 63) {
      setIsValidSubdomain(false);
      setSubdomainErrorMessage('Subdomain must be between 1 and 63 characters');
      return false;
    }
    
    // Valid
    setIsValidSubdomain(true);
    setSubdomainErrorMessage('');
    return true;
  };

  // Handle subdomain input change
  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setNewSubdomain(value);
    validateSubdomain(value);
  };

  const generateRandomName = () => {
    const puter = (window as any).puter;
    if (typeof puter?.randName === 'function') {
      const randomName = puter.randName();
      setNewSubdomain(randomName);
      validateSubdomain(randomName);
    } else {
      // Fallback if puter.randName is not available
      const adjectives = ['happy', 'quick', 'clever', 'brave', 'calm', 'eager', 'kind', 'proud', 'smart', 'witty'];
      const nouns = ['tiger', 'apple', 'river', 'cloud', 'dream', 'star', 'ocean', 'forest', 'mountain', 'bird'];
      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNum = Math.floor(Math.random() * 10000);
      const randomName = `${randomAdjective}-${randomNoun}-${randomNum}`;
      setNewSubdomain(randomName);
      validateSubdomain(randomName);
    }
  };

  const openFileManagerDialog = async (site: HostedSite) => {
    try {
    setSelectedSite(site);
      setIsLoadingFiles(true);
      setFileList([]);
      
      const puter = (window as any).puter;
      
      // Use the dir property from the Puter.js response
      let dirPath = site.dirPath || site.dir || '';
      
      if (!dirPath) {
        console.log('No directory path found, will create one');
        try {
          // Get standardized directory path
          dirPath = await createStandardDirPath(site.subdomain);
          console.log(`Creating directory structure for existing site: ${dirPath}`);
          
          // Create the directory structure
          await puter.fs.mkdir(dirPath, { createMissingParents: true });
          console.log('Created directory structure:', dirPath);
          
          // Update the website configuration with this directory
          await puter.hosting.update(site.subdomain, dirPath);
          
          // Update our local site data with the new path
          site.dirPath = dirPath;
        } catch (err) {
          console.error('Error creating directory structure:', err);
        }
      }
      
      try {
        // Try to read the directory and list files
        const files = await puter.fs.readdir(dirPath);
        
        // Map the files to our expected format
        const mappedFiles = files.map((file: any) => ({
          name: file.name,
          type: file.name.endsWith('.css') ? 'css' : 'html'
        }));
        
        setFileList(mappedFiles);
      } catch (error) {
        console.error('Error reading directory:', error);
        // Create default files if directory reading fails
        setFileList([]);
      }
      
    setFileManagerOpen(true);
    } catch (error) {
      console.error('Error opening file manager:', error);
      toast({
        title: "Error",
        description: "Failed to open file manager",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const loadFile = async (fileName: string) => {
    if (!selectedSite) return;
    
    try {
      setIsLoadingFile(true);
      const puter = (window as any).puter;
      
      // Use the dir property or fallback to dirPath
      let dirPath = selectedSite.dirPath || selectedSite.dir || '';
      
      if (!dirPath) {
        // Create a directory if one doesn't exist
        dirPath = await createStandardDirPath(selectedSite.subdomain);
      }
      
      // Load the file content
      console.log(`Loading file ${fileName} from directory ${dirPath}`);
      try {
        console.log(`Reading file at path: ${dirPath}/${fileName}`);
        const fileContent = await puter.fs.read(`${dirPath}/${fileName}`);
        
        // Handle different response types
        let content = '';
        
        if (fileContent instanceof Blob) {
          content = await fileContent.text();
        } else if (typeof fileContent === 'string') {
          content = fileContent;
        } else if (fileContent && typeof fileContent.text === 'function') {
          content = await fileContent.text();
        } else {
          console.warn('Unexpected file content format:', fileContent);
          content = String(fileContent || '');
        }
        
        console.log(`File loaded successfully, content length: ${content.length}`);
        setHtmlContent(content);
        
        // Determine file type based on extension
        if (fileName.endsWith('.css')) {
          setFileType('css');
        } else if (fileName.endsWith('.js')) {
          setFileType('js');
        } else if (fileName.endsWith('.pug')) {
          setFileType('pug');
        } else {
          setFileType('html');
        }
      } catch (readError) {
        console.error('Error reading file:', readError);
        toast({ 
          title: "Error", 
          description: `Failed to load file: ${readError instanceof Error ? readError.message : 'Unknown error'}`, 
          variant: "destructive" 
        });
        // Set default content based on extension
        if (fileName.endsWith('.css')) {
          setHtmlContent('/* Add your CSS here */');
          setFileType('css');
        } else if (fileName.endsWith('.js')) {
          setHtmlContent('// Add your JavaScript here');
          setFileType('js');
        } else if (fileName.endsWith('.pug')) {
          setHtmlContent('doctype html\nhtml\n  head\n    title New Page\n  body\n    h1 Hello World');
          setFileType('pug');
        } else {
          setHtmlContent('<!DOCTYPE html>\n<html>\n<head>\n  <title>New Page</title>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>');
          setFileType('html');
        }
      }
    } catch (error) {
      console.error('Error in loadFile:', error);
      toast({ 
        title: "Error", 
        description: "Failed to load file", 
        variant: "destructive" 
      });
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleFileSelect = async (fileName: string, type: string) => {
    if (!selectedSite) return;
    
    setFileName(fileName);
    setFileType(type as 'html' | 'css' | 'js' | 'pug');
    
    // Load the file content using the loadFile function
    await loadFile(fileName);
  };

  const createNewFile = () => {
    const fileName = prompt('Enter file name (with .html, .css, .js or .pug extension):');
    if (!fileName) return;
    
    if (!fileName.endsWith('.html') && !fileName.endsWith('.css') && !fileName.endsWith('.js') && !fileName.endsWith('.pug')) {
      toast({
        title: "Invalid file name",
        description: "File name must end with .html, .css, .js or .pug",
        variant: "destructive",
      });
      return;
    }
    
    // Check if file already exists
    if (fileList.some(file => file.name === fileName)) {
      toast({
        title: "File exists",
        description: "A file with this name already exists",
        variant: "destructive",
      });
      return;
    }
    
    let fileType: 'html' | 'css' | 'js' | 'pug';
    if (fileName.endsWith('.css')) fileType = 'css';
    else if (fileName.endsWith('.js')) fileType = 'js';
    else if (fileName.endsWith('.pug')) fileType = 'pug';
    else fileType = 'html';
    
    const newFileList = [...fileList, { name: fileName, type: fileType }];
    setFileList(newFileList);
    
    // Set as current file
    setFileName(fileName);
    setFileType(fileType);
    
    // Set default content based on type
    if (fileType === 'css') {
      setHtmlContent(`/* Styles for ${fileName} */\n\n/* Add your CSS here */`);
    } else if (fileType === 'js') {
      setHtmlContent(`// JavaScript for ${fileName}\n\n// Add your code here\nconsole.log('${fileName} loaded!');\n`);
    } else if (fileType === 'pug') {
      setHtmlContent(`doctype html\nhtml(lang='en')\n  head\n    meta(charset='UTF-8')\n    title ${fileName}\n  body\n    h1 Welcome to ${fileName}\n    p This is a Pug template`);
    } else {
      setHtmlContent(`<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>${fileName}</title>\n</head>\n<body>\n    <h1>${fileName}</h1>\n</body>\n</html>`);
    }
  };

  const getLanguage = (fileType: string): string => {
    switch (fileType) {
      case 'html': return 'html';
      case 'css': return 'css';
      case 'js': return 'javascript';
      case 'pug': return 'jade'; // Monaco uses 'jade' language for Pug
      default: return 'plaintext';
    }
  };

  const compilePug = useCallback((pugCode: string): string => {
    try {
      setCompilationError('');
      // Use our browser-compatible approach
      return pugBrowser.render(pugCode, { pretty: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setCompilationError(errorMessage);
      console.error('Pug compilation error:', error);
      return '';
    }
  }, []);

  // Effect to automatically compile Pug when content changes
  useEffect(() => {
    if (fileType === 'pug' && autoCompile) {
      const compiledHtml = compilePug(htmlContent);
      setCompiledOutput(compiledHtml);
    }
  }, [htmlContent, fileType, autoCompile, compilePug]);

  const saveHtmlFile = async () => {
    if (!selectedSite || !fileName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a file name",
        variant: "destructive",
      });
      return;
    }
    
    // Check if file name has valid extension
    if (!fileName.endsWith('.html') && !fileName.endsWith('.css') && !fileName.endsWith('.js') && !fileName.endsWith('.pug')) {
      toast({
        title: "Error",
        description: "File name must end with .html, .css, .js or .pug",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSaving(true);
      
      const puter = (window as any).puter;

      // Create directory if it doesn't exist
      let dirPath = selectedSite.dirPath || selectedSite.dir || '';

      if (!dirPath) {
        try {
          // Get standardized directory path
          dirPath = await createStandardDirPath(selectedSite.subdomain);
          console.log(`Creating directory structure for file save: ${dirPath}`);
          
          await puter.fs.mkdir(dirPath, { createMissingParents: true });
          console.log('Directory structure created for file save:', dirPath);
        } catch (error) {
          // Directory might already exist, that's fine
          console.log('Directory exists or error creating structure:', error);
        }

        // Update the website to use this directory
        await puter.hosting.update(selectedSite.subdomain, dirPath);
        
        // Update our local data
        selectedSite.dirPath = dirPath;
      }
      
      // Ensure htmlContent is a string
      const contentToSave = typeof htmlContent === 'string' ? htmlContent : String(htmlContent || '');
      console.log(`Saving file to: ${dirPath}/${fileName}, content length: ${contentToSave.length}`);
      
      try {
        // If it's a pug file and autoCompile is enabled, also save the compiled HTML
        if (fileType === 'pug' && autoCompile && compiledOutput) {
          const htmlFileName = fileName.replace('.pug', '.html');
          await puter.fs.write(`${dirPath}/${htmlFileName}`, compiledOutput);
          console.log(`Compiled HTML saved as ${htmlFileName}`);
        }
        
        const file = await puter.fs.write(`${dirPath}/${fileName}`, contentToSave);
        console.log('File saved successfully:', file);

        // Refresh the file list
        const files = await puter.fs.readdir(dirPath);
        const mappedFiles = files.map((file: any) => {
          let type: 'html' | 'css' | 'js' | 'pug' = 'html';
          if (file.name.endsWith('.css')) type = 'css';
          else if (file.name.endsWith('.js')) type = 'js';
          else if (file.name.endsWith('.pug')) type = 'pug';
          
          return {
            name: file.name,
            type
          };
        });
        setFileList(mappedFiles);

      toast({
        title: "Success",
          description: `${fileName} saved successfully`,
      });

        // Refresh the site list to update any changes
      await loadSites();
      } catch (saveError) {
        console.error('Error writing file:', saveError);
        toast({
          title: "Error",
          description: `Failed to save file: ${saveError instanceof Error ? saveError.message : 'Unknown error'}`,
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('Error saving file:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save file",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper function to create standardized directory paths
  const createStandardDirPath = async (siteName: string): Promise<string> => {
    const puter = (window as any).puter;
    
    try {
      // Get user information
      const userInfo = await puter.auth.getUser();
      console.log('User info for directory path:', userInfo);
      
      if (!userInfo || !userInfo.username) {
        throw new Error("Could not retrieve user information. Please make sure you're signed in.");
      }
      
      // Standard directory structure: Puter/{username}/{site-name}-site
      // NOTE: No leading slash - Puter.js doesn't want absolute paths
      const standardPath = `Puter/${userInfo.username}/${siteName}-site`;
      console.log('Created standard directory path:', standardPath);
      return standardPath;
    } catch (error) {
      console.error('Error creating standard directory path:', error);
      // Fallback to a simple path if we can't get the username
      return `${siteName}-site`;
    }
  };

  // Monaco editor onMount handler
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  // Effect to manage editor theme based on system preference
  useEffect(() => {
    // Check for system dark mode preference
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setEditorTheme(isDarkMode ? 'vs-dark' : 'vs-light');
    
    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setEditorTheme(e.matches ? 'vs-dark' : 'vs-light');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Effect to handle cleanup of event listeners and prevent React errors
  useEffect(() => {
    return () => {
      // Cleanup function to prevent React errors on unmount
      editorRef.current = null;
    };
  }, []);

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
                      Host websites with Puter.js - Simple and fast
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                {isCheckingLogin ? (
                  <Button disabled className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking Login...
                  </Button>
                ) : isLoggedIn ? (
                  <>
                    <Button
                      onClick={() => setCreateDialogOpen(true)}
                      className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Website
                    </Button>
                    <Button
                      variant="outline"
                      onClick={signOutPuter}
                      className="border-primary text-primary hover:bg-primary/10"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button onClick={handlePuterLogin} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in to Puter.js
                  </Button>
                )}
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
            {isCheckingLogin ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Checking Puter.js login status...</span>
              </div>
            ) : !isLoggedIn ? (
              <div className="text-center py-16">
                <div className="flex justify-center">
                  <Lock className="h-16 w-16 text-muted-foreground/40" />
                </div>
                <h3 className="mt-4 text-lg font-medium">Puter.js Authentication Required</h3>
                <p className="mt-2 text-muted-foreground">
                  Sign in to Puter.js to manage your websites.
                </p>
                <Button 
                  onClick={handlePuterLogin}
                  className="mt-4"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign in to Puter.js
                </Button>
              </div>
            ) : isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sites.length > 0 ? (
              <div className="space-y-4">
                {sites.map((site) => (
                  <div key={site.uid} className="border rounded-md p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{site.subdomain}.puter.site</h3>
                          <Badge variant="outline">Active</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          Website URL: 
                          <a 
                            href={site.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center"
                  >
                            {site.url}
                            <Copy 
                              className="h-3.5 w-3.5 ml-1 cursor-pointer text-muted-foreground hover:text-foreground" 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                copyUrl(site.url);
                              }}
                            />
                  </a>
              </div>
                      </div>
                      <div className="flex items-center gap-2">
                  <Button
                          size="sm" 
                          variant="outline"
                          onClick={() => window.open(site.url, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => openFileManagerDialog(site)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteSite(site.subdomain)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
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
                Choose a subdomain name for your new website. We'll create all the necessary files for you.
                    </DialogDescription>
                  </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subdomain" className="flex justify-between">
                  <span>Subdomain</span>
                  <span className="text-xs text-muted-foreground">Required</span>
                </Label>
                      <div className="flex space-x-2">
                  <div className="relative flex-1">
                        <Input
                          id="subdomain"
                          value={newSubdomain}
                      onChange={handleSubdomainChange}
                      placeholder="your-website-name"
                      className={`flex-1 ${!isValidSubdomain && newSubdomain ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {!isValidSubdomain && newSubdomain && (
                      <div className="text-xs text-destructive mt-1">{subdomainErrorMessage}</div>
                    )}
                  </div>
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
              
              <Alert variant="default" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  We'll automatically create a directory structure in <code>Puter/username/{newSubdomain || 'example'}-site</code> with default HTML and CSS files.
                </AlertDescription>
              </Alert>
                    </div>
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCreateDialogOpen(false);
                  setNewSubdomain('');
                  setIsValidSubdomain(true);
                  setSubdomainErrorMessage('');
                }}
              >
                Cancel
              </Button>
                    <Button
                      onClick={createSite}
                      disabled={isCreating || !newSubdomain.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
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

        {/* Delete website confirmation dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
                  <DialogHeader>
              <DialogTitle className="text-destructive flex items-center">
                <AlertCircle className="h-5 w-5 mr-2" />
                Delete Website
              </DialogTitle>
                    <DialogDescription>
                Are you sure you want to delete this website? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
            <div className="py-4">
              {siteToDelete && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Website: <strong>{siteToDelete.subdomain}.puter.site</strong> will be permanently deleted.
                    The website will no longer be accessible, but your files will remain in your Puter account.
                  </AlertDescription>
                </Alert>
              )}
                      </div>
            <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting !== null}
                      >
                        Cancel
                      </Button>
                      <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={isDeleting !== null}
                      >
                {isDeleting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                          </>
                        ) : (
                          <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Website
                          </>
                        )}
                      </Button>
                  </div>
                </DialogContent>
              </Dialog>

        {/* File Manager Dialog */}
        <Dialog open={fileManagerOpen} onOpenChange={setFileManagerOpen}>
          <DialogContent className="max-w-screen-xl w-[95vw]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Edit Website: {selectedSite?.subdomain}.puter.site
              </DialogTitle>
              <DialogDescription>
                Make changes to your website files. Your changes will be saved to {selectedSite?.dirPath || 'your Puter.js account'}.
              </DialogDescription>
            </DialogHeader>
            
            {/* File editor UI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[70vh]">
              {/* File list */}
              <div className="col-span-1 border rounded-md overflow-hidden flex flex-col">
                <div className="flex justify-between items-center border-b p-2 bg-muted/50">
                  <h3 className="font-medium">Files</h3>
                  <Button variant="ghost" size="sm" onClick={createNewFile}>
                    <Plus className="h-4 w-4 mr-1" />
                    New File
                  </Button>
            </div>
                <div className="p-2 space-y-1">
                  {fileList.map((file) => (
                    <div 
                      key={file.name}
                      className={`flex justify-between items-center p-2 rounded-md cursor-pointer ${fileName === file.name ? 'bg-primary/10' : 'hover:bg-muted'}`}
                    >
                      <div 
                        className="flex items-center flex-1"
                        onClick={() => handleFileSelect(file.name, file.type)}
                      >
                        {file.type === 'css' ? (
                          <Paintbrush className="h-4 w-4 mr-2 text-purple-500" />
                        ) : file.type === 'js' ? (
                          <Code className="h-4 w-4 mr-2 text-yellow-500" />
                        ) : file.type === 'pug' ? (
                          <FileCode className="h-4 w-4 mr-2 text-green-500" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2 text-primary" />
                        )}
                        <span className="text-sm">{file.name}</span>
          </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost" 
                          size="sm"
                          className="h-6 w-6 p-0 opacity-50 hover:opacity-100" 
                          onClick={async () => {
                            if (!selectedSite?.dirPath) return;
                            const newName = prompt(`Rename ${file.name} to:`, file.name);
                            if (newName && newName !== file.name) {
                              try {
                                const puter = (window as any).puter;
                                
                                // Log details for debugging
                                console.log('Renaming file with parameters:', {
                                  source: `${selectedSite.dirPath}/${file.name}`,
                                  destination: `${selectedSite.dirPath}/${newName}`
                                });
                                
                                // Simple rename call that matches documentation
                                await puter.fs.rename(
                                  `${selectedSite.dirPath}/${file.name}`,
                                  `${selectedSite.dirPath}/${newName}`
                                );
                                
                                toast({ title: "File renamed successfully" });
                                
                                // Update file list
                                const updatedFiles = await puter.fs.readdir(selectedSite.dirPath);
                                const mappedFiles = updatedFiles.map((f: any) => {
                                  let type: 'html' | 'css' | 'js' | 'pug' = 'html';
                                  if (f.name.endsWith('.css')) type = 'css';
                                  else if (f.name.endsWith('.js')) type = 'js';
                                  else if (f.name.endsWith('.pug')) type = 'pug';
                                  
                                  return {
                                    name: f.name,
                                    type
                                  };
                                });
                                setFileList(mappedFiles);
                                
                                // If current file was renamed, update state
                                if (fileName === file.name) {
                                  setFileName(newName);
                                  await loadFile(newName); // Reload file content with new name
                                }
                              } catch (error) {
                                console.error('Error renaming file:', error);
                                toast({ 
                                  title: "Error", 
                                  description: "Failed to rename file", 
                                  variant: "destructive" 
                                });
                              }
                            }
                          }}
                          title="Rename file"
                        >
                          <FileEdit className="h-3.5 w-3.5" />
                        </Button>
                        {(file.name !== 'index.html' && fileList.length > 1) && (
                  <Button
                            variant="ghost" 
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive opacity-50 hover:opacity-100" 
                            onClick={async () => {
                              if (!selectedSite?.dirPath) return;
                              if (confirm(`Are you sure you want to delete ${file.name}?`)) {
                                try {
                                  const puter = (window as any).puter;
                                  await puter.fs.delete(`${selectedSite.dirPath}/${file.name}`);
                                  toast({ title: "File deleted successfully" });
                                  // Update file list
                                  const files = await puter.fs.readdir(selectedSite.dirPath);
                                  const mappedFiles = files.map((f: any) => {
                                    let type: 'html' | 'css' | 'js' | 'pug' = 'html';
                                    if (f.name.endsWith('.css')) type = 'css';
                                    else if (f.name.endsWith('.js')) type = 'js';
                                    else if (f.name.endsWith('.pug')) type = 'pug';
                                    
                                    return {
                                      name: f.name,
                                      type
                                    };
                                  });
                                  setFileList(mappedFiles);
                                  // If current file was deleted, select another file
                                  if (fileName === file.name && mappedFiles.length > 0) {
                                    handleFileSelect(mappedFiles[0].name, mappedFiles[0].type);
                                  }
                                } catch (error) {
                                  console.error('Error deleting file:', error);
                                  toast({ 
                                    title: "Error", 
                                    description: "Failed to delete file", 
                                    variant: "destructive" 
                                  });
                                }
                              }
                            }}
                            title="Delete file"
                          >
                            <X className="h-3.5 w-3.5" />
                  </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Editor area */}
              <div className="col-span-1 md:col-span-3 flex flex-col h-full">
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <div className="flex items-center gap-2">
                        <div className="flex items-center">
                      <Label htmlFor="filename" className="mr-2">File:</Label>
                      <Input
                        id="filename"
                        value={fileName}
                        onChange={(e) => setFileName(e.target.value)}
                        className="w-[200px]"
                      />
                        </div>
                    <Badge variant={
                      fileType === 'css' ? 'secondary' : 
                      fileType === 'js' ? 'outline' : 
                      fileType === 'pug' ? 'default' : 
                      'default'
                    }>
                      {fileType === 'css' ? 'CSS' : 
                       fileType === 'js' ? 'JavaScript' : 
                       fileType === 'pug' ? 'Pug' : 
                       'HTML'}
                        </Badge>
                    {fileType === 'pug' && (
                      <div className="flex items-center gap-1">
                        <Checkbox 
                          id="auto-compile" 
                          checked={autoCompile}
                          onCheckedChange={(checked) => setAutoCompile(checked as boolean)}
                        />
                        <Label htmlFor="auto-compile" className="text-xs">Auto-compile</Label>
                      </div>
                    )}
                  </div>
                          <Button
                            size="sm"
                    onClick={saveHtmlFile}
                    disabled={isSaving || !htmlContent?.trim() || (!fileName.endsWith('.html') && !fileName.endsWith('.css') && !fileName.endsWith('.js') && !fileName.endsWith('.pug'))}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                            )}
                          </Button>
                        </div>
                
                {/* Monaco Editor */}
                <div className="flex-1 border rounded overflow-hidden relative">
                  {isLoadingFile ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <Editor
                      height="100%"
                      width="100%"
                      language={getLanguage(fileType)}
                      value={htmlContent}
                      onChange={(value: string | undefined) => setHtmlContent(value || '')}
                      theme={editorTheme}
                      onMount={handleEditorDidMount}
                      options={{
                        minimap: { enabled: true },
                        fontSize: 14,
                        wordWrap: 'on',
                        tabSize: 2,
                        automaticLayout: true,
                        scrollBeyondLastLine: false,
                      }}
                      loading={<div className="flex items-center justify-center h-full w-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>}
                    />
                  )}
                </div>

                {/* Show compiled output for Pug files */}
                {fileType === 'pug' && autoCompile && (
                  <div className="mt-2">
                    <div className="flex justify-between items-center mb-1">
                      <Label className="text-sm font-medium">Compiled HTML Output</Label>
                          <Button
                            size="sm"
                            variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          const compiledHtml = compilePug(htmlContent);
                          setCompiledOutput(compiledHtml);
                        }}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Recompile
                          </Button>
                        </div>
                    
                    {compilationError ? (
                      <div className="p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                        <p className="font-medium">Compilation Error:</p>
                        <pre className="whitespace-pre-wrap text-xs overflow-auto max-h-32">{compilationError}</pre>
                      </div>
                    ) : (
                      <div className="border rounded-md max-h-32 overflow-auto">
                        <pre className="p-2 text-xs text-muted-foreground">{compiledOutput}</pre>
              </div>
            )}
          </div>
                )}
                
                <p className="text-xs text-muted-foreground pt-2">
                  {fileType === 'css' 
                    ? 'CSS files should be linked in your HTML using <link rel="stylesheet" href="filename.css">'
                    : fileType === 'js'
                    ? 'JavaScript files should be included in your HTML using <script src="filename.js"></script>'
                    : fileType === 'pug'
                    ? 'Pug files will be automatically compiled to HTML when saved with the same base filename'
                    : 'After saving, visit your site to see the changes.'}
                </p>
        </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 gap-2">
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <a href="https://docs.puter.com/FS/read/" target="_blank" rel="noopener noreferrer" className="hover:underline">read()</a> •
                <a href="https://docs.puter.com/FS/write/" target="_blank" rel="noopener noreferrer" className="hover:underline">write()</a> •
                <a href="https://docs.puter.com/FS/delete/" target="_blank" rel="noopener noreferrer" className="hover:underline">delete()</a> •
                <a href="https://docs.puter.com/FS/rename/" target="_blank" rel="noopener noreferrer" className="hover:underline">rename()</a> •
                <a href="https://docs.puter.com/FS/copy/" target="_blank" rel="noopener noreferrer" className="hover:underline">copy()</a> •
                <a href="https://docs.puter.com/FS/move/" target="_blank" rel="noopener noreferrer" className="hover:underline">move()</a>
              </div>
              <div className="flex gap-2">
                {selectedSite && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(selectedSite.url, '_blank')}
                    className="text-primary border-primary hover:bg-primary/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Visit Site
                  </Button>
                )}
                <Button variant="outline" onClick={() => setFileManagerOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessHostingPage;
