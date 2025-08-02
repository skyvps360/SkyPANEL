import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { GoogleAnalyticsTracker } from "../components/GoogleAnalyticsTracker";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Zap,
  CheckCircle,
  Info,
  ArrowLeft,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

interface SlaPlan {
  id: string;
  name: string;
  description: string | null;
  uptime_guarantee_percentage: number;
  response_time_hours: number;
  resolution_time_hours: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function SLAPublicPlansPage() {
  const [location, navigate] = useLocation();

  // Query parameters allow linking directly to a specific plan
  const urlParams = new URLSearchParams(window.location.search);
  const slaName = urlParams.get("sla");
  const referrer = urlParams.get("from");

  const getBackPath = () => {
    if (referrer === "plans") return "/plans";
    if (referrer === "packages") return "/packages";
    return null;
  };

  const handleBack = () => {
    const path = getBackPath();
    if (path) navigate(path);
    else window.history.back();
  };

  // Branding (company name) for meta tags
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"],
  });
  const companyName = branding?.company_name ?? "SkyVPS360";

  // Public endpoint for SLA plans – no auth required
  const {
    data: slaPlans,
    isLoading,
  } = useQuery<SlaPlan[]>({
    queryKey: ["/api/public/sla-plans"],
    retry: 1,
  });

  const filteredPlans = slaName
    ? slaPlans?.filter((p) => p.name.toLowerCase() === slaName.toLowerCase()) ?? []
    : slaPlans ?? [];

  // Redirect back to generic page when a non-existent SLA is requested
  useEffect(() => {
    if (slaName && slaPlans && filteredPlans.length === 0) {
      navigate("/sla-plans");
    }
  }, [slaName, slaPlans, filteredPlans.length, navigate]);

  const getIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes("premium") || lower.includes("enterprise"))
      return <Shield className="h-6 w-6 text-green-600" />;
    if (lower.includes("standard") || lower.includes("business"))
      return <Zap className="h-6 w-6 text-blue-600" />;
    return <CheckCircle className="h-6 w-6 text-gray-600" />;
  };

  const uptimeBadge = (pct: number) => {
    if (pct >= 99.9) return "bg-green-100 text-green-800 border-green-200";
    if (pct >= 99.5) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const respBadge = (hrs: number) => {
    if (hrs <= 1) return "bg-green-100 text-green-800 border-green-200";
    if (hrs <= 4) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  return (
    <>
      <GoogleAnalyticsTracker />
      <Helmet>
        <title>Service Level Agreements – {companyName}</title>
        <meta
          name="description"
          content={`Public SLA plans offered by ${companyName}.`}
        />
      </Helmet>

      <PublicLayout>
        <div className="container mx-auto px-6 py-12 space-y-10">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {(referrer || slaName) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  className="flex items-center space-x-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back</span>
                </Button>
              )}
              <div>
                <h1 className="text-3xl font-bold">Service Level Agreements</h1>
                <p className="text-muted-foreground mt-1">
                  {slaName ? `Details for ${slaName} SLA plan` : "Our commitment to reliability"}
                </p>
              </div>
            </div>
            {slaName && (
              <Badge variant="outline" className="text-sm">
                <Info className="h-4 w-4 mr-1" /> Filtered by: {slaName}
              </Badge>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <p>Loading SLA plans…</p>
          ) : filteredPlans.length === 0 ? (
            <p>No SLA plans available.</p>
          ) : (
            <div
              className={`grid gap-6 ${
                filteredPlans.length === 1
                  ? "grid-cols-1"
                  : filteredPlans.length === 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
              }`}
            >
              {filteredPlans.map((plan) => (
                <Card key={plan.id} className="border-2 hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getIcon(plan.name)}
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      {plan.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-muted-foreground text-sm mt-2">
                        {plan.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2 text-sm">
                      <Shield className="h-4 w-4" />
                      <span>Guaranteed Uptime</span>
                      <Badge
                        variant="outline"
                        className={`${uptimeBadge(plan.uptime_guarantee_percentage)} ml-auto`}
                      >
                        {plan.uptime_guarantee_percentage}%
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <Clock className="h-4 w-4" />
                      <span>Response Time</span>
                      <Badge
                        variant="outline"
                        className={`${respBadge(plan.response_time_hours)} ml-auto`}
                      >
                        {plan.response_time_hours}h
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Resolution Time</span>
                      <Badge variant="outline" className="ml-auto">
                        {plan.resolution_time_hours}h
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* General SLA Information */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="text-2xl">Understanding Our SLA Commitments</CardTitle>
            </CardHeader>
            <CardContent className="prose max-w-none">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-blue-600" />
                    Uptime Guarantee
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Our uptime guarantee represents the minimum percentage of time your services will be available each month, excluding scheduled maintenance.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 99.9% = Maximum 43 minutes downtime per month</li>
                    <li>• 99.5% = Maximum 3.6 hours downtime per month</li>
                    <li>• 99.0% = Maximum 7.2 hours downtime per month</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-green-600" />
                    Response Time
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Response time indicates how quickly our support team will acknowledge and begin working on your support requests.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Critical issues: Immediate response</li>
                    <li>• High priority: Within SLA response time</li>
                    <li>• Normal priority: Best effort within SLA</li>
                  </ul>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Service Credits</h4>
                <p className="text-blue-700 text-sm">
                  If we fail to meet our SLA commitments, you may be eligible for service credits.
                  Credits are calculated based on the duration and severity of the service interruption
                  and will be applied to your account automatically or upon request.
                </p>
              </div>

              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Exclusions</h4>
                <p className="text-muted-foreground text-sm">
                  SLA commitments do not apply to downtime caused by scheduled maintenance,
                  customer-initiated actions, external factors beyond our control, or force majeure events.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    </>
  );
}
