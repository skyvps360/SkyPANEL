import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";

import { getBrandColors } from "@/lib/brand-theme";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  DollarSign,
  Ticket,
  Coins,
  Server,
  Plus,
  MessageSquare,
  HelpCircle,
  Activity,
  Globe,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Helper function to generate category-aware server description
function generateServerDescription(servers: any[]): string {
  if (!servers || servers.length === 0) {
    return "no servers deployed";
  }

  // Group servers by category
  const categoryGroups: { [key: string]: number } = {};

  servers.forEach(server => {
    const categoryName = server.packageCategoryName || "Unknown";
    categoryGroups[categoryName] = (categoryGroups[categoryName] || 0) + 1;
  });

  const categories = Object.keys(categoryGroups);
  const totalServers = servers.length;

  // If all servers are from the same category
  if (categories.length === 1 && categories[0] !== "Unknown") {
    const categoryName = categories[0].toLowerCase();
    return `${totalServers} ${categoryName} ${totalServers === 1 ? 'server' : 'servers'} deployed`;
  }

  // If servers are from multiple known categories
  if (categories.length > 1 && !categories.includes("Unknown")) {
    if (categories.length === 2) {
      return `${totalServers} ${totalServers === 1 ? 'server' : 'servers'} deployed (${categories.join(', ')})`;
    } else {
      return `${totalServers} ${totalServers === 1 ? 'server' : 'servers'} deployed (mixed types)`;
    }
  }

  // Fallback for unknown categories or mixed known/unknown
  return `${totalServers} ${totalServers === 1 ? 'server' : 'servers'} deployed`;
}

// Define branding data type with new color system
interface BrandingData {
  company_name: string;
  company_color?: string; // Legacy - kept for backward compatibility
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;

}

// Define types for the balance data
interface BalanceData {
  credits: number;
  virtFusionCredits: number | null;
  virtFusionTokens: number | null;
}

