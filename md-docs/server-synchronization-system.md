# Server Synchronization System

## Overview

The Server Synchronization System is a comprehensive solution for cross-checking server UUIDs between VirtFusion and SkyPANEL, ensuring that servers created directly in VirtFusion (outside of SkyPANEL) are properly synchronized and tracked in the SkyPANEL database.

## Problem Statement

When servers are created directly in VirtFusion (bypassing SkyPANEL), they exist in VirtFusion but are not tracked in SkyPANEL's database. This creates several issues:

1. **Billing Inconsistencies**: External servers may not be properly billed through SkyPANEL
2. **Management Gaps**: Users cannot manage external servers through SkyPANEL interface
3. **Data Synchronization**: Server status, IP addresses, and other details are not available in SkyPANEL
4. **UUID Mismatches**: Server UUIDs between VirtFusion and SkyPANEL may not match

## Solution Architecture

### Core Components

1. **ServerSyncService** (`server/services/server-sync-service.ts`)
   - Main service for handling server synchronization
   - Cross-checks server UUIDs between VirtFusion and SkyPANEL
   - Creates/updates billing records for external servers

2. **API Endpoints** (`server/routes_new.ts`)
   - User endpoints for syncing their own servers
   - Admin endpoints for syncing all users' servers
   - Status endpoints for monitoring sync progress

3. **Frontend Components** (`client/src/components/servers/ServerSyncModal.tsx`)
   - User interface for server synchronization
   - Real-time status monitoring
   - Error reporting and resolution

### Key Features

- **UUID Cross-Checking**: Verifies server UUIDs between VirtFusion and SkyPANEL
- **External Server Detection**: Identifies servers created outside SkyPANEL
- **Billing Integration**: Creates proper billing records for external servers
- **Real-time Status**: Provides live sync status and progress
- **Error Handling**: Comprehensive error reporting and recovery
- **Admin Controls**: Administrative tools for bulk synchronization

## How It Works

### 1. Server Discovery

The system fetches all servers from VirtFusion for each user and compares them with existing records in SkyPANEL:

```typescript
// Get all servers from VirtFusion
const virtFusionServers = await this.getVirtFusionServersForUser(user.virtFusionId);

// Get existing billing records
const existingBillingRecords = await db
  .select()
  .from(virtfusionHourlyBilling)
  .where(eq(virtfusionHourlyBilling.userId, userId));
```

### 2. UUID Cross-Checking

For each VirtFusion server, the system checks if a corresponding record exists in SkyPANEL:

```typescript
// Check if we already have a billing record for this server
const existingRecord = existingBillingRecords.find(record => 
  record.virtfusionServerId === virtFusionServer.id ||
  (record.serverUuid && record.serverUuid === virtFusionServer.uuid)
);
```

### 3. Record Creation/Update

If no record exists, the system creates a new billing record for the external server:

```typescript
// Create new billing record for external server
const newBillingRecord = await db
  .insert(virtfusionHourlyBilling)
  .values({
    userId: skyPanelUserId,
    serverId: virtFusionServer.id,
    virtfusionServerId: virtFusionServer.id,
    serverUuid: virtFusionServer.uuid,
    // ... other fields
  });
```

### 4. Billing Integration

External servers are integrated into the existing billing system:

```typescript
// If billing is enabled, create initial transaction
if (billingEnabled && hourlyRate > 0) {
  await db
    .insert(virtfusionHourlyTransactions)
    .values({
      userId: skyPanelUserId,
      serverId: virtFusionServer.id,
      serverUuid: virtFusionServer.uuid,
      transactionType: 'hourly_billing',
      amountCharged: hourlyRate.toString(),
      // ... other fields
    });
}
```

## API Endpoints

### User Endpoints

#### POST `/api/user/servers/sync`
Synchronize the current user's servers with VirtFusion.

**Response:**
```json
{
  "success": true,
  "message": "Successfully synchronized 5 servers for user 123",
  "data": {
    "syncedServers": 5,
    "newServers": 2,
    "updatedServers": 3,
    "errors": []
  }
}
```

#### GET `/api/user/servers/sync/status`
Get the current synchronization status for the user.

**Response:**
```json
{
  "success": true,
  "data": {
    "lastSync": null,
    "totalServers": 5,
    "syncedServers": 5,
    "externalServers": 2,
    "billingRecords": 5
  }
}
```

### Admin Endpoints

#### POST `/api/admin/servers/sync`
Synchronize all users' servers with VirtFusion.

#### POST `/api/admin/users/:id/servers/sync`
Synchronize a specific user's servers with VirtFusion.

## Frontend Integration

### Server Sync Modal

The `ServerSyncModal` component provides a user-friendly interface for server synchronization:

- **Real-time Status**: Shows current sync status and progress
- **External Server Detection**: Highlights servers created outside SkyPANEL
- **One-click Sync**: Simple button to initiate synchronization
- **Error Reporting**: Displays any errors encountered during sync
- **Results Summary**: Shows sync results and statistics

### Integration with Servers Page

The sync functionality is integrated into the main servers page:

