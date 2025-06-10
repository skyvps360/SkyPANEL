# SkyPANEL Dual Billing System

## Overview
The Dual Billing System in SkyPANEL provides a comprehensive financial infrastructure that separates VirtFusion VPS services from other platform services. It combines VirtFusion token management with a custom credit system, providing flexible payment options through PayPal integration.

## Core Components

### VirtFusion Token Management
- **Purpose**: Exclusively for VPS services management
- **Storage**: External (VirtFusion infrastructure)
- **Exchange Rate**: 100 tokens = $1.00 USD
- **API Integration**: Complete VirtFusion API integration for token purchases and management
- **Transaction Tracking**: Synchronized with SkyPANEL transaction history

### Custom Credits System
- **Purpose**: DNS plans, dedicated servers, and other platform services
- **Storage**: Local database (user_credits table)
- **Exchange Rate**: 1:1 USD with configurable precision
- **Purchase Flow**: Direct PayPal integration
- **Admin Controls**: Comprehensive admin management interface for adding/removing credits

### PayPal Integration
- **Multiple Checkout Flows**: Separate integration for both billing systems
- **Transaction Verification**: Server-side validation of all payments
- **Webhook Handling**: For subscription management and payment notifications
- **Refund Processing**: Integrated refund capabilities for both systems

## Database Schema

```typescript
// User Credits (Custom Credits System)
export const userCreditsTable = pgTable('user_credits', {
  id: serial('id').primaryKey().notNull(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }).unique(),
  balance: real('balance').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Credit Transactions (Audit Trail)
export const creditTransactionsTable = pgTable('credit_transactions', {
  id: serial('id').primaryKey().notNull(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  amount: real('amount').notNull(),
  type: text('type').notNull(), // purchase, admin_add, admin_remove, service_purchase, etc.
  description: text('description'),
  status: text('status').notNull().default('completed'),
  paymentMethod: text('payment_method'),
  paymentId: text('payment_id'),
  adminUserId: integer('admin_user_id').references(() => usersTable.id),
  adminReason: text('admin_reason'),
  balanceBefore: real('balance_before').notNull(),
  balanceAfter: real('balance_after').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Integrated with existing transactions table for VirtFusion tokens
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

// DNS Plans pricing (uses Custom Credits)
export const dnsPlansTable = pgTable('dns_plans', {
  id: serial('id').primaryKey().notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: real('price').notNull(),
  domainLimit: integer('domain_limit').notNull(),
  recordLimit: integer('record_limit').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// DNS Plan Subscriptions
export const dnsPlanSubscriptionsTable = pgTable('dns_plan_subscriptions', {
  id: serial('id').primaryKey().notNull(),
  userId: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  planId: integer('plan_id').notNull().references(() => dnsPlansTable.id),
  status: text('status').notNull().default('active'),
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
  autoRenew: boolean('auto_renew').default(true).notNull(),
  lastRenewalDate: timestamp('last_renewal_date'),
  nextRenewalDate: timestamp('next_renewal_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
```

## API Endpoints

### Balance Management

```typescript
// Get user balance (both systems)
router.get('/api/billing/balance', authMiddleware, async (req, res) => {
  try {
    // Get VirtFusion token balance
    const virtFusionBalance = await virtFusionService.getUserBalance(req.user.id);
    
    // Get custom credit balance
    const customCreditBalance = await billingService.getCustomCreditBalance(req.user.id);
    
    return res.json({
      virtFusion: {
        balance: virtFusionBalance,
        formatted: formatVirtFusionTokens(virtFusionBalance)
      },
      customCredits: {
        balance: customCreditBalance,
        formatted: formatCurrency(customCreditBalance)
      }
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return res.status(500).json({ error: 'Failed to fetch balance' });
  }
});

// Add custom credits
router.post('/api/billing/custom-credits/add', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  
  try {
    // Validate amount
    if (!amount || amount < 1 || amount > 1000) {
      return res.status(400).json({ error: 'Invalid amount. Must be between $1 and $1000.' });
    }
    
    // Create PayPal order
    const order = await paypalService.createOrder(amount, 'Custom Credits Purchase');
    
    return res.json({ orderId: order.id });
  } catch (error) {
    console.error('Error creating order:', error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

// Capture PayPal payment for custom credits
router.post('/api/billing/custom-credits/capture', authMiddleware, async (req, res) => {
  const { orderId } = req.body;
  
  try {
    // Capture the payment
    const captureData = await paypalService.captureOrder(orderId);
    
    if (captureData.status === 'COMPLETED') {
      // Add credits to user account
      const amount = parseFloat(captureData.purchase_units[0].amount.value);
      await billingService.addCustomCredits(req.user.id, amount, 'purchase', orderId);
      
      return res.json({ success: true, amount });
    } else {
      return res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Error capturing payment:', error);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
});
```

