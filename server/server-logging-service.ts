import { storage } from "./storage";
import { type InsertServerLog } from "@shared/schema";
import { type Request } from "express";

export interface ServerLogData {
  serverId: number;
  userId: number;
  action: string;
  actionType: 'power' | 'security' | 'network' | 'storage' | 'vnc' | 'config';
  status?: 'success' | 'failed' | 'pending';
  details?: string;
  metadata?: Record<string, any>;
  queueId?: number;
  errorMessage?: string;
}

export class ServerLoggingService {
  private static instance: ServerLoggingService;

  public static getInstance(): ServerLoggingService {
    if (!ServerLoggingService.instance) {
      ServerLoggingService.instance = new ServerLoggingService();
    }
    return ServerLoggingService.instance;
  }

  /**
   * Log a server action
   */
  async logServerAction(
    logData: ServerLogData,
    req?: Request
  ): Promise<void> {
    try {
      // Extract user agent and IP address from request if available
      const userAgent = req?.get('User-Agent') || undefined;
      const ipAddress = this.getClientIpAddress(req) || undefined;

      const serverLog: InsertServerLog = {
        serverId: logData.serverId,
        userId: logData.userId,
        action: logData.action,
        actionType: logData.actionType,
        status: logData.status || 'success',
        details: logData.details,
        metadata: logData.metadata || {},
        userAgent,
        ipAddress,
        queueId: logData.queueId,
        errorMessage: logData.errorMessage,
      };

      await storage.createServerLog(serverLog);
      
      console.log(`Server action logged: ${logData.action} for server ${logData.serverId} by user ${logData.userId}`);
    } catch (error) {
      console.error('Failed to log server action:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log power action (boot, shutdown, restart, poweroff)
   */
  async logPowerAction(
    serverId: number,
    userId: number,
    action: 'power_on' | 'power_off' | 'restart' | 'poweroff',
    status: 'success' | 'failed' | 'pending' = 'success',
    queueId?: number,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    const actionMap = {
      power_on: 'Server powered on',
      power_off: 'Server powered off',
      restart: 'Server restarted',
      poweroff: 'Server force powered off'
    };

    await this.logServerAction({
      serverId,
      userId,
      action,
      actionType: 'power',
      status,
      details: actionMap[action],
      metadata: { queueId },
      queueId,
      errorMessage
    }, req);
  }

  /**
   * Log password reset action
   */
  async logPasswordReset(
    serverId: number,
    userId: number,
    status: 'success' | 'failed' = 'success',
    queueId?: number,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    await this.logServerAction({
      serverId,
      userId,
      action: 'reset_password',
      actionType: 'security',
      status,
      details: 'Server password reset',
      metadata: { queueId },
      queueId,
      errorMessage
    }, req);
  }

  /**
   * Log VNC action (connect, disconnect, enable, disable)
   */
  async logVncAction(
    serverId: number,
    userId: number,
    action: 'vnc_connect' | 'vnc_disconnect' | 'vnc_enable' | 'vnc_disable',
    status: 'success' | 'failed' = 'success',
    details?: string,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    const actionMap = {
      vnc_connect: 'VNC session started',
      vnc_disconnect: 'VNC session ended',
      vnc_enable: 'VNC enabled',
      vnc_disable: 'VNC disabled'
    };

    await this.logServerAction({
      serverId,
      userId,
      action,
      actionType: 'vnc',
      status,
      details: details || actionMap[action],
      errorMessage
    }, req);
  }

  /**
   * Log configuration change
   */
  async logConfigChange(
    serverId: number,
    userId: number,
    action: string,
    details: string,
    status: 'success' | 'failed' = 'success',
    metadata?: Record<string, any>,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    await this.logServerAction({
      serverId,
      userId,
      action,
      actionType: 'config',
      status,
      details,
      metadata,
      errorMessage
    }, req);
  }

  /**
   * Log network action
   */
  async logNetworkAction(
    serverId: number,
    userId: number,
    action: string,
    details: string,
    status: 'success' | 'failed' = 'success',
    metadata?: Record<string, any>,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    await this.logServerAction({
      serverId,
      userId,
      action,
      actionType: 'network',
      status,
      details,
      metadata,
      errorMessage
    }, req);
  }

  /**
   * Log storage action
   */
  async logStorageAction(
    serverId: number,
    userId: number,
    action: string,
    details: string,
    status: 'success' | 'failed' = 'success',
    metadata?: Record<string, any>,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    await this.logServerAction({
      serverId,
      userId,
      action,
      actionType: 'storage',
      status,
      details,
      metadata,
      errorMessage
    }, req);
  }

  /**
   * Get client IP address from request
   */
  private getClientIpAddress(req?: Request): string | undefined {
    if (!req) return undefined;

    // Check various headers for the real IP address
    const forwarded = req.get('X-Forwarded-For');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIp = req.get('X-Real-IP');
    if (realIp) {
      return realIp;
    }

    const cfConnectingIp = req.get('CF-Connecting-IP');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    return req.ip || req.connection?.remoteAddress;
  }
}

// Export singleton instance
export const serverLoggingService = ServerLoggingService.getInstance();
