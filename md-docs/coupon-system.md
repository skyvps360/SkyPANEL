# Coupon System Documentation

## Overview

The SkyPANEL Coupon System is a comprehensive token-based reward system that allows administrators to create, manage, and distribute coupon codes to users. Users can redeem these coupons to receive tokens that can be used for various services within the platform.

## Features

### Admin Features
- **Create Coupons**: Generate unique coupon codes with customizable rewards
- **Manage Coupons**: Edit, activate/deactivate, and delete existing coupons
- **Usage Tracking**: Monitor coupon usage statistics and user redemption history
- **Bulk Management**: Handle multiple coupons efficiently
- **Code Generation**: Automatic generation of secure, unique coupon codes

### User Features
- **Coupon Redemption**: Simple interface to claim coupon codes
- **Token Rewards**: Receive tokens that can be used for platform services
- **Usage Validation**: Real-time validation of coupon codes
- **One-time Use**: Each user can only use a coupon once to prevent abuse

## System Architecture

### Database Schema

The coupon system uses two main database tables:

#### Coupons Table
```sql
CREATE TABLE coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  tokens_amount DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Coupon Usage Table
```sql
CREATE TABLE coupon_usage (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER REFERENCES coupons(id),
  user_id INTEGER REFERENCES users(id),
  tokens_received DECIMAL(10,2) NOT NULL,
  virtfusion_credit_id VARCHAR(255),
  transaction_id INTEGER REFERENCES transactions(id),
  used_at TIMESTAMP DEFAULT NOW()
);
```

### API Endpoints

#### Admin Endpoints

**Base URL**: `/api/admin/coupons`

- `GET /` - Get all coupons with usage statistics
- `POST /` - Create a new coupon
- `PUT /:id` - Update an existing coupon
- `DELETE /:id` - Delete a coupon
- `PATCH /:id/toggle` - Toggle coupon active status
- `GET /:id/usage` - Get coupon usage history
- `POST /generate-code` - Generate a unique coupon code
- `GET /code/:code` - Get coupon details by code

#### User Endpoints

**Base URL**: `/api/coupons`

- `POST /claim` - Claim a coupon code
- `POST /validate` - Validate a coupon code without claiming

## Implementation Details

### Frontend Components

#### Admin Interface
**Location**: `/client/src/pages/admin/coupon-management.tsx`

The admin interface provides:
- **Coupon Table**: Displays all coupons with their status, usage, and actions
- **Create/Edit Dialog**: Form for creating new coupons or editing existing ones
- **Usage History Dialog**: Detailed view of who used each coupon
- **Bulk Actions**: Toggle status, delete, and edit multiple coupons

**Key Features**:
- Real-time usage percentage calculation
- Automatic code generation
- Form validation using Zod schemas
- Responsive design with Tailwind CSS
- Toast notifications for user feedback

#### User Interface
**Location**: Integrated into billing/dashboard pages

Users can:
- Enter coupon codes in a simple input field
- See real-time validation feedback
- Receive immediate token rewards upon successful redemption

### Backend Services

#### CouponService
**Location**: `/server/services/coupon-service.ts`

Core service class that handles:
- **Coupon CRUD Operations**: Create, read, update, delete coupons
- **Code Generation**: Secure random code generation
- **Usage Tracking**: Record and validate coupon usage
- **Token Distribution**: Award tokens to users upon redemption
- **Validation Logic**: Check usage limits, active status, and user eligibility

**Key Methods**:
```typescript
// Create a new coupon
async createCoupon(data: CreateCouponRequest, adminUserId: number): Promise<Coupon>

// Claim a coupon for a user
async claimCoupon(code: string, userId: number): Promise<CouponClaimResult>

// Validate coupon without claiming
async validateCoupon(code: string, userId: number): Promise<boolean>

// Get coupon usage statistics
async getCouponUsageHistory(couponId: number): Promise<CouponUsage[]>
```

#### Route Handlers
**Locations**: 
- `/server/routes/admin-coupons.ts` - Admin management routes
- `/server/routes/coupon-routes.ts` - User redemption routes

### Security Features

#### Access Control
- **Admin Routes**: Protected by admin role verification
- **User Routes**: Require user authentication
- **Input Validation**: All inputs validated using Zod schemas
- **SQL Injection Prevention**: Parameterized queries via Drizzle ORM

#### Abuse Prevention
- **One-time Use**: Each user can only use a coupon once
- **Usage Limits**: Configurable maximum usage per coupon
- **Active Status**: Coupons can be deactivated to prevent further use
- **Audit Trail**: Complete usage history tracking

#### Code Security
- **Unique Codes**: Cryptographically secure random generation
- **Case Insensitive**: Codes work regardless of case
- **Length Validation**: Configurable code length (default 8-12 characters)

## Usage Examples

### Creating a Coupon (Admin)

```typescript
// Example coupon creation
const newCoupon = {
  code: "WELCOME2024",
  description: "Welcome bonus for new users",
  maxUses: 100,
  tokensAmount: 25.00,
  isActive: true
};

