import type { Express, Request, Response } from "express";
import { db } from "../db";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import * as schema from "../../shared/schema";
import { dnsDomains as dnsDomainsTable, dnsPlans as dnsPlansTable, dnsPlanSubscriptions as dnsPlanSubscriptionsTable, transactions as transactionsTable, InsertTransaction } from "../../shared/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
// Import interServerApi when needed, e.g., import { interServerApi } from './interserver-api';

// Helper function (copied from routes_new.ts for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

const router = (app: Express) => {
  // Get all available DNS plans
  app.get("/api/dns-plans", async (req: Request, res: Response) => {
    try {
      const plans = await db.select()
        .from(dnsPlansTable)
        .where(eq(dnsPlansTable.isActive, true))
        .orderBy(dnsPlansTable.displayOrder, dnsPlansTable.price);
      res.json(plans);
    } catch (error: any) {
      console.error("Error fetching DNS plans:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's DNS plan subscriptions
  app.get("/api/dns-plans/subscriptions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user! as any).id;
      const subscriptions = await db.select({
        id: dnsPlanSubscriptionsTable.id,
        planId: dnsPlanSubscriptionsTable.planId,
        status: dnsPlanSubscriptionsTable.status,
        startDate: dnsPlanSubscriptionsTable.startDate,
        endDate: dnsPlanSubscriptionsTable.endDate,
        autoRenew: dnsPlanSubscriptionsTable.autoRenew,
        lastPaymentDate: dnsPlanSubscriptionsTable.lastPaymentDate,
        nextPaymentDate: dnsPlanSubscriptionsTable.nextPaymentDate,
        createdAt: dnsPlanSubscriptionsTable.createdAt,
        plan: {
          id: dnsPlansTable.id,
          name: dnsPlansTable.name,
          description: dnsPlansTable.description,
          price: dnsPlansTable.price,
          maxDomains: dnsPlansTable.maxDomains,
          maxRecords: dnsPlansTable.maxRecords,
          features: dnsPlansTable.features
        }
      })
        .from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(eq(dnsPlanSubscriptionsTable.userId, userId))
        .orderBy(desc(dnsPlanSubscriptionsTable.createdAt));
      res.json(subscriptions);
    } catch (error: any) {
      console.error("Error fetching DNS plan subscriptions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Purchase a DNS plan using custom credits
  app.post("/api/dns-plans/purchase", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      const userId = (req.user! as any).id;

      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }

      const [plan] = await db.select().from(dnsPlansTable)
        .where(and(eq(dnsPlansTable.id, planId), eq(dnsPlansTable.isActive, true)))
        .limit(1);
      if (!plan) {
        return res.status(404).json({ error: "DNS plan not found or inactive" });
      }

      const existingActiveSubscriptions = await db.select().from(dnsPlanSubscriptionsTable)
        .where(and(eq(dnsPlanSubscriptionsTable.userId, userId), eq(dnsPlanSubscriptionsTable.status, 'active')));
      if (existingActiveSubscriptions.length > 0) {
        const hasThisPlan = existingActiveSubscriptions.some(sub => sub.planId === planId);
        if (hasThisPlan) {
          return res.status(400).json({ error: "You already have an active subscription for this plan" });
        } else {
          return res.status(400).json({
            error: "You already have an active DNS plan. Use the plan change feature to upgrade or downgrade.",
            shouldUseChangeEndpoint: true,
            currentPlans: existingActiveSubscriptions.map(sub => sub.planId)
          });
        }
      }

      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(user ? 400 : 404).json({ error: user ? "User is not linked to VirtFusion" : "User not found" });
      }

      await virtFusionApi.updateSettings();
      if (!virtFusionApi.isConfigured()) {
        return res.status(500).json({ error: "VirtFusion API not configured" });
      }

      let virtFusionBalance = 0;
      try {
        const balanceResponse = await virtFusionApi.getUserBalance(user.virtFusionId); // This method might not exist, prefer getUserHourlyStats
        virtFusionBalance = balanceResponse?.data?.balance || 0; // Assuming direct balance property
         // Fallback or preferred method:
        if (!balanceResponse?.data?.balance) {
            const hourlyStats = await virtFusionApi.getUserHourlyStats(user.id); // extRelationId is user.id
            if (hourlyStats?.data?.credit?.tokens) {
                 virtFusionBalance = parseFloat(hourlyStats.data.credit.tokens);
            }
        }
      } catch (error: any) {
        console.error("Error fetching VirtFusion balance:", error);
        return res.status(500).json({ error: "Failed to check VirtFusion balance" });
      }

      const tokensRequired = plan.price * 100;
      if (virtFusionBalance < tokensRequired) {
        return res.status(400).json({ error: "Insufficient VirtFusion tokens", required: tokensRequired, available: virtFusionBalance });
      }

      const now = new Date();
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const endDate = new Date(nextFirstOfMonth.getTime() - 1);
      const nextPaymentDate = nextFirstOfMonth;

      const transaction: InsertTransaction = {
        userId: userId, amount: -plan.price, type: "dns_plan_purchase",
        description: `DNS Plan Purchase: ${plan.name} using VirtFusion tokens`,
        status: "completed", paymentMethod: "virtfusion_tokens"
      };
      const createdTransaction = await storage.createTransaction(transaction);

      try {
        await virtFusionApi.removeCreditFromUserByExtRelationId(userId, { // Use userId as extRelationId
          tokens: tokensRequired, reference_1: createdTransaction.id,
          reference_2: `DNS Plan Purchase: ${plan.name}`
        });
      } catch (error: any) {
        console.error("Error deducting VirtFusion tokens:", error);
        await storage.updateTransaction(createdTransaction.id, { status: "failed", description: `${transaction.description} (Failed to deduct tokens)` });
        return res.status(500).json({ error: "Failed to deduct VirtFusion tokens" });
      }

      await db.insert(dnsPlanSubscriptionsTable).values({
        userId: userId, planId: plan.id, status: 'active', startDate: now, endDate: endDate,
        autoRenew: true, lastPaymentDate: now, nextPaymentDate: nextPaymentDate
      });

      res.json({
        success: true, message: `Successfully purchased ${plan.name} plan`,
        subscription: { planId: plan.id, planName: plan.name, startDate: now, endDate: endDate, nextPaymentDate: nextPaymentDate },
        tokensDeducted: tokensRequired
      });
    } catch (error: any) {
      console.error("Error purchasing DNS plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Change DNS plan (upgrade/downgrade)
  app.post("/api/dns-plans/change", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { planId, selectedDomainIds } = req.body;
      const userId = (req.user! as any).id;

      if (!planId) return res.status(400).json({ error: "Plan ID is required" });

      const [newPlan] = await db.select().from(dnsPlansTable)
        .where(and(eq(dnsPlansTable.id, planId), eq(dnsPlansTable.isActive, true))).limit(1);
      if (!newPlan) return res.status(404).json({ error: "DNS plan not found or inactive" });

      const activeSubscriptions = await db.select({
        id: dnsPlanSubscriptionsTable.id, planId: dnsPlanSubscriptionsTable.planId,
        endDate: dnsPlanSubscriptionsTable.endDate,
        plan: { id: dnsPlansTable.id, name: dnsPlansTable.name, price: dnsPlansTable.price, maxDomains: dnsPlansTable.maxDomains, maxRecords: dnsPlansTable.maxRecords }
      }).from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(and(eq(dnsPlanSubscriptionsTable.userId, userId), eq(dnsPlanSubscriptionsTable.status, 'active')));

      if (activeSubscriptions.length === 0) return res.status(404).json({ error: "No active DNS plan subscription found" });
      if (activeSubscriptions.some(sub => sub.planId === planId)) return res.status(400).json({ error: "You are already subscribed to this plan" });

      const currentSubscription = activeSubscriptions.sort((a, b) => b.plan!.price - a.plan!.price)[0];
      const currentPlan = currentSubscription.plan!;

      const now = new Date();
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const billingCycleEndDate = new Date(nextFirstOfMonth.getTime() - 1);
      const daysRemaining = Math.max(0, Math.ceil((nextFirstOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      const proratedAmount = (newPlan.price - currentPlan.price) * (daysRemaining / 30);
      const isUpgrade = newPlan.price > currentPlan.price;

      if (isUpgrade && proratedAmount > 0) {
        const user = await storage.getUser(userId);
        if (!user || !user.virtFusionId) return res.status(user ? 400 : 404).json({ error: user ? "User not linked to VirtFusion" : "User not found" });

        await virtFusionApi.updateSettings();
        if (!virtFusionApi.isConfigured()) return res.status(500).json({ error: "VirtFusion API not configured" });

        let virtFusionBalance = 0;
        try {
            const balanceResponse = await virtFusionApi.getUserHourlyStats(user.id); // extRelationId is user.id
            if (balanceResponse?.data?.credit?.tokens) {
                 virtFusionBalance = parseFloat(balanceResponse.data.credit.tokens);
            }
        } catch (error: any) {
          console.error("Error fetching VirtFusion balance:", error);
          return res.status(500).json({ error: "Failed to check VirtFusion balance" });
        }
        const tokensRequired = proratedAmount * 100;
        if (virtFusionBalance < tokensRequired) {
          return res.status(400).json({ error: "Insufficient VirtFusion tokens for upgrade", required: tokensRequired, available: virtFusionBalance, shortfall: tokensRequired - virtFusionBalance });
        }
      }

      const endDate = billingCycleEndDate;
      const nextPaymentDate = newPlan.price === 0 ? endDate : nextFirstOfMonth;
      let domainDeletionResults = { successful: [] as string[], failed: [] as { name: string; error: string }[], skippedNoInterServerId: [] as string[] };

      await db.transaction(async (tx) => {
        if (Math.abs(proratedAmount) > 0.01) {
          const user = await storage.getUser(userId); // Re-fetch in transaction if needed by storage.createTransaction
          if (!user || !user.virtFusionId) throw new Error("User not found or not linked to VirtFusion for transaction");

          const transactionType = isUpgrade ? 'dns_plan_upgrade' : 'dns_plan_downgrade';
          const transactionDescription = isUpgrade ? `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name}` : `DNS Plan Downgrade: ${currentPlan.name} → ${newPlan.name}`;

          // Use tx for transaction consistency if storage.createTransaction supports it, otherwise use db
          await (storage.createTransactionWithinTx || storage.createTransaction)({ // Assuming storage can take a tx
            userId: userId, amount: -proratedAmount, type: transactionType,
            description: transactionDescription, status: 'completed', paymentMethod: 'virtfusion_tokens'
          }, tx); // Pass tx if supported
        }

        if (isUpgrade === false && newPlan.maxDomains < currentPlan.maxDomains) { // isDowngrade
            const userDomains = await tx.select().from(dnsDomainsTable).where(eq(dnsDomainsTable.userId, userId));
            if (userDomains.length > newPlan.maxDomains) {
                if (!selectedDomainIds || selectedDomainIds.length !== newPlan.maxDomains) {
                    throw new Error(`Domain selection required. Please select exactly ${newPlan.maxDomains} domain(s) to keep.`);
                }
                const validSelectedDomains = userDomains.filter(domain => selectedDomainIds.includes(domain.id));
                if (validSelectedDomains.length !== selectedDomainIds.length) {
                    throw new Error("Invalid domain selection.");
                }
                const domainsToRemove = userDomains.filter(domain => !selectedDomainIds.includes(domain.id));

                const { interServerApi } = await import('../interserver-api'); // Dynamic import
                let interServerDomains: any[] = [];
                try {
                    interServerDomains = await interServerApi.getDnsList();
                } catch (interServerError) { console.error('Failed to fetch domains from InterServer:', interServerError); }

                const selectedDomainNames = userDomains.filter(d => selectedDomainIds.includes(d.id)).map(d => d.name);
                const interServerDomainsToDelete = interServerDomains.filter(isd => !selectedDomainNames.includes(isd.name));

                for (const interServerDomain of interServerDomainsToDelete) {
                    try {
                        await interServerApi.deleteDnsDomain(interServerDomain.id);
                        domainDeletionResults.successful.push(interServerDomain.name);
                    } catch (interServerError: any) {
                        domainDeletionResults.failed.push({ name: interServerDomain.name, error: `InterServer: ${interServerError.message}` });
                    }
                }
                for (const domain of domainsToRemove) { // Local DB cleanup
                    try {
                        await tx.delete(dnsDomainsTable).where(eq(dnsDomainsTable.id, domain.id));
                         if (!interServerDomainsToDelete.some(isd => isd.name === domain.name) && !domain.interserverId) {
                            domainDeletionResults.skippedNoInterServerId.push(domain.name);
                        }
                    } catch (domainError: any) {
                         if (!domainDeletionResults.failed.some(f => f.name === domain.name)) {
                            domainDeletionResults.failed.push({ name: domain.name, error: `Local DB: ${domainError.message}` });
                        }
                    }
                }
            }
        }

        const activeSubscriptionIds = activeSubscriptions.map(sub => sub.id);
        await tx.update(dnsPlanSubscriptionsTable)
          .set({ status: 'cancelled', autoRenew: false, updatedAt: now })
          .where(inArray(dnsPlanSubscriptionsTable.id, activeSubscriptionIds));

        await tx.insert(dnsPlanSubscriptionsTable).values({
          userId: userId, planId: newPlan.id, status: 'active', startDate: now,
          endDate: endDate, autoRenew: true, lastPaymentDate: now, nextPaymentDate: nextPaymentDate
        });
      });

      // Post-transaction VirtFusion token handling
      if (Math.abs(proratedAmount) > 0.01) {
        const user = await storage.getUser(userId);
        if (user && user.virtFusionId) {
          await virtFusionApi.updateSettings();
          if (virtFusionApi.isConfigured()) {
            try {
              const tokensAmount = Math.abs(proratedAmount) * 100;
              if (isUpgrade) {
                await virtFusionApi.removeCreditFromUserByExtRelationId(userId, { // Use userId as extRelationId
                  tokens: tokensAmount, reference_1: Date.now(), reference_2: `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name}`
                });
              } else { // Downgrade or same price
                await virtFusionApi.addCreditToUser(userId, { // Use userId as extRelationId
                  tokens: tokensAmount, reference_1: Date.now(), reference_2: `DNS Plan Downgrade Refund: ${currentPlan.name} → ${newPlan.name}`
                });
              }
            } catch (virtFusionError: any) { console.error("Error handling VirtFusion tokens for DNS plan change:", virtFusionError); }
          }
        }
      }

      // Construct response message
      let message = `Successfully ${isUpgrade ? 'upgraded' : 'changed'} to ${newPlan.name}`;
      if (Math.abs(proratedAmount) > 0.01) message += ` (${isUpgrade ? 'charged' : 'refunded'} $${Math.abs(proratedAmount).toFixed(2)} prorated)`;

      let domainsRemovedCount = domainDeletionResults.successful.length + domainDeletionResults.failed.filter(f => f.error.startsWith("Local DB")).length; // Rough count
      if (domainsRemovedCount > 0) message += ` and attempted to remove ${domainsRemovedCount} domain(s)`;
      if (domainDeletionResults.failed.length > 0) message += ` (${domainDeletionResults.failed.length} domain deletion issue(s))`;

      res.json({
        success: true, action: isUpgrade ? 'upgraded' : 'changed', oldPlan: currentPlan, newPlan: newPlan,
        proratedAmount: Math.abs(proratedAmount), isUpgrade, daysRemaining,
        domainsRemoved: domainsRemovedCount, domainDeletionResults, message
      });

    } catch (error: any) {
      console.error("Error changing DNS plan:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Cancel a DNS plan subscription
  app.post("/api/dns-plans/cancel", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { subscriptionId } = req.body;
      const userId = (req.user! as any).id;
      if (!subscriptionId) return res.status(400).json({ error: "Subscription ID is required" });

      const [subscription] = await db.select().from(dnsPlanSubscriptionsTable)
        .where(and(eq(dnsPlanSubscriptionsTable.id, subscriptionId), eq(dnsPlanSubscriptionsTable.userId, userId), eq(dnsPlanSubscriptionsTable.status, 'active'))).limit(1);
      if (!subscription) return res.status(404).json({ error: "Active subscription not found" });

      await db.update(dnsPlanSubscriptionsTable)
        .set({ status: 'cancelled', autoRenew: false, updatedAt: new Date() })
        .where(eq(dnsPlanSubscriptionsTable.id, subscriptionId));
      res.json({ success: true, message: "DNS plan subscription cancelled successfully" });
    } catch (error: any) {
      console.error("Error cancelling DNS plan subscription:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get user's DNS plan limits and usage
  app.get("/api/dns-plans/limits", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user! as any).id;
      const activeSubscriptions = await db.select({
        planId: dnsPlanSubscriptionsTable.planId,
        plan: { id: dnsPlansTable.id, name: dnsPlansTable.name, maxDomains: dnsPlansTable.maxDomains, maxRecords: dnsPlansTable.maxRecords }
      }).from(dnsPlanSubscriptionsTable)
        .leftJoin(dnsPlansTable, eq(dnsPlanSubscriptionsTable.planId, dnsPlansTable.id))
        .where(and(eq(dnsPlanSubscriptionsTable.userId, userId), eq(dnsPlanSubscriptionsTable.status, 'active')));

      let totalMaxDomains = 0;
      let totalMaxRecords = 0;
      if (activeSubscriptions.length > 0 && activeSubscriptions[0].plan) {
        totalMaxDomains = activeSubscriptions[0].plan.maxDomains;
        totalMaxRecords = activeSubscriptions[0].plan.maxRecords;
      }

      const domainCountResult = await db.select({ count: schema.sql<number>`count(*)` }).from(dnsDomainsTable).where(eq(dnsDomainsTable.userId, userId));
      const currentDomains = domainCountResult[0]?.count || 0;

      let totalUserRecords = 0;
      try {
        const userDomains = await db.select().from(dnsDomainsTable).where(eq(dnsDomainsTable.userId, userId));
        const { interServerApi } = await import('../interserver-api'); // Dynamic import
        const { getDnsRecordUsageStats } = await import('../../shared/dns-record-utils'); // Dynamic import

        for (const domain of userDomains) {
          if (domain.interserverId) {
            try {
              const records = await interServerApi.getDnsDomain(domain.interserverId);
              const usageStats = getDnsRecordUsageStats(records, domain.name);
              totalUserRecords += usageStats.userCreated;
            } catch (recordError) { console.warn(`Could not fetch records for domain ${domain.name}:`, recordError); }
          }
        }
      } catch (recordCountError) { console.warn('Could not fetch DNS record usage:', recordCountError); }

      res.json({
        hasActivePlan: activeSubscriptions.length > 0,
        limits: { maxDomains: totalMaxDomains, maxRecords: totalMaxRecords },
        usage: { domains: currentDomains, records: totalUserRecords },
        canAddDomain: activeSubscriptions.length === 0 || currentDomains < totalMaxDomains,
        activePlans: activeSubscriptions.map(sub => sub.plan).filter(Boolean)
      });
    } catch (error: any) {
      console.error("Error fetching DNS plan limits:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default router;
