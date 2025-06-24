# DNS Plan Management System

## Overview

The DNS Plan Management System is a comprehensive solution for managing DNS hosting plans with integrated custom credit billing, plan upgrades/downgrades, and domain management through InterServer's DNS API.

## Core Features

### DNS Plan Structure
- **Free Plan**: Basic DNS hosting with limited domains
- **Basic Plan**: Enhanced DNS hosting with more domains
- **Premium Plan**: Full-featured DNS hosting with maximum domains
- **Custom Plans**: Administrator-configurable plans

### Plan Management
- **Purchase**: Buy new DNS plans using custom credits
- **Upgrade**: Seamlessly upgrade to higher-tier plans with prorated billing
- **Downgrade**: Downgrade plans with automatic credit refunds
- **Renewal**: Automatic and manual plan renewals
- **Cancellation**: Plan cancellation with domain cleanup

## Custom Credit Integration

### Payment System
All DNS plan transactions use the custom credit system:

```javascript
// DNS Plan Purchase
const purchasePlan = async (planId, userId) => {
  const customCreditsName = await getCustomCreditsName();
  
  const transaction = {
    type: 'dns_plan_purchase',
    description: `DNS Plan Purchase: ${plan.name} using ${customCreditsName}`,
    amount: -plan.price,
    paymentMethod: customCreditsName.toLowerCase().replace(/\s+/g, '_')
  };
  
  return await processTransaction(transaction);
};
```

### Prorated Billing
Upgrades and downgrades use prorated billing based on remaining time:

```javascript
const calculateProratedAmount = (currentPlan, newPlan, daysRemaining) => {
  const dailyCurrentCost = currentPlan.price / 30;
  const dailyNewCost = newPlan.price / 30;
  const remainingCurrentValue = dailyCurrentCost * daysRemaining;
  const remainingNewCost = dailyNewCost * daysRemaining;
  
  return remainingNewCost - remainingCurrentValue;
};
```

### Transaction Types
- **`dns_plan_purchase`**: New plan purchases
- **`dns_plan_upgrade`**: Plan upgrades (debit)
- **`dns_plan_downgrade`**: Plan downgrades (credit refund)

## Domain Management Integration

### InterServer DNS API
Integration with InterServer's DNS management system:

```javascript
// API Endpoints
const INTERSERVER_API = {
  base: 'https://my.interserver.net/apiv2',
  endpoints: {
    domains: '/dns',
    create: '/dns',
    delete: '/dns/{id}',
    update: '/dns/{id}'
  },
  headers: {
    'X-API-KEY': process.env.INTERSERVER_API_KEY
  }
};
```

### Domain Operations
- **Add Domain**: Create new DNS zones
- **Remove Domain**: Delete DNS zones and cleanup
- **Update Domain**: Modify DNS settings
- **Bulk Operations**: Mass domain management

### Plan Downgrade Domain Cleanup
When downgrading plans, excess domains are automatically removed:

```javascript
const handlePlanDowngrade = async (userId, newPlan, domainsToRemove) => {
  // Remove domains from InterServer
  for (const domain of domainsToRemove) {
    try {
      await fetch(`${INTERSERVER_API.base}/dns/${domain.interserver_id}`, {
        method: 'DELETE',
        headers: INTERSERVER_API.headers
      });
    } catch (error) {
      console.error(`Failed to delete domain ${domain.name}:`, error);
    }
  }
  
  // Remove from local database
  await db.delete(dnsDomainsTable)
    .where(and(
      eq(dnsDomainsTable.userId, userId),
      inArray(dnsDomainsTable.id, domainsToRemove.map(d => d.id))
    ));
};
```

## Plan Configuration

### Plan Schema
```javascript
interface DNSPlan {
  id: number;
  name: string;
  price: number;
  maxDomains: number;
  features: string[];
  isActive: boolean;
  sortOrder: number;
  description?: string;
}
```

### Default Plans
```javascript
const defaultPlans = [
  {
    name: 'Free',
    price: 0,
    maxDomains: 1,
    features: ['Basic DNS hosting', '1 domain'],
    isActive: true
  },
  {
    name: 'Basic',
    price: 5.00,
    maxDomains: 10,
    features: ['Enhanced DNS hosting', 'Up to 10 domains', 'Priority support'],
    isActive: true
  },
  {
    name: 'Premium',
    price: 15.00,
    maxDomains: 50,
    features: ['Premium DNS hosting', 'Up to 50 domains', '24/7 support', 'Advanced features'],
    isActive: true
  }
];
```

## User Interface Components

### Plan Selection Interface
- **Plan Cards**: Visual plan comparison
- **Feature Lists**: Detailed feature breakdowns
- **Pricing Display**: Clear pricing with custom credit integration
- **Upgrade/Downgrade Buttons**: Action buttons with confirmation

### Domain Management Interface
- **Domain List**: Current domains with status
- **Add Domain**: Domain addition form
- **Remove Domain**: Domain removal with confirmation
- **Bulk Actions**: Mass domain operations

### Transaction History
- **Enhanced Table**: Searchable, paginated transaction history
- **Filtering**: Filter by transaction type, date, amount
- **Export**: Transaction data export functionality

