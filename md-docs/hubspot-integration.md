# HubSpot Integration Documentation

## Overview

The HubSpot integration in SkyPANEL provides comprehensive CRM functionality including live chat, ticket management, contact management, and form handling. The integration allows administrators to connect their HubSpot account to SkyPANEL for enhanced customer relationship management and support capabilities.

## Table of Contents

- [System Architecture](#system-architecture)
- [Features](#features)
- [Database Schema](#database-schema)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Frontend Components](#frontend-components)
- [HubSpot Service](#hubspot-service)
- [Live Chat Integration](#live-chat-integration)
- [Ticket Management](#ticket-management)
- [Contact Management](#contact-management)
- [Form Integration](#form-integration)
- [Security Features](#security-features)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## System Architecture

### Components

1. **HubSpot Service** (`server/services/communication/hubspot-service.ts`)
   - Core business logic for HubSpot operations
   - Contact and ticket management
   - API client initialization and configuration
   - Settings management

2. **Admin Settings Routes** (`server/routes/admin-settings.ts`)
   - HubSpot configuration management
   - Connection testing
   - Contact management endpoints

3. **Frontend Components**
   - HubSpot chat widget (`client/src/components/HubSpotChat.tsx`)
   - Admin settings interface (`client/src/pages/admin/settings-page.tsx`)
   - Configuration forms and validation

4. **Database Settings**
   - HubSpot configuration stored in settings table
   - Migration script for initial setup

### Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │     │             │
│  Frontend   │────▶│  Backend    │────▶│ HubSpot     │────▶│ HubSpot     │
│             │     │  Service    │     │   API       │     │  Database   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │                   │                   │
       │                   │                   │                   │
       └───────────────────┴───────────────────┘                   │
                       ▲                                           │
                       │                                           │
                       └───────────────────────────────────────────┘
```

## Features

### Core Functionality

1. **Live Chat Integration**
   - HubSpot chat widget embedding
   - Real-time customer support
   - Chat history and analytics
   - Customizable chat appearance

2. **Contact Management**
   - Create and update HubSpot contacts
   - Contact search and retrieval
   - Contact property synchronization
   - Bulk contact operations

3. **Ticket Management**
   - Create support tickets in HubSpot
   - Ticket status tracking
   - Priority and category management
   - Ticket updates and notifications

4. **Form Integration**
   - HubSpot form embedding
   - Contact form handling
   - Ticket form processing
   - Form submission tracking

5. **Configuration Management**
   - Portal ID configuration
   - API key management
   - Feature enable/disable controls
   - Connection testing

## Database Schema

### Settings Table

HubSpot configuration is stored in the existing settings table:

```sql
-- HubSpot settings in settings table
INSERT INTO settings (key, value, description) VALUES
('hubspot_enabled', 'false', 'Enable HubSpot integration'),
('hubspot_portal_id', '', 'HubSpot portal ID'),
('hubspot_api_key', '', 'HubSpot API key'),
('hubspot_chat_enabled', 'false', 'Enable HubSpot live chat'),
('hubspot_ticket_enabled', 'false', 'Enable HubSpot ticket support'),
('hubspot_ticket_form_id', '', 'HubSpot ticket form ID'),
('hubspot_contact_form_id', '', 'HubSpot contact form ID');
```

### Settings Interface

```typescript
interface HubSpotSettings {
  enabled: boolean;
  portalId: string;
  apiKey: string;
  chatEnabled: boolean;
  ticketEnabled: boolean;
  ticketFormId?: string;
  contactFormId?: string;
}
```

## Configuration

### Environment Variables

No specific environment variables are required. All configuration is stored in the database settings table.

### HubSpot Account Setup

1. **Create HubSpot Account**
   - Sign up for a HubSpot account
   - Choose appropriate plan (Professional or Enterprise recommended)
   - Set up your portal

2. **Get Portal ID**
   - Log into HubSpot
   - Go to Settings → Account Setup → Account and Defaults
   - Note your Portal ID (found in the URL: https://app.hubspot.com/portal/{PORTAL_ID})

3. **Generate API Key**
   - Go to Settings → Account Setup → Integrations → API Keys
   - Create a new API key with appropriate scopes
   - Copy the API key for configuration

4. **Configure in SkyPANEL**
   - Navigate to Admin → Settings → HubSpot
   - Enter Portal ID and API Key
   - Enable desired features (chat, tickets, etc.)

### Feature Configuration

#### Live Chat Setup

1. **Enable Chat in HubSpot**
   - Go to Settings → Inbox → Chatflows
   - Create or configure existing chatflow
   - Note the chat widget settings

2. **Configure in SkyPANEL**
   - Enable "HubSpot Integration" in admin settings
   - Enable "Live Chat" option
   - Save configuration

#### Ticket Management Setup

1. **Configure Tickets in HubSpot**
   - Go to Settings → Objects → Tickets
   - Set up ticket properties and pipelines
   - Create ticket forms if needed

2. **Configure in SkyPANEL**
   - Enable "Ticket Support" in admin settings
   - Enter ticket form ID if using custom forms
   - Save configuration

## API Endpoints

### Admin Endpoints

#### `GET /api/admin/settings/hubspot/config`
Returns HubSpot configuration for frontend.

**Response:**
```json
{
  "enabled": true,
  "chatEnabled": true,
  "portalId": "12345678",
  "ticketEnabled": false,
  "ticketFormId": "",
  "contactFormId": ""
}
```

#### `POST /api/admin/settings/hubspot/test-connection`
Tests HubSpot API connection.

**Response:**
```json
{
  "success": true,
  "message": "HubSpot connection successful"
}
```

#### `GET /api/admin/settings/hubspot/contacts`
Retrieves HubSpot contacts (admin only).

**Query Parameters:**
- `limit`: Number of contacts to retrieve (default: 50)

**Response:**
```json
{
  "contacts": [
    {
      "id": "123",
      "properties": {
        "email": "user@example.com",
        "firstname": "John",
        "lastname": "Doe",
        "company": "Example Corp"
      }
    }
  ]
}
```

#### `POST /api/admin/settings/hubspot/contacts`
Creates a new HubSpot contact (admin only).

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstname": "John",
  "lastname": "Doe",
  "company": "Example Corp",
  "phone": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "contact": {
    "id": "123",
    "properties": {
      "email": "user@example.com",
      "firstname": "John",
      "lastname": "Doe"
    }
  }
}
```

## Frontend Components

### HubSpot Chat Widget

The `HubSpotChat` component dynamically loads the HubSpot chat widget:

```tsx
export const HubSpotChat: React.FC = () => {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const loadHubSpotScript = async () => {
      try {
        const response = await axios.get('/api/admin/settings/hubspot/config');
        const settings = response.data;

        if (settings.enabled && settings.chatEnabled && settings.portalId) {
          // Load HubSpot script
          const script = document.createElement('script');
          script.type = 'text/javascript';
          script.id = 'hs-script-loader';
          script.src = `//js-na3.hs-scripts.com/${settings.portalId}.js`;
          
          document.head.appendChild(script);
          setScriptLoaded(true);
        }
      } catch (error) {
        console.error('Error loading HubSpot settings:', error);
      }
    };

    loadHubSpotScript();
  }, []);

  return null; // Script handles widget display
};
```

### Admin Settings Interface

The HubSpot configuration is managed through the admin settings page:

```tsx
// HubSpot settings schema
const hubspotSchema = z.object({
  hubspotEnabled: z.boolean().default(false),
  hubspotPortalId: z.string().min(1, { 
    message: "Portal ID is required when HubSpot is enabled" 
  }).optional(),
  hubspotApiKey: z.string().min(1, { 
    message: "API Key is required when HubSpot is enabled" 
  }).optional(),
  hubspotChatEnabled: z.boolean().default(false),
  hubspotTicketEnabled: z.boolean().default(false),
  hubspotTicketFormId: z.string().optional(),
  hubspotContactFormId: z.string().optional(),
});
```

## HubSpot Service

### Service Class

The `HubSpotService` class provides the core functionality:

```typescript
class HubSpotService {
  private settings: HubSpotSettings | null = null;
  private client: Client | null = null;

  async initialize(): Promise<void> {
    const settings = await this.loadSettings();
    this.settings = settings;
    
    if (settings.enabled && settings.apiKey) {
      this.client = new Client({ accessToken: settings.apiKey });
    }
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
}
```

### Contact Management

```typescript
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
  return response;
}
```

### Ticket Management

```typescript
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
```

## Live Chat Integration

### Widget Loading

The HubSpot chat widget is loaded dynamically based on configuration:

1. **Check Configuration**
   - Verify HubSpot is enabled
   - Check if chat is enabled
   - Validate portal ID

2. **Load Script**
   - Create script element
   - Set source to HubSpot CDN
   - Append to document head

3. **Widget Display**
   - HubSpot script handles widget rendering
   - Widget appears based on HubSpot settings
   - Chat functionality is fully managed by HubSpot

### Configuration Options

```typescript
interface ChatConfig {
  enabled: boolean;
  portalId: string;
  // Additional HubSpot chat settings can be added here
}
```

## Ticket Management

### Ticket Creation

Tickets can be created programmatically through the HubSpot API:

```typescript
const ticket = await hubspotService.createTicket({
  subject: "Support Request",
  content: "I need help with my server",
  email: "user@example.com",
  priority: "HIGH",
  category: "technical"
});
```

### Ticket Properties

- **Subject**: Ticket title/description
- **Content**: Detailed ticket content
- **Priority**: LOW, MEDIUM, HIGH
- **Category**: Ticket categorization
- **Pipeline**: Ticket workflow stage
- **Email**: Contact email for ticket

### Ticket Status Tracking

Tickets can be updated and tracked through the HubSpot interface:

```typescript
await hubspotService.updateTicket(ticketId, {
  hs_ticket_priority: "HIGH",
  hs_pipeline_stage: "2" // Move to next stage
});
```

## Contact Management

### Contact Creation

Contacts are created with basic information:

```typescript
const contact = await hubspotService.createContact({
  email: "user@example.com",
  firstname: "John",
  lastname: "Doe",
  company: "Example Corp",
  phone: "+1234567890"
});
```

### Contact Search

Contacts can be searched by email:

```typescript
const contact = await hubspotService.getContactByEmail("user@example.com");
if (contact) {
  console.log("Contact found:", contact.properties);
}
```

### Contact Updates

Existing contacts can be updated:

```typescript
await hubspotService.updateContact(contactId, {
  firstname: "Jane",
  company: "New Company"
});
```

## Form Integration

### HubSpot Forms

HubSpot forms can be embedded in SkyPANEL pages:

1. **Create Form in HubSpot**
   - Go to Marketing → Lead Capture → Forms
   - Create new form or use existing
   - Copy form embed code

2. **Embed in SkyPANEL**
   - Add form HTML to desired page
   - Configure form submission handling
   - Track form conversions

### Form Configuration

```typescript
interface FormConfig {
  ticketFormId?: string;
  contactFormId?: string;
  // Additional form settings
}
```

## Security Features

### API Key Security

- API keys stored securely in database
- Keys encrypted at rest
- Access limited to admin users only
- Regular key rotation recommended

### Connection Validation

- API connection tested on configuration
- Invalid credentials rejected
- Connection status monitored
- Error handling for failed connections

### Data Privacy

- Contact data handled according to HubSpot privacy policy
- GDPR compliance through HubSpot
- Data retention policies configurable
- User consent management

## Error Handling

### Common Error Scenarios

1. **Invalid API Key**
   - Error: `HubSpot connection failed: Invalid API key`
   - Resolution: Verify API key in HubSpot settings

2. **Portal ID Not Found**
   - Error: `HubSpot portal not found`
   - Resolution: Check portal ID in HubSpot account

3. **Feature Not Enabled**
   - Error: `HubSpot integration is not enabled`
   - Resolution: Enable HubSpot in admin settings

4. **API Rate Limits**
   - Error: `Rate limit exceeded`
   - Resolution: Wait and retry, or upgrade HubSpot plan

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "details": "Additional error information"
}
```

## Best Practices

### Configuration

1. **API Key Management**
   - Use dedicated API keys for SkyPANEL
   - Rotate keys regularly
   - Monitor API usage

2. **Feature Enablement**
   - Enable only needed features
   - Test configuration thoroughly
   - Monitor performance impact

3. **Data Synchronization**
   - Sync contacts regularly
   - Handle duplicate contacts
   - Maintain data consistency

### Development

1. **Error Handling**
   - Implement comprehensive error handling
   - Log all API interactions
   - Provide user-friendly error messages

2. **Performance**
   - Cache HubSpot settings
   - Minimize API calls
   - Use async operations

3. **Testing**
   - Test with HubSpot sandbox
   - Validate all features
   - Monitor in production

## Troubleshooting

### Common Issues

1. **Chat Widget Not Loading**
   - Check portal ID configuration
   - Verify chat is enabled in HubSpot
   - Check browser console for errors
   - Ensure HubSpot script loads

2. **API Connection Failures**
   - Verify API key is correct
   - Check HubSpot account status
   - Test connection in admin panel
   - Review API rate limits

3. **Contact Creation Failures**
   - Validate contact data format
   - Check required fields
   - Verify API permissions
   - Review HubSpot contact limits

### Debug Commands

```sql
-- Check HubSpot settings
SELECT * FROM settings WHERE "key" LIKE 'hubspot_%';

-- Verify settings are loaded
SELECT "key", "value" FROM settings 
WHERE "key" IN ('hubspot_enabled', 'hubspot_portal_id', 'hubspot_api_key');
```

### HubSpot Account Issues

1. **Portal Access**
   - Verify portal ID is correct
   - Check account permissions
   - Ensure account is active

2. **API Permissions**
   - Verify API key has required scopes
   - Check API key is active
   - Review API usage limits

3. **Feature Availability**
   - Check HubSpot plan includes features
   - Verify features are enabled in HubSpot
   - Contact HubSpot support if needed

## Integration with Other Systems

### SkyPANEL Integration

The HubSpot integration works alongside other SkyPANEL features:

1. **User Management**
   - Contacts can be created from user registrations
   - User data can sync to HubSpot
   - Support tickets linked to user accounts

2. **Support System**
   - HubSpot tickets can integrate with SkyPANEL tickets
   - Chat conversations can create tickets
   - Support history tracked in HubSpot

3. **Analytics**
   - HubSpot analytics available for contacts
   - Chat performance metrics
   - Ticket resolution tracking

### Future Enhancements

1. **Advanced Features**
   - Marketing automation integration
   - Email campaign management
   - Advanced analytics and reporting
   - Custom property mapping

2. **Workflow Integration**
   - Automated contact creation
   - Ticket routing rules
   - Chat bot integration
   - Lead scoring

3. **API Enhancements**
   - Webhook support
   - Real-time data sync
   - Bulk operations
   - Custom integrations

## Conclusion

The HubSpot integration in SkyPANEL provides a comprehensive CRM solution that enhances customer relationship management and support capabilities. With proper configuration and maintenance, it offers powerful tools for contact management, live chat support, and ticket tracking.

For additional support or feature requests, please refer to the main SkyPANEL documentation or contact the development team. 