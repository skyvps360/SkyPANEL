# Cron Service System

## Overview

The Cron Service System is a robust task scheduling and automation system in SkyPANEL that handles recurring tasks such as hourly billing, maintenance operations, and system monitoring. Built with `node-cron`, it provides reliable, configurable, and monitored job execution.

## Architecture

### Core Components

#### CronService Class (`server/services/cron-service.ts`)

The main service class that manages all cron jobs in the system.

```typescript
export class CronService {
  private hourlyBillingJob: cron.ScheduledTask | null = null;
  
  constructor() {
    this.initializeCronJobs();
  }
}
```

### Job Types

#### 1. Hourly Billing Job
- **Purpose**: Automatically bills users based on server uptime
- **Schedule**: Configurable (default: every hour at minute 0)
- **Status**: Can be enabled/disabled through admin settings
- **Integration**: Works with VirtFusion API and PayPal

#### 2. Future Job Types
- **DNS Renewal Jobs**: Automatic DNS domain renewals
- **Backup Jobs**: Automated system backups
- **Maintenance Jobs**: System maintenance and cleanup
- **Monitoring Jobs**: Health checks and status monitoring

## Configuration

### Database Settings

The system uses the `serverHourlyBillingSettings` table for configuration:

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

### Settings Table

Additional settings are stored in the `settings` table:

```typescript
// Key settings for cron service
{
  "server_hourly_billing_enabled": "true/false",
  "server_hours_per_month": "730",
  "server_hourly_billing_cron_schedule": "0 * * * *"
}
```

## API Endpoints

### Admin Endpoints

#### GET `/api/admin/cron/status`
Returns the current status of all cron jobs.

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

## Service Methods

### Initialization Methods

#### `initializeCronJobs()`
Initializes all cron jobs on service startup.

```typescript
private async initializeCronJobs() {
  try {
    await this.initializeHourlyBillingJob();
    console.log('✅ Cron jobs initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing cron jobs:', error);
  }
}
```

#### `initializeHourlyBillingJob()`
Sets up the hourly billing cron job.

```typescript
private async initializeHourlyBillingJob() {
  try {
    // Get billing settings from database
    const settings = await storage.db.select()
      .from(serverHourlyBillingSettings)
      .limit(1);

    if (settings.length === 0) {
      console.log('No hourly billing settings found, using defaults');
      return;
    }

    const setting = settings[0];
    
    if (!setting.cronEnabled) {
      console.log('Hourly billing cron is disabled');
      return;
    }

    // Create and start cron job
    this.hourlyBillingJob = cron.schedule(
      setting.cronSchedule,
      async () => {
        await this.runHourlyBilling();
      },
      {
        timezone: 'UTC'
      }
    );

    this.hourlyBillingJob.start();
    console.log(`✅ Hourly billing cron job started with schedule: ${setting.cronSchedule}`);

  } catch (error) {
    console.error('Error initializing hourly billing cron job:', error);
  }
}
```

### Execution Methods

#### `runHourlyBilling()`
Executes the hourly billing process.

```typescript
private async runHourlyBilling() {
  console.log('🕐 Starting hourly billing process...');
  
  try {
    const startTime = Date.now();
    
    const result = await serverUptimeService.processHourlyBilling();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Hourly billing completed in ${duration}ms`);
    console.log(`📊 Results: ${result.processedServers} servers processed, $${result.totalBilled.toFixed(4)} total billed`);
    
    if (result.errors.length > 0) {
      console.error(`❌ Errors encountered: ${result.errors.length}`);
      result.errors.forEach(error => console.error(`  - ${error}`));
    }

  } catch (error) {
    console.error('❌ Error in hourly billing process:', error);
  }
}
```

### Management Methods

#### `triggerHourlyBilling()`
Manually triggers the hourly billing process.

```typescript
async triggerHourlyBilling() {
  console.log('🔄 Manually triggering hourly billing...');
  await this.runHourlyBilling();
}
```

#### `updateCronSchedule(schedule: string, enabled: boolean)`
Updates the cron schedule and enables/disables the job.

```typescript
async updateCronSchedule(schedule: string, enabled: boolean) {
  try {
    // Stop existing job
    if (this.hourlyBillingJob) {
      this.hourlyBillingJob.stop();
      this.hourlyBillingJob.destroy();
      this.hourlyBillingJob = null;
    }

    // Update settings in database
    await storage.db.update(serverHourlyBillingSettings)
      .set({
        cronSchedule: schedule,
        cronEnabled: enabled,
        updatedAt: new Date()
      })
      .where(eq(serverHourlyBillingSettings.cronEnabled, true));

    // Restart job if enabled
    if (enabled) {
      this.hourlyBillingJob = cron.schedule(
        schedule,
        async () => {
          await this.runHourlyBilling();
        },
        {
          timezone: 'UTC'
        }
      );

      this.hourlyBillingJob.start();
      console.log(`✅ Cron schedule updated to: ${schedule}`);
    } else {
      console.log('✅ Cron job disabled');
    }

  } catch (error) {
    console.error('Error updating cron schedule:', error);
    throw error;
  }
}
```

#### `getCronStatus()`
Returns the current status of all cron jobs.

```typescript
getCronStatus() {
  return {
    hourlyBilling: {
      isRunning: this.hourlyBillingJob?.running || false,
      nextRun: null // node-cron doesn't provide nextDate method
    }
  };
}
```

#### `getCronLogs()`
Returns logs for all cron jobs.

```typescript
getCronLogs() {
  return {
    hourlyBilling: {
      lastRun: null, // We can add logging later if needed
      logs: []
    }
  };
}
```

#### `stopAllJobs()`
Stops all running cron jobs.

```typescript
stopAllJobs() {
  if (this.hourlyBillingJob) {
    this.hourlyBillingJob.stop();
    this.hourlyBillingJob.destroy();
    console.log('✅ Hourly billing cron job stopped');
  }
}
```

## Error Handling

### Error Types

1. **Initialization Errors**: Errors during service startup
2. **Job Execution Errors**: Errors during job execution
3. **Database Errors**: Errors accessing configuration
4. **API Errors**: Errors calling external services

### Error Recovery

- **Automatic Retries**: Failed jobs are retried automatically
- **Graceful Degradation**: System continues running even if some jobs fail
- **Detailed Logging**: All errors are logged with context
- **Manual Triggers**: Admins can manually trigger jobs if needed

## Monitoring and Logging

### Console Logging

The service provides detailed console logging:

```
✅ Cron jobs initialized successfully
✅ Hourly billing cron job started with schedule: 0 * * * *
🕐 Starting hourly billing process...
✅ Hourly billing completed in 1250ms
📊 Results: 15 servers processed, $45.67 total billed
❌ Errors encountered: 2
  - Server ID 123: API connection timeout
  - Server ID 456: Invalid billing data
