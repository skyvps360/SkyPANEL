/**
 * @fileoverview Discord Backup Scheduler Service
 * @author SkyPANEL Development Team
 * @created 2025-01-21
 * @modified 2025-01-21
 * @version 1.0.0
 */

import { CronJob } from 'cron';
import { discordBackupService } from './discord-backup-service';
import { db } from '../db';
import {
    discordBackupJobs,
    discordBackupSettings,
    InsertDiscordBackupJob,
    DiscordBackupJob
} from '../../shared/schemas/discord-backup-schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { storage } from '../storage';

/**
 * Automated backup scheduling service for Discord servers
 * Handles scheduled and recurring backups based on server settings
 */
export class DiscordBackupScheduler {
    private static instance: DiscordBackupScheduler;
    private cronJobs: Map<string, CronJob> = new Map();
    private isInitialized: boolean = false;

    private constructor() {}

    /**
     * Get singleton instance
     */
    public static getInstance(): DiscordBackupScheduler {
        if (!DiscordBackupScheduler.instance) {
            DiscordBackupScheduler.instance = new DiscordBackupScheduler();
        }
        return DiscordBackupScheduler.instance;
    }

    /**
     * Initialize the backup scheduler
     */
    public async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return true;
        }

        try {
            // Check if Discord bot is enabled
            const discordEnabled = await storage.getSetting('discord_bot_enabled');
            if (discordEnabled?.value !== 'true') {
                console.log('Discord bot disabled, skipping backup scheduler initialization');
                return false;
            }

            // Load existing scheduled jobs
            await this.loadScheduledJobs();

            // Start cleanup job for old backups (runs daily at 2 AM)
            this.scheduleCleanupJob();

            this.isInitialized = true;
            console.log('Discord backup scheduler initialized successfully');
            return true;
        } catch (error) {
            console.error('Error initializing Discord backup scheduler:', error);
            return false;
        }
    }

    /**
     * Schedule a new backup job
     * @param guildId Discord guild ID
     * @param cronExpression Cron expression for scheduling
     * @param backupName Name template for backups
     * @param createdBy User who created the schedule
     * @param includeMessages Whether to include message history
     * @returns Job creation result
     */
    public async scheduleBackupJob(
        guildId: string,
        cronExpression: string,
        backupName: string,
        createdBy: string,
        includeMessages: boolean = false
    ): Promise<{ success: boolean; jobId?: number; error?: string }> {
        try {
            // Validate cron expression
            if (!this.isValidCronExpression(cronExpression)) {
                return { success: false, error: 'Invalid cron expression' };
            }

            // Check if backup system is enabled for this guild
            const settings = await discordBackupService.getBackupSettings(guildId);
            if (!settings?.isEnabled) {
                return { success: false, error: 'Backup system is disabled for this server' };
            }

            // Create job record in database
            const [job] = await db.insert(discordBackupJobs).values({
                guildId,
                cronExpression,
                backupName,
                createdBy,
                includeMessages,
                isActive: true,
                lastRun: null,
                nextRun: this.getNextRunTime(cronExpression)
            }).returning();

            // Create and start cron job
            const cronJob = new CronJob(
                cronExpression,
                () => this.executeScheduledBackup(job.id, guildId, backupName, includeMessages),
                null,
                true,
                'UTC'
            );

            this.cronJobs.set(`${guildId}-${job.id}`, cronJob);

            console.log(`Scheduled backup job ${job.id} for guild ${guildId} with expression: ${cronExpression}`);
            return { success: true, jobId: job.id };
        } catch (error) {
            console.error('Error scheduling backup job:', error);
            return { success: false, error: 'Failed to schedule backup job' };
        }
    }

    /**
     * Cancel a scheduled backup job
     * @param jobId Job ID to cancel
     * @param guildId Guild ID for verification
     * @returns Cancellation result
     */
    public async cancelBackupJob(jobId: number, guildId: string): Promise<boolean> {
        try {
            // Update job status in database
            await db.update(discordBackupJobs)
                .set({ isActive: false, updatedAt: new Date() })
                .where(
                    and(
                        eq(discordBackupJobs.id, jobId),
                        eq(discordBackupJobs.guildId, guildId)
                    )
                );

            // Stop and remove cron job
            const jobKey = `${guildId}-${jobId}`;
            const cronJob = this.cronJobs.get(jobKey);
            if (cronJob) {
                cronJob.stop();
                this.cronJobs.delete(jobKey);
            }

            console.log(`Cancelled backup job ${jobId} for guild ${guildId}`);
            return true;
        } catch (error) {
            console.error('Error cancelling backup job:', error);
            return false;
        }
    }

    /**
     * Get scheduled jobs for a guild
     * @param guildId Discord guild ID
     * @returns Array of scheduled jobs
     */
    public async getScheduledJobs(guildId: string): Promise<DiscordBackupJob[]> {
        try {
            return await db.select()
                .from(discordBackupJobs)
                .where(
                    and(
                        eq(discordBackupJobs.guildId, guildId),
                        eq(discordBackupJobs.isActive, true)
                    )
                )
                .orderBy(discordBackupJobs.nextRun);
        } catch (error) {
            console.error('Error getting scheduled jobs:', error);
            return [];
        }
    }

    /**
     * Update next run time for a job
     * @param jobId Job ID
     * @param cronExpression Cron expression
     */
    private async updateNextRunTime(jobId: number, cronExpression: string): Promise<void> {
        try {
            const nextRun = this.getNextRunTime(cronExpression);
            await db.update(discordBackupJobs)
                .set({ 
                    lastRun: new Date(),
                    nextRun,
                    updatedAt: new Date()
                })
                .where(eq(discordBackupJobs.id, jobId));
        } catch (error) {
            console.error('Error updating next run time:', error);
        }
    }

    /**
     * Execute a scheduled backup
     * @param jobId Job ID
     * @param guildId Guild ID
     * @param backupNameTemplate Backup name template
     * @param includeMessages Whether to include messages
     */
    private async executeScheduledBackup(
        jobId: number,
        guildId: string,
        backupNameTemplate: string,
        includeMessages: boolean
    ): Promise<void> {
        try {
            console.log(`Executing scheduled backup job ${jobId} for guild ${guildId}`);

            // Generate backup name with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `${backupNameTemplate}-${timestamp}`;

            // Create backup
            const result = await discordBackupService.createServerBackup(
                guildId,
                backupName,
                'system', // System user for scheduled backups
                'scheduled'
            );

            if (result.success) {
                console.log(`Scheduled backup ${result.backupId} created successfully for guild ${guildId}`);
            } else {
                console.error(`Scheduled backup failed for guild ${guildId}: ${result.error}`);
            }

            // Update job run times
            const job = await db.select()
                .from(discordBackupJobs)
                .where(eq(discordBackupJobs.id, jobId))
                .limit(1);

            if (job.length > 0) {
                await this.updateNextRunTime(jobId, job[0].cronExpression);
            }
        } catch (error) {
            console.error(`Error executing scheduled backup job ${jobId}:`, error);
        }
    }

    /**
     * Load existing scheduled jobs from database
     */
    private async loadScheduledJobs(): Promise<void> {
        try {
            const jobs = await db.select()
                .from(discordBackupJobs)
                .where(eq(discordBackupJobs.isActive, true));

            for (const job of jobs) {
                try {
                    const cronJob = new CronJob(
                        job.cronExpression,
                        () => this.executeScheduledBackup(
                            job.id,
                            job.guildId,
                            job.backupName,
                            job.includeMessages
                        ),
                        null,
                        true,
                        'UTC'
                    );

                    this.cronJobs.set(`${job.guildId}-${job.id}`, cronJob);
                    console.log(`Loaded scheduled backup job ${job.id} for guild ${job.guildId}`);
                } catch (error) {
                    console.error(`Error loading job ${job.id}:`, error);
                    // Disable invalid job
                    await db.update(discordBackupJobs)
                        .set({ isActive: false })
                        .where(eq(discordBackupJobs.id, job.id));
                }
            }
        } catch (error) {
            console.error('Error loading scheduled jobs:', error);
        }
    }

    /**
     * Schedule cleanup job for old backups
     */
    private scheduleCleanupJob(): void {
        // Run daily at 2 AM UTC
        const cleanupJob = new CronJob(
            '0 2 * * *',
            async () => {
                console.log('Running scheduled backup cleanup...');
                try {
                    // Get all guilds with backup settings
                    const guildsWithBackups = await db.select()
                        .from(discordBackupSettings)
                        .where(eq(discordBackupSettings.isEnabled, true));

                    for (const guildSettings of guildsWithBackups) {
                        await discordBackupService.cleanupOldBackups(guildSettings.guildId);
                    }

                    console.log('Backup cleanup completed successfully');
                } catch (error) {
                    console.error('Error during backup cleanup:', error);
                }
            },
            null,
            true,
            'UTC'
        );

        this.cronJobs.set('cleanup-job', cleanupJob);
        console.log('Scheduled daily backup cleanup job');
    }

    /**
     * Validate cron expression
     * @param cronExpression Cron expression to validate
     * @returns True if valid
     */
    private isValidCronExpression(cronExpression: string): boolean {
        try {
            new CronJob(cronExpression, () => {}, null, false);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get next run time for cron expression
     * @param cronExpression Cron expression
     * @returns Next run date
     */
    private getNextRunTime(cronExpression: string): Date {
        try {
            const job = new CronJob(cronExpression, () => {}, null, false);
            return job.nextDate().toDate();
        } catch (error) {
            // Fallback to 1 hour from now
            const nextRun = new Date();
            nextRun.setHours(nextRun.getHours() + 1);
            return nextRun;
        }
    }

    /**
     * Stop all scheduled jobs
     */
    public stopAllJobs(): void {
        for (const [key, job] of this.cronJobs) {
            job.stop();
        }
        this.cronJobs.clear();
        this.isInitialized = false;
        console.log('All backup scheduler jobs stopped');
    }

    /**
     * Get scheduler status
     * @returns Scheduler status information
     */
    public getStatus(): {
        isInitialized: boolean;
        activeJobs: number;
        jobs: Array<{ key: string; running: boolean; nextRun?: Date }>
    } {
        const jobs = Array.from(this.cronJobs.entries()).map(([key, job]) => ({
            key,
            running: job.running,
            nextRun: job.nextDate()?.toDate()
        }));

        return {
            isInitialized: this.isInitialized,
            activeJobs: this.cronJobs.size,
            jobs
        };
    }
}

export const discordBackupScheduler = DiscordBackupScheduler.getInstance();