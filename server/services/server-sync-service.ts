import { storage } from '../storage';
import { virtFusionApi } from '../virtfusion-api';
import { db } from '../db';
import {
    virtfusionHourlyBilling,
    virtfusionHourlyTransactions,
    virtfusionCronSettings,
    packagePricing,
    packageCategories
} from '../../shared/schemas';
import { eq, and, isNull, or } from 'drizzle-orm';

export interface ServerSyncResult {
    success: boolean;
    message: string;
    syncedServers: number;
    newServers: number;
    updatedServers: number;
    errors: string[];
}

export interface ExternalServer {
    id: number;
    uuid: string;
    name: string;
    hostname: string;
    state: string;
    package: {
        id: number;
        name: string;
    };
    os?: {
        name: string;
    };
    owner: {
        id: number;
        extRelationId: number;
    };
    createdAt: string;
    network?: {
        interfaces: any[];
    };
}

export class ServerSyncService {
    /**
     * Synchronize all servers for a specific user
     * This will cross-check server UUIDs and create/update records as needed
     */
    static async syncUserServers(userId: number): Promise<ServerSyncResult> {
        const result: ServerSyncResult = {
            success: false,
            message: '',
            syncedServers: 0,
            newServers: 0,
            updatedServers: 0,
            errors: []
        };

        try {
            console.log(`🔄 Starting server synchronization for user ${userId}`);

            // Get user data
            const user = await storage.getUser(userId);
            if (!user || !user.virtFusionId) {
                result.message = 'User not found or no VirtFusion account linked';
                return result;
            }

            // Get all servers from VirtFusion for this user
            const virtFusionServers = await this.getVirtFusionServersForUser(user.virtFusionId);
            if (!virtFusionServers.length) {
                result.success = true;
                result.message = 'No servers found in VirtFusion for this user';
                return result;
            }

            console.log(`📊 Found ${virtFusionServers.length} servers in VirtFusion for user ${userId}`);

            // Get existing billing records for this user
            const existingBillingRecords = await db
                .select()
                .from(virtfusionHourlyBilling)
                .where(eq(virtfusionHourlyBilling.userId, userId));

            console.log(`📊 Found ${existingBillingRecords.length} existing billing records for user ${userId}`);

            // Cross-check each VirtFusion server with our database
            for (const virtFusionServer of virtFusionServers) {
                try {
                    await this.syncSingleServer(virtFusionServer, userId, existingBillingRecords);
                    result.syncedServers++;
                } catch (error) {
                    const errorMsg = `Failed to sync server ${virtFusionServer.id} (${virtFusionServer.uuid}): ${error}`;
                    console.error(errorMsg);
                    result.errors.push(errorMsg);
                }
            }

            result.success = true;
            result.message = `Successfully synchronized ${result.syncedServers} servers for user ${userId}`;

            console.log(`✅ Server synchronization completed for user ${userId}:`, {
                synced: result.syncedServers,
                new: result.newServers,
                updated: result.updatedServers,
                errors: result.errors.length
            });

            return result;

        } catch (error) {
            const errorMsg = `Server synchronization failed for user ${userId}: ${error}`;
            console.error(errorMsg);
            result.message = errorMsg;
            result.errors.push(errorMsg);
            return result;
        }
    }

    /**
     * Synchronize all servers for all users (admin function)
     */
    static async syncAllUsersServers(): Promise<ServerSyncResult> {
        const result: ServerSyncResult = {
            success: false,
            message: '',
            syncedServers: 0,
            newServers: 0,
            updatedServers: 0,
            errors: []
        };

        try {
            console.log('🔄 Starting server synchronization for all users');

            // Get all users with VirtFusion accounts
            const users = await storage.getAllUsers();
            const usersWithVirtFusion = users.filter(user => user.virtFusionId);

            console.log(`📊 Found ${usersWithVirtFusion.length} users with VirtFusion accounts`);

            for (const user of usersWithVirtFusion) {
                try {
                    const userResult = await this.syncUserServers(user.id);
                    result.syncedServers += userResult.syncedServers;
                    result.newServers += userResult.newServers;
                    result.updatedServers += userResult.updatedServers;
                    result.errors.push(...userResult.errors);
                } catch (error) {
                    const errorMsg = `Failed to sync servers for user ${user.id}: ${error}`;
                    console.error(errorMsg);
                    result.errors.push(errorMsg);
                }
            }

            result.success = true;
            result.message = `Successfully synchronized servers for ${usersWithVirtFusion.length} users`;

            console.log('✅ All users server synchronization completed:', {
                users: usersWithVirtFusion.length,
                synced: result.syncedServers,
                new: result.newServers,
                updated: result.updatedServers,
                errors: result.errors.length
            });

            return result;

        } catch (error) {
            const errorMsg = `All users server synchronization failed: ${error}`;
            console.error(errorMsg);
            result.message = errorMsg;
            result.errors.push(errorMsg);
            return result;
        }
    }

