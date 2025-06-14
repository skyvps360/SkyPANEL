# Billing System Documentation

## Overview

The SkyPANEL Billing System provides comprehensive functionality for managing invoices, processing payments, and tracking financial transactions. It integrates with PayPal for secure payment processing and supports various billing models including one-time payments, recurring subscriptions, and usage-based billing.

## Architecture

The billing system consists of several components:

1. **Frontend Components**:
   - Billing overview page
   - Invoice listing and details
   - Payment processing interface
   - Transaction history
   - Credit management

2. **Backend Services**:
   - Billing service
   - PayPal integration
   - Invoice generation
   - Payment processing
   - Transaction recording

3. **External Integrations**:
   - PayPal API for payment processing
   - PDF generation for invoices
   - Email service for billing notifications

## Billing Flow

### Invoice Generation

1. System automatically generates invoices based on:
   - New service purchases
   - Recurring billing cycles
   - Usage-based charges
   - Manual admin-generated invoices

2. Invoice generation process:
   - Billing service identifies billable items
   - Calculates amounts based on pricing plans
   - Applies any applicable discounts or credits
   - Creates invoice record in database
   - Generates PDF invoice
   - Sends invoice notification to user

### Payment Processing

1. **PayPal Payment**:
   - User views invoice and clicks "Pay Now"
   - Frontend initializes PayPal payment flow
   - User completes payment through PayPal interface
   - PayPal sends confirmation to backend
   - Backend validates payment and marks invoice as paid
   - System records transaction and updates user credit

2. **Credit Balance Payment**:
   - User with available credit balance selects "Pay with Credit"
   - System verifies sufficient credit is available
   - Credit is deducted from user's balance
   - Invoice is marked as paid
   - Transaction is recorded

3. **Manual Payment Recording**:
   - Admin records payment received through other channels
   - Selects invoice and enters payment details
   - System marks invoice as paid
   - Transaction is recorded

### Recurring Billing

1. System identifies services due for renewal
2. Generates renewal invoices automatically
3. Attempts automatic payment if user has enabled it
4. Sends notifications for upcoming and completed renewals
5. Handles service suspension for non-payment

## Implementation Details

### Frontend Components

#### Billing Overview Component (client/src/pages/billing-page.tsx)

This component displays the user's billing summary, including current balance, upcoming invoices, and recent transactions.

```typescript
// Simplified example
const BillingPage: React.FC = () => {
  const { data: billingData, isLoading } = useQuery(['billing'], fetchBillingData);

  return (
    <div>
      <h1>Billing</h1>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <BillingOverview data={billingData.overview} />
          <InvoiceList invoices={billingData.invoices} />
          <TransactionHistory transactions={billingData.transactions} />
        </>
      )}
    </div>
  );
};
```

#### Invoice Detail Component (client/src/pages/transaction-detail-page.tsx)

This component displays detailed information about a specific invoice and provides payment options.

#### PayPal Integration Component

This component integrates with the PayPal JavaScript SDK to handle payment processing.

```typescript
// Simplified example
const PayPalButton: React.FC<{ amount: number, invoiceId: string }> = ({ amount, invoiceId }) => {
  const handleApprove = async (data, actions) => {
    // Process successful payment
    await markInvoicePaid(invoiceId, data.orderID);
    toast.success("Payment successful!");
  };

  return (
    <PayPalButtons
      createOrder={(data, actions) => {
        return actions.order.create({
          purchase_units: [
            {
              amount: {
                value: amount.toString(),
              },
              reference_id: invoiceId
            },
          ],
        });
      }}
      onApprove={handleApprove}
    />
  );
};
```

### Backend Services

#### Billing Service

This service handles invoice generation, payment processing, and billing-related operations.

Key functions:
- `generateInvoice(userId, items)`: Creates a new invoice
- `processPayment(invoiceId, paymentData)`: Processes a payment
- `recordTransaction(userId, amount, type)`: Records a financial transaction
- `calculateUserBalance(userId)`: Calculates a user's current balance
- `applyCredit(userId, amount)`: Applies credit to a user's account

#### PayPal Integration Service

This service handles integration with the PayPal API for payment processing.

Key functions:
- `createPayPalOrder(amount, invoiceId)`: Creates a PayPal order
- `capturePayPalPayment(orderId)`: Captures a completed PayPal payment
- `verifyPayPalWebhook(data, headers)`: Verifies PayPal webhook notifications

#### Invoice Generation Service

This service handles the generation of invoices and PDF documents.

Key functions:
- `createInvoicePdf(invoiceData)`: Generates a PDF invoice
- `emailInvoice(userId, invoiceId)`: Sends an invoice via email
- `scheduleRecurringInvoices()`: Schedules generation of recurring invoices

## Billing Models

The billing system supports multiple billing models:

1. **One-time Payments**:
   - Single payment for a specific service or product
   - No automatic renewal
   - Example: Setup fees, one-time services

