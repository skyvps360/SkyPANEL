import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { BillingActivity } from "@/components/dashboard/BillingActivity";
import { VirtFusionSsoButton } from "@/components/VirtFusionSsoButton";
import DashboardBlogSection from "@/components/dashboard/DashboardBlogSection";
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
  Server
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

  // Check if we're viewing the blog section
  const [currentSection, setCurrentSection] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setCurrentSection(urlParams.get('section'));
  }, [location]);

  const isBlogSection = currentSection === 'blog';

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

  // Handle navigation back from blog section
  const handleNavigateBackFromBlog = () => {
    navigate('/dashboard');
  };

  return (
    <DashboardLayout>
      {isBlogSection ? (
        /* Blog Section */
        <DashboardBlogSection onNavigateBack={handleNavigateBackFromBlog} />
      ) : (
        /* Default Dashboard Content */
        <>
          {/* Page Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold">Dashboard</h1>
              <p className="text-gray-500 mt-1">Welcome back, {user?.fullName?.split(' ')[0] || 'User'}</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
              <VirtFusionSsoButton />
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Link href="/billing">
              <StatCard
                title={hasVirtFusion ? "VirtFusion Balance" : "Credit Balance"}
                value={`$${displayCredits.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}`}
                icon={<DollarSign />}
                iconColor={`${brandColors.primary.full}`}
                iconBgColor={`${brandColors.primary.lighter}`}
                trend={hasVirtFusion ? {
                  value: `${stats.virtFusionTokens.toLocaleString()} tokens`,
                  positive: true
                } : undefined}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
            </Link>

            {/* Local credit balance has been removed as requested */}

            <Link href="/tickets">
              <StatCard
                title="Support Tickets"
                value={stats.openTickets}
                icon={<Ticket />}
                iconColor={`${brandColors.primary.full}`}
                iconBgColor={`${brandColors.primary.lighter}`}
                trend={stats.openTickets > 0 ? {
                  value: `${stats.openTickets} awaiting response`,
                  positive: false
                } : undefined}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
            </Link>

            <Link href="/servers">
              <StatCard
                title="Current Servers"
                value={stats.totalServers}
                icon={<Server />}
                iconColor={`${brandColors.primary.full}`}
                iconBgColor={`${brandColors.primary.lighter}`}
                trend={stats.totalServers > 0 ? {
                  value: `${stats.totalServers} active ${stats.totalServers === 1 ? 'server' : 'servers'}`,
                  positive: true
                } : undefined}
                className="cursor-pointer hover:shadow-md transition-shadow"
              />
            </Link>
          </div>

          {/* Billing Activity Section */}
          <div className="mt-8">
            <BillingActivity />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
