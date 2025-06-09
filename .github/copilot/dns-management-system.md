# SkyPANEL DNS Management System

## Overview

The DNS Management System provides a comprehensive white-labeled DNS management solution that integrates with InterServer's DNS API. Users can manage domains, create/edit/delete DNS records, and utilize the custom @ symbol notation for user-friendly domain management.

## Core Components

### API Integration

- **InterServer API Client**: Handles all communication with InterServer DNS API
- **Authentication**: Manages API keys and authentication headers
- **Request Formatting**: Properly formats requests according to API specifications
- **Response Parsing**: Processes API responses for use in the application

### Domain Management

- **Domain Registration**: Create and register domains through InterServer
- **Domain Listing**: Display and filter user's domains
- **Domain Validation**: Validate domain ownership and format
- **White-labeled Nameservers**: Support for custom branded nameservers

### Record Management

- **Record Creation**: Add DNS records with comprehensive validation
- **Record Editing**: Modify existing records with proper format conversions
- **Record Deletion**: Remove records with confirmation
- **Bulk Operations**: Perform actions on multiple records

### @ Symbol Notation System

- **Format Conversion**: Translates between user-friendly @ notation and FQDN format
- **Validation Rules**: Ensures proper format for InterServer API compatibility
- **Display Logic**: Shows user-friendly formats in the UI
- **Error Handling**: Provides helpful error messages for format issues

## Database Schema

```typescript
// DNS domains table
export const dnsDomainsTable = pgTable('dns_domains', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id),
  domain: text('domain').notNull(),
  interserverId: text('interserver_id'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// DNS records table - used for caching only
export const dnsRecordsTable = pgTable('dns_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  domainId: uuid('domain_id').notNull().references(() => dnsDomainsTable.id),
  recordId: text('record_id').notNull(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  ttl: integer('ttl').notNull(),
  priority: integer('priority'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

## API Endpoints

### Domain Management
- `GET /api/dns/domains` - Get all user domains
- `POST /api/dns/domains` - Create a new domain
- `GET /api/dns/domains/:id` - Get domain details
- `DELETE /api/dns/domains/:id` - Delete a domain

### Record Management
- `GET /api/dns/domains/:domainId/records` - Get all records for a domain
- `POST /api/dns/domains/:domainId/records` - Add a new record
- `PATCH /api/dns/domains/:domainId/records/:recordId` - Update a record
- `DELETE /api/dns/domains/:domainId/records/:recordId` - Delete a record

## Frontend Components

### Domain Management Page
```tsx
export function DnsDomainsPage() {
  const { data: domains, isLoading } = useQuery({
    queryKey: ['dns-domains'],
    queryFn: fetchUserDomains
  });

  // Domain listing with filtering and sorting
  return (
    <div>
      <PageHeader title="DNS Domains" action={{ label: "Add Domain", onClick: openAddDomainModal }} />
      
      {isLoading ? (
        <DomainListSkeleton />
      ) : domains?.length ? (
        <DomainTable domains={domains} />
      ) : (
        <EmptyState message="No domains found" />
      )}
      
      <AddDomainDialog />
    </div>
  );
}
```

### Record Management Page
```tsx
export function DnsRecordsPage({ domainId }: { domainId: string }) {
  const { data: domain } = useQuery({
    queryKey: ['dns-domain', domainId],
    queryFn: () => fetchDomainDetails(domainId)
  });
  
  const { data: records, isLoading } = useQuery({
    queryKey: ['dns-records', domainId],
    queryFn: () => fetchDomainRecords(domainId)
  });

  // Record management with @ notation display
  return (
    <div>
      <PageHeader 
        title={domain?.domain || 'DNS Records'} 
        action={{ label: "Add Record", onClick: openAddRecordModal }} 
      />
      
      {isLoading ? (
        <RecordListSkeleton />
      ) : records?.length ? (
        <RecordTable 
          records={records} 
          domain={domain?.domain || ''} 
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
        />
      ) : (
        <EmptyState message="No records found" />
      )}
      
      <AddRecordDialog domainId={domainId} domainName={domain?.domain} />
      {selectedRecord && (
        <EditRecordDialog record={selectedRecord} domainName={domain?.domain} />
      )}
    </div>
  );
}
```

## Common Usage Patterns

### Converting between @ notation and FQDN

```typescript
// Convert from FQDN to @ notation for display
const convertToAtNotation = (name: string, domain: string): string => {
  if (name === domain) {
    return '@';
  }
  if (name.endsWith(`.${domain}`)) {
    return name.slice(0, -domain.length - 1);
  }
  return name;
};

// Convert from @ notation to FQDN for API
const convertFromAtNotation = (name: string, domain: string): string => {
  if (name === '@') {
    return domain;
  }
  if (!name.includes('.')) {
    return `${name}.${domain}`;
  }
  return name;
};
```

### Validating DNS Records

```typescript
const validateRecord = (record: DnsRecordInput, domain: string): ValidationResult => {
  // Type-specific validation
  switch (record.type) {
    case 'A':
      return validateIpv4Record(record);
    case 'AAAA':
      return validateIpv6Record(record);
    case 'MX':
      return validateMxRecord(record);
    case 'CNAME':
      return validateCnameRecord(record, domain);
    // Additional validations for other record types
    default:
      return { isValid: true };
  }
};
```

### Handling InterServer API Errors

```typescript
try {
  const response = await interServerApi.createRecord(domainId, recordData);
  return response.data;
} catch (error) {
  if (error.response?.status === 400) {
    // Format-specific errors
    throw new Error(`Invalid record format: ${error.response.data.message}`);
  } else if (error.response?.status === 403) {
    // Authentication errors
    throw new Error('API authentication failed');
  } else if (error.response?.status === 404) {
    // Domain not found
    throw new Error('Domain not found on InterServer');
  } else {
    // General error
    throw new Error('Failed to create DNS record');
  }
}
```
