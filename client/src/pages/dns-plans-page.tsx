import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DataTable } from "@/components/ui/data-table";
import { Check, Globe, CreditCard, Calendar, AlertCircle, Search, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { getBrandColors } from "@/lib/brand-theme";
import { DomainSelectionModal } from "@/components/dns/DomainSelectionModal";
import { getDnsDomains } from "@/lib/api";

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

  // Fetch branding data for custom credits name
  const { data: brandingData } = useQuery<{
    company_name: string;
    custom_credits_name?: string;
  }>({
    queryKey: ['/api/settings/branding'],
  });

  // Domain selection modal state for downgrades
  const [domainSelectionModal, setDomainSelectionModal] = useState<{
    isOpen: boolean;
    planId: number | null;
    currentPlanName: string;
    newPlanName: string;
    currentDomainLimit: number;
    newDomainLimit: number;
  }>({
    isOpen: false,
    planId: null,
    currentPlanName: '',
    newPlanName: '',
    currentDomainLimit: 0,
    newDomainLimit: 0,
  });

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

  // Change DNS plan mutation (upgrade/downgrade/switch)
  const changePlanMutation = useMutation({
    mutationFn: async ({ planId, selectedDomainIds }: { planId: number; selectedDomainIds?: number[] }) => {
      const response = await fetch("/api/dns-plans/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, selectedDomainIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change DNS plan");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Show main success message
      toast({
        title: `DNS Plan ${data.action === 'upgraded' ? 'Upgraded' : 'Changed'}`,
        description: data.message || `DNS plan ${data.action} successfully`,
      });

      // Show detailed domain deletion results if available
      if (data.domainDeletionResults) {
        const results = data.domainDeletionResults;

        // Show success message for successfully deleted domains
        if (results.successful.length > 0) {
          toast({
            title: "Domains Removed Successfully",
            description: `Successfully removed ${results.successful.length} domain${results.successful.length !== 1 ? 's' : ''} from both local database and InterServer: ${results.successful.join(', ')}`,
          });
        }

        // Show warning for domains that failed to delete from InterServer
        if (results.failed.length > 0) {
          toast({
            title: "Domain Deletion Issues",
            description: `${results.failed.length} domain${results.failed.length !== 1 ? 's' : ''} had deletion issues: ${results.failed.map(f => `${f.name} (${f.error})`).join(', ')}`,
            variant: "destructive",
          });
        }

        // Show info for domains without InterServer IDs
        if (results.skippedNoInterServerId.length > 0) {
          toast({
            title: "Domains Removed Locally Only",
            description: `${results.skippedNoInterServerId.length} domain${results.skippedNoInterServerId.length !== 1 ? 's' : ''} removed from local database only (no InterServer ID): ${results.skippedNoInterServerId.join(', ')}`,
          });
        }
      }

      // Refresh all DNS-related data for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/dns-plans/subscriptions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

      // CRITICAL: Invalidate DNS domain and plan limit queries for real-time UI updates
      queryClient.invalidateQueries({ queryKey: ["dns-plan-limits"] });
      queryClient.invalidateQueries({ queryKey: ["dns-domains"] });

      setPurchasingPlanId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Plan Change Failed",
        description: error.message || "Failed to change DNS plan",
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

  const handleChangePlan = async (planId: number) => {
    const targetPlan = dnsPlans.find(p => p.id === planId);
    const currentSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
    const currentPlan = currentSubscription?.plan;

    if (!targetPlan || !currentPlan) {
      setPurchasingPlanId(planId);
      changePlanMutation.mutate({ planId });
      return;
    }

    // Check if this is a downgrade that requires domain selection
    const isDowngrade = targetPlan.maxDomains < currentPlan.maxDomains;

    if (isDowngrade) {
      // Fetch current domain count to check if selection is needed
      try {
        const domainsResponse = await getDnsDomains();
        const currentDomainCount = domainsResponse.domains?.length || 0;

        if (currentDomainCount > targetPlan.maxDomains) {
          // Show domain selection modal
          setDomainSelectionModal({
            isOpen: true,
            planId: planId,
            currentPlanName: currentPlan.name,
            newPlanName: targetPlan.name,
            currentDomainLimit: currentPlan.maxDomains,
            newDomainLimit: targetPlan.maxDomains,
          });
          return;
        }
      } catch (error) {
        console.error('Failed to fetch domains for downgrade check:', error);
      }
    }

    // Proceed with normal plan change
    setPurchasingPlanId(planId);
    changePlanMutation.mutate({ planId });
  };

  const handleCancelSubscription = (subscriptionId: number) => {
    if (confirm("Are you sure you want to cancel this subscription? This action cannot be undone.")) {
      cancelSubscriptionMutation.mutate(subscriptionId);
    }
  };

  const handleDomainSelectionConfirm = (selectedDomainIds: number[]) => {
    if (domainSelectionModal.planId) {
      setPurchasingPlanId(domainSelectionModal.planId);
      changePlanMutation.mutate({
        planId: domainSelectionModal.planId,
        selectedDomainIds
      });
    }
    setDomainSelectionModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleDomainSelectionCancel = () => {
    setDomainSelectionModal(prev => ({ ...prev, isOpen: false }));
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
              {brandingData?.custom_credits_name || 'Custom Credits'}
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
                  Your Current DNS Plan
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {/* Show current plan details */}
              {subscriptions.length > 0 && (
                <div className="p-6 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-foreground">{subscriptions[0].plan.name}</h3>
                        <Badge variant={subscriptions[0].status === 'active' ? 'default' : 'secondary'}>
                          {subscriptions[0].status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">
                        {subscriptions[0].plan.maxDomains} domains • {subscriptions[0].plan.maxRecords} records per domain
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Next billing date:</span>
                          <div className="font-medium">
                            {subscriptions[0].plan.price === 0
                              ? 'Never (Free Plan)'
                              : new Date(subscriptions[0].nextPaymentDate).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Days remaining:</span>
                          <div className="font-medium">
                            {subscriptions[0].plan.price === 0
                              ? '∞'
                              : Math.max(0, Math.ceil((new Date(subscriptions[0].endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        ${subscriptions[0].plan.price.toFixed(2)}
                        <span className="text-sm font-normal text-muted-foreground">/month</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Available Plans Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Compare DNS Plans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={dnsPlans.sort((a, b) => a.displayOrder - b.displayOrder)}
              enablePagination={false}
              columns={[
                {
                  header: "Plan",
                  accessorKey: "name",
                  cell: (plan: DnsPlan) => {
                    const isActive = hasActiveSubscription(plan.id);
                    const isFree = plan.price === 0;

                    return (
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{plan.name}</span>
                            {isActive && (
                              <Badge className="bg-primary text-primary-foreground text-xs">Current</Badge>
                            )}
                            {isFree && (
                              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">FREE</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  header: "Price",
                  accessorKey: "price",
                  cell: (plan: DnsPlan) => {
                    const isFree = plan.price === 0;
                    return (
                      <div className="text-center">
                        <div className={`text-lg font-bold ${isFree ? 'text-green-600' : 'text-primary'}`}>
                          ${plan.price.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">/month</div>
                      </div>
                    );
                  },
                },
                {
                  header: "Domains",
                  accessorKey: "maxDomains",
                  cell: (plan: DnsPlan) => (
                    <div className="text-center">
                      <div className="font-medium">{plan.maxDomains}</div>
                      <div className="text-xs text-muted-foreground">domains</div>
                    </div>
                  ),
                },
                {
                  header: "Records",
                  accessorKey: "maxRecords",
                  cell: (plan: DnsPlan) => (
                    <div className="text-center">
                      <div className="font-medium">{plan.maxRecords}</div>
                      <div className="text-xs text-muted-foreground">per domain</div>
                    </div>
                  ),
                },
                {
                  header: "Features",
                  cell: (plan: DnsPlan) => (
                    <div className="space-y-1">
                      {plan.features.slice(0, 3).map((feature, index) => (
                        <div key={index} className="flex items-center gap-1 text-sm">
                          <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </div>
                      ))}
                      {plan.features.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          +{plan.features.length - 3} more
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Action",
                  cell: (plan: DnsPlan) => {
                    const isActive = hasActiveSubscription(plan.id);
                    const subscription = getActiveSubscription(plan.id);
                    const currentSubscription = subscriptions.length > 0 ? subscriptions[0] : null;
                    const currentPlan = currentSubscription?.plan;
                    const isPurchasing = purchasingPlanId === plan.id;
                    const isFree = plan.price === 0;

                    // Calculate prorated cost/refund for plan changes
                    let proratedAmount = 0;
                    let isUpgrade = false;
                    let isDowngrade = false;

                    if (currentPlan && currentPlan.id !== plan.id) {
                      // Calculate proper billing cycle end date
                      const now = new Date();
                      let billingCycleEndDate;

                      if (currentSubscription && new Date(currentSubscription.endDate).getFullYear() > 2050) {
                        // This is a Free plan with far-future endDate, calculate proper monthly cycle
                        billingCycleEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); // End of current month
                      } else {
                        // This is a paid plan with proper billing cycle
                        billingCycleEndDate = currentSubscription ? new Date(currentSubscription.endDate) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                      }

                      const daysRemaining = Math.max(0, Math.ceil((billingCycleEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

                      if (plan.price > currentPlan.price) {
                        isUpgrade = true;
                        proratedAmount = (plan.price - currentPlan.price) * (daysRemaining / 30);
                      } else if (plan.price < currentPlan.price) {
                        isDowngrade = true;
                        proratedAmount = (currentPlan.price - plan.price) * (daysRemaining / 30);
                      }
                    }

                    const canAfford = isFree || !isUpgrade || customCredits >= proratedAmount;

                    return (
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          disabled={isActive || (!canAfford && !isFree) || isPurchasing}
                          onClick={() => handleChangePlan(plan.id)}
                          variant={isActive ? "outline" : "default"}
                          className={`w-full ${
                            !isActive && canAfford && isFree ? 'bg-green-600 hover:bg-green-700 text-white' :
                            !isActive && canAfford && isUpgrade ? 'bg-primary hover:bg-primary/90 text-white' :
                            !isActive && canAfford && isDowngrade ? 'bg-green-600 hover:bg-green-700 text-white' :
                            ''
                          }`}
                        >
                          {isPurchasing ? (
                            "Processing..."
                          ) : isActive ? (
                            "Current Plan"
                          ) : !canAfford && !isFree ? (
                            "Insufficient Credits"
                          ) : isFree ? (
                            currentPlan ? "Downgrade" : "Activate"
                          ) : isUpgrade ? (
                            "Upgrade"
                          ) : isDowngrade ? (
                            "Downgrade"
                          ) : (
                            "Switch"
                          )}
                        </Button>

                        {/* Show prorated cost/refund information */}
                        {!isActive && currentPlan && (isUpgrade || isDowngrade) && (
                          <div className={`text-xs p-2 rounded ${
                            isUpgrade ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {isUpgrade
                              ? `Cost: $${proratedAmount.toFixed(2)}`
                              : `Refund: $${proratedAmount.toFixed(2)}`
                            }
                          </div>
                        )}

                        {!canAfford && !isActive && !isFree && isUpgrade && (
                          <div className="text-xs p-2 bg-amber-50 text-amber-700 rounded">
                            Need ${(proratedAmount - customCredits).toFixed(2)} more
                          </div>
                        )}

                        {isActive && subscription && (
                          <div className="text-xs text-center text-muted-foreground">
                            {plan.price === 0 ? 'Never expires' : `Renews ${new Date(subscription.nextPaymentDate).toLocaleDateString()}`}
                          </div>
                        )}
                      </div>
                    );
                  },
                },
              ]}
              isLoading={plansLoading}
              enableSearch={false}
              emptyMessage="No DNS plans available"
            />
          </CardContent>
        </Card>

        {/* Domain Selection Modal for Downgrades */}
        <DomainSelectionModal
          isOpen={domainSelectionModal.isOpen}
          onClose={handleDomainSelectionCancel}
          onConfirm={handleDomainSelectionConfirm}
          currentPlanName={domainSelectionModal.currentPlanName}
          newPlanName={domainSelectionModal.newPlanName}
          currentDomainLimit={domainSelectionModal.currentDomainLimit}
          newDomainLimit={domainSelectionModal.newDomainLimit}
          isLoading={changePlanMutation.isPending}
        />

      </div>
    </DashboardLayout>
  );
}