// API call
const response = await fetch('/api/admin/coupons', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newCoupon)
});
```

### Claiming a Coupon (User)

```typescript
// Example coupon claim
const claimData = {
  code: "WELCOME2024"
};

// API call
const response = await fetch('/api/coupons/claim', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(claimData)
});

const result = await response.json();
if (result.success) {
  console.log(`Received ${result.tokensReceived} tokens!`);
}
```

### Validating a Coupon (User)

```typescript
// Example coupon validation
const response = await fetch('/api/coupons/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: "WELCOME2024" })
});

const result = await response.json();
if (result.valid) {
  console.log(`This coupon gives ${result.coupon.tokensAmount} tokens`);
} else {
  console.log(`Error: ${result.error}`);
}
```

## Configuration

### Environment Variables

No specific environment variables are required for the coupon system. It uses the existing database connection and authentication system.

### Default Settings

- **Default Token Amount**: 10 tokens
- **Code Length**: 8-12 characters
- **Code Characters**: Alphanumeric (A-Z, 0-9)
- **Max Uses**: Unlimited (null) or custom limit
- **Default Status**: Active

## Monitoring and Analytics

### Usage Statistics

The admin interface provides:
- **Total Coupons**: Count of all created coupons
- **Active Coupons**: Count of currently active coupons
- **Total Redemptions**: Sum of all coupon uses
- **Tokens Distributed**: Total tokens awarded through coupons
- **Usage Percentage**: Visual progress bars for each coupon

### Audit Trail

Every coupon usage is logged with:
- User information (username, email)
- Timestamp of redemption
- Tokens received
- Associated transaction ID
- VirtFusion credit ID (if applicable)

## Error Handling

### Common Error Scenarios

1. **Invalid Coupon Code**
   - Status: 404
   - Message: "Invalid coupon code"

2. **Coupon Already Used**
   - Status: 400
   - Message: "You have already used this coupon"

3. **Coupon Inactive**
   - Status: 400
   - Message: "This coupon is no longer active"

4. **Usage Limit Reached**
   - Status: 400
   - Message: "This coupon has reached its usage limit"

5. **Duplicate Coupon Code**
   - Status: 409
   - Message: "Coupon code already exists"

### Error Response Format

```json
{
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

## Best Practices

### For Administrators

1. **Code Generation**: Use the automatic code generator for security
2. **Usage Limits**: Set reasonable limits to prevent abuse
3. **Descriptions**: Always add clear descriptions for tracking
4. **Regular Monitoring**: Check usage statistics regularly
5. **Deactivation**: Deactivate expired or problematic coupons

### For Developers

1. **Input Validation**: Always validate coupon codes on both client and server
2. **Error Handling**: Provide clear, user-friendly error messages
3. **Rate Limiting**: Consider implementing rate limiting for coupon validation
4. **Logging**: Log all coupon operations for audit purposes
5. **Testing**: Test edge cases like expired coupons and usage limits

## Integration with Other Systems

### Token System
Coupons integrate seamlessly with the existing token system, automatically crediting user accounts upon redemption.

### Transaction System
Each coupon redemption creates a transaction record for accounting and audit purposes.

### VirtFusion Integration
Coupons can optionally create VirtFusion credits alongside tokens for server-related rewards.

### Email Notifications
The system can be extended to send email notifications for coupon creation, usage, or expiration.

## Future Enhancements

### Planned Features

1. **Expiration Dates**: Add time-based coupon expiration
2. **User Restrictions**: Limit coupons to specific user groups
3. **Bulk Import**: CSV import for multiple coupon creation
4. **Analytics Dashboard**: Enhanced reporting and analytics
5. **Automated Distribution**: Scheduled coupon distribution
6. **Referral Integration**: Coupons for referral rewards

### Technical Improvements

1. **Caching**: Redis caching for frequently accessed coupons
2. **Rate Limiting**: API rate limiting for abuse prevention
3. **Batch Operations**: Bulk coupon operations for efficiency
4. **Real-time Updates**: WebSocket updates for live usage tracking

## Troubleshooting

### Common Issues

1. **Coupon Not Working**
   - Check if coupon is active
   - Verify usage limits haven't been reached
   - Ensure user hasn't already used the coupon

2. **Tokens Not Credited**
   - Check transaction logs
   - Verify database connection
   - Review error logs for failed operations

3. **Admin Interface Not Loading**
   - Verify admin permissions
   - Check API endpoint availability
   - Review browser console for errors

### Debug Commands

```sql
-- Check coupon status
SELECT * FROM coupons WHERE code = 'COUPON_CODE';

-- Check usage history
SELECT cu.*, u.username, u.email 
FROM coupon_usage cu 
JOIN users u ON cu.user_id = u.id 
WHERE cu.coupon_id = COUPON_ID;

-- Check user token balance
SELECT tokens FROM users WHERE id = USER_ID;
```

## Conclusion

The SkyPANEL Coupon System provides a robust, secure, and user-friendly way to distribute token rewards to users. With comprehensive admin controls, detailed usage tracking, and strong security measures, it serves as an effective tool for user engagement and retention.

For additional support or feature requests, please refer to the main SkyPANEL documentation or contact the development team.