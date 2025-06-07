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
    return [
      'A', 'A6', 'AAAA', 'AFSDB', 'ALIAS', 'CAA', 'CDNSKEY', 'CDS', 'CERT',
      'CNAME', 'DHCID', 'DLV', 'DNAME', 'DNSKEY', 'DS', 'EUI48', 'EUI64',
      'HINFO', 'IPSECKEY', 'KEY', 'KX', 'LOC', 'MAILA', 'MAILB', 'MINFO',
      'MR', 'MX', 'NAPTR', 'NS', 'NSEC', 'NSEC3', 'NSEC3PARAM', 'OPENPGPKEY',
      'OPT', 'PTR', 'RKEY', 'RP', 'RRSIG', 'SIG', 'SPF', 'SRV', 'TKEY',
      'SSHFP', 'TLSA', 'TSIG', 'TXT', 'WKS', 'MBOXFW', 'URL'
    ];
  }
}

// Export a singleton instance
export const interServerApi = new InterServerApi();
