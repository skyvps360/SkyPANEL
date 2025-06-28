import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from 'react-helmet';
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Shield, Zap, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useLocation } from "wouter";

interface SlaPlan {
  id: number;
  name: string;
  description: string | null;
  price: string;
  uptime_guarantee_percentage: number;
  response_time_hours: number;
  is_active: boolean;
}

export function DashboardSLAPage() {
  const [companyName, setCompanyName] = useState("SkyVPS360");
  const [location] = useLocation();
  
  // Parse query parameters to get specific SLA name
  const urlParams = new URLSearchParams(window.location.search);
  const slaName = urlParams.get('sla') || urlParams.get('SLAName');

  // Fetch branding information
  const { data: branding } = useQuery<{ company_name: string }>({
    queryKey: ["/api/settings/branding"]
  });

  // Fetch SLA plans
  const { data: slaPlans, isLoading: slaPlansLoading } = useQuery<SlaPlan[]>({
    queryKey: ["/api/sla-plans"],
    retry: 1,
  });

  // Update branding information when data is available
  useEffect(() => {
    if (branding?.company_name) {
      setCompanyName(branding.company_name);
      document.title = `Service Level Agreements - ${branding.company_name}`;
    }
  }, [branding]);

  // Filter SLA plans to show only the requested one if specified
  const filteredSlaPlans = slaName 
    ? slaPlans?.filter(plan => plan.name.toLowerCase() === slaName.toLowerCase()) || []
    : slaPlans || [];

  const getSLAIcon = (slaName: string) => {
    const name = slaName.toLowerCase();
    if (name.includes('premium') || name.includes('enterprise')) {
      return <Shield className="h-6 w-6 text-green-600" />;
    } else if (name.includes('standard') || name.includes('business')) {
      return <Zap className="h-6 w-6 text-blue-600" />;
    } else {
      return <CheckCircle className="h-6 w-6 text-gray-600" />;
    }
  };

  const getSLABadgeColor = (uptimePercentage: number) => {
    if (uptimePercentage >= 99.9) return "bg-green-100 text-green-800 border-green-200";
    if (uptimePercentage >= 99.5) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const getResponseTimeBadgeColor = (hours: number) => {
    if (hours <= 1) return "bg-green-100 text-green-800 border-green-200";
    if (hours <= 4) return "bg-blue-100 text-blue-800 border-blue-200";
    return "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  return (
    <>
      <Helmet>
        <title>Service Level Agreements - {companyName}</title>
        <meta name="description" content={`Service Level Agreements for ${companyName} - VPS Management Platform.`} />
      </Helmet>

      <DashboardLayout>
        <div className="container mx-auto px-6 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Level Agreements</h1>
              <p className="text-gray-600 mt-2">
                {slaName 
                  ? `Details for ${slaName} SLA plan`
                  : "Our commitment to service quality and reliability"
                }
              </p>
            </div>
            {slaName && (
              <Badge variant="outline" className="text-sm">
                <Info className="h-4 w-4 mr-1" />
                Filtered by: {slaName}
              </Badge>
            )}
          </div>

          {/* SLA Plans Overview */}
          {slaPlansLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-full mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSlaPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSlaPlans.map((plan) => (
                <Card key={plan.id} className="border-2 hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getSLAIcon(plan.name)}
                        <CardTitle className="text-xl">{plan.name}</CardTitle>
                      </div>
                      {plan.is_active ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {plan.description && (
                      <p className="text-gray-600 text-sm mt-2">{plan.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Uptime Guarantee */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Uptime Guarantee</span>
                      </div>
                      <Badge className={getSLABadgeColor(plan.uptime_guarantee_percentage)}>
                        {plan.uptime_guarantee_percentage}%
                      </Badge>
                    </div>

                    {/* Response Time */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium">Response Time</span>
                      </div>
                      <Badge className={getResponseTimeBadgeColor(plan.response_time_hours)}>
                        {plan.response_time_hours}h
                      </Badge>
                    </div>

                    {/* Price */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">Monthly Cost</span>
                      </div>
                      <span className="text-lg font-bold text-green-600">
                        ${parseFloat(plan.price).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : slaName ? (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="flex items-center space-x-3 p-6">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <h3 className="font-medium text-yellow-800">SLA Plan Not Found</h3>
                  <p className="text-yellow-700 text-sm">
                    The SLA plan "{slaName}" could not be found. Please check the name and try again.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center space-x-3 p-6">
                <Info className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-800">No SLA Plans Available</h3>
                  <p className="text-gray-600 text-sm">
                    There are currently no SLA plans configured. Please contact your administrator.
                  </p>
                </div>
              </CardContent>
            </Card>
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
                  <p className="text-gray-600 text-sm mb-4">
                    Our uptime guarantee represents the minimum percentage of time your services will be available each month, excluding scheduled maintenance.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
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
                  <p className="text-gray-600 text-sm mb-4">
                    Response time indicates how quickly our support team will acknowledge and begin working on your support requests.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
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
                <p className="text-gray-700 text-sm">
                  SLA commitments do not apply to downtime caused by scheduled maintenance, 
                  customer-initiated actions, external factors beyond our control, or force majeure events.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </>
  );
}

export default DashboardSLAPage;