### Admin Management

```typescript
// Admin: Get user custom credit balance
router.get('/api/admin/users/:id/custom-credits', adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id);
  
  try {
    const balance = await billingService.getCustomCreditBalance(userId);
    const transactions = await billingService.getCustomCreditTransactions(userId);
    
    return res.json({
      balance,
      formatted: formatCurrency(balance),
      transactions
    });
  } catch (error) {
    console.error('Error fetching user credits:', error);
    return res.status(500).json({ error: 'Failed to fetch user credits' });
  }
});

// Admin: Add custom credits
router.post('/api/admin/users/:id/custom-credits', adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount, reason } = req.body;
  
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    // Add credits with admin audit trail
    await billingService.addCustomCredits(
      userId,
      amount,
      'admin_add',
      null,
      {
        adminUserId: req.user.id,
        adminReason: reason
      }
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error adding credits:', error);
    return res.status(500).json({ error: 'Failed to add credits' });
  }
});

// Admin: Remove custom credits
router.delete('/api/admin/users/:id/custom-credits', adminMiddleware, async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount, reason } = req.body;
  
  try {
    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    // Check if user has sufficient balance
    const balance = await billingService.getCustomCreditBalance(userId);
    if (balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Remove credits with admin audit trail
    await billingService.removeCustomCredits(
      userId,
      amount,
      'admin_remove',
      {
        adminUserId: req.user.id,
        adminReason: reason
      }
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error removing credits:', error);
    return res.status(500).json({ error: 'Failed to remove credits' });
  }
});
```

## Frontend Implementation

### Billing Page Component

