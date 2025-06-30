# Transaction Branding Fixes

## Overview

This document details the comprehensive fixes implemented to replace hardcoded "custom_credits" text with dynamic branding variables throughout the SkyPANEL application, ensuring consistent branded experience across all transaction displays.

## Problem Statement

### Issues Identified
1. **Hardcoded Text**: Transaction descriptions contained "custom_credits" instead of branded names
2. **Inconsistent Display**: Payment methods showed "custom_credits" instead of branded names
3. **Poor User Experience**: Users saw generic text instead of their configured brand
4. **Admin Interface**: Admin panels displayed hardcoded text in transaction tables

### Examples of Issues
**Before Fix:**
- Transaction Description: "DNS Plan Upgrade: Basic → Premium using custom_credits"
- Payment Method: "custom_credits"
- Transaction Type: "custom_credit"

**After Fix:**
- Transaction Description: "DNS Plan Upgrade: Basic → Premium using Sky Credits"
- Payment Method: "Sky Credits"
- Transaction Type: "Sky Credits"

## Implementation Strategy

### Server-Side Fixes

#### Dynamic Custom Credits Name Retrieval
```javascript
// Helper function added to routes_new.ts
const getCustomCreditsName = async () => {
  try {
    const settings = await db.select()
      .from(settingsTable)
      .where(eq(settingsTable.key, 'custom_credits_name'))
      .limit(1);
    
    return settings[0]?.value || 'Custom Credits';
  } catch (error) {
    console.error('Error fetching custom credits name:', error);
    return 'Custom Credits';
  }
};
```

#### Transaction Description Updates
All DNS plan endpoints now use dynamic branding:

**DNS Plan Purchase:**
```javascript
// Before
description: `DNS Plan Purchase: ${plan.name} using custom_credits`

// After
const customCreditsName = await getCustomCreditsName();
description: `DNS Plan Purchase: ${plan.name} using ${customCreditsName}`
```

**DNS Plan Upgrade/Downgrade:**
```javascript
// Before
description: `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name} using custom_credits`

// After
const customCreditsName = await getCustomCreditsName();
description: `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name} using ${customCreditsName}`
```

#### Payment Method Generation
Dynamic payment method generation based on branding:

```javascript
// Before
paymentMethod: 'custom_credits'

// After
const customCreditsName = await getCustomCreditsName();
paymentMethod: customCreditsName.toLowerCase().replace(/\s+/g, '_')

// Examples:
// "Sky Credits" → "sky_credits"
// "Platform Credits" → "platform_credits"
// "Custom Credits" → "custom_credits"
```

### Client-Side Fixes

#### Transaction Description Formatting
```javascript
const formatTransactionDescription = (transaction, brandingData) => {
  let description = transaction.description;
  
  // Replace hardcoded "custom_credits" with branded name
  if (description && description.includes('custom_credits')) {
    description = description.replace(/custom_credits/g, 
      brandingData?.custom_credits_name || 'Custom Credits');
  }
  
  return description;
};
```

#### Payment Method Display
```javascript
const formatPaymentMethod = (paymentMethod, brandingData) => {
  if (paymentMethod === 'custom_credits' || 
      paymentMethod?.includes('_credits') || 
      paymentMethod?.includes('credits')) {
    return brandingData?.custom_credits_name || 'Custom Credits';
  }
  
  return paymentMethod ? 
    paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : 
    'N/A';
};
```

#### Transaction Type Badges
Enhanced transaction type display with branding:

```javascript
const getTransactionTypeBadge = (type, brandingData) => {
  const typeConfig = {
    'dns_plan_purchase': { 
      color: 'bg-purple-100 text-purple-700', 
      label: 'DNS Plan Purchase' 
    },
    'dns_plan_upgrade': { 
      color: 'bg-orange-100 text-orange-700', 
      label: 'DNS Plan Upgrade' 
    },
    'dns_plan_downgrade': { 
      color: 'bg-yellow-100 text-yellow-700', 
      label: 'DNS Plan Downgrade' 
    },
    'custom_credit': { 
      color: 'bg-green-100 text-green-700', 
      label: brandingData?.custom_credits_name || 'Custom Credits' 
    }
  };
  
  const config = typeConfig[type] || { 
    color: 'bg-gray-100 text-gray-700', 
    label: type.replace(/_/g, ' ') 
  };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};
```

## Files Modified

### Server-Side Changes

#### `server/routes_new.ts`
**DNS Plan Purchase Endpoint (`/api/dns-plans/purchase`):**
- Added dynamic custom credits name retrieval
- Updated transaction description to use branded name
- Updated payment method to use dynamic slug
- Updated credit transaction audit trail

**DNS Plan Change Endpoint (`/api/dns-plans/change`):**
- Added dynamic custom credits name retrieval
- Updated upgrade/downgrade descriptions
- Updated payment method generation
- Updated credit transaction records

**Custom Credits Purchase Endpoint (`/api/billing/custom-credits/add`):**
- Updated transaction description to use branded name
- Ensured consistent branding across credit operations

### Client-Side Changes

#### `client/src/pages/billing-page.tsx`
**Transaction Table:**
- Updated `formatTransactionDescription()` function
- Enhanced payment method display logic
- Added DNS plan transaction type badges
- Improved transaction type classification

**DataTable Integration:**
- Transaction descriptions use branded names
- Payment methods display branded names
- Transaction type badges show proper colors and labels

#### `client/src/pages/transaction-detail-page.tsx`
**Transaction Details:**
- Updated `formatTransactionDescription()` to accept branding data
- Enhanced payment method display
- Improved transaction type formatting

