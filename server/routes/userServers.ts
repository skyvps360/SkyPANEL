import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { virtFusionApi } from "../virtfusion-api";
import { serverLoggingService } from "../server-logging-service";
import { db } from "../db"; // For package category lookup
import * as schema from "../../shared/schema"; // For package category lookup
import { eq } from "drizzle-orm"; // For package category lookup

// Helper function (copied from routes_new.ts for now)
function isAuthenticated(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

const router = (app: Express) => {
  // Get user's servers
  app.get("/api/user/servers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const page = parseInt(req.query.page as string) || 1;
      const perPage = parseInt(req.query.perPage as string) || 10;

      console.log(`User ${userId} fetching their servers (page ${page}, perPage ${perPage})`);

      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        console.log(`User ${userId} has no VirtFusion ID, returning empty servers list`);
        return res.json({
          data: [],
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: 0
        });
      }
      await virtFusionApi.updateSettings(); // Ensure API client is up-to-date
      const result = await virtFusionApi.getUserServers(user.virtFusionId);

      if (result && result.data) {
        const basicServers = Array.isArray(result.data) ? result.data : [];
        const total = basicServers.length;
        const lastPage = Math.ceil(total / perPage);
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedBasicServers = basicServers.slice(startIndex, endIndex);

        console.log(`User ${userId} has ${total} servers, fetching detailed data for ${paginatedBasicServers.length} servers on page ${page}`);

        const detailedServers = [];
        for (const basicServer of paginatedBasicServers) {
          try {
            console.log(`Fetching detailed data for server ${basicServer.id}`);
            const detailedServer = await virtFusionApi.request("GET", `/servers/${basicServer.id}?remoteState=true`);

            if (detailedServer && detailedServer.data) {
              const server = detailedServer.data;
              let primaryIpAddress = "No IP";
              let allIpAddresses: any[] = [];
              let networkInfo: any = {};
              let isNat = false;

              if (server.network && server.network.interfaces && Array.isArray(server.network.interfaces)) {
                for (const iface of server.network.interfaces) {
                  if (typeof iface.isNat === 'boolean') {
                    isNat = iface.isNat;
                  }
                  if (iface.ipv4 && Array.isArray(iface.ipv4) && iface.ipv4.length > 0) {
                    const ipv4Addresses = iface.ipv4.map((ip: any) => ({
                      address: ip.address || 'Unknown',
                      gateway: ip.gateway || 'Unknown',
                      netmask: ip.netmask || 'Unknown',
                      resolver1: ip.resolver1 || 'Unknown',
                      resolver2: ip.resolver2 || 'Unknown',
                      enabled: ip.enabled === true,
                      order: ip.order || 0,
                      type: 'ipv4'
                    }));
                    allIpAddresses = [...allIpAddresses, ...ipv4Addresses];
                    const enabledIp = iface.ipv4.find((ip: any) => ip.enabled === true);
                    if (!primaryIpAddress || primaryIpAddress === "No IP") {
                      if (enabledIp && enabledIp.address) {
                        primaryIpAddress = enabledIp.address;
                      } else if (iface.ipv4[0].address) {
                        primaryIpAddress = iface.ipv4[0].address;
                      }
                    }
                  }
                  if (iface.ipv6 && Array.isArray(iface.ipv6) && iface.ipv6.length > 0) {
                    const ipv6Addresses = iface.ipv6.map((ip: any) => ({
                      address: ip.address || (ip.subnet ? `${ip.subnet}/${ip.cidr}` : 'Unknown'),
                      gateway: ip.gateway || 'Unknown',
                      netmask: ip.prefix || ip.netmask || (ip.cidr ? `/${ip.cidr}` : 'Unknown'),
                      resolver1: ip.resolver1 || 'Unknown',
                      resolver2: ip.resolver2 || 'Unknown',
                      enabled: ip.enabled === true,
                      order: ip.order || 0,
                      type: 'ipv6'
                    }));
                    allIpAddresses = [...allIpAddresses, ...ipv6Addresses];
                    if ((primaryIpAddress === "No IP") && ipv6Addresses.length > 0) {
                      const enabledIpv6 = iface.ipv6.find((ip: any) => ip.enabled === true);
                      if (enabledIpv6) {
                        if (enabledIpv6.address) {
                          primaryIpAddress = enabledIpv6.address;
                        } else if (enabledIpv6.subnet) {
                          primaryIpAddress = `${enabledIpv6.subnet}/${enabledIpv6.cidr}`;
                        }
                      } else if (iface.ipv6[0]) {
                        if (iface.ipv6[0].address) {
                          primaryIpAddress = iface.ipv6[0].address;
                        } else if (iface.ipv6[0].subnet) {
                          primaryIpAddress = `${iface.ipv6[0].subnet}/${iface.ipv6[0].cidr}`;
                        }
                      }
                    }
                  }
                  networkInfo = {
                    name: iface.name || 'eth0',
                    mac: iface.mac || 'Unknown',
                    isNat: iface.isNat || false,
                    enabled: iface.enabled || false
                  };
                }
              }

              if (primaryIpAddress === "No IP") {
                primaryIpAddress = server.ipAddresses?.[0]?.address || server.ip || "No IP";
              }

              let packageCategory = null;
              let packageCategoryName = "Unknown";
              if (server.package?.id) {
                try {
                  const packageInfo = await db
                    .select({
                      categoryId: schema.packagePricing.categoryId,
                      categoryName: schema.packageCategories.name
                    })
                    .from(schema.packagePricing)
                    .leftJoin(schema.packageCategories, eq(schema.packagePricing.categoryId, schema.packageCategories.id))
                    .where(eq(schema.packagePricing.virtFusionPackageId, server.package.id))
                    .limit(1);
                  if (packageInfo.length > 0 && packageInfo[0].categoryName) {
                    packageCategory = packageInfo[0].categoryId;
                    packageCategoryName = packageInfo[0].categoryName;
                  }
                } catch (categoryError) {
                  console.warn(`Failed to fetch category for package ${server.package.id}:`, categoryError);
                }
              }

              const processedServer = {
                ...server,
                id: server.id,
                name: server.name || `Server #${server.id}`,
                hostname: server.hostname || "Unknown",
                ip: primaryIpAddress,
                allIps: allIpAddresses,
                ipv4s: allIpAddresses.filter(ip => ip.type === 'ipv4'),
                ipv6s: allIpAddresses.filter(ip => ip.type === 'ipv6'),
                network: networkInfo,
                hypervisorId: server.hypervisorId || null,
                isNat: isNat,
                status: server.state?.name || server.state || server.status || "Unknown",
                os: server.os?.name || "Unknown",
                package: server.package?.name || "Unknown",
                packageCategory: packageCategory,
                packageCategoryName: packageCategoryName
              };
              detailedServers.push(processedServer);
            } else {
              console.warn(`Failed to fetch detailed data for server ${basicServer.id}, using basic data`);
              detailedServers.push({ ...basicServer, allIps: [], ipv4s: [], ipv6s: [], network: {}, isNat: false });
            }
          } catch (error) {
            console.error(`Error fetching detailed data for server ${basicServer.id}:`, error);
            detailedServers.push({ ...basicServer, allIps: [], ipv4s: [], ipv6s: [], network: {}, isNat: false });
          }
        }

        console.log(`User ${userId} returning ${detailedServers.length} servers with detailed data for page ${page}`);
        return res.json({
          data: detailedServers,
          current_page: page,
          last_page: lastPage,
          per_page: perPage,
          total: total
        });
      } else {
        console.log(`No servers found for user ${userId} (VirtFusion ID: ${user.virtFusionId})`);
        return res.json({
          data: [],
          current_page: page,
          last_page: 1,
          per_page: perPage,
          total: 0
        });
      }
    } catch (error) {
      console.error('Error fetching user servers:', error);
      return res.status(500).json({ error: 'Failed to fetch servers' });
    }
  });

  // Get specific server details for user
  app.get("/api/user/servers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} fetching server ${serverId} details`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      await virtFusionApi.updateSettings();
      const server = await virtFusionApi.request("GET", `/servers/${serverId}?remoteState=true`);

      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      let serverOwnerId;
      if (server.data) {
        serverOwnerId = server.data.ownerId || server.data.owner?.id || server.data.owner;
      } else {
        serverOwnerId = server.ownerId || server.owner?.id || server.owner;
      }

      console.log(`Server ${serverId} ownership check: server owner = ${serverOwnerId}, user VirtFusion ID = ${user.virtFusionId}`);
      console.log(`Server object structure:`, JSON.stringify(server, null, 2));

      if (serverOwnerId !== user.virtFusionId) {
        console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to access server ${serverId} owned by ${serverOwnerId}`);
        return res.status(403).json({ error: "Access denied - server does not belong to you" });
      }

      const transformedServer = {
        ...server,
        status: server.data?.state || server.data?.status || server.status || 'unknown',
        data: server.data ? {
          ...server.data,
          state: server.data.state || server.data.status || 'unknown'
        } : null
      };

      console.log(`User ${userId} successfully retrieved server ${serverId} details, status: ${transformedServer.status}`);
      return res.json(transformedServer);
    } catch (error) {
      console.error('Error fetching server details:', error);
      return res.status(500).json({ error: 'Failed to fetch server details' });
    }
  });

  // User server password reset
  app.post("/api/user/servers/:id/reset-password", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }

      console.log(`User ${userId} resetting password for server ID: ${serverId}`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }
      await virtFusionApi.updateSettings();
      try {
        const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
        if (!userServers || !userServers.data) {
          return res.status(404).json({ error: "No servers found for user" });
        }
        const serverExists = userServers.data.some((server: any) => server.id === serverId);
        if (!serverExists) {
          console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to reset password for server ${serverId} which they don't own`);
          return res.status(403).json({ error: "Access denied: Server does not belong to this user" });
        }
      } catch (error: any) {
        console.error(`Error verifying server ownership for user ${userId}, server ${serverId}:`, error);
        return res.status(404).json({ error: "Server not found or access denied" });
      }

      try {
        const response = await virtFusionApi.resetServerPassword(serverId, 'root', true);
        console.log('User server password reset response:', response);
        let generatedPassword = null;
        if (response && response.data && response.data.expectedPassword) {
          generatedPassword = response.data.expectedPassword;
          console.log(`User server password reset successful, generated password: ${generatedPassword}`);
        } else {
          console.log('No expected password in user server reset response', response);
        }
        await serverLoggingService.logPasswordReset(serverId, userId, 'success', response?.data?.queueId, undefined, req);
        res.json({
          success: true,
          message: "Server password reset successfully",
          data: response,
          generatedPassword: generatedPassword
        });
      } catch (error: any) {
        console.error(`Error resetting password for user server ${serverId}:`, error);
        await serverLoggingService.logPasswordReset(serverId, userId, 'failed', undefined, error.message || "An error occurred while resetting the server password", req);
        res.status(500).json({
          error: "Failed to reset server password",
          message: error.message || "An error occurred while resetting the server password"
        });
      }
    } catch (error: any) {
      console.error(`Error in user server password reset for server ${req.params.id}:`, error);
      res.status(500).json({
        error: "Failed to reset server password",
        message: error.message || "An internal error occurred"
      });
    }
  });

  // User server power control
  app.post("/api/user/servers/:id/power/:action", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const serverId = parseInt(req.params.id);
      const action = req.params.action;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (isNaN(serverId)) {
        return res.status(400).json({ error: "Invalid server ID" });
      }
      const validActions = ['boot', 'shutdown', 'restart', 'poweroff'];
      if (!validActions.includes(action)) {
        return res.status(400).json({ error: "Invalid power action" });
      }

      console.log(`User ${userId} requesting ${action} for server ${serverId}`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      await virtFusionApi.updateSettings();
      const server = await virtFusionApi.getServer(serverId);
      if (!server) {
        return res.status(404).json({ error: "Server not found" });
      }

      let serverOwnerId;
      if (server.data) {
        serverOwnerId = server.data.ownerId || server.data.owner?.id || server.data.owner;
      } else {
        serverOwnerId = server.ownerId || server.owner?.id || server.owner;
      }

      if (serverOwnerId !== user.virtFusionId) {
        console.log(`User ${userId} (VirtFusion ID: ${user.virtFusionId}) attempted to control server ${serverId} owned by ${serverOwnerId}`);
        return res.status(403).json({ error: "Access denied - server does not belong to you" });
      }

      let result;
      let powerAction: 'power_on' | 'power_off' | 'restart' | 'poweroff';
      switch (action) {
        case 'boot': result = await virtFusionApi.bootServer(serverId); powerAction = 'power_on'; break;
        case 'shutdown': result = await virtFusionApi.shutdownServer(serverId); powerAction = 'power_off'; break;
        case 'restart': result = await virtFusionApi.restartServer(serverId); powerAction = 'restart'; break;
        case 'poweroff': result = await virtFusionApi.powerOffServer(serverId); powerAction = 'poweroff'; break;
        default: return res.status(400).json({ error: "Invalid action" }); // Should not happen due to validActions check
      }

      await serverLoggingService.logPowerAction(serverId, userId, powerAction, 'success', result?.data?.queueId, undefined, req);
      console.log(`User ${userId} successfully executed ${action} on server ${serverId}`);
      return res.json({ success: true, message: `Server ${action} command sent successfully`, result });
    } catch (error: any) {
      console.error(`Error executing power action:`, error);
      const serverId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;
      const action = req.params.action;
      if (!isNaN(serverId) && userId) {
        let powerAction: 'power_on' | 'power_off' | 'restart' | 'poweroff';
        switch (action) {
          case 'boot': powerAction = 'power_on'; break;
          case 'shutdown': powerAction = 'power_off'; break;
          case 'restart': powerAction = 'restart'; break;
          case 'poweroff': powerAction = 'poweroff'; break;
          default: powerAction = 'power_on'; // fallback
        }
        await serverLoggingService.logPowerAction(serverId, userId, powerAction, 'failed', undefined, error.message || `Failed to execute ${action} command`, req);
      }
      return res.status(500).json({ error: `Failed to execute ${req.params.action} command` });
    }
  });

  // Get VNC status for a user's server
  app.get("/api/user/servers/:id/vnc", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const serverId = parseInt(req.params.id);
      const userId = (req.user as any)?.id;

      if (!userId) { return res.status(401).json({ error: "Unauthorized" }); }
      if (isNaN(serverId)) { return res.status(400).json({ error: "Invalid server ID" }); }

      console.log(`User ${userId} getting VNC status for server ID: ${serverId}`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      await virtFusionApi.updateSettings();
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      console.log(`Making VNC API call - this will toggle VNC state for server ${serverId}`);
      const result = await (virtFusionApi as any).request("POST", `/servers/${serverId}/vnc`);
      if (result) {
        res.json({ success: true, data: result });
      } else {
        res.status(500).json({ error: "Failed to get VNC status" });
      }
    } catch (error: any) {
      console.error("Error getting VNC status:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get server traffic statistics for user
  app.get("/api/user/servers/:id/traffic", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) { return res.status(401).json({ error: "Unauthorized" }); }
      if (isNaN(serverId)) { return res.status(400).json({ error: "Invalid server ID" }); }

      console.log(`User ${userId} fetching traffic statistics for server ${serverId}`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      await virtFusionApi.updateSettings();
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      const trafficData = await virtFusionApi.getServerTraffic(serverId);
      if (!trafficData || !trafficData.data) {
        return res.status(404).json({ error: "Traffic data not found" });
      }
      return res.json(trafficData);
    } catch (error: any) {
      console.error(`Error fetching traffic data for server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server traffic data from VirtFusion",
        message: error.message
      });
    }
  });

  // Get server logs for user
  app.get("/api/user/servers/:id/logs", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = (req.user as any)?.id;
      const serverId = parseInt(req.params.id);

      if (!userId) { return res.status(401).json({ error: "Unauthorized" }); }
      if (isNaN(serverId)) { return res.status(400).json({ error: "Invalid server ID" }); }

      console.log(`User ${userId} fetching logs for server ${serverId}`);
      const user = await storage.getUser(userId);
      if (!user || !user.virtFusionId) {
        return res.status(404).json({ error: "User not found or no VirtFusion account" });
      }

      await virtFusionApi.updateSettings();
      const userServers = await virtFusionApi.getUserServers(user.virtFusionId);
      if (!userServers || !userServers.data) {
        return res.status(404).json({ error: "No servers found for user" });
      }
      const serverExists = userServers.data.some((server: any) => server.id === serverId);
      if (!serverExists) {
        return res.status(403).json({ error: "Access denied - server does not belong to user" });
      }

      const actionType = req.query.actionType as string;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const logs = await storage.getServerLogsWithUser(serverId, { actionType, startDate, endDate, limit, offset });
      const totalCount = await storage.getServerLogCount(serverId, { actionType, startDate, endDate });

      return res.json({
        logs,
        totalCount,
        hasMore: offset + limit < totalCount
      });
    } catch (error: any) {
      console.error(`Error fetching server logs for server ${req.params.id}:`, error.message);
      res.status(500).json({
        error: "Failed to fetch server logs",
        message: error.message
      });
    }
  });
};

export default router;
