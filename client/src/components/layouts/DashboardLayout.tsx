import { ReactNode, useState, useRef, useEffect } from "react";
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
  Activity,
  Zap,
  MessageSquare,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { getBrandColors, getButtonStyles } from "@/lib/brand-theme";

type NavigationItem = {
  name: string;
  href: string;
  icon: ReactNode;
  adminOnly?: boolean;
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

interface InvoiceType {
  id: number;
  invoiceNumber: string;
  userId: number;
  amount: number;
  status: string;
  createdAt: string;
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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Fetch branding settings to get company name and brand colors
  const { data: brandingSettings } = useQuery<{
    company_name: string,
    company_color?: string,  // Keep for backward compatibility
    primary_color?: string,
    secondary_color?: string,
    accent_color?: string
  }>({
    queryKey: ["/api/settings/branding"],
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch public settings
  const { data: settings = {} } = useQuery<Record<string, string>>({
    queryKey: ["/api/settings/public"],
    enabled: !!user,
  });

  // Update company name when settings are loaded
  useEffect(() => {
    if (brandingSettings?.company_name) {
      setCompanyName(brandingSettings.company_name);
    } else if (settings?.company_name) {
      setCompanyName(settings.company_name);
    }
  }, [brandingSettings?.company_name, settings?.company_name]);

  // Get brand colors using the new color system with appropriate fallbacks
  const brandColors = getBrandColors({
    primaryColor: brandingSettings?.primary_color || brandingSettings?.company_color || '2563eb',  // Fallback to company_color for backward compatibility
    secondaryColor: brandingSettings?.secondary_color || '10b981',
    accentColor: brandingSettings?.accent_color || 'f59e0b'
  });

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

      console.log('Applied brand colors to Shadcn theme in Dashboard');
    });
  }, [
    brandingSettings?.primary_color,
    brandingSettings?.company_color,
    brandingSettings?.secondary_color,
    brandingSettings?.accent_color
  ]);

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

  // Fetch invoices for search - use admin endpoint for admins
  const { data: invoicesData = [] } = useQuery<InvoiceType[]>({
    queryKey: [user?.role === "admin" ? "/api/admin/invoices" : "/api/invoices"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch balance data including VirtFusion balance
  const { data: balanceData } = useQuery<{ credits: number, virtFusionCredits: number, virtFusionTokens: number }>({
    queryKey: ["/api/billing/balance"],
    staleTime: 30 * 1000, // 30 seconds
    enabled: !!user,
  });

  // Use API data without sample data fallbacks
  const users = usersData;
  const tickets = ticketsResponse?.data || [];
  const transactions = transactionsData;
  const invoices = invoicesData;

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
      icon: <Activity className="h-4 w-4" />
    },
    {
      id: "speed-test",
      name: "Speed Test",
      description: "Test your connection speed",
      url: "/speed-test",
      icon: <Zap className="h-4 w-4" />
    },
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

  // Main navigation items
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
    {
      name: "Billing",
      href: "/billing",
      icon: <CreditCard className="h-5 w-5 mr-3" />,
    },
    {
      name: "Packages",
      href: "/packages",
      icon: <HardDrive className="h-5 w-5 mr-3" />,
    },
    {
      name: "Support Tickets",
      href: "/tickets",
      icon: <Ticket className="h-5 w-5 mr-3" />,
    },
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

        // Admins can search ALL invoices
        invoices.forEach((invoice: InvoiceType) => {
          const invoiceNumber = (invoice.invoiceNumber || "").toLowerCase();
          const invoiceIdString = invoice.id.toString();
          const status = (invoice.status || "").toLowerCase();

          // Search by invoice number, ID, or status
          if (invoiceNumber.includes(cleanQuery) ||
              invoiceIdString === cleanQuery ||
              status.includes(cleanQuery) ||
              'invoice'.includes(cleanQuery)) {

            // For admin view, show which user the invoice belongs to
            const userName = users.find(u => u.id === invoice.userId)?.fullName || `User #${invoice.userId}`;

            const formattedDate = new Date(invoice.createdAt).toLocaleDateString();

            // Correctly link to invoice page
            const invoiceLink = `/billing/invoices/${invoice.id}`;

            results.push({
              id: invoice.id,
              type: "billing",
              name: `Invoice: ${invoice.invoiceNumber}`,
              description: `User: ${userName} | Amount: $${invoice.amount?.toFixed(2) || '0.00'} | Date: ${formattedDate} | Status: ${invoice.status || 'Unknown'}`,
              url: invoiceLink,
              icon: <Receipt className="h-4 w-4" />,
              actionButtons: [
                {
                  label: "View Invoice",
                  icon: <FileText className="h-4 w-4" />,
                  action: invoiceLink
                },
                {
                  label: "Download",
                  icon: <Download className="h-4 w-4" />,
                  action: `/api/invoices/${invoice.id}/download`
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

        // Regular users can only search their own invoices
        invoices.forEach((invoice: InvoiceType) => {
          if (invoice.userId !== user?.id) return;

          const invoiceNumber = (invoice.invoiceNumber || "").toLowerCase();
          const invoiceIdString = invoice.id.toString();
          const status = (invoice.status || "").toLowerCase();

          // Search by invoice number, ID, or status
          if (invoiceNumber.includes(cleanQuery) ||
              invoiceIdString === cleanQuery ||
              status.includes(cleanQuery) ||
              'invoice'.includes(cleanQuery)) {

            const formattedDate = new Date(invoice.createdAt).toLocaleDateString();

            // Correctly link to invoice page
            const invoiceLink = `/billing/invoices/${invoice.id}`;

            results.push({
              id: invoice.id,
              type: "billing",
              name: `Invoice: ${invoice.invoiceNumber}`,
              description: `Amount: $${invoice.amount?.toFixed(2) || '0.00'} | Date: ${formattedDate} | Status: ${invoice.status || 'Unknown'}`,
              url: invoiceLink,
              icon: <Receipt className="h-4 w-4" />,
              actionButtons: [
                {
                  label: "View Invoice",
                  icon: <FileText className="h-4 w-4" />,
                  action: invoiceLink
                },
                {
                  label: "Download",
                  icon: <Download className="h-4 w-4" />,
                  action: `/api/invoices/${invoice.id}/download`
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
          });
        }
      }

      // Reset index when results change
      setActiveResultIndex(-1);
      setSearchResults(results);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
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
    setShowSearchPopup(false);
    navigate(result.url);
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

  const getUserInitials = () => {
    if (!user?.fullName) return "U";
    return user.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex h-screen overflow-hidden text-textColor">
      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "text-white w-64 flex-shrink-0 flex flex-col z-30",
          mobileMenuOpen ? "fixed inset-y-0 left-0 block" : "hidden md:flex",
        )}
        style={{ backgroundColor: '#111827' }} /* Using dark bg for sidebar */
      >
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <Link href="/dashboard" className="flex items-center">
            <div
              className="flex items-center justify-center h-8 w-10 mr-2 rounded text-white font-bold text-lg"
              style={{ backgroundColor: brandColors.primary.full }}
            >
              {companyName?.charAt(0) || "S"}
            </div>
            <span className="text-xl font-semibold">{companyName}</span>
          </Link>

          {/* Close button for mobile */}
          <button
            className="md:hidden rounded-md p-1.5 text-gray-300 hover:bg-gray-700 focus:outline-none"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          {mainNavigation.map((item) => (
            <div key={item.href} className="mb-1">
              <Link
                href={item.href}
                className={cn(
                  "flex items-center px-4 py-3 rounded-md",
                  location === item.href
                    ? "text-white"
                    : "text-gray-300 hover:bg-gray-700",
                )}
                style={location === item.href ? { backgroundColor: brandColors.primary.full } : undefined}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            </div>
          ))}

          {/* VirtFusion Login Button - Visible to all users */}
          <div className="mt-6 mb-1">
            <div className="px-4 py-2 text-xs text-gray-400 uppercase tracking-wide">
              Control Panel
            </div>
            <div className="px-4">
              <VirtFusionSsoButton
                variant="outline"
                size="default"
                className="w-full justify-center text-white hover:opacity-90 bg-primary"
                text="Login to VirtFusion"
              />
            </div>
          </div>

          {/* Admin section removed - now available in user dropdown menu */}
        </nav>

        {/* Account Section */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center text-sm text-gray-300">
            <Avatar className="w-8 h-8 mr-3">
              <AvatarFallback style={{ backgroundColor: brandColors.primary.full }}>
                {getUserInitials()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <div className="font-medium">{user?.fullName || "User"}</div>
              <div className="text-xs text-gray-400 truncate">
                {user?.email || "user@example.com"}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle & Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation Bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile Menu Button */}
            <button
              className="md:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Enhanced Navbar Search with Keyboard Shortcut Indicator */}
            <div className="flex-1 flex max-w-2xl mx-4 relative z-10">
              <div className="relative w-full">
                {/* Modern Search Input */}
                <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search for anything... (press Ctrl+K or ⌘K)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchPopup(true)}
                  className="h-10 w-full pl-10 pr-20 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                  style={{ "--ring-color": brandColors.primary.medium } as React.CSSProperties}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs">
                  <kbd className="inline-flex items-center justify-center rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400">
                    ⌘K
                  </kbd>
                </div>
              </div>
              </div>
            </div>

            {/* Search Popup Dialog */}
            {showSearchPopup && (
              <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-16 px-4">
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
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full py-2 pl-10 pr-4 outline-none text-base"
                        autoFocus
                      />
                      <button
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                        onClick={() => {
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
                      <div ref={searchResultsRef} className="w-full divide-y divide-gray-100">
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

                            {/* Users Results (Admin Only) */}
                            {searchResults.filter(r => r.type === "user" && typeof r.id === "number").length > 0 && (
                              <div className="py-2">
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center">
                                  <Users className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                                  Users
                                </div>
                                {searchResults.filter(r => r.type === "user" && typeof r.id === "number").map((result, index) => {
                                  // Calculate overall index position in the combined results array
                                  const navItems = searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").length;
                                  const adminItems = searchResults.filter(r => r.type === "user" && typeof r.id === "string").length;
                                  const ticketItems = searchResults.filter(r => r.type === "ticket" && typeof r.id === "number").length;
                                  const overallIndex = navItems + adminItems + ticketItems + index;

                                  return (
                                    <div
                                      key={`user-${result.id}`}
                                      onClick={() => navigateToResult(result)}
                                      className={`search-result-item flex items-center px-4 py-2 cursor-pointer ${activeResultIndex === overallIndex ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                                      style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary.lighter } : undefined}
                                    >
                                      <div className="mr-3 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
                                       style={{ backgroundColor: brandColors.primary.lighter, color: brandColors.primary.full }}>
                                        <Users className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                                        {result.description && (
                                          <p className="text-xs text-gray-500 truncate">{result.description}</p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Billing & Transactions Results */}
                            {searchResults.filter(r => r.type === "billing").length > 0 && (
                              <div className="py-2">
                                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center">
                                  <CreditCard className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                                  Billing & Transactions
                                </div>
                                {searchResults.filter(r => r.type === "billing").map((result, index) => {
                                  // Calculate overall index position in the combined results array
                                  const navItems = searchResults.filter(r => r.type === "ticket" && typeof r.id === "string").length;
                                  const adminItems = searchResults.filter(r => r.type === "user" && typeof r.id === "string").length;
                                  const ticketItems = searchResults.filter(r => r.type === "ticket" && typeof r.id === "number").length;
                                  const userItems = searchResults.filter(r => r.type === "user" && typeof r.id === "number").length;
                                  const overallIndex = navItems + adminItems + ticketItems + userItems + index;

                                  // Check if it's a credit transaction (which should use invoice download)
                                  const isCreditTransaction = result.name.toLowerCase().includes('credit');

                                  // For other types of transactions
                                  const isTransaction = result.name.toLowerCase().includes('transaction') ||
                                                       result.name.toLowerCase().includes('debit');

                                  // For invoices
                                  const isInvoice = result.name.toLowerCase().includes('invoice') || isCreditTransaction;

                                  return (
                                    <div
                                      key={`billing-${result.id}`}
                                      onClick={() => navigateToResult(result)}
                                      className={`search-result-item flex items-center px-4 py-2 cursor-pointer ${activeResultIndex === overallIndex ? 'bg-brand/10' : 'hover:bg-gray-50'}`}
                                      style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary.lighter } : undefined}
                                    >
                                      <div className="mr-3 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center"
                                       style={{ backgroundColor: brandColors.primary.lighter, color: brandColors.primary.full }}>
                                        {isInvoice ? <Receipt className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
                                        {result.description && (
                                          <p className="text-xs text-gray-500 truncate">{result.description}</p>
                                        )}
                                      </div>

                                      {/* Add action buttons - only show direct download buttons if no action buttons exist */}
                                      {result.actionButtons && result.actionButtons.length > 0 ? (
                                        <div className="ml-2 flex space-x-1">
                                          {result.actionButtons.map((button, i) => (
                                            <Button
                                              key={`action-${i}`}
                                              size="sm"
                                              variant="ghost"
                                              className="text-gray-500 hover:text-gray-700"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                // If it's a download action, open in new tab
                                                if (button.action.includes('/download')) {
                                                  const url = button.action;
                                                  window.open(url, '_blank');
                                                } else {
                                                  // Otherwise navigate to the URL
                                                  navigate(button.action);
                                                }
                                              }}
                                            >
                                              {button.icon}
                                              <span className="sr-only">{button.label}</span>
                                            </Button>
                                          ))}
                                        </div>
                                      ) : (
                                        // Only show these fallback buttons if no action buttons exist
                                        <>
                                          {isTransaction && (
                                            <div className="ml-2">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-gray-500 hover:text-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const url = `/api/transactions/${result.id}/download`;
                                                  console.log("Direct transaction download URL:", url);
                                                  window.open(url, '_blank');
                                                }}
                                              >
                                                <Download className="h-4 w-4" />
                                                <span className="sr-only">Download</span>
                                              </Button>
                                            </div>
                                          )}

                                          {isInvoice && (
                                            <div className="ml-2">
                                              <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-gray-500 hover:text-gray-700"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const url = `/api/invoices/${result.id}/download`;
                                                  console.log("Direct invoice download URL:", url);
                                                  window.open(url, '_blank');
                                                }}
                                              >
                                                <Download className="h-4 w-4" />
                                                <span className="sr-only">Download</span>
                                              </Button>
                                            </div>
                                          )}
                                        </>
                                      )}

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

            {/* Right-side Actions */}
            <div className="flex items-center">
              {/* Credit Balance - Linked to Billing Page */}
              <Link
                href="/billing"
                className="hidden sm:flex items-center px-3 py-1.5 rounded-full mr-4 hover:bg-opacity-90 transition-colors"
                style={{ backgroundColor: brandColors.primary.lighter }}
                title="Go to Billing"
              >
                <Coins className="h-4 w-4 mr-2" style={{ color: brandColors.primary.full }} />
                <span className="text-sm font-medium">
                  ${balanceData?.virtFusionCredits ? balanceData.virtFusionCredits.toFixed(2) : (user?.credits?.toFixed(2) || "0.00")}
                </span>
              </Link>

              {/* Profile Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="ml-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback style={{ backgroundColor: brandColors.primary.full, color: 'white' }}>
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="profile-dropdown-content" style={{
                    '--brand-lighter': brandColors.primary.lighter,
                    '--brand-light': brandColors.primary.light,
                    '--color-brand': brandColors.primary.full
                  } as React.CSSProperties}>
                  {/* Custom CSS variables are applied to the dropdown */}
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/profile"
                      className="flex items-center dropdown-menu-link"
                      style={{ '--hover-color': brandColors.primary.full } as React.CSSProperties}
                    >
                      <Users className="h-4 w-4 mr-2" style={{ color: brandColors.primary.medium }} />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/billing"
                      className="flex items-center dropdown-menu-link"
                      style={{ '--hover-color': brandColors.primary.full } as React.CSSProperties}
                    >
                      <CreditCard className="h-4 w-4 mr-2" style={{ color: brandColors.primary.medium }} />
                      Billing
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/tickets"
                      className="flex items-center dropdown-menu-link"
                      style={{ '--hover-color': brandColors.primary.full } as React.CSSProperties}
                    >
                      <Ticket className="h-4 w-4 mr-2" style={{ color: brandColors.primary.medium }} />
                      Support Tickets
                    </Link>
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <DropdownMenuItem asChild>
                      <Link
                        href="/admin/settings"
                        className="flex items-center dropdown-menu-link"
                        style={{ '--hover-color': brandColors.primary.full } as React.CSSProperties}
                      >
                        <SettingsIcon className="h-4 w-4 mr-2" style={{ color: brandColors.primary.medium }} />
                        Admin
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-alert"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-background p-4 md:p-6">
          {children}
        </main>

        {/* Footer with SkyVPS360.xyz branding */}
        <footer className="bg-gray-50 border-t border-gray-200 py-4">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 text-sm mb-3 md:mb-0">
                <a href="/status" className="text-gray-600 hover:underline hover:text-brand">Status</a>
                <a href="/tos" className="text-gray-600 hover:underline hover:text-brand">Terms of Service</a>
                <a href="/privacy" className="text-gray-600 hover:underline hover:text-brand">Privacy Policy</a>
              </div>
              <div className="text-center md:text-right">
                <span className="text-gray-600 text-sm">© {new Date().getFullYear()} {companyName}</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Export component both as named and default export
export const DashboardLayout = DashboardLayoutComponent;
export default DashboardLayoutComponent;
