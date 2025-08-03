import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import {
  Card,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Mail,
  FileText,
  BookOpen,
  Ticket,
  Settings,
  Globe,
  List,
  HelpCircle,
  DollarSign,
  FileCheck,
  ArrowRight,
  Server,
  MessageCircle,
  Gift,
} from "lucide-react";

type AdminMenuSection = {
  title: string;
  icon: React.ElementType;
  href: string;
  description: string;
  color?: string;
  accentColor?: string;
};

// Desktop row layout component
function AdminSectionRow({ section }: { section: AdminMenuSection }) {
  const Icon = section.icon;
  const { data: brandSettings } = useQuery<{ company_name?: string; company_color?: string; primary_color?: string; secondary_color?: string }>({
    queryKey: ['/api/settings/branding'],
    retry: false
  });

  // Create a color from the section's accent color as fallback
  const primaryColor = brandSettings?.primary_color || brandSettings?.company_color || "33be00";

  return (
    <Link href={section.href}>
      <div className="flex items-center p-4 rounded-lg border border-border bg-card transition-all hover:border-primary/30 hover:shadow-sm group">
        <div className={`p-3 mr-4 rounded-lg ${section.color} transition-all duration-200`}>
          <Icon className={`h-5 w-5 ${section.accentColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold group-hover:text-primary transition-colors duration-200">{section.title}</h3>
            <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              Manage <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
          <p className="text-sm text-muted-foreground truncate">{section.description}</p>
        </div>
      </div>
    </Link>
  );
}

// Mobile card component
function AdminSectionCard({ section }: { section: AdminMenuSection }) {
  const Icon = section.icon;
  const { data: brandSettings } = useQuery<{ company_name?: string; company_color?: string; primary_color?: string; secondary_color?: string }>({
    queryKey: ['/api/settings/branding'],
    retry: false
  });

  // Create a color from the section's accent color as fallback
  const primaryColor = brandSettings?.primary_color || brandSettings?.company_color || "33be00";

  return (
    <Link href={section.href} className="block h-full">
      <Card
        className="border border-border bg-card h-full transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:bg-card/80 relative overflow-hidden group"
      >
        <div
          className="absolute inset-x-0 h-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ backgroundColor: `#${primaryColor}` }}
        />
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-lg ${section.color} transition-all duration-300 group-hover:shadow-sm`}>
              <Icon
                className={`h-5 w-5 ${section.accentColor} transition-all duration-300`}
              />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors duration-300">{section.title}</CardTitle>
            </div>
          </div>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            {section.description}
          </CardDescription>
          <div className="mt-auto pt-4 flex justify-end">
            <div
              className="text-sm font-medium flex items-center transition-all duration-300 group-hover:translate-x-1"
              style={{ color: `#${primaryColor}` }}
            >
              Manage <ArrowRight className="ml-1 h-4 w-4" />
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function AdminPage() {
  // Get the brand settings for customization
  const { data: brandSettings } = useQuery<{ company_name?: string; company_color?: string }>({
    queryKey: ['/api/settings/branding'],
    retry: false
  });

  // Admin menu sections
  const adminSections: AdminMenuSection[] = [
    {
      title: "Users",
      icon: Users,
      href: "/admin/users",
      description: "Manage user accounts and permissions",
      color: "bg-blue-50 dark:bg-blue-950",
      accentColor: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Servers",
      icon: Server,
      href: "/admin/servers",
      description: "Manage VirtFusion virtual servers",
      color: "bg-indigo-50 dark:bg-indigo-950",
      accentColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      title: "Tickets",
      icon: Ticket,
      href: "/admin/tickets",
      description: "View and manage support tickets",
      color: "bg-amber-50 dark:bg-amber-950",
      accentColor: "text-amber-600 dark:text-amber-400"
    },
    {
      title: "Billing",
      icon: DollarSign,
      href: "/admin/billing",
      description: "Manage billing and view transaction history",
      color: "bg-green-50 dark:bg-green-950",
      accentColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "User Awards",
      icon: Gift,
      href: "/admin/user-awards",
      description: "Manage daily login rewards and award settings",
      color: "bg-rose-50 dark:bg-rose-950",
      accentColor: "text-rose-600 dark:text-rose-400"
    },
    {
      title: "Coupon Management",
      icon: Ticket,
      href: "/admin/coupon",
      description: "Create and manage discount coupons and promotional codes",
      color: "bg-yellow-50 dark:bg-yellow-950",
      accentColor: "text-yellow-600 dark:text-yellow-400"
    },

    // TEMPORARILY HIDDEN - DNS Management section
    // {
    //   title: "DNS Management",
    //   icon: Globe,
    //   href: "/admin/dns",
    //   description: "Manage DNS plans and domain configurations",
    //   color: "bg-cyan-50 dark:bg-cyan-950",
    //   accentColor: "text-cyan-600 dark:text-cyan-400"
    // },
    {
      title: "Email Logs",
      icon: Mail,
      href: "/admin/mail",
      description: "Track all system email communications",
      color: "bg-purple-50 dark:bg-purple-950",
      accentColor: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "Email Templates",
      icon: Mail,
      href: "/admin/email-templates",
      description: "Create and manage email templates",
      color: "bg-indigo-50 dark:bg-indigo-950",
      accentColor: "text-indigo-600 dark:text-indigo-400"
    },
    {
      title: "Documentation",
      icon: FileText,
      href: "/admin/docs",
      description: "Manage documentation pages",
      color: "bg-emerald-50 dark:bg-emerald-950",
      accentColor: "text-emerald-600 dark:text-emerald-400"
    },
    {
      title: "API Documentation",
      icon: FileText,
      href: "/admin/api-docs",
      description: "View and test API endpoints",
      color: "bg-cyan-50 dark:bg-cyan-950",
      accentColor: "text-cyan-600 dark:text-cyan-400"
    },
    {
      title: "Blog",
      icon: BookOpen,
      href: "/admin/blog",
      description: "Create and edit blog content",
      color: "bg-pink-50 dark:bg-pink-950",
      accentColor: "text-pink-600 dark:text-pink-400"
    },
    {
      title: "Datacenter Locations",
      icon: Globe,
      href: "/admin/datacenter-locations",
      description: "Manage server datacenter locations",
      color: "bg-sky-50 dark:bg-sky-950",
      accentColor: "text-sky-600 dark:text-sky-400"
    },
    {
      title: "Plan Features",
      icon: List,
      href: "/admin/plan-features",
      description: "Configure features for service plans",
      color: "bg-lime-50 dark:bg-lime-950",
      accentColor: "text-lime-600 dark:text-lime-400"
    },
    {
      title: "Package Pricing",
      icon: DollarSign,
      href: "/admin/package-pricing",
      description: "Manage pricing for VirtFusion packages",
      color: "bg-green-50 dark:bg-green-950",
      accentColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "FAQ Management",
      icon: HelpCircle,
      href: "/admin/faq-management",
      description: "Create and edit frequently asked questions",
      color: "bg-orange-50 dark:bg-orange-950",
      accentColor: "text-orange-600 dark:text-orange-400"
    },
    {
      title: "Legal Content",
      icon: FileCheck,
      href: "/admin/legal",
      description: "Edit Terms of Service and Privacy Policy",
      color: "bg-violet-50 dark:bg-violet-950",
      accentColor: "text-violet-600 dark:text-violet-400"
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/admin/settings",
      description: "Configure system settings and preferences",
      color: "bg-gray-50 dark:bg-gray-950",
      accentColor: "text-gray-600 dark:text-gray-400"
    },
  ];

  const companyName = brandSettings?.company_name || 'Admin';

  return (
    <AdminLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto space-y-8 px-4 py-6">
          {/* Page header */}
          <div className="flex items-center justify-between gap-6 bg-card rounded-xl p-6 border border-border shadow-sm">
            <div>
              <h2 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary/90 to-primary bg-clip-text text-transparent">{companyName} Administration</h2>
              <p className="text-muted-foreground mt-1">
                Manage all aspects of your platform from one central location
              </p>
            </div>
          </div>

          {/* Cards for mobile */}
          <div className="block md:hidden">
            <div className="grid grid-cols-1 gap-4">
              {adminSections.map((section) => (
                <AdminSectionCard key={section.href} section={section} />
              ))}
            </div>
          </div>

          {/* Rows for desktop */}
          <div className="hidden md:block">
            <div className="space-y-3">
              {adminSections.map((section) => (
                <AdminSectionRow key={section.href} section={section} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}