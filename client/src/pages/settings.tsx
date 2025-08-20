import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings as SettingsIcon, Clock, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Placeholder for settings data
  const [settings, setSettings] = useState({
    virtfusion_api_url: "",
    virtfusion_api_token: "",
    virtfusion_ssl_verify: true,
  });
  
  // VirtFusion billing settings
  const [billingSettings, setBillingSettings] = useState({
    enabled: false,
    hourlyEnabled: true,
    monthlyEnabled: true,
    hoursPerMonth: 730
  });
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  
  // Define the settings data type
  interface SettingItem {
    id: number;
    key: string;
    value: string;
  }

  // Fetch settings if admin
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery<SettingItem[]>({
    queryKey: ["/api/admin/settings"],
    enabled: user?.role === "admin", // Only fetch if user is admin
  });
  
  // Fetch VirtFusion billing settings if admin
  const { data: billingData, isLoading: isLoadingBilling } = useQuery({
    queryKey: ["/api/admin/cron/virtfusion-billing"],
    enabled: user?.role === "admin",
  });
  
  // Update settings state when data is loaded
  useEffect(() => {
    if (settingsData && Array.isArray(settingsData)) {
      const mappedSettings = {
        virtfusion_api_url: settingsData.find(s => s.key === "virtfusion_api_url")?.value || "",
        virtfusion_api_token: settingsData.find(s => s.key === "virtfusion_api_token")?.value || "",
        virtfusion_ssl_verify: settingsData.find(s => s.key === "virtfusion_ssl_verify")?.value === "true",
      };
      setSettings(mappedSettings);
    }
  }, [settingsData]);
  
  // Update billing settings state when data is loaded
  useEffect(() => {
    if (billingData) {
      setBillingSettings({
        enabled: billingData.enabled || false,
        hourlyEnabled: billingData.hourlyBillingEnabled !== false,
        monthlyEnabled: billingData.billingOnFirstEnabled !== false,
        hoursPerMonth: billingData.hoursPerMonth || 730
      });
    }
  }, [billingData]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Save each setting individually
      await Promise.all([
        apiRequest("/api/admin/settings/virtfusion_api_url", {
          method: "POST",
          body: { value: settings.virtfusion_api_url }
        }),
        apiRequest("/api/admin/settings/virtfusion_api_token", {
          method: "POST",
          body: { value: settings.virtfusion_api_token }
        }),
        apiRequest("/api/admin/settings/virtfusion_ssl_verify", {
          method: "POST",
          body: { value: settings.virtfusion_ssl_verify.toString() }
        }),
      ]);
      
      toast({
        title: "Settings saved",
        description: "Your settings have been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "There was an error saving your settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle billing settings submission
  const handleBillingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBillingLoading(true);
    
    try {
      await apiRequest("/api/admin/cron/virtfusion-billing", {
        method: "POST",
        body: {
          enabled: billingSettings.enabled,
          hourlyEnabled: billingSettings.hourlyEnabled,
          monthlyEnabled: billingSettings.monthlyEnabled,
          hoursPerMonth: billingSettings.hoursPerMonth
        }
      });
      
      toast({
        title: "Billing settings saved",
        description: "VirtFusion billing settings have been updated successfully.",
      });
    } catch (error) {
      console.error("Error saving billing settings:", error);
      toast({
        title: "Error",
        description: "There was an error saving billing settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsBillingLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          {user?.role === "admin" ? (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>VirtFusion API Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure your VirtFusion API connection settings. These settings are used for all communication with the VirtFusion API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api_url">API URL</Label>
                    <Input
                      id="api_url"
                      placeholder="https://example.virtfusion.com/api/v1"
                      value={settings.virtfusion_api_url}
                      onChange={(e) => setSettings({...settings, virtfusion_api_url: e.target.value})}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      The base URL of your VirtFusion API (e.g., https://cp.yourdomain.com/api/v1)
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="api_token">API Token</Label>
                    <Input
                      id="api_token"
                      type="password"
                      placeholder="Your VirtFusion API token"
                      value={settings.virtfusion_api_token}
                      onChange={(e) => setSettings({...settings, virtfusion_api_token: e.target.value})}
                      disabled={isLoading}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Your VirtFusion API token with administrative privileges
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="ssl_verify"
                      className="h-4 w-4"
                      checked={settings.virtfusion_ssl_verify}
                      onChange={(e) => setSettings({...settings, virtfusion_ssl_verify: e.target.checked})}
                      disabled={isLoading}
                    />
                    <Label htmlFor="ssl_verify" className="cursor-pointer">
                      Verify SSL certificate (recommended for production)
                    </Label>
                  </div>
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : null}
          
          {user?.role === "admin" && (
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>VirtFusion Billing Settings</CardTitle>
                </div>
                <CardDescription>
                  Configure VirtFusion billing and cron job settings. The hours per month setting determines how billing calculations are performed for hourly billed servers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBillingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hours_per_month">Hours Per Month</Label>
                    <Input
                      id="hours_per_month"
                      type="number"
                      min="1"
                      max="8760"
                      placeholder="730"
                      value={billingSettings.hoursPerMonth}
                      onChange={(e) => setBillingSettings({...billingSettings, hoursPerMonth: parseInt(e.target.value) || 730})}
                      disabled={isBillingLoading || isLoadingBilling}
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of hours in a month for billing calculations (default: 730). This affects how hourly rates are calculated and displayed on server billing pages.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="billing_enabled"
                      className="h-4 w-4"
                      checked={billingSettings.enabled}
                      onChange={(e) => setBillingSettings({...billingSettings, enabled: e.target.checked})}
                      disabled={isBillingLoading || isLoadingBilling}
                    />
                    <Label htmlFor="billing_enabled" className="cursor-pointer">
                      Enable VirtFusion billing cron jobs
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="hourly_enabled"
                      className="h-4 w-4"
                      checked={billingSettings.hourlyEnabled}
                      onChange={(e) => setBillingSettings({...billingSettings, hourlyEnabled: e.target.checked})}
                      disabled={isBillingLoading || isLoadingBilling}
                    />
                    <Label htmlFor="hourly_enabled" className="cursor-pointer">
                      Enable hourly billing
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="monthly_enabled"
                      className="h-4 w-4"
                      checked={billingSettings.monthlyEnabled}
                      onChange={(e) => setBillingSettings({...billingSettings, monthlyEnabled: e.target.checked})}
                      disabled={isBillingLoading || isLoadingBilling}
                    />
                    <Label htmlFor="monthly_enabled" className="cursor-pointer">
                      Enable monthly billing on first of month
                    </Label>
                  </div>
                  
                  <div className="pt-4">
                    <Button type="submit" disabled={isBillingLoading || isLoadingBilling}>
                      {isBillingLoading ? "Saving..." : "Save Billing Settings"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {user?.role !== "admin" && (
            <Card>
              <CardHeader>
                <CardTitle>Settings</CardTitle>
                <CardDescription>
                  User settings will be displayed here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p>You do not have access to modify system settings. Only admin users can change system settings.</p>
              </CardContent>
            </Card>
          )}
          
          {/* Personal settings section */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Personal Settings</CardTitle>
              </div>
              <CardDescription>
                Configure your personal user settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                User preferences will be available here in a future update.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}