import { ReactNode, useState, useRef, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";
import {
  Gauge,
  Server,
  Network,
  HardDrive,
  CreditCard,
  Ticket,
  Users,
  Database,
  Settings as SettingsIcon,
  Search,
  Coins,
  Menu,
  LogOut,
  ChevronDown,
  X,
  Mail,
  Code,
  Download,
  Receipt,
  FileText,
  BookOpen,
  Activity,  Zap,
  MessageSquare,
  Globe,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getBrandColors } from "@/lib/brand-theme";
import { getGravatarUrl, getUserInitials } from "@/lib/avatar-utils";


type NavigationItem = {
  name: string;
  href: string | undefined;
  icon: ReactNode;
  adminOnly?: boolean;
  children?: NavigationItem[];
};

interface DashboardLayoutProps {
  children: ReactNode;
}

// Define data types for search
interface ServerType {
  id: number;
  name: string;
  status: string;
  ipAddress?: string;
}

interface UserType {
  id: number;
  fullName: string;
  email: string;
  username: string;
  deletedAt?: string | null;
}

interface TicketType {
  id: number;
  userId: number;
  subject: string;
  status: string;
  deletedAt?: string | null;
}

interface TransactionType {
  id: number;
  userId: number;
  type: string;
  description: string;
  amount: number;
  status: string;
  paymentId?: string;
  invoiceNumber?: string;
}



// Define search result types
interface SearchResult {
  id: number | string;
  type: "server" | "user" | "ticket" | "billing";
  name: string;
  description?: string;
  url: string;
  icon?: ReactNode;
  actionButtons?: Array<{
    label: string;
    icon?: ReactNode;
    action: string;
  }>;
}

function DashboardLayoutComponent({ children }: DashboardLayoutProps) {
  const [location, navigate] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [companyName, setCompanyName] = useState("VirtFusion");
  const [isSearching, setIsSearching] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [expandedNavItems, setExpandedNavItems] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Fetch branding settings to get company name and brand colors
  const { data: brandingSettings, isLoading: brandingLoading, error: brandingError, isError: brandingIsError } = useQuery({
    queryKey: ["/api/settings/branding"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (err) => {
      if (err instanceof Error && err.message.includes('HTML')) {
        console.error('Received HTML response instead of JSON for /api/settings/branding:', err);
        toast({ title: "API Error", description: "Non-JSON response received for branding data.", variant: "destructive" });
      }
    },
  });

  // Fetch public settings
  const { data: settings = {}, isLoading: settingsLoading, error: settingsError, isError: settingsIsError } = useQuery({
    queryKey: ["/api/settings/public"],
    enabled: !!user,
    onError: (err) => {
      if (err instanceof Error && err.message.includes('HTML')) {
        console.error('Received HTML response instead of JSON for /api/settings/public:', err);
        toast({ title: "API Error", description: "Non-JSON response received for public settings.", variant: "destructive" });
      }
    },
  });

  // Update company name when settings are loaded
  useEffect(() => {
    if (brandingSettings?.company_name) {
      if (companyName !== brandingSettings.company_name) {
        console.log('[DEBUG] setCompanyName called with', brandingSettings.company_name);
        setCompanyName(brandingSettings.company_name);
      }
    } else if (settings?.company_name) {
      if (companyName !== settings.company_name) {
        console.log('[DEBUG] setCompanyName called with', settings.company_name);
        setCompanyName(settings.company_name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandingSettings?.company_name, settings?.company_name]);

  // Get brand colors using the new color system with appropriate fallbacks
  const brandColors = useMemo(() => getBrandColors({
    primaryColor: brandingSettings?.primary_color || brandingSettings?.company_color || '2563eb',
    secondaryColor: brandingSettings?.secondary_color || '10b981',
    accentColor: brandingSettings?.accent_color || 'f59e0b'
  }), [
    brandingSettings?.primary_color,
    brandingSettings?.company_color,
    brandingSettings?.secondary_color,
    brandingSettings?.accent_color
  ]);

  // Apply brand colors to CSS variables and Shadcn theme
  useEffect(() => {
    // Only apply if we have actual branding data
    if (!brandingSettings?.primary_color && !brandingSettings?.company_color) {
      return;
    }

    import('@/lib/brand-theme').then(({ applyBrandColorVars, applyToShadcnTheme }) => {
      // Apply to both our CSS variables and Shadcn theme variables
      applyBrandColorVars({
        primaryColor: brandingSettings?.primary_color || brandingSettings?.company_color || '2563eb',
        secondaryColor: brandingSettings?.secondary_color || '10b981',
        accentColor: brandingSettings?.accent_color || 'f59e0b'
      });
    });
  }, [brandingSettings?.primary_color, brandingSettings?.company_color, brandingSettings?.secondary_color, brandingSettings?.accent_color]);

  // Auto-expand navigation items based on current route.
  // The previous implementation always created a new `Set`, which triggered
  // a state update on every render and ultimately caused the
  // "Maximum update depth exceeded" warning. We now only update state when the
  // identifier **actually** needs to be added.
  useEffect(() => {
    mainNavigation.forEach(item => {
      if (!item.children) return;

      const isOnChildPage = item.children.some(child => location === child.href);
      if (!isOnChildPage) return;

      const identifier = item.href || item.name;

      console.log('[DEBUG] setExpandedNavItems called');
      setExpandedNavItems(prev => {
        if (prev.has(identifier)) {
          // No change → return the same reference to avoid unnecessary updates.
          return prev;
        }
        const next = new Set(prev);
        next.add(identifier);
        return next;
      });
    });
  }, [location]);

  const queryClient = useQueryClient();

  // Define searchable content categories
  const searchCategories = [
    { id: "tickets", label: "Support Tickets", icon: <Ticket className="h-4 w-4" /> },
    { id: "users", label: "Users", icon: <Users className="h-4 w-4" />, adminOnly: true },
    { id: "billing", label: "Billing & Transactions", icon: <CreditCard className="h-4 w-4" /> },
    { id: "packages", label: "Packages", icon: <Server className="h-4 w-4" /> },
    { id: "settings", label: "Settings", icon: <SettingsIcon className="h-4 w-4" />, adminOnly: true },
    { id: "api", label: "API Documentation", icon: <Code className="h-4 w-4" /> },
  ];

  // Fetch users for search (admin only)
  const { data: usersData = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 60 * 1000, // 1 minute
    enabled: user?.role === "admin",
  });

  // Fetch tickets for search - use admin endpoint for admins
  const { data: ticketsResponse } = useQuery<{ data: TicketType[], pagination: any }>({
    queryKey: [user?.role === "admin" ? "/api/admin/tickets" : "/api/tickets"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch billing/transactions for search - use admin endpoint for admins
  const { data: transactionsData = [] } = useQuery<TransactionType[]>({
    queryKey: [user?.role === "admin" ? "/api/admin/transactions" : "/api/transactions"],
    staleTime: 60 * 1000, // 1 minute
  });



  // Fetch balance data (VirtFusion only)
  const { data: balanceData } = useQuery<{
    virtFusionCredits: number,
    virtFusionTokens: number
  }>({
    queryKey: ["/api/billing/balance"],
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!user,
  });

  // Use API data without sample data fallbacks
  const users = usersData;
  const tickets = ticketsResponse?.data || [];
  const transactions = transactionsData;


  // Define global navigation shortcuts
  const globalShortcuts = [
    {
      id: "dashboard",
      name: "Dashboard",
      description: "View your dashboard",
      url: "/dashboard",
      icon: <Gauge className="h-4 w-4" />
    },
    {
      id: "billing",
      name: "Billing",
      description: "Manage billing and payments",
      url: "/billing",
      icon: <CreditCard className="h-4 w-4" />
    },
    {
      id: "tickets",
      name: "Support Tickets",
      description: "View your support tickets",
      url: "/tickets",
      icon: <Ticket className="h-4 w-4" />
    },
    {
      id: "packages",
      name: "Packages",
      description: "Browse available packages",
      url: "/packages",
      icon: <Server className="h-4 w-4" />
    },
    {
      id: "profile",
      name: "Profile",
      description: "Manage your profile",
      url: "/profile",
      icon: <Users className="h-4 w-4" />
    },
    {
      id: "blog",
      name: "Blog",
      description: "Read our latest updates",
      url: "/blog",
      icon: <FileText className="h-4 w-4" />
    },
    {
      id: "docs",
      name: "Documentation",
      description: "Browse product documentation",
      url: "/docs",
      icon: <BookOpen className="h-4 w-4" />
    },
    {
      id: "status",
      name: "Status",
      description: "Check system status",
      url: "/status",
      icon: <Activity className="h-4 w-4" />    },
    // {
    //   id: "speed-test",
    //   name: "Speed Test",
    //   description: "Test your connection speed",
    //   url: "/speed-test",
    //   icon: <Zap className="h-4 w-4" />
    // }, // Temporarily hidden for fixes
    // {
    //   id: "dns",
    //   name: "DNS Management",
    //   description: "Manage your DNS domains and records",
    //   url: "/dns",
    //   icon: <Globe className="h-4 w-4" />
    // }, // DNS disabled
    // {
    //   id: "dns-plans",
    //   name: "DNS Plans",
    //   description: "Purchase and manage DNS service plans",
    //   url: "/dns-plans",
    //   icon: <CreditCard className="h-4 w-4" />
    // }, // DNS disabled
    // {
    //   id: "api-docs",
    //   name: "API Documentation",
    //   description: "Explore our API documentation",
    //   url: "/api-docs",
    //   icon: <Code className="h-4 w-4" />
    // },
  ];

  // Simplified admin shortcuts to direct to the new admin dashboard
  const adminShortcuts = [
    {
      id: "admin-dashboard",
      name: "Admin Dashboard",
      description: "Access admin control panel",
      url: "/admin",
      icon: <SettingsIcon className="h-4 w-4" />,
      adminOnly: true
    }
  ];

  // Main navigation items (removed Support Tickets and Live Support - they'll be under VirtFusion Panel)
  const mainNavigation: NavigationItem[] = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: <Gauge className="h-5 w-5 mr-3" />,
    },
    {
      name: "My Servers",
      href: "/servers",
      icon: <Server className="h-5 w-5 mr-3" />,
    },
    {      name: "Server Plans",
      href: "/packages",
      icon: <HardDrive className="h-5 w-5 mr-3" />,
    },
    {
      name: "Billing & Payments",
      href: "/billing",
      icon: <CreditCard className="h-5 w-5 mr-3" />,
    },    {
      name: `${companyName}'s Blog`,
      href: "/dashboard/blog",
      icon: <FileText className="h-5 w-5 mr-3" />,
    },
    // {
    //   name: "DNS Management",
    //   href: "/dns",
    //   icon: <Globe className="h-5 w-5 mr-3" />,
    //   children: [
    //     {
    //       name: "DNS Plans",
    //       href: "/dns-plans",
    //       icon: <CreditCard className="h-4 w-4 mr-3" />,
    //     },
    //   ],
    // },
   // {
   //   name: "API Documentation",
   //   href: "/api-docs",
   //   icon: <Code className="h-5 w-5 mr-3" />,
   // },
  ];

  // Admin navigation items - empty as admin link is in dropdown
  const adminNavigation: NavigationItem[] = [];

  // Improved search function with better organization and shortcuts
  const performSearch = (query: string) => {
    if (!query || !query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('[DEBUG] setIsSearching(true)');
        setIsSearching(true);
    const cleanQuery = query.toLowerCase().trim();

    try {
      // Start with empty results
      const results: SearchResult[] = [];

      // Always include navigation shortcuts that match the query for all users
      globalShortcuts.forEach(shortcut => {
        if (shortcut.name.toLowerCase().includes(cleanQuery) ||
            shortcut.description.toLowerCase().includes(cleanQuery)) {
          results.push({
            id: `shortcut-${shortcut.id}`,
            type: "ticket", // We reuse the existing types for compatibility
            name: shortcut.name,
            description: shortcut.description,
            url: shortcut.url,
            icon: shortcut.icon,
          });
        }
      });

      // Admin-specific content
      if (user?.role === "admin") {
        // Add admin navigation shortcuts
        adminShortcuts.forEach(shortcut => {
          if (shortcut.name.toLowerCase().includes(cleanQuery) ||
              shortcut.description.toLowerCase().includes(cleanQuery)) {
            results.push({
              id: `shortcut-${shortcut.id}`,
              type: "user", // We reuse the existing types for compatibility
              name: shortcut.name,
              description: shortcut.description,
              url: shortcut.url,
              icon: shortcut.icon,
            });
          }
        });

        // Admins can search ALL tickets
        tickets.forEach((ticket: TicketType) => {
          // Skip only deleted tickets for admins
          if (ticket.deletedAt) return;

          // Match by exact ticket ID or subject contains query
          if (ticket.id.toString() === cleanQuery ||
              (ticket.subject || "").toLowerCase().includes(cleanQuery)) {
            // Route to /tickets/{id} if admin is the ticket creator, otherwise to /admin/tickets/{id}
            const ticketUrl = ticket.userId === user?.id
              ? `/tickets/${ticket.id}`
              : `/admin/tickets/${ticket.id}`;

            results.push({
              id: ticket.id,
              type: "ticket",
              name: `Ticket #${ticket.id}: ${ticket.subject || 'No Subject'}`,
              description: `Status: ${ticket.status || 'Unknown'}`,
              url: ticketUrl,
              icon: <Ticket className="h-4 w-4" />,
            });
          }
        });

        // Admins can search ALL users
        users.forEach((u: UserType) => {
          if (u.deletedAt) return;

          const fullName = (u.fullName || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          const username = (u.username || "").toLowerCase();

          if (fullName.includes(cleanQuery) || email.includes(cleanQuery) || username.includes(cleanQuery)) {
            results.push({
              id: u.id,
              type: "user",
              name: u.fullName || `User #${u.id}`,
              description: u.email || '',
              url: `/admin/users/${u.id}`,
              icon: <Users className="h-4 w-4" />,
            });
          }
        });

        // Admins can search ALL transactions - FIXED LINK TO SPECIFIC TRANSACTION
        transactions.forEach((tx: TransactionType) => {
          const description = (tx.description || "").toLowerCase();
          const type = (tx.type || "").toLowerCase();
          const txIdString = tx.id.toString();
          const paymentId = (tx.paymentId || "").toLowerCase();
          const invoiceNumber = (tx.invoiceNumber || "").toLowerCase();

          // Search by description, type, transaction ID, payment ID, or invoice number
          if (description.includes(cleanQuery) ||
              type.includes(cleanQuery) ||
              txIdString === cleanQuery ||
              paymentId.includes(cleanQuery) ||
              invoiceNumber.includes(cleanQuery) ||
              'transaction'.includes(cleanQuery)) {

            const txType = tx.type ? (tx.type.charAt(0).toUpperCase() + tx.type.slice(1)) : 'Transaction';
            // For admin view, show which user the transaction belongs to
            const userName = users.find(u => u.id === tx.userId)?.fullName || `User #${tx.userId}`;

            // Include payment ID in description if it exists
            let additionalInfo = '';
            if (tx.paymentId) {
              additionalInfo += ` | Payment ID: ${tx.paymentId}`;
            }
            if (tx.invoiceNumber) {
              additionalInfo += ` | Invoice: ${tx.invoiceNumber}`;
            }

            // Correctly link to transaction page with specific ID
            const txLink = `/billing/transactions/${tx.id}`;

            results.push({
              id: tx.id,
              type: "billing",
              name: `${txType}: ${tx.description || `Transaction #${tx.id}`}`,
              description: `User: ${userName} | Amount: $${tx.amount?.toFixed(2) || '0.00'} | Status: ${tx.status || 'Unknown'}${additionalInfo}`,
              url: txLink,
              icon: <CreditCard className="h-4 w-4" />,
              actionButtons: [
                {
                  label: "View Details",
                  icon: <CreditCard className="h-4 w-4" />,
                  action: txLink
                },
                {
                  label: "Download",
                  icon: <Download className="h-4 w-4" />,
                  action: `/api/transactions/${tx.id}/download`
                }
              ]
            });
          }
        });



        // System settings search for admins
        if ("system settings".includes(cleanQuery) ||
            "configure".includes(cleanQuery) ||
            "admin settings".includes(cleanQuery)) {
          results.push({
            id: `settings-system`,
            type: "user",
            name: "System Settings",
            description: "Configure system settings",
            url: "/admin/settings",
            icon: <SettingsIcon className="h-4 w-4" />,
          });
        }
      }
      // Regular user-specific content
      else {
        // Regular users can only search their own tickets
        tickets.forEach((ticket: TicketType) => {
          // Skip deleted tickets and ensure proper access
          if (ticket.deletedAt) return;
          if (ticket.userId !== user?.id) return;

          // Match by exact ticket ID or subject contains query
          if (ticket.id.toString() === cleanQuery ||
              (ticket.subject || "").toLowerCase().includes(cleanQuery)) {
            results.push({
              id: ticket.id,
              type: "ticket",
              name: `Ticket #${ticket.id}: ${ticket.subject || 'No Subject'}`,
              description: `Status: ${ticket.status || 'Unknown'}`,
              url: `/tickets/${ticket.id}`,
              icon: <Ticket className="h-4 w-4" />,
            });
          }
        });

        // Regular users can only search their own transactions - FIXED LINK TO SPECIFIC TRANSACTION
        transactions.forEach((tx: TransactionType) => {
          if (tx.userId !== user?.id) return;

          const description = (tx.description || "").toLowerCase();
          const type = (tx.type || "").toLowerCase();
          const txIdString = tx.id.toString();
          const paymentId = (tx.paymentId || "").toLowerCase();
          const invoiceNumber = (tx.invoiceNumber || "").toLowerCase();

          // Search by description, type, transaction ID, payment ID, or invoice number
          if (description.includes(cleanQuery) ||
              type.includes(cleanQuery) ||
              txIdString === cleanQuery ||
              paymentId.includes(cleanQuery) ||
              invoiceNumber.includes(cleanQuery) ||
              'transaction'.includes(cleanQuery)) {

            const txType = tx.type ? (tx.type.charAt(0).toUpperCase() + tx.type.slice(1)) : 'Transaction';

            // Include payment ID in description if it exists
            let additionalInfo = '';
            if (tx.paymentId) {
              additionalInfo += ` | Payment ID: ${tx.paymentId}`;
            }
            if (tx.invoiceNumber) {
              additionalInfo += ` | Invoice: ${tx.invoiceNumber}`;
            }

            // Correctly link to transaction page with specific ID
            const txLink = `/billing/transactions/${tx.id}`;

            results.push({
              id: tx.id,
              type: "billing",
              name: `${txType}: ${tx.description || `Transaction #${tx.id}`}`,
              description: `Amount: $${tx.amount?.toFixed(2) || '0.00'} | Status: ${tx.status || 'Unknown'}${additionalInfo}`,
              url: txLink,
              icon: <CreditCard className="h-4 w-4" />,
              actionButtons: [
                {
                  label: "View Details",
                  icon: <CreditCard className="h-4 w-4" />,
                  action: txLink
                },
                {
                  label: "Download",
                  icon: <Download className="h-4 w-4" />,
                  action: `/api/transactions/${tx.id}/download`
                }
              ]
            });
          }
        });



        // Add user profile search for regular users
        if ("profile".includes(cleanQuery) ||
            "account".includes(cleanQuery) ||
            "settings".includes(cleanQuery) ||
            (user?.fullName || "").toLowerCase().includes(cleanQuery)) {
          results.push({
            id: `profile-user`,
            type: "user",
            name: "My Profile",
            description: "Manage your account settings",
            url: "/profile",
            icon: <Users className="h-4 w-4" />,
        setIsSearching(false);
    }
  };

  // Handle search input changes with debounce
  useEffect(() => {
    // Only trigger search when there's an actual query
    // Allow single digits for ticket ID search
    if (searchQuery && (searchQuery.length > 1 || !isNaN(parseInt(searchQuery)))) {
      const delaySearch = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);

      return () => clearTimeout(delaySearch);
    } else if (searchQuery === '') {
      // Immediately clear results when query is cleared
      setSearchResults([]);
    }
  }, [searchQuery]); // Only depend on searchQuery

  // Enhanced keyboard navigation for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Command+K to focus search and show popup
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        console.log('[DEBUG] setShowSearchPopup(true)');
                    setShowSearchPopup(true);
        // Wait for next tick to ensure popup is rendered before focusing
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 10);
      }

      // Escape to clear search when focused or close dropdown
      const isSearchFocused = document.activeElement === searchInputRef.current;

      if (e.key === "Escape") {
        if (showSearchPopup) {
          console.log('[DEBUG] setShowSearchPopup(false)');
                    setShowSearchPopup(false);
          setSearchQuery('');
        } else if (searchQuery && isSearchFocused) {
          setSearchQuery(''); // Clear the search query if there's content
        } else if (isSearchFocused) {
          searchInputRef.current?.blur(); // Remove focus if no content
        }
      }

      // Handle arrow key navigation within search results
      if (showSearchPopup && searchResults.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveResultIndex(prev => {
            const newIndex = prev < searchResults.length - 1 ? prev + 1 : 0;
            // Scroll to the active item
            const resultItems = document.querySelectorAll('.search-result-item');
            if (resultItems[newIndex]) {
              resultItems[newIndex].scrollIntoView({ block: 'nearest' });
            }
            return newIndex;
          });
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveResultIndex(prev => {
            const newIndex = prev > 0 ? prev - 1 : searchResults.length - 1;
            // Scroll to the active item
            const resultItems = document.querySelectorAll('.search-result-item');
            if (resultItems[newIndex]) {
              resultItems[newIndex].scrollIntoView({ block: 'nearest' });
            }
            return newIndex;
          });
        } else if (e.key === "Enter" && activeResultIndex >= 0) {
          e.preventDefault();
          navigateToResult(searchResults[activeResultIndex]);
          console.log('[DEBUG] setShowSearchPopup(false)');
                    setShowSearchPopup(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchQuery, searchResults.length, activeResultIndex, showSearchPopup]);

  // Handle navigation to search result
  const navigateToResult = (result: SearchResult) => {
    setSearchQuery(''); // Clear search after selecting a result
    console.log('[DEBUG] setShowSearchPopup(false)');
                    setShowSearchPopup(false);
    navigate(result.url);
  };

  // Toggle expanded state for navigation items with children
  const toggleNavItem = (href: string | null) => {
    // Use a fallback identifier if href is null
    const identifier = href || "no-href";
    console.log('[DEBUG] setExpandedNavItems called');
      setExpandedNavItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(identifier)) {
        newSet.delete(identifier);
      } else {
        newSet.add(identifier);
      }
      return newSet;
    });
  };
  // Check if a navigation item or its children are active
  const isNavItemActive = (item: NavigationItem): boolean => {
    // If item.href is undefined, it can't be active by direct match
    if (item.href && location === item.href) return true;
    // Check if any children are active
    if (item.children) {
      return item.children.some(child => location === child.href);
    }
    return false;
  };

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "An error occurred while logging out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-textColor">
      {/* Modern Sidebar Navigation */}
      <aside
        className={cn(
          "w-64 flex-shrink-0 flex flex-col z-30 bg-gray-900 border-r border-gray-800 shadow-xl",
          mobileMenuOpen ? "fixed inset-y-0 left-0 block" : "hidden md:flex",
        )}
      >
        {/* Enhanced Header with Modern Branding */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center group">
            <div
              className="flex items-center justify-center h-12 w-12 mr-3 rounded-xl text-white font-bold text-xl shadow-lg group-hover:shadow-xl transition-shadow duration-200"
              style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
            >
              {companyName?.charAt(0) || "S"}
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-white group-hover:text-primary transition-colors duration-200">
                {companyName}
              </span>
              <span className="text-xs text-gray-400 font-medium">Dashboard</span>
            </div>
          </Link>

          {/* Close button for mobile */}
          <button
            className="md:hidden absolute top-4 right-4 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-200 focus:outline-none transition-colors duration-200"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modern Navigation Links */}
        <nav className="flex-1 py-6 px-4 overflow-y-auto">
          <div className="space-y-2">
            {mainNavigation.map((item) => {
              const isActive = isNavItemActive(item);
              // Use the same fallback identifier as in toggleNavItem
              const identifier = item.href || item.name;
              const isExpanded = expandedNavItems.has(identifier);
              const hasChildren = item.children && item.children.length > 0;

              return (
                <div key={item.href || `nav-item-${item.name}`}>
                  {/* Main navigation item */}
                  <div
                    className={cn(
                      "flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-gray-300 hover:bg-gray-800 hover:text-white",
                    )}                    onClick={() => {
                      // Only navigate if href exists
                      if (item.href) {
                        navigate(item.href);
                      }
                      // If it has children, toggle the submenu
                      if (hasChildren) {
                        toggleNavItem(identifier); // Use the consistent identifier
                      }
                    }}
                  >
                    <div className={cn(
                      "mr-3 transition-colors duration-200",
                      isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-gray-200"
                    )}>
                      {item.icon}
                    </div>
                    <span className="font-medium flex-1">{item.name}</span>
                    {hasChildren && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded ? "rotate-180" : "",
                          isActive ? "text-primary-foreground" : "text-gray-400 group-hover:text-gray-200"
                        )}
                        onClick={(e) => {
                          // Prevent the main click handler from running
                          e.stopPropagation();
                          // Only toggle the submenu
                          toggleNavItem(identifier); // Use the consistent identifier
                        }}
                      />
                    )}
                    {isActive && !hasChildren && (
                      <div className="w-2 h-2 rounded-full bg-primary-foreground/40" />
                    )}
                  </div>                  {/* Submenu items */}
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-2 space-y-1">
                      {item.children!.map((child) => {
                        const isChildActive = location === child.href;
                        // Only render Link if href exists
                        return child.href ? (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                              "flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                              isChildActive
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "text-gray-400 hover:bg-gray-800 hover:text-white",
                            )}
                          >
                            <div className={cn(
                              "mr-3 transition-colors duration-200",
                              isChildActive ? "text-primary-foreground" : "text-gray-500 group-hover:text-gray-300"
                            )}>
                              {child.icon}
                            </div>
                            <span className="font-medium">{child.name}</span>
                            {isChildActive && (
                              <div className="ml-auto w-2 h-2 rounded-full bg-primary-foreground/40" />
                            )}
                          </Link>
                        ) : (
                          // Fallback for items without href (though none exist currently)
                          <div
                            key={child.name}
                            className="flex items-center px-4 py-2 rounded-lg text-sm font-medium text-gray-500"
                          >
                            <div className="mr-3">
                              {child.icon}
                            </div>
                            <span className="font-medium">{child.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Enhanced VirtFusion Section with Support Options */}
          <div className="mt-8 px-4">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Control Panel
              </h3>
              <VirtFusionSsoButton
                variant="outline"
                size="default"
                className="w-full justify-center bg-primary text-primary-foreground hover:bg-primary/90 border-primary shadow-lg mb-3"
                text="VirtFusion Panel"
              />

              {/* Support Options Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full justify-between hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
                    style={{
                      backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})`,
                      borderColor: `var(--brand-primary-medium, ${brandColors.primary.medium})`,
                      color: `var(--brand-primary, ${brandColors.primary.full})`
                    }}
                  >
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Support
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/tickets" className="flex items-center w-full hover:bg-primary hover:text-primary-foreground">
                      <Ticket className="h-4 w-4 mr-2" />
                      Support Tickets
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/live-chat" className="flex items-center w-full hover:bg-primary hover:text-primary-foreground">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Live Support
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </nav>

        {/* Modern Account Section */}
        <div className="p-4 border-t border-gray-800 bg-gray-800/50">
          <div className="flex items-center">
            <Avatar className="w-10 h-10 mr-3 ring-2 ring-primary/20">
              <AvatarImage src={getGravatarUrl(user?.email)} alt={user?.fullName || "User"} />
              <AvatarFallback
                className="text-white font-semibold"
                style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
              >
                {getUserInitials(user?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white truncate">
                {user?.fullName || "User"}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {user?.email || "user@example.com"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle & Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Modern Top Navigation Bar */}
        <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm sticky top-0 z-20">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden rounded-xl p-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus:outline-none transition-colors duration-200"
              onClick={() => console.log('[DEBUG] setMobileMenuOpen called');
              setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Enhanced Modern Search */}
            <div className="flex-1 flex max-w-2xl mx-4 relative z-10">
              <div className="relative w-full">
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for anything... (press Ctrl+K or ⌘K)"
                    value={searchQuery}
                    onChange={(e) => console.log('[DEBUG] setSearchQuery called');
                        setSearchQuery(e.target.value)}
                    onFocus={() => console.log('[DEBUG] setShowSearchPopup(true)');
                    setShowSearchPopup(true)}
                    className="h-11 w-full pl-11 pr-20 py-3 border border-gray-300 rounded-xl text-sm bg-gray-100/70 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 placeholder:text-gray-500"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <kbd className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-2 py-1 font-mono text-xs text-gray-500 shadow-sm">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Right-side Actions */}
            <div className="flex items-center space-x-3">
              {/* VirtFusion Credits */}
              <Link
                href="/billing"
                className="hidden sm:flex items-center px-3 py-2 rounded-xl hover:shadow-sm transition-all duration-200 group"
                style={{ backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})` }}
                title="VirtFusion Credits - Go to Billing"
              >
                <Coins
                  className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform duration-200"
                  style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                />
                <span className="text-sm font-semibold text-gray-900">
                  ${balanceData?.virtFusionCredits?.toFixed(2) || "0.00"}
                </span>
              </Link>



              {/* Enhanced Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-xl p-2 hover:bg-gray-100 transition-colors duration-200"
                  >
                    <Avatar className="w-9 h-9 ring-2 ring-primary/10 hover:ring-primary/20 transition-all duration-200">
                      <AvatarImage src={getGravatarUrl(user?.email)} alt={user?.fullName || "User"} />
                      <AvatarFallback
                        className="text-white font-semibold"
                        style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                      >
                        {getUserInitials(user?.fullName)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 p-2 bg-white border border-gray-200 shadow-lg rounded-xl"
                >
                  <div className="px-3 py-2 mb-2">
                    <p className="text-sm font-semibold text-gray-900">{user?.fullName || "User"}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email || "user@example.com"}</p>
                  </div>
                  <DropdownMenuSeparator className="my-2" />

                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center px-3 py-2 rounded-lg text-sm hover:bg-primary hover:text-primary-foreground transition-colors duration-200 cursor-pointer"
                    >
                      <Users className="h-4 w-4 mr-3" />
                      Profile Settings
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/billing"
                      className="flex items-center px-3 py-2 rounded-lg text-sm hover:bg-primary hover:text-primary-foreground transition-colors duration-200 cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4 mr-3" />
                      Billing & Usage
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link
                      href="/tickets"
                      className="flex items-center px-3 py-2 rounded-lg text-sm hover:bg-primary hover:text-primary-foreground transition-colors duration-200 cursor-pointer"
                    >
                      <Ticket className="h-4 w-4 mr-3" />
                      Support Tickets
                    </Link>
                  </DropdownMenuItem>

                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin"
                        className="flex items-center px-3 py-2 rounded-lg text-sm hover:bg-primary hover:text-primary-foreground transition-colors duration-200 cursor-pointer"
                      >
                        <SettingsIcon className="h-4 w-4 mr-3" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuSeparator className="my-2" />

                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Enhanced Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-100/60 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Modern Footer */}
        <footer className="bg-white border-t border-gray-200/60 py-6">
          <div className="max-w-7xl mx-auto px-4 lg:px-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm mb-3 md:mb-0">
                <a
                  href="/status"
                  className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
                >
                  Status
                </a>
                <a
                  href="/tos"
                  className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
                >
                  Terms of Service
                </a>
                <a
                  href="/privacy"
                  className="text-gray-600 hover:text-primary transition-colors duration-200 font-medium"
                >
                  Privacy Policy
                </a>
              </div>
              <div className="text-center md:text-right">
                <span className="text-gray-500 text-sm font-medium">
                  &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Search Popup Dialog - Outside main layout for proper z-index */}
      {showSearchPopup && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-start justify-center pt-16 px-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="p-3 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for anything... (press ESC to close)"
                  value={searchQuery}
                  onChange={(e) => console.log('[DEBUG] setSearchQuery called');
                        setSearchQuery(e.target.value)}
                  className="w-full py-2 pl-10 pr-4 outline-none text-base"
                  autoFocus
                />
                <button
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                  onClick={() => {
                    console.log('[DEBUG] setShowSearchPopup(false)');
                    setShowSearchPopup(false);
                    setSearchQuery('');
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Search Results in Dialog */}
            <div className="max-h-[calc(80vh-10rem)] overflow-y-auto">
              {searchQuery.trim() !== "" && (
                <div className="w-full divide-y divide-gray-100">
                  {isSearching ? (
                    <div className="py-6 text-center">
                      <div className="animate-spin h-5 w-5 text-primary mx-auto border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent rounded-full" />
                      <p className="mt-2 text-sm text-gray-500">Searching...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center">
                      <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                        <Search className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-gray-700 font-medium">No results found</p>
                      <p className="text-sm text-gray-500 mt-1">Try different keywords or check spelling</p>
                    </div>
                  ) : (
                    <div>
                      {/* Navigation Shortcuts */}
                      {searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Navigation
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").map((result, index) => (
                              <div
                                key={`nav-${result.id}`}
                                onClick={() => navigateToResult(result)}
                                className={`search-result-item flex items-center px-4 py-2 cursor-pointer rounded-sm ${activeResultIndex === index ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                                style={activeResultIndex === index ? { backgroundColor: brandColors.primary.lighter } : undefined}
                              >
                                <div className="mr-3 flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center"
                                 style={{ backgroundColor: brandColors.primary.lighter, color: brandColors.primary.full }}>
                                  {result.icon}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{result.name}</p>
                                  {result.description && (
                                    <p className="text-xs text-gray-500">{result.description}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Admin Shortcuts */}
                      {user?.role === "admin" && searchResults.filter(r => r.type === "user" && typeof r.id === "string").length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                            Admin
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            {searchResults.filter(r => r.type === "user" && typeof r.id === "string").map((result, index) => {
                              // Calculate overall index position in the combined results array
                              const overallIndex = searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").length + index;

                              return (
                                <div
                                  key={`admin-${result.id}`}
                                  onClick={() => navigateToResult(result)}
                                  className={`search-result-item flex items-center px-4 py-2 cursor-pointer rounded-sm ${activeResultIndex === overallIndex ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                                  style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary.lighter } : undefined}
                                >
                                  <div className="mr-3 flex-shrink-0 h-8 w-8 rounded-md flex items-center justify-center"
                                   style={{ backgroundColor: brandColors.primary.lighter, color: brandColors.primary.full }}>
                                    {result.icon}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{result.name}</p>
                                    {result.description && (
                                      <p className="text-xs text-gray-500">{result.description}</p>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tickets Results */}
                      {searchResults.filter(r => r.type === "ticket" && typeof r.id === "number").length > 0 && (
                        <div className="py-2">
                          <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center">
                            <Ticket className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                            Support Tickets
                          </div>
                          {searchResults.filter(r => r.type === "ticket" && typeof r.id === "number").map((result, index) => {
                            // Calculate overall index position in the combined results array
                            const navItems = searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").length;
                            const adminItems = searchResults.filter(r => r.type === "user" && typeof r.id === "string").length;
                            const overallIndex = navItems + adminItems + index;

                            return (
                              <div
                                key={`ticket-${result.id}`}
                                onClick={() => navigateToResult(result)}
                                className={`search-result-item flex items-center px-4 py-2 cursor-pointer ${activeResultIndex === overallIndex ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                                style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary.lighter } : undefined}
                              >
                                <div className="mr-3 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
                                 style={{ backgroundColor: brandColors.primary.lighter, color: brandColors.primary.full }}>
                                  <Ticket className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                                  {result.description && (
                                    <p className="text-xs text-gray-500 truncate">{result.description}</p>
                                  )}
                                </div>
                                {/* Action buttons for tickets */}
                                <div className="flex space-x-2 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      window.open(`/api/tickets/${result.id}/download`, '_blank');
                                    }}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Footer with keyboard tips */}
                      <div className="py-2 px-4 text-xs text-gray-500 border-t border-gray-100 bg-gray-50">
                        <div className="flex items-center justify-between">
                          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↑</kbd><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">↓</kbd> to navigate</span>
                          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">Enter</kbd> to select</span>
                          <span>Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-200 rounded font-mono text-xs">Esc</kbd> to dismiss</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


    </div>
  );
}

// Export component both as named and default export
export const DashboardLayout = DashboardLayoutComponent;
export default DashboardLayoutComponent;
