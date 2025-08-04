# Hourly Billing System

## Overview

The Hourly Billing System is a comprehensive feature in SkyPANEL that enables automatic billing for server uptime on an hourly basis. This system integrates with the existing VirtFusion API and billing infrastructure to provide granular billing control.

## Features

### Core Functionality
- **Automatic Hourly Billing**: Bills users based on actual server uptime hours
- **Configurable Billing Schedule**: Customizable cron schedule for billing runs
- **Real-time Processing**: Processes billing in real-time with detailed logging
- **Admin Controls**: Full administrative control over billing settings
- **Integration**: Seamless integration with existing VirtFusion and PayPal systems

### Admin Settings
- **Enable/Disable Toggle**: Simple toggle to enable or disable hourly billing
- **Hours Per Month**: Configurable hours per month (default: 730 hours)
- **Cron Schedule**: Customizable cron schedule for billing runs (default: every hour)
- **Real-time Updates**: Settings saved immediately with proper form state management

## Architecture

### Components

#### 1. Cron Service (`server/services/cron-service.ts`)
The core service that manages the hourly billing cron jobs.

```typescript
export class CronService {
  private hourlyBillingJob: cron.ScheduledTask | null = null;
  
  // Initialize cron jobs on service startup
  private async initializeCronJobs()
  
  // Initialize the hourly billing job
  private async initializeHourlyBillingJob()
  
  // Run the hourly billing process
  private async runHourlyBilling()
  
  // Manually trigger hourly billing
  async triggerHourlyBilling()
  
  // Update cron schedule and enable/disable
  async updateCronSchedule(schedule: string, enabled: boolean)
  
  // Get cron job status
  getCronStatus()
  
  // Get cron job logs
  getCronLogs()
  
  // Stop all cron jobs
  stopAllJobs()
}
```

#### 2. Server Uptime Service (`server/services/infrastructure/server-uptime-service.ts`)
Handles the actual billing calculations and server uptime tracking.

#### 3. Admin Settings Interface (`client/src/pages/admin/settings-page.tsx`)
Provides the user interface for configuring hourly billing settings.

### Database Schema

The system uses the `serverHourlyBillingSettings` table to store configuration:

```typescript
export const serverHourlyBillingSettings = pgTable('server_hourly_billing_settings', {
  id: serial('id').primaryKey(),
  cronEnabled: boolean('cron_enabled').default(false),
  cronSchedule: varchar('cron_schedule', { length: 100 }).default('0 * * * *'),
  hoursPerMonth: integer('hours_per_month').default(730),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

## Configuration

### Admin Settings

The hourly billing system can be configured through the admin settings page at `/admin/settings`:

1. **Enable Hourly Billing**: Toggle to enable/disable the system
2. **Hours Per Month**: Set the number of hours per month (default: 730)
3. **Cron Schedule**: Configure when billing runs (default: every hour at minute 0)

### Settings Storage

Settings are stored in the `settings` table with the following keys:
- `server_hourly_billing_enabled`: Boolean flag for enabling/disabling
- `server_hours_per_month`: Number of hours per month
- `server_hourly_billing_cron_schedule`: Cron schedule string

## API Endpoints

### Admin Endpoints

#### GET `/api/admin/cron/status`
Returns the status of cron jobs including hourly billing.

**Response:**
```json
{
  "success": true,
  "cronStatus": {
    "hourlyBilling": {
      "isRunning": true,
      "nextRun": null
    }
  },
  "cronLogs": {
    "hourlyBilling": {
      "lastRun": null,
      "logs": []
    }
  },
  "dnsStats": {}
}
```

#### POST `/api/admin/cron/trigger-hourly-billing`
Manually triggers the hourly billing process.

**Response:**
```json
{
  "success": true,
  "message": "Hourly billing triggered successfully"
}
```

## Billing Process

### How It Works

1. **Cron Job**: The system runs on a configurable schedule (default: every hour)
2. **Server Discovery**: Discovers all active servers from VirtFusion API
3. **Uptime Calculation**: Calculates actual uptime for each server
4. **Billing Calculation**: Applies hourly rates based on uptime
5. **Transaction Creation**: Creates billing transactions in the system
6. **PayPal Integration**: Processes payments through PayPal
7. **Logging**: Logs all activities for audit purposes

### Billing Logic

```typescript
// Example billing calculation
const uptimeHours = server.uptime / (1000 * 60 * 60); // Convert to hours
const hourlyRate = server.monthlyPrice / settings.hoursPerMonth;
const billAmount = uptimeHours * hourlyRate;
```

## Error Handling

### Common Issues

1. **Cron Service Errors**: Handled with try-catch blocks and detailed logging
2. **VirtFusion API Errors**: Graceful handling of API failures
3. **Database Errors**: Transaction rollback on database failures
4. **PayPal Integration Errors**: Proper error handling for payment failures

### Error Recovery

- **Automatic Retries**: Failed operations are retried with exponential backoff
- **Manual Triggers**: Admins can manually trigger billing runs
- **Detailed Logging**: All errors are logged with context for debugging

## Monitoring and Logging

### Console Logging

The system provides detailed console logging:

```
🕐 Starting hourly billing process...
✅ Hourly billing completed in 1250ms
📊 Results: 15 servers processed, $45.67 total billed
❌ Errors encountered: 2
  - Server ID 123: API connection timeout
  - Server ID 456: Invalid billing data
