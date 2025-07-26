import Cookies from "js-cookie";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Settings,
  Ticket,
  Mail,
  FileText,
  PenTool,
  Globe,
  List,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Home,
  DollarSign,
  FileCheck,
  Search,
  CreditCard,
  Receipt,
  Download,
  Server,
  MessageCircle,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ui/theme-toggle";
import { CacheClearButton } from "@/components/ui/cache-clear-button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getBrandColors } from "@/lib/brand-theme";

const adminMenuItems = [
  { href: "/admin", icon: Home, label: "Admin Dashboard" },
  { href: "/admin/tickets", icon: Ticket, label: "Tickets" },
  { href: "/admin/chat", icon: MessageCircle, label: "Live Chat" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/billing", icon: DollarSign, label: "Billing" },
  { href: "/admin/servers", icon: Server, label: "Servers" },
  { href: "/admin/user-awards", icon: Gift, label: "User Awards" },
  { href: "/admin/coupon", icon: Ticket, label: "Coupon Management" },
  // { href: "/admin/dns", icon: Globe, label: "DNS Management" }, // DNS disabled
  { href: "/admin/mail", icon: Mail, label: "Email Logs" },
  { href: "/admin/blog", icon: PenTool, label: "Company Blog" },
  { href: "/admin/docs", icon: FileText, label: "Documentation" },
  { href: "/admin/api-docs", icon: FileText, label: "API Documentation" },
  { href: "/admin/datacenter-locations", icon: Globe, label: "Datacenter Locations" },
  { href: "/admin/plan-features", icon: List, label: "Plan Features" },
  { href: "/admin/package-pricing", icon: DollarSign, label: "Package Pricing" },
  { href: "/admin/faq-management", icon: HelpCircle, label: "FAQ Management" },
  { href: "/admin/legal", icon: FileCheck, label: "Legal Content" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Define search result types
interface SearchResult {
  id: number | string;
  type: "user" | "ticket" | "billing" | "setting" | "server";
  name: string;
  description?: string;
  url: string;
  icon?: React.ReactNode;
}

// Define user types for search
interface UserType {
  id: number;
  fullName: string;
  email: string;
  username: string;
  deletedAt?: string | null;
}

// Define ticket types for search
interface TicketType {
  id: number;
  userId: number;
  subject: string;
  status: string;
  deletedAt?: string | null;
}

// Define transaction types for search
interface TransactionType {
  id: number;
  userId: number;
  type: string;
  description: string;
  amount: number;
  status: string;
  paymentId?: string;
}

// Define server types for search
interface ServerType {
  id: number;
  name: string;
  uuid: string;
  owner: number | { id: number; username?: string };
  hypervisorId?: number;
  status?: string;
  state?: string;
  suspended?: boolean;
  protected?: boolean;
  updated?: string;
  created?: string;
  powerStatus?: { powerState: string };
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const cookie = Cookies.get("sidebar-collapsed");
    return cookie === "true";
  });

  useEffect(() => {
    Cookies.set("sidebar-collapsed", isSidebarCollapsed.toString(), { expires: 365 });
  }, [isSidebarCollapsed]);
  const { logoutMutation, user } = useAuth();

  // Search-related state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeResultIndex, setActiveResultIndex] = useState(-1);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  // Get the brand settings for customization
  const { data: brandSettings } = useQuery<{
    company_name?: string;
    company_color?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
  }>({
    queryKey: ["/api/settings/branding"],
    retry: false,
  });

  // Fetch users for search
  const { data: usersData = [] } = useQuery<UserType[]>({
    queryKey: ["/api/admin/users"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch tickets for search
  const { data: ticketsResponse } = useQuery<{ data: TicketType[], pagination: any }>({
    queryKey: ["/api/admin/tickets"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch transactions for search
  const { data: transactionsData = [] } = useQuery<TransactionType[]>({
    queryKey: ["/api/admin/transactions"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Invoice functionality has been removed

  // Fetch servers for search
  const { data: serversResponse = { data: [] } } = useQuery<{
    data: ServerType[];
    current_page: number;
    last_page: number;
    total: number;
  }>({
    queryKey: ["/api/admin/servers"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Extract the servers array from the paginated response
  const serversData = serversResponse.data || [];

  // Function to handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get company name from brand settings
  const companyName = brandSettings?.company_name || "Admin Portal";

  // Get brand colors using the utility with the new color system
  const brandColorOptions = useMemo(() => ({
    primaryColor: brandSettings?.primary_color || brandSettings?.company_color,  // Fallback to company_color for backward compatibility
    secondaryColor: brandSettings?.secondary_color,
    accentColor: brandSettings?.accent_color
  }), [brandSettings?.primary_color, brandSettings?.company_color, brandSettings?.secondary_color, brandSettings?.accent_color]);

  const brandColors = useMemo(() => getBrandColors(brandColorOptions), [brandColorOptions]);

  // Apply brand colors to CSS variables and Shadcn theme when settings are loaded
  useEffect(() => {
    if (brandSettings) {
      // Force immediate cache invalidation with timestamp
      const cacheKey = Date.now();

      import('@/lib/brand-theme').then(({ applyBrandColorVars }) => {
        // Clear only brand-related CSS variables, NOT theme variables
        const root = document.documentElement;
        const cssVarProps = Array.from(root.style);
        cssVarProps.forEach(prop => {
          // Only remove brand-specific variables, preserve theme variables
          if (prop.startsWith('--brand-') || prop.startsWith('--btn-')) {
            root.style.removeProperty(prop);
          }
        });

        // Apply brand colors to both our CSS variables and Shadcn theme variables
        applyBrandColorVars(brandColorOptions);

        // Add a cache buster class to force stylesheet recalculation
        document.body.classList.add(`theme-refresh-${cacheKey}`);
        setTimeout(() => {
          document.body.classList.remove(`theme-refresh-${cacheKey}`);
        }, 50);
      }).catch(error => {
        console.error("Failed to apply brand colors:", error);
      });
    }
  }, [brandColorOptions, brandSettings?.primary_color, brandSettings?.company_color]);

  // Close the mobile menu when a navigation item is selected
  useEffect(() => {
    setOpen(false);
  }, [location]);

  // Set up navigate for wouter - use a stable reference with real navigation
  const [, nativeNavigate] = useLocation();
  const navigate = useRef((url: string) => {
    if (url.startsWith("/admin/tickets/") && url !== "/admin/tickets") {
      // Force page to reload for ticket detail pages to ensure proper rendering
      window.location.href = url;
      return;
    }
    nativeNavigate(url);
  }).current;

  // Handle navigation to search result - memoized to avoid recreation
  const navigateToResult = useRef((result: SearchResult) => {
    setSearchQuery(''); // Clear search after selecting a result
    setShowSearchPopup(false);
    navigate(result.url);
  }).current;

  // Perform search with the current query
  const performSearch = useCallback((query: string) => {
    if (!query || (query.length < 2 && isNaN(parseInt(query)))) {
      // Allow single character searches if it's a number (for ticket IDs)
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    // Search users
    usersData?.forEach((user) => {
      if (
        !user.deletedAt &&
        (user.fullName?.toLowerCase().includes(lowerQuery) ||
          user.username?.toLowerCase().includes(lowerQuery) ||
          user.email?.toLowerCase().includes(lowerQuery))
      ) {
        results.push({
          id: user.id,
          type: "user",
          name: user.fullName || user.username,
          description: user.email,
          url: `/admin/users/${user.id}`,
          icon: <Users className="h-4 w-4" />,
        });
      }
    });

    // Search tickets
    ticketsResponse?.data?.forEach((ticket) => {
      if (
        !ticket.deletedAt &&
        (
          ticket.id.toString() === lowerQuery || // Exact match for ticket ID
          ticket.subject?.toLowerCase().includes(lowerQuery)
        )
      ) {
        // Route to /tickets/{id} if admin is the ticket creator, otherwise to /admin/tickets/{id}
        const ticketUrl = ticket.userId === user?.id
          ? `/tickets/${ticket.id}`
          : `/admin/tickets/${ticket.id}`;

        results.push({
          id: ticket.id,
          type: "ticket",
          name: `Ticket #${ticket.id}`,
          description: ticket.subject,
          url: ticketUrl,
          icon: <Ticket className="h-4 w-4" />,
        });
      }
    });

    // Search transactions - Enhanced to support transaction ID searching
    transactionsData?.forEach((transaction) => {
      if (
        transaction.id.toString() === lowerQuery || // Exact match for transaction ID
        transaction.description?.toLowerCase().includes(lowerQuery) ||
        transaction.type?.toLowerCase().includes(lowerQuery) ||
        transaction.paymentId?.toLowerCase().includes(lowerQuery)
      ) {
        results.push({
          id: transaction.id,
          type: "billing",
          name: `Transaction #${transaction.id}`,
          description: `${transaction.description} - $${transaction.amount}`,
          url: `/admin/billing/transactions/${transaction.id}`,
          icon: <CreditCard className="h-4 w-4" />,
        });
      }
    });

    // Search invoices functionality removed as invoices are no longer supported

    // Search servers
    serversData?.forEach((server) => {
      // Check if this server matches the search query
      const nameMatch = server.name?.toLowerCase().includes(lowerQuery);
      const uuidMatch = server.uuid?.toLowerCase().includes(lowerQuery);
      const idMatch = server.id.toString() === lowerQuery;

      if (nameMatch || uuidMatch || idMatch) {
        // Determine server status for display
        let statusText = "Unknown";

        // First check power status if available
        if (server.powerStatus && server.powerStatus.powerState) {
          statusText = server.powerStatus.powerState === "RUNNING" ? "Running" :
            server.powerStatus.powerState === "STOPPED" ? "Stopped" :
              server.powerStatus.powerState;
        }
        // Fall back to server.state or status
        else if (server.state) {
          statusText = server.state;
        } else if (server.status) {
          statusText = server.status;
        }

        // Format owner information if available
        let ownerDisplay = "";
        if (typeof server.owner === 'object' && server.owner) {
          ownerDisplay = server.owner.username ? ` • Owner: ${server.owner.username}` : "";
        }

        // Create search result object and add to results
        const serverResult: SearchResult = {
          id: server.id,
          type: "server", // Now we're explicitly typing this
          name: server.name || `Server #${server.id}`,
          description: `Status: ${statusText}${ownerDisplay} • UUID: ${server.uuid || 'Unknown'}`,
          url: `/admin/servers/${server.id}`,
          icon: <Server className="h-4 w-4" />,
        };

        results.push(serverResult);
      }
    });

    setSearchResults(results);
    setIsSearching(false);
    if (results.length > 0) {
      setActiveResultIndex(0);
    }
  }, [usersData, ticketsResponse, transactionsData, serversData, user]);

  // Handle search query debounce
  useEffect(() => {
    if (searchQuery.length > 1 || (searchQuery.length === 1 && !isNaN(parseInt(searchQuery)))) {
      // Add a delay before searching to avoid excessive searches while typing
      const delaySearch = setTimeout(() => {
        performSearch(searchQuery);
      }, 300);

      return () => clearTimeout(delaySearch);
    } else if (searchQuery === '') {
      // Immediately clear results when query is cleared
      setSearchResults([]);
    }
  }, [searchQuery, performSearch]);

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

      // Handle popup navigation with arrow keys
      if (showSearchPopup && searchResults.length > 0) {
        // Arrow down
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveResultIndex((prevIndex) => {
            const nextIndex = prevIndex + 1 >= searchResults.length ? 0 : prevIndex + 1;
            return nextIndex;
          });
        }

        // Arrow up
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveResultIndex((prevIndex) => {
            const nextIndex = prevIndex - 1 < 0 ? searchResults.length - 1 : prevIndex - 1;
            return nextIndex;
          });
        }

        // Enter to select
        if (e.key === "Enter" && activeResultIndex >= 0) {
          e.preventDefault();
          const selectedResult = searchResults[activeResultIndex];
          if (selectedResult) {
            navigateToResult(selectedResult);
          }
        }

        // Escape to close
        if (e.key === "Escape") {
          e.preventDefault();
          setShowSearchPopup(false);
          setSearchQuery('');
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchResults, activeResultIndex, showSearchPopup, navigateToResult]);

  return (
    <div className={cn("grid min-h-screen w-full overflow-hidden", isSidebarCollapsed ? "lg:grid-cols-[80px_1fr]" : "lg:grid-cols-[280px_1fr]")}>
      {/* Sidebar for larger screens */}
      <div className="hidden border-r bg-background lg:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-16 items-center border-b px-6">
            <Link
              className="flex items-center gap-2 font-semibold"
              href="/admin"
            >
              <span
                className="w-6 h-6 text-white flex items-center justify-center font-bold rounded"
                style={{ backgroundColor: brandColors.primary.full }}
              >
                A
              </span>
              {!isSidebarCollapsed && <span className={cn("font-bold")}>{companyName} Admin</span>}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-8 w-8"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 py-2 overflow-y-auto">
            <nav className="grid items-start px-2 text-sm font-medium space-y-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "justify-start font-medium rounded-lg group hover:text-white hover:bg-[var(--primary-color)]",
                        isSidebarCollapsed && "w-full justify-center"
                      )}
                      style={{
                        color: brandColors.primary.full,
                        '--primary-color': brandColors.primary.full
                      } as React.CSSProperties}
                      onClick={() => { window.location.href = '/dashboard'; }}
                    >
                      <Home className={cn("h-4 w-4 group-hover:!text-white", !isSidebarCollapsed && "mr-2")}
                        style={{ color: brandColors.primary.full }} />
                      <span className={cn("group-hover:!text-white", isSidebarCollapsed && "sr-only")}>Return to Dashboard</span>
                    </Button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side="right">
                      Return to Dashboard
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>

              <Separator className="my-2" />

              {adminMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;

                return (
                  <TooltipProvider key={item.href}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "justify-start font-medium rounded-lg",
                            !isActive && "hover:bg-opacity-80 hover:text-opacity-100",
                            isSidebarCollapsed && "w-full justify-center"
                          )}
                          style={{
                            ...(isActive
                              ? {
                                backgroundColor: brandColors.primary?.lighter,
                                color: brandColors.primary?.full
                              }
                              : {}),
                            "--hover-bg": brandColors.primary?.full,
                            "--hover-color": "white"
                          } as React.CSSProperties}
                          asChild
                        >
                          <Link href={item.href} className={!isActive ? "group w-full" : "w-full"}>
                            <Icon className={cn(
                              "h-4 w-4",
                              !isSidebarCollapsed && "mr-2",
                              !isActive && "group-hover:text-[var(--hover-color)]"
                            )}
                              style={isActive ? { color: brandColors.primary?.full } : undefined} />
                            <span className={cn(
                              !isActive ? "group-hover:text-[var(--hover-color)]" : "",
                              isSidebarCollapsed && "sr-only"
                            )}>
                              {item.label}
                            </span>
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      {isSidebarCollapsed && (
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                );
              })}

              <Separator className="my-2" />

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "justify-start font-medium rounded-lg text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30",
                        isSidebarCollapsed && "w-full justify-center"
                      )}
                      onClick={handleLogout}
                    >
                      <LogOut className={cn("h-4 w-4", !isSidebarCollapsed && "mr-2")} />
                      <span className={cn(isSidebarCollapsed && "sr-only")}>Logout</span>
                    </Button>
                  </TooltipTrigger>
                  {isSidebarCollapsed && (
                    <TooltipContent side="right">
                      Logout
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="flex h-16 items-center gap-2 border-b bg-background px-4 lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 lg:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0">
            <div className="flex items-center border-b px-6 h-16">
              <Link
                className="flex items-center gap-2 font-semibold"
                href="/admin"
              >
                <span
                  className="w-6 h-6 text-white flex items-center justify-center font-bold rounded"
                  style={{ backgroundColor: brandColors.primary.full }}
                >
                  A
                </span>
                <span className={cn("font-bold", isSidebarCollapsed && "sr-only")}>{companyName} Admin</span>
              </Link>
            </div>
            <div className="flex-1 py-2 overflow-y-auto">
              <nav className="grid items-start px-2 text-sm font-medium space-y-1">
                <Button
                  variant="ghost"
                  className="justify-start font-medium rounded-lg w-full group hover:text-white hover:bg-[var(--primary-color)]"
                  style={{
                    color: brandColors.primary.full,
                    '--primary-color': brandColors.primary.full
                  } as React.CSSProperties}
                  asChild
                >
                  <Link href="/dashboard" className="flex items-center w-full">
                    <Home className="mr-2 h-4 w-4 group-hover:!text-white" style={{ color: brandColors.primary.full }} />
                    <span className="group-hover:!text-white">Return to Dashboard</span>
                  </Link>
                </Button>

                <Separator className="my-2" />

                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href;

                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "secondary" : "ghost"}
                      className={cn(
                        "justify-start font-medium rounded-lg",
                        !isActive && "hover:bg-opacity-80 hover:text-opacity-100"
                      )}
                      style={{
                        ...(isActive
                          ? {
                            backgroundColor: brandColors.primary?.lighter,
                            color: brandColors.primary?.full
                          }
                          : {}),
                        "--hover-bg": brandColors.primary?.full,
                        "--hover-color": "white"
                      } as React.CSSProperties}
                      asChild
                    >
                      <Link href={item.href} className={!isActive ? "hover:text-[var(--hover-color)] group" : ""}>
                        <Icon className={cn(
                          "mr-2 h-4 w-4",
                          !isActive && "group-hover:text-[var(--hover-color)]"
                        )}
                          style={isActive ? { color: brandColors.primary?.full } : undefined} />
                        {item.label}
                      </Link>
                    </Button>
                  );
                })}

                <Separator className="my-2" />

                <Button
                  variant="ghost"
                  className="justify-start font-medium rounded-lg text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </nav>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex items-center">
          <Link
            href="/admin"
            className="ml-2 flex items-center gap-2 font-semibold"
          >
            <span
              className="w-6 h-6 text-white flex items-center justify-center font-bold rounded"
              style={{ backgroundColor: brandColors.primary.full }}
            >
              A
            </span>
            <span className="font-bold">{companyName} Admin</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col">
        {/* Header with Search */}
        <header className="bg-background border-b border-border shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            {isSidebarCollapsed && (
              <div className="flex items-center">
                <Link
                  href="/admin"
                  className="ml-2 flex items-center gap-2 font-semibold"
                >
                  <span className="font-bold">{companyName} Admin</span>
                </Link>
              </div>
            )}
            {/* Mobile logo - already shown in sidebar toggle */}
            <div className="flex-1 hidden lg:block" />

            {/* Enhanced Navbar Search with Keyboard Shortcut Indicator */}
            <div className="flex-1 flex max-w-2xl mx-4 relative z-10">
              <div className="relative w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for anything... (press Ctrl+K or ⌘K)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // Directly trigger search if query is empty to clear results
                    if (!e.target.value) {
                      setSearchResults([]);
                    }
                  }}
                  onFocus={() => setShowSearchPopup(true)}
                  className="h-10 w-full pl-10 pr-20 py-2 border border-input bg-background text-foreground rounded-md text-sm focus:ring-2 focus:ring-ring focus:border-ring"
                  style={{ "--ring-color": brandColors.primary?.medium } as React.CSSProperties}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs">
                  <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                    ⌘K
                  </kbd>
                </div>
              </div>
            </div>

            {/* User Actions */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <CacheClearButton />
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Search Popup Dialog */}
        {showSearchPopup && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-start justify-center pt-16 px-4">
            <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-2xl overflow-hidden">
              {/* Search Input in Dialog */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for anything..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // Directly trigger search if query is empty to clear results
                      if (!e.target.value) {
                        setSearchResults([]);
                      } else if (e.target.value.length > 1) {
                        // Directly trigger search for immediate feedback
                        performSearch(e.target.value);
                      }
                    }}
                    className="h-10 w-full pl-10 pr-4 py-2 border border-input bg-background text-foreground rounded-md text-sm focus:ring-2 focus:outline-none focus:ring-ring"
                    style={{ "--ring-color": brandColors.primary?.medium } as React.CSSProperties}
                    autoFocus
                  />
                  <button
                    onClick={() => setShowSearchPopup(false)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Search Results */}
              <div className="p-2">
                {isSearching ? (
                  <div className="flex justify-center items-center p-4">
                    <div className="animate-spin h-5 w-5 border-2 border-muted rounded-full border-t-primary"
                      style={{ borderTopColor: brandColors.primary?.full }} />
                    <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                  </div>
                ) : (
                  <>
                    {searchQuery.length > 0 && searchResults.length === 0 ? (
                      <div className="text-center p-4 text-muted-foreground">
                        No results found for "{searchQuery}"
                      </div>
                    ) : (
                      <div ref={searchResultsRef} className="overflow-y-auto max-h-[60vh]">
                        {searchResults.length > 0 ? (
                          <div className="py-2">
                            {/* User Results */}
                            {searchResults.filter(result => result.type === "user").length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
                                  Users
                                </h3>
                                <div className="space-y-1">
                                  {searchResults
                                    .filter(result => result.type === "user")
                                    .map((result) => {
                                      const overallIndex = searchResults.findIndex(r => r.id === result.id && r.type === result.type);
                                      return (
                                        <button
                                          key={`${result.type}-${result.id}`}
                                          className="flex items-center px-3 py-2 w-full text-left rounded-md hover:bg-muted focus:outline-none text-foreground"
                                          onClick={() => {
                                            navigateToResult(result);
                                          }}
                                          onMouseEnter={() => {
                                            setActiveResultIndex(overallIndex);
                                          }}
                                          style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary?.lighter } : undefined}
                                        >
                                          <div className="flex-shrink-0 mr-2">
                                            {result.icon}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{result.name}</div>
                                            {result.description && (
                                              <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Ticket Results */}
                            {searchResults.filter(result => result.type === "ticket").length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
                                  Tickets
                                </h3>
                                <div className="space-y-1">
                                  {searchResults
                                    .filter(result => result.type === "ticket")
                                    .map((result) => {
                                      const overallIndex = searchResults.findIndex(r => r.id === result.id && r.type === result.type);
                                      return (
                                        <button
                                          key={`${result.type}-${result.id}`}
                                          className="flex items-center px-3 py-2 w-full text-left rounded-md hover:bg-muted focus:outline-none text-foreground"
                                          onClick={() => {
                                            navigateToResult(result);
                                          }}
                                          onMouseEnter={() => {
                                            setActiveResultIndex(overallIndex);
                                          }}
                                          style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary?.lighter } : undefined}
                                        >
                                          <div className="flex-shrink-0 mr-2">
                                            {result.icon}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{result.name}</div>
                                            {result.description && (
                                              <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Billing Results */}
                            {searchResults.filter(result => result.type === "billing").length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
                                  Billing
                                </h3>
                                <div className="space-y-1">
                                  {searchResults
                                    .filter(result => result.type === "billing")
                                    .map((result) => {
                                      const overallIndex = searchResults.findIndex(r => r.id === result.id && r.type === result.type);
                                      return (
                                        <button
                                          key={`${result.type}-${result.id}`}
                                          className="flex items-center px-3 py-2 w-full text-left rounded-md hover:bg-muted focus:outline-none text-foreground"
                                          onClick={() => {
                                            navigateToResult(result);
                                          }}
                                          onMouseEnter={() => {
                                            setActiveResultIndex(overallIndex);
                                          }}
                                          style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary?.lighter } : undefined}
                                        >
                                          <div className="flex-shrink-0 mr-2">
                                            {result.icon}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{result.name}</div>
                                            {result.description && (
                                              <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Server Results */}
                            {searchResults.filter(result => result.type === "server").length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase px-3 mb-2">
                                  Servers
                                </h3>
                                <div className="space-y-1">
                                  {searchResults
                                    .filter(result => result.type === "server")
                                    .map((result) => {
                                      const overallIndex = searchResults.findIndex(r => r.id === result.id && r.type === result.type);
                                      return (
                                        <button
                                          key={`${result.type}-${result.id}`}
                                          className="flex items-center px-3 py-2 w-full text-left rounded-md hover:bg-muted focus:outline-none text-foreground"
                                          onClick={() => {
                                            navigateToResult(result);
                                          }}
                                          onMouseEnter={() => {
                                            setActiveResultIndex(overallIndex);
                                          }}
                                          style={activeResultIndex === overallIndex ? { backgroundColor: brandColors.primary?.lighter } : undefined}
                                        >
                                          <div className="flex-shrink-0 mr-2">
                                            {result.icon}
                                          </div>
                                          <div className="flex-1 overflow-hidden">
                                            <div className="font-medium truncate">{result.name}</div>
                                            {result.description && (
                                              <div className="text-xs text-muted-foreground truncate">{result.description}</div>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Keyboard Navigation Instructions */}
                            <div className="px-3 pt-2 pb-3 text-xs text-muted-foreground flex items-center justify-between border-t border-border mt-2">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center">
                                  <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">↑</kbd>
                                  <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground ml-1">↓</kbd>
                                  <span className="ml-1">to navigate</span>
                                </div>
                                <div className="flex items-center">
                                  <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">Enter</kbd>
                                  <span className="ml-1">to select</span>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <kbd className="inline-flex items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs text-muted-foreground">Esc</kbd>
                                <span className="ml-1">to close</span>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-background">
          <div className="container mx-auto py-6 px-3 sm:px-4 md:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}