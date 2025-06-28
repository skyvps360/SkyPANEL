# Custom Credit System

## Overview

The Custom Credit System is a comprehensive virtual currency solution that allows administrators to configure branded credits (e.g., "Sky Credits", "Platform Credits") for purchasing services, with full transaction management, admin controls, and PayPal integration.

## Core Features

### Dynamic Branding
- **Custom Names**: Administrator-configurable credit names
- **Branded Display**: Consistent branding across all UI components
- **Fallback Handling**: Graceful fallback to "Custom Credits" when not configured
- **Real-time Updates**: Dynamic updates when branding changes

### Credit Operations
- **Purchase**: Buy credits via PayPal integration
- **Admin Management**: Administrative credit addition/removal
- **Service Payments**: Use credits for DNS plans and other services
- **Balance Tracking**: Real-time balance updates and history

## Branding Configuration

### Admin Settings
Credits are configured in the admin panel:
- **Path**: `/admin/settings` → Custom Credits tab
- **Field**: `custom_credits_name`
- **API**: `/api/settings/branding`
- **Storage**: Database settings table

### Branding Data Structure
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

### Dynamic Name Retrieval
```javascript
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

## Transaction Management

### Transaction Types
- **`custom_credit`**: Credit purchases via PayPal
- **`admin_credit_add`**: Administrative credit additions
- **`admin_credit_remove`**: Administrative credit removals
- **`dns_plan_purchase`**: DNS plan purchases using credits
- **`dns_plan_upgrade`**: DNS plan upgrades using credits
- **`dns_plan_downgrade`**: DNS plan downgrades (credit refunds)

### Transaction Schema
```javascript
interface CreditTransaction {
  id: number;
  userId: number;
  amount: number;
  type: string;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  paymentId?: string;
  adminUserId?: number;
  adminReason?: string;
  balanceBefore: number;
  balanceAfter: number;
  metadata?: any;
  createdAt: string;
}
```

### Balance Management
```javascript
const updateUserBalance = async (userId, amount, transaction) => {
  const currentBalance = await getUserBalance(userId);
  const newBalance = currentBalance + amount;
  
  // Update user balance
  await db.update(usersTable)
    .set({ customCreditsBalance: newBalance })
    .where(eq(usersTable.id, userId));
  
  // Record transaction
  await db.insert(creditTransactionsTable).values({
    ...transaction,
    balanceBefore: currentBalance,
    balanceAfter: newBalance
  });
  
  return newBalance;
};
```

## PayPal Integration

### Credit Purchase Flow
```javascript
const purchaseCredits = async (amount, paypalOrderId) => {
  // Verify PayPal payment
  const paypalVerification = await verifyPayPalPayment(paypalOrderId);
  
  if (paypalVerification.status === 'COMPLETED') {
    const customCreditsName = await getCustomCreditsName();
    
    // Create transaction
    const transaction = {
      userId: userId,
      amount: amount,
      type: 'custom_credit',
      description: `${customCreditsName} Purchase via PayPal`,
      status: 'completed',
      paymentMethod: 'paypal',
      paymentId: paypalOrderId
    };
    
    return await updateUserBalance(userId, amount, transaction);
  }
};
```

### PayPal Configuration
```javascript
const paypalConfig = {
  clientId: process.env.PAYPAL_CLIENT_ID,
  clientSecret: process.env.PAYPAL_CLIENT_SECRET,
  environment: process.env.NODE_ENV === 'production' ? 'live' : 'sandbox',
  currency: 'USD'
};
```

## Admin Management Interface

### Admin Credit Operations
Administrators can add or remove credits with reasons:

```javascript
// Add Credits
const addAdminCredits = async (userId, amount, reason, adminUserId) => {
  const customCreditsName = await getCustomCreditsName();
  
  const transaction = {
    userId: userId,
    amount: amount,
    type: 'admin_credit_add',
    description: `Admin ${customCreditsName} Addition: ${reason}`,
    status: 'completed',
    paymentMethod: customCreditsName.toLowerCase().replace(/\s+/g, '_'),
    adminUserId: adminUserId,
    adminReason: reason
  };
  
  return await updateUserBalance(userId, amount, transaction);
};

// Remove Credits
const removeAdminCredits = async (userId, amount, reason, adminUserId) => {
  const customCreditsName = await getCustomCreditsName();
  
  const transaction = {
    userId: userId,
    amount: -amount,
    type: 'admin_credit_remove',
    description: `Admin ${customCreditsName} Removal: ${reason}`,
    status: 'completed',
    paymentMethod: customCreditsName.toLowerCase().replace(/\s+/g, '_'),
    adminUserId: adminUserId,
    adminReason: reason
  };
  
  return await updateUserBalance(userId, -amount, transaction);
};
```

### Admin Interface Components
- **Balance Display**: Current user balance with branded name
- **Add Credits Form**: Amount and reason input
- **Remove Credits Form**: Amount and reason input
- **Transaction History**: Enhanced table with search and pagination
- **Bulk Operations**: Mass credit operations for multiple users

## User Interface Integration

### Balance Display
```javascript
const CreditBalance = ({ balance, brandingData }) => (
  <div className="flex items-center space-x-2">
    <span className="text-lg font-semibold">
      ${balance?.toFixed(2) || '0.00'}
    </span>
    <span className="text-sm text-muted-foreground">
      {brandingData?.custom_credits_name || 'Custom Credits'}
    </span>
  </div>
);
```

### Transaction Display
```javascript
const TransactionItem = ({ transaction, brandingData }) => {
  const description = transaction.description.replace(
    /custom_credits/g, 
    brandingData?.custom_credits_name || 'Custom Credits'
  );
  
  return (
    <div className="transaction-item">
      <div className="description">{description}</div>
      <div className="amount">
        {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}
      </div>
    </div>
  );
};
```

### Purchase Interface
```javascript
const CreditPurchase = ({ brandingData }) => {
  const creditName = brandingData?.custom_credits_name || 'Custom Credits';
  
  return (
    <div className="credit-purchase">
      <h2>Purchase {creditName}</h2>
      <p>Add {creditName} to your account via PayPal</p>
      {/* PayPal integration components */}
    </div>
  );
};
```

## API Endpoints

### Credit Management
```javascript
// Get user balance
GET /api/billing/custom-credits/balance

