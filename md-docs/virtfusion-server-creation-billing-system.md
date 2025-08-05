# VirtFusion Server Creation and Billing System

## Overview

The VirtFusion Server Creation and Billing System is a comprehensive solution that enables users to create VPS servers directly from the SkyPANEL client interface and manages automated billing for those servers. The system integrates with VirtFusion's API to provide seamless server provisioning and implements both hourly and monthly billing models with automated cron-based processing.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Client-Side Server Creation](#client-side-server-creation)
- [Server Creation Flow](#server-creation-flow)
- [Billing System](#billing-system)
- [Cron Service](#cron-service)
- [Database Schema](#database-schema)
- [API Integration](#api-integration)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Architecture Overview

The system consists of several interconnected components:

### Core Components

1. **Client-Side Creation Modal** (`ClientServerCreateModal.tsx`)
   - Interactive UI for server configuration
   - Real-time validation and package/OS selection
   - Step-by-step creation process with status tracking

2. **VirtFusion API Integration** (`virtfusion-api.ts`)
   - Server creation and management
   - User account synchronization
   - Billing and credit management

3. **Billing System** (`virtfusion-billing-schema.ts`)
   - Hourly and monthly billing configurations
   - Transaction tracking and processing
   - Credit management and validation

4. **Cron Service** (`cron-service.ts`)
   - Automated billing execution
   - Server ownership verification
   - Error handling and logging

5. **Database Layer**
   - Billing configuration tables
   - Transaction history
   - Server metadata and relationships

## Client-Side Server Creation

### ClientServerCreateModal Component

The `ClientServerCreateModal` component provides a comprehensive interface for users to create VirtFusion servers with the following features:

#### Key Features

- **Multi-step Creation Process**: 
  - `create` - Initial configuration form
  - `building` - Server hardware creation
  - `installing` - OS installation
  - `success` - Server ready notification
  - `failed` - Error handling

- **Real-time Validation**:
  - VirtFusion account verification
  - Token balance checking
  - Form data validation using Zod schemas

- **Dynamic Package Selection**:
  - Searchable package dropdown with pagination
  - Real-time hourly rate calculation
  - Package-specific resource configuration

- **OS Template Management**:
  - Package-specific OS template filtering
  - Searchable templates with category support
  - Version and variant display

#### Form Schema

```typescript
const serverCreateSchema = z.object({
  // Server Creation Fields
  packageId: z.number().int().positive("Package is required"),
  userId: z.number().int().positive("User is required"), 
  hypervisorId: z.number().int().positive("Hypervisor group is required"),
  ipv4: z.number().int().min(0).default(1),
  storage: z.number().int().positive("Storage is required"),
  traffic: z.number().int().min(0).default(0),
  memory: z.number().int().positive("Memory is required"),
  cpuCores: z.number().int().positive("CPU cores is required"),
  networkSpeedInbound: z.number().int().positive().default(1000),
  networkSpeedOutbound: z.number().int().positive().default(1000),
  
  // Self-Service Billing Flags
  selfService: z.number().int().min(0).max(1).default(1),
  selfServiceHourlyCredit: z.boolean().default(true),
  selfServiceHourlyResourcePack: z.number().int().positive().default(1),
  
  // Server Build Fields
  operatingSystemId: z.number().int().positive("Operating System is required"),
  name: z.string().min(1, "Server name is required").max(255),
  hostname: z.string().optional().default(""),
  sshKeys: z.array(z.number().int()).default([]),
  vnc: z.boolean().default(false),
  ipv6: z.boolean().default(false),
  email: z.boolean().default(true),
  swap: z.number().int().min(0).max(8192).default(512)
});
```

#### User Experience Features

1. **Prerequisites Checking**:
   - VirtFusion account linkage verification
   - Token balance validation
   - Clear error messages for missing requirements

2. **Dynamic Resource Configuration**:
   - Auto-population of form fields based on selected package
   - Real-time hourly cost calculation
   - Package-specific OS template filtering

3. **Random Server Name Generation**:
   ```typescript
   const generateRandomServerName = () => {
     const adjectives = ['swift', 'mighty', 'brave', 'noble', 'wise'];
     const nouns = ['server', 'node', 'instance', 'host', 'machine'];
     const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
     const noun = nouns[Math.floor(Math.random() * nouns.length)];
     const number = Math.floor(Math.random() * 999) + 1;
     return `${adjective}-${noun}-${number}`;
   };
   ```

4. **SSH Key Management**:
   - Multi-select SSH key assignment
   - User-specific key filtering
   - Easy key removal interface

## Server Creation Flow

### Step 1: Hardware Creation

```typescript
// Step 1: Create server hardware
setStep('building');
const createResponse = await fetch('/api/user/servers', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

**Process:**
- Validates user token balance
- Creates VirtFusion server instance
- Configures hardware specifications
- Sets up billing record

### Step 2: OS Installation

```typescript
// Step 2: Build server with OS
setStep('installing');
const buildData = {
  operatingSystemId: data.operatingSystemId,
  name: data.name,
  hostname: data.hostname || data.name,
  sshKeys: data.sshKeys,
  vnc: data.vnc,
  ipv6: data.ipv6,
  email: data.email,
  swap: data.swap
};

const buildResponse = await fetch(`/api/user/servers/${createResult.data.id}/build`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(buildData)
});
```

**Process:**
- Installs selected OS template
- Configures server settings
- Sets up SSH keys
- Enables optional features (VNC, IPv6)

### Step 3: Status Monitoring

The system implements dual polling mechanisms for monitoring server creation progress:

#### Queue-Based Polling (Preferred)

```typescript
const startQueuePolling = (vfQueueId: number, serverId: number) => {
  const id = setInterval(async () => {
    try {
      const res = await fetch(`/api/admin/queue/${vfQueueId}`);
      const queueItem = await res.json();
      const itemData = queueItem.data || queueItem;
      
      const finished = itemData.finished !== null && itemData.finished !== undefined;
      const failed = itemData.failed === true || itemData.failed === 1;
      
      if (finished) {
        clearInterval(id);
        if (!failed) {
          setStep("success");
        } else {
          setStep("failed");
        }
        queryClient.invalidateQueries({ queryKey: ["/api/user/servers"] });
      }
    } catch (err) {
      console.error("Queue polling error:", err);
    }
  }, 10000); // 10-second intervals
};
```

#### Server Status Polling (Fallback)

```typescript
const startBuildPolling = (serverId: number) => {
  const id = setInterval(async () => {
    try {
      const res = await fetch(`/api/user/servers/${serverId}`);
      const serverResp = await res.json();
      const serverData = serverResp.data || serverResp;
      
      const tasksActiveFlag = serverData.tasks?.active;
      
      if (tasksActiveFlag === false) {
        clearInterval(id);
        setStep('success');
        queryClient.invalidateQueries({ queryKey: ['/api/user/servers'] });
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 10000);
};
```

## Billing System

### Overview

The billing system supports both hourly and monthly billing models with automatic server ownership verification and token-based charging.

### Billing Models

#### 1. Hourly Billing

- **Frequency**: Every hour via cron job
- **Calculation**: `monthlyPrice / hoursInMonth`
- **Default Hours**: 730 hours per month
- **Tokens**: Converted to tokens (cents) and rounded up

```typescript
const hourlyRate = monthlyPrice / hoursInMonth;
const hourlyTokens = Math.ceil(hourlyRate * 100); // Convert to tokens (cents)
```

#### 2. Monthly Billing

- **Frequency**: 1st of each month at 3 AM UTC
- **Purpose**: Full monthly charges and reconciliation
- **Process**: Handles servers not covered by hourly billing

### Billing Verification Process

Before charging users, the system performs crucial ownership verification:

```typescript
// CRITICAL: Verify server still exists in VirtFusion before charging
const serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
  record.serverUuid, 
  record.userId
);

if (!serverStillOwned) {
  console.warn(`⚠️ Server with UUID ${record.serverUuid} is no longer owned by user ${record.userId}. Disabling billing.`);
  
  // Disable billing for this server
  await storage.db.update(virtfusionHourlyBilling)
    .set({
      billingEnabled: false,
      updatedAt: sql`now()`
    })
    .where(eq(virtfusionHourlyBilling.id, record.id));
  
  continue;
}
```

### Transaction Processing

Each billing cycle creates comprehensive transaction records:

```typescript
// Create transaction record
const createdTransaction = await storage.createTransaction({
  userId: record.userId,
  amount: -Math.abs(hourlyRate), // Negative amount for debit
  description: `VirtFusion Server ${record.serverId} - Hourly Billing (1 hour)`,
  type: "debit",
  status: "pending",
  paymentMethod: "virtfusion_tokens"
});

// Deduct VirtFusion tokens
const virtFusionResult = await virtFusionApi.removeCreditFromUserByExtRelationId(
  record.userId, // Use SkyPANEL user ID as extRelationId
  {
    tokens: hourlyTokens,
    reference_1: createdTransaction.id,
    reference_2: `Hourly billing for server ${record.serverId} - User ID: ${record.userId}`
  }
);

// Update transaction status
await storage.updateTransaction(createdTransaction.id, { status: "completed" });
```

## Cron Service

### CronService Class

The `CronService` class manages all automated billing processes with the following job types:

#### Job Types

1. **Hourly Billing Job** (`this.hourlyBillingJob`)
   - Regular server uptime billing
   - Runs every hour: `'0 * * * *'`

2. **DNS Billing Job** (`this.dnsBillingJob`)
   - Monthly DNS service renewals
   - Runs monthly: `'0 2 1 * *'`

3. **VirtFusion Hourly Job** (`this.virtfusionHourlyJob`)
   - VirtFusion server hourly billing
   - Runs every hour: `'0 * * * *'`

4. **VirtFusion Monthly Job** (`this.virtfusionMonthlyJob`)
   - VirtFusion monthly billing and reconciliation
   - Runs monthly: `'0 3 1 * *'`

### VirtFusion Cron Initialization

```typescript
private async initializeVirtFusionCronJobs() {
  try {
    // Get VirtFusion cron settings
    const settings = await storage.db.select()
      .from(virtfusionCronSettings)
      .orderBy(sql`${virtfusionCronSettings.id} DESC`)
      .limit(1);

    if (settings.length === 0) {
      console.log('No VirtFusion cron settings found, creating default settings');
      await storage.db.insert(virtfusionCronSettings).values({
        enabled: false,
        hoursPerMonth: 730,
        billingOnFirstEnabled: true,
        hourlyBillingEnabled: true
      });
      return;
    }

    const setting = settings[0];
    
    if (!setting.enabled) {
      console.log('VirtFusion cron is disabled');
      return;
    }

    // Initialize hourly billing job (runs every hour)
    if (setting.hourlyBillingEnabled) {
      this.virtfusionHourlyJob = cron.schedule(
        '0 * * * *', // Every hour at minute 0
        async () => {
          await this.runVirtFusionHourlyBilling();
        },
        { timezone: 'UTC' }
      );
      this.virtfusionHourlyJob.start();
      console.log('✅ VirtFusion hourly billing cron job started (every hour)');
    }

    // Initialize monthly billing job
    if (setting.billingOnFirstEnabled) {
      this.virtfusionMonthlyJob = cron.schedule(
        '0 3 1 * *', // 1st day of month at 3 AM UTC
        async () => {
          await this.runVirtFusionMonthlyBilling();
        },
        { timezone: 'UTC' }
      );
      this.virtfusionMonthlyJob.start();
      console.log('✅ VirtFusion monthly billing cron job started (1st of month at 3 AM UTC)');
    }
  } catch (error) {
    console.error('Error initializing VirtFusion cron jobs:', error);
  }
}
```

### Billing Process Flow

#### Hourly Billing Process

```typescript
private async runVirtFusionHourlyBilling() {
  console.log('🕐 Starting VirtFusion hourly billing process...');
  
  try {
    // Get all active billing records with proper joins
    const billingRecords = await storage.db.select({
      id: virtfusionHourlyBilling.id,
      userId: virtfusionHourlyBilling.userId,
      serverId: virtfusionHourlyBilling.serverId,
      virtfusionServerId: virtfusionHourlyBilling.virtfusionServerId,
      serverUuid: virtfusionHourlyBilling.serverUuid,
      packageId: virtfusionHourlyBilling.packageId,
      packageName: virtfusionHourlyBilling.packageName,
      monthlyPrice: virtfusionHourlyBilling.monthlyPrice,
      hourlyRate: virtfusionHourlyBilling.hourlyRate,
      hoursInMonth: virtfusionHourlyBilling.hoursInMonth
    })
    .from(virtfusionHourlyBilling)
    .innerJoin(users, eq(virtfusionHourlyBilling.userId, users.id))
    .innerJoin(packagePricing, eq(virtfusionHourlyBilling.packageId, packagePricing.virtFusionPackageId))
    .where(and(
      eq(virtfusionHourlyBilling.billingEnabled, true),
      eq(users.isActive, true),
      sql`${virtfusionHourlyBilling.monthlyPrice} IS NOT NULL`
    ));

    // Process each billing record
    for (const record of billingRecords) {
      // Verify server ownership before charging
      const serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
        record.serverUuid, 
        record.userId
      );
      
      if (!serverStillOwned) {
        // Disable billing for non-existent servers
        await storage.db.update(virtfusionHourlyBilling)
          .set({ billingEnabled: false })
          .where(eq(virtfusionHourlyBilling.id, record.id));
        continue;
      }
      
      // Calculate and process hourly charge
      const monthlyPrice = parseFloat(record.monthlyPrice.toString());
      const hourlyRate = monthlyPrice / (record.hoursInMonth || 730);
      const hourlyTokens = Math.ceil(hourlyRate * 100);

      // Create transaction and deduct tokens
      const transaction = await storage.createTransaction({
        userId: record.userId,
        amount: -Math.abs(hourlyRate),
        description: `VirtFusion Server ${record.serverId} - Hourly Billing (1 hour)`,
        type: "debit",
        status: "pending",
        paymentMethod: "virtfusion_tokens"
      });

      // Deduct from VirtFusion
      await virtFusionApi.removeCreditFromUserByExtRelationId(
        record.userId,
        {
          tokens: hourlyTokens,
          reference_1: transaction.id,
          reference_2: `Hourly billing for server ${record.serverId}`
        }
      );

      // Update transaction status
      await storage.updateTransaction(transaction.id, { status: "completed" });
    }
  } catch (error) {
    console.error('❌ Error in VirtFusion hourly billing:', error);
  }
}
```

## Database Schema

### VirtFusion Hourly Billing Table

```sql
CREATE TABLE virtfusion_hourly_billing (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  virtfusion_server_id INTEGER NOT NULL,
  server_uuid TEXT, -- VirtFusion server UUID for accurate identification
  package_id INTEGER NOT NULL,
  package_name TEXT NOT NULL,
  monthly_price DECIMAL(10,4) NOT NULL,
  hourly_rate DECIMAL(10,6) NOT NULL,
  hours_in_month INTEGER NOT NULL DEFAULT 730,
  billing_enabled BOOLEAN NOT NULL DEFAULT true,
  last_billed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Key Fields:**
- `server_uuid`: Critical for ownership verification
- `monthly_price`: Base monthly cost for calculations
- `hourly_rate`: Pre-calculated hourly rate
- `billing_enabled`: Flag to disable billing for deleted servers

### VirtFusion Hourly Transactions Table

```sql
CREATE TABLE virtfusion_hourly_transactions (
  id SERIAL PRIMARY KEY,
  billing_id INTEGER NOT NULL REFERENCES virtfusion_hourly_billing(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL,
  server_id INTEGER NOT NULL,
  transaction_id INTEGER,
  hours_billed DECIMAL(4,2) NOT NULL DEFAULT '1.0',
  amount_charged DECIMAL(10,4) NOT NULL,
  billing_period_start TIMESTAMP NOT NULL,
  billing_period_end TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Purpose:**
- Tracks each hourly billing cycle
- Links to main transaction system
- Provides billing period audit trail

### VirtFusion Cron Settings Table

```sql
CREATE TABLE virtfusion_cron_settings (
  id SERIAL PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  hours_per_month INTEGER NOT NULL DEFAULT 730,
  billing_on_first_enabled BOOLEAN NOT NULL DEFAULT true,
  hourly_billing_enabled BOOLEAN NOT NULL DEFAULT true,
  last_monthly_billing TIMESTAMP,
  last_hourly_billing TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Configuration Options:**
- `enabled`: Master switch for VirtFusion billing
- `hours_per_month`: Configurable month duration for calculations
- `billing_on_first_enabled`: Enable monthly billing job
- `hourly_billing_enabled`: Enable hourly billing job

## API Integration

### VirtFusion API Service

The system integrates with VirtFusion through several key API endpoints:

#### Server Creation

```typescript
// Create server hardware
await virtFusionApi.createServer({
  packageId: data.packageId,
  userId: data.userId,
  hypervisorId: data.hypervisorId,
  // ... other server configuration
});

// Build server with OS
await virtFusionApi.buildServer(serverId, {
  operatingSystemId: data.operatingSystemId,
  name: data.name,
  hostname: data.hostname,
  // ... build configuration
});
```

#### Server Verification

```typescript
// Verify server ownership using UUID
const serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
  serverUuid, 
  userId
);
```

#### Credit Management

```typescript
// Deduct credits from user account
await virtFusionApi.removeCreditFromUserByExtRelationId(
  userId, // SkyPANEL user ID as extRelationId
  {
    tokens: amount,
    reference_1: transactionId,
    reference_2: description
  }
);
```

### API Request Patterns

#### Server Creation Request

```json
{
  "packageId": 123,
  "userId": 456,
  "hypervisorId": 789,
  "ipv4": 1,
  "storage": 20,
  "traffic": 0,
  "memory": 1024,
  "cpuCores": 1,
  "networkSpeedInbound": 1000,
  "networkSpeedOutbound": 1000,
  "selfService": 1,
  "selfServiceHourlyCredit": true,
  "selfServiceHourlyResourcePack": 1
}
```

#### Server Build Request

```json
{
  "operatingSystemId": 101,
  "name": "swift-server-123",
  "hostname": "swift-server-123",
  "sshKeys": [1, 2, 3],
  "vnc": false,
  "ipv6": false,
  "email": true,
  "swap": 512
}
```

## Configuration

### Environment Variables

The system requires several environment variables for proper operation:

```bash
# VirtFusion API Configuration
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_api_key_here

# Billing Configuration
VIRTFUSION_SELF_SERVICE=1
VIRTFUSION_SELF_SERVICE_HOURLY_CREDIT=true
VIRTFUSION_SELF_SERVICE_HOURLY_RESOURCE_PACK_ID=1
VIRTFUSION_DEFAULT_RESOURCE_PACK_ID=1

# Database Configuration
DATABASE_URL=postgres://user:pass@host:port/database

# Cron Configuration
NODE_ENV=production
TZ=UTC
```

### Admin Settings

Administrators can configure billing settings through the admin panel:

#### VirtFusion Cron Settings

- **Enable/Disable**: Master switch for all VirtFusion billing
- **Hourly Billing**: Toggle hourly billing job
- **Monthly Billing**: Toggle monthly billing job
- **Hours Per Month**: Configurable month duration (default: 730)

#### Self-Service Settings

- **Self Service Mode**: Enable user self-service server creation
- **Hourly Credit**: Enable hourly credit billing
- **Resource Pack ID**: Default resource pack for new servers

## Usage Guide

### For End Users

#### Creating a Server

1. **Prerequisites**:
   - Linked VirtFusion account
   - Sufficient VirtFusion tokens in account
   - Access to server creation interface

2. **Creation Process**:
   - Click "Create Server" button
   - Select desired package from dropdown
   - Choose datacenter location (hypervisor group)
   - Enter server name or generate random name
   - Select operating system template
   - Configure optional settings (SSH keys, VNC, etc.)
   - Click "Create Server" to begin process

3. **Monitoring Progress**:
   - Track hardware creation phase
   - Monitor OS installation progress
   - Receive success/failure notifications
   - Access server details upon completion

#### Understanding Billing

- **Hourly Charges**: Servers are billed hourly based on package cost
- **Token Deduction**: Charges are automatically deducted from VirtFusion tokens
- **Billing Verification**: System verifies server ownership before charging
- **Transaction History**: All charges are recorded in transaction history

### For Administrators

#### Managing Billing Settings

1. **Access Admin Panel**: Navigate to `/admin/settings`
2. **VirtFusion Configuration**: Configure billing parameters
3. **Cron Management**: Enable/disable automated billing
4. **Monitor Transactions**: Review billing transaction history

#### Troubleshooting Billing Issues

1. **Check Cron Status**: Verify cron jobs are running
2. **Review Logs**: Examine billing process logs
3. **Validate Server Ownership**: Ensure servers exist in VirtFusion
4. **Monitor Token Balances**: Verify user token availability

## Troubleshooting

### Common Issues

#### 1. Server Creation Failures

**Symptoms:**
- Server creation gets stuck in "building" phase
- Error messages during OS installation
- Timeout during server provisioning

**Solutions:**
```typescript
// Check server creation logs
console.log("Server creation result:", createResult);

// Verify API response format
const serverData = createResult.data || createResult;

// Check polling mechanism
if (queueId) {
  startQueuePolling(queueId, serverId);
} else {
  startBuildPolling(serverId);
}
```

#### 2. Billing Process Errors

**Symptoms:**
- Servers not being billed hourly
- Ownership verification failures
- Token deduction errors

**Diagnostics:**
```sql
-- Check billing records
SELECT * FROM virtfusion_hourly_billing 
WHERE billing_enabled = true;

-- Check recent transactions
SELECT * FROM virtfusion_hourly_transactions 
ORDER BY created_at DESC LIMIT 10;

-- Check cron settings
SELECT * FROM virtfusion_cron_settings;
```

**Solutions:**
- Verify VirtFusion API connectivity
- Check server UUID accuracy
- Validate user token balances
- Review cron job status

#### 3. Cron Job Issues

**Symptoms:**
- Billing jobs not executing
- Cron status showing inactive
- Scheduling configuration errors

**Solutions:**
```typescript
// Check cron status
const status = await cronService.getCronStatus();
console.log('Cron status:', status);

// Manually trigger billing
await cronService.triggerVirtFusionHourlyBilling();

// Restart cron jobs
await cronService.restartVirtFusionCronJobs();
```

### Debug Commands

#### Database Queries

```sql
-- Check active billing records
SELECT vhb.*, u.username, u.email 
FROM virtfusion_hourly_billing vhb
JOIN users u ON vhb.user_id = u.id
WHERE vhb.billing_enabled = true;

-- Check recent billing transactions
SELECT vht.*, vhb.package_name, u.username
FROM virtfusion_hourly_transactions vht
JOIN virtfusion_hourly_billing vhb ON vht.billing_id = vhb.id
JOIN users u ON vht.user_id = u.id
ORDER BY vht.created_at DESC
LIMIT 20;

-- Check cron settings and status
SELECT * FROM virtfusion_cron_settings 
ORDER BY updated_at DESC LIMIT 1;
```

#### API Testing

```typescript
// Test VirtFusion API connectivity
const testConnection = async () => {
  try {
    await virtFusionApi.updateSettings();
    console.log('✅ VirtFusion API connection successful');
  } catch (error) {
    console.error('❌ VirtFusion API connection failed:', error);
  }
};

// Test server ownership verification
const testOwnership = async (serverUuid, userId) => {
  try {
    const owned = await virtFusionApi.verifyServerOwnershipByUuid(serverUuid, userId);
    console.log(`Server ${serverUuid} owned by user ${userId}:`, owned);
  } catch (error) {
    console.error('Ownership verification failed:', error);
  }
};
```

### Log Analysis

#### Cron Process Logs

```bash
# Look for VirtFusion billing logs
grep "VirtFusion.*billing" /var/log/application.log

# Check for ownership verification
grep "Cross-checking server ownership" /var/log/application.log

# Monitor token deductions
grep "VirtFusion token deduction" /var/log/application.log
```

#### Application Logs

```bash
# Server creation logs
grep "Creating server with data" /var/log/application.log

# Billing process logs
grep "hourly billing process" /var/log/application.log

# Error tracking
grep "ERROR.*VirtFusion" /var/log/application.log
```

## Security Considerations

### Access Control

1. **User Authentication**: All server creation requires authenticated users
2. **VirtFusion Account Linking**: Users must have linked VirtFusion accounts
3. **Token Balance Verification**: Prevents server creation without sufficient funds
4. **Admin-Only Configuration**: Billing settings restricted to administrators

### Data Protection

1. **Server UUID Verification**: Prevents billing for non-existent servers
2. **Transaction Logging**: Complete audit trail for all billing activities
3. **Ownership Validation**: Real-time server ownership checking
4. **Secure API Communication**: Encrypted communication with VirtFusion API

### Billing Security

```typescript
// Server ownership verification before billing
const serverStillOwned = await virtFusionApi.verifyServerOwnershipByUuid(
  record.serverUuid, 
  record.userId
);

if (!serverStillOwned) {
  // Immediately disable billing to prevent unauthorized charges
  await storage.db.update(virtfusionHourlyBilling)
    .set({ billingEnabled: false })
    .where(eq(virtfusionHourlyBilling.id, record.id));
  
  console.log(`✅ Disabled billing for non-owned server: ${record.serverUuid}`);
  continue;
}
```

### Error Handling

1. **Transaction Rollback**: Failed billing attempts don't charge users
2. **Graceful Degradation**: System continues operating despite individual failures
3. **Comprehensive Logging**: Detailed error tracking for debugging
4. **Automatic Recovery**: Self-healing mechanisms for common issues

## Performance Optimization

### Database Optimization

1. **Indexed Queries**: Proper indexing on frequently queried fields
2. **Connection Pooling**: Efficient database connection management
3. **Batch Processing**: Bulk operations for billing processes
4. **Query Optimization**: Optimized joins and filtering

### API Optimization

1. **Request Batching**: Minimize API calls to VirtFusion
2. **Caching**: Intelligent caching of frequently accessed data
3. **Rate Limiting**: Respect VirtFusion API rate limits
4. **Connection Reuse**: Persistent connections for better performance

### Cron Optimization

1. **Staggered Execution**: Distribute billing load across time
2. **Error Recovery**: Automatic retry mechanisms for failed operations
3. **Resource Management**: Efficient memory and CPU usage
4. **Progress Monitoring**: Real-time process tracking and reporting

## Future Enhancements

### Planned Features

1. **Advanced Billing Models**:
   - Usage-based billing (CPU, memory, storage)
   - Tiered pricing structures
   - Custom billing cycles

2. **Enhanced Monitoring**:
   - Real-time server status tracking
   - Performance metrics collection
   - Automated alerting system

3. **User Experience Improvements**:
   - Server templates and presets
   - Bulk server operations
   - Advanced server configuration options

4. **Administrative Tools**:
   - Billing analytics dashboard
   - Server usage reporting
   - Cost optimization recommendations

### Technical Improvements

1. **Microservices Architecture**: Separate billing and server management services
2. **Event-Driven Processing**: Asynchronous billing event handling
3. **Advanced Caching**: Redis-based caching for improved performance
4. **API Versioning**: Support for multiple VirtFusion API versions

## Conclusion

The VirtFusion Server Creation and Billing System provides a comprehensive solution for automated VPS management and billing. With its robust client-side interface, automated billing processes, and extensive monitoring capabilities, it enables seamless server provisioning while maintaining accurate financial tracking.

The system's architecture prioritizes security, reliability, and user experience, making it suitable for production environments handling multiple users and servers. Regular monitoring and maintenance ensure optimal performance and billing accuracy.

For additional support or feature requests, please refer to the main SkyPANEL documentation or contact the development team.