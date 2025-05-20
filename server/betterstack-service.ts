import axios from 'axios';

/**
 * Interface for BetterStack monitor data from API
 */
interface BetterStackMonitor {
  id: string;
  name: string;
  url?: string;
  status: 'up' | 'down' | 'maintenance' | 'paused' | 'pending' | 'validating' | 'unknown';
  lastStatus?: string;
  paused?: boolean;
  uptime?: number;
  availability?: number; // From SLA endpoint
}

/**
 * Interface for BetterStack incident data from API
 */
interface BetterStackIncident {
  id: string;
  name: string;
  url?: string;
  cause: string;
  startedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  status: 'Started' | 'Acknowledged' | 'Resolved';
  responseContent?: string;
  monitorId?: string;
  monitorName?: string;
}

/**
 * Interface for BetterStack API response for a single monitor
 */
interface BetterStackMonitorResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      url: string;
      pronounceable_name: string;
      status: string;
      monitor_type: string;
      [key: string]: any;
    }
  }
}

/**
 * Interface for BetterStack API response for a list of monitors
 */
interface BetterStackMonitorsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      url: string;
      pronounceable_name: string;
      status: string;
      monitor_type: string;
      [key: string]: any;
    }
  }>;
  pagination?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  }
}

/**
 * Interface for BetterStack API response for monitor availability (SLA)
 */
interface BetterStackAvailabilityResponse {
  data: {
    id: string;
    type: string;
    attributes: {
      availability: number;
      total_downtime: number;
      number_of_incidents: number;
      longest_incident: number;
      average_incident: number;
    }
  }
}

/**
 * Interface for BetterStack API response for incidents
 */
interface BetterStackIncidentsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      name: string;
      url?: string;
      http_method?: string;
      cause: string;
      started_at: string;
      acknowledged_at?: string | null;
      acknowledged_by?: string | null;
      resolved_at?: string | null;
      resolved_by?: string | null;
      status: string;
      team_name?: string;
      response_content?: string;
      [key: string]: any;
    };
    relationships?: {
      monitor?: {
        data?: {
          id: string;
          type: string;
        } | null;
      };
      [key: string]: any;
    };
  }>;
  pagination?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

/**
 * Default monitors to use if BetterStack API doesn't return data 
 * or if we need to supplement the data
 */
const DEFAULT_MONITORS: BetterStackMonitor[] = [
  {
    id: 'api-services',
    name: 'API Services',
    status: 'up',
    uptime: 99.98
  },
  {
    id: 'network',
    name: 'Network',
    status: 'up',
    uptime: 99.99
  },
  {
    id: 'storage-services',
    name: 'Storage Services',
    status: 'up',
    uptime: 99.95
  },
  {
    id: 'compute',
    name: 'Compute',
    status: 'up',
    uptime: 99.97
  },
  {
    id: 'database',
    name: 'Database',
    status: 'up',
    uptime: 99.99
  },
  {
    id: 'cloud-services',
    name: 'Cloud Services',
    status: 'up',
    uptime: 99.96
  }
];

/**
 * Interface for BetterStack API response
 */
interface BetterStackApiResponse {
  data: BetterStackMonitor[];
}

/**
 * Service for interacting with the BetterStack API
 */
