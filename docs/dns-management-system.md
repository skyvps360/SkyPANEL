# DNS Management System Documentation

## Overview

The SkyPANEL DNS Management System provides a comprehensive interface for creating, managing, and monitoring DNS domains and records. It allows users to manage their domain name configurations, add various types of DNS records, and track DNS propagation across the internet.

## Architecture

The DNS management system consists of several components:

1. **Frontend Components**:
   - DNS domains listing and management
   - DNS records editor
   - DNS propagation checker
   - DNS templates
   - DNS plans and billing integration

2. **Backend Services**:
   - DNS domain management service
   - DNS record validation and processing
   - DNS zone file generation
   - DNS propagation checking service
   - DNS billing integration

3. **External Integrations**:
   - Custom nameservers configuration
   - Third-party DNS propagation checking APIs
   - Billing system for DNS plan management

## DNS Management Flow

### Domain Management

1. **Domain Creation**:
   - User navigates to DNS management section
   - User selects "Add Domain" option
   - User enters domain name and selects DNS plan
   - System validates domain name format
   - System creates DNS zone configuration
   - Domain is added to user's account

2. **Domain Configuration**:
   - User can configure domain settings
   - Set default TTL (Time To Live)
   - Configure SOA (Start of Authority) record
   - Set primary and secondary nameservers
   - Enable/disable DNSSEC

3. **Domain Deletion**:
   - User selects domain to delete
   - System prompts for confirmation
   - System removes domain and all associated records
   - DNS zone is removed from nameservers

### Record Management

1. **Adding Records**:
   - User selects domain to manage
   - User chooses "Add Record" option
   - User selects record type (A, AAAA, CNAME, MX, TXT, etc.)
   - User enters record details (name, value, TTL, etc.)
   - System validates record format
   - Record is added to the domain

2. **Editing Records**:
   - User selects record to edit
   - User modifies record details
   - System validates changes
   - Record is updated in the domain

3. **Deleting Records**:
   - User selects record to delete
   - System prompts for confirmation
   - Record is removed from the domain

### DNS Propagation

1. **Propagation Checking**:
   - User can check DNS propagation status
   - System queries multiple DNS servers worldwide
   - System displays propagation status for each server
   - User can see estimated time for full propagation

2. **Zone File Management**:
   - System automatically generates zone files
   - Zone files are distributed to nameservers
   - Changes are tracked and versioned

## Implementation Details

### Frontend Components

#### DNS Domains Component (client/src/pages/dns-domains-page.tsx)

This component displays a list of the user's DNS domains with basic information and management options.

```typescript
// Simplified example
const DnsDomainsPage: React.FC = () => {
  const { data: domains, isLoading } = useQuery(['dns-domains'], fetchDnsDomains);

  return (
    <div>
      <h1>DNS Domains</h1>
      {isLoading ? (
        <Spinner />
      ) : (
        <div className="grid gap-4">
          {domains.map(domain => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      )}
      <Button onClick={handleAddDomain}>Add Domain</Button>
    </div>
  );
};
```

#### DNS Records Component (client/src/pages/dns-records-page.tsx)

This component displays and manages DNS records for a specific domain.

```typescript
// Simplified example
const DnsRecordsPage: React.FC = () => {
  const { id } = useParams();
  const { data: domain, isLoading } = useQuery(['dns-domain', id], () => fetchDnsDomain(id));
  const { data: records, isLoading: recordsLoading } = useQuery(['dns-records', id], () => fetchDnsRecords(id));

  return (
    <div>
      <h1>{domain?.name} - DNS Records</h1>
      {recordsLoading ? (
        <Spinner />
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <RecordItem key={record.id} record={record} onEdit={handleEditRecord} onDelete={handleDeleteRecord} />
          ))}
        </div>
      )}
      <Button onClick={handleAddRecord}>Add Record</Button>
    </div>
  );
};
```

#### DNS Record Editor Component

This component provides a form for adding and editing DNS records with validation.

### Backend Services

#### DNS Domain Service

This service handles DNS domain management operations.

Key functions:
- `createDomain(userId, domainData)`: Creates a new DNS domain
- `updateDomain(domainId, domainData)`: Updates domain settings
- `deleteDomain(domainId)`: Deletes a domain and its records
- `getDomains(userId)`: Retrieves domains for a specific user
- `getDomainDetails(domainId)`: Gets detailed information about a domain

#### DNS Record Service

This service handles DNS record management operations.

Key functions:
- `createRecord(domainId, recordData)`: Creates a new DNS record
- `updateRecord(recordId, recordData)`: Updates a DNS record
- `deleteRecord(recordId)`: Deletes a DNS record
- `getRecords(domainId)`: Retrieves records for a specific domain
- `validateRecord(recordType, recordData)`: Validates record format

#### DNS Propagation Service

This service handles DNS propagation checking.

Key functions:
- `checkPropagation(domainId, recordName, recordType)`: Checks DNS propagation
- `getNameservers(domainId)`: Gets nameservers for a domain
- `estimatePropagationTime(domain)`: Estimates time for full propagation

## DNS Record Types

The DNS management system supports various record types:

1. **A Record**: Maps a domain name to an IPv4 address
2. **AAAA Record**: Maps a domain name to an IPv6 address
3. **CNAME Record**: Creates an alias from one domain to another
4. **MX Record**: Specifies mail servers for the domain
5. **TXT Record**: Stores text information (SPF, DKIM, etc.)
6. **NS Record**: Delegates a subdomain to a set of nameservers
7. **SOA Record**: Specifies authoritative information about the domain
8. **SRV Record**: Specifies location of services (e.g., SIP, XMPP)
9. **CAA Record**: Specifies which certificate authorities can issue certificates
10. **PTR Record**: Maps an IP address to a domain name (reverse DNS)

