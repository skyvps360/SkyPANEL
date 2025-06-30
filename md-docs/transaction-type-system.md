# Transaction Type System

## Overview

This document describes the comprehensive transaction type system implemented in SkyPANEL, covering all transaction types, their classifications, display formatting, and branding integration.

## Transaction Types

### Core Transaction Types

#### VirtFusion Transactions
- **`virtfusion_credit`** - VirtFusion token purchases
- **`virtfusion_credit_removal`** - VirtFusion token removals
- **`virtfusion_deduction`** - VirtFusion token usage/deductions
- **`credit`** - Legacy VirtFusion credit transactions

#### Custom Credit Transactions
- **`custom_credit`** - Custom credit purchases via PayPal
- **`admin_credit_add`** - Administrative credit additions
- **`admin_credit_remove`** - Administrative credit removals

#### DNS Plan Transactions
- **`dns_plan_purchase`** - DNS plan purchases
- **`dns_plan_upgrade`** - DNS plan upgrades
- **`dns_plan_downgrade`** - DNS plan downgrades

#### Legacy Transactions
- **`debit`** - General debit transactions
- **`purchase`** - General purchase transactions

### Transaction Classification

#### Credit Transactions (Add Money/Credits)
```javascript
const isCreditTransaction = (transaction) => {
  return transaction.type === 'virtfusion_credit' ||
         transaction.type === 'custom_credit' ||
         transaction.type === 'admin_credit_add' ||
         transaction.type === 'dns_plan_downgrade' || // Refunds credits
         transaction.amount > 0;
};
```

#### Debit Transactions (Spend Money/Credits)
```javascript
const isDebitTransaction = (transaction) => {
  return transaction.type === 'debit' ||
         transaction.type === 'virtfusion_credit_removal' ||
         transaction.type === 'virtfusion_deduction' ||
         transaction.type === 'dns_plan_purchase' ||
         transaction.type === 'dns_plan_upgrade' ||
         transaction.type === 'admin_credit_remove' ||
         transaction.amount < 0;
};
```

### Display Formatting

#### Transaction Type Display Names
```javascript
const formatTransactionType = (transaction, brandingData) => {
  switch (transaction.type) {
    case 'virtfusion_credit':
      return 'VirtFusion Credit';
    case 'custom_credit':
      return brandingData?.custom_credits_name || 'Custom Credit';
    case 'credit':
      return 'VirtFusion Credit';
    case 'dns_plan_purchase':
      return 'DNS Plan Purchase';
    case 'dns_plan_upgrade':
      return 'DNS Plan Upgrade';
    case 'dns_plan_downgrade':
      return 'DNS Plan Downgrade';
    case 'admin_credit_add':
      return `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Addition`;
    case 'admin_credit_remove':
      return `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Removal`;
    default:
      return transaction.type.charAt(0).toUpperCase() + 
             transaction.type.slice(1).replace(/_/g, ' ');
  }
};
```