2. **Recurring Subscriptions**:
   - Regular billing at fixed intervals (monthly, quarterly, annually)
   - Automatic renewal until cancelled
   - Example: Server hosting plans, DNS management packages

3. **Usage-based Billing**:
   - Charges based on actual resource usage
   - Billed at the end of each billing cycle
   - Example: Bandwidth overages, additional storage

4. **Credit System**:
   - Users can add funds to their account balance
   - Credit can be used for automatic payment of invoices
   - Refundable upon request (subject to terms)

## Security Considerations

1. **Payment Security**:
   - All payment processing is handled by PayPal
   - No credit card information is stored in SkyPANEL
   - Secure HTTPS connections for all payment-related operations

2. **Transaction Validation**:
   - All transactions are validated and recorded
   - Digital receipts are generated for all payments
   - Audit trail of all financial operations

3. **Access Control**:
   - Billing operations are restricted to account owners and administrators
   - Sensitive financial information is properly secured
   - Role-based access control for billing administration

## Configuration

Billing system configuration is stored in environment variables:

```
# PayPal Configuration
VITE_PAYPAL_SANDBOX=false
VITE_PAYPAL_SANDBOX_CLIENT_ID="sandbox-client-id"
VITE_PAYPAL_SANDBOX_SECRET="sandbox-secret"
VITE_PAYPAL_CLIENT_ID="production-client-id"
VITE_PAYPAL_SECRET="production-secret"
VITE_PAYPAL_CURRENCY="USD"
```

## Troubleshooting

### Common Issues

1. **Payment Processing Failures**:
   - Check PayPal API connectivity
   - Verify PayPal credentials in environment variables
   - Ensure correct PayPal environment is configured (sandbox vs. production)
   - Review PayPal transaction logs for detailed error information

2. **Invoice Generation Issues**:
   - Check database connectivity
   - Verify pricing configuration
   - Ensure PDF generation service is working
   - Check email service configuration for invoice delivery

3. **Recurring Billing Problems**:
   - Verify cron service is running properly
   - Check for failed previous payment attempts
   - Ensure user payment methods are valid and current
   - Review billing cycle configuration

## API Reference

### Billing Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/billing` | GET | Gets billing overview | None | `{ overview, invoices, transactions }` |
| `/api/billing/invoices` | GET | Gets user's invoices | None | `{ invoices: Invoice[] }` |
| `/api/billing/invoices/{id}` | GET | Gets invoice details | None | `{ invoice: InvoiceDetails }` |
| `/api/billing/invoices/{id}/pay` | POST | Processes payment | `{ paymentMethod, paymentData }` | `{ success, transaction }` |
| `/api/billing/invoices/{id}/pdf` | GET | Gets invoice PDF | None | PDF file |
| `/api/billing/transactions` | GET | Gets transaction history | None | `{ transactions: Transaction[] }` |
| `/api/billing/transactions/{id}` | GET | Gets transaction details | None | `{ transaction: TransactionDetails }` |
| `/api/billing/credit/add` | POST | Adds credit to account | `{ amount, paymentMethod }` | `{ success, balance }` |

### Admin Billing Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|--------------|----------|
| `/api/admin/billing/invoices` | GET | Gets all invoices | None | `{ invoices: Invoice[] }` |
| `/api/admin/billing/invoices/create` | POST | Creates manual invoice | `{ userId, items, dueDate }` | `{ invoice }` |
| `/api/admin/billing/invoices/{id}/mark-paid` | POST | Marks invoice as paid | `{ paymentMethod, notes }` | `{ success }` |
| `/api/admin/billing/users/{id}/credit` | POST | Adjusts user credit | `{ amount, reason }` | `{ success, balance }` |

## Data Models

### Invoice Object

```typescript
interface Invoice {
  id: string;
  userId: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  amount: number;
  currency: string;
  items: InvoiceItem[];
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  type: 'service' | 'product' | 'subscription' | 'usage' | 'credit' | 'other';
  serviceId?: string;
  servicePeriod?: {
    start: string;
    end: string;
  };
}
```

### Transaction Object

```typescript
interface Transaction {
  id: string;
  userId: string;
  invoiceId?: string;
  type: 'payment' | 'refund' | 'credit' | 'debit';
  amount: number;
  currency: string;
  paymentMethod: 'paypal' | 'credit' | 'manual' | 'other';
  status: 'completed' | 'pending' | 'failed';
  reference?: string;
  notes?: string;
  createdAt: string;
}
```

## Integration with Other Systems

The billing system integrates with several other SkyPANEL components:

1. **Server Management**: Server provisioning and management is tied to billing status
2. **User Management**: User accounts contain billing information and preferences
3. **Email System**: Billing notifications and invoices are sent via email
4. **Notification System**: Billing events trigger in-app notifications
5. **Admin Dashboard**: Financial metrics are displayed in the admin dashboard