## DNS Templates

The system provides pre-configured DNS templates for common scenarios:

1. **Basic Website**: Standard configuration for a website
2. **Email Configuration**: MX, SPF, DKIM, and DMARC records
3. **Google Workspace**: Records for Google Workspace integration
4. **Microsoft 365**: Records for Microsoft 365 integration
5. **Custom Templates**: User-defined templates for specific needs

## DNS Plans and Billing

The DNS management system integrates with the billing system through DNS plans:

1. **Free Plan**:
   - Limited number of domains (e.g., 1-3)
   - Limited number of records per domain
   - Basic record types only
   - Standard propagation time

2. **Standard Plan**:
   - Increased number of domains (e.g., 10-20)
   - Unlimited records per domain
   - All record types
   - Faster propagation time
   - DNS templates

3. **Professional Plan**:
   - Unlimited domains
   - Unlimited records
   - Priority propagation
   - Advanced features (DNSSEC, zone file import/export)
   - Custom TTL settings
   - API access

## Security Considerations

1. **Access Control**: DNS management actions are restricted to domain owners and administrators
2. **DNSSEC Support**: Optional DNSSEC implementation for enhanced security
3. **Validation**: All DNS records are validated for correct format and values
4. **Audit Logging**: All DNS changes are logged for security and troubleshooting
5. **Rate Limiting**: API requests for DNS management are rate-limited

## Configuration

DNS management configuration is stored in environment variables:

```
# DNS Configuration
DNS_NS1="cdns.ns1.example.com"
DNS_NS2="cdns.ns2.example.com"
DNS_NS3="cdns.ns3.example.com"
```

## Troubleshooting

### Common Issues

1. **Domain Addition Failures**:
   - Verify domain name format
   - Check for duplicate domains
   - Ensure user has sufficient permissions
   - Verify DNS plan limits

2. **Record Creation Issues**:
   - Check record format and values
   - Verify record limits for the domain
   - Ensure no conflicting records exist
   - Check for syntax errors in record values

3. **Propagation Problems**:
   - Allow sufficient time for propagation (up to 48 hours)
   - Verify nameserver configuration
   - Check for DNS caching issues
   - Verify zone file generation

## API Reference

### DNS Management Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/dns/domains` | GET | Gets user's domains | None | `{ domains: Domain[] }` |
| `/api/dns/domains` | POST | Creates a new domain | `{ name, plan }` | `{ domain, message }` |
| `/api/dns/domains/{id}` | GET | Gets domain details | None | `{ domain: DomainDetails }` |
| `/api/dns/domains/{id}` | PUT | Updates domain settings | `{ settings }` | `{ success, message }` |
| `/api/dns/domains/{id}` | DELETE | Deletes a domain | None | `{ success, message }` |
| `/api/dns/domains/{id}/records` | GET | Gets domain records | None | `{ records: Record[] }` |
| `/api/dns/domains/{id}/records` | POST | Creates a new record | `{ type, name, value, ttl }` | `{ record, message }` |
| `/api/dns/records/{id}` | PUT | Updates a record | `{ type, name, value, ttl }` | `{ success, message }` |
| `/api/dns/records/{id}` | DELETE | Deletes a record | None | `{ success, message }` |
| `/api/dns/propagation/{domain}/{name}/{type}` | GET | Checks propagation | None | `{ results: PropagationResult[] }` |
| `/api/dns/templates` | GET | Gets DNS templates | None | `{ templates: Template[] }` |
| `/api/dns/templates/{id}/apply/{domainId}` | POST | Applies template | None | `{ success, message }` |

### Admin DNS Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/admin/dns/domains` | GET | Gets all domains | None | `{ domains: Domain[] }` |
| `/api/admin/dns/plans` | GET | Gets DNS plans | None | `{ plans: DnsPlan[] }` |
| `/api/admin/dns/plans` | POST | Creates a DNS plan | `{ name, limits, price }` | `{ plan, message }` |
| `/api/admin/dns/nameservers` | GET | Gets nameservers | None | `{ nameservers: Nameserver[] }` |
| `/api/admin/dns/nameservers` | POST | Updates nameservers | `{ nameservers }` | `{ success, message }` |

## Data Models

### Domain Object

```typescript
interface Domain {
  id: string;
  userId: string;
  name: string;
  status: 'active' | 'pending' | 'suspended';
  plan: {
    id: string;
    name: string;
    recordLimit: number;
  };
  recordCount: number;
  nameservers: string[];
  createdAt: string;
  updatedAt: string;
}
```

### Record Object

```typescript
interface DnsRecord {
  id: string;
  domainId: string;
  type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SOA' | 'SRV' | 'CAA' | 'PTR';
  name: string;
  value: string;
  ttl: number;
  priority?: number; // For MX and SRV records
  createdAt: string;
  updatedAt: string;
}
```

### Propagation Result Object

```typescript
interface PropagationResult {
  server: string;
  location: string;
  status: 'propagated' | 'not-propagated' | 'error';
  value?: string;
  responseTime: number;
  checkedAt: string;
}
```

## Integration with Other Systems

The DNS management system integrates with several other SkyPANEL components:

1. **Billing System**: DNS plans are tied to billing for premium features
2. **Server Management**: Automatic DNS record creation for server IP addresses
3. **User Management**: DNS domains are associated with user accounts
4. **Notification System**: DNS changes and propagation events trigger notifications