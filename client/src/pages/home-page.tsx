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
  Zap,
  Globe
} from "lucide-react";

// Define branding data type with new color system
interface BrandingData {
  company_name: string;
  company_color?: string; // Legacy - kept for backward compatibility
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  custom_credits_name?: string;
  custom_credits_symbol?: string;
}

// Define types for the balance data
interface BalanceData {
  credits: number;
  virtFusionCredits: number | null;
  virtFusionTokens: number | null;
  customCredits: number;
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
  });

  // Fetch user servers
  const { data: serversResponse } = useQuery<{ data: any[], pagination: any }>({
    queryKey: ["/api/user/servers"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const servers = serversResponse?.data || [];

  // Fetch DNS domains
  const { data: dnsDomainsResponse } = useQuery<{ domains: any[] }>({
    queryKey: ["/api/dns/domains"],
    staleTime: 30 * 1000, // 30 seconds
  });

  const dnsDomains = dnsDomainsResponse?.domains || [];

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

    if (dnsDomains) {
      setStats(prevStats => ({
        ...prevStats,
        dnsDomains: dnsDomains.length,
      }));
    }

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
  }, [tickets, servers, dnsDomains, balanceData, usageData, user]);

  // Always prioritize VirtFusion balance for display - including negative balances
  const hasVirtFusion = stats.virtFusionTokens !== 0 || stats.virtFusionCredits !== 0; // Show VirtFusion data for any non-zero amount
  const displayCredits = stats.virtFusionCredits ?? 0; // Show actual balance including negatives, fallback to 0 only if undefined/null

  return (
    <DashboardLayout>
      {/* Dashboard Content */}
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Modern Hero Header */}
          <div className="rounded-2xl bg-white border border-gray-300/60 shadow-md">
            <div className="p-8 md:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                      style={{ backgroundColor: brandColors.primary.lighter }}
                    >
                      <div
                        className="text-xl font-bold"
                        style={{ color: brandColors.primary.full }}
                      >
                        {user?.fullName?.charAt(0) || 'U'}
                      </div>
                    </div>
                    <div>
                      <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                        Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
                      </h1>
                      <p className="text-gray-600 mt-1 text-lg">
                        Here's what's happening with your account today
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-6 lg:mt-0 flex flex-wrap gap-3">
                  <VirtFusionSsoButton />
                  <Link href="/packages">
                    <Button
                      variant="outline"
                      className="bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-primary hover:text-primary-foreground hover:shadow-md transition-all duration-200"
                    >
                      Browse Packages
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* VirtFusion Credits Card */}
            <Link href="/billing" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-blue-50/30 border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-blue-300/60 group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.primary.full}, ${brandColors.primary.lighter})`,
                      }}
                    >
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      VirtFusion Balance
                    </p>
                    <h3 className={`text-2xl font-bold ${displayCredits < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ${displayCredits.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </h3>
                    {hasVirtFusion && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                        {stats.virtFusionTokens >= 0
                          ? `${stats.virtFusionTokens.toLocaleString()} tokens available`
                          : `${Math.abs(stats.virtFusionTokens).toLocaleString()} tokens overdrawn`
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Link>

            {/* Custom Credits Card */}
            <Link href="/billing" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-green-50/30 border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-green-300/60 group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-green-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.secondary.full}, ${brandColors.secondary.lighter})`,
                      }}
                    >
                      <Coins className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      {brandingData?.custom_credits_name || 'Custom Credits'}
                    </p>
                    <h3 className={`text-2xl font-bold ${(balanceData?.customCredits || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ${(balanceData?.customCredits || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      Available for DNS & other services
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* DNS Management Card */}
            <Link href="/dns" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-amber-50/30 border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-amber-300/60 group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-amber-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.accent.full}, ${brandColors.accent.lighter})`,
                      }}
                    >
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      DNS Domains
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stats.dnsDomains}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      Manage DNS records
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Support Tickets Card */}
            <Link href="/tickets" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-purple-50/30 border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-purple-300/60 group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-purple-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.secondary.full}, ${brandColors.secondary.lighter})`,
                      }}
                    >
                      <Ticket className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className={`w-2 h-2 rounded-full ${stats.openTickets > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      Support Tickets
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stats.openTickets}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      {stats.openTickets > 0 ? `${stats.openTickets} awaiting response` : 'All tickets resolved'}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Active Servers Card */}
            <Link href="/servers" className="group">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-indigo-50/30 border border-gray-200/60 shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:border-indigo-300/60 group-hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-100/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${brandColors.accent.full}, ${brandColors.accent.lighter})`,
                      }}
                    >
                      <Server className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className={`w-2 h-2 rounded-full ${stats.totalServers > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">
                      Active Servers
                    </p>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {stats.totalServers}
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <div className="w-1 h-1 rounded-full bg-gray-400"></div>
                      {stats.totalServers > 0
                        ? `${stats.totalServers} ${stats.totalServers === 1 ? 'server' : 'servers'} running`
                        : 'No servers deployed'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Quick Actions Card */}
            <div className="bg-white rounded-xl border border-gray-300/60 shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link href="/packages">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <Plus
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">New Server</span>
                    </div>
                  </Button>
                </Link>

                <Link href="/tickets">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <MessageSquare
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">Get Support</span>
                    </div>
                  </Button>
                </Link>

                <Link href="/billing">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <Coins
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">Add Funds</span>
                    </div>
                  </Button>
                </Link>

                <Link href="/live-chat">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <MessageSquare
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">Live Chat</span>
                    </div>
                  </Button>
                </Link>

                <Link href="/dns">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <Globe
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">DNS Management</span>
                    </div>
                  </Button>
                </Link>

                <Link href="/dashboard/blog">
                  <Button
                    variant="outline"
                    className="w-full justify-start h-auto p-4 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
                        style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                      >
                        <Activity
                          className="w-4 h-4 transition-colors duration-200"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        />
                      </div>
                      <span className="text-sm font-medium">Latest News</span>
                    </div>
                  </Button>
                </Link>
              </div>
            </div>

            {/* Account Overview Card */}
            <div className="bg-white rounded-xl border border-gray-300/60 shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})` }}
                    >
                      <Activity
                        className="w-4 h-4"
                        style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Account Status</span>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                  >
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `var(--brand-secondary-lighter, ${brandColors.secondary.lighter})` }}
                    >
                      <Zap
                        className="w-4 h-4"
                        style={{ color: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Services Running</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.totalServers}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                    >
                      <HelpCircle
                        className="w-4 h-4"
                        style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Open Tickets</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.openTickets}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
    </DashboardLayout>
  );
}
