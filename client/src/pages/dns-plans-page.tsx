import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, Globe, CreditCard, Calendar, AlertCircle } from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";

interface DnsPlan {
  id: number;
  name: string;
  description: string;
  price: number;
  maxDomains: number;
  maxRecords: number;
  features: string[];
  isActive: boolean;
  displayOrder: number;
}

interface DnsPlanSubscription {
  id: number;
  planId: number;
  status: string;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  lastPaymentDate: string;
  nextPaymentDate: string;
  plan: DnsPlan;
}

interface CustomCreditsBalance {
  customCredits: number;
}

export default function DnsPlansPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);
  const brandColors = getBrandColors();

  // Fetch available DNS plans
  const { data: dnsPlans = [], isLoading: plansLoading } = useQuery<DnsPlan[]>({
    queryKey: ["/api/dns-plans"],
  });

  // Fetch user's DNS plan subscriptions
  const { data: subscriptions = [], isLoading: subscriptionsLoading } = useQuery<DnsPlanSubscription[]>({
    queryKey: ["/api/dns-plans/subscriptions"],
  });

  // Fetch custom credits balance
  const { data: balanceData } = useQuery<CustomCreditsBalance>({
    queryKey: ["/api/billing/balance"],
  });

  // Purchase DNS plan mutation
  const purchasePlanMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await fetch("/api/dns-plans/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to purchase DNS plan");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "DNS Plan Purchased!",
        description: `Successfully purchased ${data.plan.name} plan. Your subscription is now active.`,
      });
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/dns-plans/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      setPurchasingPlanId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Failed to purchase DNS plan. Please try again.",
        variant: "destructive",
      });
      setPurchasingPlanId(null);
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await fetch("/api/dns-plans/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to cancel subscription");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your DNS plan subscription has been cancelled successfully.",
      });
      
      // Refresh subscriptions
      queryClient.invalidateQueries({ queryKey: ["/api/dns-plans/subscriptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handlePurchasePlan = (planId: number) => {
    setPurchasingPlanId(planId);
    purchasePlanMutation.mutate(planId);
  };

  const handleCancelSubscription = (subscriptionId: number) => {
    if (confirm("Are you sure you want to cancel this subscription? This action cannot be undone.")) {
      cancelSubscriptionMutation.mutate(subscriptionId);
    }
  };

  // Check if user has active subscription for a plan
  const hasActiveSubscription = (planId: number) => {
    return subscriptions.some(sub => sub.planId === planId && sub.status === 'active');
  };

  // Get active subscription for a plan
  const getActiveSubscription = (planId: number) => {
    return subscriptions.find(sub => sub.planId === planId && sub.status === 'active');
  };

  const customCredits = balanceData?.customCredits || 0;

  if (plansLoading || subscriptionsLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="ml-2">Loading DNS plans...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Header */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                  DNS Plans
                </h1>
                <p className="text-muted-foreground text-lg mt-1">
                  Choose the perfect DNS plan for your domains
                </p>
              </div>
            </div>

            {/* Custom Credits Balance */}
            <div className="flex items-center space-x-2 mt-6">
              <CreditCard className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium text-foreground">
                Available Custom Credits: <span className="text-secondary font-bold">${customCredits.toFixed(2)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Your Active DNS Plans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.map((subscription) => (
                  <div key={subscription.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{subscription.plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {subscription.plan.maxDomains} domains • {subscription.plan.maxRecords} records per domain
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Expires: {new Date(subscription.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'}>
                        {subscription.status}
                      </Badge>
                      {subscription.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelSubscription(subscription.id)}
                          disabled={cancelSubscriptionMutation.isPending}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dnsPlans.map((plan) => {
            const isActive = hasActiveSubscription(plan.id);
            const subscription = getActiveSubscription(plan.id);
            const canAfford = customCredits >= plan.price;
            const isPurchasing = purchasingPlanId === plan.id;

            return (
              <Card key={plan.id} className={`relative ${isActive ? 'ring-2 ring-primary' : ''}`}>
                {isActive && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold" style={{ color: brandColors.primary.full }}>
                    ${plan.price.toFixed(2)}
                    <span className="text-sm font-normal text-muted-foreground">/month</span>
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{plan.maxDomains} Domains</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{plan.maxRecords} DNS Records per Domain</span>
                    </div>
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {!canAfford && !isActive && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Insufficient credits. Need ${(plan.price - customCredits).toFixed(2)} more.
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={isActive || !canAfford || isPurchasing}
                    onClick={() => handlePurchasePlan(plan.id)}
                    style={!isActive && canAfford ? {
                      backgroundColor: brandColors.primary.full,
                      color: 'white'
                    } : undefined}
                  >
                    {isPurchasing ? (
                      "Purchasing..."
                    ) : isActive ? (
                      "Current Plan"
                    ) : !canAfford ? (
                      "Insufficient Credits"
                    ) : (
                      "Purchase Plan"
                    )}
                  </Button>

                  {isActive && subscription && (
                    <p className="text-xs text-center text-muted-foreground">
                      Renews on {new Date(subscription.nextPaymentDate).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Need More Credits */}
        {customCredits < Math.min(...dnsPlans.map(p => p.price)) && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-amber-600 mb-4" />
              <h3 className="text-lg font-medium text-amber-800 mb-2">Need More Credits?</h3>
              <p className="text-amber-700 mb-4">
                Add custom credits to your account to purchase DNS plans.
              </p>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => window.location.href = '/billing'}
              >
                Add Custom Credits
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
