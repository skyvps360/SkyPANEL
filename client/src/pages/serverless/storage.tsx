import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Cloud,
  Upload,
  Download,
  Folder,
  File,
  Plus,
  Trash2,
  Edit,
  Copy,
  Move,
  Search,
  Grid,
  List,
  RefreshCw,
  HardDrive,
  FolderPlus,
  FileText,
  Image,
  Music,
  Video,
  Archive,
  Code,
  Loader2,
  AlertCircle,
  LogIn,
  Lock,
  LogOut,
  Eye,
  MoreVertical,
  ArrowLeft,
  Check,
  X,
  FolderOpen,
  Share,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { getBrandColors } from '@/lib/brand-theme';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface BrandingSettings {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
}

interface StorageItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  created?: string;
  modified?: string;
  uid?: string;
}

interface StorageSpace {
  capacity: number;
  used: number;
}

const ServerlessStoragePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State management
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<StorageItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [storageSpace, setStorageSpace] = useState<StorageSpace | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [appStorageRoot, setAppStorageRoot] = useState<string | null>(null);

  // Authentication state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);

  // Dialog states
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState<StorageItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [copyMoveDialogOpen, setCopyMoveDialogOpen] = useState(false);
  const [copyMoveOperation, setCopyMoveOperation] = useState<'copy' | 'move'>('copy');
  const [itemToCopyMove, setItemToCopyMove] = useState<StorageItem | null>(null);
  const [destinationPath, setDestinationPath] = useState('');
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<StorageItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [fileInfoDialogOpen, setFileInfoDialogOpen] = useState(false);
  const [fileInfoItem, setFileInfoItem] = useState<any>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Fetch branding settings
  const { data: brandingData } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  // Memoize brand colors to prevent infinite re-renders
  const brandColors = useMemo(() => {
    if (!brandingData) return null;
    
    return getBrandColors({
      primaryColor: brandingData.primary_color || '2563eb',
      secondaryColor: brandingData.secondary_color || '10b981',
      accentColor: brandingData.accent_color || 'f59e0b'
    });
  }, [
    brandingData?.primary_color,
    brandingData?.secondary_color,
    brandingData?.accent_color
  ]);

  // Apply brand colors only when they change
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
        console.log('Applied brand colors to Shadcn theme in Serverless Storage page');
      });
    }
  }, [brandColors, brandingData?.primary_color, brandingData?.secondary_color, brandingData?.accent_color]);

  // Initialize app storage directory structure
  const initializeAppStorage = useCallback(async () => {
    try {
      const puter = (window as any).puter;
      if (!puter || !puter.fs || !userInfo?.username) return null;

      // Create app-specific directory structure: /username/app-skypanel/storage
      const appRoot = `/${userInfo.username}/app-skypanel`;
      const storageRoot = `${appRoot}/storage`;

      console.log('Initializing app storage directory:', storageRoot);

      // Create the directory structure if it doesn't exist
      try {
        await puter.fs.mkdir(storageRoot, { createMissingParents: true });
        console.log('App storage directory created/verified:', storageRoot);
      } catch (error: any) {
        // Directory might already exist, which is fine
        if (!error.message?.includes('already exists')) {
          console.warn('Error creating app storage directory:', error);
        }
      }

      setAppStorageRoot(storageRoot);
      return storageRoot;
    } catch (error) {
      console.error('Error initializing app storage:', error);
      return null;
    }
  }, [userInfo?.username]);

  // Check if user is logged into Puter.js and get user info
  const checkPuterLogin = useCallback(async () => {
    try {
      setIsCheckingLogin(true);
      const puter = (window as any).puter;

      if (puter && typeof puter.auth?.isSignedIn === 'function') {
        const signedIn = await puter.auth.isSignedIn();
        setIsLoggedIn(signedIn);

        if (signedIn && typeof puter.auth?.getUser === 'function') {
          try {
            const user = await puter.auth.getUser();
            setUserInfo(user);
            console.log('Puter.js user info:', user);
          } catch (userError) {
            console.warn('Could not get user info:', userError);
          }
        }

        console.log('Puter.js login status:', signedIn ? 'Signed in' : 'Not signed in');
      } else {
        console.warn('Puter.js auth API not available');
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error checking Puter.js login status:', error);
      setIsLoggedIn(false);
    } finally {
      setIsCheckingLogin(false);
    }
  }, []);

  // Handle Puter.js login
  const handlePuterLogin = useCallback(async () => {
    try {
      const puter = (window as any).puter;
      if (puter && typeof puter.auth.signIn === 'function') {
        console.log('Initiating Puter.js sign in...');
        
        const result = await puter.auth.signIn();
        console.log('Sign in result:', result);
        
        await checkPuterLogin();
        
        if (puter.auth.isSignedIn()) {
          toast({
            title: "Success",
            description: "Successfully signed in to Puter.js",
          });
          loadItems(); // Load storage items after login
          loadStorageSpace(); // Load storage usage
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
  }, [checkPuterLogin, toast]);

  // Handle Puter.js logout
  const signOutPuter = useCallback(async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded');
      }

      const puter = (window as any).puter;
      console.log('Signing out from Puter...');

      puter.auth.signOut();
      setIsLoggedIn(false);

      toast({
        title: "Signed Out",
        description: "Successfully signed out from Puter.js",
      });
      
      // Clear storage data after logout
      setItems([]);
      setStorageSpace(null);
    } catch (error) {
      console.error('Puter.js sign out failed:', error);
      toast({
        title: "Error",
        description: `Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load storage items from current path
  const loadItems = useCallback(async () => {
    if (!isLoggedIn) return;

    try {
      setIsLoading(true);
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        setIsLoading(false);
        return;
      }

      // Initialize app storage if not already done
      let targetPath = currentPath;
      if (!appStorageRoot && userInfo?.username) {
        const storageRoot = await initializeAppStorage();
        if (storageRoot) {
          targetPath = storageRoot;
          setCurrentPath(storageRoot);
        }
      } else if (appStorageRoot && currentPath === '/') {
        // If we have app storage root but current path is still root, use app storage
        targetPath = appStorageRoot;
        setCurrentPath(appStorageRoot);
      }

      console.log('Loading items from path:', targetPath);

      // Ensure path is properly formatted
      const normalizedPath = targetPath === '/' ? '/' : targetPath.replace(/\/+$/, '');

      const items = await puter.fs.readdir(normalizedPath);
      console.log('Raw items response:', items);

      const formattedItems: StorageItem[] = items.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.is_dir ? 'directory' : 'file',
        size: item.size,
        created: item.created,
        modified: item.modified,
        uid: item.uid
      }));

      console.log('Formatted items:', formattedItems);
      setItems(formattedItems);
      // Clear selection when loading new directory
      setSelectedItems([]);
    } catch (error) {
      console.error('Error loading storage items:', error);
      setItems([]);
      toast({
        title: "Error",
        description: "Failed to load storage items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentPath, isLoggedIn, appStorageRoot, userInfo?.username, initializeAppStorage, toast]);

  // Load storage space usage
  const loadStorageSpace = useCallback(async () => {
    if (!isLoggedIn) return;
    
    try {
      const puter = (window as any).puter;
      
      if (!puter || !puter.fs) {
        return;
      }
      
      console.log('Loading storage space...');
      const space = await puter.fs.space();
      console.log('Storage space:', space);
      
      setStorageSpace(space);
    } catch (error) {
      console.error('Error loading storage space:', error);
      toast({
        title: "Warning",
        description: "Could not load storage usage information",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);

  // Handle file upload with enhanced options
  const handleFileUpload = useCallback(async (files: FileList, options?: { overwrite?: boolean; dedupeName?: boolean }) => {
    if (!isLoggedIn || files.length === 0) return;

    try {
      setIsUploading(true);
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        throw new Error('Puter.js not available');
      }

      console.log('Uploading files to path:', currentPath);

      // Enhanced upload with options
      const uploadOptions = {
        overwrite: options?.overwrite ?? false,
        dedupeName: options?.dedupeName ?? true,
        createMissingParents: true
      };

      // Upload files to current directory with enhanced options
      const uploadedFiles = await puter.fs.upload(Array.from(files), currentPath, uploadOptions);
      console.log('Files uploaded successfully:', uploadedFiles);

      // Show detailed success message
      const duplicateCount = uploadedFiles.filter((file: any) =>
        file.name !== Array.from(files).find(f => f.name === file.name.split(' (')[0])?.name
      ).length;

      toast({
        title: "Upload Complete",
        description: duplicateCount > 0
          ? `${files.length} file(s) uploaded (${duplicateCount} renamed to avoid conflicts)`
          : `${files.length} file(s) uploaded successfully`,
      });

      // Refresh the file list
      loadItems();
      loadStorageSpace(); // Update storage usage
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [currentPath, isLoggedIn, loadItems, loadStorageSpace, toast]);

  // Handle file/folder deletion
  const handleDelete = useCallback(async (item: StorageItem) => {
    if (!isLoggedIn) return;

    try {
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        throw new Error('Puter.js not available');
      }

      console.log('Deleting item:', item.path);

      await puter.fs.delete(item.path, { recursive: true });

      toast({
        title: "Success",
        description: `${item.type === 'directory' ? 'Folder' : 'File'} deleted successfully`,
      });

      // Refresh the file list
      loadItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, loadItems, toast]);

  // Handle bulk deletion
  const handleBulkDelete = useCallback(async () => {
    if (!isLoggedIn || selectedItems.length === 0) return;

    const confirmed = confirm(`Are you sure you want to delete ${selectedItems.length} item(s)?`);
    if (!confirmed) return;

    try {
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        throw new Error('Puter.js not available');
      }

      // Delete all selected items
      await Promise.all(
        selectedItems.map(itemPath =>
          puter.fs.delete(itemPath, { recursive: true })
        )
      );

      toast({
        title: "Success",
        description: `${selectedItems.length} item(s) deleted successfully`,
      });

      setSelectedItems([]);
      loadItems();
    } catch (error) {
      console.error('Error deleting items:', error);
      toast({
        title: "Error",
        description: "Failed to delete selected items",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, selectedItems, loadItems, toast]);

  // Handle file download
  const handleDownload = useCallback(async (item: StorageItem) => {
    if (!isLoggedIn || item.type === 'directory') return;

    try {
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        throw new Error('Puter.js not available');
      }

      console.log('Downloading file:', item.path);

      const blob = await puter.fs.read(item.path);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: `File "${item.name}" downloaded successfully`,
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);

  // Handle copy/move operations with enhanced options
  const handleCopyMove = useCallback(async () => {
    if (!itemToCopyMove || !destinationPath.trim()) return;

    try {
      const puter = (window as any).puter;

      if (!puter || !puter.fs) {
        throw new Error('Puter.js not available');
      }

      // Normalize destination path
      const normalizedDestination = destinationPath === '/' ? '/' : destinationPath.replace(/\/+$/, '');

      console.log(`${copyMoveOperation}ing item from ${itemToCopyMove.path} to ${normalizedDestination}`);

      const options = {
        overwrite: false,
        dedupeName: true,
        createMissingParents: true
      };

      if (copyMoveOperation === 'copy') {
        await puter.fs.copy(itemToCopyMove.path, normalizedDestination, options);
      } else {
        await puter.fs.move(itemToCopyMove.path, normalizedDestination, options);
      }

      toast({
        title: `${copyMoveOperation === 'copy' ? 'Copy' : 'Move'} Complete`,
        description: `${itemToCopyMove.type === 'directory' ? 'Folder' : 'File'} ${copyMoveOperation}d successfully`,
      });

      setCopyMoveDialogOpen(false);
      setItemToCopyMove(null);
      setDestinationPath('');
      loadItems();
    } catch (error) {
      console.error(`Error ${copyMoveOperation}ing item:`, error);
      toast({
        title: `${copyMoveOperation === 'copy' ? 'Copy' : 'Move'} Failed`,
        description: error instanceof Error ? error.message : `Failed to ${copyMoveOperation} item`,
        variant: "destructive",
      });
    }
  }, [itemToCopyMove, destinationPath, copyMoveOperation, loadItems, toast]);

  // Get appropriate icon for file type
  const getFileIcon = useCallback((fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return <Folder className="h-12 w-12 text-blue-500" />;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
      case 'webp':
        return <Image className="h-12 w-12 text-green-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <Music className="h-12 w-12 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <Video className="h-12 w-12 text-red-500" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <Archive className="h-12 w-12 text-orange-500" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'scss':
      case 'json':
      case 'xml':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code className="h-12 w-12 text-blue-600" />;
      default:
        return <FileText className="h-12 w-12 text-gray-500" />;
    }
  }, []);

  const getSmallFileIcon = useCallback((fileName: string, isDirectory: boolean) => {
    if (isDirectory) {
      return <Folder className="h-5 w-5 text-blue-500" />;
    }

    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
      case 'webp':
        return <Image className="h-5 w-5 text-green-500" />;
      case 'mp3':
      case 'wav':
      case 'flac':
      case 'aac':
      case 'ogg':
        return <Music className="h-5 w-5 text-purple-500" />;
      case 'mp4':
      case 'avi':
      case 'mkv':
      case 'mov':
      case 'wmv':
      case 'flv':
        return <Video className="h-5 w-5 text-red-500" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <Archive className="h-5 w-5 text-orange-500" />;
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'scss':
      case 'json':
      case 'xml':
      case 'py':
      case 'java':
      case 'cpp':
      case 'c':
      case 'php':
      case 'rb':
      case 'go':
      case 'rs':
        return <Code className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  }, []);

  // Navigation helpers
  const navigateToPath = useCallback((path: string) => {
    const normalizedPath = path === '' ? (appStorageRoot || '/') : path;
    setCurrentPath(normalizedPath);
  }, [appStorageRoot]);

  const navigateBack = useCallback(() => {
    // Don't allow navigation above app storage root
    if (currentPath === '/' || currentPath === appStorageRoot) return;

    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop(); // Remove last segment
    const parentPath = pathParts.length === 0 ? (appStorageRoot || '/') : '/' + pathParts.join('/');

    // Ensure we don't go above app storage root
    if (appStorageRoot && !parentPath.startsWith(appStorageRoot)) {
      navigateToPath(appStorageRoot);
    } else {
      navigateToPath(parentPath);
    }
  }, [currentPath, appStorageRoot, navigateToPath]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files as any);
    }
  }, [handleFileUpload]);

  // Selection handlers
  const toggleItemSelection = useCallback((itemPath: string) => {
    setSelectedItems(prev =>
      prev.includes(itemPath)
        ? prev.filter(path => path !== itemPath)
        : [...prev, itemPath]
    );
  }, []);

  const selectAllItems = useCallback(() => {
    const allPaths = items.map(item => item.path);
    setSelectedItems(allPaths);
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Handle file preview
  const handlePreview = useCallback(async (item: StorageItem) => {
    if (!isLoggedIn || item.type === 'directory') return;

    try {
      const puter = (window as any).puter;
      if (!puter || !puter.fs) return;

      const extension = item.name.split('.').pop()?.toLowerCase();
      const isTextFile = ['txt', 'md', 'json', 'js', 'ts', 'html', 'css', 'xml', 'csv'].includes(extension || '');
      const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension || '');

      if (isTextFile || isImageFile) {
        const blob = await puter.fs.read(item.path);

        if (isTextFile) {
          const text = await blob.text();
          setPreviewContent(text);
        } else if (isImageFile) {
          const url = URL.createObjectURL(blob);
          setPreviewContent(url);
        }

        setPreviewItem(item);
        setPreviewDialogOpen(true);
      } else {
        toast({
          title: "Preview Not Available",
          description: "Preview is only available for text and image files",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast({
        title: "Preview Failed",
        description: "Failed to load file preview",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);

  // Handle file info using puter.fs.stat()
  const handleFileInfo = useCallback(async (item: StorageItem) => {
    if (!isLoggedIn) return;

    try {
      const puter = (window as any).puter;
      if (!puter || !puter.fs) return;

      const fileInfo = await puter.fs.stat(item.path);
      setFileInfoItem(fileInfo);
      setFileInfoDialogOpen(true);
    } catch (error) {
      console.error('Error getting file info:', error);
      toast({
        title: "Info Failed",
        description: "Failed to get file information",
        variant: "destructive",
      });
    }
  }, [isLoggedIn, toast]);

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
          // Only load items and storage space if logged in
          if (await (window as any).puter.auth.isSignedIn()) {
            loadItems();
            loadStorageSpace();
          }
        } else {
          console.error('Puter.js loaded but Auth API not available');
          setIsCheckingLogin(false);
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
  }, [checkPuterLogin, loadItems, loadStorageSpace, toast]);

  // Initialize app storage when user info becomes available
  useEffect(() => {
    if (isLoggedIn && userInfo?.username && !appStorageRoot) {
      initializeAppStorage().then((storageRoot) => {
        if (storageRoot && currentPath === '/') {
          setCurrentPath(storageRoot);
        }
      });
    }
  }, [isLoggedIn, userInfo?.username, appStorageRoot, currentPath, initializeAppStorage]);

  // Load items when current path changes
  useEffect(() => {
    if (isLoggedIn) {
      loadItems();
    }
  }, [currentPath, isLoggedIn, loadItems]);

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
                    <HardDrive className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      Cloud Storage
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Manage your files and folders with Puter.js cloud storage
                    </p>
                  </div>
                </div>
                {isLoggedIn && (
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="bg-muted text-muted-foreground">
                      <Cloud className="h-4 w-4 mr-2" />
                      Connected to Puter.js
                    </Badge>
                    {userInfo && (
                      <Badge variant="secondary" className="bg-muted text-muted-foreground">
                        <span className="mr-2">👤</span>
                        {userInfo.username || userInfo.email || 'User'}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                {isLoggedIn && (
                  <Button
                    variant="outline"
                    onClick={signOutPuter}
                    className="border-border hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

          {/* Storage Analytics Cards */}
          {storageSpace && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5" />
                    Storage Usage
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used: {(storageSpace.used / (1024 * 1024)).toFixed(2)} MB</span>
                      <span>Total: {(storageSpace.capacity / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <Progress
                      value={(storageSpace.used / storageSpace.capacity) * 100}
                      className="h-2"
                      style={{
                        backgroundColor: brandColors ? `${brandColors.primary.full}20` : '#ea580c20'
                      }}
                    />
                    <div className="text-xs text-muted-foreground">
                      {((storageSpace.used / storageSpace.capacity) * 100).toFixed(1)}% used
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    File Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Total Files:</span>
                      <span className="font-medium">{items.filter(item => item.type === 'file').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Folders:</span>
                      <span className="font-medium">{items.filter(item => item.type === 'directory').length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Current Path:</span>
                      <span className="font-medium text-xs">{currentPath}</span>
                    </div>
                    {items.filter(item => item.type === 'file').length > 0 && (
                      <div className="pt-2 border-t">
                        <div className="text-xs text-muted-foreground mb-2">File Types:</div>
                        <div className="space-y-1">
                          {Object.entries(
                            items
                              .filter(item => item.type === 'file')
                              .reduce((acc, item) => {
                                const ext = item.name.split('.').pop()?.toLowerCase() || 'no extension';
                                acc[ext] = (acc[ext] || 0) + 1;
                                return acc;
                              }, {} as Record<string, number>)
                          )
                            .slice(0, 3)
                            .map(([ext, count]) => (
                              <div key={ext} className="flex justify-between text-xs">
                                <span>.{ext}</span>
                                <span>{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Storage Interface */}
          <Card className="shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5" />
                    Your Files
                  </CardTitle>
                  <CardDescription>
                    Manage your files and folders in the cloud with Puter.js storage
                  </CardDescription>
                </div>
                {isLoggedIn && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadItems}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                      className="flex items-center gap-2"
                    >
                      {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
                      {viewMode === 'grid' ? 'List' : 'Grid'}
                    </Button>
                  </div>
                )}
              </div>
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
                    Sign in to Puter.js to access your cloud storage.
                  </p>
                  <Button
                    onClick={handlePuterLogin}
                    className="mt-4"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign in to Puter.js
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Toolbar */}
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        {currentPath !== (appStorageRoot || '/') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={navigateBack}
                            className="flex items-center gap-2"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setCreateFolderOpen(true)}
                          className="flex items-center gap-2"
                          style={{
                            backgroundColor: brandColors ? brandColors.primary.full : '#ea580c',
                            color: 'white'
                          }}
                        >
                          <FolderPlus className="h-4 w-4" />
                          New Folder
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="flex items-center gap-2"
                          style={{
                            borderColor: brandColors ? brandColors.primary.full : '#ea580c',
                            color: brandColors ? brandColors.primary.full : '#ea580c'
                          }}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload Files
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              handleFileUpload(e.target.files);
                              // Reset the input so the same file can be uploaded again
                              e.target.value = '';
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 w-64"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedItems.length > 0 && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {selectedItems.length} item(s) selected
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={clearSelection}
                          >
                            <X className="h-4 w-4" />
                            Clear
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleBulkDelete}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Selected
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Breadcrumb Navigation */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateToPath(appStorageRoot || '/')}
                      className="h-auto p-1"
                    >
                      <Folder className="h-4 w-4 mr-1" />
                      Storage Home
                    </Button>
                    {currentPath !== (appStorageRoot || '/') && (
                      <>
                        {/* Show relative path from app storage root */}
                        {(() => {
                          const basePath = appStorageRoot || '/';
                          const relativePath = currentPath.startsWith(basePath)
                            ? currentPath.slice(basePath.length)
                            : currentPath;
                          const segments = relativePath.split('/').filter(Boolean);

                          return segments.map((segment, index, array) => (
                            <React.Fragment key={index}>
                              <span>/</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const newPath = basePath + '/' + array.slice(0, index + 1).join('/');
                                  navigateToPath(newPath);
                                }}
                                className="h-auto p-1"
                              >
                                {segment}
                              </Button>
                            </React.Fragment>
                          ));
                        })()}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* File/Folder List */}
                  <div
                    ref={dropZoneRef}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`min-h-[200px] ${isDragOver ? 'bg-primary/10 border-2 border-dashed border-primary' : ''}`}
                  >
                    {isLoading ? (
                      <div className="flex justify-center items-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : items.length > 0 ? (
                      <>
                        {/* Select All Option */}
                        {viewMode === 'list' && (
                          <div className="flex items-center gap-2 p-3 border-b">
                            <Checkbox
                              checked={selectedItems.length === items.length && items.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  selectAllItems();
                                } else {
                                  clearSelection();
                                }
                              }}
                            />
                            <span className="text-sm text-muted-foreground">
                              Select all ({items.length} items)
                            </span>
                          </div>
                        )}

                        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4' : 'space-y-1'}>
                          {items
                            .filter(item =>
                              searchQuery === '' ||
                              item.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((item) => {
                              const isSelected = selectedItems.includes(item.path);
                              return (
                                <div
                                  key={item.uid || item.path}
                                  className={`${
                                    viewMode === 'grid'
                                      ? 'border rounded-lg p-4 hover:bg-muted/50 cursor-pointer relative'
                                      : 'flex items-center justify-between p-3 border-b hover:bg-muted/50 cursor-pointer'
                                  } ${isSelected ? 'bg-primary/10 border-primary' : ''}`}
                                  onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey) {
                                      // Multi-select with Ctrl/Cmd
                                      toggleItemSelection(item.path);
                                    } else if (item.type === 'directory') {
                                      navigateToPath(item.path);
                                    }
                                  }}
                                >
                                  {viewMode === 'grid' ? (
                                    <>
                                      {/* Selection checkbox for grid view */}
                                      <div className="absolute top-2 left-2">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleItemSelection(item.path)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </div>
                                      <div className="text-center space-y-2 mt-6">
                                        <div className="flex justify-center">
                                          {getFileIcon(item.name, item.type === 'directory')}
                                        </div>
                                        <div className="space-y-1">
                                          <p className="text-sm font-medium truncate">{item.name}</p>
                                          {item.size && (
                                            <p className="text-xs text-muted-foreground">
                                              {(item.size / 1024).toFixed(1)} KB
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-3">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => toggleItemSelection(item.path)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        {getSmallFileIcon(item.name, item.type === 'directory')}
                                        <div>
                                          <p className="font-medium">{item.name}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {item.type === 'directory' ? 'Folder' :
                                             item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'File'}
                                          </p>
                                        </div>
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          {item.type === 'file' && (
                                            <>
                                              <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                handlePreview(item);
                                              }}>
                                                <Eye className="h-4 w-4 mr-2" />
                                                Preview
                                              </DropdownMenuItem>
                                              <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(item);
                                              }}>
                                                <Download className="h-4 w-4 mr-2" />
                                                Download
                                              </DropdownMenuItem>
                                              <DropdownMenuSeparator />
                                            </>
                                          )}
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            handleFileInfo(item);
                                          }}>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Properties
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setItemToCopyMove(item);
                                            setCopyMoveOperation('copy');
                                            setDestinationPath(currentPath);
                                            setCopyMoveDialogOpen(true);
                                          }}>
                                            <Copy className="h-4 w-4 mr-2" />
                                            Copy
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setItemToCopyMove(item);
                                            setCopyMoveOperation('move');
                                            setDestinationPath(currentPath);
                                            setCopyMoveDialogOpen(true);
                                          }}>
                                            <Move className="h-4 w-4 mr-2" />
                                            Move
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={(e) => {
                                            e.stopPropagation();
                                            setItemToRename(item);
                                            setNewItemName(item.name);
                                            setRenameDialogOpen(true);
                                          }}>
                                            <Edit className="h-4 w-4 mr-2" />
                                            Rename
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            className="text-destructive"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
                                                handleDelete(item);
                                              }
                                            }}
                                          >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="flex justify-center">
                          <Folder className="h-16 w-16 text-muted-foreground/40" />
                        </div>
                        <h3 className="mt-4 text-lg font-medium">No files or folders</h3>
                        <p className="mt-2 text-muted-foreground">
                          Upload files or create folders to get started.
                        </p>
                        <div className="flex justify-center gap-2 mt-4">
                          <Button
                            onClick={() => setCreateFolderOpen(true)}
                            variant="outline"
                          >
                            <FolderPlus className="h-4 w-4 mr-2" />
                            Create Folder
                          </Button>
                          <Button
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Files
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Drag and Drop Overlay */}
                    {isDragOver && (
                      <div className="absolute inset-0 bg-primary/20 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <Upload className="h-12 w-12 text-primary mx-auto mb-2" />
                          <p className="text-lg font-medium text-primary">Drop files here to upload</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Folder Dialog */}
          <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Folder</DialogTitle>
                <DialogDescription>
                  Enter a name for the new folder.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="folder-name">Folder Name</Label>
                  <Input
                    id="folder-name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCreateFolderOpen(false);
                    setNewFolderName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!newFolderName.trim()) return;

                    try {
                      const puter = (window as any).puter;
                      const folderPath = currentPath === '/' ? newFolderName : `${currentPath}/${newFolderName}`;

                      // Enhanced folder creation with options
                      await puter.fs.mkdir(folderPath, {
                        createMissingParents: true,
                        dedupeName: true
                      });

                      toast({
                        title: "Folder Created",
                        description: `Folder "${newFolderName}" created successfully`,
                      });

                      setCreateFolderOpen(false);
                      setNewFolderName('');
                      loadItems();
                    } catch (error) {
                      console.error('Error creating folder:', error);
                      toast({
                        title: "Creation Failed",
                        description: error instanceof Error ? error.message : "Failed to create folder",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!newFolderName.trim()}
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Rename Dialog */}
          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename {itemToRename?.type === 'directory' ? 'Folder' : 'File'}</DialogTitle>
                <DialogDescription>
                  Enter a new name for "{itemToRename?.name}".
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="new-name">New Name</Label>
                  <Input
                    id="new-name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Enter new name"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRenameDialogOpen(false);
                    setItemToRename(null);
                    setNewItemName('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    if (!newItemName.trim() || !itemToRename) return;

                    try {
                      const puter = (window as any).puter;
                      await puter.fs.rename(itemToRename.path, newItemName);

                      toast({
                        title: "Success",
                        description: `${itemToRename.type === 'directory' ? 'Folder' : 'File'} renamed successfully`,
                      });

                      setRenameDialogOpen(false);
                      setItemToRename(null);
                      setNewItemName('');
                      loadItems();
                    } catch (error) {
                      console.error('Error renaming item:', error);
                      toast({
                        title: "Error",
                        description: "Failed to rename item",
                        variant: "destructive",
                      });
                    }
                  }}
                  disabled={!newItemName.trim()}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Rename
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Copy/Move Dialog */}
          <Dialog open={copyMoveDialogOpen} onOpenChange={setCopyMoveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {copyMoveOperation === 'copy' ? 'Copy' : 'Move'} {itemToCopyMove?.type === 'directory' ? 'Folder' : 'File'}
                </DialogTitle>
                <DialogDescription>
                  {copyMoveOperation === 'copy' ? 'Copy' : 'Move'} "{itemToCopyMove?.name}" to a new location.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="destination-path">Destination Path</Label>
                  <Input
                    id="destination-path"
                    value={destinationPath}
                    onChange={(e) => setDestinationPath(e.target.value)}
                    placeholder="Enter destination path (e.g., /folder/subfolder)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use "/" for root directory. The item will be {copyMoveOperation}d to this location.
                  </p>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCopyMoveDialogOpen(false);
                    setItemToCopyMove(null);
                    setDestinationPath('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCopyMove}
                  disabled={!destinationPath.trim()}
                >
                  {copyMoveOperation === 'copy' ? (
                    <Copy className="h-4 w-4 mr-2" />
                  ) : (
                    <Move className="h-4 w-4 mr-2" />
                  )}
                  {copyMoveOperation === 'copy' ? 'Copy' : 'Move'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* File Preview Dialog */}
          <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Preview: {previewItem?.name}</DialogTitle>
                <DialogDescription>
                  File preview for {previewItem?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                {previewContent && previewItem && (
                  <div className="space-y-4">
                    {previewItem.name.split('.').pop()?.toLowerCase() &&
                     ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(previewItem.name.split('.').pop()?.toLowerCase() || '') ? (
                      <div className="text-center">
                        <img
                          src={previewContent}
                          alt={previewItem.name}
                          className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                          onLoad={() => {
                            // Clean up object URL after image loads
                            if (previewContent.startsWith('blob:')) {
                              setTimeout(() => URL.revokeObjectURL(previewContent), 1000);
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-96">
                          {previewContent}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setPreviewDialogOpen(false);
                    setPreviewItem(null);
                    setPreviewContent(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* File Info Dialog */}
          <Dialog open={fileInfoDialogOpen} onOpenChange={setFileInfoDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>File Properties</DialogTitle>
                <DialogDescription>
                  Detailed information about the selected item
                </DialogDescription>
              </DialogHeader>
              {fileInfoItem && (
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm text-muted-foreground">{fileInfoItem.name}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Type</Label>
                      <p className="text-sm text-muted-foreground">
                        {fileInfoItem.is_dir ? 'Directory' : 'File'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Size</Label>
                      <p className="text-sm text-muted-foreground">
                        {fileInfoItem.size ? `${(fileInfoItem.size / 1024).toFixed(2)} KB` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Path</Label>
                      <p className="text-sm text-muted-foreground break-all">{fileInfoItem.path}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Created</Label>
                      <p className="text-sm text-muted-foreground">
                        {fileInfoItem.created ? new Date(fileInfoItem.created).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Modified</Label>
                      <p className="text-sm text-muted-foreground">
                        {fileInfoItem.modified ? new Date(fileInfoItem.modified).toLocaleString() : 'N/A'}
                      </p>
                    </div>
                    {fileInfoItem.uid && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium">Unique ID</Label>
                        <p className="text-sm text-muted-foreground font-mono">{fileInfoItem.uid}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFileInfoDialogOpen(false);
                    setFileInfoItem(null);
                  }}
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessStoragePage;