export class BetterStackService {
  private static instance: BetterStackService;
  private apiKey: string = '';
  private monitorsCache: BetterStackMonitor[] = [];
  private lastFetch: number = 0;
  private cacheLifetime: number = 60 * 1000; // 1 minute cache

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): BetterStackService {
    if (!BetterStackService.instance) {
      BetterStackService.instance = new BetterStackService();
    }
    return BetterStackService.instance;
  }

  /**
   * Initialize the service with API key from environment
   */
  public async initialize(): Promise<boolean> {
    if (process.env.BETTERSTACK_API_KEY) {
      this.apiKey = process.env.BETTERSTACK_API_KEY;
      console.log('BetterStack service initialized successfully');
      return true;
    } else {
      console.log('BetterStack API key not found in environment variables');
      return false;
    }
  }

  /**
   * Check if the service is configured
   */
  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Get monitor availability (SLA) data for a specific monitor
   * @param monitorId The BetterStack monitor ID
   * @returns The availability data or null if not available
   */
  private async getMonitorAvailability(monitorId: string): Promise<number | null> {
    try {
      console.log(`Fetching availability for monitor ${monitorId}...`);
      const response = await axios.get<BetterStackAvailabilityResponse>(
        `https://uptime.betterstack.com/api/v2/monitors/${monitorId}/sla`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      // Log response for debugging
      console.log(`Availability response for monitor ${monitorId}:`, 
                 JSON.stringify(response.data).substring(0, 200) + '...');
      
      if (response.data && response.data.data && response.data.data.attributes && 
          typeof response.data.data.attributes.availability === 'number') {
        const availability = response.data.data.attributes.availability;
        console.log(`Monitor ${monitorId} has ${availability}% availability`);
        return availability;
      }
      
      console.log(`No valid availability data found for monitor ${monitorId}`);
      return null;
    } catch (error) {
      console.error(`Error fetching availability for monitor ${monitorId}:`, error);
      return null;
    }
  }
  
  /**
   * Get recent incidents from BetterStack API
   * @param limit Maximum number of incidents to return
   * @param resolvedOnly Whether to return only resolved incidents
   * @returns Array of incident data
   */
  public async getIncidents(limit: number = 10, resolvedOnly: boolean = false): Promise<BetterStackIncident[]> {
    if (!this.isConfigured()) {
      console.log('BetterStack service not configured, returning sample incidents for testing');
      
      // Return sample incidents for testing the UI
      return [
        {
          id: "sample-incident-1",
          name: "Network Connectivity Issue in NYC",
          cause: "Fiber cut affecting connectivity in NYC data center",
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          resolvedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
          status: 'Resolved',
          monitorName: 'Network'
        },
        {
          id: "sample-incident-2",
          name: "API Service Degradation",
          cause: "High database load causing API request timeouts",
          startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          acknowledgedAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
          acknowledgedBy: "System Administrator",
          status: 'Acknowledged',
          monitorName: 'API Services'
        }
      ];
    }
    
    try {
      console.log('Fetching incidents from BetterStack API...');
      
      // Use v3 API as per the documentation
      let url = 'https://uptime.betterstack.com/api/v3/incidents';
      
      // Add query parameters if needed
      const queryParams = [];
      if (resolvedOnly) {
        queryParams.push('resolved=true');
      }
      if (limit > 0) {
        queryParams.push(`per_page=${Math.min(limit, 50)}`); // API limit is 50
      }
      
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }
      
      const response = await axios.get<BetterStackIncidentsResponse>(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      // Log the raw API response for debugging
      console.log('Raw BetterStack incidents response:', JSON.stringify(response.data).substring(0, 500) + '...');
      
      // Ensure data format is valid
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.error('Invalid response format from BetterStack incidents API');
        return [];
      }
      
      // Log response summary
      console.log(`BetterStack incidents API returned ${response.data.data.length} incidents`);
      
      // Transform the API response to our internal incident format
      const incidents: BetterStackIncident[] = response.data.data.map(item => {
        const attributes = item.attributes;
        const monitorId = item.relationships?.monitor?.data?.id;
        const monitorName = attributes.name;
        
        return {
          id: item.id,
          name: monitorName,
          url: attributes.url,
          cause: attributes.cause,
          startedAt: new Date(attributes.started_at),
          acknowledgedAt: attributes.acknowledged_at ? new Date(attributes.acknowledged_at) : undefined,
          acknowledgedBy: attributes.acknowledged_by || undefined,
          resolvedAt: attributes.resolved_at ? new Date(attributes.resolved_at) : undefined,
          resolvedBy: attributes.resolved_by || undefined,
          status: attributes.status as any,
          responseContent: attributes.response_content,
          monitorId: monitorId,
          monitorName: monitorName
        };
      });
      
      // Sort by start time descending (newest first)
      incidents.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      
      // Return only the requested number of incidents
      return incidents.slice(0, limit);
    } catch (error) {
      console.error('Error fetching incidents from BetterStack:', error);
      
      // Return sample incidents on error for testing the UI
      return [
        {
          id: "sample-incident-1",
          name: "Network Connectivity Issue in NYC",
          cause: "Fiber cut affecting connectivity in NYC data center",
          startedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          resolvedAt: new Date(Date.now() - 1.5 * 24 * 60 * 60 * 1000), // 1.5 days ago
          status: 'Resolved',
          monitorName: 'Network'
        },
        {
          id: "sample-incident-2",
          name: "API Service Degradation",
          cause: "High database load causing API request timeouts",
          startedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          acknowledgedAt: new Date(Date.now() - 4.5 * 60 * 60 * 1000), // 4.5 hours ago
          acknowledgedBy: "System Administrator",
          status: 'Acknowledged',
          monitorName: 'API Services'
        }
      ];
    }
  }
  
  /**
   * Get all monitors from BetterStack
   */
  public async getMonitors(): Promise<BetterStackMonitor[]> {
    const now = Date.now();
    
    // Disable cache temporarily to debug the issue
    // if (this.monitorsCache.length > 0 && (now - this.lastFetch < this.cacheLifetime)) {
    //   console.log(`Returning ${this.monitorsCache.length} cached BetterStack monitors`);
    //   return this.monitorsCache;
    // }
    
    // If not configured, return default monitors
    if (!this.isConfigured()) {
      console.log('BetterStack service not configured, returning default monitors');
      this.monitorsCache = DEFAULT_MONITORS;
      this.lastFetch = now;
      return this.monitorsCache;
    }
    
    try {
      console.log('Fetching monitors from BetterStack API...');
      const response = await axios.get<BetterStackMonitorsResponse>('https://uptime.betterstack.com/api/v2/monitors', {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });
      
      // Log the raw API response for debugging
      console.log('Raw BetterStack API response data:', JSON.stringify(response.data).substring(0, 500) + '...');
      
      // Ensure data format is valid
      if (!response.data || !response.data.data || !Array.isArray(response.data.data)) {
        console.error('Invalid response format from BetterStack API, using default monitors');
        this.monitorsCache = DEFAULT_MONITORS;
        this.lastFetch = now;
        return this.monitorsCache;
      }
      
      // Log response summary
      console.log(`BetterStack API response received with ${response.data.data.length} monitors`);
      
      // Log first monitor data for debugging
      if (response.data.data.length > 0) {
        console.log('First monitor raw data:', JSON.stringify(response.data.data[0]));
      }
      
      // Transform the BetterStack API response to our internal monitor format
      const transformedMonitors: BetterStackMonitor[] = response.data.data.map(item => {
        // Explicitly log the status of each monitor
        console.log(`Monitor ${item.attributes.pronounceable_name || item.attributes.url} status: ${item.attributes.status}`);
        
        // For down status monitors, we'll return a lower uptime (70% for example)
        // BetterStack still reports high uptime even for down monitors because it's calculated over time
        const defaultUptime = item.attributes.status === 'down' ? 70.0 : 99.9;
        
        return {
          id: item.id,
          name: item.attributes.pronounceable_name || item.attributes.url,
          url: item.attributes.url,
          status: item.attributes.status as any,
          uptime: item.attributes.uptime_percentage ? 
                  parseFloat(item.attributes.uptime_percentage) : 
                  defaultUptime // Fallback with different value for down monitors
        };
      });
      
      if (transformedMonitors.length === 0) {
        console.log('No valid monitors found in BetterStack API response, using default monitors');
        this.monitorsCache = DEFAULT_MONITORS;
        this.lastFetch = now;
        return this.monitorsCache;
      }
      
      // For each monitor, fetch its availability data
      console.log('Fetching availability data for all monitors...');
      for (const monitor of transformedMonitors) {
        try {
          const availability = await this.getMonitorAvailability(monitor.id);
          if (availability !== null) {
            // Update the monitor's uptime with the actual availability percentage
            monitor.availability = availability;
            
            // For down monitors, also update the uptime to be more accurate
            if (monitor.status === 'down') {
              monitor.uptime = availability;
            }
          }
        } catch (err) {
          console.error(`Error fetching availability for monitor ${monitor.id}:`, err);
        }
      }
      
      // Update cache with transformed monitors
      this.monitorsCache = transformedMonitors;
      this.lastFetch = now;
      
      // Log summary of statuses
      const statusSummary = this.monitorsCache.reduce((acc, monitor) => {
        acc[monitor.status] = (acc[monitor.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('BetterStack monitors status summary:', statusSummary);
      console.log('All monitors data:', JSON.stringify(this.monitorsCache));
      
      return this.monitorsCache;
    } catch (error) {
      console.error('Error fetching monitors from BetterStack:', error);
      
      // Return cached data if available, even if expired
      if (this.monitorsCache.length > 0) {
        console.log('Returning cached monitor data due to API error');
        return this.monitorsCache;
      }
      
      // If no cached data, use default monitors
      console.log('No cached data available, using default monitors');
      this.monitorsCache = DEFAULT_MONITORS;
      this.lastFetch = now;
      return this.monitorsCache;
    }
  }

  /**
   * Get service health status
   * Maps BetterStack monitors to our service status format
   */
  public async getServiceStatuses(): Promise<{
    overall: 'operational' | 'degraded' | 'outage' | 'maintenance';
    services: {
      name: string;
      status: 'operational' | 'degraded' | 'outage' | 'maintenance';
      uptimePercentage: number;
    }[];
  }> {
    const monitors = await this.getMonitors();
    
    // Map BetterStack status to our status format
    const services = monitors.map(monitor => {
      // Prioritize availability data if available
      const uptimeValue = monitor.availability || monitor.uptime || 99.0;
      
      // If monitor is down, make sure we show an appropriate uptime percentage
      // Override the uptime with availability or a lower value for down services
      const displayUptime = monitor.status === 'down' ? 
        (monitor.availability || 70.0) : uptimeValue;
      
      return {
        name: monitor.name,
        status: this.mapStatus(monitor.status),
        uptimePercentage: displayUptime
      };
    });
    
    // Get overall status
    const overallStatus = await this.getOverallStatus();
    
    // Log what we're returning
    console.log(`Returning ${services.length} monitor services with overall status: ${overallStatus}`);
    
    return {
      overall: overallStatus,
      services
    };
  }

  /**
   * Calculate overall system status based on all monitors
   */
  public async getOverallStatus(): Promise<'operational' | 'degraded' | 'outage' | 'maintenance'> {
    const monitors = await this.getMonitors();
    
    if (monitors.length === 0) {
      return 'operational'; // Default if no monitors
    }
    
    const hasDownMonitors = monitors.some(m => m.status === 'down');
    const hasMaintenanceMonitors = monitors.some(m => m.status === 'maintenance');
    
    if (hasDownMonitors) {
      // If many monitors are down, it's an outage
      const downCount = monitors.filter(m => m.status === 'down').length;
      const downPercentage = (downCount / monitors.length) * 100;
      
      return downPercentage > 50 ? 'outage' : 'degraded';
    }
    
    if (hasMaintenanceMonitors) {
      return 'maintenance';
    }
    
    return 'operational';
  }
  
  /**
   * Get a flattened service status for the API endpoint
   * This ensures the response has the correct structure
   */
  public async getServiceStatusForApi(): Promise<{
    overall: 'operational' | 'degraded' | 'outage' | 'maintenance';
    services: {
      name: string;
      status: 'operational' | 'degraded' | 'outage' | 'maintenance';
      uptimePercentage: number;
    }[];
  }> {
    const monitors = await this.getMonitors();
    
    // Map BetterStack status to our status format with appropriate uptime values
    const formattedServices = monitors.map(monitor => {
      // Prioritize availability data if available, which comes from the SLA endpoint
      const uptimeValue = monitor.availability || monitor.uptime || 99.0;
      
      // If monitor is down, make sure we show an appropriate uptime percentage
      // We want to show real-world values for down services rather than the 99.9% default
      const displayUptime = monitor.status === 'down' ? 
        (monitor.availability || 70.0) : uptimeValue;
      
      return {
        name: monitor.name,
        status: this.mapStatus(monitor.status),
        uptimePercentage: displayUptime
      };
    });
    
    const overallStatus = await this.getOverallStatus();
    
    console.log(`Preparing direct service list with ${formattedServices.length} services`);
    
    // IMPORTANT: Return in the correct format with services as a direct array
    const result = {
      overall: overallStatus,
      services: formattedServices
    };
    
    // Show what we're returning for debugging
    console.log("BetterStack service returning:", JSON.stringify(result).substring(0, 100) + "...");
    
    return result;
  }
  
  /**
   * Map BetterStack status to our status format
   */
  private mapStatus(betterStackStatus: string): 'operational' | 'degraded' | 'outage' | 'maintenance' {
    switch (betterStackStatus) {
      case 'up':
        return 'operational';
      case 'down':
        return 'outage';
      case 'maintenance':
        return 'maintenance';
      default:
        return 'degraded';
    }
  }
}

export const betterStackService = BetterStackService.getInstance();