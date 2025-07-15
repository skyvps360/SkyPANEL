# Dual Billing System Implementation

## Overview

SkyPANEL now implements a comprehensive dual billing system that separates VirtFusion VPS services from other platform services. This system maintains the existing VirtFusion integration while adding a new custom credit system for DNS plans, dedicated servers, and future services.

## System Architecture

### VirtFusion Tokens
- **Purpose**: Exclusively for VPS services
- **Management**: Via VirtFusion API
- **Storage**: External (VirtFusion infrastructure)
- **Exchange Rate**: 100 tokens = $1.00 USD
- **Payment**: PayPal integration

### Custom Credits
- **Purpose**: DNS plans, dedicated servers, and future services
- **Management**: SkyPANEL local system
- **Storage**: Local database
- **Exchange Rate**: 1:1 USD
- **Payment**: PayPal integration (separate from VirtFusion)

## Database Schema

### New Tables Created

#### `user_credits`
- Stores custom credit balances for each user
- Separate from VirtFusion token system
- Tracks balance in USD with real precision

#### `credit_transactions`
- Complete audit trail for all custom credit operations
- Tracks before/after balances for integrity
- Supports multiple transaction types (purchase, admin_add, admin_remove, etc.)
- Links to admin users for accountability

#### `dns_plans`
- Pricing structure for DNS service tiers
- Three default plans: Basic ($5), Pro ($15), Enterprise ($50)
- Configurable features and limits

#### `dns_plan_subscriptions`
- User subscription management for DNS plans
- Tracks subscription status, dates, and auto-renewal settings

## API Endpoints

### Enhanced Billing Endpoints

#### `GET /api/billing/balance`
- Returns both VirtFusion tokens AND custom credits
- Unified balance response for frontend

#### `POST /api/billing/custom-credits/add`
- PayPal integration for custom credit purchases
- Server-side payment verification
- Amount validation ($1-$1000 range)
- Transaction logging with audit trail

#### `GET /api/billing/custom-credits/transactions`
- Paginated transaction history
- Filtering and search capabilities

### Admin Management Endpoints

#### `GET /api/admin/users/:id/custom-credits`
- Admin view of user's custom credit balance and transactions
- Complete transaction history for audit purposes

#### `POST /api/admin/users/:id/custom-credits`
- Admin credit addition with reason tracking
- Audit trail with admin user identification
- Balance validation and integrity checks

#### `DELETE /api/admin/users/:id/custom-credits`
- Admin credit removal with confirmation
- Supports negative balances with warnings
- Complete audit trail for accountability

## Frontend Implementation

### Billing Page Refactor

#### Tabbed Interface
- **VirtFusion Tokens Tab**: Preserves existing functionality exactly as-is
- **Custom Credits Tab**: New system with separate PayPal checkout
- **Transactions Tab**: Shows both types of transactions

#### Balance Display
- Updated to show both credit systems prominently
- Clear visual distinction between the two systems
- Real-time balance updates after transactions

#### Payment Integration
- `CustomCreditsPayPalCheckout` component
- Separate PayPal integration for custom credits
- Amount validation and error handling
- Success/failure state management

### Admin User Management

#### Enhanced Admin Interface
- New "Custom Credits" tab in user edit page
- Real-time balance display
- Credit addition/removal with reason tracking
- Transaction history with admin audit trail
- Confirmation dialogs for destructive actions

## Security Features

### Input Validation
- Amount limits: $1.00 minimum, $1000.00 maximum
- Required reason fields for admin actions
- Sanitized input handling

### Access Controls
- Admin-only access for credit management endpoints
- User authentication required for all operations
- Role-based permissions enforcement

### Transaction Integrity
- Atomic database transactions
- Balance verification before operations
- Complete audit trail for all actions
- Before/after balance tracking

### Payment Security
- Server-side PayPal verification
- Payment amount validation
- Fraud prevention measures
- Secure payment processing

## Data Integrity

### Transaction Logging
- Every credit operation is logged
- Before and after balances recorded
- Admin user identification for accountability
- Timestamp and reason tracking

### Balance Validation
- Atomic transactions prevent race conditions
- Balance checks before deductions
- Negative balance warnings for admins
- Consistent state maintenance

### Audit Trail
- Complete transaction history
- Admin action logging
- Payment verification records
- Metadata storage for additional context

## Usage Examples

### User Credit Purchase
1. User selects amount on Custom Credits tab
2. PayPal checkout process initiated
3. Server-side payment verification
4. Credit addition with transaction logging
5. Balance update and user notification

### Admin Credit Management
1. Admin navigates to user edit page
2. Selects Custom Credits tab
3. Views current balance and transaction history
4. Adds/removes credits with reason
5. Confirmation and audit trail creation

### DNS Plan Integration (Future)
1. User selects DNS plan
2. System checks custom credit balance
3. Deducts appropriate amount
4. Creates subscription record
5. Activates DNS plan services

## Migration Process

### Database Migration
- Script: `scripts/add-dual-billing-system.ts`
- Creates all new tables with proper indexes
- Inserts default DNS plans
- Safe execution with conflict handling

### Backward Compatibility
- Existing VirtFusion functionality unchanged
- No disruption to current users
- Gradual rollout capability

## Testing Recommendations

### Unit Tests
- API endpoint validation
- Payment processing logic
- Balance calculation accuracy
- Transaction integrity

### Integration Tests
- PayPal payment flow
- Admin credit management
- Database transaction consistency
- Error handling scenarios

### User Acceptance Tests
- Complete purchase workflows
- Admin management interfaces
- Balance display accuracy
- Transaction history verification

## Future Enhancements

### Planned Features
- DNS plan subscription automation
- Dedicated server billing integration
- Advanced reporting and analytics
- Bulk credit operations for admins

### Scalability Considerations
- Database indexing optimization
- Payment processing rate limiting
- Transaction batching for high volume
- Caching strategies for balance queries

## Troubleshooting

### Common Issues
- PayPal configuration verification
- Database connection validation
- Transaction rollback scenarios
- Balance synchronization checks

### Monitoring
- Transaction success rates
- Payment processing times
- Database performance metrics
- Error rate tracking

## Conclusion

The dual billing system provides a robust foundation for SkyPANEL's expanding service offerings while maintaining the integrity of existing VirtFusion integrations. The clear separation of concerns, comprehensive audit trails, and secure payment processing ensure reliable financial operations for both users and administrators.