#### Transaction Type Badges
```javascript
const getTransactionTypeBadge = (type, brandingData) => {
  const badgeConfig = {
    'virtfusion_credit': { color: 'bg-blue-100 text-blue-700', label: 'VirtFusion Credit' },
    'custom_credit': { 
      color: 'bg-green-100 text-green-700', 
      label: brandingData?.custom_credits_name || 'Custom Credits' 
    },
    'dns_plan_purchase': { color: 'bg-purple-100 text-purple-700', label: 'DNS Plan Purchase' },
    'dns_plan_upgrade': { color: 'bg-orange-100 text-orange-700', label: 'DNS Plan Upgrade' },
    'dns_plan_downgrade': { color: 'bg-yellow-100 text-yellow-700', label: 'DNS Plan Downgrade' },
    'admin_credit_add': { 
      color: 'bg-green-100 text-green-700', 
      label: `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Addition` 
    },
    'admin_credit_remove': { 
      color: 'bg-red-100 text-red-700', 
      label: `Admin ${brandingData?.custom_credits_name || 'Custom Credit'} Removal` 
    }
  };

  const config = badgeConfig[type] || { 
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

### Transaction Description Formatting

#### Dynamic Description Processing
```javascript
const formatTransactionDescription = (transaction, brandingData) => {
  let description = transaction.description;

  // Replace hardcoded "custom_credits" with branded name
  if (description && description.includes('custom_credits')) {
    description = description.replace(/custom_credits/g, 
      brandingData?.custom_credits_name || 'Custom Credits');
  }

  // Handle specific transaction types
  switch (transaction.type) {
    case 'dns_plan_purchase':
      if (description.includes('DNS Plan Purchase:')) {
        return description; // Already formatted correctly
      }
      return `DNS Plan Purchase: ${extractPlanName(description)}`;
      
    case 'dns_plan_upgrade':
      if (description.includes('DNS Plan Upgrade:')) {
        return description; // Already formatted correctly
      }
      return `DNS Plan Upgrade: ${extractPlanTransition(description)}`;
      
    case 'dns_plan_downgrade':
      if (description.includes('DNS Plan Downgrade:')) {
        return description; // Already formatted correctly
      }
      return `DNS Plan Downgrade: ${extractPlanTransition(description)}`;
      
    default:
      return description;
  }
};
```

#### Helper Functions
```javascript
const extractPlanName = (description) => {
  const match = description.match(/DNS Plan Purchase: (.+)/);
  return match ? match[1] : 'Unknown Plan';
};

const extractPlanTransition = (description) => {
  const match = description.match(/(.+) → (.+)/);
  return match ? `${match[1]} → ${match[2]}` : 'Plan Change';
};
```

### Payment Method Integration

#### Payment Method Formatting
```javascript
const formatPaymentMethod = (paymentMethod, brandingData) => {
  // Handle custom credits payment methods
  if (paymentMethod === 'custom_credits' || 
      paymentMethod?.includes('_credits') || 
      paymentMethod?.includes('credits')) {
    return brandingData?.custom_credits_name || 'Custom Credits';
  }
  
  // Handle other payment methods
  switch (paymentMethod) {
    case 'paypal':
      return 'PayPal';
    case 'credit':
      return 'VirtFusion Credits';
    default:
      return paymentMethod ? 
        paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : 
        'N/A';
  }
};
```

#### Dynamic Payment Method Generation
```javascript
// Server-side payment method generation
const generatePaymentMethod = (customCreditsName) => {
  return customCreditsName.toLowerCase().replace(/\s+/g, '_');
};

// Examples:
// "Sky Credits" → "sky_credits"
// "Platform Credits" → "platform_credits"
// "Custom Credits" → "custom_credits"
```

### Branding Integration

#### Branding Data Structure
```javascript
interface BrandingData {
  company_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  custom_credits_name?: string;
  custom_credits_symbol?: string;
}
```

#### Branding Context Usage
```javascript
// Fetch branding data
const { data: brandingData } = useQuery({
  queryKey: ['/api/settings/branding'],
});

// Use in transaction formatting
const formattedType = formatTransactionType(transaction, brandingData);
const formattedDescription = formatTransactionDescription(transaction, brandingData);
const formattedPaymentMethod = formatPaymentMethod(transaction.paymentMethod, brandingData);
```

### Status Management

#### Transaction Status Types
- **`pending`** - Transaction initiated but not completed
- **`completed`** - Transaction successfully processed
- **`failed`** - Transaction failed to process
- **`cancelled`** - Transaction cancelled by user or system
- **`refunded`** - Transaction refunded

#### Status Display
```javascript
const getStatusBadge = (status) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
    case 'pending':
      return <Badge variant="outline">Pending</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    case 'cancelled':
      return <Badge variant="secondary">Cancelled</Badge>;
    case 'refunded':
      return <Badge variant="warning">Refunded</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};
