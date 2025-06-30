# DNS Plan Real-time Updates and Domain Selection Implementation

## Overview

This document describes the implementation of real-time UI updates and domain selection functionality for DNS plan upgrades/downgrades in SkyPANEL.

## Issues Addressed

### Issue 1: Real-time UI Updates Missing
- **Problem**: When clients upgraded or downgraded DNS plans, the `/dns` page did not live update plan usage statistics
- **Problem**: The "Add Domain" button state did not refresh to reflect new plan limits
- **Solution**: Implemented comprehensive React Query cache invalidation

### Issue 2: Domain Selection for Downgrades
- **Problem**: When clients downgraded to plans with fewer domain slots, excess domains were not handled
- **Solution**: Implemented domain selection modal with atomic transaction support

## Implementation Details

### 1. Real-time UI Updates

#### Frontend Changes (`client/src/pages/dns-plans-page.tsx`)

```typescript
// Enhanced query invalidation in changePlanMutation.onSuccess
queryClient.invalidateQueries({ queryKey: ["/api/dns-plans/subscriptions"] });
queryClient.invalidateQueries({ queryKey: ["/api/billing/balance"] });
queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });

// CRITICAL: Added DNS domain and plan limit queries for real-time UI updates
queryClient.invalidateQueries({ queryKey: ["dns-plan-limits"] });
queryClient.invalidateQueries({ queryKey: ["dns-domains"] });
```

**Impact**: 
- DNS domains page (`/dns`) now automatically refreshes domain counts and limits
- "Add Domain" button state updates immediately after plan changes
- Plan usage statistics reflect changes in real-time

### 2. Domain Selection Modal

#### New Component (`client/src/components/dns/DomainSelectionModal.tsx`)

**Features**:
- **Visual Domain Selection**: Interactive checkboxes for domain selection
- **Validation**: Ensures exactly the right number of domains are selected
- **Preview**: Shows which domains will be removed with record counts
- **Warning System**: Clear messaging about consequences of domain removal
- **Responsive Design**: Handles large domain lists with scrolling

**Key Props**:
```typescript
interface DomainSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedDomainIds: number[]) => void;
  currentPlanName: string;
  newPlanName: string;
  currentDomainLimit: number;
  newDomainLimit: number;
  isLoading?: boolean;
}
```

#### Enhanced Plan Change Logic

**Downgrade Detection**:
```typescript
const isDowngrade = targetPlan.maxDomains < currentPlan.maxDomains;

if (isDowngrade) {
  const domainsResponse = await getDnsDomains();
  const currentDomainCount = domainsResponse.domains?.length || 0;
  
  if (currentDomainCount > targetPlan.maxDomains) {
    // Show domain selection modal
    setDomainSelectionModal({ ... });
    return;
  }
}
```

### 3. Backend API Enhancements

#### Updated Plan Change Endpoint (`server/routes_new.ts`)

**New Parameters**:
```typescript
const { planId, selectedDomainIds } = req.body;
```

**Domain Removal Logic**:
```typescript
// Handle domain removal for downgrades
if (isDowngrade && newPlan.maxDomains < currentPlan.maxDomains) {
  const userDomains = await tx.select()
    .from(dnsDomainsTable)
    .where(eq(dnsDomainsTable.userId, userId));

  if (currentDomainCount > newPlan.maxDomains) {
    if (!selectedDomainIds || selectedDomainIds.length !== newPlan.maxDomains) {
      throw new Error(`Domain selection required. Please select exactly ${newPlan.maxDomains} domain(s) to keep.`);
    }

    // Validate domain ownership
    const validSelectedDomains = userDomains.filter(domain => selectedDomainIds.includes(domain.id));
    if (validSelectedDomains.length !== selectedDomainIds.length) {
      throw new Error("Invalid domain selection. Some domains don't belong to your account.");
    }

    // Remove unselected domains
    const domainsToRemove = userDomains.filter(domain => !selectedDomainIds.includes(domain.id));
    
    for (const domain of domainsToRemove) {
      // Remove from InterServer
      if (domain.interserverId) {
        await interServerApi.deleteDnsDomain(domain.interserverId);
      }
      
      // Remove from local database
      await tx.delete(dnsDomainsTable)
        .where(eq(dnsDomainsTable.id, domain.id));
    }
  }
}
```

## Security & Data Integrity

### Atomic Transactions
- All domain removals happen within the same database transaction as plan changes
- If any step fails, the entire operation is rolled back
- Ensures data consistency between plan limits and actual domain counts

### Validation
- **Domain Ownership**: Validates that all selected domains belong to the user
- **Count Validation**: Ensures exactly the right number of domains are selected
- **Plan Validation**: Confirms the target plan exists and is active

### Error Handling
- **InterServer API Failures**: Continues with local cleanup even if InterServer removal fails
- **Partial Failures**: Logs errors for individual domain removals but continues with others
- **User Feedback**: Clear error messages for validation failures

## User Experience Improvements

### Visual Feedback
- **Loading States**: Shows processing status during plan changes
- **Progress Indicators**: Clear indication of what's happening
- **Success Messages**: Detailed confirmation including domains removed

### Domain Selection UX
- **Smart Defaults**: "Select First N" button for quick selection
- **Visual Indicators**: Green highlighting for selected domains, red X for domains to be removed
- **Record Count Display**: Shows how many DNS records will be lost with each domain
- **Cancellation**: Easy way to cancel the downgrade if user changes mind

## Testing Scenarios

### Successful Downgrade with Domain Selection
1. User has 10 domains on Pro plan (10 domain limit)
2. User downgrades to Basic plan (5 domain limit)
3. Modal appears asking to select 5 domains to keep
4. User selects 5 domains and confirms
5. System removes 5 unselected domains from InterServer and local database
6. Plan change completes successfully
7. UI updates immediately to reflect new limits

### Edge Cases Handled
- **No Domain Removal Needed**: Downgrade where user has fewer domains than new limit
- **Equal Domain Counts**: User has exactly the new plan's domain limit
- **InterServer API Failures**: Graceful handling of external API issues
- **Invalid Selections**: Proper validation and error messages

## Future Enhancements

### Potential Improvements
1. **Bulk Domain Export**: Allow users to export DNS records before removal
2. **Domain Transfer**: Option to transfer domains to another account
3. **Temporary Suspension**: Suspend domains instead of immediate deletion
4. **Backup Integration**: Automatic backup of DNS records before removal

### Performance Optimizations
1. **Lazy Loading**: Load domain details only when modal opens
2. **Pagination**: Handle large domain lists more efficiently
3. **Caching**: Cache domain data for faster modal loading

## Deployment Notes

### Database Changes
- No schema changes required
- Existing tables and relationships used

### API Compatibility
- Backward compatible - `selectedDomainIds` parameter is optional
- Existing upgrade flows continue to work unchanged

### Configuration
- No additional environment variables required
- Uses existing InterServer API configuration

This implementation provides a complete solution for real-time DNS plan management with proper domain handling for downgrades, ensuring data integrity and excellent user experience.
