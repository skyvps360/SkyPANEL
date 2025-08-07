# DNS Record Filtering System

## Overview

SkyPANEL implements a DNS record filtering system to ensure that only user-created DNS records count toward DNS plan limits. When InterServer creates a domain, it automatically adds several default records that should not count against the user's allocated record quota.

**Important**: While system records don't count toward plan limits, users can still edit or delete them as needed for their domain management requirements.

## Default InterServer Records

When a domain is added through InterServer's API, the following default records are automatically created:

### Complete List of Default Records (8+ total)
1. **1 SOA Record** - Start of Authority record (required for all domains)
2. **3+ NS Records** - Nameserver records (replaced with SkyPANEL white-labeled nameservers)
3. **Multiple A Records** - IPv4 address records pointing to the provided IP:
   - Root domain A record (`domainname`)
   - Wildcard A record (`*.domainname`)
   - Localhost subdomain A record (`localhost.domainname`)
4. **Multiple MX Records** - Mail exchange records:
   - MX pointing to `mail.domainname`
   - MX pointing to the bare domain itself (`domainname`)

### Record Types Excluded from User Limits

The following record types and patterns are automatically excluded from user DNS plan limits:

- **SOA Records**: Always auto-created by InterServer, required for domain functionality
- **NS Records**: Auto-created and managed by the system (replaced with SkyPANEL nameservers)
- **Default A Records**:
  - Root domain A records (`domainname`)
  - Wildcard A records (`*.domainname`)
  - Localhost subdomain A records (`localhost.domainname`)
- **Default MX Records**:
  - MX records pointing to `mail.{domain}`
  - MX records pointing to the bare domain (`{domain}`)

## Implementation

### Utility Functions

The filtering logic is centralized in `shared/dns-record-utils.ts`:

```typescript
// Check if a record is a default InterServer record
isDefaultInterServerRecord(record: DnsRecord, domainName: string): boolean

// Filter out default records, return only user-created records
filterUserCreatedRecords(records: DnsRecord[], domainName: string): DnsRecord[]

// Count only user-created records
countUserCreatedRecords(records: DnsRecord[], domainName: string): number
```

### Usage in API Endpoints

#### DNS Record Creation Limit Check
When users try to add new DNS records (`POST /api/dns/domains/:id/records`), the system:

1. Fetches existing records from InterServer API
2. Filters out default records using `countUserCreatedRecords()`
3. Compares user-created record count against plan limits
4. Allows or denies the new record creation

#### DNS Plan Limits Display
The DNS plan limits endpoint (`GET /api/dns-plans/limits`) provides accurate usage statistics by:

1. Fetching all user domains
2. Getting records for each domain from InterServer API
3. Filtering out default records for each domain
4. Summing up total user-created records across all domains

## Frontend Integration

### Usage Statistics Display
The DNS domains page displays accurate usage statistics:

- **Domains**: Shows current domains vs. plan limit
- **DNS Records**: Shows total user-created records vs. plan limit (excluding default records)

### DNS Records Management
The DNS records page provides full management capabilities:

- **Visual Indicators**: System records are marked with blue "System" badges
- **Full Edit Access**: All records (system and user-created) can be edited
- **Full Delete Access**: All records (system and user-created) can be deleted
- **Clear Tooltips**: Hover text explains that system records don't count toward limits
- **Billing Transparency**: Users understand which records affect their plan usage

### User Experience
- System records are clearly identified but remain fully manageable
- Users can customize their DNS setup without restrictions
- Plan limits only apply to truly user-created records
- No confusion about what counts toward billing

### System Record Modifications
When users edit or delete system records:

- **Edited System Records**: Once modified, they remain excluded from plan limits (based on original pattern matching)
- **Deleted System Records**: Removal doesn't affect plan usage calculations
- **Domain Functionality**: Users are responsible for maintaining essential records (SOA, NS) for proper domain function
- **No Billing Impact**: Modifications to system records never count toward plan limits