```typescript
// Add sync button to servers page
<Button
  onClick={() => setShowSyncModal(true)}
  variant="outline"
  className="inline-flex items-center gap-2"
>
  <Sync className="h-4 w-4" />
  Sync Servers
</Button>
```

## Database Schema

### virtfusion_hourly_billing Table

The system uses the existing `virtfusion_hourly_billing` table to track server billing:

```sql
-- Key fields for external servers
serverUuid: text('server_uuid'), -- VirtFusion server UUID
reference1: text('reference_1'), -- Contains 'external_server_<id>' for external servers
serverCreatedAt: timestamp('server_created_at'), -- Server creation date
```

### virtfusion_hourly_transactions Table

External servers are integrated into the billing system through transactions:

```sql
-- Transaction records for external servers
reference1: text('reference_1'), -- Contains 'external_server_<id>'
reference2: text('reference_2'), -- Contains server UUID
```

## Usage Examples

### Manual Synchronization

Users can manually sync their servers through the web interface:

1. Navigate to the Servers page
2. Click the "Sync Servers" button
3. Review the sync status and results
4. Address any errors if they occur

### Programmatic Synchronization

Developers can programmatically sync servers:

```typescript
import { ServerSyncService } from '../server/services/server-sync-service';

// Sync a specific user's servers
const result = await ServerSyncService.syncUserServers(userId);

// Sync all users' servers
const result = await ServerSyncService.syncAllUsersServers();

// Get sync status
const status = await ServerSyncService.getSyncStatus(userId);
```

### Testing

Use the test script to verify the synchronization system:

```bash
npx tsx scripts/test-server-sync.ts
```

## Error Handling

### Common Errors

1. **API Connection Issues**: VirtFusion API unavailable or misconfigured
2. **User Not Found**: User doesn't have a VirtFusion account linked
3. **Server Access Denied**: User doesn't have access to certain servers
4. **Database Errors**: Issues with creating/updating billing records

### Error Recovery

The system includes comprehensive error handling:

- **Graceful Degradation**: Continues processing other servers if one fails
- **Detailed Logging**: Logs all errors with context for debugging
- **User Feedback**: Provides clear error messages to users
- **Retry Logic**: Implements retry mechanisms for transient failures

## Monitoring and Maintenance

### Sync Status Monitoring

Monitor synchronization status through:

- **Database Queries**: Check billing records and transaction counts
- **API Endpoints**: Use status endpoints to monitor sync progress
- **Logs**: Review server logs for sync activity and errors

### Regular Maintenance

Recommended maintenance tasks:

1. **Daily Sync Checks**: Monitor for new external servers
2. **Weekly Validation**: Verify sync accuracy and completeness
3. **Monthly Cleanup**: Remove orphaned or duplicate records
4. **Quarterly Review**: Analyze sync patterns and optimize performance

## Security Considerations

### Access Control

- **User Isolation**: Users can only sync their own servers
- **Admin Controls**: Only admins can sync all users' servers
- **API Authentication**: All VirtFusion API calls use proper authentication
- **Database Security**: Proper user context for all database operations

### Data Privacy

- **UUID Handling**: Server UUIDs are handled securely
- **Billing Data**: Sensitive billing information is protected
- **User Data**: User information is not exposed during sync

## Performance Optimization

### Batch Processing

The system processes servers in batches to optimize performance:

- **User-level Batching**: Process one user at a time
- **Server-level Batching**: Process multiple servers per API call
- **Database Batching**: Use transactions for multiple database operations

### Caching

Implement caching strategies:

- **Status Caching**: Cache sync status for 30 seconds
- **User Data Caching**: Cache user information during sync
- **API Response Caching**: Cache VirtFusion API responses

## Future Enhancements

### Planned Features

1. **Automatic Sync**: Scheduled background synchronization
2. **Real-time Updates**: WebSocket-based real-time sync status
3. **Bulk Operations**: Support for bulk server operations
4. **Advanced Filtering**: Filter servers by various criteria
5. **Sync History**: Track sync history and changes over time

### Integration Opportunities

1. **Notification System**: Notify users of new external servers
2. **Dashboard Integration**: Add sync status to main dashboard
3. **Reporting**: Generate sync reports and analytics
4. **API Integration**: Expose sync functionality via public API

## Troubleshooting

### Common Issues

1. **Sync Not Working**: Check VirtFusion API configuration
2. **Missing Servers**: Verify user has VirtFusion account linked
3. **Billing Issues**: Check package pricing configuration
4. **Performance Problems**: Monitor API rate limits and database performance

### Debug Tools

1. **Test Script**: Use `scripts/test-server-sync.ts` for debugging
2. **Log Analysis**: Review server logs for detailed error information
3. **Database Queries**: Direct database queries for troubleshooting
4. **API Testing**: Test VirtFusion API endpoints directly

## Conclusion

The Server Synchronization System provides a robust solution for maintaining consistency between VirtFusion and SkyPANEL. By cross-checking server UUIDs and creating proper billing records for external servers, it ensures that all servers are properly tracked and managed through the SkyPANEL interface.

The system is designed to be user-friendly, secure, and scalable, with comprehensive error handling and monitoring capabilities. Regular use of the synchronization features will help maintain data consistency and ensure proper billing for all servers.
