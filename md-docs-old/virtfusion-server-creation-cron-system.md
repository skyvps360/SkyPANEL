# VirtFusion Server Creation & Managed Cron System

## Overview

This document outlines the architecture and implementation details for:

- **VirtFusion Client Server Creation**: How SkyPANEL interacts with the VirtFusion API to create, manage, and secure VPS instances.
- **Managed Cron System**: The suite of scheduled jobs that run hourly, monthly, and utilize VirtFusion’s built-in scheduling features to automate maintenance, billing, and orchestration tasks.

## 1. VirtFusion API Client Setup

SkyPANEL uses a singleton `virtFusionApi` client in `server/virtfusion-api.ts` to communicate with the VirtFusion platform.

### 1.1 Configuration

Environment variables in `.env`:

```bash
VIRTFUSION_API_URL=https://api.virtfusion.example.com
VIRTFUSION_API_TOKEN=your_api_token_here
```

### 1.2 Instantiation

```typescript
import { VirtFusionApi } from "./virtfusion-api";

export const virtFusionApi = VirtFusionApi.getInstance({
  baseUrl: process.env.VIRTFUSION_API_URL!,
  token: process.env.VIRTFUSION_API_TOKEN!,
});
```

- Enforces **singleton pattern** to reuse HTTP connections.
- All calls attach `extRelationId` (user ID) for multi-tenant security.

## 2. Server Creation Workflow

### 2.1 Express Route

```typescript
import { Router } from "express";
import { requireAuth } from "../middleware";
import { virtFusionApi } from "../virtfusion-api";
import { storage } from "../storage";

const router = Router();

router.post("/servers/create", requireAuth, async (req, res) => {
  try {
    const { planId, region } = req.body;
    const userId = req.session.user.id;

    // Create server via VirtFusion
    const vfResponse = await virtFusionApi.createServer({
      extRelationId: userId.toString(),
      planId,
      region,
      dryRun: false,
    });

    // Persist in our database
    const serverRecord = await storage.createServer({
      userId,
      virtfusionId: vfResponse.id,
      planId,
      region,
    });

    res.status(201).json(serverRecord);
  } catch (error) {
    console.error("Server creation error:", error);
    res.status(500).json({ error: "Server creation failed" });
  }
});

export default router;
```

### 2.2 Storage Layer

All database operations go through `server/storage.ts` using Drizzle ORM:

```typescript
export interface IStorage {
  createServer(params: {
    userId: number;
    virtfusionId: string;
    planId: string;
    region: string;
  }): Promise<ServerRecord>;
  // ...other methods...
}
```

## 3. Managed Cron System Architecture

SkyPANEL relies on a hybrid cron framework:

1. **Hourly Cron Jobs**: Triggered every hour for real-time sync and billing.
2. **Monthly Cron Jobs**: Run at month-end for invoicing and cleanup.
3. **VirtFusion-Managed Schedules**: Use VirtFusion’s native scheduling when available (e.g., snapshots, backups).

### 3.1 Hourly Cron

- **Location**: `server/scripts/hourlyCron.ts`
- **Scheduler**: [node-cron](https://www.npmjs.com/package/node-cron)

**Key Tasks**:

- Sync server status and metrics
- Calculate hourly billing increments
- Auto-scale triggers (optional)

```typescript
import cron from "node-cron";
import { virtFusionApi } from "../virtfusion-api";
import { storage } from "../storage";

// Runs at the top of every hour
cron.schedule("0 * * * *", async () => {
  try {
    const activeServers = await storage.getServersByStatus("active");
    for (const server of activeServers) {
      const status = await virtFusionApi.getServerStatus({ id: server.virtfusionId });
      await storage.updateServerMetrics(server.id, status.metrics);
      await storage.recordHourlyBilling({ serverId: server.id, usage: status.uptime });
    }
    console.log("Hourly cron completed at", new Date());
  } catch (err) {
    console.error("Hourly cron error:", err);
  }
});
```

### 3.2 Monthly Cron

- **Location**: `server/scripts/monthlyCron.ts`
- **Scheduler**: [node-cron](https://www.npmjs.com/package/node-cron) or PM2 scheduler config

**Key Tasks**:

- Generate invoices for each user
- Suspend unpaid accounts
- Cleanup stale resources

```typescript
import cron from "node-cron";
import { storage } from "../storage";

// Runs at midnight on the first day of each month
cron.schedule("0 0 1 * *", async () => {
  try {
    const invoices = await storage.generateMonthlyInvoices();
    await storage.sendInvoices(invoices);
    await storage.suspendOverdueServers();
    console.log("Monthly cron executed at", new Date());
  } catch (error) {
    console.error("Monthly cron error:", error);
  }
});
```

### 3.3 VirtFusion-Managed Scheduling

For operations like automated snapshots and backups, SkyPANEL delegates to VirtFusion’s built-in scheduler:

1. Use `virtFusionApi.scheduleTask()` with cron expressions.
2. Store returned schedule IDs to allow updates or cancellations.

```typescript
await virtFusionApi.scheduleTask({
  extRelationId: userId,
  serverId: vfServerId,
  task: "snapshot",
  schedule: "0 3 * * *", // daily at 3AM
});
```

## 4. Deployment & Monitoring

### 4.1 PM2 Configuration

In `pm2.config.windows.cjs`:

```js
module.exports = {
  apps: [
    {
      name: "sky-hourly-cron",
      script: "server/scripts/hourlyCron.ts",
      interpreter: "npx tsx",
      cron_restart: "0 * * * *",
    },
    {
      name: "sky-monthly-cron",
      script: "server/scripts/monthlyCron.ts",
      interpreter: "npx tsx",
      cron_restart: "0 0 1 * *",
    },
  ],
};
```

### 4.2 Logging & Alerts

- All cron jobs log to console and are captured by PM2’s log files.
- Critical failures trigger alerts to Discord via `server/discord-service.ts`.

## 5. Security & Best Practices

- **Ownership Filtering**: Always include `extRelationId` in VirtFusion calls.
- **Dry-Run Validation**: Use `dryRun=true` during testing to validate API payloads.
- **Error Handling**: Graceful retries and fallbacks for network issues.
- **Secrets Management**: Use secure storage for API tokens (e.g., Vault or environment variables).

## 6. References

- VirtFusion API docs: `virtfusions-api.yaml` in root
- Cron package: [node-cron](https://www.npmjs.com/package/node-cron)
- Drizzle ORM: [Drizzle ORM](https://orm.drizzle.team/)
- PM2 Scheduler: [PM2 Scheduler](https://pm2.keymetrics.io/)
