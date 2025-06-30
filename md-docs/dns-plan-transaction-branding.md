# DNS Plan Transaction Branding System

## Overview

This document describes the comprehensive branding system implemented for DNS plan transactions, ensuring that all transaction descriptions, payment methods, and UI elements use the dynamically configured custom credits name instead of hardcoded "custom_credits" text.

## Problem Statement

Previously, DNS plan transactions (purchases, upgrades, downgrades) displayed hardcoded "custom_credits" text instead of the administrator-configured custom credits name (e.g., "Sky Credits", "Platform Credits"). This created an inconsistent user experience and poor branding.

## Solution Architecture

### Server-Side Implementation

#### Dynamic Custom Credits Name Retrieval
```javascript
// Helper function to get dynamic custom credits name
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

#### Transaction Description Generation
All DNS plan transactions now include the branded custom credits name:

**DNS Plan Purchase:**
```javascript
const customCreditsName = await getCustomCreditsName();
const transaction = {
  description: `DNS Plan Purchase: ${plan.name} using ${customCreditsName}`,
  paymentMethod: customCreditsName.toLowerCase().replace(/\s+/g, '_')
};
```

**DNS Plan Upgrade/Downgrade:**
```javascript
const customCreditsName = await getCustomCreditsName();
const transactionDescription = isUpgrade
  ? `DNS Plan Upgrade: ${currentPlan.name} → ${newPlan.name} using ${customCreditsName}`
  : `DNS Plan Downgrade: ${currentPlan.name} → ${newPlan.name} using ${customCreditsName}`;
```

### Client-Side Implementation

#### Transaction Description Formatting
```javascript
const formatTransactionDescription = (transaction) => {
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
const formatPaymentMethod = (paymentMethod) => {
  if (paymentMethod === 'custom_credits' || 
      paymentMethod?.includes('_credits') || 
      paymentMethod?.includes('credits')) {
    return brandingData?.custom_credits_name || 'Custom Credits';
  }
  return paymentMethod;
};
```

## Implementation Details

### Affected Endpoints

1. **DNS Plan Purchase** (`/api/dns-plans/purchase`)
   - Transaction description includes branded name
   - Payment method uses dynamic slug
   - Credit transaction audit trail updated

2. **DNS Plan Change** (`/api/dns-plans/change`)
   - Upgrade/downgrade descriptions include branded name
   - Payment method uses dynamic slug
   - Credit transaction records updated

3. **Custom Credits Purchase** (`/api/billing/custom-credits/add`)
   - Transaction description uses branded name
   - Consistent branding across all credit operations

### Affected UI Components

1. **Billing Page** (`/billing`)
   - Transaction table descriptions
   - Transaction type badges
   - Payment method display

2. **Transaction Detail Page** (`/billing/transactions/:id`)
   - Transaction descriptions
   - Payment method display
   - Transaction type formatting

3. **Admin Billing Page** (`/admin/billing`)
   - Transaction table
   - Payment method tooltips
   - Transaction type badges

4. **Admin User Edit Page** (`/admin/users/:id`)
   - Enhanced transaction table
   - Description formatting
   - Search functionality

## Transaction Types

### Supported Transaction Types
- `dns_plan_purchase` - DNS plan purchases
- `dns_plan_upgrade` - DNS plan upgrades
- `dns_plan_downgrade` - DNS plan downgrades
- `custom_credit` - Custom credit purchases
- `admin_credit_add` - Admin credit additions
- `admin_credit_remove` - Admin credit removals

### Transaction Type Display
Each transaction type has specific styling and branding:

```javascript
const getTransactionTypeDisplay = (type, brandingData) => {
  switch (type) {
    case 'dns_plan_purchase':
      return 'DNS Plan Purchase';
    case 'dns_plan_upgrade':
      return 'DNS Plan Upgrade';
    case 'dns_plan_downgrade':
      return 'DNS Plan Downgrade';
    case 'custom_credit':
      return brandingData?.custom_credits_name || 'Custom Credits';
    case 'admin_credit_add':
      return `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Addition`;
    case 'admin_credit_remove':
      return `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Removal`;
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
  }
};
```

## Configuration

### Admin Settings
The custom credits name is configured in the admin panel under:
- **Path**: `/admin/settings`
- **Tab**: Custom Credits
- **Field**: `custom_credits_name`
- **API Endpoint**: `/api/settings/branding`

### Branding Data Structure
```javascript
{
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_credits_name?: string;
  custom_credits_symbol?: string;
}
```

## Examples

### Before Implementation
- Transaction Description: "DNS Plan Upgrade: Basic → Premium using custom_credits"
- Payment Method: "custom_credits"
- Transaction Type: "dns_plan_upgrade"

### After Implementation
- Transaction Description: "DNS Plan Upgrade: Basic → Premium using Sky Credits"
- Payment Method: "Sky Credits"
- Transaction Type: "DNS Plan Upgrade"

## Testing

### Test Cases
1. **DNS Plan Purchase**
   - Verify transaction description includes branded name
   - Verify payment method displays branded name
   - Verify transaction appears correctly in all UI components

2. **DNS Plan Upgrade**
   - Verify upgrade description includes branded name
   - Verify payment method uses branded name
   - Verify transaction type badge displays correctly

3. **DNS Plan Downgrade**
   - Verify downgrade description includes branded name
   - Verify refund transaction shows branded name
   - Verify transaction history displays correctly

4. **Admin Configuration**
   - Change custom credits name in admin settings
   - Verify new transactions use updated name
   - Verify existing transactions display with new name

### Manual Testing Steps
1. Configure custom credits name in admin settings
2. Purchase a DNS plan
3. Upgrade/downgrade DNS plan
4. Check transaction displays in:
   - Client billing page
   - Transaction detail pages
   - Admin billing dashboard
   - Admin user edit pages

## Troubleshooting

### Common Issues

**Issue**: Transactions still show "custom_credits"
**Solution**: Clear browser cache and verify branding data is being fetched correctly

**Issue**: Payment method not displaying branded name
**Solution**: Check that the payment method formatting logic includes the new conditions

**Issue**: Admin panel not showing updated names
**Solution**: Verify that the admin components are fetching fresh branding data

### Debug Information
- Check browser console for branding data fetch errors
- Verify API responses include correct `custom_credits_name`
- Confirm transaction records in database have correct descriptions
- Test with different custom credits names to ensure dynamic updates

## Future Enhancements

1. **Real-time Updates**: Implement WebSocket updates for immediate branding changes
2. **Internationalization**: Add support for multiple languages
3. **Custom Symbols**: Extend branding to include custom credit symbols
4. **Theme Integration**: Integrate with broader theme customization system
