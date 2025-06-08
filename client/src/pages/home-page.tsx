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
  Globe,
  BarChart3
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

          {/* Account Overview Table */}
          <div className="rounded-2xl bg-white border border-gray-300/60 shadow-md">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: brandColors.primary.lighter }}
                >
                  <BarChart3
                    className="h-5 w-5"
                    style={{ color: brandColors.primary.full }}
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Account Overview</h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Service</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Current Value</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {/* VirtFusion Credits Row */}
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.primary.full}, ${brandColors.primary.lighter})`
                            }}
                          >
                            <DollarSign className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">VirtFusion Balance</p>
                            <p className="text-sm text-gray-500">VPS hosting credits</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${displayCredits < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${displayCredits.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          {hasVirtFusion && (
                            <p className="text-xs text-gray-500">
                              {stats.virtFusionTokens >= 0
                                ? `${stats.virtFusionTokens.toLocaleString()} tokens`
                                : `${Math.abs(stats.virtFusionTokens).toLocaleString()} tokens overdrawn`
                              }
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-sm text-gray-600">Active</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href="/billing">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>

                    {/* Custom Credits Row */}
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.secondary.full}, ${brandColors.secondary.lighter})`
                            }}
                          >
                            <Coins className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{brandingData?.custom_credits_name || 'Custom Credits'}</p>
                            <p className="text-sm text-gray-500">DNS & other services</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <p className={`text-lg font-semibold ${(balanceData?.customCredits || 0) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            ${(balanceData?.customCredits || 0).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </p>
                          <p className="text-xs text-gray-500">Available balance</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                          <span className="text-sm text-gray-600">Active</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href="/billing">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>

                    {/* DNS Domains Row */}
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.accent.full}, ${brandColors.accent.lighter})`
                            }}
                          >
                            <Globe className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">DNS Domains</p>
                            <p className="text-sm text-gray-500">Manage DNS records</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{stats.dnsDomains}</p>
                          <p className="text-xs text-gray-500">
                            {stats.dnsDomains === 1 ? 'domain' : 'domains'} configured
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>
                          <span className="text-sm text-gray-600">Active</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href="/dns">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>

                    {/* Support Tickets Row */}
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.secondary.full}, ${brandColors.secondary.lighter})`
                            }}
                          >
                            <Ticket className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Support Tickets</p>
                            <p className="text-sm text-gray-500">Get help & support</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{stats.openTickets}</p>
                          <p className="text-xs text-gray-500">
                            {stats.openTickets > 0 ? 'awaiting response' : 'all resolved'}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${stats.openTickets > 0 ? 'bg-red-400 animate-pulse' : 'bg-green-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {stats.openTickets > 0 ? 'Pending' : 'Good'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href="/tickets">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>

                    {/* Active Servers Row */}
                    <tr className="hover:bg-gray-50 transition-colors duration-200">
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                            style={{
                              background: `linear-gradient(135deg, ${brandColors.accent.full}, ${brandColors.accent.lighter})`
                            }}
                          >
                            <Server className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Active Servers</p>
                            <p className="text-sm text-gray-500">VPS hosting services</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-right">
                          <p className="text-lg font-semibold text-gray-900">{stats.totalServers}</p>
                          <p className="text-xs text-gray-500">
                            {stats.totalServers > 0
                              ? `${stats.totalServers === 1 ? 'server' : 'servers'} running`
                              : 'no servers deployed'
                            }
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${stats.totalServers > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className="text-sm text-gray-600">
                            {stats.totalServers > 0 ? 'Running' : 'None'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href="/servers">
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-primary hover:text-primary-foreground hover:border-primary"
                          >
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
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
