# SkyPANEL DNS Management System

## Table of Contents

1. [System Overview](#system-overview)
2. [Technical Implementation](#technical-implementation)
3. [@ Symbol Notation System](#-symbol-notation-system)
4. [API Integration Details](#api-integration-details)
5. [User Interface Documentation](#user-interface-documentation)
6. [Configuration and Setup](#configuration-and-setup)
7. [Code Examples](#code-examples)
8. [Security Considerations](#security-considerations)

---

## System Overview

### Architecture Overview

The SkyPANEL DNS management system provides a comprehensive white-labeled DNS management solution that integrates with InterServer's DNS API. The system follows a modern three-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   DNS Domains   │  │   DNS Records   │  │ Add/Edit     │ │
│  │   Management    │  │   Management    │  │ Dialogs      │ │
│  │   Page          │  │   Page          │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   DNS Routes    │  │   Validation    │  │ @ Symbol     │ │
│  │   /api/dns/*    │  │   Functions     │  │ Processing   │ │
│  │                 │  │                 │  │              │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 External Integration Layer                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   InterServer   │  │   White-labeled │  │ Local        │ │
│  │   DNS API       │  │   Nameservers   │  │ Database     │ │
│  │   v0.9.0        │  │   (Optional)    │  │ Storage      │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **InterServer API Integration**: Full integration with InterServer Management API v0.9.0
- **@ Symbol Notation**: User-friendly input system supporting `@`, `subdomain.@`, and `subdomain@` formats
- **White-labeled Nameservers**: Optional configuration for custom nameserver branding
- **60+ DNS Record Types**: Complete support for all InterServer-supported record types
- **Real-time Management**: Direct API communication without local record storage
- **User Authentication**: Secure access control with user-specific domain management
- **Professional UI**: Modern, responsive interface with comprehensive validation

### Integration with InterServer API

The system integrates directly with InterServer's DNS management API, providing:

- **Domain Management**: Create, list, and delete DNS domains
- **Record Management**: Add, update, delete, and list DNS records
- **Real-time Synchronization**: All changes are immediately reflected in InterServer's DNS system
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Rate Limiting**: Built-in request throttling to respect API limits

### White-labeled Nameserver Functionality

SkyPANEL supports white-labeled nameserver configuration:

**Default InterServer Nameservers:**
- `cdns1.interserver.net`
- `cdns2.interserver.net`
- `cdns3.interserver.net`

**White-labeled SkyPANEL Nameservers:**
- `cdns.ns1.skyvps360.xyz`
- `cdns.ns2.skyvps360.xyz`
- `cdns.ns3.skyvps360.xyz`

The system automatically replaces default nameservers with white-labeled ones and updates SOA records for seamless branding.

---

## Technical Implementation

### Backend API Endpoints

#### Domain Management Endpoints

**GET /api/dns/domains**
- **Purpose**: Retrieve all DNS domains for authenticated user
- **Authentication**: Required
- **Response**: Array of domain objects with InterServer integration status

**POST /api/dns/domains**
- **Purpose**: Add new DNS domain to InterServer
- **Authentication**: Required
- **Validation**: Domain name format and IP address validation
- **Process**: Creates domain in InterServer and stores reference locally

**DELETE /api/dns/domains/:id**
- **Purpose**: Remove DNS domain from InterServer and local database
- **Authentication**: Required
- **Validation**: Domain ownership verification

#### Record Management Endpoints

**GET /api/dns/domains/:id/records**
- **Purpose**: Retrieve DNS records for specific domain from InterServer
- **Authentication**: Required
- **Process**: Fetches live data from InterServer API, no local caching

**POST /api/dns/domains/:id/records**
- **Purpose**: Add new DNS record via InterServer API
- **Authentication**: Required
- **Validation**: Record name, type, content, TTL, and priority validation
- **Process**: Converts @ notation to full domain names before API call

**PUT /api/dns/domains/:domainId/records/:recordId**
- **Purpose**: Update existing DNS record via InterServer API
- **Authentication**: Required
- **Validation**: Complete record validation with @ symbol support

**DELETE /api/dns/domains/:domainId/records/:recordId**
- **Purpose**: Delete DNS record from InterServer
- **Authentication**: Required
- **Validation**: Record ownership and existence verification

### Frontend Components

#### DNS Domains Management Page (`dns-domains-page.tsx`)
- **Purpose**: Main dashboard for domain management
- **Features**: Domain listing, addition, deletion, and record management navigation
- **Components**: DataTable, AddDomainDialog, confirmation dialogs

#### DNS Records Management Page (`dns-records-page.tsx`)
- **Purpose**: Detailed record management for specific domains
- **Features**: Record listing, addition, editing, deletion with real-time updates
- **Display Logic**: Shows actual domain names (not @ notation) for clarity

#### Add Record Dialog (`AddRecordDialog.tsx`)
- **Purpose**: Form for creating new DNS records
- **Features**: @ symbol notation support, record type selection, validation
- **Validation**: Real-time validation with specific error messages

#### Edit Record Dialog (`EditRecordDialog.tsx`)
- **Purpose**: Form for modifying existing DNS records
- **Features**: Pre-populated fields with @ notation conversion for user convenience
- **Process**: Converts full domain names to @ notation for editing, then back to full names

### Shared Validation Functions

#### Core Validation Functions (`shared/dns-record-types.ts`)

**validateRecordName(name: string): boolean**
- Validates DNS record names with @ symbol notation support
- Supports: `@`, `subdomain.@`, `subdomain@`, regular subdomains
- RFC-compliant DNS name validation

**processRecordName(recordName: string, domainName: string): string**
- Converts @ symbol notation to full domain names for InterServer API
- `@` → `example.com`
- `www.@` → `www.example.com`
- `mail@` → `mail.example.com`

**validateSubdomainPart(subdomain: string): boolean**
- Validates subdomain components without @ symbols
- Enforces DNS naming rules: length limits, character restrictions, label validation

### Database Schema

#### DNS Domains Table (`dns_domains`)

```sql
CREATE TABLE dns_domains (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    interserver_id INTEGER,              -- InterServer domain ID
    name TEXT NOT NULL,                  -- Domain name (e.g., example.com)
    status TEXT NOT NULL DEFAULT 'active', -- active, inactive, pending
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_dns_domains_user_id ON dns_domains(user_id);
CREATE INDEX idx_dns_domains_name ON dns_domains(name);
CREATE UNIQUE INDEX idx_dns_domains_user_name ON dns_domains(user_id, name);
```

#### DNS Records Table (`dns_records`)

```sql
CREATE TABLE dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES dns_domains(id) ON DELETE CASCADE,
    interserver_id TEXT,                 -- InterServer record ID
    name TEXT NOT NULL,                  -- Record name (actual domain name)
    type TEXT NOT NULL,                  -- A, AAAA, CNAME, MX, TXT, etc.
    content TEXT NOT NULL,               -- Record content (IP, hostname, etc.)
    ttl INTEGER NOT NULL DEFAULT 86400,  -- Time to live in seconds
    priority INTEGER DEFAULT 0,          -- For MX records
    disabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_dns_records_domain_id ON dns_records(domain_id);
CREATE INDEX idx_dns_records_type ON dns_records(type);
```

**Note**: The `dns_records` table is primarily used for reference and caching. The authoritative source is InterServer's API, and records are managed directly through their system.

---

## @ Symbol Notation System

### Overview

The @ symbol notation system provides user-friendly input methods while maintaining compatibility with InterServer's API requirements. Users can input DNS records using familiar @ notation, which is automatically converted to full domain names for API communication.

### Supported Formats

#### Root Domain Notation
- **Input**: `@` or empty string
- **Converts to**: `example.com` (full domain name)
- **Use case**: Root domain records (A, MX, TXT, etc.)

#### Subdomain with Dot Notation
- **Input**: `subdomain.@`
- **Converts to**: `subdomain.example.com`
- **Examples**: `www.@`, `mail.@`, `api.v1.@`
- **Use case**: Subdomains of the root domain

#### Subdomain without Dot Notation
- **Input**: `subdomain@`
- **Converts to**: `subdomain.example.com`
- **Examples**: `www@`, `mail@`, `ftp@`
- **Use case**: Alternative notation for subdomains

#### Regular Subdomain Names
- **Input**: `subdomain` (no @ symbol)
- **Converts to**: `subdomain` (unchanged)
- **Examples**: `www`, `mail`, `api`
- **Use case**: Traditional subdomain input

### Input Processing and Validation Logic

#### Frontend Validation (`validateRecordName`)

```javascript
export function validateRecordName(name: string): boolean {
  // Allow "@" for root domain
  if (name === '@') return true;
  // Allow empty string for root domain
  if (name.trim() === '') return true;

  const trimmed = name.trim();

  // Allow @ symbol notation formats
  if (trimmed.includes('@')) {
    if (trimmed === '@') return true; // Root domain
    if (trimmed.endsWith('.@')) {
      // Format: "subdomain.@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -2);
      return validateSubdomainPart(subdomain);
    }
    if (trimmed.endsWith('@')) {
      // Format: "subdomain@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -1);
      return validateSubdomainPart(subdomain);
    }
    return false; // Invalid @ symbol usage
  }

  // Regular subdomain validation
  return validateSubdomainPart(trimmed);
}
```

#### Backend Processing (`processRecordName`)

```javascript
export function processRecordName(recordName: string, domainName: string): string {
  const trimmed = recordName.trim();

  // Convert "@" to domain name for root domain
  if (trimmed === '@' || trimmed === '') {
    return domainName;
  }

  // Convert "subdomain.@" to "subdomain.domain.com"
  if (trimmed.endsWith('.@')) {
    const subdomain = trimmed.slice(0, -2);
    return `${subdomain}.${domainName}`;
  }

  // Convert "subdomain@" to "subdomain.domain.com"
  if (trimmed.endsWith('@')) {
    const subdomain = trimmed.slice(0, -1);
    return `${subdomain}.${domainName}`;
  }

  // Return as-is for regular subdomain names
  return trimmed;
}
```

### Display Logic and Conversion Functions

#### Records Display (No Conversion)

The system displays actual domain names as they exist in InterServer:

```javascript
// DNS Records Table Display
{
  header: "Name",
  accessorKey: "name",
  cell: (record) => (
    <span className="font-mono text-sm">{record.name}</span>
  ),
}
```

**Display Examples:**
- InterServer record: `example.com` → Display: `example.com`
- InterServer record: `www.example.com` → Display: `www.example.com`
- InterServer record: `mail.example.com` → Display: `mail.example.com`

#### Edit Dialog Conversion (User Convenience)

For editing convenience, the system converts full domain names back to @ notation:

```javascript
function convertToEditFormat(recordName: string, domainName: string): string {
  const trimmed = recordName.trim();

  // Convert domain name to "@" for root domain
  if (trimmed === domainName) {
    return '@';
  }

  // Convert "subdomain.domain.com" to "subdomain.@" for subdomains
  if (trimmed.endsWith(`.${domainName}`)) {
    const subdomain = trimmed.slice(0, -(domainName.length + 1));
    return `${subdomain}.@`;
  }

  // Return as-is if it doesn't match domain patterns
  return trimmed;
}
```

### User Experience Workflow Examples

#### Example 1: Adding Root Domain A Record

1. **User Input**: `@`
2. **Frontend Validation**: ✅ Accepts "@" for root domain
3. **Backend Processing**: Converts "@" to "example.com"
4. **InterServer API**: Receives "example.com"
5. **Record Storage**: Managed by InterServer
6. **Display**: Shows "example.com" in records list

#### Example 2: Adding Subdomain with @ Notation

1. **User Input**: `www.@`
2. **Frontend Validation**: ✅ Accepts "subdomain.@" format
3. **Backend Processing**: Converts "www.@" to "www.example.com"
4. **InterServer API**: Receives "www.example.com"
5. **Record Storage**: Managed by InterServer
6. **Display**: Shows "www.example.com" in records list

#### Example 3: Editing Existing Record

1. **Record**: "mail.example.com"
2. **Edit Dialog**: Converts to "mail.@" for user convenience
3. **User Edits**: Can modify using @ notation
4. **Form Submission**: Converts back to "mail.example.com"
5. **InterServer API**: Receives full domain name
6. **Display**: Shows updated "mail.example.com"

---

## API Integration Details

### InterServer API Authentication and Configuration

#### Environment Variables

```bash
# Required: InterServer API Key
INTERSERVER_API_KEY=your_interserver_api_key_here

# Optional: Custom API Base URL (defaults to https://my.interserver.net/apiv2)
INTERSERVER_API_URL=https://my.interserver.net/apiv2
```

#### API Client Configuration

```javascript
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
  }
}
```

### Record Type Support

The system supports all 60+ DNS record types provided by InterServer API, organized into categories:

#### Basic Records
- **A**: IPv4 Address mapping
- **AAAA**: IPv6 Address mapping
- **CNAME**: Canonical name alias
- **NS**: Name server records

#### Mail Records
- **MX**: Mail exchange records
- **SPF**: Sender Policy Framework
- **DKIM**: DomainKeys Identified Mail
- **DMARC**: Domain-based Message Authentication

#### Security Records
- **CAA**: Certificate Authority Authorization
- **TLSA**: Transport Layer Security Authentication
- **SSHFP**: SSH Fingerprint records

#### Advanced Records
- **SRV**: Service location records
- **TXT**: Text records for various purposes
- **PTR**: Pointer records for reverse DNS
- **LOC**: Location information

#### Legacy Records
- **HINFO**: Host information
- **MINFO**: Mailbox information
- **WKS**: Well-known services

### Error Handling and Fallback Mechanisms

#### API Error Handling

```javascript
try {
  const response = await interServerApi.addDnsRecord(domainId, recordData);
  return response;
} catch (error) {
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
```

#### Frontend Error Display

```javascript
onError: (error: any) => {
  toast({
    title: "Error",
    description: error.response?.data?.error || "Failed to add DNS record",
    variant: "destructive",
  });
}
```

### Rate Limiting and Best Practices

#### Request Throttling

- **Timeout**: 30 seconds per request
- **Retry Logic**: Automatic retry for transient failures
- **Batch Operations**: Grouped operations where possible

#### Best Practices

1. **Validate Locally First**: Perform client-side validation before API calls
2. **Handle Timeouts Gracefully**: Provide user feedback for long operations
3. **Cache Domain Lists**: Minimize repeated domain list requests
4. **Error Recovery**: Provide clear error messages and recovery options

---

## User Interface Documentation

### DNS Domains Management Page

#### Features
- **Domain Listing**: Displays all user domains with InterServer integration status
- **Add Domain**: Modal dialog for adding new domains with IP validation
- **Domain Actions**: Edit, delete, and manage records for each domain
- **Status Indicators**: Visual indicators for domain status and InterServer linking

#### Components Used
- `DataTable`: Sortable, searchable domain listing
- `AddDomainDialog`: Form for domain creation
- `Badge`: Status and InterServer ID display
- `Button`: Action buttons with hover states

#### User Workflow
1. User views domain list on page load
2. Clicks "Add Domain" to create new domain
3. Fills domain name and IP address
4. System validates and creates domain in InterServer
5. Domain appears in list with InterServer ID

### DNS Records Management Page

#### Features
- **Record Listing**: Real-time display of DNS records from InterServer
- **Add Record**: Comprehensive form with @ symbol notation support
- **Edit Record**: Pre-populated form with @ notation conversion
- **Delete Record**: Confirmation dialog with record details
- **Search and Filter**: Real-time record search by name or type

#### Record Display Logic
- Shows actual domain names (not @ notation)
- Displays record type with color-coded badges
- Shows TTL, priority, and status information
- Provides action buttons for edit/delete operations

#### Validation Messages and User Feedback

##### @ Symbol Validation Messages

**Valid Inputs (✅ Success)**
- `@` → "Valid root domain notation"
- `www.@` → "Valid subdomain notation"
- `mail@` → "Valid subdomain notation"

**Invalid Inputs (❌ Error Messages)**
- `www2.@.invalid` → "Invalid @ symbol placement. Use 'subdomain.@' or 'subdomain@' format."
- `@invalid` → "@ symbol cannot be at the beginning. Use '@' for root domain or 'subdomain@' for subdomains."
- `test@@` → "Only one @ symbol is allowed per record name."

##### Record Type Validation

**Content Validation by Type**
- **A Record**: "IPv4 address (e.g., 192.168.1.1)"
- **AAAA Record**: "IPv6 address (e.g., 2001:db8::1)"
- **CNAME Record**: "Canonical name (e.g., example.com)"
- **MX Record**: "Mail server hostname (e.g., mail.example.com)"

##### TTL and Priority Validation

**TTL Validation**
- Range: 60-86400 seconds
- Error: "TTL must be between 60 seconds and 24 hours"

**Priority Validation (MX Records)**
- Range: 0-65535
- Error: "Priority must be between 0 and 65535"

### Add/Edit Record Dialogs

#### Add Record Dialog Features
- **Record Type Selection**: Grouped dropdown with 60+ types
- **@ Symbol Input**: User-friendly notation with real-time validation
- **Content Validation**: Type-specific validation with helpful placeholders
- **TTL Configuration**: Slider or input with common presets
- **Priority Field**: Conditional display for MX/SRV records

#### Edit Record Dialog Features
- **Pre-populated Fields**: Automatic form population from existing record
- **@ Notation Conversion**: Converts full domain names to @ notation for editing
- **Change Detection**: Highlights modified fields
- **Validation on Change**: Real-time validation as user types

#### Form Validation Flow

```javascript
// Real-time validation example
const recordSchema = z.object({
  name: z.string().refine((name) => validateRecordName(name), {
    message: 'Invalid record name format'
  }),
  type: z.enum(VALID_DNS_RECORD_TYPES),
  content: z.string().min(1, 'Record content is required'),
  ttl: z.number().min(60).max(86400),
  priority: z.number().min(0).max(65535).optional(),
});
```

---

## Configuration and Setup

### Environment Variables Required

#### Core Configuration

```bash
# Database Connection
DATABASE_URL=postgres://username:password@hostname:port/database

# Session Management
SESSION_SECRET=your_secure_random_string_here

# InterServer API Integration (Required for DNS)
INTERSERVER_API_KEY=your_interserver_api_key_here

# Optional: Custom InterServer API URL
INTERSERVER_API_URL=https://my.interserver.net/apiv2
```

#### Optional DNS Configuration

```bash
# White-labeled Nameserver Configuration
DNS_NS1=cdns.ns1.skyvps360.xyz
DNS_NS2=cdns.ns2.skyvps360.xyz
DNS_NS3=cdns.ns3.skyvps360.xyz

# Company Branding
COMPANY_NAME=SkyVPS360
FRONTEND_URL=https://skyvps360.xyz
```

### InterServer API Key Setup

#### Step 1: Obtain API Key

1. Log into your InterServer account at https://my.interserver.net
2. Navigate to API section in account settings
3. Generate new API key with DNS management permissions
4. Copy the API key securely

#### Step 2: Configure Environment

```bash
# Add to .env file
INTERSERVER_API_KEY=your_actual_api_key_here
```

#### Step 3: Verify Configuration

```bash
# Test API connectivity
npm run test:interserver-api
```

### White-labeled Nameserver Configuration

#### DNS Zone Setup

Configure your white-labeled nameservers to point to InterServer's infrastructure:

```dns
; White-labeled nameserver DNS records
cdns.ns1.skyvps360.xyz.    IN    A    208.73.210.202
cdns.ns2.skyvps360.xyz.    IN    A    208.73.210.203
cdns.ns3.skyvps360.xyz.    IN    A    208.73.210.204
```

#### SOA Record Configuration

Update SOA records to use white-labeled nameservers:

```dns
example.com.    IN    SOA    cdns.ns1.skyvps360.xyz. admin.skyvps360.xyz. (
    2024010101    ; Serial
    3600          ; Refresh
    1800          ; Retry
    604800        ; Expire
    86400         ; Minimum TTL
)
```

### Database Migration

#### Run DNS Tables Migration

```bash
# Using Node.js script
npm run migrate:dns

# Or using SQL directly
psql $DATABASE_URL -f migrations/add-dns-tables.sql
```

#### Verify Tables Created

```sql
-- Check tables exist
\dt dns_*

-- Verify structure
\d dns_domains
\d dns_records
```

### Troubleshooting Common Issues

#### Issue 1: InterServer API Authentication Failed

**Symptoms**: 401 Unauthorized errors
**Solution**:
1. Verify API key is correct
2. Check API key permissions include DNS management
3. Ensure API key is not expired

```bash
# Test API key
curl -H "X-API-KEY: your_key" https://my.interserver.net/apiv2/dns
```

#### Issue 2: DNS Records Not Displaying

**Symptoms**: Empty records list despite existing records
**Solution**:
1. Check domain has valid InterServer ID
2. Verify domain exists in InterServer system
3. Check API connectivity and permissions

#### Issue 3: @ Symbol Validation Errors

**Symptoms**: Valid @ notation rejected by frontend
**Solution**:
1. Ensure latest validation functions are deployed
2. Check browser console for JavaScript errors
3. Verify shared validation functions are imported correctly

#### Issue 4: White-labeled Nameservers Not Responding

**Symptoms**: DNS queries to white-labeled nameservers fail
**Solution**:
1. Verify nameserver DNS records point to InterServer IPs
2. Check nameserver configuration in domain registrar
3. Test with dig/nslookup tools

```bash
# Test nameserver resolution
dig @cdns.ns1.skyvps360.xyz example.com
nslookup example.com cdns.ns1.skyvps360.xyz
```

---

## Code Examples

### Backend Route Implementation

#### DNS Domain Creation Route

```javascript
// POST /api/dns/domains
router.post('/domains', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate input
    const domainSchema = z.object({
      name: z.string().min(1, 'Domain name is required'),
      ip: z.string().min(1, 'IP address is required')
    });

    const { name, ip } = domainSchema.parse(req.body);

    // Validate domain name and IP
    if (!InterServerApi.validateDomainName(name)) {
      return res.status(400).json({ error: 'Invalid domain name format' });
    }

    if (!InterServerApi.validateIpAddress(ip)) {
      return res.status(400).json({ error: 'Invalid IP address format' });
    }

    // Add domain to InterServer
    const interServerResult = await interServerApi.addDnsDomain(name, ip);
    const interserverId = interServerResult?.id || null;

    // Save to local database
    const [newDomain] = await db
      .insert(dnsDomains)
      .values({
        userId,
        name,
        status: 'active',
        interserverId: interserverId
      })
      .returning();

    res.status(201).json({
      domain: newDomain,
      message: 'Domain added successfully',
      interServerStatus: interserverId ? 'linked' : 'created_but_not_linked'
    });
  } catch (error) {
    console.error('Error adding DNS domain:', error);
    res.status(500).json({ error: 'Failed to add DNS domain' });
  }
});
```

#### DNS Record Addition Route

```javascript
// POST /api/dns/domains/:id/records
router.post('/domains/:id/records', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const domainId = parseInt(req.params.id);

    // Validate input with @ symbol support
    const recordSchema = z.object({
      name: z.string().refine((name) => validateRecordName(name), {
        message: 'Invalid record name format'
      }),
      type: z.enum(VALID_DNS_RECORD_TYPES),
      content: z.string().min(1, 'Record content is required'),
      ttl: z.number().min(60).max(86400).default(86400),
      priority: z.number().min(0).max(65535).default(0)
    });

    const recordData = recordSchema.parse(req.body);

    // Verify domain ownership
    const [domain] = await db
      .select()
      .from(dnsDomains)
      .where(and(
        eq(dnsDomains.id, domainId),
        eq(dnsDomains.userId, userId)
      ))
      .limit(1);

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Process record name (convert "@" notation to full domain name)
    const processedRecordName = processRecordName(recordData.name, domain.name);

    // Add record to InterServer
    const interServerResult = await interServerApi.addDnsRecord(domain.interserverId, {
      name: processedRecordName,
      type: recordData.type,
      content: recordData.content,
      ttl: recordData.ttl.toString(),
      prio: recordData.priority.toString(),
      disabled: '0',
      ordername: '',
      auth: '1'
    });

    res.status(201).json({
      message: 'DNS record added successfully to InterServer',
      interServerResult: interServerResult
    });
  } catch (error) {
    console.error('Error adding DNS record:', error);
    res.status(500).json({ error: 'Failed to add DNS record' });
  }
});
```

### Frontend Component Usage

#### DNS Records Table Component

```typescript
// DNS Records Management Page
export function DnsRecordsPage() {
  const { domainId } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch DNS records from InterServer API
  const { data: recordsData, isLoading, error } = useQuery({
    queryKey: ["dns-records", domainId],
    queryFn: () => getDnsRecords(parseInt(domainId!)),
    enabled: !!domainId && !isNaN(parseInt(domainId!)),
  });

  // Table columns configuration
  const columns = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (record: DnsRecord) => (
        <span className="font-mono text-sm">{record.name}</span>
      ),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: (record: DnsRecord) => (
        <Badge variant="outline">{record.type}</Badge>
      ),
    },
    {
      header: "Content",
      accessorKey: "content",
      cell: (record: DnsRecord) => (
        <span className="font-mono text-sm break-all">{record.content}</span>
      ),
    },
    {
      header: "Actions",
      cell: (record: DnsRecord) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditRecord(record)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteRecord(record.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>DNS Records ({recordsData?.records?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              data={recordsData?.records || []}
              columns={columns}
              isLoading={isLoading}
              enableSearch={true}
              searchKey="name"
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

#### Add Record Dialog Component

```typescript
// Add Record Dialog with @ Symbol Support
export function AddRecordDialog({
  open,
  onOpenChange,
  domainId,
  domainName,
  onSuccess
}: AddRecordDialogProps) {
  const { toast } = useToast();

  const form = useForm<RecordFormData>({
    resolver: zodResolver(recordSchema),
    defaultValues: {
      name: "",
      type: "A",
      content: "",
      ttl: 3600,
      priority: 0,
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: RecordFormData) => addDnsRecord(domainId, {
      name: data.name, // @ symbol notation supported
      type: data.type,
      content: data.content,
      ttl: data.ttl,
      priority: data.priority || 0,
    }),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "DNS record added successfully",
      });
      form.reset();
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to add DNS record",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add DNS Record</DialogTitle>
          <DialogDescription>
            Add a new DNS record for {domainName}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(addMutation.mutate)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Record Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="www"
                      {...field}
                      disabled={addMutation.isPending}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter '@' for root domain, 'subdomain.@' or 'subdomain@' for subdomains
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Additional form fields... */}

            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? "Adding..." : "Add Record"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### Validation Function Examples

#### Complete Record Name Validation

```typescript
// Comprehensive @ symbol validation
export function validateRecordName(name: string): boolean {
  // Allow "@" for root domain
  if (name === '@') return true;
  // Allow empty string for root domain
  if (name.trim() === '') return true;

  const trimmed = name.trim();

  // Allow @ symbol notation formats
  if (trimmed.includes('@')) {
    if (trimmed === '@') return true; // Root domain
    if (trimmed.endsWith('.@')) {
      // Format: "subdomain.@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -2);
      return validateSubdomainPart(subdomain);
    }
    if (trimmed.endsWith('@')) {
      // Format: "subdomain@" - validate the subdomain part
      const subdomain = trimmed.slice(0, -1);
      return validateSubdomainPart(subdomain);
    }
    return false; // Invalid @ symbol usage
  }

  // Regular subdomain validation
  return validateSubdomainPart(trimmed);
}

// Subdomain validation helper
function validateSubdomainPart(subdomain: string): boolean {
  if (!subdomain || subdomain.trim() === '') return false;

  const trimmed = subdomain.trim();

  // Basic validation: only alphanumeric, dots, and hyphens allowed
  if (!/^[a-zA-Z0-9.-]+$/.test(trimmed)) return false;

  // Cannot start or end with hyphen or dot
  if (trimmed.startsWith('-') || trimmed.endsWith('-') ||
      trimmed.startsWith('.') || trimmed.endsWith('.')) return false;

  // Cannot have consecutive dots
  if (trimmed.includes('..')) return false;

  // Each label (part between dots) must be valid
  const labels = trimmed.split('.');
  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (label.startsWith('-') || label.endsWith('-')) return false;
    if (!/^[a-zA-Z0-9-]+$/.test(label)) return false;
  }

  return true;
}
```

### API Request/Response Samples

#### Add Domain Request/Response

**Request:**
```http
POST /api/dns/domains
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "name": "example.com",
  "ip": "192.168.1.100"
}
```

**Response:**
```json
{
  "domain": {
    "id": 15,
    "userId": 1,
    "interserverId": 68,
    "name": "example.com",
    "status": "active",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  },
  "message": "Domain added successfully",
  "interServerStatus": "linked",
  "interServerResult": {
    "id": 68,
    "domain": "example.com"
  }
}
```

#### Add Record Request/Response

**Request:**
```http
POST /api/dns/domains/15/records
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "name": "www.@",
  "type": "A",
  "content": "192.168.1.100",
  "ttl": 3600,
  "priority": 0
}
```

**Response:**
```json
{
  "message": "DNS record added successfully to InterServer",
  "interServerResult": {
    "id": "473",
    "domain_id": "68",
    "name": "www.example.com",
    "type": "A",
    "content": "192.168.1.100",
    "ttl": "3600",
    "prio": "0",
    "disabled": "0"
  }
}
```

---

## Security Considerations

### Authentication Requirements

#### User Authentication
- **Session-based Authentication**: Secure session management with HTTP-only cookies
- **Route Protection**: All DNS endpoints require authenticated user sessions
- **User Isolation**: Users can only access their own domains and records

```javascript
// Authentication middleware
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};
```

#### Domain Ownership Verification

```javascript
// Verify domain ownership before operations
const [domain] = await db
  .select()
  .from(dnsDomains)
  .where(and(
    eq(dnsDomains.id, domainId),
    eq(dnsDomains.userId, userId) // Ensure user owns domain
  ))
  .limit(1);

if (!domain) {
  return res.status(404).json({ error: 'Domain not found' });
}
```

### Input Validation and Sanitization

#### Frontend Validation
- **Zod Schema Validation**: Type-safe validation with detailed error messages
- **Real-time Validation**: Immediate feedback as user types
- **XSS Prevention**: Input sanitization and output encoding

```typescript
// Comprehensive validation schema
const recordSchema = z.object({
  name: z.string().refine((name) => validateRecordName(name), {
    message: 'Invalid record name format'
  }),
  type: z.enum(VALID_DNS_RECORD_TYPES),
  content: z.string().min(1, 'Record content is required'),
  ttl: z.number().min(60).max(86400),
  priority: z.number().min(0).max(65535),
});
```

#### Backend Validation
- **Double Validation**: Server-side validation mirrors frontend validation
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM
- **Input Sanitization**: Trim and validate all user inputs

### API Key Protection

#### Environment Variable Security
```bash
# Secure API key storage
INTERSERVER_API_KEY=your_api_key_here

# Never commit API keys to version control
# Use .env files and .gitignore
```

#### API Key Validation
```javascript
// Middleware to check InterServer API configuration
const requireInterServerConfig = (req: Request, res: Response, next: Function) => {
  if (!interServerApi.isConfigured()) {
    return res.status(503).json({
      error: 'DNS service not configured',
      message: 'InterServer API key is not configured'
    });
  }
  next();
};
```

#### Request Security
- **HTTPS Only**: All API communications use HTTPS
- **API Key Headers**: Secure transmission via X-API-KEY header
- **Request Timeout**: 30-second timeout to prevent hanging requests

### User Permission Checks

#### Role-based Access Control
```javascript
// Future enhancement: Role-based permissions
const checkDnsPermission = (req: Request, res: Response, next: Function) => {
  const user = req.user;
  if (!user.permissions.includes('dns_management')) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};
```

#### Audit Logging
```javascript
// Log all DNS operations for security auditing
console.log(`DNS Operation: ${req.method} ${req.path}`, {
  userId: req.user.id,
  domainId: req.params.id,
  timestamp: new Date().toISOString(),
  ip: req.ip
});
```

### Data Protection

#### Sensitive Data Handling
- **No Password Storage**: DNS records don't contain sensitive authentication data
- **Minimal Data Retention**: Only essential domain metadata stored locally
- **Secure Transmission**: All data encrypted in transit via HTTPS

#### Database Security
- **Connection Encryption**: Encrypted database connections
- **Access Control**: Database user with minimal required permissions
- **Regular Backups**: Automated backups with encryption

### Security Best Practices

1. **Principle of Least Privilege**: Users only access their own resources
2. **Defense in Depth**: Multiple layers of validation and security
3. **Regular Updates**: Keep dependencies and API integrations updated
4. **Error Handling**: Don't expose sensitive information in error messages
5. **Rate Limiting**: Prevent abuse with request rate limiting
6. **Monitoring**: Log and monitor for suspicious activities

---

## Conclusion

The SkyPANEL DNS Management System provides a comprehensive, secure, and user-friendly solution for managing DNS records through InterServer's API. With its innovative @ symbol notation system, professional user interface, and robust security measures, it offers both convenience for users and reliability for administrators.

For additional support or questions about implementation, please refer to the InterServer API documentation or contact the development team.