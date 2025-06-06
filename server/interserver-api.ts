import axios, { AxiosInstance, AxiosResponse } from 'axios';

// InterServer API Types based on the OpenAPI specification
export interface DnsListItem {
  id: number;
  name: string;
  content: string;
}

export interface DnsNewDomain {
  domain: string;
  ip: string;
}

// InterServer API returns all fields as strings, including numeric values
export interface DnsRecord {
  id: string;
  domain_id: string;
  name: string;
  type: string;
  content: string;
  ttl: string;
  prio: string;
  disabled: string;
  ordername: string;
  auth: string;
}

export interface DnsUpdateRecord {
  name?: string;
  type?: string;
  content?: string;
  ttl?: string;
  prio?: string;
  disabled?: string;
  ordername?: string;
  auth?: string;
}

// SkyPANEL White-labeled Nameserver Configuration
export const SKYPANEL_NAMESERVERS = {
  NS1: 'cdns.ns1.skyvps360.xyz',
  NS2: 'cdns.ns2.skyvps360.xyz',
  NS3: 'cdns.ns3.skyvps360.xyz'
} as const;

// Default InterServer nameservers to replace
export const INTERSERVER_NAMESERVERS = {
  NS1: 'cdns1.interserver.net',
  NS2: 'cdns2.interserver.net',
  NS3: 'cdns3.interserver.net'
} as const;

export interface InterServerApiError {
  error: string;
  message?: string;
}

/**
 * InterServer Management API Client
 * Provides DNS management functionality using the InterServer API v0.9.0
 */