```

### Amount Formatting

#### Amount Display Logic
```javascript
const formatTransactionAmount = (transaction) => {
  const isCredit = isCreditTransaction(transaction);
  const amount = Math.abs(transaction.amount);
  const sign = isCredit ? '+' : '-';
  const color = isCredit ? 'text-green-600' : 'text-red-600';
  
  return (
    <span className={`font-medium ${color}`}>
      {sign}${amount.toFixed(2)}
    </span>
  );
};
```

#### Currency Formatting
```javascript
const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};
```

### Search Integration

#### Transaction Type Search
```javascript
const searchByTransactionType = (transaction, query) => {
  const searchTerm = query.toLowerCase();
  const formattedType = formatTransactionType(transaction, brandingData);
  
  return transaction.type.toLowerCase().includes(searchTerm) ||
         formattedType.toLowerCase().includes(searchTerm);
};
```

#### Comprehensive Search Function
```javascript
const searchTransactions = (transaction, query, brandingData) => {
  const searchTerm = query.toLowerCase();
  
  return (
    // Basic fields
    transaction.id.toString().includes(searchTerm) ||
    transaction.amount.toString().includes(searchTerm) ||
    transaction.status.toLowerCase().includes(searchTerm) ||
    
    // Formatted fields
    formatTransactionType(transaction, brandingData).toLowerCase().includes(searchTerm) ||
    formatTransactionDescription(transaction, brandingData).toLowerCase().includes(searchTerm) ||
    formatPaymentMethod(transaction.paymentMethod, brandingData).toLowerCase().includes(searchTerm) ||
    
    // Date fields
    format(new Date(transaction.createdAt), 'MMM d, yyyy').toLowerCase().includes(searchTerm)
  );
};
```

### API Integration

#### Transaction Creation
```javascript
// Server-side transaction creation
const createTransaction = async (transactionData, brandingData) => {
  const customCreditsName = brandingData?.custom_credits_name || 'Custom Credits';
  
  const transaction = {
    ...transactionData,
    description: transactionData.description.replace(/custom_credits/g, customCreditsName),
    paymentMethod: generatePaymentMethod(customCreditsName)
  };
  
  return await db.insert(transactionsTable).values(transaction);
};
```

#### Transaction Retrieval
```javascript
// Client-side transaction fetching with formatting
const { data: transactions } = useQuery({
  queryKey: ['/api/transactions'],
  select: (data) => data.map(transaction => ({
    ...transaction,
    formattedType: formatTransactionType(transaction, brandingData),
    formattedDescription: formatTransactionDescription(transaction, brandingData),
    formattedPaymentMethod: formatPaymentMethod(transaction.paymentMethod, brandingData)
  }))
});
```

### Migration Considerations

#### Legacy Transaction Handling
```javascript
const migrateLegacyTransactions = (transactions, brandingData) => {
  return transactions.map(transaction => {
    // Update legacy transaction types
    if (transaction.type === 'credit' && transaction.paymentMethod === 'custom_credits') {
      transaction.type = 'custom_credit';
    }
    
    // Update legacy descriptions
    if (transaction.description.includes('custom_credits')) {
      transaction.description = transaction.description.replace(
        /custom_credits/g, 
        brandingData?.custom_credits_name || 'Custom Credits'
      );
    }
    
    return transaction;
  });
};
```

### Performance Considerations

#### Efficient Type Checking
```javascript
// Use Set for O(1) lookup performance
const CREDIT_TRANSACTION_TYPES = new Set([
  'virtfusion_credit',
  'custom_credit', 
  'admin_credit_add',
  'dns_plan_downgrade'
]);

const DEBIT_TRANSACTION_TYPES = new Set([
  'debit',
  'virtfusion_credit_removal',
  'virtfusion_deduction',
  'dns_plan_purchase',
  'dns_plan_upgrade',
  'admin_credit_remove'
]);

const isCreditTransaction = (transaction) => {
  return CREDIT_TRANSACTION_TYPES.has(transaction.type) || transaction.amount > 0;
};
```

#### Memoized Formatting
```javascript
const memoizedFormatTransactionType = useMemo(() => {
  return (transaction) => formatTransactionType(transaction, brandingData);
}, [brandingData]);
```
