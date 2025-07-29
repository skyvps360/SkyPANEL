import { Client } from '@hubspot/api-client';
import { storage } from '../../storage';

// Use the actual HubSpot types
type HubSpotContact = any;
type HubSpotTicket = any;

interface HubSpotSettings {
  enabled: boolean;
  portalId: string;
  apiKey: string;
  chatEnabled: boolean;
  ticketEnabled: boolean;
  ticketFormId?: string;
  contactFormId?: string;
}

class HubSpotService {
  private settings: HubSpotSettings | null = null;
  private client: Client | null = null;

  constructor() {}

  async initialize(): Promise<void> {
    try {
      const settings = await this.loadSettings();
      this.settings = settings;
      
      if (settings.enabled && settings.apiKey) {
        this.client = new Client({ accessToken: settings.apiKey });
      }
    } catch (error) {
      console.error('Failed to initialize HubSpot service:', error);
    }
  }

  private async loadSettings(): Promise<HubSpotSettings> {
    try {
      const enabled = await storage.getSetting('hubspot_enabled');
      const portalId = await storage.getSetting('hubspot_portal_id');
      const apiKey = await storage.getSetting('hubspot_api_key');
      const chatEnabled = await storage.getSetting('hubspot_chat_enabled');
      const ticketEnabled = await storage.getSetting('hubspot_ticket_enabled');
      const ticketFormId = await storage.getSetting('hubspot_ticket_form_id');
      const contactFormId = await storage.getSetting('hubspot_contact_form_id');

      return {
        enabled: enabled?.value === 'true',
        portalId: portalId?.value || '',
        apiKey: apiKey?.value || '',
        chatEnabled: chatEnabled?.value === 'true',
        ticketEnabled: ticketEnabled?.value === 'true',
        ticketFormId: ticketFormId?.value || '',
        contactFormId: contactFormId?.value || '',
      };
    } catch (error) {
      console.error('Failed to load HubSpot settings:', error);
      throw error;
    }
  }

  private getClient(): Client {
    if (!this.client) {
      throw new Error('HubSpot client not initialized. Please check your API key.');
    }
    return this.client;
  }

  async isEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.enabled || false;
  }

  async isChatEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.chatEnabled || false;
  }

  async isTicketEnabled(): Promise<boolean> {
    if (!this.settings) {
      await this.initialize();
    }
    return this.settings?.ticketEnabled || false;
  }

  async createContact(contactData: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
  }): Promise<HubSpotContact> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    
    const properties = {
      email: contactData.email,
      ...(contactData.firstname && { firstname: contactData.firstname }),
      ...(contactData.lastname && { lastname: contactData.lastname }),
      ...(contactData.company && { company: contactData.company }),
      ...(contactData.phone && { phone: contactData.phone }),
    };

    const response = await client.crm.contacts.basicApi.create({ properties });
    return response as HubSpotContact;
  }

  async createTicket(ticketData: {
    subject: string;
    content: string;
    email: string;
    priority?: string;
    category?: string;
  }): Promise<HubSpotTicket> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    if (!await this.isTicketEnabled()) {
      throw new Error('HubSpot ticket support is not enabled');
    }

    const client = this.getClient();
    
    const properties = {
      subject: ticketData.subject,
      content: ticketData.content,
      hs_ticket_priority: ticketData.priority || 'MEDIUM',
      hs_ticket_category: ticketData.category || 'general',
      hs_pipeline: '0',
      hs_pipeline_stage: '1',
    };

    const response = await client.crm.tickets.basicApi.create({ properties });
    return response;
  }

  async getContactByEmail(email: string): Promise<HubSpotContact | null> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    
    try {
      const response = await client.crm.contacts.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ' as any,
                value: email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname', 'company', 'phone'],
        limit: 1,
      });

      return response.results?.[0] || null;
    } catch (error) {
      console.error('Failed to get HubSpot contact:', error);
      return null;
    }
  }

  async updateContact(contactId: string, properties: Record<string, string>): Promise<HubSpotContact> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    const response = await client.crm.contacts.basicApi.update(contactId, { properties });
    return response;
  }

  async getChatWidgetConfig(): Promise<{ portalId: string } | null> {
    if (!await this.isChatEnabled()) {
      return null;
    }

    return {
      portalId: this.settings?.portalId || '',
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      if (!await this.isEnabled()) {
        return {
          success: false,
          message: 'HubSpot integration is not enabled',
        };
      }

      const client = this.getClient();
      
      // Test connection by trying to get a single contact
      await client.crm.contacts.basicApi.getPage(1);

      return {
        success: true,
        message: 'HubSpot connection successful',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `HubSpot connection failed: ${error.message}`,
      };
    }
  }

  async refreshSettings(): Promise<void> {
    this.settings = await this.loadSettings();
    if (this.settings.enabled && this.settings.apiKey) {
      this.client = new Client({ accessToken: this.settings.apiKey });
    }
  }

  // Additional methods for CRM integration
  async getAllContacts(limit: number = 100): Promise<HubSpotContact[]> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    const response = await client.crm.contacts.basicApi.getPage(limit);
    return response.results || [];
  }

  async createOrUpdateContact(contactData: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
  }): Promise<HubSpotContact> {
    // First try to find existing contact
    const existingContact = await this.getContactByEmail(contactData.email);
    
    if (existingContact) {
      // Update existing contact
      return await this.updateContact(existingContact.id, {
        ...(contactData.firstname && { firstname: contactData.firstname }),
        ...(contactData.lastname && { lastname: contactData.lastname }),
        ...(contactData.company && { company: contactData.company }),
        ...(contactData.phone && { phone: contactData.phone }),
      });
    } else {
      // Create new contact
      return await this.createContact(contactData);
    }
  }

  async getTicketById(ticketId: string): Promise<HubSpotTicket | null> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    
    try {
      const response = await client.crm.tickets.basicApi.getById(ticketId);
      return response;
    } catch (error) {
      console.error('Failed to get HubSpot ticket:', error);
      return null;
    }
  }

  async updateTicket(ticketId: string, properties: Record<string, string>): Promise<HubSpotTicket> {
    if (!await this.isEnabled()) {
      throw new Error('HubSpot integration is not enabled');
    }

    const client = this.getClient();
    const response = await client.crm.tickets.basicApi.update(ticketId, { properties });
    return response;
  }
}

// Export a singleton instance
export const hubspotService = new HubSpotService(); 