import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { BillingActivity } from "@/components/dashboard/BillingActivity";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";

import { getBrandColors } from "@/lib/brand-theme";
import { usePageLoading } from "@/components/loading/PageLoadingProvider";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import {
  DollarSign,
  Ticket,
  Coins,
  CreditCard,
  Loader,
  Server,
  Plus,
  MessageSquare,
  Settings,
  HelpCircle,
  Activity,
  Zap
} from "lucide-react";

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
  const [location, navigate] = useLocation();
  const [stats, setStats] = useState({
    creditBalance: user?.credits || 0,
    openTickets: 0,
    virtFusionTokens: 0,
    virtFusionCredits: 0,
    totalServers: 0
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

    if (balanceData) {
      setStats(prevStats => ({
        ...prevStats,
        creditBalance: balanceData.credits || 0,
        // Use VirtFusion data from the balance endpoint if available
        virtFusionCredits: balanceData.virtFusionCredits || 0,
        virtFusionTokens: balanceData.virtFusionTokens || 0
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

  // Always prioritize VirtFusion balance for display
  const hasVirtFusion = stats.virtFusionTokens > 0;
  const displayCredits = hasVirtFusion ? stats.virtFusionCredits : 0;

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <Link href="/billing" className="group">
              <div className="rounded-xl bg-white border border-gray-300/60 shadow-md hover:shadow-xl transition-all duration-300 group-hover:border-gray-400/60">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">
                        {hasVirtFusion ? "VirtFusion Balance" : "Credit Balance"}
                      </p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">
                        ${displayCredits.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </h3>
                      {hasVirtFusion && (
                        <div
                          className="flex items-center text-sm"
                          style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: `var(--brand-primary, ${brandColors.primary.full})` }}
                          />
                          {stats.virtFusionTokens.toLocaleString()} tokens available
                        </div>
                      )}
                    </div>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300"
                      style={{ backgroundColor: `var(--brand-primary-lighter, ${brandColors.primary.lighter})` }}
                    >
                      <DollarSign
                        className="w-7 h-7"
                        style={{ color: `var(--brand-primary, ${brandColors.primary.full})` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/tickets" className="group">
              <div className="rounded-xl bg-white border border-gray-300/60 shadow-md hover:shadow-xl transition-all duration-300 group-hover:border-gray-400/60">
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">Support Tickets</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">{stats.openTickets}</h3>
                      {stats.openTickets > 0 && (
                        <div
                          className="flex items-center text-sm"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: `var(--brand-accent, ${brandColors.accent.full})` }}
                          />
                          {stats.openTickets} awaiting response
                        </div>
                      )}
                    </div>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300"
                      style={{ backgroundColor: `var(--brand-secondary-lighter, ${brandColors.secondary.lighter})` }}
                    >
                      <Ticket
                        className="w-7 h-7"
                        style={{ color: `var(--brand-secondary, ${brandColors.secondary.full})` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/servers" className="group">
              <div className="rounded-xl bg-white border border-gray-300/60 shadow-md hover:shadow-xl transition-all duration-300 group-hover:border-gray-400/60">
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600 mb-2">Active Servers</p>
                      <h3 className="text-3xl font-bold text-gray-900 mb-3">{stats.totalServers}</h3>
                      {stats.totalServers > 0 && (
                        <div
                          className="flex items-center text-sm"
                          style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                        >
                          <div
                            className="w-2 h-2 rounded-full mr-2"
                            style={{ backgroundColor: `var(--brand-accent, ${brandColors.accent.full})` }}
                          />
                          {stats.totalServers} {stats.totalServers === 1 ? 'server' : 'servers'} running
                        </div>
                      )}
                    </div>
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow duration-300"
                      style={{ backgroundColor: `var(--brand-accent-lighter, ${brandColors.accent.lighter})` }}
                    >
                      <Server
                        className="w-7 h-7"
                        style={{ color: `var(--brand-accent, ${brandColors.accent.full})` }}
                      />
                    </div>
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

          {/* Enhanced Billing Activity Section */}
          <div className="bg-white rounded-xl border border-gray-300/60 shadow-md overflow-hidden">
            <BillingActivity />
          </div>
        </div>
    </DashboardLayout>
  );
}