## Benefits

1. **Fair Billing**: Users only pay for records they actually create
2. **Accurate Limits**: Plan limits reflect actual user capacity
3. **Transparent Usage**: Users see accurate usage statistics with system records clearly marked
4. **Full Control**: Users can edit or delete any record, including system-created ones
5. **Consistent Logic**: Same filtering logic used across all DNS-related endpoints

## Technical Notes

- Default record filtering is applied at the API level, not stored in the database
- Records are fetched fresh from InterServer API to ensure accuracy
- The filtering logic is domain-aware (e.g., MX record filtering uses domain name)
- Error handling ensures the system gracefully handles InterServer API failures

## Filtering Patterns

### Domain Name Normalization
The filtering system normalizes domain names by removing trailing dots to ensure consistent matching:
- `example.com.` → `example.com`
- `*.example.com.` → `*.example.com`

### A Record Patterns
Default A records are identified by these exact name patterns:
- **Root domain**: `example.com` (bare domain)
- **Wildcard**: `*.example.com` (catches all subdomains)
- **Localhost**: `localhost.example.com` (local development)

### MX Record Patterns
Default MX records are identified by these content patterns:
- **Mail subdomain**: Content pointing to `mail.example.com`
- **Bare domain**: Content pointing to `example.com` (domain itself)

## Testing the Filtering Logic

### Example Default Records for `example.com`
```
SOA    example.com.           ns1.interserver.net. admin.example.com. ...
NS     example.com.           ns1.interserver.net.
NS     example.com.           ns2.interserver.net.
NS     example.com.           ns3.interserver.net.
A      example.com.           192.168.1.100
A      *.example.com.         192.168.1.100
A      localhost.example.com. 192.168.1.100
MX     example.com.           10 mail.example.com.
MX     example.com.           20 example.com.
```

All of these records would be filtered out as system records and not count toward user limits.

### Example User-Created Records
```
A      www.example.com.       192.168.1.101
A      api.example.com.       192.168.1.102
CNAME  blog.example.com.      www.example.com.
TXT    example.com.           "v=spf1 include:_spf.google.com ~all"
```

These records would count toward user plan limits.

## Testing the Implementation

### Automated Test Script
Run the comprehensive test suite to validate filtering logic:

```bash
npx tsx scripts/test-dns-record-filtering.ts
```

This script tests:
- All default record patterns (SOA, NS, A, MX)
- Edge cases with trailing dots
- Domain name normalization
- User-created record identification

### Manual Testing with Real Domains
1. Create a test domain through the SkyPANEL interface
2. Check the backend logs for filtering statistics
3. Verify that system records are marked with "System" badges in the UI
4. Confirm that only user-created records count toward plan limits

### Production Monitoring
The system includes detailed logging for tracking filtered records:
- Development mode: Shows which specific records are filtered
- Production mode: Shows aggregate statistics per domain
- Plan limits endpoint: Logs total usage breakdown per user

## Implementation Status

### ✅ Completed Features
- [x] Comprehensive default record identification
- [x] SOA, NS, A (root/wildcard/localhost), MX filtering
- [x] Domain name normalization (trailing dot handling)
- [x] Frontend visual indicators for system records
- [x] Disabled edit/delete for system records
- [x] Accurate plan usage statistics
- [x] Automated test suite
- [x] Detailed logging and monitoring

### 🔄 Monitoring & Maintenance
- [ ] Track InterServer default record pattern changes
- [ ] Performance optimization with caching
- [ ] Admin dashboard for record filtering analytics
- [ ] Automated alerts for unexpected record patterns

## Future Considerations

- Monitor for changes in InterServer's default record creation patterns
- Consider caching record counts for performance optimization
- Add admin tools to view default vs. user-created record breakdowns
- Implement automated testing with actual InterServer domain creation
- Add logging to track filtered record patterns for analysis
- Create alerts for when new default record patterns are detected
