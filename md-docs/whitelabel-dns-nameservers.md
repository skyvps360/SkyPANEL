# White-Labeled DNS Nameserver Replacement

## Overview

The SkyPANEL DNS management system now includes automatic white-labeled nameserver replacement functionality. When users add new domains through the DNS management interface, the system automatically replaces default InterServer nameservers with SkyPANEL-branded equivalents, providing a seamless white-labeled DNS experience.

## Features

### Automatic Nameserver Replacement

When a domain is created, the system:

1. **Creates the domain** normally via the InterServer API
2. **Waits for DNS records** to be fully provisioned (2-second delay)
3. **Identifies default records** that need replacement:
   - NS records pointing to InterServer nameservers
   - SOA records containing InterServer nameserver references
4. **Replaces nameservers** with SkyPANEL-branded equivalents
5. **Provides detailed feedback** about the replacement process

### Nameserver Mappings

| InterServer Nameserver | SkyPANEL Nameserver |
|------------------------|---------------------|
| `cdns1.interserver.net` | `cdns.ns1.skyvps360.xyz` |
| `cdns2.interserver.net` | `cdns.ns2.skyvps360.xyz` |
| `cdns3.interserver.net` | `cdns.ns3.skyvps360.xyz` |

### SOA Record Updates

SOA (Start of Authority) records are automatically updated to use SkyPANEL nameservers for both:

- **Primary Nameserver**: `cdns.ns1.skyvps360.xyz` (replaces `cdns1.interserver.net`)
- **Administrative Contact**: `cdns.ns2.skyvps360.xyz` (replaces `dns.interserver.net`)

This ensures complete white-labeling of the SOA record with no InterServer references remaining.

## Implementation Details

### Backend Components

#### InterServer API Client (`server/interserver-api.ts`)

**New Methods:**

- `replaceNameserverRecords(domainId, domainName)` - Replaces nameserver records for a specific domain
- `addDnsDomainWithWhiteLabel(domain, ip)` - Enhanced domain creation with automatic nameserver replacement

**Configuration Constants:**

```typescript
export const SKYPANEL_NAMESERVERS = {
  NS1: 'cdns.ns1.skyvps360.xyz',
  NS2: 'cdns.ns2.skyvps360.xyz', 
  NS3: 'cdns.ns3.skyvps360.xyz'
} as const;

export const INTERSERVER_NAMESERVERS = {
  NS1: 'cdns1.interserver.net',
  NS2: 'cdns2.interserver.net',
  NS3: 'cdns3.interserver.net'
} as const;
```

#### DNS Routes (`server/routes/dns.ts`)

The domain creation endpoint (`POST /api/dns/domains`) now uses the enhanced `addDnsDomainWithWhiteLabel` method and provides detailed response information about the white-labeling process.

**Enhanced Response Format:**

```json
{
  "domain": { /* domain object */ },
  "message": "Domain created successfully with SkyPANEL nameservers (3 records replaced)",
  "interServerStatus": "linked",
  "whitelabelStatus": {
    "success": true,
    "nameserversReplaced": 3,
    "replacedRecords": [
      {
        "type": "NS",
        "old": "cdns1.interserver.net",
        "new": "cdns.ns1.skyvps360.xyz",
        "recordId": "12345"
      }
    ],
    "errors": []
  }
}
```

### Frontend Components

#### AddDomainDialog (`client/src/components/dns/AddDomainDialog.tsx`)

**Enhanced User Feedback:**

- Success messages indicate when nameservers are successfully replaced
- Partial success messages when domain is created but some nameserver replacement issues occur
- Clear error messages if the process fails

**Updated Dialog Description:**
The dialog now mentions that domains will be configured with "SkyPANEL-branded nameservers" instead of generic DNS records.

## User Experience

### Success Scenarios

1. **Full Success (HTTP 201):**
   - Domain created successfully
   - All nameserver records replaced
   - User sees: "Domain created successfully with SkyPANEL nameservers. Your domain is now using SkyPANEL nameservers."

2. **Partial Success (HTTP 206):**
   - Domain created successfully
   - Some nameserver records replaced, but issues with others
   - User sees: "Domain added successfully, but some nameserver records couldn't be replaced. X records were updated."

3. **Domain Created, No Nameserver Replacement:**
   - Domain created successfully
   - Nameserver replacement failed completely
   - User sees: "Domain added successfully, but nameserver replacement failed. You may need to manually update DNS records."

### Error Handling

The system includes comprehensive error handling:

- **API Authentication Errors:** Clear messages about InterServer API access
- **Domain Creation Failures:** Specific error messages from InterServer
- **Nameserver Replacement Failures:** Detailed logging and user feedback
- **Rollback Protection:** Domain creation succeeds even if nameserver replacement fails

## Testing

### Manual Testing

1. Navigate to DNS Domains page (`/dns/domains`)
2. Click "Add Domain"
3. Enter a test domain name and IP address
4. Submit the form
5. Verify the success message indicates nameserver replacement
6. Check the domain's DNS records to confirm SkyPANEL nameservers

### Automated Testing

Use the provided test script:

```bash
node scripts/test-whitelabel-nameservers.cjs
```

This script:
- Creates a test domain via InterServer API
- Analyzes default nameserver records
- Tests the nameserver replacement functionality
- Verifies the changes were applied correctly
- Cleans up the test domain

## Configuration

### Environment Variables

The system uses the existing `INTERSERVER_API_KEY` environment variable for API authentication.

### Nameserver Configuration

To modify the SkyPANEL nameservers, update the constants in `server/interserver-api.ts`:

```typescript
export const SKYPANEL_NAMESERVERS = {
  NS1: 'your.ns1.domain.com',
  NS2: 'your.ns2.domain.com', 
  NS3: 'your.ns3.domain.com'
} as const;
```

## Benefits

1. **Seamless White-Labeling:** Users see SkyPANEL branding instead of InterServer
2. **Automatic Process:** No manual intervention required
3. **Transparent Operation:** Users are informed about the nameserver replacement
4. **Robust Error Handling:** Domain creation succeeds even if nameserver replacement has issues
5. **Detailed Logging:** Comprehensive logging for troubleshooting
6. **Backward Compatibility:** Existing domains and functionality remain unchanged

## Technical Notes

- The system waits 2 seconds after domain creation before attempting nameserver replacement to ensure DNS records are fully provisioned
- Only NS and SOA records containing InterServer nameservers are modified
- The replacement process is non-destructive - if it fails, the domain remains functional with default nameservers
- All nameserver replacements are logged for audit purposes
- The system uses the existing InterServer API authentication and endpoints
