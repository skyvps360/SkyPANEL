import { Router } from 'express';
import { storage } from "../storage";
import { betterStackService } from "../betterstack-service";
import { z } from 'zod';

const router = Router();

// Get system health
router.get('/health', async (req, res) => {
  try {
    return res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error checking system health:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get database health
router.get('/db-health', async (req, res) => {
  try {
    // Check database connection
    await storage.db.execute(sql`SELECT 1`);
    return res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error checking database health:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get VirtFusion health
router.get('/virtfusion-health', async (req, res) => {
  try {
    // Check VirtFusion connection
    const isConfigured = storage.virtFusionService.isConfigured();
    
    if (!isConfigured) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'VirtFusion is not configured' 
      });
    }
    
    const testResult = await storage.virtFusionService.testConnection();
    
    if (!testResult) {
      return res.status(503).json({ 
        status: 'error', 
        message: 'Failed to connect to VirtFusion API' 
      });
    }
    
    return res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Error checking VirtFusion health:', error);
    return res.status(500).json({ status: 'error', message: error.message });
  }
});

// Map BetterStack status to a more user-friendly format
function mapBetterStackStatus(status: string): string {
  switch (status) {
    case 'up':
      return 'operational';
    case 'down':
      return 'outage';
    case 'degraded':
      return 'degraded';
    default:
      return 'unknown';
  }
}

// Get BetterStack monitors
router.get('/betterstack/monitors', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    // Check if BetterStack is configured
    if (!betterStackService.isConfigured()) {
      return res.status(503).json({ 
        message: 'BetterStack is not configured' 
      });
    }
    
    const monitors = await betterStackService.getMonitors();
    
    // Format monitors for client
    const formattedMonitors = monitors.map(monitor => ({
      id: monitor.id,
      name: monitor.name,
      url: monitor.url,
      status: mapBetterStackStatus(monitor.status),
      lastCheckedAt: monitor.last_checked_at,
      paused: monitor.paused
    }));
    
    return res.json(formattedMonitors);
  } catch (error: any) {
    console.error('Error getting BetterStack monitors:', error);
    return res.status(500).json({ message: 'An error occurred while getting BetterStack monitors' });
  }
});

// Get BetterStack incidents
router.get('/betterstack/incidents', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if BetterStack is configured
    if (!betterStackService.isConfigured()) {
      return res.json({ incidents: [] });
    }
    
    const incidents = await betterStackService.getIncidents();
    
    // Format incidents for client
    const formattedIncidents = incidents.map(incident => ({
      id: incident.id,
      name: incident.name,
      status: incident.status,
      startedAt: incident.started_at,
      acknowledgedAt: incident.acknowledged_at,
      resolvedAt: incident.resolved_at,
      monitorId: incident.monitor_id
    }));
    
    return res.json({ incidents: formattedIncidents });
  } catch (error: any) {
    console.error('Error getting BetterStack incidents:', error);
    return res.json({ incidents: [] });
  }
});

// Get server status
router.get('/server/:id/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    // Get server status from VirtFusion
    const server = await storage.virtFusionService.getServer(serverId, true);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    
    // Extract relevant status information
    const status = {
      id: server.id,
      name: server.name,
      state: server.state,
      powerState: server.power_state,
      cpuUsage: server.cpu_usage,
      memoryUsage: server.memory_usage,
      diskUsage: server.disk_usage,
      networkUsage: server.network_usage,
      uptime: server.uptime
    };
    
    return res.json(status);
  } catch (error: any) {
    console.error('Error getting server status:', error);
    return res.status(500).json({ message: 'An error occurred while getting server status' });
  }
});

// Get server logs
router.get('/server/:id/logs', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    // Get server logs
    const logs = await storage.serverLoggingService.getServerLogs(serverId);
    
    return res.json(logs);
  } catch (error: any) {
    console.error('Error getting server logs:', error);
    return res.status(500).json({ message: 'An error occurred while getting server logs' });
  }
});

// Get system metrics
router.get('/metrics', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    // Get basic system metrics
    const totalUsers = await storage.getTotalUsers();
    const activeUsers = await storage.getActiveUsers();
    const totalServers = await storage.getTotalServers();
    const activeServers = await storage.getActiveServers();
    const totalTransactions = await storage.getTotalTransactions();
    const totalRevenue = await storage.getTotalRevenue();
    
    const metrics = {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      servers: {
        total: totalServers,
        active: activeServers
      },
      transactions: {
        total: totalTransactions,
        revenue: totalRevenue
      }
    };
    
    return res.json(metrics);
  } catch (error: any) {
    console.error('Error getting system metrics:', error);
    return res.status(500).json({ message: 'An error occurred while getting system metrics' });
  }
});

// Get maintenance mode status
router.get('/maintenance/status', async (req, res) => {
  try {
    const status = await storage.getMaintenanceStatus();
    return res.json({ maintenance: status });
  } catch (error: any) {
    console.error('Error getting maintenance status:', error);
    return res.status(500).json({ message: 'An error occurred while getting maintenance status' });
  }
});

// Toggle maintenance mode
router.post('/maintenance/toggle', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const schema = z.object({
      enabled: z.boolean(),
      message: z.string().optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { enabled, message } = validationResult.data;
    
    // Toggle maintenance mode
    await storage.toggleMaintenanceMode(enabled, message);
    
    return res.json({ success: true, maintenance: enabled });
  } catch (error: any) {
    console.error('Error toggling maintenance mode:', error);
    return res.status(500).json({ message: 'An error occurred while toggling maintenance mode' });
  }
});

// Get maintenance token
router.get('/maintenance/token', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const token = await storage.getMaintenanceToken();
    return res.json({ token });
  } catch (error: any) {
    console.error('Error getting maintenance token:', error);
    return res.status(500).json({ message: 'An error occurred while getting maintenance token' });
  }
});

// Regenerate maintenance token
router.post('/maintenance/token/regenerate', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user is admin
    if (!req.user.isAdmin) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const token = await storage.regenerateMaintenanceToken();
    return res.json({ token });
  } catch (error: any) {
    console.error('Error regenerating maintenance token:', error);
    return res.status(500).json({ message: 'An error occurred while regenerating maintenance token' });
  }
});

// Validate maintenance token
router.post('/maintenance/token/validate', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const { token } = validationResult.data;
    
    // Validate token
    const isValid = await storage.validateMaintenanceToken(token);
    
    return res.json({ valid: isValid });
  } catch (error: any) {
    console.error('Error validating maintenance token:', error);
    return res.status(500).json({ message: 'An error occurred while validating maintenance token' });
  }
});

export default router;