    /**
     * Get all servers from VirtFusion for a specific user
     */
    private static async getVirtFusionServersForUser(virtFusionUserId: number): Promise<ExternalServer[]> {
        try {
            const response = await virtFusionApi.getUserServers(virtFusionUserId);

            if (!response || !response.data || !Array.isArray(response.data)) {
                console.log(`📭 No servers found for VirtFusion user ${virtFusionUserId}`);
                return [];
            }

            // Filter out servers that are being deleted or are in a deleted state
            const activeServers = response.data.filter((server: any) => {
                // Check various deletion indicators
                if (server.deleteLevel && server.deleteLevel > 0) return false;
                if (server.scheduledDeletion || server.deletionScheduled || server.deleteScheduled) return false;
                if (server.state === 'deleting' || server.state === 'deleted' || server.state === 'scheduled_deletion') return false;
                if (server.commissionStatus === 0) return false;

                return true;
            });

            console.log(`📊 Found ${activeServers.length} active servers for VirtFusion user ${virtFusionUserId}`);

            return activeServers.map((server: any) => ({
                id: server.id,
                uuid: server.uuid,
                name: server.name || `Server #${server.id}`,
                hostname: server.hostname || 'Unknown',
                state: server.state?.name || server.state || 'Unknown',
                package: {
                    id: server.package?.id || 0,
                    name: server.package?.name || 'Unknown'
                },
                os: server.os ? { name: server.os.name || 'Unknown' } : undefined,
                owner: {
                    id: server.owner?.id || server.ownerId || virtFusionUserId,
                    extRelationId: server.owner?.extRelationId || virtFusionUserId
                },
                createdAt: server.createdAt || new Date().toISOString(),
                network: server.network
            }));

        } catch (error) {
            console.error(`❌ Error fetching servers for VirtFusion user ${virtFusionUserId}:`, error);
            throw error;
        }
    }

    /**
     * Synchronize a single server with the database
     */
    private static async syncSingleServer(
        virtFusionServer: ExternalServer,
        skyPanelUserId: number,
        existingBillingRecords: any[]
    ): Promise<void> {
        console.log(`🔄 Syncing server ${virtFusionServer.id} (${virtFusionServer.uuid}) for user ${skyPanelUserId}`);

        // Check if we already have a billing record for this server
        const existingRecord = existingBillingRecords.find(record =>
            record.virtfusionServerId === virtFusionServer.id ||
            (record.serverUuid && record.serverUuid === virtFusionServer.uuid)
        );

        if (existingRecord) {
            // Update existing record if needed
            await this.updateExistingBillingRecord(existingRecord, virtFusionServer, skyPanelUserId);
        } else {
            // Create new billing record for external server
            await this.createBillingRecordForExternalServer(virtFusionServer, skyPanelUserId);
        }
    }

    /**
     * Update existing billing record with latest server information
     */
    private static async updateExistingBillingRecord(
        existingRecord: any,
        virtFusionServer: ExternalServer,
        skyPanelUserId: number
    ): Promise<void> {
        console.log(`📝 Updating existing billing record ${existingRecord.id} for server ${virtFusionServer.id}`);

        const updates: any = {};

        // Update server UUID if missing or different
        if (!existingRecord.serverUuid && virtFusionServer.uuid) {
            updates.serverUuid = virtFusionServer.uuid;
        }

        // Update package information if changed
        if (existingRecord.packageId !== virtFusionServer.package.id) {
            updates.packageId = virtFusionServer.package.id;
            updates.packageName = virtFusionServer.package.name;
        }

        // Update server creation date if missing
        if (!existingRecord.serverCreatedAt && virtFusionServer.createdAt) {
            updates.serverCreatedAt = new Date(virtFusionServer.createdAt);
        }

        // Update the record if there are changes
        if (Object.keys(updates).length > 0) {
            await db
                .update(virtfusionHourlyBilling)
                .set({
                    ...updates,
                    updatedAt: new Date()
                })
                .where(eq(virtfusionHourlyBilling.id, existingRecord.id));

            console.log(`✅ Updated billing record ${existingRecord.id} with:`, updates);
        }
    }