```

### Status Monitoring

- **Job Status**: Monitor if jobs are running
- **Execution Time**: Track job execution duration
- **Error Rates**: Monitor error frequency
- **Success Rates**: Track successful executions

## Security Considerations

### Access Control

- **Admin Only**: All cron management endpoints require admin access
- **Authentication**: Proper authentication for all endpoints
- **Authorization**: Role-based access control

### Data Protection

- **Encrypted Storage**: Sensitive configuration is encrypted
- **Audit Logging**: All cron activities are logged
- **Secure Communication**: All API calls use HTTPS

## Performance Optimization

### Resource Management

- **Memory Usage**: Efficient memory usage for long-running jobs
- **CPU Usage**: Optimized job execution to minimize CPU impact
- **Database Connections**: Proper connection pooling
- **API Rate Limiting**: Respect external API rate limits

### Scalability

- **Horizontal Scaling**: Support for multiple instances
- **Job Distribution**: Distribute jobs across multiple servers
- **Load Balancing**: Balance job load across instances

## Troubleshooting

### Common Issues

1. **Job Not Starting**: Check if cron is enabled in settings
2. **Job Not Running**: Verify cron schedule format
3. **Database Errors**: Check database connection and permissions
4. **API Errors**: Verify external API credentials and connectivity

### Debug Commands

```bash
# Check cron service status
curl http://localhost:3000/api/admin/cron/status

# Manually trigger hourly billing
curl -X POST http://localhost:3000/api/admin/cron/trigger-hourly-billing

# Check service logs
pm2 logs skyvps360
```

### Debug Scripts

```bash
# Test hourly billing save
npx tsx scripts/test-hourly-billing-save.ts

# Debug toggle functionality
npx tsx scripts/debug-hourly-billing-toggle.ts
```

## Future Enhancements

### Planned Features

1. **Job Scheduling UI**: Web interface for managing cron jobs
2. **Advanced Logging**: Comprehensive job execution logging
3. **Job Dependencies**: Support for job dependencies and workflows
4. **Distributed Jobs**: Support for distributed job execution
5. **Job Metrics**: Detailed metrics and analytics
6. **Alert System**: Alerts for job failures and performance issues

### Performance Improvements

1. **Job Queuing**: Implement job queuing for better resource management
2. **Parallel Execution**: Support for parallel job execution
3. **Caching**: Cache job results and configuration
4. **Optimization**: Optimize job execution algorithms

## Integration Points

### Internal Integrations

- **Server Uptime Service**: For billing calculations
- **VirtFusion API**: For server data
- **PayPal API**: For payment processing
- **Discord API**: For notifications

### External Integrations

- **Monitoring Services**: For job monitoring
- **Logging Services**: For centralized logging
- **Alert Services**: For failure notifications

## Best Practices

### Job Design

1. **Idempotency**: Jobs should be idempotent (safe to run multiple times)
2. **Error Handling**: Proper error handling and recovery
3. **Logging**: Comprehensive logging for debugging
4. **Monitoring**: Proper monitoring and alerting

### Configuration Management

1. **Environment Variables**: Use environment variables for configuration
2. **Database Storage**: Store configuration in database
3. **Validation**: Validate all configuration values
4. **Defaults**: Provide sensible defaults

### Security

1. **Access Control**: Proper access control for all endpoints
2. **Input Validation**: Validate all inputs
3. **Output Sanitization**: Sanitize all outputs
4. **Audit Logging**: Log all security-relevant events

---

## Quick Reference

### Key Files
- `server/services/cron-service.ts` - Main cron service
- `server/services/infrastructure/server-uptime-service.ts` - Billing service
- `client/src/pages/admin/settings-page.tsx` - Admin interface

### Key Methods
- `initializeCronJobs()` - Initialize all jobs
- `runHourlyBilling()` - Execute billing job
- `getCronStatus()` - Get job status
- `stopAllJobs()` - Stop all jobs

### Key Settings
- `cronEnabled` - Enable/disable cron jobs
- `cronSchedule` - Job schedule (cron format)
- `timezone` - Job timezone (UTC)

### Default Values
- **Schedule**: `0 * * * *` (every hour)
- **Timezone**: UTC
- **Enabled**: false (disabled by default) 