export default function HomePage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    openTickets: 0,
    virtFusionTokens: 0,
    virtFusionCredits: 0,
    totalServers: 0,
    dnsDomains: 0
  });

  // The blog section is now handled by a separate route (/dashboard/blog)
  // so we don't need to check for URL parameters here

  // Fetch brand settings for consistent colors
  const { data: brandingData = {
    company_name: '',
    primary_color: '2563eb',
    secondary_color: '10b981',
    accent_color: 'f59e0b'
  } } = useQuery<BrandingData>({
    queryKey: ['/api/settings/branding'],
  });

  // Get brand colors using the new color system
  const brandColorOptions = {
    primaryColor: brandingData?.primary_color || brandingData?.company_color || '2563eb',
    secondaryColor: brandingData?.secondary_color || '10b981',
    accentColor: brandingData?.accent_color || 'f59e0b'
  };
  const brandColors = getBrandColors(brandColorOptions);

  // Fetch tickets
  const { data: ticketsResponse } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ["/api/tickets"],
  });

  const tickets = ticketsResponse?.data || [];

  // Fetch balance with updated type
  const { data: balanceData } = useQuery<BalanceData>({
    queryKey: ["/api/billing/balance"],
  });

  // Fetch VirtFusion usage data
  const { data: usageData } = useQuery<{ usage: number, rawData: any }>({
    queryKey: ["/api/billing/usage/last30days"],
    staleTime: 300000, // 5 minutes
    refetchOnWindowFocus: false, // Prevent refetch on window focus
    retry: 1, // Only retry once on failure
  });

  // Fetch user servers
  const { data: serversResponse } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ["/api/user/servers"],
    staleTime: 60 * 1000, // 60 seconds
    refetchOnWindowFocus: false, // Prevent refetch on window focus
  });

  const servers = serversResponse?.data || [];

  // Fetch DNS domains - DISABLED: DNS functionality has been removed
  // const { data: dnsDomainsResponse } = useQuery<{ domains: any[] }>({
  //   queryKey: ["/api/dns/domains"],
  //   staleTime: 60 * 1000, // 60 seconds
  //   refetchOnWindowFocus: false, // Prevent refetch on window focus
  // });

  const dnsDomains: any[] = []; // Empty array since DNS is disabled

  // Calculate stats
  useEffect(() => {
    if (tickets) {
      setStats(prevStats => ({
        ...prevStats,
        openTickets: tickets.filter(ticket => ticket.status !== "closed").length,
      }));
    }

    if (servers) {
      setStats(prevStats => ({
        ...prevStats,
        totalServers: servers.length,
      }));
    }

    // DNS domains stats removed since DNS functionality is disabled
    // if (dnsDomains) {
    //   setStats(prevStats => ({
    //     ...prevStats,
    //     dnsDomains: dnsDomains.length,
    //   }));
    // }

    if (balanceData) {
      setStats(prevStats => ({
        ...prevStats,
        // Use VirtFusion data from the balance endpoint if available
        virtFusionCredits: balanceData.virtFusionCredits ?? 0,
        virtFusionTokens: balanceData.virtFusionTokens ?? 0
      }));
    }

    // If we don't have VirtFusion data from balance endpoint but have it from usage endpoint
    if (!balanceData?.virtFusionTokens && usageData?.rawData?.data?.credit?.tokens) {
      const tokens = parseFloat(usageData.rawData.data.credit.tokens);
      setStats(prevStats => ({
        ...prevStats,
        virtFusionTokens: tokens,
        virtFusionCredits: tokens / 100 // Convert tokens to dollars (100 tokens = $1.00)
      }));
    }
  }, [tickets, servers, balanceData, usageData, user]);

  // Always prioritize VirtFusion balance for display - including negative balances
  const hasVirtFusion = stats.virtFusionTokens !== 0 || stats.virtFusionCredits !== 0; // Show VirtFusion data for any non-zero amount
  const displayCredits = stats.virtFusionCredits ?? 0; // Show actual balance including negatives, fallback to 0 only if undefined/null

  return (
    <DashboardLayout>
      {/* Dashboard Content */}
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Modern Hero Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-300/60 shadow-xl">
            <div className="p-6 md:p-10 flex flex-col lg:flex-row lg:items-center lg:justify-between relative z-10">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
                       style={{ backgroundColor: brandColors.primary.full, color: 'white' }}>
                    <span className="text-2xl font-bold">
                      {user?.fullName?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                      Welcome back, {user?.fullName?.split(' ')[0] || 'User'}!
                    </h1>
                    <p className="text-gray-600 mt-1 text-base md:text-lg">
                      Here's a quick overview of your account.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-6 lg:mt-0 flex flex-wrap gap-3 justify-center lg:justify-end">
                <VirtFusionSsoButton />
                <Link href="/packages">
                  <Button
                    size="default"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <Plus className="mr-2 h-4 w-4" /> New Server
                  </Button>
                </Link>
              </div>
            </div>
            {/* Abstract background shapes */}
            <div className="absolute top-0 left-0 w-full h-full z-0">
              <div className="absolute -top-10 -left-10 w-48 h-48 rounded-full opacity-10"
                   style={{ backgroundColor: brandColors.primary.full }}></div>
              <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-5"
                   style={{ backgroundColor: brandColors.secondary.full }}></div>
            </div>
          </div>

          {/* Account Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* VirtFusion Credits Card */}
            <Card className="shadow-xl border border-gray-300/60 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">VirtFusion Balance</h3>
                <DollarSign className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-extrabold mb-1">
                <span className={`${displayCredits < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  ${displayCredits.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </span>
              </div>
              {hasVirtFusion && (
                <p className="text-xs text-gray-500 mb-3">
                  {stats.virtFusionTokens >= 0
                    ? `${stats.virtFusionTokens.toLocaleString()} tokens`
                    : `${Math.abs(stats.virtFusionTokens).toLocaleString()} tokens overdrawn`
                  }
                </p>
              )}
              <Link href="/billing">
                <Button
                  variant="outline"
                  className="w-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                >
                  Manage Balance
                </Button>
              </Link>
            </Card>

            {/* Support Tickets Card */}
            <Card className="shadow-xl border border-gray-300/60 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Support Tickets</h3>
                <Ticket className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-extrabold mb-1 text-gray-900">
                {stats.openTickets}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {stats.openTickets > 0 ? 'awaiting response' : 'all resolved'}
              </p>
              <Link href="/tickets">
                <Button
                  variant="outline"
                  className="w-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                >
                  View Tickets
                </Button>
              </Link>
            </Card>

            {/* Active Servers Card */}
            <Card className="shadow-xl border border-gray-300/60 flex flex-col justify-between p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900">Active Servers</h3>
                <Server className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-extrabold mb-1 text-gray-900">
                {stats.totalServers}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {generateServerDescription(servers)}
              </p>
              <Link href="/servers">
                <Button
                  variant="outline"
                  className="w-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                >
                  View Servers
                </Button>
              </Link>
            </Card>
          </div>

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-xl border border-gray-300/60">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <Link href="/packages">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center text-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                    >
                      <Plus className="h-6 w-6 mb-1 text-primary group-hover:text-primary-foreground" />
                      <span className="text-sm font-medium">New Server</span>
                    </Button>
                  </Link>

                  <Link href="/tickets">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center text-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                    >
                      <MessageSquare className="h-6 w-6 mb-1 text-primary group-hover:text-primary-foreground" />
                      <span className="text-sm font-medium">Get Support</span>
                    </Button>
                  </Link>

                  <Link href="/billing">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center text-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                    >
                      <Coins className="h-6 w-6 mb-1 text-primary group-hover:text-primary-foreground" />
                      <span className="text-sm font-medium">Add Funds</span>
                    </Button>
                  </Link>

                  <Link href="/live-chat">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center text-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                    >
                      <MessageSquare className="h-6 w-6 mb-1 text-primary group-hover:text-primary-foreground" />
                      <span className="text-sm font-medium">Live Chat</span>
                    </Button>
                  </Link>

                  <Link href="/dashboard/blog">
                    <Button
                      variant="outline"
                      className="w-full h-20 flex flex-col items-center justify-center text-center hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                    >
                      <Activity className="h-6 w-6 mb-1 text-primary group-hover:text-primary-foreground" />
                      <span className="text-sm font-medium">Latest News</span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xl border border-gray-300/60">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900">Account Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-gray-700">Account Status</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">Active</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <Server className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-gray-700">Active Servers</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{stats.totalServers}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm">
                    <div className="flex items-center space-x-2">
                      <HelpCircle className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium text-gray-700">Open Tickets</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{stats.openTickets}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
    </DashboardLayout>
  );
}
