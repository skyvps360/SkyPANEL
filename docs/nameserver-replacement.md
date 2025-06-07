# Automated DNS Nameserver Replacement System

## Overview

SkyPANEL automatically replaces InterServer's default nameservers with white-labeled SkyPANEL nameservers when domains are added through the DNS management interface.

## How It Works

When a domain is added via the SkyPANEL interface:

1. **Domain Creation**: Domain is created in InterServer DNS system
2. **Nameserver Detection**: System identifies InterServer's default NS records
3. **Automatic Replacement**: 
   - Deletes InterServer nameservers (`cdns1/2/3.interserver.net`)
   - Adds SkyPANEL nameservers (`cdns.ns1/2/3.skyvps360.xyz`)
4. **SOA Update**: Updates SOA record to use SkyPANEL nameserver and admin email

## White-labeled Nameservers

**SkyPANEL Nameservers:**
- `cdns.ns1.skyvps360.xyz`
- `cdns.ns2.skyvps360.xyz`
- `cdns.ns3.skyvps360.xyz`

**Replaced InterServer Nameservers:**
- `cdns1.interserver.net`
- `cdns2.interserver.net`
- `cdns3.interserver.net`

## Implementation

The replacement happens automatically in the DNS domain creation route (`server/routes/dns.ts`):

```typescript
// After domain creation
if (interserverId) {
  try {
    await replaceNameservers(interserverId, name);
    console.log(`Successfully replaced nameservers for domain ${name}`);
  } catch (nsError) {
    console.error(`Failed to replace nameservers for domain ${name}:`, nsError);
    // Continue anyway - domain was created successfully
  }
}
```

## SOA Record Updates

The SOA (Start of Authority) record is updated to reflect SkyPANEL branding:

- **Primary Nameserver**: Changed to `cdns.ns1.skyvps360.xyz`
- **Admin Email**: Changed to `admin.skyvps360.xyz`
- **Other SOA fields**: Preserved from original record

## Error Handling

The system is designed to be resilient:

- If nameserver replacement fails, the domain creation still succeeds
- Individual nameserver operations are wrapped in try-catch blocks
- Detailed logging helps with troubleshooting
- The system continues processing even if some operations fail

## Testing

Use the test script to verify functionality:

```bash
npx tsx scripts/test-nameserver-replacement.ts
```

This script will:
- List available domains
- Test nameserver replacement on the first domain
- Show before/after states
- Provide detailed logging of each operation

## Benefits

1. **Seamless White-labeling**: Clients see SkyPANEL nameservers instead of InterServer
2. **Automatic Process**: No manual intervention required
3. **Transparent Operation**: Happens behind the scenes during domain creation
4. **Maintains Functionality**: All DNS management features continue to work
5. **Professional Appearance**: Consistent branding across all DNS records

## Technical Notes

- Uses InterServer Management API for all DNS operations
- No local database storage of individual DNS records
- Preserves all existing DNS management functionality
- Compatible with all supported DNS record types
- Maintains TTL and other record settings