```tsx
// BillingPage.tsx
const BillingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'virtfusion' | 'customcredits' | 'transactions'>('virtfusion');
  const balanceQuery = useQuery({
    queryKey: ['balance'],
    queryFn: async () => {
      const response = await axios.get('/api/billing/balance');
      return response.data;
    }
  });
  
  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Billing & Credits</h1>
      
      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>VirtFusion Tokens</CardTitle>
            <CardDescription>For VPS services only</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {balanceQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                balanceQuery.data?.virtFusion.formatted || '0 Tokens'
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Custom Credits</CardTitle>
            <CardDescription>For DNS plans and other services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {balanceQuery.isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                balanceQuery.data?.customCredits.formatted || '$0.00'
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as any)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="virtfusion">VirtFusion Tokens</TabsTrigger>
          <TabsTrigger value="customcredits">Custom Credits</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="virtfusion">
          <VirtFusionTokensTab />
        </TabsContent>
        
        <TabsContent value="customcredits">
          <CustomCreditsTab />
        </TabsContent>
        
        <TabsContent value="transactions">
          <TransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Custom Credits Purchase Flow

```tsx
// CustomCreditsTab.tsx
const CustomCreditsTab: React.FC = () => {
  const [amount, setAmount] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  
  // Handle purchase initiation
  const handlePurchase = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/billing/custom-credits/add', { amount });
      setPaypalOrderId(response.data.orderId);
    } catch (error) {
      toast.error('Failed to create purchase order');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle successful PayPal payment
  const handlePayPalApprove = async (data: any) => {
    try {
      await axios.post('/api/billing/custom-credits/capture', {
        orderId: data.orderID
      });
      
      toast.success(`Added $${amount} in custom credits to your account`);
      setPaypalOrderId(null);
      queryClient.invalidateQueries({ queryKey: ['balance'] });
    } catch (error) {
      toast.error('Failed to process payment');
      console.error(error);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-6 border">
        <h3 className="text-xl font-semibold mb-4">Add Custom Credits</h3>
        
        {paypalOrderId ? (
          <div className="space-y-4">
            <p>Complete your purchase with PayPal:</p>
            <PayPalButtons
              createOrder={() => Promise.resolve(paypalOrderId)}
              onApprove={handlePayPalApprove}
              style={{ layout: 'horizontal', color: 'blue', shape: 'rect', label: 'pay' }}
            />
            <Button
              variant="outline"
              onClick={() => setPaypalOrderId(null)}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <Label htmlFor="amount">Amount ($1 - $1000)</Label>
                <div className="flex items-center mt-2">
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    max={1000}
                    value={amount}
                    onChange={(e) => setAmount(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 25, 50].map((preset) => (
                  <Button
                    key={preset}
                    variant={amount === preset ? 'default' : 'outline'}
                    onClick={() => setAmount(preset)}
                    className="w-full"
                  >
                    ${preset}
                  </Button>
                ))}
              </div>
            </div>
            
            <Button
              onClick={handlePurchase}
              disabled={amount < 1 || amount > 1000 || isSubmitting}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>Purchase ${amount.toFixed(2)} in Credits</>
              )}
            </Button>
          </>
        )}
      </div>
      
      <div className="bg-card rounded-lg p-6 border">
        <h3 className="text-xl font-semibold mb-4">Custom Credits Usage</h3>
        <p>Custom Credits can be used for:</p>
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li>DNS Plans (Basic: $5, Pro: $15, Enterprise: $50)</li>
          <li>Dedicated Servers</li>
          <li>Additional Services</li>
        </ul>
      </div>
    </div>
  );
};
```

## Common Patterns

### Credit Operations

```typescript
// Adding custom credits (server-side)
export async function addCustomCredits(
  userId: number,
  amount: number,
  type: string,
  paymentId?: string | null,
  metadata?: Record<string, any>
): Promise<void> {
  // Use transaction to ensure data integrity
  await db.transaction(async (tx) => {
    // Get current balance
    const userCredit = await tx.query.userCreditsTable.findFirst({
      where: eq(userCreditsTable.userId, userId)
    });
    
    const currentBalance = userCredit?.balance || 0;
    const newBalance = currentBalance + amount;
    
    // Create or update user balance
    if (userCredit) {
      await tx
        .update(userCreditsTable)
        .set({
          balance: newBalance,
          updatedAt: new Date()
        })
        .where(eq(userCreditsTable.userId, userId));
    } else {
      await tx.insert(userCreditsTable).values({
        userId,
        balance: amount,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Create transaction record
    await tx.insert(creditTransactionsTable).values({
      userId,
      amount,
      type,
      status: 'completed',
      paymentMethod: paymentId ? 'paypal' : 'admin',
      paymentId,
      adminUserId: metadata?.adminUserId,
      adminReason: metadata?.adminReason,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      metadata: metadata || null,
      createdAt: new Date()
    });
  });
}

// Using custom credits for a service
export async function useCustomCredits(
  userId: number,
  amount: number,
  serviceType: string,
  serviceId: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  let success = false;
  
  await db.transaction(async (tx) => {
    // Get current balance
    const userCredit = await tx.query.userCreditsTable.findFirst({
      where: eq(userCreditsTable.userId, userId)
    });
    
    if (!userCredit || userCredit.balance < amount) {
      // Insufficient balance
      return false;
    }
    
    const currentBalance = userCredit.balance;
    const newBalance = currentBalance - amount;
    
    // Update balance
    await tx
      .update(userCreditsTable)
      .set({
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(userCreditsTable.userId, userId));
    
    // Create transaction record
    await tx.insert(creditTransactionsTable).values({
      userId,
      amount: -amount,
      type: `service_purchase_${serviceType}`,
      status: 'completed',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      metadata: {
        ...metadata,
        serviceId
      },
      createdAt: new Date()
    });
    
    success = true;
  });
  
  return success;
}
```

### Security Considerations

```typescript
// Validate transaction requests
function validateTransactionRequest(req: Request, res: Response, next: NextFunction) {
  const schema = z.object({
    amount: z.number().positive().max(1000),
    reason: z.string().optional()
  });
  
  const result = schema.safeParse(req.body);
  
  if (!result.success) {
    return res.status(400).json({
      error: 'Invalid request data',
      details: result.error.errors
    });
  }
  
  next();
}

// Admin authorization middleware
function adminBillingMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.roles.includes('admin')) {
    return res.status(403).json({
      error: 'Unauthorized: Admin access required'
    });
  }
  
  next();
}

// Atomic database operations
async function safeBalanceUpdate(userId: number, amount: number): Promise<boolean> {
  return db.transaction(async (tx) => {
    // Lock the row for update
    const userCredit = await tx.query.userCreditsTable.findFirst({
      where: eq(userCreditsTable.userId, userId),
      lock: 'pessimistic'
    });
    
    if (!userCredit) {
      return false;
    }
    
    const newBalance = userCredit.balance + amount;
    
    // Prevent negative balance
    if (newBalance < 0) {
      return false;
    }
    
    await tx
      .update(userCreditsTable)
      .set({
        balance: newBalance,
        updatedAt: new Date()
      })
      .where(eq(userCreditsTable.userId, userId));
    
    return true;
  });
}
```

## Integration with DNS Plans

```typescript
// Purchase DNS plan with custom credits
export async function purchaseDnsPlan(
  userId: number,
  planId: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get plan details
    const plan = await db.query.dnsPlansTable.findFirst({
      where: eq(dnsPlansTable.id, planId)
    });
    
    if (!plan || !plan.isActive) {
      return { success: false, error: 'Plan not available' };
    }
    
    // Check for existing subscription
    const existingSubscription = await db.query.dnsPlanSubscriptionsTable.findFirst({
      where: and(
        eq(dnsPlanSubscriptionsTable.userId, userId),
        eq(dnsPlanSubscriptionsTable.status, 'active')
      )
    });
    
    if (existingSubscription) {
      return { success: false, error: 'User already has an active subscription' };
    }
    
    // Use custom credits
    const success = await billingService.useCustomCredits(
      userId,
      plan.price,
      'dns_plan',
      plan.id.toString(),
      { planName: plan.name }
    );
    
    if (!success) {
      return { success: false, error: 'Insufficient balance' };
    }
    
    // Create subscription
    const nextRenewalDate = new Date();
    nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
    
    await db.insert(dnsPlanSubscriptionsTable).values({
      userId,
      planId,
      status: 'active',
      startDate: new Date(),
      autoRenew: true,
      nextRenewalDate,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error purchasing DNS plan:', error);
    return { success: false, error: 'Failed to process purchase' };
  }
}
```

## PayPal Integration

```typescript
// Initialize PayPal SDK
export function initializePayPal() {
  return {
    'client-id': process.env.PAYPAL_CLIENT_ID,
    currency: 'USD',
    intent: 'capture'
  };
}

// Create PayPal order
export async function createOrder(amount: number, description: string) {
  try {
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders`,
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: amount.toFixed(2)
            },
            description
          }
        ]
      },
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID!,
          password: process.env.PAYPAL_SECRET!
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('PayPal create order error:', error);
    throw new Error('Failed to create PayPal order');
  }
}

// Capture PayPal payment
export async function captureOrder(orderId: string) {
  try {
    const response = await axios.post(
      `${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        auth: {
          username: process.env.PAYPAL_CLIENT_ID!,
          password: process.env.PAYPAL_SECRET!
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('PayPal capture order error:', error);
    throw new Error('Failed to capture PayPal payment');
  }
}
```
