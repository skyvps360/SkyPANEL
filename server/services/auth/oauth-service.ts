import { db } from '../../db';
import { oauthProviders, userOAuthAccounts, oauthLoginLogs } from '../../../shared/schemas/oauth-schema';
import { eq, and, desc } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { z } from 'zod';

export interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUrl: string;
  scope: string;
}

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
}

export class OAuthService {
  // Get all OAuth providers
  async getProviders() {
    return await db.select().from(oauthProviders).orderBy(oauthProviders.displayName);
  }

  // Get enabled OAuth providers
  async getEnabledProviders() {
    return await db.select().from(oauthProviders).where(eq(oauthProviders.enabled, true));
  }

  // Get provider by name
  async getProvider(providerName: string) {
    const providers = await db.select().from(oauthProviders).where(eq(oauthProviders.providerName, providerName));
    return providers[0] || null;
  }

  // Update provider configuration
  async updateProvider(providerName: string, config: Partial<OAuthProviderConfig>) {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (config.clientId !== undefined) updateData.clientId = config.clientId;
    if (config.clientSecret !== undefined) updateData.clientSecret = config.clientSecret;
    if (config.redirectUrl !== undefined) updateData.redirectUrl = config.redirectUrl;
    if (config.scope !== undefined) updateData.scope = config.scope;

    await db.update(oauthProviders)
      .set(updateData)
      .where(eq(oauthProviders.providerName, providerName));
  }

  // Enable/disable provider
  async setProviderStatus(providerName: string, isEnabled: boolean) {
    await db.update(oauthProviders)
      .set({ 
        enabled: isEnabled, 
        updatedAt: new Date() 
      })
      .where(eq(oauthProviders.providerName, providerName));
  }

  // Get user's OAuth accounts
  async getUserOAuthAccounts(userId: number) {
    return await db.select().from(userOAuthAccounts).where(eq(userOAuthAccounts.userId, userId));
  }

  // Get user's OAuth account for specific provider
  async getUserOAuthAccount(userId: number, providerName: string) {
    const accounts = await db.select()
      .from(userOAuthAccounts)
      .where(and(
        eq(userOAuthAccounts.userId, userId),
        eq(userOAuthAccounts.providerName, providerName)
      ));
    
    return accounts[0] || null;
  }

  // Link OAuth account to user
  async linkOAuthAccount(userId: number, providerName: string, userInfo: OAuthUserInfo, tokens?: { accessToken?: string; refreshToken?: string; expiresAt?: Date }) {
    const existingAccount = await this.getUserOAuthAccount(userId, providerName);
    
    if (existingAccount) {
      // Update existing account
      await db.update(userOAuthAccounts)
        .set({
          providerUserId: userInfo.id,
          providerUserEmail: userInfo.email,
          providerUserName: userInfo.name,
          providerAvatarUrl: userInfo.avatar,
          accessToken: tokens?.accessToken,
          refreshToken: tokens?.refreshToken,
          tokenExpiresAt: tokens?.expiresAt,
          updatedAt: new Date(),
        })
        .where(eq(userOAuthAccounts.id, existingAccount.id));
      
      return existingAccount.id;
    } else {
      // Create new account
      const result = await db.insert(userOAuthAccounts).values({
        userId,
        providerName,
        providerUserId: userInfo.id,
        providerUserEmail: userInfo.email,
        providerUserName: userInfo.name,
        providerAvatarUrl: userInfo.avatar,
        accessToken: tokens?.accessToken,
        refreshToken: tokens?.refreshToken,
        tokenExpiresAt: tokens?.expiresAt,
      }).returning();
      
      return result[0]?.id;
    }
  }

  // Unlink OAuth account
  async unlinkOAuthAccount(userId: number, providerName: string) {
    await db.delete(userOAuthAccounts)
      .where(and(
        eq(userOAuthAccounts.userId, userId),
        eq(userOAuthAccounts.providerName, providerName)
      ));
  }

  // Find user by OAuth provider user ID
  async findUserByOAuthProvider(providerName: string, providerUserId: string) {
    const accounts = await db.select()
      .from(userOAuthAccounts)
      .where(and(
        eq(userOAuthAccounts.providerName, providerName),
        eq(userOAuthAccounts.providerUserId, providerUserId),
        eq(userOAuthAccounts.isActive, true)
      ));
    
    return accounts[0] || null;
  }

  // Log OAuth activity
  async logOAuthActivity(data: {
    userId?: number;
    providerName: string;
    providerUserId?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
  }) {
    await db.insert(oauthLoginLogs).values({
      userId: data.userId,
      providerName: data.providerName,
      providerUserId: data.providerUserId,
      success: data.success,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      errorMessage: data.errorMessage,
    });
  }

  // Get OAuth analytics
  async getOAuthAnalytics() {
    // Get login statistics
    const loginStats = await db.execute(`
      SELECT 
        provider_name as "providerName",
        COUNT(*) as "totalLogins",
        COUNT(CASE WHEN success = true THEN 1 END) as "successfulLogins",
        COUNT(CASE WHEN success = false THEN 1 END) as "failedLogins"
      FROM oauth_login_logs 
      GROUP BY provider_name
    `);

    // Get linked accounts count
    const linkedAccounts = await db.execute(`
      SELECT 
        'discord' as "providerName",
        COUNT(*) as "count"
      FROM user_oauth_accounts 
      WHERE is_active = true
    `);

    // Get recent activity
    const recentActivity = await db.select()
      .from(oauthLoginLogs)
      .orderBy(desc(oauthLoginLogs.createdAt))
      .limit(50);

    return {
      loginStats: loginStats.rows,
      linkedAccounts: linkedAccounts.rows,
      recentActivity,
    };
  }

  // Generate OAuth state parameter
  generateState(): string {
    return randomBytes(32).toString('hex');
  }

  // Validate OAuth state parameter
  validateState(state: string): boolean {
    return /^[a-f0-9]{64}$/.test(state);
  }

  // Get OAuth provider configuration for authentication
  async getProviderConfig(providerName: string): Promise<OAuthProviderConfig | null> {
    const provider = await this.getProvider(providerName);
    
    if (!provider || !provider.enabled) {
      return null;
    }

    return {
      clientId: provider.clientId,
      clientSecret: provider.clientSecret,
      redirectUrl: provider.redirectUrl,
      scope: provider.scope,
    };
  }
} 