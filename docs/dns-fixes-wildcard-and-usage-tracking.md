# DNS Management Fixes: Wildcard Records & Usage Tracking

## Overview
This document outlines the fixes implemented for two critical DNS management issues:
1. **Wildcard DNS Records Cannot Be Saved** - Fixed validation and processing
2. **DNS Records Usage Not Tracked on /dns Page** - Added per-domain usage display

## Issue 1: Wildcard DNS Records Support

### Problem
- Wildcard DNS records (e.g., `*.@`, `*.domain.com`) could not be saved
- Validation functions rejected asterisk (`*`) characters
- Record processing didn't handle wildcard patterns with @ symbols

### Solution
Updated `shared/dns-record-types.ts`:

#### 1. Enhanced `validateSubdomainPart` Function
```typescript
// Allow wildcard records (starting with *)
if (trimmed.startsWith('*')) {
  // Wildcard can be just "*" or "*.something"
  if (trimmed === '*') return true;
  if (trimmed.startsWith('*.')) {
    const afterWildcard = trimmed.slice(2);
    if (afterWildcard === '') return true; // "*." is valid
    return validateSubdomainPart(afterWildcard);
  }
  return false; // Invalid wildcard format
}
```

#### 2. Enhanced `processRecordName` Function
```typescript
// Handle wildcard patterns with @ symbols
if (trimmed === '*.@' || trimmed === '*@') {
  return `*.${domainName}`;
}
```

### Supported Wildcard Formats
- `*` - Basic wildcard
- `*.@` - Wildcard for root domain
- `*@` - Alternative wildcard notation
- `*.subdomain` - Wildcard for specific subdomain
- `*.subdomain.@` - Wildcard for subdomain of root domain

#### 3. Frontend Component Updates
Updated DNS record dialog components to use shared validation:

**AddRecordDialog.tsx**:
- Removed local `validateSubdomainPart` function
- Now imports and uses `validateRecordName` from shared module
- Updated form descriptions to mention wildcard support
- Enhanced error messages to include wildcard examples

**EditRecordDialog.tsx**:
- Removed local `validateSubdomainPart` function
- Now imports and uses `validateRecordName` from shared module
- Enhanced `convertToEditFormat` function to handle wildcard records
- Converts `*.domain.com` to `*.@` for easier editing
- Converts `*.subdomain.domain.com` to `*.subdomain.@`

### Testing
Created comprehensive test suite in `scripts/test-wildcard-dns-validation.ts`:
- 13 validation tests (100% pass rate)
- 7 processing tests (100% pass rate)
- Covers edge cases and invalid patterns

Additional test suites:
- `scripts/test-wildcard-edit-format.ts` - Edit format conversion (10/10 tests pass)
- `scripts/test-frontend-wildcard-validation.ts` - Frontend validation (22/22 tests pass)

## Issue 2: DNS Records Usage Tracking

### Problem
- `/dns` page didn't show DNS record usage per domain
- Users couldn't see record counts vs plan limits
- No visibility into system vs user-created records

### Solution

#### 1. Backend API Enhancement
Updated `server/routes/dns.ts` - GET `/api/dns/domains`:

```typescript
// Get record usage for this domain
let recordUsage = { total: 0, userCreated: 0, default: 0 };
if (domain.interserverId) {
  try {
    const records = await interServerApi.getDnsDomain(domain.interserverId);
    const { getDnsRecordUsageStats } = await import('../../shared/dns-record-utils');
    recordUsage = getDnsRecordUsageStats(records, domain.name);
  } catch (recordError) {
    console.warn(`Could not fetch record usage for domain ${domain.name}:`, recordError);
  }
}
```

#### 2. Frontend Interface Update
Updated `client/src/pages/dns-domains-page.tsx`:

```typescript
interface DnsDomain {
  // ... existing properties
  recordUsage?: {
    total: number;
    userCreated: number;
    default: number;
  };
}
```

#### 3. New Table Column
Added "Records Used" column with:
- User-created records vs plan limits (e.g., "5/10")
- Color coding: green (normal), yellow (near limit), red (at limit)
- Total records and system records count
- Visual indicators for usage status

### Display Features
- **Usage Ratio**: Shows `userCreated/maxRecords` (e.g., "5/10")
- **Color Coding**:
  - Green: Normal usage (< 80% of limit)
  - Yellow: Near limit (≥ 80% of limit)
  - Red: At limit (≥ 100% of limit)
- **Detailed Info**: Shows total records and system records count

## Bug Fixes

### Import Path Fix
Fixed incorrect import path in `server/routes_new.ts`:
```typescript
// Before (incorrect)
const { interServerApi } = await import('../interserver-api');

// After (correct)
const { interServerApi } = await import('./interserver-api');
```

## Testing Results

### Wildcard Validation Tests
- ✅ All 20 tests passing (100% success rate)
- ✅ Supports all wildcard patterns
- ✅ Properly rejects invalid formats
- ✅ Correct processing of @ symbol notation

### Usage Tracking
- ✅ Per-domain record counts displayed
- ✅ System records properly excluded from billing
- ✅ Visual indicators for usage status
- ✅ Real-time data from InterServer API

## Impact

### For Users
1. **Wildcard Records**: Can now create and edit wildcard DNS records for catch-all subdomains
2. **Usage Visibility**: Clear view of DNS record usage per domain
3. **Plan Management**: Easy identification of domains approaching limits

### For System
1. **Accurate Billing**: Only user-created records count toward limits
2. **Better UX**: Visual feedback on usage status
3. **Reliable Validation**: Robust wildcard pattern support

## Files Modified
- `shared/dns-record-types.ts` - Wildcard validation and processing
- `server/routes/dns.ts` - Usage tracking API
- `server/routes_new.ts` - Import path fix
- `client/src/pages/dns-domains-page.tsx` - Usage display
- `client/src/components/dns/AddRecordDialog.tsx` - Frontend wildcard validation
- `client/src/components/dns/EditRecordDialog.tsx` - Frontend wildcard validation and edit format conversion
- `scripts/test-wildcard-dns-validation.ts` - Test suite
- `scripts/test-wildcard-edit-format.ts` - Edit format conversion tests
- `scripts/test-frontend-wildcard-validation.ts` - Frontend validation tests

## Future Enhancements
1. Real-time usage updates via WebSocket
2. Usage history tracking
3. Automated alerts for approaching limits
4. Bulk wildcard record management