export class InterServerApi {
  private client: AxiosInstance;
  private apiKey: string;
  private baseUrl: string = 'https://my.interserver.net/apiv2';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.INTERSERVER_API_KEY || '';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`InterServer API Request: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          console.log('Request data:', config.data);
        }
        return config;
      },
      (error) => {
        console.error('InterServer API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`InterServer API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error('InterServer API Error Details:');
        console.error('- Status:', error.response?.status);
        console.error('- Status Text:', error.response?.statusText);
        console.error('- Data:', error.response?.data);
        console.error('- Headers:', error.response?.headers);
        console.error('- Message:', error.message);
        throw error;
      }
    );
  }

  /**
   * Check if the API is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get list of DNS domains
   */
  async getDnsList(): Promise<DnsListItem[]> {
    try {
      const response: AxiosResponse<DnsListItem[]> = await this.client.get('/dns');
      return response.data;
    } catch (error) {
      console.error('Error fetching DNS list:', error);
      throw new Error('Failed to fetch DNS domains');
    }
  }

  /**
   * Add a new DNS domain
   * Uses the InterServer API endpoint: POST /dns
   * Since the API doesn't return the domain ID directly, we fetch the domain list
   * after creation to find the newly created domain and return its ID.
   */
  async addDnsDomain(domain: string, ip: string): Promise<{ id: number; domain: string } | null> {
    try {
      const data: DnsNewDomain = { domain, ip };

      // First, create the domain
      const response = await this.client.post('/dns', data, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('InterServer add domain response:', response.data);

      // Wait a moment for the domain to be created
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Now fetch the domain list to find the newly created domain
      try {
        const domainsList = await this.getDnsList();
        const newDomain = domainsList.find(d => d.name === domain);

        if (newDomain) {
          console.log(`Found newly created domain: ID ${newDomain.id} for ${domain}`);
          return {
            id: newDomain.id,
            domain: newDomain.name
          };
        } else {
          console.warn(`Domain ${domain} was created but not found in domain list`);
          return null;
        }
      } catch (listError) {
        console.error('Error fetching domain list after creation:', listError);
        // Domain was created but we couldn't get its ID
        return null;
      }
    } catch (error) {
      console.error('Error adding DNS domain to InterServer:', error);
      if (error.response?.status === 401) {
        throw new Error('Unauthorized access to InterServer API');
      } else if (error.response?.data?.error) {
        throw new Error(`InterServer API error: ${error.response.data.error}`);
      } else {
        throw new Error('Failed to add DNS domain to InterServer');
      }
    }
  }

  /**
   * Get DNS records for a specific domain
   * Uses the InterServer API endpoint: GET /dns/{id}
   */
  async getDnsDomain(domainId: number): Promise<DnsRecord[]> {
    try {
      const response: AxiosResponse<DnsRecord[]> = await this.client.get(`/dns/${domainId}`);

      // Validate response data
      if (!Array.isArray(response.data)) {
        console.error('Invalid response format from InterServer API:', response.data);
        throw new Error('Invalid response format from DNS API');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching DNS records from InterServer:', error);
      if (error.response?.status === 404) {
        throw new Error('Domain not found in InterServer DNS');
      } else if (error.response?.status === 401) {
        throw new Error('Unauthorized access to InterServer API');
      } else {
        throw new Error('Failed to fetch DNS records from InterServer');
      }
    }
  }

  /**
   * Delete a DNS domain
   */
  async deleteDnsDomain(domainId: number): Promise<any> {
    try {
      const response = await this.client.delete(`/dns/${domainId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting DNS domain:', error);
      throw new Error('Failed to delete DNS domain');
    }
  }

  /**
   * Update a DNS record
   * Uses the InterServer API endpoint: POST /dns/{id}/{recordId}
   */
  async updateDnsRecord(domainId: number, recordId: number, recordData: DnsUpdateRecord): Promise<any> {
    try {
      const response = await this.client.post(`/dns/${domainId}/${recordId}`, recordData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('InterServer update record response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating DNS record in InterServer:', error);
      if (error.response?.status === 401) {
        throw new Error('Unauthorized access to InterServer API');
      } else if (error.response?.status === 404) {
        throw new Error('DNS record not found in InterServer');
      } else if (error.response?.data?.error) {
        throw new Error(`InterServer API error: ${error.response.data.error}`);
      } else {
        throw new Error('Failed to update DNS record in InterServer');
      }
    }
  }

  /**
   * Delete a DNS record
   * Uses the InterServer API endpoint: DELETE /dns/{id}/{recordId}
   */
  async deleteDnsRecord(domainId: number, recordId: number): Promise<any> {
    try {
      const response = await this.client.delete(`/dns/${domainId}/${recordId}`);

      console.log('InterServer delete record response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error deleting DNS record from InterServer:', error);
      if (error.response?.status === 401) {
        throw new Error('Unauthorized access to InterServer API');
      } else if (error.response?.status === 404) {
        throw new Error('DNS record not found in InterServer');
      } else if (error.response?.data?.error) {
        throw new Error(`InterServer API error: ${error.response.data.error}`);
      } else {
        throw new Error('Failed to delete DNS record from InterServer');
      }
    }
  }

  /**
   * Add a new DNS record to a domain
   * Note: The InterServer API doesn't have a specific endpoint for adding new records.
   * According to the API documentation, records are managed through the domain update endpoint.
   * This method uses POST /dns/{id} which is the "Update DNS Domain" endpoint.
   */
  async addDnsRecord(domainId: number, recordData: DnsUpdateRecord): Promise<any> {
    try {
      // Ensure all required fields are strings as expected by InterServer API
      const formattedData: DnsUpdateRecord = {
        name: recordData.name || '',
        type: recordData.type || 'A',
        content: recordData.content || '',
        ttl: recordData.ttl || '86400',
        prio: recordData.prio || '0',
        disabled: recordData.disabled || '0',
        ordername: recordData.ordername || '',
        auth: recordData.auth || '1'
      };

      const response = await this.client.post(`/dns/${domainId}`, formattedData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('InterServer add record response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error adding DNS record to InterServer:', error);
      if (error.response?.status === 401) {
        throw new Error('Unauthorized access to InterServer API');
      } else if (error.response?.status === 404) {
        throw new Error('Domain not found in InterServer');
      } else if (error.response?.data?.error) {
        throw new Error(`InterServer API error: ${error.response.data.error}`);
      } else {
        throw new Error('Failed to add DNS record to InterServer');
      }
    }
  }

  /**
   * Validate domain name format
   */
  static validateDomainName(domain: string): boolean {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain) && domain.length <= 253;
  }

  /**
   * Validate IP address format
   */
  static validateIpAddress(ip: string): boolean {
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Get valid DNS record types
   */
  static getValidRecordTypes(): string[] {
    return ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV', 'CAA'];
  }

  /**
   * Replace default InterServer nameservers with SkyPANEL white-labeled nameservers
   * This method should be called after successful domain creation to provide
   * a seamless white-labeled DNS experience.
   */
  async replaceNameserverRecords(domainId: number, domainName: string): Promise<{
    success: boolean;
    replacedRecords: Array<{ type: string; old: string; new: string; recordId: string }>;
    errors: string[];
  }> {
    const result = {
      success: true,
      replacedRecords: [] as Array<{ type: string; old: string; new: string; recordId: string }>,
      errors: [] as string[]
    };

    try {
      console.log(`Starting nameserver replacement for domain ${domainName} (ID: ${domainId})`);

      // Get current DNS records for the domain
      const records = await this.getDnsDomain(domainId);
      console.log(`Found ${records.length} DNS records for domain ${domainName}`);

      // Find NS records that need to be replaced
      const nsRecords = records.filter(record =>
        record.type === 'NS' &&
        Object.values(INTERSERVER_NAMESERVERS).includes(record.content)
      );

      // Find SOA record that needs to be updated (contains any InterServer nameserver references)
      const soaRecords = records.filter(record =>
        record.type === 'SOA' &&
        (record.content.includes('cdns1.interserver.net') || record.content.includes('dns.interserver.net'))
      );

      console.log(`Found ${nsRecords.length} NS records and ${soaRecords.length} SOA records to replace`);

      // Replace NS records
      for (const nsRecord of nsRecords) {
        try {
          let newNameserver: string;

          // Map InterServer nameservers to SkyPANEL nameservers
          switch (nsRecord.content) {
            case INTERSERVER_NAMESERVERS.NS1:
              newNameserver = SKYPANEL_NAMESERVERS.NS1;
              break;
            case INTERSERVER_NAMESERVERS.NS2:
              newNameserver = SKYPANEL_NAMESERVERS.NS2;
              break;
            case INTERSERVER_NAMESERVERS.NS3:
              newNameserver = SKYPANEL_NAMESERVERS.NS3;
              break;
            default:
              console.warn(`Unknown InterServer nameserver: ${nsRecord.content}`);
              continue;
          }

          // Update the NS record
          await this.updateDnsRecord(domainId, parseInt(nsRecord.id), {
            name: nsRecord.name,
            type: nsRecord.type,
            content: newNameserver,
            ttl: nsRecord.ttl,
            prio: nsRecord.prio,
            disabled: nsRecord.disabled,
            ordername: nsRecord.ordername,
            auth: nsRecord.auth
          });

          result.replacedRecords.push({
            type: 'NS',
            old: nsRecord.content,
            new: newNameserver,
            recordId: nsRecord.id
          });

          console.log(`Successfully replaced NS record: ${nsRecord.content} → ${newNameserver}`);
        } catch (error) {
          const errorMsg = `Failed to replace NS record ${nsRecord.content}: ${error.message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      // Replace SOA record
      for (const soaRecord of soaRecords) {
        try {
          // Update SOA record to use SkyPANEL nameservers for both primary and admin contact
          let newSoaContent = soaRecord.content;

          // Replace primary nameserver (cdns1.interserver.net)
          newSoaContent = newSoaContent.replace(
            'cdns1.interserver.net',
            SKYPANEL_NAMESERVERS.NS1
          );

          // Replace administrative contact (dns.interserver.net with cdns.ns2.skyvps360.xyz)
          newSoaContent = newSoaContent.replace(
            'dns.interserver.net',
            SKYPANEL_NAMESERVERS.NS2
          );

          console.log(`SOA record replacement: ${soaRecord.content} → ${newSoaContent}`);

          await this.updateDnsRecord(domainId, parseInt(soaRecord.id), {
            name: soaRecord.name,
            type: soaRecord.type,
            content: newSoaContent,
            ttl: soaRecord.ttl,
            prio: soaRecord.prio,
            disabled: soaRecord.disabled,
            ordername: soaRecord.ordername,
            auth: soaRecord.auth
          });

          result.replacedRecords.push({
            type: 'SOA',
            old: soaRecord.content,
            new: newSoaContent,
            recordId: soaRecord.id
          });

          console.log(`Successfully replaced SOA record with SkyPANEL nameservers (primary and admin contact)`);
        } catch (error) {
          const errorMsg = `Failed to replace SOA record: ${error.message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }

      console.log(`Nameserver replacement completed for ${domainName}. Success: ${result.success}, Replaced: ${result.replacedRecords.length}, Errors: ${result.errors.length}`);

      return result;
    } catch (error) {
      console.error(`Error during nameserver replacement for domain ${domainName}:`, error);
      result.success = false;
      result.errors.push(`Failed to fetch domain records: ${error.message}`);
      return result;
    }
  }

  /**
   * Enhanced domain creation with automatic nameserver replacement
   * This method combines domain creation with white-labeled nameserver setup
   */
  async addDnsDomainWithWhiteLabel(domain: string, ip: string): Promise<{
    domainResult: { id: number; domain: string } | null;
    nameserverResult: {
      success: boolean;
      replacedRecords: Array<{ type: string; old: string; new: string; recordId: string }>;
      errors: string[];
    } | null;
    success: boolean;
    message: string;
  }> {
    try {
      console.log(`Creating domain ${domain} with white-labeled nameservers`);

      // Step 1: Create the domain normally
      const domainResult = await this.addDnsDomain(domain, ip);

      if (!domainResult || !domainResult.id) {
        return {
          domainResult: null,
          nameserverResult: null,
          success: false,
          message: 'Failed to create domain in InterServer'
        };
      }

      console.log(`Domain ${domain} created successfully with ID: ${domainResult.id}`);

      // Step 2: Wait a moment for DNS records to be fully created
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Step 3: Replace nameserver records
      const nameserverResult = await this.replaceNameserverRecords(domainResult.id, domain);

      const success = nameserverResult.success;
      const message = success
        ? `Domain created successfully with SkyPANEL nameservers (${nameserverResult.replacedRecords.length} records replaced)`
        : `Domain created but nameserver replacement had issues: ${nameserverResult.errors.join(', ')}`;

      return {
        domainResult,
        nameserverResult,
        success,
        message
      };
    } catch (error) {
      console.error(`Error in addDnsDomainWithWhiteLabel for ${domain}:`, error);
      return {
        domainResult: null,
        nameserverResult: null,
        success: false,
        message: `Failed to create domain with white-labeled nameservers: ${error.message}`
      };
    }
  }
}

// Export a singleton instance
export const interServerApi = new InterServerApi();