// Purchase credits
POST /api/billing/custom-credits/add
{
  amount: number,
  paypalOrderId: string
}

// Admin add credits
POST /api/admin/users/:id/custom-credits/add
{
  amount: number,
  reason: string
}

// Admin remove credits
POST /api/admin/users/:id/custom-credits/remove
{
  amount: number,
  reason: string
}

// Get transaction history
GET /api/billing/custom-credits/transactions
```

### Branding Integration
```javascript
// Get branding settings
GET /api/settings/branding

// Update branding settings (admin only)
PUT /api/settings/branding
{
  custom_credits_name: string,
  custom_credits_symbol?: string
}
```

## Security Features

### Access Control
- **User Authentication**: JWT-based authentication required
- **Admin Permissions**: Admin-only endpoints protected
- **Rate Limiting**: Prevent abuse of credit operations
- **Input Validation**: Comprehensive input sanitization

### Transaction Security
- **PayPal Verification**: Server-side PayPal payment verification
- **Double-spend Prevention**: Transaction idempotency
- **Audit Logging**: Complete transaction audit trail
- **Balance Validation**: Prevent negative balances

### Data Protection
```javascript
const validateCreditOperation = (userId, amount, currentBalance) => {
  // Validate amount
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Validate sufficient balance for deductions
  if (amount < 0 && currentBalance + amount < 0) {
    throw new Error('Insufficient balance');
  }
  
  // Validate reasonable limits
  if (amount > 10000) {
    throw new Error('Amount exceeds maximum limit');
  }
  
  return true;
};
```

## Enhanced Transaction Table

### Features
- **Search**: Multi-field search across transaction data
- **Pagination**: Configurable page sizes (5, 10, 25, 50, 100)
- **Sorting**: Column-based sorting
- **Filtering**: Transaction type and status filtering
- **Export**: CSV/Excel export functionality
- **State Persistence**: URL-based state management

### Implementation
```javascript
const TransactionTable = ({ userId, brandingData }) => {
  const columns = [
    {
      accessorKey: "id",
      header: "ID",
      cell: (transaction) => `#${transaction.id}`
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: (transaction) => format(new Date(transaction.createdAt), 'MMM d, yyyy h:mm a')
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: (transaction) => {
        let description = transaction.description;
        if (description.includes('custom_credits')) {
          description = description.replace(/custom_credits/g, 
            brandingData?.custom_credits_name || 'Custom Credits');
        }
        return description;
      }
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: (transaction) => (
        <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
          {transaction.amount >= 0 ? '+' : ''}${transaction.amount.toFixed(2)}
        </span>
      )
    }
  ];
  
  return (
    <DataTable
      data={transactions}
      columns={columns}
      enableSearch={true}
      enablePagination={true}
      defaultPageSize={5}
    />
  );
};
```

## Performance Optimizations

### Caching Strategy
```javascript
// Balance caching
const { data: balance } = useQuery({
  queryKey: [`/api/billing/custom-credits/balance`],
  staleTime: 30 * 1000, // 30 seconds
  cacheTime: 5 * 60 * 1000 // 5 minutes
});

// Transaction caching
const { data: transactions } = useQuery({
  queryKey: [`/api/billing/custom-credits/transactions`],
  staleTime: 60 * 1000, // 1 minute
  cacheTime: 10 * 60 * 1000 // 10 minutes
});
```

### Database Optimizations
- **Indexed Queries**: Optimized indexes on userId, createdAt, type
- **Connection Pooling**: Efficient database connections
- **Batch Operations**: Bulk transaction processing
- **Query Optimization**: Minimized N+1 queries

## Monitoring and Analytics

### Metrics Tracking
- **Credit Usage**: Track credit purchases and spending
- **Revenue Analytics**: Monitor PayPal revenue
- **User Behavior**: Credit usage patterns
- **System Performance**: Transaction processing times

### Logging
```javascript
const logCreditOperation = (operation, userId, amount, details) => {
  logger.info('Credit Operation', {
    operation,
    userId,
    amount,
    timestamp: new Date().toISOString(),
    details,
    source: 'custom-credit-system'
  });
};
```

## Error Handling

### Common Error Scenarios
```javascript
const errorHandlers = {
  INSUFFICIENT_BALANCE: 'Insufficient credit balance',
  PAYPAL_VERIFICATION_FAILED: 'PayPal payment verification failed',
  INVALID_AMOUNT: 'Invalid credit amount',
  USER_NOT_FOUND: 'User not found',
  TRANSACTION_FAILED: 'Transaction processing failed'
};
```

### Graceful Degradation
- **Offline Mode**: Cache balance for offline viewing
- **Retry Logic**: Automatic retry for failed transactions
- **User Feedback**: Clear error messages and recovery options
- **Fallback Systems**: Backup payment processing