    /**
     * Create a new billing record for a server created outside SkyPANEL
     */
    private static async createBillingRecordForExternalServer(
        virtFusionServer: ExternalServer,
        skyPanelUserId: number
    ): Promise<void> {
        console.log(`🆕 Creating new billing record for external server ${virtFusionServer.id} (${virtFusionServer.uuid})`);

        // Get package pricing information
        let hourlyRate = 0;
        let monthlyPrice = 0;
        let packageCategoryId = null;

        try {
            const packageInfo = await db
                .select({
                    categoryId: packagePricing.categoryId,
                    categoryName: packageCategories.name,
                    hourlyRate: packagePricing.hourlyRate,
                    monthlyPrice: packagePricing.monthlyPrice
                })
                .from(packagePricing)
                .leftJoin(packageCategories, eq(packagePricing.categoryId, packageCategories.id))
                .where(eq(packagePricing.virtFusionPackageId, virtFusionServer.package.id))
                .limit(1);

            if (packageInfo.length > 0) {
                const info = packageInfo[0];
                hourlyRate = parseFloat(info.hourlyRate || '0');
                monthlyPrice = parseFloat(info.monthlyPrice || '0');
                packageCategoryId = info.categoryId;
            }
        } catch (error) {
            console.warn(`⚠️ Could not fetch package pricing for VirtFusion package ${virtFusionServer.package.id}:`, error);
        }

        // Check if VirtFusion cron system is enabled to determine billing type
        const cronSettings = await db
            .select()
            .from(virtfusionCronSettings)
            .orderBy(virtfusionCronSettings.id)
            .limit(1);

        const isCronEnabled = cronSettings.length > 0 && cronSettings[0].enabled;
        const billingEnabled = isCronEnabled; // Only enable billing if cron system is enabled

        // Create the billing record
        const newBillingRecord = await db
            .insert(virtfusionHourlyBilling)
            .values({
                userId: skyPanelUserId,
                serverId: virtFusionServer.id, // Use VirtFusion server ID as our server ID
                virtfusionServerId: virtFusionServer.id,
                serverUuid: virtFusionServer.uuid,
                packageId: virtFusionServer.package.id,
                packageName: virtFusionServer.package.name,
                monthlyPrice: monthlyPrice,
                hourlyRate: hourlyRate,
                hoursInMonth: 730, // Default 730 hours per month
                billingEnabled: billingEnabled,
                serverCreatedAt: new Date(virtFusionServer.createdAt),
                lastBilledAt: null, // Will be set by cron system
                createdAt: new Date(),
                updatedAt: new Date()
            })
            .returning();

        console.log(`✅ Created new billing record ${newBillingRecord[0].id} for external server ${virtFusionServer.id}`);

        // If billing is enabled and this is a new server, create initial transaction
        if (billingEnabled && hourlyRate > 0) {
            try {
                await db
                    .insert(virtfusionHourlyTransactions)
                    .values({
                        userId: skyPanelUserId,
                        serverId: virtFusionServer.id,
                        virtfusionServerId: virtFusionServer.id,
                        serverUuid: virtFusionServer.uuid,
                        transactionType: 'hourly_billing',
                        amountCharged: hourlyRate.toString(),
                        billingPeriod: 'initial_hour',
                        status: 'completed',
                        description: `Initial hour billing for external server ${virtFusionServer.name}`,
                        reference1: `external_server_${virtFusionServer.id}`,
                        reference2: virtFusionServer.uuid,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });

                console.log(`💰 Created initial billing transaction for external server ${virtFusionServer.id}`);
            } catch (error) {
                console.warn(`⚠️ Failed to create initial billing transaction for external server ${virtFusionServer.id}:`, error);
            }
        }
    }

    /**
     * Get synchronization status for a user
     */
    static async getSyncStatus(userId: number): Promise<{
        lastSync: Date | null;
        totalServers: number;
        syncedServers: number;
        externalServers: number;
        billingRecords: number;
    }> {
        try {
            // Get user's VirtFusion servers
            const user = await storage.getUser(userId);
            if (!user || !user.virtFusionId) {
                return {
                    lastSync: null,
                    totalServers: 0,
                    syncedServers: 0,
                    externalServers: 0,
                    billingRecords: 0
                };
            }

            const virtFusionServers = await this.getVirtFusionServersForUser(user.virtFusionId);
            const billingRecords = await db
                .select()
                .from(virtfusionHourlyBilling)
                .where(eq(virtfusionHourlyBilling.userId, userId));

            // Count external servers (servers without serverCreatedAt or with external reference)
            const externalServers = billingRecords.filter(record =>
                !record.serverCreatedAt ||
                (record.reference1 && record.reference1.includes('external_server'))
            ).length;

            return {
                lastSync: null, // TODO: Add last sync tracking
                totalServers: virtFusionServers.length,
                syncedServers: billingRecords.length,
                externalServers: externalServers,
                billingRecords: billingRecords.length
            };

        } catch (error) {
            console.error(`Error getting sync status for user ${userId}:`, error);
            return {
                lastSync: null,
                totalServers: 0,
                syncedServers: 0,
                externalServers: 0,
                billingRecords: 0
            };
        }
    }
}
