import { eq, and, gte, lt, isNull, isNotNull, sql } from 'drizzle-orm';
import { storage } from '../../storage';
import { 
  serverUptimeLogs, 
  serverHourlyBillingSettings, 
  serverPackageHourlyRates,
  type ServerUptimeLog,
  type InsertServerUptimeLog
} from '../../../shared/schemas/server-uptime-schema';
import { virtFusionApi } from '../../virtfusion-api';

export class ServerUptimeService {
  private db = storage.db;

  /**
   * Start tracking uptime for a server
   */
  async startUptimeTracking(serverId: number, virtfusionServerId: number, userId: number, packageId: number): Promise<ServerUptimeLog> {
    try {
      // Get hourly rate for the package
      const hourlyRate = await this.getHourlyRateForPackage(packageId);
      
      // Create uptime log entry
      const uptimeLog = await this.db.insert(serverUptimeLogs).values({
        serverId,
        virtfusionServerId,
        userId,
        status: 'running',
        startTime: new Date(),
        hourlyRate: hourlyRate.toString(),
        billingCycle: 'hourly'
      }).returning();

      console.log(`Started uptime tracking for server ${serverId} (VirtFusion ID: ${virtfusionServerId})`);
      return uptimeLog[0];
    } catch (error) {
      console.error('Error starting uptime tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking uptime for a server
   */
  async stopUptimeTracking(serverId: number): Promise<void> {
    try {
      const now = new Date();
      
      // Find the active uptime log for this server
      const activeLog = await this.db.select()
        .from(serverUptimeLogs)
        .where(
          and(
            eq(serverUptimeLogs.serverId, serverId),
            eq(serverUptimeLogs.status, 'running'),
            isNull(serverUptimeLogs.endTime)
          )
        )
        .limit(1);

      if (activeLog.length === 0) {
        console.log(`No active uptime tracking found for server ${serverId}`);
        return;
      }

      const log = activeLog[0];
      const startTime = new Date(log.startTime);
      const totalHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      const totalCost = parseFloat(log.hourlyRate) * totalHours;

      // Update the uptime log
      await this.db.update(serverUptimeLogs)
        .set({
          status: 'stopped',
          endTime: now,
          totalHours: totalHours.toString(),
          totalCost: totalCost.toString(),
          updatedAt: now
        })
        .where(eq(serverUptimeLogs.id, log.id));

      console.log(`Stopped uptime tracking for server ${serverId}. Total hours: ${totalHours.toFixed(2)}, Cost: $${totalCost.toFixed(4)}`);
    } catch (error) {
      console.error('Error stopping uptime tracking:', error);
      throw error;
    }
  }

  /**
   * Process hourly billing for all running servers
   */
  async processHourlyBilling(): Promise<{
    processedServers: number;
    totalBilled: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let processedServers = 0;
    let totalBilled = 0;

    try {
      // Get all running servers
      const runningServers = await this.db.select()
        .from(serverUptimeLogs)
        .where(
          and(
            eq(serverUptimeLogs.status, 'running'),
            isNull(serverUptimeLogs.endTime)
          )
        );

      console.log(`Processing hourly billing for ${runningServers.length} running servers`);

      for (const server of runningServers) {
        try {
          const now = new Date();
          const startTime = new Date(server.startTime);
          const hoursSinceStart = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          
          // Calculate cost for this hour
          const hourlyRate = parseFloat(server.hourlyRate);
          const costForThisHour = hourlyRate * 1; // 1 hour
          
          // Get current accumulated cost
          const currentAccumulated = parseFloat(server.accumulatedCost || '0');
          const newAccumulated = currentAccumulated + costForThisHour;
          
          // Check if we should bill (>= 1 cent)
          const tokensToCharge = Math.floor(newAccumulated * 100);
          const shouldBill = tokensToCharge >= 1;
          
          console.log(`Server ${server.serverId}: hourly rate $${hourlyRate.toFixed(6)}, accumulated $${newAccumulated.toFixed(6)}, tokens: ${tokensToCharge}, should bill: ${shouldBill}`);
          
          let transaction = null;
          let actualChargedAmount = 0;
          let finalAccumulated = newAccumulated;
          
          if (shouldBill) {
            // Calculate actual charged amount
            actualChargedAmount = tokensToCharge / 100;
            finalAccumulated = newAccumulated - actualChargedAmount;
            
            // Create billing transaction for the actual charged amount
            transaction = await storage.createTransaction({
              userId: server.userId,
              amount: -Math.abs(actualChargedAmount), // Negative for debit
              description: `Accumulated server billing - Server ID: ${server.serverId} (${tokensToCharge} tokens)`,
              type: 'server_hourly_billing',
              status: 'completed',
              paymentMethod: 'virtfusion_tokens'
            });

            // Deduct tokens from VirtFusion account
            await this.deductVirtFusionTokens(server.userId, actualChargedAmount, transaction.id);
            
            console.log(`Billed server ${server.serverId}: ${tokensToCharge} tokens ($${actualChargedAmount.toFixed(4)}), remaining accumulated: $${finalAccumulated.toFixed(6)}`);
          } else {
            console.log(`Server ${server.serverId}: Not billing yet, accumulated $${finalAccumulated.toFixed(6)} < $0.01`);
          }

          // Update uptime log with accumulated costs
          const newTotalHours = parseFloat(server.totalHours || '0') + 1;
          const newTotalCost = parseFloat(server.totalCost || '0') + actualChargedAmount; // Only add actually charged amount

          await this.db.update(serverUptimeLogs)
            .set({
              totalHours: newTotalHours.toString(),
              totalCost: newTotalCost.toString(),
              accumulatedCost: finalAccumulated.toFixed(6),
              billingTransactionId: transaction?.id || server.billingTransactionId,
              isBilled: shouldBill,
              updatedAt: now
            })
            .where(eq(serverUptimeLogs.id, server.id));

          processedServers++;
          totalBilled += actualChargedAmount;

        } catch (error: any) {
          const errorMsg = `Error processing billing for server ${server.serverId}: ${error.message}`;
          console.error(errorMsg);
          errors.push(errorMsg);
        }
      }

      // Update cron settings
      await this.updateCronRunTime();

    } catch (error: any) {
      const errorMsg = `Error in hourly billing process: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }

    return {
      processedServers,
      totalBilled,
      errors
    };
  }

  /**
   * Get hourly rate for a package
   */
  async getHourlyRateForPackage(packageId: number): Promise<number> {
    try {
      // First check if we have a custom rate in our database
      const customRate = await this.db.select()
        .from(serverPackageHourlyRates)
        .where(
          and(
            eq(serverPackageHourlyRates.packageId, packageId),
            eq(serverPackageHourlyRates.isActive, true)
          )
        )
        .limit(1);

      if (customRate.length > 0) {
        return parseFloat(customRate[0].hourlyRate);
      }

      // Fallback: calculate from monthly rate
      const packagePricing = await storage.getPackagePricingByVirtFusionId(packageId);
      if (packagePricing && packagePricing.enabled) {
        const monthlyRate = packagePricing.price / 100; // Convert from cents
        const hoursPerMonth = await this.getHoursPerMonth();
        return monthlyRate / hoursPerMonth;
      }

      // Default rate if nothing found
      return 0.01; // $0.01 per hour default
    } catch (error) {
      console.error('Error getting hourly rate for package:', error);
      return 0.01; // Default fallback
    }
  }

  /**
   * Get hours per month setting
   */
  async getHoursPerMonth(): Promise<number> {
    try {
      const settings = await this.db.select()
        .from(serverHourlyBillingSettings)
        .limit(1);

      if (settings.length > 0) {
        return settings[0].hoursPerMonth;
      }

      // Default to 730 hours (30.4 days)
      return 730;
    } catch (error) {
      console.error('Error getting hours per month setting:', error);
      return 730;
    }
  }

  /**
   * Update cron run time
   */
  async updateCronRunTime(): Promise<void> {
    try {
      const now = new Date();
      const nextRun = new Date(now.getTime() + 60 * 60 * 1000); // Next hour

      await this.db.update(serverHourlyBillingSettings)
        .set({
          lastCronRun: now,
          nextCronRun: nextRun,
          updatedAt: now
        })
        .where(eq(serverHourlyBillingSettings.cronEnabled, true));
    } catch (error) {
      console.error('Error updating cron run time:', error);
    }
  }

  /**
   * Deduct tokens from VirtFusion account
   */
  async deductVirtFusionTokens(userId: number, amount: number, transactionId: string): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        throw new Error(`User ${userId} not found or no VirtFusion ID`);
      }

      // Convert dollars to tokens - amount should already be >= 0.01 due to accumulative logic
      const tokens = Math.round(amount * 100); // Round to nearest cent for any floating point precision issues
      
      if (tokens < 1) {
        console.warn(`Unexpected: Trying to bill ${tokens} tokens ($${amount.toFixed(6)}) - should not happen with accumulative billing`);
        return;
      }

      const tokenData = {
        tokens,
        reference_1: transactionId,
        reference_2: `Accumulated server billing - ${new Date().toISOString()}`
      };

      await virtFusionApi.removeCreditFromUserByExtRelationId(userId, tokenData);
      console.log(`Deducted ${tokens} tokens ($${(tokens/100).toFixed(4)}) from user ${userId} for accumulated server billing`);
    } catch (error) {
      console.error('Error deducting VirtFusion tokens:', error);
      throw error;
    }
  }

  /**
   * Get uptime statistics for a user
   */
  async getUserUptimeStats(userId: number): Promise<{
    totalServers: number;
    totalHours: number;
    totalCost: number;
    activeServers: number;
  }> {
    try {
      const userLogs = await this.db.select()
        .from(serverUptimeLogs)
        .where(eq(serverUptimeLogs.userId, userId));

      const totalServers = new Set(userLogs.map(log => log.serverId)).size;
      const totalHours = userLogs.reduce((sum, log) => sum + parseFloat(log.totalHours || '0'), 0);
      const totalCost = userLogs.reduce((sum, log) => sum + parseFloat(log.totalCost || '0'), 0);
      const activeServers = userLogs.filter(log => log.status === 'running').length;

      return {
        totalServers,
        totalHours,
        totalCost,
        activeServers
      };
    } catch (error) {
      console.error('Error getting user uptime stats:', error);
      return {
        totalServers: 0,
        totalHours: 0,
        totalCost: 0,
        activeServers: 0
      };
    }
  }

  /**
   * Get all uptime logs for a server
   */
  async getServerUptimeLogs(serverId: number): Promise<ServerUptimeLog[]> {
    try {
      return await this.db.select()
        .from(serverUptimeLogs)
        .where(eq(serverUptimeLogs.serverId, serverId))
        .orderBy(sql`${serverUptimeLogs.startTime} DESC`);
    } catch (error) {
      console.error('Error getting server uptime logs:', error);
      return [];
    }
  }
}

export const serverUptimeService = new ServerUptimeService(); 