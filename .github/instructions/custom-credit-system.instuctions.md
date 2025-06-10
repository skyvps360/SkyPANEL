
# SkyPANEL Custom Credit System

## Overview
The Custom Credit System is a comprehensive virtual currency solution that allows administrators to configure branded credits (e.g., "Sky Credits", "Platform Credits") for purchasing services, with full transaction management, admin controls, and PayPal integration.

## Core Components

### Credit Configuration
- Dynamic branding with administrator-configurable credit names
- Branded display consistent throughout the UI
- Fallback handling to "Custom Credits" when not configured
- Real-time updates when branding changes

### Credit Operations
- Purchase credits via PayPal integration
- Administrative credit addition/removal
- Use credits for DNS plans and other services
- Real-time balance tracking and history

## Database Schema

```typescript
// Credit transaction table
export const transactionsTable = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  creditAmount: integer('credit_amount'),
  type: text('type').notNull(),
  status: text('status').notNull(),
  description: text('description'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  paypalOrderId: text('paypal_order_id'),
  virtFusionCreditId: text('virtfusion_credit_id')
});

// User balance
export const userBalanceTable = pgTable('user_balances', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => usersTable.id).unique(),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

## API Endpoints

### Credit Management
- `GET /api/credits/balance` - Get user's current credit balance
- `POST /api/credits/purchase` - Initiate credit purchase
- `GET /api/credits/transactions` - Get credit transaction history
- `POST /api/admin/credits/adjust` - Admin endpoint to adjust user credits

### Transaction Handling
- `POST /api/transactions/create` - Create a new transaction
- `GET /api/transactions/:id` - Get transaction details
- `PATCH /api/transactions/:id/status` - Update transaction status

## Frontend Components

### Credit Display
```tsx
export function CreditBalance({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['creditBalance', userId],
    queryFn: () => fetchCreditBalance(userId)
  });
  
  if (isLoading) return <Spinner />;
  
  return (
    <div className="flex items-center gap-2">
      <CreditIcon className="h-5 w-5" />
      <span className="font-medium">{data?.balance || 0}</span>
      <span className="text-muted-foreground">{data?.creditName || 'Credits'}</span>
    </div>
  );
}
```

### Purchase Credits Form
```tsx
export function PurchaseCreditsForm() {
  const [amount, setAmount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const result = await initiatePayPalPurchase(amount);
      // Handle PayPal redirect
      window.location.href = result.approvalUrl;
    } catch (error) {
      console.error('Purchase failed:', error);
      toast.error('Failed to initiate purchase');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form content */}
    </form>
  );
}
```

## Backend Service

```typescript
export class CreditService {
  async getUserBalance(userId: string) {
    const balance = await db.query.userBalanceTable.findFirst({
      where: eq(userBalanceTable.userId, userId)
    });
    
    return balance || { balance: 0 };
  }
  
  async addCredits(userId: string, amount: number, source: string, metadata?: any) {
    return await db.transaction(async (tx) => {
      // Create transaction record
      const transaction = await tx.insert(transactionsTable).values({
        userId,
        amount: amount.toString(),
        creditAmount: amount,
        type: 'credit_purchase',
        status: 'completed',
        description: `Added ${amount} credits via ${source}`,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();
      
      // Update user balance
      const userBalance = await tx.query.userBalanceTable.findFirst({
        where: eq(userBalanceTable.userId, userId)
      });
      
      if (userBalance) {
        await tx.update(userBalanceTable)
          .set({ 
            balance: userBalance.balance + amount,
            updatedAt: new Date()
          })
          .where(eq(userBalanceTable.userId, userId));
      } else {
        await tx.insert(userBalanceTable).values({
          userId,
          balance: amount
        });
      }
      
      return transaction[0];
    });
  }
  
  async deductCredits(userId: string, amount: number, reason: string, metadata?: any) {
    return await db.transaction(async (tx) => {
      const userBalance = await tx.query.userBalanceTable.findFirst({
        where: eq(userBalanceTable.userId, userId)
      });
      
      if (!userBalance || userBalance.balance < amount) {
        throw new Error('Insufficient credits');
      }
      
      // Create transaction record
      const transaction = await tx.insert(transactionsTable).values({
        userId,
        amount: (-amount).toString(),
        creditAmount: -amount,
        type: 'service_purchase',
        status: 'completed',
        description: reason,
        metadata: metadata ? JSON.stringify(metadata) : null
      }).returning();
      
      // Update user balance
      await tx.update(userBalanceTable)
        .set({ 
          balance: userBalance.balance - amount,
          updatedAt: new Date()
        })
        .where(eq(userBalanceTable.userId, userId));
      
      return transaction[0];
    });
  }
}
```

## Common Usage Patterns

### Checking if User Has Enough Credits
```typescript
const canPurchase = async (userId: string, requiredAmount: number): Promise<boolean> => {
  const creditService = new CreditService();
  const { balance } = await creditService.getUserBalance(userId);
  return balance >= requiredAmount;
};
```

### Processing a Service Purchase
```typescript
const purchaseService = async (userId: string, service: Service): Promise<Transaction> => {
  const creditService = new CreditService();
  
  // Check if user has enough credits
  const { balance } = await creditService.getUserBalance(userId);
  if (balance < service.price) {
    throw new Error('Insufficient credits');
  }
  
  // Deduct credits
  const transaction = await creditService.deductCredits(
    userId, 
    service.price, 
    `Purchase of ${service.name}`,
    { serviceId: service.id }
  );
  
  // Provision the service
  await serviceProvisioningService.provision(service.id, userId);
  
  return transaction;
};
```
