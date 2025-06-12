import { db } from "../db";
import { dnsPlanSubscriptions, dnsPlans, transactions, users } from "../../shared/schema";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { virtFusionApi } from "../virtfusion-api";
import { storage } from "../storage";

export class DnsBillingService {
  /**
   * Process monthly DNS plan renewals for all active subscriptions
   * This should be called on the 1st of every month via cron job
   */
  async processMonthlyRenewals(): Promise<{
    processed: number;
    successful: number;
    failed: number;
    errors: Array<{ userId: number; planName: string; error: string }>;
  }> {
    console.log("=== STARTING MONTHLY DNS BILLING RENEWALS ===");
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Only process on the 1st of the month
    if (today.getDate() !== 1) {
      console.log(`Skipping DNS renewals - not the 1st of the month (today is ${today.getDate()})`);
      return { processed: 0, successful: 0, failed: 0, errors: [] };
    }

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ userId: number; planName: string; error: string }>
    };

    try {
      // Get all active DNS subscriptions that need renewal today
      const subscriptionsToRenew = await db.select({
        subscription: dnsPlanSubscriptions,
        plan: dnsPlans,
        user: users
      })
        .from(dnsPlanSubscriptions)
        .leftJoin(dnsPlans, eq(dnsPlanSubscriptions.planId, dnsPlans.id))
        .leftJoin(users, eq(dnsPlanSubscriptions.userId, users.id))
        .where(and(
          eq(dnsPlanSubscriptions.status, 'active'),
          eq(dnsPlanSubscriptions.autoRenew, true),
          lte(dnsPlanSubscriptions.nextPaymentDate, today),
          gte(dnsPlans.price, 0.01) // Only process paid plans (skip free plans)
        ));

      console.log(`Found ${subscriptionsToRenew.length} DNS subscriptions to renew`);

      for (const { subscription, plan, user } of subscriptionsToRenew) {
        if (!plan || !user) {
          console.error(`Missing plan or user data for subscription ${subscription.id}`);
          continue;
        }

        results.processed++;

        try {
          await this.renewSubscription(subscription, plan, user);
          results.successful++;
          console.log(`✅ Successfully renewed DNS plan ${plan.name} for user ${user.id}`);
        } catch (error: any) {
          results.failed++;
          const errorMessage = error.message || 'Unknown error';
          results.errors.push({
            userId: user.id,
            planName: plan.name,
            error: errorMessage
          });
          console.error(`❌ Failed to renew DNS plan ${plan.name} for user ${user.id}:`, errorMessage);
        }
      }

      console.log("=== MONTHLY DNS BILLING RENEWALS COMPLETE ===");
      console.log(`Processed: ${results.processed}, Successful: ${results.successful}, Failed: ${results.failed}`);

      return results;
    } catch (error: any) {
      console.error("Error in processMonthlyRenewals:", error);
      throw error;
    }
  }

  /**
   * Renew a single DNS subscription
   */
  private async renewSubscription(
    subscription: typeof dnsPlanSubscriptions.$inferSelect,
    plan: typeof dnsPlans.$inferSelect,
    user: typeof users.$inferSelect
  ): Promise<void> {
    const now = new Date();
    const tokensRequired = plan.price * 100; // Convert USD to tokens

    console.log(`Processing renewal for user ${user.id}, plan ${plan.name}, tokens required: ${tokensRequired}`);

    // Check if user is linked to VirtFusion
    if (!user.virtFusionId) {
      throw new Error(`User ${user.id} is not linked to VirtFusion`);
    }

    // Ensure VirtFusion API is configured
    await virtFusionApi.updateSettings();
    if (!virtFusionApi.isConfigured()) {
      throw new Error("VirtFusion API is not configured");
    }

    // Check user's VirtFusion balance using the same method as dashboard
    let virtFusionBalance = 0;
    try {
      const balanceResponse = await virtFusionApi.getUserHourlyStats(user.id);
      if (balanceResponse?.data?.credit?.tokens) {
        virtFusionBalance = parseFloat(balanceResponse.data.credit.tokens);
      }
    } catch (error: any) {
      throw new Error(`Failed to check VirtFusion balance: ${error.message}`);
    }

    if (virtFusionBalance < tokensRequired) {
      // Insufficient funds - suspend subscription
      await this.suspendSubscriptionForInsufficientFunds(subscription, plan, user, tokensRequired, virtFusionBalance);
      throw new Error(`Insufficient VirtFusion tokens (required: ${tokensRequired}, available: ${virtFusionBalance})`);
    }

    // Create transaction record
    const transaction = await storage.createTransaction({
      userId: user.id,
      amount: -plan.price, // Negative for debit
      type: "dns_plan_renewal",
      description: `DNS Plan Monthly Renewal: ${plan.name}`,
      status: "pending",
      paymentMethod: "virtfusion_tokens"
    });

    try {
      // Deduct tokens from VirtFusion
      await virtFusionApi.removeCreditFromUserByExtRelationId(user.id, {
        tokens: tokensRequired,
        reference_1: transaction.id,
        reference_2: `DNS Plan Monthly Renewal: ${plan.name}`
      });

      // Calculate next billing cycle
      const nextFirstOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      const endDate = new Date(nextFirstOfMonth.getTime() - 1);
      const nextPaymentDate = nextFirstOfMonth;

      // Update subscription
      await db.update(dnsPlanSubscriptions)
        .set({
          lastPaymentDate: now,
          nextPaymentDate: nextPaymentDate,
          endDate: endDate,
          status: 'active',
          updatedAt: now
        })
        .where(eq(dnsPlanSubscriptions.id, subscription.id));

      // Update transaction status
      await storage.updateTransaction(transaction.id, { status: "completed" });

      console.log(`DNS plan renewal completed for user ${user.id}, next payment: ${nextPaymentDate.toISOString()}`);
    } catch (error: any) {
      // Update transaction status to failed
      await storage.updateTransaction(transaction.id, { status: "failed" });
      throw new Error(`VirtFusion token deduction failed: ${error.message}`);
    }
  }

  /**
   * Suspend subscription due to insufficient funds
   */
  private async suspendSubscriptionForInsufficientFunds(
    subscription: typeof dnsPlanSubscriptions.$inferSelect,
    plan: typeof dnsPlans.$inferSelect,
    user: typeof users.$inferSelect,
    tokensRequired: number,
    availableTokens: number
  ): Promise<void> {
    const now = new Date();

    // Update subscription status to suspended
    await db.update(dnsPlanSubscriptions)
      .set({
        status: 'suspended',
        autoRenew: false, // Disable auto-renewal
        updatedAt: now
      })
      .where(eq(dnsPlanSubscriptions.id, subscription.id));

    // Create a failed transaction record
    await storage.createTransaction({
      userId: user.id,
      amount: -plan.price,
      type: "dns_plan_renewal_failed",
      description: `DNS Plan Renewal Failed: ${plan.name} (Insufficient tokens: ${tokensRequired} required, ${availableTokens} available)`,
      status: "failed",
      paymentMethod: "virtfusion_tokens"
    });

    console.log(`Suspended DNS subscription ${subscription.id} for user ${user.id} due to insufficient funds`);
  }

  /**
   * Get renewal statistics for admin dashboard
   */
  async getRenewalStats(): Promise<{
    totalActiveSubscriptions: number;
    subscriptionsDueToday: number;
    suspendedSubscriptions: number;
    totalMonthlyRevenue: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [activeCount] = await db.select({ count: sql`count(*)` })
      .from(dnsPlanSubscriptions)
      .where(eq(dnsPlanSubscriptions.status, 'active'));

    const [dueCount] = await db.select({ count: sql`count(*)` })
      .from(dnsPlanSubscriptions)
      .where(and(
        eq(dnsPlanSubscriptions.status, 'active'),
        eq(dnsPlanSubscriptions.autoRenew, true),
        lte(dnsPlanSubscriptions.nextPaymentDate, today)
      ));

    const [suspendedCount] = await db.select({ count: sql`count(*)` })
      .from(dnsPlanSubscriptions)
      .where(eq(dnsPlanSubscriptions.status, 'suspended'));

    const revenueResult = await db.select({
      totalRevenue: sql`sum(${dnsPlans.price})`
    })
      .from(dnsPlanSubscriptions)
      .leftJoin(dnsPlans, eq(dnsPlanSubscriptions.planId, dnsPlans.id))
      .where(eq(dnsPlanSubscriptions.status, 'active'));

    return {
      totalActiveSubscriptions: Number(activeCount.count) || 0,
      subscriptionsDueToday: Number(dueCount.count) || 0,
      suspendedSubscriptions: Number(suspendedCount.count) || 0,
      totalMonthlyRevenue: Number(revenueResult[0]?.totalRevenue) || 0
    };
  }
}

export const dnsBillingService = new DnsBillingService();
