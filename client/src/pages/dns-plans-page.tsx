import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Globe, CreditCard, Calendar, AlertCircle, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
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

  // Filter and paginate subscriptions
  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSubscriptions.length / itemsPerPage);
  const paginatedSubscriptions = filteredSubscriptions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          </div>
        </div>

        {/* Custom Credits Card - Moved to top */}
        <Card className="overflow-hidden bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200">
          <div className="px-6 py-4 flex items-center justify-between border-b border-border">
            <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-secondary" />
              Custom Credits
            </CardTitle>
            <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-secondary" />
            </div>
          </div>
          <CardContent className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <span className={`text-2xl font-bold ${customCredits < 0 ? 'text-red-600' : 'text-secondary'}`}>
                    ${customCredits.toFixed(2)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Available for DNS plan purchases
                </p>
              </div>
              <Button
                variant="outline"
                className="border-secondary/20 text-secondary hover:bg-secondary/10"
                onClick={() => window.location.href = '/billing'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Credits
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Subscriptions */}
        {subscriptions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Your Active DNS Plans ({filteredSubscriptions.length})
                </CardTitle>
                {subscriptions.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search plans..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1); // Reset to first page when searching
                      }}
                      className="pl-10 w-64"
                    />
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedSubscriptions.map((subscription) => (
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
                      {subscription.status === 'active' && subscription.plan.price > 0 && (
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredSubscriptions.length)} of {filteredSubscriptions.length} plans
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dnsPlans
            .sort((a, b) => a.displayOrder - b.displayOrder) // Sort by display order
            .map((plan) => {
            const isActive = hasActiveSubscription(plan.id);
            const subscription = getActiveSubscription(plan.id);
            const canAfford = customCredits >= plan.price || plan.price === 0; // Free plans are always affordable
            const isPurchasing = purchasingPlanId === plan.id;
            const isFree = plan.price === 0;

            return (
              <Card key={plan.id} className={`relative ${isActive ? 'ring-2 ring-primary' : ''} ${isFree ? 'border-green-200 bg-green-50/50' : ''}`}>
                {isActive && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">Current Plan</Badge>
                  </div>
                )}
                {isFree && !isActive && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-green-600 text-white">Free</Badge>
                  </div>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-xl flex items-center justify-center gap-2">
                    {plan.name}
                    {isFree && <Badge variant="outline" className="text-green-600 border-green-600">FREE</Badge>}
                  </CardTitle>
                  <div className="text-3xl font-bold" style={{ color: isFree ? '#16a34a' : brandColors.primary.full }}>
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

                  {!canAfford && !isActive && !isFree && (
                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-sm text-amber-700">
                        Insufficient credits. Need ${(plan.price - customCredits).toFixed(2)} more.
                      </span>
                    </div>
                  )}

                  <Button
                    className="w-full"
                    disabled={isActive || (!canAfford && !isFree) || isPurchasing}
                    onClick={() => handlePurchasePlan(plan.id)}
                    style={!isActive && canAfford ? {
                      backgroundColor: isFree ? '#16a34a' : brandColors.primary.full,
                      color: 'white'
                    } : undefined}
                  >
                    {isPurchasing ? (
                      "Activating..."
                    ) : isActive ? (
                      "Current Plan"
                    ) : !canAfford && !isFree ? (
                      "Insufficient Credits"
                    ) : isFree ? (
                      "Activate Free Plan"
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


      </div>
    </DashboardLayout>
  );
}
