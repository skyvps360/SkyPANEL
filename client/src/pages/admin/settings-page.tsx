import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { EnhancedColorSelector, ColorPreview, ThemeSelector } from "@/components/ui/enhanced-color-selector";
import { getBrandColors } from "@/lib/brand-theme";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { UnifiedDepartmentManager } from "@/components/admin/unified-department-manager";
import { ToastAction } from "@/components/ui/toast";
import TeamManagement from "@/components/admin/TeamManagement";

import {
  Settings as SettingsIcon,
  CreditCard,
  Server,
  Save,
  Loader2,
  RefreshCw,
  Bell,
  AlertTriangle,
  Copy,
  Ticket,
  Hourglass,
  Mail,
  PenTool,
  Cloud,
  Users,
  Merge,
  CheckCircle,
  Info,
  X,
  DollarSign,
  MessageCircle,
  Globe,
  MessageSquare,

  Upload,
  Image,
  Trash2,
  BarChart3
} from "lucide-react";

interface Setting {
  id: number;
  key: string;
  value: string;
  updatedAt: string;
}

// VirtFusion API settings schema
const virtFusionSchema = z.object({
  apiUrl: z.string().url({ message: "Please enter a valid URL" }),
  apiToken: z.string().min(10, { message: "API token is required" }),
  sslVerify: z.boolean().default(true),

  // User registration settings
  selfServiceValue: z.coerce.number().min(0).max(1).default(1),
  selfServiceHourlyCredit: z.boolean().default(true),
  selfServiceHourlyResourcePackId: z.coerce.number().min(1).default(1),
  defaultResourcePackId: z.coerce.number().min(1).default(1),
});

type VirtFusionFormData = z.infer<typeof virtFusionSchema>;

// Billing settings schema
const billingSchema = z.object({
  currency: z.string().min(1, { message: "Currency code is required" }),
  taxRate: z.string().regex(/^\d+(\.\d+)?$/, { message: "Must be a valid number" }),
});

type BillingFormData = z.infer<typeof billingSchema>;

// Email settings schema
const emailSchema = z.object({
  smtpHost: z.string().min(1, { message: "SMTP Host is required" }),
  smtpPort: z.string().regex(/^\d+$/, { message: "SMTP Port must be a number" }),
  smtpUser: z.string().min(1, { message: "SMTP Username is required" }),
  smtpPass: z.string().min(1, { message: "SMTP Password is required" }),
  emailFrom: z.string().email({ message: "Valid email address is required" }),
  emailName: z.string().min(1, { message: "Sender name is required" }),
});

type EmailFormData = z.infer<typeof emailSchema>;

// General settings schema
const generalSchema = z.object({
  companyName: z.string().min(1, { message: "Company name is required" }),
  platformName: z.string().min(1, { message: "Platform name is required" }),
  supportEmail: z.string().email({ message: "Valid support email is required" }),
  frontendUrl: z.string().url({ message: "Valid frontend URL is required" }),
  defaultTimezone: z.string(),
  dateFormat: z.string(),
  // Brand colors
  primaryColor: z.string().regex(/^[0-9A-Fa-f]{6}$/, { message: "Color must be a valid hex code without # (e.g. 2563eb)" }),
  secondaryColor: z.string().regex(/^[0-9A-Fa-f]{6}$/, { message: "Color must be a valid hex code without # (e.g. 2563eb)" }),
  accentColor: z.string().regex(/^[0-9A-Fa-f]{6}$/, { message: "Color must be a valid hex code without # (e.g. 2563eb)" }),
  platformServerCount: z.string().regex(/^\d*$/, { message: "Server count must be a number" }).optional(),
  platformHypervisorCount: z.string().regex(/^\d*$/, { message: "Hypervisor count must be a number" }).optional(),
});

// Define social media platform type
type SocialPlatform = 'github' | 'facebook' | 'discord' | 'linkedin' | 'youtube' | 'instagram';

// Ticket Department interface
interface TicketDepartment {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  requiresVps: boolean;
  displayOrder: number;
}



// Department Migration interfaces
interface SyncStatus {
  needsSync: boolean;
  newTicketDepartments: TicketDepartment[];
  totalNewDepartments: number;
}

interface MigrationStatus {
  needsMigration: boolean;
  ticketDepartmentCount: number;
  supportDepartmentCount: number;
}

interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    supportDepartmentsCreated: number;
    ticketDepartmentsMigrated: number;
    ticketsMigrated: number;
    adminAssignmentsMigrated: number;
    conflicts: Array<{
      type: 'name_conflict' | 'default_conflict';
      resolution: string;
    }>;
  };
}

// DNS Billing Data interface
interface DnsBillingData {
  success: boolean;
  cronStatus: {
    dnsBilling: {
      enabled: boolean;
      schedule: string;
      isRunning: boolean;
    };
  };
  cronLogs: any;
  dnsStats: {
    totalActiveSubscriptions: number;
    subscriptionsDueToday: number;
    suspendedSubscriptions: number;
    totalMonthlyRevenue: number;
  };
}

// Ticket Department form schema
const ticketDepartmentSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, { message: "Department name is required" }),
  description: z.string().min(1, { message: "Department description is required" }),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  requiresVps: z.boolean().default(false),
  displayOrder: z.number().min(0).default(0),
});

type TicketDepartmentFormData = z.infer<typeof ticketDepartmentSchema>;

// Design settings schema (formerly footer schema)
const designSchema = z.object({
  // Footer settings
  footerDescription: z.string().min(1, { message: "Footer description is required" }),
  enableSocialIcons: z.boolean().default(true),
  socialLinks: z.array(
    z.object({
      platform: z.enum(['github', 'facebook', 'discord', 'linkedin', 'youtube', 'instagram']),
      url: z.string().url({ message: "Please enter a valid URL" }).or(z.literal("")),
    })
  ).max(6, { message: "Maximum of 6 social media links allowed" }).default([]),
  contactEmail: z.string().email({ message: "Valid contact email is required" }),
  contactSupportText: z.string(),
  contactPhone: z.string(),



  // Features section settings
  featuresHeading: z.string().min(1, { message: "Features heading is required" }),
  featuresSubheading: z.string(),
  featureCards: z.array(
    z.object({
      icon: z.enum(['zap', 'cpu', 'globe', 'shield']),
      title: z.string().min(1, { message: "Feature title is required" }),
      description: z.string().min(1, { message: "Feature description is required" }),
    })
  ).min(1, { message: "At least one feature card is required" }).max(4, { message: "Maximum of 4 feature cards allowed" }),

  // Enterprise-Grade Features section settings
  enterpriseFeaturesHeading: z.string().min(1, { message: "Enterprise features heading is required" }),
  enterpriseFeaturesSubheading: z.string().min(1, { message: "Enterprise features subheading is required" }),
  enterpriseFeatureCards: z.array(
    z.object({
      icon: z.enum(['zap', 'cpu', 'globe', 'shield']),
      title: z.string().min(1, { message: "Feature title is required" }),
      description: z.string().min(1, { message: "Feature description is required" }),
    })
  ).min(1, { message: "At least one enterprise feature card is required" }).max(4, { message: "Maximum of 4 enterprise feature cards allowed" }),
});

type DesignFormData = z.infer<typeof designSchema>;

// Social media platform options for dropdown
const socialPlatforms = [
  { value: 'github', label: 'GitHub' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'discord', label: 'Discord' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'instagram', label: 'Instagram' },
];

type GeneralFormData = z.infer<typeof generalSchema>;

// Notifications settings schema
const notificationsSchema = z.object({
  discordWebhookUrl: z.string().url({ message: "Please enter a valid Discord webhook URL" }).or(z.literal("")),
  discordRoleId: z.string().regex(/^\d*$/, { message: "Role ID must contain only numbers" }).optional(),

  // Discord Bot settings
  discordBotEnabled: z.boolean().default(false),
  discordBotToken: z.string().min(10, { message: "Bot token must be valid" }).or(z.literal("")),
  discordGuildId: z.string().regex(/^\d*$/, { message: "Guild ID must contain only numbers" }).or(z.literal("")),
  discordChannelId: z.string().regex(/^\d*$/, { message: "Channel ID must contain only numbers" }).or(z.literal("")),

  // Discord Bot Permission Settings
  discordAllowedRoleIds: z.string().regex(/^(\d+(,\s*\d+)*)?$/, {
    message: "Role IDs must be comma-separated numbers"
  }).optional(),
  discordAllowedUserIds: z.string().regex(/^(\d+(,\s*\d+)*)?$/, {
    message: "User IDs must be comma-separated numbers"
  }).optional(),
});

type NotificationsFormData = z.infer<typeof notificationsSchema>;