## API Endpoints

### Plan Management
```javascript
// Get available plans
GET /api/dns-plans

// Get user's current plan
GET /api/dns-plans/current

// Purchase plan
POST /api/dns-plans/purchase
{
  planId: number,
  paymentMethod: 'custom_credits'
}

// Change plan (upgrade/downgrade)
POST /api/dns-plans/change
{
  newPlanId: number,
  domainsToRemove?: number[] // For downgrades
}
```

### Domain Management
```javascript
// Get user domains
GET /api/dns-domains

// Add domain
POST /api/dns-domains
{
  name: string,
  type: 'master' | 'slave'
}

// Remove domain
DELETE /api/dns-domains/:id

// Bulk remove domains
POST /api/dns-domains/bulk-remove
{
  domainIds: number[]
}
```

## Security Features

### Access Control
- **User Authentication**: JWT-based authentication
- **Plan Limits**: Enforce domain limits per plan
- **API Rate Limiting**: Prevent abuse of DNS operations
- **Input Validation**: Comprehensive input sanitization

### Data Protection
- **Encrypted Storage**: Sensitive data encryption
- **Audit Logging**: Complete transaction audit trail
- **Backup Systems**: Regular data backups
- **GDPR Compliance**: Data protection compliance

## Error Handling

### Common Error Scenarios
```javascript
const errorHandlers = {
  INSUFFICIENT_CREDITS: 'Insufficient custom credits for this operation',
  DOMAIN_LIMIT_EXCEEDED: 'Domain limit exceeded for current plan',
  INTERSERVER_API_ERROR: 'DNS provider temporarily unavailable',
  INVALID_DOMAIN: 'Invalid domain name format',
  DOMAIN_ALREADY_EXISTS: 'Domain already exists in system'
};
```

### Graceful Degradation
- **Offline Mode**: Limited functionality when APIs unavailable
- **Retry Logic**: Automatic retry for failed operations
- **User Feedback**: Clear error messages and recovery options
- **Fallback Systems**: Backup systems for critical operations

## Performance Optimizations

### Caching Strategy
```javascript
// Plan data caching
const { data: plans } = useQuery({
  queryKey: ['/api/dns-plans'],
  staleTime: 10 * 60 * 1000, // 10 minutes
  cacheTime: 30 * 60 * 1000  // 30 minutes
});

// Domain data caching
const { data: domains } = useQuery({
  queryKey: ['/api/dns-domains'],
  staleTime: 5 * 60 * 1000,  // 5 minutes
  cacheTime: 15 * 60 * 1000  // 15 minutes
});
```

### Database Optimizations
- **Indexed Queries**: Optimized database indexes
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Minimized database queries
- **Batch Operations**: Bulk operations for efficiency

## Monitoring and Analytics

### Metrics Tracking
- **Plan Usage**: Track plan adoption and usage
- **Revenue Analytics**: Monitor DNS plan revenue
- **Domain Statistics**: Domain creation and deletion metrics
- **Error Rates**: Monitor system error rates

### Logging
```javascript
const logDNSOperation = (operation, userId, details) => {
  logger.info('DNS Operation', {
    operation,
    userId,
    timestamp: new Date().toISOString(),
    details,
    source: 'dns-plan-system'
  });
};
```

## Integration Points

### Custom Credit System
- **Balance Checking**: Real-time credit balance validation
- **Transaction Processing**: Seamless credit transactions
- **Refund Processing**: Automatic refunds for downgrades
- **Audit Trail**: Complete transaction history

### User Management
- **Plan Assignment**: User plan tracking
- **Permission Management**: Feature access control
- **Usage Monitoring**: Track user activity
- **Support Integration**: Customer support tools

### External APIs
- **InterServer DNS**: Primary DNS provider
- **Payment Processors**: PayPal integration for credit purchases
- **Monitoring Services**: Uptime and performance monitoring
- **Notification Systems**: Email and SMS notifications

## Future Enhancements

### Planned Features
1. **Multi-Provider Support**: Support for additional DNS providers
2. **Advanced Analytics**: Detailed usage analytics and reporting
3. **API Rate Limiting**: Per-plan API rate limits
4. **Custom DNS Records**: Advanced DNS record management
5. **Automated Backups**: Automated DNS configuration backups

### Scalability Improvements
1. **Microservices Architecture**: Break into smaller services
2. **Load Balancing**: Distribute load across multiple servers
3. **CDN Integration**: Content delivery network integration
4. **Database Sharding**: Horizontal database scaling
5. **Caching Layers**: Multi-level caching implementation

## Troubleshooting

### Common Issues
1. **Domain Not Propagating**: DNS propagation delays
2. **API Timeouts**: InterServer API connectivity issues
3. **Credit Deduction Failures**: Transaction processing errors
4. **Plan Limit Enforcement**: Domain limit validation issues

### Debug Tools
- **Transaction Logs**: Detailed transaction logging
- **API Response Monitoring**: Track external API responses
- **User Activity Logs**: Monitor user actions
- **System Health Checks**: Automated system monitoring