```

### Status Monitoring

- **Cron Job Status**: Monitor if the cron job is running
- **Processing Results**: Track servers processed and amounts billed
- **Error Tracking**: Monitor and alert on billing errors

## Security Considerations

### Data Protection

- **Encrypted Storage**: Sensitive billing data is encrypted
- **Audit Logging**: All billing activities are logged for audit
- **Access Control**: Only admins can configure billing settings

### API Security

- **Rate Limiting**: API endpoints are rate-limited
- **Authentication**: All endpoints require admin authentication
- **Input Validation**: All inputs are validated using Zod schemas

## Integration Points

### VirtFusion Integration

- **Server Discovery**: Fetches server list from VirtFusion API
- **Uptime Data**: Retrieves server uptime information
- **Real-time Updates**: Processes real-time server status changes

### PayPal Integration

- **Payment Processing**: Handles payment processing through PayPal
- **Webhook Handling**: Processes PayPal webhooks for payment confirmations
- **Error Handling**: Graceful handling of payment failures

### Discord Integration

- **Notifications**: Sends billing notifications to Discord
- **Error Alerts**: Alerts admins of billing issues
- **Status Updates**: Provides real-time status updates

## Troubleshooting

### Common Issues

1. **Toggle Not Saving**: Ensure form state is properly managed
2. **Cron Job Not Running**: Check cron service initialization
3. **Billing Errors**: Review server uptime service logs
4. **API Connection Issues**: Verify VirtFusion API settings

### Debug Commands

```bash
# Test hourly billing save
npx tsx scripts/test-hourly-billing-save.ts

# Debug toggle functionality
npx tsx scripts/debug-hourly-billing-toggle.ts

# Check cron service status
curl http://localhost:3000/api/admin/cron/status
```

## Future Enhancements

### Planned Features

1. **Advanced Scheduling**: More granular cron schedule options
2. **Billing Reports**: Detailed billing reports and analytics
3. **Notification System**: Email notifications for billing events
4. **Billing History**: Complete billing history and audit trail
5. **Custom Rates**: Per-server custom billing rates
6. **Billing Alerts**: Alerts for unusual billing patterns

### Performance Optimizations

1. **Batch Processing**: Process multiple servers in batches
2. **Caching**: Cache server data to reduce API calls
3. **Parallel Processing**: Process billing in parallel where possible
4. **Database Optimization**: Optimize database queries for large datasets

## Migration Guide

### From Previous Billing System

1. **Backup Data**: Backup existing billing data
2. **Enable Feature**: Enable hourly billing in admin settings
3. **Configure Settings**: Set up billing parameters
4. **Test Process**: Run test billing cycles
5. **Monitor Results**: Monitor billing accuracy and performance

### Database Migration

The system automatically creates required database tables and settings. No manual migration is required.

## Support and Maintenance

### Regular Maintenance

1. **Monitor Logs**: Regularly check cron service logs
2. **Review Settings**: Periodically review billing settings
3. **Update Schedules**: Adjust cron schedules as needed
4. **Backup Data**: Regular backup of billing data

### Support Procedures

1. **Issue Identification**: Use logging to identify issues
2. **Error Analysis**: Analyze error patterns and causes
3. **Resolution**: Apply fixes and verify functionality
4. **Documentation**: Update documentation with lessons learned

---

## Quick Reference

### Key Files
- `server/services/cron-service.ts` - Core cron service
- `client/src/pages/admin/settings-page.tsx` - Admin interface
- `server/services/infrastructure/server-uptime-service.ts` - Billing logic

### Key Settings
- `server_hourly_billing_enabled` - Enable/disable toggle
- `server_hours_per_month` - Hours per month (default: 730)
- `server_hourly_billing_cron_schedule` - Cron schedule (default: '0 * * * *')

### Key Endpoints
- `GET /api/admin/cron/status` - Get cron status
- `POST /api/admin/cron/trigger-hourly-billing` - Manual trigger

### Default Values
- **Hours Per Month**: 730 hours
- **Cron Schedule**: Every hour at minute 0 (`0 * * * *`)
- **Billing Enabled**: Disabled by default 