// Maintenance mode settings schema
const maintenanceSchema = z.object({
  enabled: z.boolean().default(false),
  message: z.string().min(1, { message: "Maintenance message is required" }),
  estimatedCompletion: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;



// Loading screen settings schema
const loadingScreenSchema = z.object({
  enabled: z.boolean().default(true),
  animationDuration: z.coerce.number()
    .min(500, "Animation duration must be at least 500ms")
    .max(10000, "Animation duration must not exceed 10 seconds")
    .default(3000),
  minDuration: z.coerce.number()
    .min(0, "Minimum duration cannot be negative")
    .max(5000, "Minimum duration must not exceed 5 seconds")
    .default(1000),
  showOnAllPages: z.boolean().default(false),
});

type LoadingScreenFormData = z.infer<typeof loadingScreenSchema>;

// Cloud pricing settings schema
const cloudPricingSchema = z.object({
  cpuPricePerCore: z.string().regex(/^\d*\.?\d*$/, { message: "CPU price must be a valid number" }),
  ramPricePerGB: z.string().regex(/^\d*\.?\d*$/, { message: "RAM price must be a valid number" }),
  storagePricePerGB: z.string().regex(/^\d*\.?\d*$/, { message: "Storage price must be a valid number" }),
  networkPricePerMbps: z.string().regex(/^\d*\.?\d*$/, { message: "Network price must be a valid number" }),
  natIpv4Price: z.string().regex(/^\d*\.?\d*$/, { message: "NAT IPv4 price must be a valid number" }),
  publicIpv4Price: z.string().regex(/^\d*\.?\d*$/, { message: "Public IPv4 price must be a valid number" }),
  publicIpv6Price: z.string().regex(/^\d*\.?\d*$/, { message: "Public IPv6 price must be a valid number" }),
  // Enable/disable toggles
  cpuPricingEnabled: z.boolean().default(true),
  ramPricingEnabled: z.boolean().default(true),
  storagePricingEnabled: z.boolean().default(true),
  networkPricingEnabled: z.boolean().default(true),
  natIpv4PricingEnabled: z.boolean().default(false),
  publicIpv4PricingEnabled: z.boolean().default(false),
  publicIpv6PricingEnabled: z.boolean().default(false),
});

type CloudPricingFormData = z.infer<typeof cloudPricingSchema>;





// Google Analytics settings schema
const googleAnalyticsSchema = z.object({
  googleAnalyticsEnabled: z.boolean().default(false),
  googleAnalyticsMeasurementId: z.string().min(1, { message: "Measurement ID is required when Google Analytics is enabled" }).optional(),
  googleAnalyticsEnhancedEcommerce: z.boolean().default(false),
  googleAnalyticsEnabledPages: z.string().optional(),
});

type GoogleAnalyticsFormData = z.infer<typeof googleAnalyticsSchema>;

// Define the settings options for dropdown
const settingsOptions = [
  { value: "general", label: "General", icon: <SettingsIcon className="h-4 w-4 mr-2" /> },
  { value: "billing", label: "Billing", icon: <CreditCard className="h-4 w-4 mr-2" /> },
  { value: "cloud", label: "Cloud", icon: <Cloud className="h-4 w-4 mr-2" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4 mr-2" /> },
  { value: "notifications", label: "Discord", icon: <MessageCircle className="h-4 w-4 mr-2" /> },
  { value: "team", label: "Team", icon: <Users className="h-4 w-4 mr-2" /> },
  { value: "virtfusion", label: "VirtFusion API", icon: <Server className="h-4 w-4 mr-2" /> },

  { value: "google-analytics", label: "Google Analytics", icon: <BarChart3 className="h-4 w-4 mr-2" /> },

  { value: "dns", label: "DNS", icon: <Globe className="h-4 w-4 mr-2" /> },
  { value: "departments", label: "Departments", icon: <Merge className="h-4 w-4 mr-2" /> },
  { value: "tickets", label: "Tickets", icon: <Ticket className="h-4 w-4 mr-2" /> },
  { value: "maintenance", label: "Maintenance", icon: <AlertTriangle className="h-4 w-4 mr-2" /> },
  { value: "loading-screen", label: "Loading Screen", icon: <Hourglass className="h-4 w-4 mr-2" /> },
  { value: "design", label: "Design", icon: <PenTool className="h-4 w-4 mr-2" /> },


];

export default function SettingsPage() {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("general");
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [testConnectionInProgress, setTestConnectionInProgress] = useState(false);
  const [maintenanceToken, setMaintenanceToken] = useState<string>("");  const [regeneratingToken, setRegeneratingToken] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<TicketDepartment | null>(null);
  const [isAddingDepartment, setIsAddingDepartment] = useState(false);
  const [themeKey, setThemeKey] = useState(0); // Force re-render key
  const [migrationInProgress, setMigrationInProgress] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [syncResult, setSyncResult] = useState<MigrationResult | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [logoUploadInProgress, setLogoUploadInProgress] = useState(false);

  // Listen for theme changes to force re-render
  useEffect(() => {
    const handleThemeChange = () => {
      setThemeKey(prev => prev + 1);
    };

    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  // Fetch settings
  const { data: settings = [], isLoading } = useQuery<Setting[]>({
    queryKey: ["/api/admin/settings"],
  });

  // Fetch DNS billing status separately to prevent infinite loops
  const { data: dnsBillingData } = useQuery<DnsBillingData>({
    queryKey: ["/api/admin/cron/status"],
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch ticket departments
  const { data: departments = [], isLoading: isLoadingDepartments } = useQuery<TicketDepartment[]>({
    queryKey: ["/api/ticket-departments"],
  });

  // Fetch migration status
  const { data: migrationStatus, isLoading: isLoadingMigrationStatus, refetch: refetchMigrationStatus } = useQuery<MigrationStatus>({
    queryKey: ["/api/admin/department-migration/status"],
    staleTime: 30000, // Cache for 30 seconds
  });



  // Notifications settings form
  const notificationsForm = useForm<NotificationsFormData>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      discordWebhookUrl: getSettingValue("discord_webhook_url", ""),
      discordRoleId: getSettingValue("discord_role_id", ""),
      discordBotEnabled: getSettingValue("discord_bot_enabled", "false") === "true",
      discordBotToken: getSettingValue("discord_bot_token", ""),
      discordGuildId: getSettingValue("discord_guild_id", ""),
      discordChannelId: getSettingValue("discord_channel_id", ""),
      discordAllowedRoleIds: getSettingValue("discord_allowed_role_ids", ""),
      discordAllowedUserIds: getSettingValue("discord_allowed_user_ids", ""),
    },
  });

  // General settings form
  const generalForm = useForm<GeneralFormData>({
    resolver: zodResolver(generalSchema),
    defaultValues: {
      companyName: getSettingValue("company_name", "SkyVPS360"),
      platformName: getSettingValue("platform_name", "SkyVPS360 Client Portal"),
      supportEmail: getSettingValue("support_email", "support@skyvps360.xyz"),
      frontendUrl: getSettingValue("frontend_url", "https://skyvps360.xyz"),
      defaultTimezone: getSettingValue("default_timezone", "UTC"),
      dateFormat: getSettingValue("date_format", "MM/DD/YYYY"),
      // Brand colors
      primaryColor: getSettingValue("primary_color", "2563eb"),
      secondaryColor: getSettingValue("secondary_color", "10b981"),
      accentColor: getSettingValue("accent_color", "f59e0b"),
      platformServerCount: getSettingValue("platform_server_count", ""),
      platformHypervisorCount: getSettingValue("platform_hypervisor_count", ""),
    },
  });

  // VirtFusion API form
  const virtFusionForm = useForm<VirtFusionFormData>({
    resolver: zodResolver(virtFusionSchema),
    defaultValues: {
      apiUrl: getSettingValue("virtfusion_api_url", "https://skyvps360.xyz/api/v1"),
      apiToken: getSettingValue("virtfusion_api_token", ""),
      sslVerify: getSettingValue("virtfusion_ssl_verify", "true") === "true",

      // User registration settings with safer parsing
      selfServiceValue: Number(getSettingValue("virtfusion_self_service", "1")) || 1,
      selfServiceHourlyCredit: getSettingValue("virtfusion_self_service_hourly_credit", "true") === "true",
      selfServiceHourlyResourcePackId: Number(getSettingValue("virtfusion_self_service_hourly_resource_pack_id", "1")) || 1,
      defaultResourcePackId: Number(getSettingValue("virtfusion_default_resource_pack_id", "1")) || 1,
    },
  });

  // Billing form
  const billingForm = useForm<BillingFormData>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      currency: getSettingValue("currency", "USD"),
      taxRate: getSettingValue("tax_rate", "0"),
    },
  });

  // Email form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      smtpHost: getSettingValue("smtp_host", ""),
      smtpPort: getSettingValue("smtp_port", "587"),
      smtpUser: getSettingValue("smtp_user", ""),
      smtpPass: getSettingValue("smtp_pass", ""),
      emailFrom: getSettingValue("email_from", ""),
      emailName: getSettingValue("email_name", "VirtFusion Billing"),
    },
  });

  // Cloud pricing form
  const cloudPricingForm = useForm<CloudPricingFormData>({
    resolver: zodResolver(cloudPricingSchema),
    defaultValues: {
      cpuPricePerCore: getSettingValue("cloud_cpu_price_per_core", "0.00"),
      ramPricePerGB: getSettingValue("cloud_ram_price_per_gb", "0.00"),
      storagePricePerGB: getSettingValue("cloud_storage_price_per_gb", "0.00"),
      networkPricePerMbps: getSettingValue("cloud_network_price_per_mbps", "0.00"),
      natIpv4Price: getSettingValue("cloud_nat_ipv4_price", "0.00"),
      publicIpv4Price: getSettingValue("cloud_public_ipv4_price", "0.00"),
      publicIpv6Price: getSettingValue("cloud_public_ipv6_price", "0.00"),
      // Enable/disable toggles
      cpuPricingEnabled: getSettingValue("cloud_cpu_pricing_enabled", "true") === "true",
      ramPricingEnabled: getSettingValue("cloud_ram_pricing_enabled", "true") === "true",
      storagePricingEnabled: getSettingValue("cloud_storage_pricing_enabled", "true") === "true",
      networkPricingEnabled: getSettingValue("cloud_network_pricing_enabled", "true") === "true",
      natIpv4PricingEnabled: getSettingValue("cloud_nat_ipv4_pricing_enabled", "false") === "true",
      publicIpv4PricingEnabled: getSettingValue("cloud_public_ipv4_pricing_enabled", "false") === "true",
      publicIpv6PricingEnabled: getSettingValue("cloud_public_ipv6_pricing_enabled", "false") === "true",
    },
  });





  // Google Analytics form
  // Helper function to convert JSON array to newline-separated string for textarea
  const getEnabledPagesForTextarea = (key: string, defaultValue: string) => {
    const value = getSettingValue(key, defaultValue);
    try {
      const pages = JSON.parse(value);
      return Array.isArray(pages) ? pages.join('\n') : value;
    } catch {
      return value;
    }
  };

  const googleAnalyticsForm = useForm<GoogleAnalyticsFormData>({
    resolver: zodResolver(googleAnalyticsSchema),
    defaultValues: {
      googleAnalyticsEnabled: getSettingValue("google_analytics_enabled", "false") === "true",
      googleAnalyticsMeasurementId: getSettingValue("google_analytics_measurement_id", ""),
      googleAnalyticsEnhancedEcommerce: getSettingValue("google_analytics_enhanced_ecommerce", "false") === "true",
      googleAnalyticsEnabledPages: getEnabledPagesForTextarea("google_analytics_enabled_pages", JSON.stringify([
        '/',
        '/dashboard',
        '/servers',
        '/billing',
        '/dns',
        '/blog',
        '/docs',
        '/plans',
        '/status',
        '/api-docs'
      ])),
    },
  });







  // Update setting mutation
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string, value: string }) => {
      return apiRequest(`/api/admin/settings/${key}`, {
        method: "PUT",
        body: { value }
      });
    },
  });

  // Logo upload mutation
  const logoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      
      return apiRequest('/api/admin/settings/logo/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it for FormData
        isFormData: true
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Logo uploaded successfully",
        description: "Your custom logo has been uploaded and will be displayed across the platform",
      });
      // Clear the preview state
      setLogoFile(null);
      setLogoPreview("");
      // Refresh settings to get the updated logo
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
    },
    onError: (error: any) => {
      toast({
        title: "Logo upload failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    },
  });

  // Logo delete mutation
  const logoDeleteMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/settings/logo', {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: "Logo deleted successfully",
        description: "Custom logo has been removed. The default letter logo will be displayed",
      });
      setLogoPreview("");
      setLogoFile(null);
      // Refresh settings
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
    },
    onError: (error: any) => {
      toast({
        title: "Logo deletion failed",
        description: error.message || "Failed to delete logo",
        variant: "destructive",
      });
    },
  });

  // Test connection mutation
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/admin/virtfusion/test-connection", {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Connection successful",
        description: "Successfully connected to VirtFusion API",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to VirtFusion API",
        variant: "destructive",
      });
      console.error("VirtFusion API connection test error:", error);
    },
  });

  // Helper function to get setting value with proper type safety
  function getSettingValue(key: string, defaultValue: string = "", settingsArray: Setting[] | unknown = settings): string {
    // Handle the case when settingsArray is undefined or not an array
    if (!Array.isArray(settingsArray)) {
      return defaultValue;
    }

    // Type check to ensure we're working with Setting objects
    const typedSettings = settingsArray as Setting[];
    const setting = typedSettings.find(s => s.key === key);
    return setting ? setting.value : defaultValue;
  }

  // Logo upload helper functions
  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (PNG, JPG, SVG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;

    setLogoUploadInProgress(true);
    try {
      await logoUploadMutation.mutateAsync(logoFile);
    } catch (error) {
      console.error("Logo upload error:", error);
    } finally {
      setLogoUploadInProgress(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      await logoDeleteMutation.mutateAsync();
    } catch (error) {
      console.error("Logo delete error:", error);
    }
  };

  // Get current logo from settings
  const currentLogo = getSettingValue("company_logo", "");

  // Get brand colors for styling
  const brandColorOptions = {
    primaryColor: getSettingValue("primary_color", "2563eb"),
    secondaryColor: getSettingValue("secondary_color", "10b981"),
    accentColor: getSettingValue("accent_color", "f59e0b")
  };

  // Get brand color variations
  const brandColors = getBrandColors(brandColorOptions);

  // Helper function to get brand button styling
  const getBrandButtonStyle = (isDisabled: boolean = false) => ({
    backgroundColor: isDisabled ? `${brandColors.primary.full}80` : brandColors.primary.full,
    color: 'white',
    borderColor: 'transparent',
  });

  // Maintenance mode form
  const maintenanceForm = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      enabled: getSettingValue("maintenance_mode", "false") === "true",
      message: getSettingValue("maintenance_message", "System is currently under maintenance."),
      estimatedCompletion: getSettingValue("maintenance_estimated_completion", ""),
    },
  });

  // Toggle maintenance mode mutation
  const toggleMaintenanceMutation = useMutation({
    mutationFn: async ({ enabled, message, estimatedCompletion }: MaintenanceFormData) => {
      return apiRequest("/api/maintenance/toggle", {
        method: "POST",
        body: {
          enabled,
          message,
          estimatedCompletion
        }
      });
    },
    onSuccess: (data) => {
      toast({
        title: data.enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
        description: data.message,
      });

      // Fetch the maintenance token if we just enabled it
      if (data.enabled) {
        fetchMaintenanceToken();
      }

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating maintenance mode",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Regenerate maintenance token mutation
  const regenerateTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/maintenance/token/regenerate", {
        method: "POST"
      });
    },
    onSuccess: (data) => {
      // Ensure we're handling the token properly as a string
      if (data && data.success && typeof data.token === 'string') {
        setMaintenanceToken(data.token);
        toast({
          title: "Token regenerated",
          description: "A new maintenance bypass token has been generated",
        });
      } else {
        console.error("Invalid token response format:", data);
        toast({
          title: "Error regenerating token",
          description: "Received invalid token format from server",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error regenerating token",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    },
  });

  // Fetch maintenance token
  const fetchMaintenanceToken = async () => {
    try {
      // Use the updated apiRequest function which already handles the response parsing
      const data = await apiRequest("/api/maintenance/token", {
        method: "GET",
        responseType: "json"
      });

      // If we got a valid response with a token property
      if (data && typeof data === 'object' && 'token' in data) {
        setMaintenanceToken(data.token);
      } else if (data && typeof data === 'object' && '_isHtmlResponse' in data) {
        // This is an HTML response handled by our updated apiRequest
        console.warn("Received HTML instead of JSON for maintenance token");
      } else {
        console.warn("Unexpected response format for maintenance token:", data);
      }
    } catch (error) {
      console.error("Error fetching maintenance token:", error);
    }
  };

  // Handle token regeneration
  const handleRegenerateToken = async () => {
    setRegeneratingToken(true);
    try {
      await regenerateTokenMutation.mutateAsync();
    } catch (error) {
      console.error("Error regenerating token:", error);
    } finally {
      setRegeneratingToken(false);
    }
  };

  // Copy token to clipboard
  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(maintenanceToken).then(() => {
      toast({
        title: "Token copied",
        description: "Maintenance bypass token copied to clipboard",
      });
    });
  };

  // Handle maintenance form submission
  const onMaintenanceSubmit = async (data: MaintenanceFormData) => {
    setSaveInProgress(true);

    try {
      await toggleMaintenanceMutation.mutateAsync(data);
    } catch (error) {
      console.error("Error submitting maintenance form:", error);
    } finally {
      setSaveInProgress(false);
    }
  };



  // Loading screen settings form
  const loadingScreenForm = useForm<LoadingScreenFormData>({
    resolver: zodResolver(loadingScreenSchema),
    defaultValues: {
      enabled: getSettingValue("loading_screen_enabled", "true") === "true",
      animationDuration: parseInt(getSettingValue("loading_screen_animation_duration", "3000"), 10),
      minDuration: parseInt(getSettingValue("loading_screen_min_duration", "1000"), 10),
      showOnAllPages: getSettingValue("loading_screen_show_on_all_pages", "false") === "true",
    }
  });

  // Handle loading screen settings submission
  const onLoadingScreenSubmit = async (data: LoadingScreenFormData) => {
    setSaveInProgress(true);

    try {
      // Update all loading screen settings
      await updateSettingMutation.mutateAsync({
        key: "loading_screen_enabled",
        value: data.enabled.toString()
      });

      await updateSettingMutation.mutateAsync({
        key: "loading_screen_animation_duration",
        value: data.animationDuration.toString()
      });

      await updateSettingMutation.mutateAsync({
        key: "loading_screen_min_duration",
        value: data.minDuration.toString()
      });

      await updateSettingMutation.mutateAsync({
        key: "loading_screen_show_on_all_pages",
        value: data.showOnAllPages.toString()
      });

      toast({
        title: "Loading screen settings updated",
        description: "Loading screen settings have been saved successfully",
      });

      // Refresh settings
      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/public"] });
    } catch (error: any) {
      toast({
        title: "Error updating loading screen settings",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

  // Ticket department form
  const ticketDepartmentForm = useForm<TicketDepartmentFormData>({
    resolver: zodResolver(ticketDepartmentSchema),
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
      isDefault: false,
      requiresVps: false,
      displayOrder: 0
    }
  });

  // Create ticket department mutation
  const createDepartmentMutation = useMutation({
    mutationFn: async (data: TicketDepartmentFormData) => {
      return apiRequest('/api/admin/ticket-departments', {
        method: 'POST',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department created',
        description: 'Ticket department has been created successfully'
      });
      setIsAddingDepartment(false);
      ticketDepartmentForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/ticket-departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating department',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Update ticket department mutation
  const updateDepartmentMutation = useMutation({
    mutationFn: async (data: TicketDepartmentFormData) => {
      return apiRequest(`/api/admin/ticket-departments/${data.id}`, {
        method: 'PUT',
        body: data
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department updated',
        description: 'Ticket department has been updated successfully'
      });
      setEditingDepartment(null);
      ticketDepartmentForm.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/ticket-departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating department',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Delete ticket department mutation
  const deleteDepartmentMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest(`/api/admin/ticket-departments/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      toast({
        title: 'Department deleted',
        description: 'Ticket department has been deleted successfully'
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ticket-departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting department',
        description: error.message || 'An error occurred',
        variant: 'destructive'
      });
    }
  });

  // Department migration mutation
  const migrateDepartmentsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/admin/department-migration/migrate', {
        method: 'POST'
      });
    },
    onSuccess: (result: MigrationResult) => {
      setMigrationResult(result);
      toast({
        title: 'Migration completed',
        description: result.message,
        duration: 8000,
      });
      // Refresh migration status and departments
      refetchMigrationStatus();
      queryClient.invalidateQueries({ queryKey: ['/api/ticket-departments'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Migration failed',
        description: error.message || 'An error occurred during migration',
        variant: 'destructive',
        duration: 8000,
      });
    }
  });



  // Handle department form submission
  const onDepartmentSubmit = async (data: TicketDepartmentFormData) => {
    setSaveInProgress(true);
    try {
      if (editingDepartment) {
        await updateDepartmentMutation.mutateAsync({ ...data, id: editingDepartment.id });
      } else {
        await createDepartmentMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error("Error submitting department form:", error);
    } finally {
      setSaveInProgress(false);
    }
  };

  // Handle edit department
  const handleEditDepartment = (department: TicketDepartment) => {
    setEditingDepartment(department);
    ticketDepartmentForm.reset({
      name: department.name,
      description: department.description,
      isActive: department.isActive,
      isDefault: department.isDefault,
      requiresVps: department.requiresVps,
      displayOrder: department.displayOrder
    });
  };

  // Handle delete department
  const handleDeleteDepartment = async (id: number) => {
    if (confirm('Are you sure you want to delete this department? This cannot be undone.')) {
      await deleteDepartmentMutation.mutateAsync(id);
    }
  };

  // Cancel editing/adding department
  const cancelDepartmentEdit = () => {
    setEditingDepartment(null);
    setIsAddingDepartment(false);
    ticketDepartmentForm.reset();
  };

  // Handle department migration
  const handleMigrateDepartments = async () => {
    if (!migrationStatus?.needsMigration) {
      toast({
        title: 'No migration needed',
        description: 'The department system is already unified',
        variant: 'default',
      });
      return;
    }

    const confirmed = confirm(
              `This will merge ${migrationStatus.ticketDepartmentCount} ticket departments into a unified system. This action cannot be undone. Continue?`
    );

    if (!confirmed) return;

    setMigrationInProgress(true);
    setMigrationResult(null);

    try {
      await migrateDepartmentsMutation.mutateAsync();
    } catch (error) {
      console.error('Migration error:', error);
    } finally {
      setMigrationInProgress(false);
    }
  };

  // Handle department sync
  const handleSyncDepartments = async () => {
    if (!migrationStatus?.syncStatus?.needsSync) {
      toast({
        title: 'No sync needed',
        description: 'All departments are already synchronized',
        variant: 'default',
      });
      return;
    }

    const syncStatus = migrationStatus.syncStatus;
    const newDeptNames = [
              ...syncStatus.newTicketDepartments.map(d => d.name)
    ];

    const confirmed = confirm(
      `This will sync ${syncStatus.totalNewDepartments} new departments (${newDeptNames.join(', ')}) into the unified system. Continue?`
    );

    if (!confirmed) return;

    setSyncInProgress(true);
    setSyncResult(null);

    try {
      await syncDepartmentsMutation.mutateAsync();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setSyncInProgress(false);
    }
  };

  // Footer form
  const designForm = useForm<DesignFormData>({
    resolver: zodResolver(designSchema),
    defaultValues: {
      // Footer settings
      footerDescription: getSettingValue("footer_description", "High-performance VPS hosting solutions with exceptional support and reliability."),
      enableSocialIcons: getSettingValue("footer_social_icons_enabled", "true") === "true",
      socialLinks: [
        // Convert old format to new format for backward compatibility
        ...(getSettingValue("footer_github_url", "") ? [{ platform: 'github' as SocialPlatform, url: getSettingValue("footer_github_url", "") }] : []),
        ...(getSettingValue("footer_x_url", "") ? [{ platform: 'x' as SocialPlatform, url: getSettingValue("footer_x_url", "") }] : []),
        // For backward compatibility with the old Twitter key
        ...(!getSettingValue("footer_x_url", "") && getSettingValue("footer_twitter_url", "") ? [{ platform: 'x' as SocialPlatform, url: getSettingValue("footer_twitter_url", "") }] : []),
        ...(getSettingValue("footer_facebook_url", "") ? [{ platform: 'facebook' as SocialPlatform, url: getSettingValue("footer_facebook_url", "") }] : []),
        ...(getSettingValue("footer_discord_url", "") ? [{ platform: 'discord' as SocialPlatform, url: getSettingValue("footer_discord_url", "") }] : []),
        ...(getSettingValue("footer_linkedin_url", "") ? [{ platform: 'linkedin' as SocialPlatform, url: getSettingValue("footer_linkedin_url", "") }] : []),
        ...(getSettingValue("footer_youtube_url", "") ? [{ platform: 'youtube' as SocialPlatform, url: getSettingValue("footer_youtube_url", "") }] : []),
        ...(getSettingValue("footer_instagram_url", "") ? [{ platform: 'instagram' as SocialPlatform, url: getSettingValue("footer_instagram_url", "") }] : []),
      ],
      contactEmail: getSettingValue("footer_contact_email", "support@skyvps360.xyz"),
      contactSupportText: getSettingValue("footer_contact_support_text", "24/7 Available"),
      contactPhone: getSettingValue("footer_contact_phone", "+1 (555) 123-4567"),

      // Features section settings
      featuresHeading: getSettingValue("features_heading", "Why Choose SkyVPS360?"),
      featuresSubheading: getSettingValue("features_subheading", "Experience the perfect blend of performance, reliability, and affordability."),
      featureCards: [
        {
          icon: (getSettingValue("feature_icon_1", "zap") || "zap") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("feature_title_1", "Lightning-Fast Performance"),
          description: getSettingValue("feature_description_1", "Experience blazing-fast speeds with our optimized infrastructure and SSD storage.")
        },
        {
          icon: (getSettingValue("feature_icon_2", "shield") || "shield") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("feature_title_2", "Enterprise-Grade Security"),
          description: getSettingValue("feature_description_2", "Rest easy with advanced security measures protecting your servers 24/7.")
        },
        {
          icon: (getSettingValue("feature_icon_3", "cpu") || "cpu") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("feature_title_3", "Cutting-Edge Technology"),
          description: getSettingValue("feature_description_3", "Built on the latest virtualization technology for reliability and performance.")
        },
        {
          icon: (getSettingValue("feature_icon_4", "globe") || "globe") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("feature_title_4", "Global Network Reach"),
          description: getSettingValue("feature_description_4", "Strategic data center locations ensure minimal latency for your global audience.")
        }
      ],

      // Enterprise-Grade Features section settings
      enterpriseFeaturesHeading: getSettingValue("enterprise_features_heading", "Enterprise-Grade Features"),
      enterpriseFeaturesSubheading: getSettingValue("enterprise_features_subheading", "Our platform delivers the performance, security, and flexibility you need to build and scale with confidence."),
      enterpriseFeatureCards: [
        {
          icon: (getSettingValue("enterprise_feature_icon_1", "zap") || "zap") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("enterprise_feature_title_1", "KVM Performance"),
          description: getSettingValue("enterprise_feature_description_1", "Leveraging powerful KVM virtualization and Network SATA for superior speed and responsiveness.")
        },
        {
          icon: (getSettingValue("enterprise_feature_icon_2", "cpu") || "cpu") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("enterprise_feature_title_2", "VirtFusion Control"),
          description: getSettingValue("enterprise_feature_description_2", "Manage your VPS effortlessly with our modern control panel: boot, reboot, reinstall, console access, and more.")
        },
        {
          icon: (getSettingValue("enterprise_feature_icon_3", "globe") || "globe") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("enterprise_feature_title_3", "Flexible Connectivity"),
          description: getSettingValue("enterprise_feature_description_3", "Get connected with NAT IPv4 (20 ports included) and a dedicated /80 IPv6 subnet for future-proofing.")
        },
        {
          icon: (getSettingValue("enterprise_feature_icon_4", "shield") || "shield") as 'zap' | 'cpu' | 'globe' | 'shield',
          title: getSettingValue("enterprise_feature_title_4", "Easy OS Deployment"),
          description: getSettingValue("enterprise_feature_description_4", "Quickly deploy your preferred operating system using a wide range of templates available via VirtFusion.")
        }
      ],
    },
  });

  // Handle design form submission
  const onDesignSubmit = async (data: DesignFormData) => {
    setSaveInProgress(true);

    try {
      // Update footer description
      await updateSettingMutation.mutateAsync({ key: "footer_description", value: data.footerDescription });

      // Update social icons settings
      await updateSettingMutation.mutateAsync({ key: "footer_social_icons_enabled", value: data.enableSocialIcons.toString() });

      // Clear all existing social URLs first to avoid stale data
      const platformsToUpdate = ['github', 'x', 'facebook', 'discord', 'linkedin', 'youtube', 'instagram'];

      // Also clear the legacy twitter URL if it exists
      await updateSettingMutation.mutateAsync({ key: "footer_twitter_url", value: "" });

      for (const platform of platformsToUpdate) {
        await updateSettingMutation.mutateAsync({ key: `footer_${platform}_url`, value: "" });
      }

      // Now add the new social links
      for (const socialLink of data.socialLinks) {
        if (socialLink.url) {
          await updateSettingMutation.mutateAsync({
            key: `footer_${socialLink.platform}_url`,
            value: socialLink.url
          });
        }
      }

      // Update contact info
      await updateSettingMutation.mutateAsync({ key: "footer_contact_email", value: data.contactEmail });
      await updateSettingMutation.mutateAsync({ key: "footer_contact_support_text", value: data.contactSupportText });
      await updateSettingMutation.mutateAsync({ key: "footer_contact_phone", value: data.contactPhone });

      // Update features section settings
      await updateSettingMutation.mutateAsync({ key: "features_heading", value: data.featuresHeading });
      await updateSettingMutation.mutateAsync({ key: "features_subheading", value: data.featuresSubheading });

      // Update feature cards
      for (let i = 0; i < data.featureCards.length; i++) {
        const card = data.featureCards[i];
        const index = i + 1;
        await updateSettingMutation.mutateAsync({ key: `feature_icon_${index}`, value: card.icon });
        await updateSettingMutation.mutateAsync({ key: `feature_title_${index}`, value: card.title });
        await updateSettingMutation.mutateAsync({ key: `feature_description_${index}`, value: card.description });
      }

      // Clear any extra feature cards that may have been removed
      for (let i = data.featureCards.length + 1; i <= 4; i++) {
        await updateSettingMutation.mutateAsync({ key: `feature_icon_${i}`, value: "" });
        await updateSettingMutation.mutateAsync({ key: `feature_title_${i}`, value: "" });
        await updateSettingMutation.mutateAsync({ key: `feature_description_${i}`, value: "" });
      }

      // Update Enterprise-Grade Features section settings
      await updateSettingMutation.mutateAsync({ key: "enterprise_features_heading", value: data.enterpriseFeaturesHeading });
      await updateSettingMutation.mutateAsync({ key: "enterprise_features_subheading", value: data.enterpriseFeaturesSubheading });

      // Update enterprise feature cards - store in both legacy format and new format to ensure compatibility
      for (let i = 0; i < data.enterpriseFeatureCards.length; i++) {
        const card = data.enterpriseFeatureCards[i];
        const index = i + 1;

        // Save in legacy format (enterprise_feature_icon_1, etc.)
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_icon_${index}`, value: card.icon });
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_title_${index}`, value: card.title });
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_description_${index}`, value: card.description });

        // Save in new format (enterpriseFeatureCards.0.icon, etc.)
        await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i}.icon`, value: card.icon });
        await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i}.title`, value: card.title });
        await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i}.description`, value: card.description });
      }

      // Clear any extra enterprise feature cards that may have been removed
      for (let i = data.enterpriseFeatureCards.length + 1; i <= 4; i++) {
        // Clear legacy format
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_icon_${i}`, value: "" });
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_title_${i}`, value: "" });
        await updateSettingMutation.mutateAsync({ key: `enterprise_feature_description_${i}`, value: "" });

        // Clear new format (for items that might have been removed)
        if (i <= 3) {  // New format is 0-indexed, so we only need to clear up to 3
          await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i-1}.icon`, value: "" });
          await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i-1}.title`, value: "" });
          await updateSettingMutation.mutateAsync({ key: `enterpriseFeatureCards.${i-1}.description`, value: "" });
        }
      }

      toast({
        title: "Design settings saved",
        description: "The design settings have been updated successfully",
      });

      // Invalidate all queries that might use this data
      await queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });

      // Refetch settings data to update the form
      const fetchedSettings = await queryClient.fetchQuery({ queryKey: ["api/admin/settings"] });

      // Cast the settings to the correct type
      const settings = (fetchedSettings as Setting[]) || [];

      // Reset the form with updated values from the database
      const socialLinks = [
        ...(settings.find(s => s.key === "footer_github_url")?.value ? [{ platform: 'github' as SocialPlatform, url: settings.find(s => s.key === "footer_github_url")?.value }] : []),
        ...(settings.find(s => s.key === "footer_facebook_url")?.value ? [{ platform: 'facebook' as SocialPlatform, url: settings.find(s => s.key === "footer_facebook_url")?.value }] : []),
        ...(settings.find(s => s.key === "footer_discord_url")?.value ? [{ platform: 'discord' as SocialPlatform, url: settings.find(s => s.key === "footer_discord_url")?.value }] : []),
        ...(settings.find(s => s.key === "footer_linkedin_url")?.value ? [{ platform: 'linkedin' as SocialPlatform, url: settings.find(s => s.key === "footer_linkedin_url")?.value }] : []),
        ...(settings.find(s => s.key === "footer_youtube_url")?.value ? [{ platform: 'youtube' as SocialPlatform, url: settings.find(s => s.key === "footer_youtube_url")?.value }] : []),
        ...(settings.find(s => s.key === "footer_instagram_url")?.value ? [{ platform: 'instagram' as SocialPlatform, url: settings.find(s => s.key === "footer_instagram_url")?.value }] : []),
      ];

      // Completely reset the form with freshly loaded data from the database
      designForm.reset({
        // Footer settings
        footerDescription: getSettingValue("footer_description", "High-performance VPS hosting solutions with exceptional support and reliability.", settings),
        enableSocialIcons: getSettingValue("footer_social_icons_enabled", "true", settings) === "true",
        socialLinks,  // Use the freshly loaded social links
        contactEmail: getSettingValue("footer_contact_email", "support@skyvps360.xyz", settings),
        contactSupportText: getSettingValue("footer_contact_support_text", "24/7 Available", settings),
        contactPhone: getSettingValue("footer_contact_phone", "", settings),

        // Features section settings
        featuresHeading: getSettingValue("features_heading", "Why Choose SkyVPS360?", settings),
        featuresSubheading: getSettingValue("features_subheading", "Experience the perfect blend of performance, reliability, and affordability.", settings),
        featureCards: [
          {
            icon: (getSettingValue(`feature_icon_1`, "zap", settings) || "zap") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue(`feature_title_1`, "Lightning-Fast Performance", settings),
            description: getSettingValue(`feature_description_1`, "Experience blazing-fast speeds with our optimized infrastructure and SSD storage.", settings)
          },
          {
            icon: (getSettingValue(`feature_icon_2`, "shield", settings) || "shield") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue(`feature_title_2`, "Enterprise-Grade Security", settings),
            description: getSettingValue(`feature_description_2`, "Rest easy with advanced security measures protecting your servers 24/7.", settings)
          },
          {
            icon: (getSettingValue(`feature_icon_3`, "cpu", settings) || "cpu") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue(`feature_title_3`, "Cutting-Edge Technology", settings),
            description: getSettingValue(`feature_description_3`, "Built on the latest virtualization technology for reliability and performance.", settings)
          },
          {
            icon: (getSettingValue(`feature_icon_4`, "globe", settings) || "globe") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue(`feature_title_4`, "Global Network Reach", settings),
            description: getSettingValue(`feature_description_4`, "Strategic data center locations ensure minimal latency for your global audience.", settings)
          }
        ].filter((card, index) => getSettingValue(`feature_title_${index + 1}`, "", settings) !== "")
      });
    } catch (error: any) {
      toast({
        title: "Error saving footer settings",
        description: error.message || "Failed to save footer settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

        // Update form values when settings change
      useEffect(() => {
        if (settings.length > 0) {


          // Update Google Analytics form with settings
          googleAnalyticsForm.reset({
            googleAnalyticsEnabled: getSettingValue("google_analytics_enabled", "false") === "true",
            googleAnalyticsMeasurementId: getSettingValue("google_analytics_measurement_id", ""),
            googleAnalyticsEnhancedEcommerce: getSettingValue("google_analytics_enhanced_ecommerce", "false") === "true",
      
            googleAnalyticsEnabledPages: getSettingValue("google_analytics_enabled_pages", JSON.stringify([
              '/',
              '/dashboard',
              '/servers',
              '/billing',
              '/dns',
              '/blog',
              '/docs',
              '/plans',
              '/status',
              '/api-docs'
            ])),
          });

      // Update VirtFusion form with all settings
      virtFusionForm.reset({
        apiUrl: getSettingValue("virtfusion_api_url", "https://skyvps360.xyz/api/v1"),
        apiToken: getSettingValue("virtfusion_api_token", ""),
        sslVerify: getSettingValue("virtfusion_ssl_verify", "true") === "true",

        // Add user registration settings
        selfServiceValue: Number(getSettingValue("virtfusion_self_service", "1")) || 1,
        selfServiceHourlyCredit: getSettingValue("virtfusion_self_service_hourly_credit", "true") === "true",
        selfServiceHourlyResourcePackId: Number(getSettingValue("virtfusion_self_service_hourly_resource_pack_id", "1")) || 1,
        defaultResourcePackId: Number(getSettingValue("virtfusion_default_resource_pack_id", "1")) || 1,
      });

      // Update Billing form
      billingForm.reset({
        currency: getSettingValue("currency", "USD"),
        taxRate: getSettingValue("tax_rate", "0"),
      });



      // Update Email form
      emailForm.reset({
        smtpHost: getSettingValue("smtp_host", ""),
        smtpPort: getSettingValue("smtp_port", "587"),
        smtpUser: getSettingValue("smtp_user", ""),
        smtpPass: getSettingValue("smtp_pass", ""),
        emailFrom: getSettingValue("email_from", ""),
        emailName: getSettingValue("email_name", "VirtFusion Billing"),
      });

      // Update Loading Screen form
      loadingScreenForm.reset({
        enabled: getSettingValue("loading_screen_enabled", "true") === "true",
        animationDuration: parseInt(getSettingValue("loading_screen_animation_duration", "3000"), 10),
        minDuration: parseInt(getSettingValue("loading_screen_min_duration", "1000"), 10),
        showOnAllPages: getSettingValue("loading_screen_show_on_all_pages", "false") === "true",
      });

      // Update General form
      generalForm.reset({
        companyName: getSettingValue("company_name", "SkyVPS360"),
        platformName: getSettingValue("platform_name", "SkyVPS360 Client Portal"),
        supportEmail: getSettingValue("support_email", "support@skyvps360.xyz"),
        frontendUrl: getSettingValue("frontend_url", "https://skyvps360.xyz"),
        defaultTimezone: getSettingValue("default_timezone", "UTC"),
        dateFormat: getSettingValue("date_format", "MM/DD/YYYY"),
        primaryColor: getSettingValue("primary_color", "2563eb"),
        secondaryColor: getSettingValue("secondary_color", "10b981"),
        accentColor: getSettingValue("accent_color", "f59e0b"),
        platformServerCount: getSettingValue("platform_server_count", ""),
        platformHypervisorCount: getSettingValue("platform_hypervisor_count", ""),
        platformCpuCores: getSettingValue("platform_cpu_cores", ""),
        platformMemoryGB: getSettingValue("platform_memory_gb", ""),
      });

      // Update logo preview if logo exists - handle both file URLs and base64
      const logo = getSettingValue("company_logo", "");
      if (logo && !logoPreview) {
        // If it's a file URL, we'll display it directly (no preview needed)
        // If it's base64, we set it as preview for backward compatibility
        if (logo.startsWith('data:image/')) {
          setLogoPreview(logo);
        }
      }

      // Update Notifications form
      notificationsForm.reset({
        discordWebhookUrl: getSettingValue("discord_webhook_url", ""),
        discordRoleId: getSettingValue("discord_role_id", ""),
        discordBotEnabled: getSettingValue("discord_bot_enabled", "false") === "true",
        discordBotToken: getSettingValue("discord_bot_token", ""),
        discordGuildId: getSettingValue("discord_guild_id", ""),
        discordChannelId: getSettingValue("discord_channel_id", ""),
        discordAllowedRoleIds: getSettingValue("discord_allowed_role_ids", ""),
        discordAllowedUserIds: getSettingValue("discord_allowed_user_ids", ""),
      });

      // Update Maintenance form
      maintenanceForm.reset({
        enabled: getSettingValue("maintenance_mode", "false") === "true",
        message: getSettingValue("maintenance_message", "System is currently under maintenance."),
        estimatedCompletion: getSettingValue("maintenance_estimated_completion", ""),
      });

      // Load social media links from settings
      const socialLinks = [
        ...(getSettingValue("footer_github_url", "") ? [{ platform: 'github' as SocialPlatform, url: getSettingValue("footer_github_url", "") }] : []),
        ...(getSettingValue("footer_facebook_url", "") ? [{ platform: 'facebook' as SocialPlatform, url: getSettingValue("footer_facebook_url", "") }] : []),
        ...(getSettingValue("footer_discord_url", "") ? [{ platform: 'discord' as SocialPlatform, url: getSettingValue("footer_discord_url", "") }] : []),
        ...(getSettingValue("footer_linkedin_url", "") ? [{ platform: 'linkedin' as SocialPlatform, url: getSettingValue("footer_linkedin_url", "") }] : []),
        ...(getSettingValue("footer_youtube_url", "") ? [{ platform: 'youtube' as SocialPlatform, url: getSettingValue("footer_youtube_url", "") }] : []),
        ...(getSettingValue("footer_instagram_url", "") ? [{ platform: 'instagram' as SocialPlatform, url: getSettingValue("footer_instagram_url", "") }] : []),
      ];

      // Update Design form with footer settings
      designForm.reset({
        // Footer settings
        footerDescription: getSettingValue("footer_description", "High-performance VPS hosting solutions with exceptional support and reliability."),
        enableSocialIcons: getSettingValue("footer_social_icons_enabled", "true") === "true",
        socialLinks,
        contactEmail: getSettingValue("footer_contact_email", "support@example.com"),
        contactSupportText: getSettingValue("footer_contact_support_text", "24/7 Available"),
        contactPhone: getSettingValue("footer_contact_phone", "+1 (555) 123-4567"),

        // Features section settings
        featuresHeading: getSettingValue("features_heading", "Why Choose SkyVPS360?"),
        featuresSubheading: getSettingValue("features_subheading", "Experience the perfect blend of performance, reliability, and affordability."),
        featureCards: [
          {
            icon: (getSettingValue("feature_icon_1", "zap") || "zap") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("feature_title_1", "Lightning-Fast Performance"),
            description: getSettingValue("feature_description_1", "Experience blazing-fast speeds with our optimized infrastructure and SSD storage.")
          },
          {
            icon: (getSettingValue("feature_icon_2", "shield") || "shield") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("feature_title_2", "Enterprise-Grade Security"),
            description: getSettingValue("feature_description_2", "Rest easy with advanced security measures protecting your servers 24/7.")
          },
          {
            icon: (getSettingValue("feature_icon_3", "cpu") || "cpu") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("feature_title_3", "Cutting-Edge Technology"),
            description: getSettingValue("feature_description_3", "Built on the latest virtualization technology for reliability and performance.")
          },
          {
            icon: (getSettingValue("feature_icon_4", "globe") || "globe") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("feature_title_4", "Global Network Reach"),
            description: getSettingValue("feature_description_4", "Strategic data center locations ensure minimal latency for your global audience.")
          }
        ],

        // Enterprise-Grade Features section settings
        enterpriseFeaturesHeading: getSettingValue("enterprise_features_heading", "Enterprise-Grade Features"),
        enterpriseFeaturesSubheading: getSettingValue("enterprise_features_subheading", "Our platform delivers the performance, security, and flexibility you need to build and scale with confidence."),
        enterpriseFeatureCards: [
          {
            icon: (getSettingValue("enterprise_feature_icon_1", "zap") || "zap") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("enterprise_feature_title_1", "KVM Performance"),
            description: getSettingValue("enterprise_feature_description_1", "Leveraging powerful KVM virtualization and Network SATA for superior speed and responsiveness.")
          },
          {
            icon: (getSettingValue("enterprise_feature_icon_2", "cpu") || "cpu") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("enterprise_feature_title_2", "VirtFusion Control"),
            description: getSettingValue("enterprise_feature_description_2", "Manage your VPS effortlessly with our modern control panel: boot, reboot, reinstall, console access, and more.")
          },
          {
            icon: (getSettingValue("enterprise_feature_icon_3", "globe") || "globe") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("enterprise_feature_title_3", "Flexible Connectivity"),
            description: getSettingValue("enterprise_feature_description_3", "Get connected with NAT IPv4 (20 ports included) and a dedicated /80 IPv6 subnet for future-proofing.")
          },
          {
            icon: (getSettingValue("enterprise_feature_icon_4", "shield") || "shield") as 'zap' | 'cpu' | 'globe' | 'shield',
            title: getSettingValue("enterprise_feature_title_4", "Easy OS Deployment"),
            description: getSettingValue("enterprise_feature_description_4", "Quickly deploy your preferred operating system using a wide range of templates available via VirtFusion.")
          }
        ]
      });

      // Update Cloud pricing form
      cloudPricingForm.reset({
        cpuPricePerCore: getSettingValue("cloud_cpu_price_per_core", "0.00"),
        ramPricePerGB: getSettingValue("cloud_ram_price_per_gb", "0.00"),
        storagePricePerGB: getSettingValue("cloud_storage_price_per_gb", "0.00"),
        networkPricePerMbps: getSettingValue("cloud_network_price_per_mbps", "0.00"),
        natIpv4Price: getSettingValue("cloud_nat_ipv4_price", "0.00"),
        publicIpv4Price: getSettingValue("cloud_public_ipv4_price", "0.00"),
        publicIpv6Price: getSettingValue("cloud_public_ipv6_price", "0.00"),
        // Enable/disable toggles
        cpuPricingEnabled: getSettingValue("cloud_cpu_pricing_enabled", "true") === "true",
        ramPricingEnabled: getSettingValue("cloud_ram_pricing_enabled", "true") === "true",
        storagePricingEnabled: getSettingValue("cloud_storage_pricing_enabled", "true") === "true",
        networkPricingEnabled: getSettingValue("cloud_network_pricing_enabled", "true") === "true",
        natIpv4PricingEnabled: getSettingValue("cloud_nat_ipv4_pricing_enabled", "false") === "true",
        publicIpv4PricingEnabled: getSettingValue("cloud_public_ipv4_pricing_enabled", "false") === "true",
        publicIpv6PricingEnabled: getSettingValue("cloud_public_ipv6_pricing_enabled", "false") === "true",
      });

      // If maintenance mode is enabled, fetch the bypass token
      if (getSettingValue("maintenance_mode", "false") === "true") {
        fetchMaintenanceToken();
      }
    }
  }, [settings]); // Only depend on settings, not form objects

  // Handle VirtFusion API form submission
  const onVirtFusionSubmit = async (data: VirtFusionFormData) => {
    setSaveInProgress(true);

    try {
      // Save API connection settings
      await updateSettingMutation.mutateAsync({ key: "virtfusion_api_url", value: data.apiUrl });
      await updateSettingMutation.mutateAsync({ key: "virtfusion_api_token", value: data.apiToken });
      await updateSettingMutation.mutateAsync({ key: "virtfusion_ssl_verify", value: data.sslVerify.toString() });

      // Save user registration settings
      await updateSettingMutation.mutateAsync({ key: "virtfusion_self_service", value: data.selfServiceValue.toString() });
      await updateSettingMutation.mutateAsync({ key: "virtfusion_self_service_hourly_credit", value: data.selfServiceHourlyCredit.toString() });
      await updateSettingMutation.mutateAsync({ key: "virtfusion_self_service_hourly_resource_pack_id", value: data.selfServiceHourlyResourcePackId.toString() });
      await updateSettingMutation.mutateAsync({ key: "virtfusion_default_resource_pack_id", value: data.defaultResourcePackId.toString() });

      toast({
        title: "Settings saved",
        description: "VirtFusion API settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

  // Handle Billing form submission
  const onBillingSubmit = async (data: BillingFormData) => {
    setSaveInProgress(true);

    try {
      await updateSettingMutation.mutateAsync({ key: "currency", value: data.currency });
      await updateSettingMutation.mutateAsync({ key: "tax_rate", value: data.taxRate });

      toast({
        title: "Settings saved",
        description: "Billing settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };



  // Handle Email form submission
  const onEmailSubmit = async (data: EmailFormData) => {
    setSaveInProgress(true);

    try {
      await updateSettingMutation.mutateAsync({ key: "smtp_host", value: data.smtpHost });
      await updateSettingMutation.mutateAsync({ key: "smtp_port", value: data.smtpPort });
      await updateSettingMutation.mutateAsync({ key: "smtp_user", value: data.smtpUser });
      await updateSettingMutation.mutateAsync({ key: "smtp_pass", value: data.smtpPass });
      await updateSettingMutation.mutateAsync({ key: "email_from", value: data.emailFrom });
      await updateSettingMutation.mutateAsync({ key: "email_name", value: data.emailName });

      toast({
        title: "Settings saved",
        description: "Email settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

  // Handle Cloud pricing form submission
  const onCloudPricingSubmit = async (data: CloudPricingFormData) => {
    setSaveInProgress(true);

    try {
      // Save pricing values
      await updateSettingMutation.mutateAsync({ key: "cloud_cpu_price_per_core", value: data.cpuPricePerCore });
      await updateSettingMutation.mutateAsync({ key: "cloud_ram_price_per_gb", value: data.ramPricePerGB });
      await updateSettingMutation.mutateAsync({ key: "cloud_storage_price_per_gb", value: data.storagePricePerGB });
      await updateSettingMutation.mutateAsync({ key: "cloud_network_price_per_mbps", value: data.networkPricePerMbps });
      await updateSettingMutation.mutateAsync({ key: "cloud_nat_ipv4_price", value: data.natIpv4Price });
      await updateSettingMutation.mutateAsync({ key: "cloud_public_ipv4_price", value: data.publicIpv4Price });
      await updateSettingMutation.mutateAsync({ key: "cloud_public_ipv6_price", value: data.publicIpv6Price });

      // Save enable/disable toggles
      await updateSettingMutation.mutateAsync({ key: "cloud_cpu_pricing_enabled", value: data.cpuPricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_ram_pricing_enabled", value: data.ramPricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_storage_pricing_enabled", value: data.storagePricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_network_pricing_enabled", value: data.networkPricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_nat_ipv4_pricing_enabled", value: data.natIpv4PricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_public_ipv4_pricing_enabled", value: data.publicIpv4PricingEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "cloud_public_ipv6_pricing_enabled", value: data.publicIpv6PricingEnabled.toString() });

      toast({
        title: "Settings saved",
        description: "Cloud pricing settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };





  // Handle Google Analytics form submission
  const onGoogleAnalyticsSubmit = async (data: GoogleAnalyticsFormData) => {
    setSaveInProgress(true);

    try {
      // Save Google Analytics settings
      await updateSettingMutation.mutateAsync({ key: "google_analytics_enabled", value: data.googleAnalyticsEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "google_analytics_measurement_id", value: data.googleAnalyticsMeasurementId || "" });
      await updateSettingMutation.mutateAsync({ key: "google_analytics_enhanced_ecommerce", value: data.googleAnalyticsEnhancedEcommerce.toString() });
      
      // Convert newline-separated string to JSON array for enabled pages
      const enabledPages = data.googleAnalyticsEnabledPages
        ? data.googleAnalyticsEnabledPages
            .split('\n')
            .map(page => page.trim())
            .filter(page => page.length > 0)
        : [];
      
      await updateSettingMutation.mutateAsync({ 
        key: "google_analytics_enabled_pages", 
        value: JSON.stringify(enabledPages)
      });

      toast({
        title: "Settings saved",
        description: data.googleAnalyticsEnabled 
          ? "Google Analytics settings have been updated. Analytics tracking is now active."
          : "Google Analytics settings have been updated. Analytics tracking is now disabled.",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };



  // Handle General settings form submission
  const onGeneralSubmit = async (data: GeneralFormData) => {
    setSaveInProgress(true);

    try {
      await updateSettingMutation.mutateAsync({ key: "company_name", value: data.companyName });
      await updateSettingMutation.mutateAsync({ key: "platform_name", value: data.platformName });
      await updateSettingMutation.mutateAsync({ key: "support_email", value: data.supportEmail });
      await updateSettingMutation.mutateAsync({ key: "frontend_url", value: data.frontendUrl });
      await updateSettingMutation.mutateAsync({ key: "default_timezone", value: data.defaultTimezone });
      await updateSettingMutation.mutateAsync({ key: "date_format", value: data.dateFormat });

      // Check if brand colors have changed
      const oldPrimaryColor = getSettingValue("primary_color", "2563eb");
      const oldSecondaryColor = getSettingValue("secondary_color", "10b981");
      const oldAccentColor = getSettingValue("accent_color", "f59e0b");

      const colorChanged =
        oldPrimaryColor !== data.primaryColor ||
        oldSecondaryColor !== data.secondaryColor ||
        oldAccentColor !== data.accentColor;

      // Update brand colors
      await updateSettingMutation.mutateAsync({ key: "primary_color", value: data.primaryColor });
      await updateSettingMutation.mutateAsync({ key: "secondary_color", value: data.secondaryColor });
      await updateSettingMutation.mutateAsync({ key: "accent_color", value: data.accentColor });

      // Update platform statistics
      await updateSettingMutation.mutateAsync({ key: "platform_server_count", value: data.platformServerCount || "" });
      await updateSettingMutation.mutateAsync({ key: "platform_hypervisor_count", value: data.platformHypervisorCount || "" });

      // Update cache for both settings and platform stats
      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/platform-stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/branding"] });

      // Show different toast message if colors were changed
      if (colorChanged) {
        toast({
          title: "Brand colors updated",
          description: "A full page reload is required to see all color changes. Reload now?",
          action: (
            <ToastAction altText="Reload" onClick={() => {
              // Force a cache invalidation reload
              window.location.reload();
            }}>
              Reload
            </ToastAction>
          ),
          duration: 10000, // Show for 10 seconds to give user time to click
        });
      } else {
        toast({
          title: "Settings saved",
          description: "General settings have been updated",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

  // Handle Notifications settings form submission
  const onNotificationsSubmit = async (data: NotificationsFormData) => {
    setSaveInProgress(true);

    try {
      // Discord webhook settings
      await updateSettingMutation.mutateAsync({ key: "discord_webhook_url", value: data.discordWebhookUrl });
      await updateSettingMutation.mutateAsync({ key: "discord_role_id", value: data.discordRoleId || "" });

      // Discord bot settings
      await updateSettingMutation.mutateAsync({ key: "discord_bot_enabled", value: data.discordBotEnabled.toString() });
      await updateSettingMutation.mutateAsync({ key: "discord_bot_token", value: data.discordBotToken });
      await updateSettingMutation.mutateAsync({ key: "discord_guild_id", value: data.discordGuildId });
      await updateSettingMutation.mutateAsync({ key: "discord_channel_id", value: data.discordChannelId });

      // Discord bot permission settings
      await updateSettingMutation.mutateAsync({ key: "discord_allowed_role_ids", value: data.discordAllowedRoleIds || "" });
      await updateSettingMutation.mutateAsync({ key: "discord_allowed_user_ids", value: data.discordAllowedUserIds || "" });

      toast({
        title: "Settings saved",
        description: "Notification settings have been updated",
      });

      queryClient.invalidateQueries({ queryKey: ["api/admin/settings"] });
    } catch (error: any) {
      toast({
        title: "Error saving settings",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaveInProgress(false);
    }
  };

  // Handle testing VirtFusion API connection
  const handleTestConnection = async () => {
    setTestConnectionInProgress(true);
    try {
      await testConnectionMutation.mutateAsync();
    } catch (error) {
      console.error("Error testing connection:", error);
    } finally {
      setTestConnectionInProgress(false);
    }
  };

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">System Settings</h1>
        <p className="text-gray-500 mt-1">Configure your billing panel settings</p>
      </div>

      {/* Settings Tabs */}
      <Card key={themeKey} className="bg-card border-border">
        <CardHeader className="border-b border-border px-6 bg-card">
          <h2 className="text-lg font-semibold text-card-foreground">Settings</h2>
        </CardHeader>

        {isLoading ? (
          <CardContent className="p-6 bg-card">
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2 text-card-foreground">Loading settings...</p>
            </div>
          </CardContent>
        ) : (
          <CardContent className="p-6 bg-card">
            <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab}>
              {/* Responsive Navigation */}
              {isMobile ? (
                // Mobile: Dropdown navigation
                <div className="mb-6 max-w-xs">
                  <style>{`
                    .settings-select-trigger {
                      border-color: ${brandColors.primary.full} !important;
                      box-shadow: 0 0 0 1px ${brandColors.primary.light} !important;
                    }
                    .settings-select-trigger:hover {
                      border-color: ${brandColors.primary.full} !important;
                    }
                    .settings-select-trigger:focus {
                      box-shadow: 0 0 0 2px ${brandColors.primary.light} !important;
                    }
                    .settings-select-item[data-selected] {
                      background-color: ${brandColors.primary.lighter} !important;
                      color: ${brandColors.primary.full} !important;
                    }
                    .settings-select-item:hover {
                      background-color: ${brandColors.primary.extraLight} !important;
                    }
                    .settings-select-item:focus {
                      background-color: ${brandColors.primary.lighter} !important;
                    }
                  `}</style>
                  <Select
                    value={activeTab}
                    onValueChange={setActiveTab}
                  >
                    <SelectTrigger className="w-full focus:ring-2 settings-select-trigger">
                      <SelectValue placeholder="Select a setting category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {settingsOptions
                        // Filter out the tickets option from the dropdown but keep it in the array for the tab
                        .filter((option) => option.value !== "tickets")
                        .map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          className="settings-select-item"
                        >
                          <div className="flex items-center">
                            {option.icon}
                            <span className="ml-2">{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                // Desktop: Horizontal tab navigation
                <div className="mb-6">
                  <TabsList className="grid w-full grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 h-auto bg-muted p-1">
                    {settingsOptions
                      .filter((option) => option.value !== "tickets")
                      .map((option) => (
                        <TabsTrigger
                          key={option.value}
                          value={option.value}
                          className="flex flex-col items-center justify-center gap-1 h-auto py-3 px-2 text-xs data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                        >
                          <div className="flex items-center justify-center w-5 h-5">
                            {option.icon}
                          </div>
                          <span className="text-center leading-tight">{option.label}</span>
                        </TabsTrigger>
                      ))}
                  </TabsList>
                </div>
              )}

              <TabsContent value="virtfusion">
                <form onSubmit={virtFusionForm.handleSubmit(onVirtFusionSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">VirtFusion API Connection</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure the connection to your VirtFusion instance for server management
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="apiUrl">API URL</Label>
                        <Input
                          id="apiUrl"
                          placeholder="https://skyvps360.xyz/api/v1"
                          {...virtFusionForm.register("apiUrl")}
                        />
                        {virtFusionForm.formState.errors.apiUrl && (
                          <p className="text-sm text-destructive mt-1">
                            {virtFusionForm.formState.errors.apiUrl.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          The URL of your VirtFusion API endpoint
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiToken">API Token</Label>
                        <Input
                          id="apiToken"
                          type="password"
                          placeholder="Enter only the token value (without Bearer prefix)"
                          {...virtFusionForm.register("apiToken")}
                        />
                        {virtFusionForm.formState.errors.apiToken && (
                          <p className="text-sm text-destructive mt-1">
                            {virtFusionForm.formState.errors.apiToken.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Enter only the token value without the "Bearer" prefix - the system will add it automatically
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="sslVerify">Verify SSL Certificate</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable SSL certificate verification
                          </p>
                        </div>
                        <Switch
                          id="sslVerify"
                          checked={virtFusionForm.watch("sslVerify")}
                          onCheckedChange={(checked) => virtFusionForm.setValue("sslVerify", checked)}
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* User Creation Settings */}
                    <div>
                      <h3 className="text-lg font-medium">VirtFusion User Creation Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure how users are created in VirtFusion when they sign up
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="selfServiceValue">Self Service Value</Label>
                        <Select
                          value={String(virtFusionForm.watch("selfServiceValue") ?? 1)}
                          onValueChange={(value) => virtFusionForm.setValue("selfServiceValue", parseInt(value), { shouldDirty: true })}
                        >
                          <SelectTrigger id="selfServiceValue" className="w-full">
                            <SelectValue placeholder="Select self service value" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">0 - Disabled (No hourly billing)</SelectItem>
                            <SelectItem value="1">1 - Enabled (Hourly billing enabled)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          Controls whether users can use hourly billing in VirtFusion
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="selfServiceHourlyCredit">Self Service Hourly Credit</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable hourly credit billing for self-service users
                          </p>
                        </div>
                        <Switch
                          id="selfServiceHourlyCredit"
                          checked={virtFusionForm.watch("selfServiceHourlyCredit")}
                          onCheckedChange={(checked) => virtFusionForm.setValue("selfServiceHourlyCredit", checked, { shouldDirty: true })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="selfServiceHourlyResourcePackId">Self Service Hourly Resource Pack ID</Label>
                        <Input
                          id="selfServiceHourlyResourcePackId"
                          type="number"
                          min="1"
                          step="1"
                          value={virtFusionForm.watch("selfServiceHourlyResourcePackId") ?? 1}
                          onChange={(e) => virtFusionForm.setValue("selfServiceHourlyResourcePackId", parseInt(e.target.value) || 1, { shouldDirty: true })}
                        />
                        {virtFusionForm.formState.errors.selfServiceHourlyResourcePackId && (
                          <p className="text-sm text-destructive mt-1">
                            {virtFusionForm.formState.errors.selfServiceHourlyResourcePackId.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          ID of the resource pack to use for hourly billing (default: 1)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="defaultResourcePackId">Default Resource Pack ID</Label>
                        <Input
                          id="defaultResourcePackId"
                          type="number"
                          min="1"
                          step="1"
                          value={virtFusionForm.watch("defaultResourcePackId") ?? 1}
                          onChange={(e) => virtFusionForm.setValue("defaultResourcePackId", parseInt(e.target.value) || 1, { shouldDirty: true })}
                        />
                        {virtFusionForm.formState.errors.defaultResourcePackId && (
                          <p className="text-sm text-destructive mt-1">
                            {virtFusionForm.formState.errors.defaultResourcePackId.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          ID of the default resource pack assigned to new users (default: 1)
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-between">
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-auto"
                          onClick={handleTestConnection}
                          disabled={testConnectionInProgress ||
                            !virtFusionForm.getValues().apiUrl ||
                            !virtFusionForm.getValues().apiToken}
                        >
                          {testConnectionInProgress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Test VirtFusion Connection
                            </>
                          )}
                        </Button>
                      </div>
                      <div>
                        <Button
                          type="submit"
                          className="w-32"
                          disabled={saveInProgress || !virtFusionForm.formState.isDirty}
                        >
                          {saveInProgress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>



              <TabsContent value="dns">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">DNS Management Settings</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure DNS billing automation and InterServer settings
                    </p>
                  </div>

                  {/* DNS Overview Documentation */}
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                      <Info className="h-4 w-4 mr-2" />
                      DNS Management Overview
                    </h4>
                    <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                      <div>
                        <strong>What is DNS Management?</strong>
                        <p className="mt-1">
                          DNS (Domain Name System) management allows your customers to manage their domain names and DNS records through your platform. 
                          This includes creating, editing, and deleting DNS records like A, CNAME, MX, TXT, and more.
                        </p>
                      </div>
                      
                      <div>
                        <strong>How it works:</strong>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                          <li>Customers purchase DNS plans with specific limits (domains, records)</li>
                          <li>They can add domains and manage DNS records through the user dashboard</li>
                          <li>Automated billing charges customers monthly for their DNS subscriptions</li>
                          <li>DNS records are managed through InterServer's API infrastructure</li>
                        </ul>
                      </div>

                      <div>
                        <strong>Key Features:</strong>
                        <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                          <li>White-labeled DNS management service</li>
                          <li>Automated monthly billing with VirtFusion integration</li>
                          <li>Real-time DNS record management</li>
                          <li>Plan-based limits and restrictions</li>
                          <li>Professional nameservers (cdns.ns1.skyvps360.xyz, etc.)</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* DNS Billing Automation Section */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">DNS Billing Automation</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure automated monthly billing for DNS plans using VirtFusion tokens
                      </p>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-sm font-medium">Automated Monthly Billing</Label>
                          <p className="text-xs text-muted-foreground">
                            Automatically charge users on the 1st of each month
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            💡 This uses VirtFusion tokens to charge customers for their DNS plan subscriptions
                          </p>
                        </div>
                        <Switch
                          checked={dnsBillingData?.cronStatus?.dnsBilling?.enabled || false}
                          onCheckedChange={async (checked) => {
                            try {
                              await apiRequest("/api/admin/cron/dns-billing", {
                                method: "POST",
                                body: { enabled: checked }
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["/api/admin/cron/status"],
                                exact: true
                              });
                              toast({
                                title: "Settings updated",
                                description: `DNS billing automation ${checked ? 'enabled' : 'disabled'}`,
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message,
                                variant: "destructive",
                              });
                            }
                          }}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Schedule</Label>
                          <p className="text-sm">{dnsBillingData?.cronStatus?.dnsBilling?.schedule || '0 2 1 * *'}</p>
                          <p className="text-xs text-muted-foreground">Runs at 2 AM on the 1st of each month</p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            ⏰ Cron format: minute hour day month day-of-week
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-muted-foreground">Status</Label>
                          <p className="text-sm flex items-center">
                            {dnsBillingData?.cronStatus?.dnsBilling?.isRunning ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                Running
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1 text-red-500" />
                                Stopped
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {dnsBillingData?.cronStatus?.dnsBilling?.isRunning 
                              ? "Billing automation is active and will process charges automatically"
                              : "Billing automation is disabled - no automatic charges will be processed"
                            }
                          </p>
                        </div>
                      </div>

                      {dnsBillingData?.dnsStats && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                          <div className="text-center">
                            <p className="text-lg font-semibold">{dnsBillingData.dnsStats.totalActiveSubscriptions}</p>
                            <p className="text-xs text-muted-foreground">Active Subscriptions</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Customers with active DNS plans</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">{dnsBillingData.dnsStats.subscriptionsDueToday}</p>
                            <p className="text-xs text-muted-foreground">Due Today</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Subscriptions that will be charged today</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">{dnsBillingData.dnsStats.suspendedSubscriptions}</p>
                            <p className="text-xs text-muted-foreground">Suspended</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Subscriptions with payment issues</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-semibold">${dnsBillingData.dnsStats.totalMonthlyRevenue?.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Monthly Revenue</p>
                            <p className="text-xs text-blue-600 dark:text-blue-400">Total revenue from DNS subscriptions</p>
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await apiRequest("/api/admin/cron/dns-billing/trigger", {
                                method: "POST"
                              });
                              queryClient.invalidateQueries({
                                queryKey: ["/api/admin/cron/status"],
                                exact: true
                              });
                              toast({
                                title: "Success",
                                description: "DNS billing renewal triggered successfully",
                              });
                            } catch (error: any) {
                              toast({
                                title: "Error",
                                description: error.message,
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <DollarSign className="h-3 w-3 mr-1" />
                          Trigger Now
                        </Button>
                        <div className="text-xs text-muted-foreground flex items-center">
                          💡 Manually trigger billing for testing or immediate processing
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="google-analytics">
                <form onSubmit={googleAnalyticsForm.handleSubmit(onGoogleAnalyticsSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Google Analytics Integration</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure Google Analytics 4 (GA4) tracking for your website
                      </p>
                    </div>

                    {/* Setup Documentation */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">📋 Setup Instructions</h4>
                      <div className="space-y-3 text-sm text-blue-800 dark:text-blue-200">
                        <div>
                          <strong>Step 1: Create Google Analytics 4 Property</strong>
                          <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                            <li>Go to <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline">Google Analytics</a></li>
                            <li>Create a new GA4 property for your website</li>
                            <li>Set up data streams for your domain</li>
                            <li>Copy your Measurement ID (starts with "G-")</li>
                          </ul>
                        </div>
                        


                        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded p-2 mt-3">
                          <strong>💡 Pro Tips:</strong>
                          <ul className="list-disc list-inside mt-1 ml-2 space-y-1">
                            <li>Use the same GA4 property across all your domains</li>
                            <li>Set up conversion goals for important user actions</li>
                            <li>Monitor your data in real-time to verify tracking</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="googleAnalyticsEnabled">Enable Google Analytics</Label>
                          <p className="text-sm text-muted-foreground">
                            Enable Google Analytics 4 tracking on your website
                          </p>
                        </div>
                        <Switch
                          id="googleAnalyticsEnabled"
                          checked={googleAnalyticsForm.watch("googleAnalyticsEnabled")}
                          onCheckedChange={(checked) => googleAnalyticsForm.setValue("googleAnalyticsEnabled", checked, { shouldDirty: true })}
                        />
                      </div>

                      {googleAnalyticsForm.watch("googleAnalyticsEnabled") && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="googleAnalyticsMeasurementId">Measurement ID</Label>
                              <Input
                                id="googleAnalyticsMeasurementId"
                                placeholder="G-XXXXXXXXXX"
                                {...googleAnalyticsForm.register("googleAnalyticsMeasurementId")}
                              />
                              {googleAnalyticsForm.formState.errors.googleAnalyticsMeasurementId && (
                                <p className="text-sm text-destructive mt-1">
                                  {googleAnalyticsForm.formState.errors.googleAnalyticsMeasurementId.message}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground mt-1">
                                Your GA4 Measurement ID (found in your Google Analytics property settings)
                                <br />
                                <span className="text-xs text-blue-600 dark:text-blue-400">
                                  💡 Found in Admin → Property Settings → Data Streams
                                </span>
                              </p>
                            </div>
                          </div>

                          <Separator />

                          <div>
                            <h4 className="text-md font-medium mb-4">Advanced Configuration</h4>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                  <Label htmlFor="googleAnalyticsEnhancedEcommerce">Enhanced Ecommerce</Label>
                                  <p className="text-sm text-muted-foreground">
                                    Enable enhanced ecommerce tracking for detailed purchase analytics
                                  </p>
                                </div>
                                <Switch
                                  id="googleAnalyticsEnhancedEcommerce"
                                  checked={googleAnalyticsForm.watch("googleAnalyticsEnhancedEcommerce")}
                                  onCheckedChange={(checked) => googleAnalyticsForm.setValue("googleAnalyticsEnhancedEcommerce", checked, { shouldDirty: true })}
                                />
                              </div>

                              {googleAnalyticsForm.watch("googleAnalyticsEnhancedEcommerce") && (
                                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                                  <h5 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">🛒 Enhanced Ecommerce Tracking</h5>
                                  <p className="text-sm text-green-800 dark:text-green-200">
                                    When enabled, SkyPANEL will automatically track:
                                  </p>
                                  <ul className="list-disc list-inside mt-2 text-sm text-green-800 dark:text-green-200 space-y-1">
                                    <li>Product views and interactions</li>
                                    <li>Shopping cart additions and removals</li>
                                    <li>Checkout process steps</li>
                                    <li>Purchase transactions and revenue</li>
                                    <li>Product performance metrics</li>
                                  </ul>
                                  <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                                    💡 Requires proper GA4 ecommerce setup in your Google Analytics property
                                  </p>
                                </div>
                              )}



                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="googleAnalyticsEnabledPages">Enabled Pages</Label>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    Select which pages should have Google Analytics enabled. Use one page path per line.
                                  </p>
                                  <Textarea
                                    id="googleAnalyticsEnabledPages"
                                    placeholder="/&#10;/dashboard&#10;/servers&#10;/billing&#10;/dns&#10;/blog&#10;/docs&#10;/plans&#10;/status&#10;/api-docs"
                                    className="mt-2 font-mono text-sm"
                                    rows={8}
                                    {...googleAnalyticsForm.register("googleAnalyticsEnabledPages")}
                                  />
                                  {googleAnalyticsForm.formState.errors.googleAnalyticsEnabledPages && (
                                    <p className="text-sm text-destructive mt-1">
                                      {googleAnalyticsForm.formState.errors.googleAnalyticsEnabledPages.message}
                                    </p>
                                  )}
                                  <div className="mt-2 text-xs text-muted-foreground">
                                    <p className="font-semibold mb-1">Format examples:</p>
                                    <ul className="list-disc list-inside space-y-1">
                                      <li><code>/</code> - Landing page only</li>
                                      <li><code>/dashboard</code> - Dashboard page only</li>
                                      <li><code>/servers*</code> - All server pages (wildcard)</li>
                                      <li><code>/admin/</code> - All admin pages (prefix)</li>
                                    </ul>
                                  </div>

                                  <div className="mt-4">
                                    <p className="text-sm font-medium mb-2">Quick Presets:</p>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const commonPages = [
                                            '/',
                                            '/dashboard',
                                            '/servers',
                                            '/billing',
                                            '/dns',
                                            '/blog',
                                            '/docs',
                                            '/plans',
                                            '/status',
                                            '/api-docs'
                                          ];
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", commonPages.join('\n'), { shouldDirty: true });
                                        }}
                                      >
                                        Common Pages
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const allPages = [
                                            '/',
                                            '/dashboard',
                                            '/servers',
                                            '/servers/*',
                                            '/billing',
                                            '/billing/*',
                                            '/dns',
                                            '/dns/*',
                                            '/blog',
                                            '/blog/*',
                                            '/docs',
                                            '/docs/*',
                                            '/plans',
                                            '/plans/*',
                                            '/status',
                                            '/api-docs',
                                            '/tickets',
                                            '/tickets/*',
                                            '/teams',
                                            '/teams/*',
                                            '/profile',
                                            '/profile/*'
                                          ];
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", allPages.join('\n'), { shouldDirty: true });
                                        }}
                                      >
                                        All Pages
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const adminPages = [
                                            '/admin',
                                            '/admin/*'
                                          ];
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", adminPages.join('\n'), { shouldDirty: true });
                                        }}
                                      >
                                        Admin Only
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const publicPages = [
                                            '/',
                                            '/plans',
                                            '/status',
                                            '/blog',
                                            '/docs',
                                            '/api-docs'
                                          ];
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", publicPages.join('\n'), { shouldDirty: true });
                                        }}
                                      >
                                        Public Only
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const userPages = [
                                            '/dashboard',
                                            '/servers',
                                            '/servers/*',
                                            '/billing',
                                            '/billing/*',
                                            '/dns',
                                            '/dns/*',
                                            '/tickets',
                                            '/tickets/*',
                                            '/teams',
                                            '/teams/*',
                                            '/profile',
                                            '/profile/*'
                                          ];
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", userPages.join('\n'), { shouldDirty: true });
                                        }}
                                      >
                                        User Pages
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          googleAnalyticsForm.setValue("googleAnalyticsEnabledPages", "", { shouldDirty: true });
                                        }}
                                      >
                                        Clear All
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="flex justify-between items-center">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={async () => {
                            try {
                              setTestConnectionInProgress(true);
                              const response = await apiRequest('/api/admin/settings/google-analytics/test-connection', {
                                method: 'POST'
                              });
                              
                              if (response.success) {
                                toast({
                                  title: "Connection successful",
                                  description: response.message,
                                });
                              } else {
                                toast({
                                  title: "Connection failed",
                                  description: response.message,
                                  variant: "destructive",
                                });
                              }
                            } catch (error: any) {
                              toast({
                                title: "Connection failed",
                                description: error.message || "Failed to test connection",
                                variant: "destructive",
                              });
                            } finally {
                              setTestConnectionInProgress(false);
                            }
                          }}
                          disabled={testConnectionInProgress || !googleAnalyticsForm.watch("googleAnalyticsEnabled")}
                        >
                          {testConnectionInProgress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Test Connection
                            </>
                          )}
                        </Button>

                        <Button
                          type="submit"
                          className="w-32"
                          disabled={saveInProgress || !googleAnalyticsForm.formState.isDirty}
                        >
                          {saveInProgress ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Save
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="billing">
                <form onSubmit={billingForm.handleSubmit(onBillingSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">General Billing Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure general billing settings
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          placeholder="USD"
                          {...billingForm.register("currency")}
                        />
                        {billingForm.formState.errors.currency && (
                          <p className="text-sm text-destructive mt-1">
                            {billingForm.formState.errors.currency.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Three-letter currency code (e.g., USD, EUR)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="taxRate">Tax Rate (%)</Label>
                        <Input
                          id="taxRate"
                          placeholder="0.00"
                          {...billingForm.register("taxRate")}
                        />
                        {billingForm.formState.errors.taxRate && (
                          <p className="text-sm text-destructive mt-1">
                            {billingForm.formState.errors.taxRate.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Tax rate percentage (e.g., 10 for 10%)
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress || !billingForm.formState.isDirty}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="email">
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">SMTP Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure your email sending settings
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="smtpHost">SMTP Host</Label>
                        <Input
                          id="smtpHost"
                          placeholder="smtp.example.com"
                          {...emailForm.register("smtpHost")}
                        />
                        {emailForm.formState.errors.smtpHost && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.smtpHost.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input
                          id="smtpPort"
                          placeholder="587"
                          {...emailForm.register("smtpPort")}
                        />
                        {emailForm.formState.errors.smtpPort && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.smtpPort.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpUser">SMTP Username</Label>
                        <Input
                          id="smtpUser"
                          placeholder="username"
                          {...emailForm.register("smtpUser")}
                        />
                        {emailForm.formState.errors.smtpUser && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.smtpUser.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="smtpPass">SMTP Password</Label>
                        <Input
                          id="smtpPass"
                          type="password"
                          placeholder="password"
                          {...emailForm.register("smtpPass")}
                        />
                        {emailForm.formState.errors.smtpPass && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.smtpPass.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="emailFrom">From Email</Label>
                        <Input
                          id="emailFrom"
                          placeholder="noreply@example.com"
                          {...emailForm.register("emailFrom")}
                        />
                        {emailForm.formState.errors.emailFrom && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.emailFrom.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="emailName">From Name</Label>
                        <Input
                          id="emailName"
                          placeholder="VirtFusion Billing"
                          {...emailForm.register("emailName")}
                        />
                        {emailForm.formState.errors.emailName && (
                          <p className="text-sm text-destructive mt-1">
                            {emailForm.formState.errors.emailName.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress || !emailForm.formState.isDirty}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>



              <TabsContent value="cloud">
                <form onSubmit={cloudPricingForm.handleSubmit(onCloudPricingSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Cloud Pricing Configuration</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Set pricing per resource unit for cloud server configurations
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="cpuPricePerCore">CPU Price per Core</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="cpuPricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("cpuPricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="cpuPricingEnabled"
                              checked={cloudPricingForm.watch("cpuPricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("cpuPricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="cpuPricePerCore"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("cpuPricingEnabled")}
                            {...cloudPricingForm.register("cpuPricePerCore")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.cpuPricePerCore && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.cpuPricePerCore.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per CPU core per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="ramPricePerGB">RAM Price per GB</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="ramPricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("ramPricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="ramPricingEnabled"
                              checked={cloudPricingForm.watch("ramPricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("ramPricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="ramPricePerGB"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("ramPricingEnabled")}
                            {...cloudPricingForm.register("ramPricePerGB")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.ramPricePerGB && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.ramPricePerGB.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per GB of RAM per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="storagePricePerGB">Storage Price per GB</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="storagePricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("storagePricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="storagePricingEnabled"
                              checked={cloudPricingForm.watch("storagePricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("storagePricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="storagePricePerGB"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("storagePricingEnabled")}
                            {...cloudPricingForm.register("storagePricePerGB")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.storagePricePerGB && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.storagePricePerGB.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per GB of storage per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="networkPricePerMbps">Network Price per Mbps</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="networkPricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("networkPricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="networkPricingEnabled"
                              checked={cloudPricingForm.watch("networkPricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("networkPricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="networkPricePerMbps"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("networkPricingEnabled")}
                            {...cloudPricingForm.register("networkPricePerMbps")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.networkPricePerMbps && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.networkPricePerMbps.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per Mbps of network bandwidth per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="natIpv4Price">NAT IPv4 Price</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="natIpv4PricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("natIpv4PricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="natIpv4PricingEnabled"
                              checked={cloudPricingForm.watch("natIpv4PricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("natIpv4PricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="natIpv4Price"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("natIpv4PricingEnabled")}
                            {...cloudPricingForm.register("natIpv4Price")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.natIpv4Price && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.natIpv4Price.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per additional NAT IPv4 address per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="publicIpv4Price">Public IPv4 Price</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="publicIpv4PricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("publicIpv4PricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="publicIpv4PricingEnabled"
                              checked={cloudPricingForm.watch("publicIpv4PricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("publicIpv4PricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="publicIpv4Price"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("publicIpv4PricingEnabled")}
                            {...cloudPricingForm.register("publicIpv4Price")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.publicIpv4Price && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.publicIpv4Price.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per additional public IPv4 address per hour
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="publicIpv6Price">Public IPv6 Price</Label>
                          <div className="flex items-center space-x-2">
                            <Label htmlFor="publicIpv6PricingEnabled" className="text-sm text-muted-foreground">
                              {cloudPricingForm.watch("publicIpv6PricingEnabled") ? "Enabled" : "Disabled"}
                            </Label>
                            <Switch
                              id="publicIpv6PricingEnabled"
                              checked={cloudPricingForm.watch("publicIpv6PricingEnabled")}
                              onCheckedChange={(checked) => cloudPricingForm.setValue("publicIpv6PricingEnabled", checked, { shouldDirty: true })}
                            />
                          </div>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">$</span>
                          <Input
                            id="publicIpv6Price"
                            placeholder="0.00"
                            className="pl-8"
                            disabled={!cloudPricingForm.watch("publicIpv6PricingEnabled")}
                            {...cloudPricingForm.register("publicIpv6Price")}
                          />
                        </div>
                        {cloudPricingForm.formState.errors.publicIpv6Price && (
                          <p className="text-sm text-destructive mt-1">
                            {cloudPricingForm.formState.errors.publicIpv6Price.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Price charged per additional public IPv6 /80 subnet per hour
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center">
                        <Cloud className="h-4 w-4 mr-2" />
                        Pricing Preview (Enabled Options Only)
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        {cloudPricingForm.watch("cpuPricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">CPU:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("cpuPricePerCore") || "0.00"}/core/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("ramPricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">RAM:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("ramPricePerGB") || "0.00"}/GB/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("storagePricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">Storage:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("storagePricePerGB") || "0.00"}/GB/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("networkPricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">Network:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("networkPricePerMbps") || "0.00"}/Mbps/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("natIpv4PricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">NAT IPv4:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("natIpv4Price") || "0.00"}/IP/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("publicIpv4PricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">Public IPv4:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("publicIpv4Price") || "0.00"}/IP/hr
                            </span>
                          </div>
                        )}
                        {cloudPricingForm.watch("publicIpv6PricingEnabled") && (
                          <div>
                            <span className="text-muted-foreground">Public IPv6:</span>
                            <span className="ml-2 font-mono">
                              ${cloudPricingForm.watch("publicIpv6Price") || "0.00"}/80 subnet/hr
                            </span>
                          </div>
                        )}
                      </div>
                      {!cloudPricingForm.watch("cpuPricingEnabled") &&
                       !cloudPricingForm.watch("ramPricingEnabled") &&
                       !cloudPricingForm.watch("storagePricingEnabled") &&
                       !cloudPricingForm.watch("networkPricingEnabled") &&
                       !cloudPricingForm.watch("natIpv4PricingEnabled") &&
                       !cloudPricingForm.watch("publicIpv4PricingEnabled") &&
                       !cloudPricingForm.watch("publicIpv6PricingEnabled") && (
                        <p className="text-muted-foreground text-center py-4">
                          No pricing options are currently enabled
                        </p>
                      )}
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress || !cloudPricingForm.formState.isDirty}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="general">
                <form onSubmit={generalForm.handleSubmit(onGeneralSubmit)}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">General Settings</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure general application settings
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Platform Branding</h4>
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="companyName">Company Name</Label>
                          <Input
                            id="companyName"
                            placeholder="Your Company Name"
                            {...generalForm.register("companyName")}
                          />
                          {generalForm.formState.errors.companyName && (
                            <p className="text-sm text-destructive mt-1">
                              {generalForm.formState.errors.companyName.message}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            This name will appear throughout the application
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="companyLogo">Company Logo</Label>
                          <div className="flex flex-col space-y-4">
                            {/* Current Logo Display */}
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-3">
                                <div
                                  className="flex items-center justify-center h-16 w-16 rounded-lg border-2 border-dashed border-gray-300"
                                  style={{
                                    backgroundColor: currentLogo || logoPreview ? 'transparent' : brandColors.primary.full
                                  }}
                                >
                                  {currentLogo || logoPreview ? (
                                    <img
                                      src={logoPreview || currentLogo}
                                      alt="Company Logo"
                                      className="h-full w-full object-contain rounded-lg"
                                    />
                                  ) : (
                                    <span className="text-white font-bold text-xl">
                                      {generalForm.watch("companyName")?.charAt(0) || "S"}
                                    </span>
                                  )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <p className="text-sm font-medium">
                                    {currentLogo || logoPreview ? "Custom Logo" : "Default Letter Logo"}
                                  </p>
                                                                     <p className="text-xs text-muted-foreground">
                                     {currentLogo 
                                       ? "Your uploaded logo is displayed across the platform"
                                       : logoPreview 
                                       ? "Click 'Upload Logo' to save your selected image"
                                       : "Upload a custom logo to replace the letter logo"
                                     }
                                   </p>
                                </div>
                              </div>
                            </div>

                            {/* Upload Controls */}
                            <div className="flex items-center space-x-3">
                              <div className="flex-1">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleLogoFileSelect}
                                  className="hidden"
                                  id="logoFileInput"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-auto"
                                  onClick={() => document.getElementById('logoFileInput')?.click()}
                                >
                                  <Upload className="h-4 w-4 mr-2" />
                                  Choose Logo
                                </Button>
                              </div>

                                                             {logoFile && (
                                 <Button
                                   type="button"
                                   variant="default"
                                   size="sm"
                                   onClick={handleLogoUpload}
                                   disabled={logoUploadInProgress}
                                   style={getBrandButtonStyle(logoUploadInProgress)}
                                 >
                                   {logoUploadInProgress ? (
                                     <>
                                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                       Uploading...
                                     </>
                                   ) : (
                                     <>
                                       <Save className="h-4 w-4 mr-2" />
                                       Upload Logo
                                     </>
                                   )}
                                 </Button>
                               )}

                              {currentLogo && (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleLogoDelete}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove Logo
                                </Button>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>• Supported formats: PNG, JPG, SVG, GIF</p>
                              <p>• Maximum file size: 5MB</p>
                              <p>• Recommended size: 200x200 pixels or larger</p>
                              <p>• Your logo will replace the initial letter logos in the dashboard and frontend</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="platformName">Platform Name</Label>
                          <Input
                            id="platformName"
                            placeholder="Your Platform Name"
                            {...generalForm.register("platformName")}
                          />
                          {generalForm.formState.errors.platformName && (
                            <p className="text-sm text-destructive mt-1">
                              {generalForm.formState.errors.platformName.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="supportEmail">Support Email</Label>
                          <Input
                            id="supportEmail"
                            type="email"
                            placeholder="support@yourdomain.com"
                            {...generalForm.register("supportEmail")}
                          />
                          {generalForm.formState.errors.supportEmail && (
                            <p className="text-sm text-destructive mt-1">
                              {generalForm.formState.errors.supportEmail.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="frontendUrl">Frontend URL</Label>
                          <Input
                            id="frontendUrl"
                            type="url"
                            placeholder="https://yourdomain.com"
                            {...generalForm.register("frontendUrl")}
                          />
                          {generalForm.formState.errors.frontendUrl && (
                            <p className="text-sm text-destructive mt-1">
                              {generalForm.formState.errors.frontendUrl.message}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Base URL used in email links and external references
                          </p>
                        </div>                        <div className="space-y-6">
                          <h4 className="font-medium">Brand Colors</h4>
                          <p className="text-sm text-muted-foreground">
                            Customize your platform's visual identity with these brand colors. Changes will be applied across the entire interface.
                          </p>
                          
                          {/* Theme Selector */}
                          <ThemeSelector
                            currentTheme={{
                              primary: generalForm.watch("primaryColor") || "2563eb",
                              secondary: generalForm.watch("secondaryColor") || "10b981",
                              accent: generalForm.watch("accentColor") || "f59e0b"
                            }}
                            onThemeSelect={(theme) => {
                              // Apply all three colors at once
                              generalForm.setValue("primaryColor", theme.primary, { shouldDirty: true });
                              generalForm.setValue("secondaryColor", theme.secondary, { shouldDirty: true });
                              generalForm.setValue("accentColor", theme.accent, { shouldDirty: true });
                            }}
                            disabled={saveInProgress}
                          />
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Color Selectors */}
                            <div className="space-y-6">
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium">Manual Color Adjustment</h5>
                                <p className="text-xs text-muted-foreground">
                                  Fine-tune individual colors or create custom combinations
                                </p>
                              </div>
                              
                              <EnhancedColorSelector
                                label="Primary Color"
                                value={generalForm.watch("primaryColor")}
                                onChange={(color) => generalForm.setValue("primaryColor", color, { shouldDirty: true })}
                                error={generalForm.formState.errors.primaryColor?.message}
                                description="Main brand color for primary elements and actions"
                                type="primary"
                                disabled={saveInProgress}
                              />

                              <EnhancedColorSelector
                                label="Secondary Color"
                                value={generalForm.watch("secondaryColor")}
                                onChange={(color) => generalForm.setValue("secondaryColor", color, { shouldDirty: true })}
                                error={generalForm.formState.errors.secondaryColor?.message}
                                description="Supporting color for secondary elements and accents"
                                type="secondary"
                                disabled={saveInProgress}
                              />

                              <EnhancedColorSelector
                                label="Accent Color"
                                value={generalForm.watch("accentColor")}
                                onChange={(color) => generalForm.setValue("accentColor", color, { shouldDirty: true })}
                                error={generalForm.formState.errors.accentColor?.message}
                                description="Highlight color for callouts and important elements"
                                type="accent"
                                disabled={saveInProgress}
                              />
                            </div>

                            {/* Color Preview */}
                            <div>
                              <ColorPreview
                                primaryColor={generalForm.watch("primaryColor") || "2563eb"}
                                secondaryColor={generalForm.watch("secondaryColor") || "10b981"}
                                accentColor={generalForm.watch("accentColor") || "f59e0b"}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label htmlFor="defaultTimezone">Default Timezone</Label>
                      <select
                        id="defaultTimezone"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        {...generalForm.register("defaultTimezone")}
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                        <option value="Europe/Paris">Central European Time (CET)</option>
                        <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFormat">Date Format</Label>
                      <select
                        id="dateFormat"
                        className="w-full rounded-md border border-input bg-background px-3 py-2"
                        {...generalForm.register("dateFormat")}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </select>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-2">Platform Statistics</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      These values are used as fallback when VirtFusion API is unavailable or when you want to manually override statistics displayed on the landing page.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="platformServerCount">Server Count</Label>
                        <Input
                          id="platformServerCount"
                          placeholder="Number of servers (leave empty to use API)"
                          {...generalForm.register("platformServerCount")}
                        />
                        {generalForm.formState.errors.platformServerCount && (
                          <p className="text-sm text-destructive mt-1">
                            {generalForm.formState.errors.platformServerCount.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="platformHypervisorCount">Hypervisor Count</Label>
                        <Input
                          id="platformHypervisorCount"
                          placeholder="Number of hypervisors (leave empty to use API)"
                          {...generalForm.register("platformHypervisorCount")}
                        />
                        {generalForm.formState.errors.platformHypervisorCount && (
                          <p className="text-sm text-destructive mt-1">
                            {generalForm.formState.errors.platformHypervisorCount.message}
                          </p>
                        )}
                      </div>




                    </div>
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="w-32"
                      disabled={saveInProgress || !generalForm.formState.isDirty}
                    >
                      {saveInProgress ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                </form>
              </TabsContent>

              <TabsContent value="notifications">
                <form onSubmit={notificationsForm.handleSubmit(onNotificationsSubmit)}>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Discord Integration</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Configure Discord integration for notifications and ticket management
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-md font-medium">Discord Webhooks</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure Discord webhook notifications for ticket events
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discordWebhookUrl">Discord Webhook URL</Label>
                      <Input
                        id="discordWebhookUrl"
                        placeholder="https://discord.com/api/webhooks/..."
                        {...notificationsForm.register("discordWebhookUrl")}
                      />
                      {notificationsForm.formState.errors.discordWebhookUrl && (
                        <p className="text-sm text-destructive mt-1">
                          {notificationsForm.formState.errors.discordWebhookUrl.message}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the Discord webhook URL to receive notifications for new tickets and replies
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discordRoleId">Discord Role ID to Ping</Label>
                      <Input
                        id="discordRoleId"
                        placeholder="123456789012345678"
                        {...notificationsForm.register("discordRoleId")}
                      />
                      {notificationsForm.formState.errors.discordRoleId && (
                        <p className="text-sm text-destructive mt-1">
                          {notificationsForm.formState.errors.discordRoleId.message}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground mt-1">
                        Enter the Discord Role ID that should be pinged when new tickets or replies are received (leave empty for no role ping)
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6 mt-6">
                    <div>
                      <h4 className="text-md font-medium">Discord Bot Integration</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure Discord bot for two-way ticket communication with threads
                      </p>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <Label htmlFor="discordBotEnabled">Enable Discord Bot</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable two-way communication between tickets and Discord threads
                        </p>
                      </div>
                      <Switch
                        id="discordBotEnabled"
                        checked={notificationsForm.watch("discordBotEnabled")}
                        onCheckedChange={(checked) => notificationsForm.setValue("discordBotEnabled", checked, { shouldDirty: true })}
                      />
                    </div>

                    {notificationsForm.watch("discordBotEnabled") && (
                      <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="discordBotToken">Discord Bot Token</Label>
                          <Input
                            id="discordBotToken"
                            type="password"
                            placeholder="Your Discord bot token"
                            {...notificationsForm.register("discordBotToken")}
                          />
                          {notificationsForm.formState.errors.discordBotToken && (
                            <p className="text-sm text-destructive mt-1">
                              {notificationsForm.formState.errors.discordBotToken.message}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Enter your Discord bot token from the Discord Developer Portal
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discordGuildId">Discord Server ID</Label>
                          <Input
                            id="discordGuildId"
                            placeholder="123456789012345678"
                            {...notificationsForm.register("discordGuildId")}
                          />
                          {notificationsForm.formState.errors.discordGuildId && (
                            <p className="text-sm text-destructive mt-1">
                              {notificationsForm.formState.errors.discordGuildId.message}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Enter your Discord server ID
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="discordChannelId">Discord Channel ID</Label>
                          <Input
                            id="discordChannelId"
                            placeholder="123456789012345678"
                            {...notificationsForm.register("discordChannelId")}
                          />
                          {notificationsForm.formState.errors.discordChannelId && (
                            <p className="text-sm text-destructive mt-1">
                              {notificationsForm.formState.errors.discordChannelId.message}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground mt-1">
                            Enter the Discord channel ID where ticket threads should be created
                          </p>
                        </div>

                        <div className="pt-4 border-t">
                          <h5 className="text-sm font-medium mb-2">Discord Bot Command Permissions</h5>
                          <p className="text-sm text-muted-foreground mb-3">
                            Restrict who can use ticket commands in Discord threads
                          </p>

                          <div className="space-y-2">
                            <Label htmlFor="discordAllowedRoleIds">Allowed Role IDs</Label>
                            <Input
                              id="discordAllowedRoleIds"
                              placeholder="123456789012345678, 876543210987654321"
                              {...notificationsForm.register("discordAllowedRoleIds")}
                            />
                            {notificationsForm.formState.errors.discordAllowedRoleIds && (
                              <p className="text-sm text-destructive mt-1">
                                {notificationsForm.formState.errors.discordAllowedRoleIds.message}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Enter comma-separated list of role IDs that can use ticket commands (leave empty to allow all roles)
                            </p>
                          </div>

                          <div className="space-y-2 mt-4">
                            <Label htmlFor="discordAllowedUserIds">Allowed User IDs</Label>
                            <Input
                              id="discordAllowedUserIds"
                              placeholder="123456789012345678, 876543210987654321"
                              {...notificationsForm.register("discordAllowedUserIds")}
                            />
                            {notificationsForm.formState.errors.discordAllowedUserIds && (
                              <p className="text-sm text-destructive mt-1">
                                {notificationsForm.formState.errors.discordAllowedUserIds.message}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground mt-1">
                              Enter comma-separated list of user IDs that can use ticket commands (leave empty to allow all users with permitted roles)
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="w-32"
                      disabled={saveInProgress || !notificationsForm.formState.isDirty}
                    >
                      {saveInProgress ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                </form>
              </TabsContent>

              <TabsContent value="team">
                <TeamManagement brandColors={brandColors} />
              </TabsContent>

              <TabsContent value="departments">
                <UnifiedDepartmentManager />
              </TabsContent>

              <TabsContent value="maintenance">
                <form onSubmit={maintenanceForm.handleSubmit(onMaintenanceSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Maintenance Mode</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure maintenance mode settings to temporarily restrict access to the platform
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="maintenanceEnabled">Enable Maintenance Mode</Label>
                          <p className="text-sm text-muted-foreground">
                            When enabled, only admins can access the system
                          </p>
                        </div>
                        <Switch
                          id="maintenanceEnabled"
                          checked={maintenanceForm.watch("enabled")}
                          onCheckedChange={(checked) => maintenanceForm.setValue("enabled", checked)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="maintenanceMessage">Maintenance Message</Label>
                        <Textarea
                          id="maintenanceMessage"
                          placeholder="System is currently under maintenance."
                          className="min-h-[100px]"
                          {...maintenanceForm.register("message")}
                        />
                        {maintenanceForm.formState.errors.message && (
                          <p className="text-sm text-destructive mt-1">
                            {maintenanceForm.formState.errors.message.message}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Message to display to users during maintenance
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="estimatedCompletion">Estimated Completion</Label>
                        <Input
                          id="estimatedCompletion"
                          type="datetime-local"
                          {...maintenanceForm.register("estimatedCompletion")}
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                          Estimated time when maintenance will be complete (optional)
                        </p>
                      </div>

                      {maintenanceForm.watch("enabled") && (
                        <div className="p-4 border rounded-md bg-amber-50 border-amber-200">
                          <div className="space-y-3">
                            <h4 className="text-sm font-medium flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
                              Maintenance Access Token
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Use this token to bypass maintenance mode. Add it to the URL like: {window.location.origin}/<strong>{maintenanceToken}</strong>
                            </p>

                            <div className="flex items-center space-x-2">
                              <Input
                                readOnly
                                value={maintenanceToken}
                                className="font-mono text-xs"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={copyTokenToClipboard}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              className="w-full"
                              size="sm"
                              onClick={handleRegenerateToken}
                              disabled={regeneratingToken}
                            >
                              {regeneratingToken ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Regenerating...
                                </>
                              ) : "Regenerate Token"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="tickets">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium">Ticket Departments</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Manage ticket departments for your support system
                    </p>
                  </div>

                  {/* Department Migration Section */}
                  {!isLoadingMigrationStatus && migrationStatus && (
                    <div className="border rounded-lg p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {migrationStatus.needsMigration ? (
                            <AlertTriangle className="h-6 w-6 text-amber-500" />
                          ) : (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {migrationStatus.needsMigration ? 'Department Consolidation Available' : 'Department System Unified'}
                          </h4>
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            {migrationStatus.needsMigration ? (
                              <>
                                <p className="mb-3">
                                  Your system currently has separate department systems for tickets.
                                  You can consolidate them into a unified department system for easier management.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                                    <div className="flex items-center space-x-2">
                                      <Ticket className="h-4 w-4 text-blue-500" />
                                      <span className="font-medium">Ticket Departments</span>
                                    </div>
                                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                      {migrationStatus.ticketDepartmentCount}
                                    </p>
                                  </div>

                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                                    <div className="flex items-center space-x-2">
                                      <Merge className="h-4 w-4 text-purple-500" />
                                      <span className="font-medium">Will Create</span>
                                    </div>
                                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mt-1">
                                      {migrationStatus.ticketDepartmentCount} unified
                                    </p>
                                  </div>
                                </div>
                                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                                  <div className="flex items-start space-x-2">
                                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div className="text-sm text-amber-800 dark:text-amber-200">
                                      <p className="font-medium mb-1">What this migration does:</p>
                                      <ul className="list-disc list-inside space-y-1 text-xs">
                                        <li>Merges ticket departments with the same name</li>
                                        <li>Preserves all existing tickets</li>
                                        <li>Maintains admin assignments and permissions</li>
                                        <li>Creates a single unified department management interface</li>
                                        <li>Handles conflicts automatically (e.g., multiple default departments)</li>
                                      </ul>
                                    </div>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <p>
                                Your department system is already unified. Tickets use the unified department system
                                with {migrationStatus.supportDepartmentCount} departments configured.
                              </p>
                            )}
                          </div>

                          {migrationStatus.needsMigration && (
                            <div className="mt-4 flex space-x-3">
                              <Button
                                onClick={handleMigrateDepartments}
                                disabled={migrationInProgress}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                              >
                                {migrationInProgress ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Migrating...
                                  </>
                                ) : (
                                  <>
                                    <Merge className="mr-2 h-4 w-4" />
                                    Consolidate Departments
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => refetchMigrationStatus()}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Refresh Status
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Migration Result Display */}
                  {migrationResult && (
                    <div className={cn(
                      "border rounded-lg p-4",
                      migrationResult.success
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    )}>
                      <div className="flex items-start space-x-3">
                        {migrationResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium",
                            migrationResult.success
                              ? "text-green-800 dark:text-green-200"
                              : "text-red-800 dark:text-red-200"
                          )}>
                            {migrationResult.success ? 'Migration Completed Successfully' : 'Migration Failed'}
                          </h4>
                          <p className={cn(
                            "text-sm mt-1",
                            migrationResult.success
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          )}>
                            {migrationResult.message}
                          </p>

                          {migrationResult.success && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              <div className="bg-white dark:bg-gray-800 rounded p-2 border">
                                <span className="font-medium">Departments Created:</span>
                                <span className="ml-1 text-green-600 dark:text-green-400 font-bold">
                                  {migrationResult.details.supportDepartmentsCreated}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded p-2 border">
                                <span className="font-medium">Tickets Migrated:</span>
                                <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">
                                  {migrationResult.details.ticketsMigrated}
                                </span>
                              </div>

                            </div>
                          )}

                          {migrationResult.details.conflicts.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
                                Conflicts Resolved ({migrationResult.details.conflicts.length}):
                              </p>
                              <div className="space-y-1">
                                {migrationResult.details.conflicts.map((conflict, index) => (
                                  <div key={index} className="text-xs bg-amber-100 dark:bg-amber-900/20 rounded p-2">
                                    <span className="font-medium capitalize">{conflict.type.replace('_', ' ')}:</span>
                                    <span className="ml-1">{conflict.resolution}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMigrationResult(null)}
                            className="mt-3"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Department Sync Section */}
                  {!isLoadingMigrationStatus && migrationStatus && !migrationStatus.needsMigration && migrationStatus.syncStatus?.needsSync && (
                    <div className="border rounded-lg p-6 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-6 w-6 text-orange-500" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            New Departments Detected
                          </h4>
                          <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            <p className="mb-3">
                              {migrationStatus.syncStatus.totalNewDepartments} new departments have been added since the initial migration.
                              You can sync them into the unified department system.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              {migrationStatus.syncStatus.newTicketDepartments.length > 0 && (
                                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
                                  <div className="flex items-center space-x-2">
                                    <Ticket className="h-4 w-4 text-blue-500" />
                                    <span className="font-medium">New Ticket Departments</span>
                                  </div>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-1">
                                    {migrationStatus.syncStatus.newTicketDepartments.length}
                                  </p>
                                  <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                    {migrationStatus.syncStatus.newTicketDepartments.map(dept => dept.name).join(', ')}
                                  </div>
                                </div>
                              )}

                            </div>
                            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                              <div className="flex items-start space-x-2">
                                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                <div className="text-sm text-blue-800 dark:text-blue-200">
                                  <p className="font-medium mb-1">What syncing does:</p>
                                  <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>Adds new departments to the unified system</li>
                                    <li>Migrates any tickets using these departments</li>
                                    <li>Preserves all existing data and settings</li>
                                    <li>Maintains admin assignments for departments</li>
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 flex space-x-3">
                            <Button
                              onClick={handleSyncDepartments}
                              disabled={syncInProgress}
                              className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                              {syncInProgress ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Sync New Departments
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => refetchMigrationStatus()}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Refresh Status
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sync Result Display */}
                  {syncResult && (
                    <div className={cn(
                      "border rounded-lg p-4",
                      syncResult.success
                        ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                        : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                    )}>
                      <div className="flex items-start space-x-3">
                        {syncResult.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <h4 className={cn(
                            "font-medium",
                            syncResult.success
                              ? "text-green-800 dark:text-green-200"
                              : "text-red-800 dark:text-red-200"
                          )}>
                            {syncResult.success ? 'Sync Completed Successfully' : 'Sync Failed'}
                          </h4>
                          <p className={cn(
                            "text-sm mt-1",
                            syncResult.success
                              ? "text-green-700 dark:text-green-300"
                              : "text-red-700 dark:text-red-300"
                          )}>
                            {syncResult.message}
                          </p>

                          {syncResult.success && (
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                              <div className="bg-white dark:bg-gray-800 rounded p-2 border">
                                <span className="font-medium">Departments Added:</span>
                                <span className="ml-1 text-green-600 dark:text-green-400 font-bold">
                                  {syncResult.details.supportDepartmentsCreated}
                                </span>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded p-2 border">
                                <span className="font-medium">Tickets Migrated:</span>
                                <span className="ml-1 text-blue-600 dark:text-blue-400 font-bold">
                                  {syncResult.details.ticketsMigrated}
                                </span>
                              </div>

                            </div>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSyncResult(null)}
                            className="mt-3"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Department List */}
                  <div className="space-y-4">
                    {isLoadingDepartments ? (
                      <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {departments.length === 0 ? (
                          <div className="text-center py-8 border rounded-md">
                            <p className="text-muted-foreground">No departments created yet</p>
                            <Button
                              className="mt-4"
                              onClick={() => setIsAddingDepartment(true)}
                              disabled={isAddingDepartment}
                            >
                              Create First Department
                            </Button>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between items-center">
                              <h3 className="text-sm font-medium">Available Departments</h3>
                              <Button
                                size="sm"
                                onClick={() => setIsAddingDepartment(true)}
                                disabled={isAddingDepartment || editingDepartment !== null}
                              >
                                Add Department
                              </Button>
                            </div>
                            <div className="border rounded-md overflow-hidden">
                              <table className="w-full">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="py-2 px-4 text-left text-sm font-medium">Name</th>
                                    <th className="py-2 px-4 text-left text-sm font-medium">Description</th>
                                    <th className="py-2 px-4 text-center text-sm font-medium">Order</th>
                                    <th className="py-2 px-4 text-center text-sm font-medium">Active</th>
                                    <th className="py-2 px-4 text-center text-sm font-medium">Default</th>
                                    <th className="py-2 px-4 text-center text-sm font-medium">Requires VPS</th>
                                    <th className="py-2 px-4 text-right text-sm font-medium">Actions</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y">
                                  {Array.isArray(departments) && departments.length > 0 ? departments.map((dept) => (
                                    <tr key={dept.id} className="hover:bg-muted/30">
                                      <td className="py-3 px-4 text-sm">{dept.name}</td>
                                      <td className="py-3 px-4 text-sm text-muted-foreground">
                                        {dept.description.length > 50
                                          ? dept.description.substring(0, 50) + "..."
                                          : dept.description}
                                      </td>
                                      <td className="py-3 px-4 text-sm text-center">{dept.displayOrder}</td>
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex justify-center">
                                          {dept.isActive ? (
                                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          ) : (
                                            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex justify-center">
                                          {dept.isDefault ? (
                                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          ) : (
                                            <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-center">
                                        <div className="flex justify-center">
                                          {dept.requiresVps ? (
                                            <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                          ) : (
                                            <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-3 px-4 text-right">
                                        <div className="flex space-x-2 justify-end">
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEditDepartment(dept)}
                                            disabled={editingDepartment !== null || isAddingDepartment}
                                          >
                                            Edit
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteDepartment(dept.id)}
                                            disabled={editingDepartment !== null || isAddingDepartment}
                                          >
                                            Delete
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  )) : (
                                    <tr>
                                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                        {isLoadingDepartments ? "Loading departments..." : "No departments found"}
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Department Add/Edit Form */}
                    {(isAddingDepartment || editingDepartment !== null) && (
                      <div className="mt-6 border rounded-md p-4 bg-muted/10">
                        <form onSubmit={ticketDepartmentForm.handleSubmit(onDepartmentSubmit)}>
                          <h3 className="text-md font-medium mb-4">
                            {editingDepartment ? `Edit Department: ${editingDepartment.name}` : "Add New Department"}
                          </h3>
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="name">Department Name</Label>
                                <Input
                                  id="name"
                                  placeholder="e.g., Technical Support"
                                  {...ticketDepartmentForm.register("name")}
                                />
                                {ticketDepartmentForm.formState.errors.name && (
                                  <p className="text-sm text-destructive mt-1">
                                    {ticketDepartmentForm.formState.errors.name.message}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="displayOrder">Display Order</Label>
                                <Input
                                  id="displayOrder"
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  {...ticketDepartmentForm.register("displayOrder", { valueAsNumber: true })}
                                />
                                {ticketDepartmentForm.formState.errors.displayOrder && (
                                  <p className="text-sm text-destructive mt-1">
                                    {ticketDepartmentForm.formState.errors.displayOrder.message}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  Determines the order departments are displayed (lower numbers first)
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                placeholder="Department description visible to users when creating tickets"
                                {...ticketDepartmentForm.register("description")}
                                rows={3}
                              />
                              {ticketDepartmentForm.formState.errors.description && (
                                <p className="text-sm text-destructive mt-1">
                                  {ticketDepartmentForm.formState.errors.description.message}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="isActive"
                                  checked={ticketDepartmentForm.watch("isActive")}
                                  onCheckedChange={(checked) => ticketDepartmentForm.setValue("isActive", checked, { shouldDirty: true })}
                                />
                                <Label htmlFor="isActive">Active</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="isDefault"
                                  checked={ticketDepartmentForm.watch("isDefault")}
                                  onCheckedChange={(checked) => ticketDepartmentForm.setValue("isDefault", checked, { shouldDirty: true })}
                                />
                                <Label htmlFor="isDefault">Default Department</Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Switch
                                  id="requiresVps"
                                  checked={ticketDepartmentForm.watch("requiresVps")}
                                  onCheckedChange={(checked) => ticketDepartmentForm.setValue("requiresVps", checked, { shouldDirty: true })}
                                />
                                <Label htmlFor="requiresVps">Requires VPS</Label>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">
                                <strong>Active</strong>: Only active departments are shown to users when creating tickets.<br />
                                <strong>Default</strong>: This department will be selected by default in the ticket form.<br />
                                <strong>Requires VPS</strong>: Users will need to select one of their VPS servers when creating tickets for this department.
                              </p>
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={cancelDepartmentEdit}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={saveInProgress || !ticketDepartmentForm.formState.isDirty}
                              >
                                {saveInProgress ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    {editingDepartment ? "Update Department" : "Create Department"}
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="loading-screen">
                <form onSubmit={loadingScreenForm.handleSubmit(onLoadingScreenSubmit)}>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium">Loading Screen Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Configure the VPS-themed loading screen animation
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="enableLoadingScreen">Enable Loading Screen</Label>
                        <p className="text-sm text-muted-foreground">
                          Show a VPS-themed loading animation during page transitions
                        </p>
                      </div>
                      <Switch
                        id="enableLoadingScreen"
                        checked={loadingScreenForm.watch("enabled")}
                        onCheckedChange={(checked) => loadingScreenForm.setValue("enabled", checked, { shouldDirty: true })}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="showOnAllPages">Show On All Pages</Label>
                        <p className="text-sm text-muted-foreground">
                          When enabled, the loading screen will appear on all page transitions (not just initial load)
                        </p>
                      </div>
                      <Switch
                        id="showOnAllPages"
                        checked={loadingScreenForm.watch("showOnAllPages")}
                        onCheckedChange={(checked) => loadingScreenForm.setValue("showOnAllPages", checked, { shouldDirty: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="animationDuration">Animation Duration (milliseconds)</Label>
                      <Input
                        id="animationDuration"
                        type="number"
                        min="500"
                        max="10000"
                        placeholder="3000"
                        {...loadingScreenForm.register("animationDuration")}
                      />
                      {loadingScreenForm.formState.errors.animationDuration && (
                        <p className="text-sm text-destructive mt-1">
                          {loadingScreenForm.formState.errors.animationDuration.message}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        The duration of the loading animation in milliseconds (3000ms = 3 seconds)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minDuration">Minimum Display Duration (milliseconds)</Label>
                      <Input
                        id="minDuration"
                        type="number"
                        min="0"
                        max="5000"
                        placeholder="1000"
                        {...loadingScreenForm.register("minDuration")}
                      />
                      {loadingScreenForm.formState.errors.minDuration && (
                        <p className="text-sm text-destructive mt-1">
                          {loadingScreenForm.formState.errors.minDuration.message}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        The minimum time the loading screen will be displayed, even if the page loads faster
                      </p>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress || !loadingScreenForm.formState.isDirty}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="design">
                <form onSubmit={designForm.handleSubmit(onDesignSubmit)}>
                  <div className="space-y-8">
                    <div>
                      <h3 className="text-lg font-medium">Design Settings</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Customize website content and footer information
                      </p>
                    </div>

                    <Separator />



                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium">Company Description</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          The text displayed in the footer that describes your company
                        </p>

                        <div className="mt-4 space-y-2">
                          <Label htmlFor="footerDescription">Footer Description</Label>
                          <Textarea
                            id="footerDescription"
                            placeholder="High-performance VPS hosting solutions with exceptional support and reliability."
                            className="min-h-20"
                            {...designForm.register("footerDescription")}
                          />
                          {designForm.formState.errors.footerDescription && (
                            <p className="text-sm text-destructive mt-1">
                              {designForm.formState.errors.footerDescription.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="text-md font-medium">Social Media Links</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              Configure social media links to display in the footer
                            </p>
                          </div>
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Label htmlFor="enableSocialIcons">Enable Social Icons</Label>
                              <Switch
                                id="enableSocialIcons"
                                checked={designForm.watch("enableSocialIcons")}
                                onCheckedChange={(checked) => designForm.setValue("enableSocialIcons", checked, { shouldDirty: true })}
                              />
                            </div>
                          </div>
                        </div>

                        {designForm.watch("enableSocialIcons") && (
                          <div className="space-y-4 mt-4">
                            {/* Social media platforms list */}
                            <div className="mb-4">
                              <p className="text-sm text-muted-foreground mb-2">
                                Add links to your social media profiles. These will appear as icons in the footer.
                              </p>
                            </div>

                            {/* Dynamic social links field array */}
                            <div>
                              {designForm.watch("socialLinks")?.map((link, index) => (
                                <div key={index} className="flex mb-3 items-end gap-2">
                                  <div className="w-1/3">
                                    <Label htmlFor={`socialLinks.${index}.platform`} className="mb-2 block">
                                      Platform
                                    </Label>
                                    <select
                                      id={`socialLinks.${index}.platform`}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                      value={link.platform}
                                      onChange={(e) => {
                                        const newSocialLinks = [...designForm.watch("socialLinks")];
                                        newSocialLinks[index].platform = e.target.value as SocialPlatform;
                                        designForm.setValue("socialLinks", newSocialLinks, { shouldDirty: true });
                                      }}
                                    >
                                      <option value="github">GitHub</option>
                                      <option value="facebook">Facebook</option>
                                      <option value="discord">Discord</option>
                                      <option value="linkedin">LinkedIn</option>
                                      <option value="youtube">YouTube</option>
                                      <option value="instagram">Instagram</option>
                                    </select>
                                  </div>
                                  <div className="flex-1">
                                    <Label htmlFor={`socialLinks.${index}.url`} className="mb-2 block">
                                      URL
                                    </Label>
                                    <Input
                                      id={`socialLinks.${index}.url`}
                                      placeholder={`https://${link.platform}.com/yourusername`}
                                      value={link.url}
                                      onChange={(e) => {
                                        const newSocialLinks = [...designForm.watch("socialLinks")];
                                        newSocialLinks[index].url = e.target.value;
                                        designForm.setValue("socialLinks", newSocialLinks, { shouldDirty: true });
                                      }}
                                    />
                                    {designForm.formState.errors.socialLinks?.[index]?.url && (
                                      <p className="text-sm text-destructive mt-1">
                                        Please enter a valid URL
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    type="button"
                                    variant="destructive"
                                    size="icon"
                                    onClick={() => {
                                      const newSocialLinks = [...designForm.watch("socialLinks")];
                                      newSocialLinks.splice(index, 1);
                                      designForm.setValue("socialLinks", newSocialLinks, { shouldDirty: true });
                                    }}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M3 6h18"></path>
                                      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                  </Button>
                                </div>
                              ))}

                              <Button
                                type="button"
                                variant="outline"
                                className="mt-2 w-full"
                                disabled={(designForm.watch("socialLinks") || []).length >= 6}
                                onClick={() => {
                                  const currentLinks = designForm.watch("socialLinks") || [];
                                  designForm.setValue("socialLinks", [
                                    ...currentLinks,
                                    { platform: 'github', url: '' }
                                  ], { shouldDirty: true });
                                }}
                              >
                                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <line x1="12" y1="5" x2="12" y2="19"></line>
                                  <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                Add Social Link
                              </Button>
                              {(designForm.watch("socialLinks") || []).length >= 6 && (
                                <p className="text-xs text-amber-500 mt-1">
                                  Maximum limit of 6 social links reached
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-md font-medium">Contact Information</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Contact information displayed in the footer
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="space-y-2">
                            <Label htmlFor="contactEmail">Contact Email</Label>
                            <Input
                              id="contactEmail"
                              placeholder="support@example.com"
                              {...designForm.register("contactEmail")}
                            />
                            {designForm.formState.errors.contactEmail && (
                              <p className="text-sm text-destructive mt-1">
                                {designForm.formState.errors.contactEmail.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="contactSupportText">Support Availability</Label>
                            <Input
                              id="contactSupportText"
                              placeholder="24/7 Available"
                              {...designForm.register("contactSupportText")}
                            />
                            {designForm.formState.errors.contactSupportText && (
                              <p className="text-sm text-destructive mt-1">
                                {designForm.formState.errors.contactSupportText.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="contactPhone">Contact Phone</Label>
                            <Input
                              id="contactPhone"
                              placeholder="+1 (555) 123-4567"
                              {...designForm.register("contactPhone")}
                            />
                            {designForm.formState.errors.contactPhone && (
                              <p className="text-sm text-destructive mt-1">
                                {designForm.formState.errors.contactPhone.message}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Enterprise Features Section */}
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-md font-medium">Enterprise-Grade Features Section</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Customize the Enterprise-Grade Features section shown on the homepage
                        </p>

                        <div className="mt-4 space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="enterpriseFeaturesHeading">Section Heading</Label>
                            <Input
                              id="enterpriseFeaturesHeading"
                              placeholder="Enterprise-Grade Features"
                              {...designForm.register("enterpriseFeaturesHeading")}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="enterpriseFeaturesSubheading">Section Subheading</Label>
                            <Textarea
                              id="enterpriseFeaturesSubheading"
                              placeholder="Our platform delivers the performance, security, and flexibility you need to build and scale with confidence."
                              {...designForm.register("enterpriseFeaturesSubheading")}
                            />
                          </div>

                          {/* Feature Cards */}
                          <div className="mt-6 space-y-6">
                            <h5 className="text-md font-medium">Feature Cards</h5>

                            {/* Feature Card 1 */}
                            <div className="p-4 border border-gray-200 rounded-md">
                              <h6 className="font-medium mb-3">Feature 1</h6>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="enterpriseFeature1Icon">Icon</Label>
                                  <select
                                    id="enterpriseFeature1Icon"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...designForm.register("enterpriseFeatureCards.0.icon")}
                                  >
                                    <option value="zap">Zap (Lightning)</option>
                                    <option value="cpu">CPU (Processor)</option>
                                    <option value="globe">Globe (World)</option>
                                    <option value="shield">Shield (Security)</option>
                                    <option value="server">Server</option>
                                    <option value="database">Database</option>
                                    <option value="network">Network</option>
                                  </select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="enterpriseFeature1Title">Title</Label>
                                  <Input
                                    id="enterpriseFeature1Title"
                                    placeholder="KVM Performance"
                                    {...designForm.register("enterpriseFeatureCards.0.title")}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <Label htmlFor="enterpriseFeature1Description">Description</Label>
                                <Textarea
                                  id="enterpriseFeature1Description"
                                  placeholder="Leveraging powerful KVM virtualization and Network SATA for superior speed and responsiveness."
                                  {...designForm.register("enterpriseFeatureCards.0.description")}
                                />
                              </div>
                            </div>

                            {/* Feature Card 2 */}
                            <div className="p-4 border border-gray-200 rounded-md">
                              <h6 className="font-medium mb-3">Feature 2</h6>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="enterpriseFeature2Icon">Icon</Label>
                                  <select
                                    id="enterpriseFeature2Icon"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...designForm.register("enterpriseFeatureCards.1.icon")}
                                  >
                                    <option value="zap">Zap (Lightning)</option>
                                    <option value="cpu">CPU (Processor)</option>
                                    <option value="globe">Globe (World)</option>
                                    <option value="shield">Shield (Security)</option>
                                    <option value="server">Server</option>
                                    <option value="database">Database</option>
                                    <option value="network">Network</option>
                                  </select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="enterpriseFeature2Title">Title</Label>
                                  <Input
                                    id="enterpriseFeature2Title"
                                    placeholder="VirtFusion Control"
                                    {...designForm.register("enterpriseFeatureCards.1.title")}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <Label htmlFor="enterpriseFeature2Description">Description</Label>
                                <Textarea
                                  id="enterpriseFeature2Description"
                                  placeholder="Manage your VPS effortlessly with our modern control panel: boot, reboot, reinstall, console access, and more."
                                  {...designForm.register("enterpriseFeatureCards.1.description")}
                                />
                              </div>
                            </div>

                            {/* Feature Card 3 */}
                            <div className="p-4 border border-gray-200 rounded-md">
                              <h6 className="font-medium mb-3">Feature 3</h6>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="enterpriseFeature3Icon">Icon</Label>
                                  <select
                                    id="enterpriseFeature3Icon"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...designForm.register("enterpriseFeatureCards.2.icon")}
                                  >
                                    <option value="zap">Zap (Lightning)</option>
                                    <option value="cpu">CPU (Processor)</option>
                                    <option value="globe">Globe (World)</option>
                                    <option value="shield">Shield (Security)</option>
                                    <option value="server">Server</option>
                                    <option value="database">Database</option>
                                    <option value="network">Network</option>
                                  </select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="enterpriseFeature3Title">Title</Label>
                                  <Input
                                    id="enterpriseFeature3Title"
                                    placeholder="Flexible Connectivity"
                                    {...designForm.register("enterpriseFeatureCards.2.title")}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <Label htmlFor="enterpriseFeature3Description">Description</Label>
                                <Textarea
                                  id="enterpriseFeature3Description"
                                  placeholder="Get connected with NAT IPv4 (20 ports included) and a dedicated /80 IPv6 subnet for future-proofing."
                                  {...designForm.register("enterpriseFeatureCards.2.description")}
                                />
                              </div>
                            </div>

                            {/* Feature Card 4 */}
                            <div className="p-4 border border-gray-200 rounded-md">
                              <h6 className="font-medium mb-3">Feature 4</h6>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="enterpriseFeature4Icon">Icon</Label>
                                  <select
                                    id="enterpriseFeature4Icon"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    {...designForm.register("enterpriseFeatureCards.3.icon")}
                                  >
                                    <option value="zap">Zap (Lightning)</option>
                                    <option value="cpu">CPU (Processor)</option>
                                    <option value="globe">Globe (World)</option>
                                    <option value="shield">Shield (Security)</option>
                                    <option value="server">Server</option>
                                    <option value="database">Database</option>
                                    <option value="network">Network</option>
                                  </select>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                  <Label htmlFor="enterpriseFeature4Title">Title</Label>
                                  <Input
                                    id="enterpriseFeature4Title"
                                    placeholder="Easy OS Deployment"
                                    {...designForm.register("enterpriseFeatureCards.3.title")}
                                  />
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                <Label htmlFor="enterpriseFeature4Description">Description</Label>
                                <Textarea
                                  id="enterpriseFeature4Description"
                                  placeholder="Quickly deploy your preferred operating system using a wide range of templates available via VirtFusion."
                                  {...designForm.register("enterpriseFeatureCards.3.description")}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="w-32"
                        disabled={saveInProgress || !designForm.formState.isDirty}
                      >
                        {saveInProgress ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </TabsContent>



            </Tabs>
          </CardContent>
        )}
      </Card>
    </AdminLayout>
  );
}