#### `client/src/pages/admin/billing-page.tsx`
**Admin Transaction Table:**
- Updated payment method display logic
- Enhanced transaction type tooltips
- Improved search functionality with branded terms

#### `client/src/pages/admin/user-edit-page.tsx`
**Enhanced Transaction Table:**
- Updated description cell renderer
- Added branded name replacement logic
- Improved transaction type display

## Branding Integration

### Branding Data Flow
```javascript
// 1. Fetch branding data
const { data: brandingData } = useQuery({
  queryKey: ['/api/settings/branding'],
});

// 2. Pass to formatting functions
const formattedDescription = formatTransactionDescription(transaction, brandingData);
const formattedPaymentMethod = formatPaymentMethod(transaction.paymentMethod, brandingData);

// 3. Display in UI
<div className="transaction-description">
  {formattedDescription}
</div>
<div className="payment-method">
  {formattedPaymentMethod}
</div>
```

### Fallback Handling
All formatting functions include fallback logic:

```javascript
const safeBrandingName = brandingData?.custom_credits_name || 'Custom Credits';
```

This ensures the application continues to function even if:
- Branding data fails to load
- Custom credits name is not configured
- API requests fail

## Testing Strategy

### Manual Testing Checklist
1. **Configure Custom Credits Name**
   - Set custom credits name in admin settings
   - Verify name appears in all transaction displays

2. **DNS Plan Operations**
   - Purchase DNS plan using custom credits
   - Upgrade DNS plan and verify transaction description
   - Downgrade DNS plan and verify refund description

3. **Transaction Display Verification**
   - Check client billing page transaction table
   - Verify transaction detail pages
   - Check admin billing dashboard
   - Verify admin user edit page transaction history

4. **Payment Method Display**
   - Verify payment methods show branded names
   - Check transaction type badges
   - Verify search functionality works with branded terms

### Automated Testing
```javascript
describe('Transaction Branding', () => {
  it('should replace custom_credits with branded name', () => {
    const transaction = {
      description: 'DNS Plan Purchase: Basic using custom_credits'
    };
    const brandingData = { custom_credits_name: 'Sky Credits' };
    
    const result = formatTransactionDescription(transaction, brandingData);
    expect(result).toBe('DNS Plan Purchase: Basic using Sky Credits');
  });
  
  it('should format payment method with branded name', () => {
    const brandingData = { custom_credits_name: 'Sky Credits' };
    
    const result = formatPaymentMethod('custom_credits', brandingData);
    expect(result).toBe('Sky Credits');
  });
});
```

## Performance Considerations

### Caching Strategy
- **Branding Data**: Cached for 10 minutes to reduce API calls
- **Transaction Data**: Cached with appropriate stale times
- **Formatted Strings**: Memoized to prevent recalculation

### Optimization Techniques
```javascript
// Memoized formatting function
const memoizedFormatDescription = useMemo(() => {
  return (transaction) => formatTransactionDescription(transaction, brandingData);
}, [brandingData]);

// Efficient string replacement
const replaceCustomCredits = (text, brandedName) => {
  return text.replace(/custom_credits/g, brandedName);
};
```

## Error Handling

### Graceful Degradation
```javascript
const safeFormatDescription = (transaction, brandingData) => {
  try {
    return formatTransactionDescription(transaction, brandingData);
  } catch (error) {
    console.error('Error formatting transaction description:', error);
    return transaction.description || 'Transaction';
  }
};
```

### Error Scenarios
1. **Branding Data Unavailable**: Fall back to "Custom Credits"
2. **Invalid Transaction Data**: Display safe fallback text
3. **API Failures**: Use cached branding data
4. **Network Issues**: Graceful degradation with default values

## Monitoring and Validation

### Success Metrics
- **Zero Hardcoded Text**: No "custom_credits" visible in UI
- **Consistent Branding**: All displays use configured brand name
- **User Satisfaction**: Improved brand consistency
- **Admin Efficiency**: Clear transaction management

### Validation Checks
```javascript
const validateBrandingImplementation = () => {
  // Check for hardcoded text in transaction descriptions
  const hardcodedInstances = findHardcodedText('custom_credits');
  
  // Verify branding data is being used
  const brandingUsage = checkBrandingDataUsage();
  
  // Validate fallback handling
  const fallbackTests = testFallbackScenarios();
  
  return {
    hardcodedInstances,
    brandingUsage,
    fallbackTests
  };
};
```

## Future Enhancements

### Planned Improvements
1. **Real-time Updates**: WebSocket-based branding updates
2. **Multi-language Support**: Internationalization for branded terms
3. **Custom Symbols**: Support for custom credit symbols
4. **Theme Integration**: Deeper integration with theme system

### Maintenance Considerations
1. **Regular Audits**: Periodic checks for hardcoded text
2. **Code Reviews**: Ensure new code uses branding system
3. **Testing Updates**: Keep tests current with branding changes
4. **Documentation**: Maintain up-to-date documentation

## Conclusion

The transaction branding fixes provide a comprehensive solution for consistent brand representation across all transaction displays in SkyPANEL. The implementation ensures:

- **Dynamic Branding**: All transaction text uses configured brand names
- **Consistent Experience**: Uniform branding across client and admin interfaces
- **Robust Fallbacks**: Graceful handling of missing or failed branding data
- **Performance Optimized**: Efficient caching and memoization strategies
- **Future-Proof**: Extensible architecture for additional branding features

This system significantly improves the user experience by providing a cohesive, branded interface that reflects the administrator's chosen custom credits name throughout the entire application.
