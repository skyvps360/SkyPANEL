---
applyTo: '**'
---
# GitHub Copilot Guide for SkyPANEL

This document provides guidance for using GitHub Copilot with the SkyPANEL codebase, including common patterns, best practices, and specific examples for different parts of the application.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Common Development Tasks](#common-development-tasks)
  - [Backend Development](#backend-development)
  - [Frontend Development](#frontend-development)
  - [Database Operations](#database-operations)
  - [VirtFusion Integration](#virtfusion-integration)
  - [Discord Integration](#discord-integration)
  - [AI Features](#ai-features)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Overview

SkyPANEL is an enterprise-grade VirtFusion client portal built with TypeScript, React, Node.js/Express, and PostgreSQL. It provides a comprehensive solution for VPS hosting management with features including:

- VirtFusion integration for VPS management
- AI-powered support using Google Gemini
- Real-time monitoring with BetterStack
- Discord integration for notifications and support
- Dynamic brand theming system
- Comprehensive billing and user management

## Architecture

### Backend Architecture

- **Express.js Server**: Main application server
- **PostgreSQL**: Primary database with Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **API Structure**: RESTful endpoints with proper validation
- **Services**: Business logic separated into service modules

### Frontend Architecture

- **React 18**: Modern UI with hooks and functional components
- **TypeScript**: For type safety throughout the application
- **Vite**: Modern build tool for frontend
- **TailwindCSS**: Utility-first CSS with Shadcn/UI components
- **State Management**: React Query for server state, React Context for UI state
- **Routing**: Wouter for lightweight routing

## Common Development Tasks

### Backend Development

#### Creating a New API Endpoint

```typescript
// 1. Define route in server/routes/yourModule.ts
import { Router } from "express";
import { z } from "zod";
import { checkSchema } from "../check-schema";

const router = Router();

// Validation schema
const exampleSchema = z.object({
  name: z.string().min(3),
  value: z.number().positive()
});

// Create endpoint with validation
router.post("/example", 
  checkSchema(exampleSchema),
  async (req, res) => {
    try {
      const { name, value } = req.body;
      
      // Call service function
      const result = await yourService.createExample(name, value);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Error creating example:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to create example"
      });
    }
  }
);

export default router;
```

#### Creating a New Service

```typescript
// server/your-service.ts
import { db } from "./db";
import { yourTable } from "../shared/schema";

export const yourService = {
  async findById(id: number) {
    return await db.query.yourTable.findFirst({
      where: eq(yourTable.id, id)
    });
  },
  
  async create(data: InsertYourTable) {
    return await db.insert(yourTable).values(data).returning();
  },
  
  // Additional methods...
};
```

### Frontend Development

#### Creating a New React Component

```typescript
// client/src/components/YourComponent.tsx
import { useState } from "react";
import { Button } from "./ui/button";
import { useToast } from "../hooks/use-toast";

interface YourComponentProps {
  title: string;
  onAction: () => Promise<void>;
}

export function YourComponent({ title, onAction }: YourComponentProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const handleClick = async () => {
    try {
      setLoading(true);
      await onAction();
      toast({
        title: "Success",
        description: "Action completed successfully",
        variant: "success"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete action",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="p-4 border rounded-md">
      <h3 className="text-lg font-medium">{title}</h3>
      <Button 
        onClick={handleClick} 
        disabled={loading}
      >
        {loading ? "Processing..." : "Take Action"}
      </Button>
    </div>
  );
}
```

#### Using React Query for Data Fetching

```typescript
// client/src/hooks/use-servers.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useServers() {
  const queryClient = useQueryClient();
  
  const serversQuery = useQuery({
    queryKey: ["servers"],
    queryFn: async () => {
      const response = await api.get("/api/servers");
      return response.data;
    }
  });
  
  const powerOnMutation = useMutation({
    mutationFn: (serverId: number) => 
      api.post(`/api/servers/${serverId}/power`, { action: "power_on" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
    }
  });
  
  return {
    servers: serversQuery.data,
    isLoading: serversQuery.isLoading,
    error: serversQuery.error,
    powerOn: powerOnMutation.mutate
  };
}
```

### Database Operations

#### Adding a New Table

```typescript
// 1. Add to shared/schema.ts
export const newFeature = pgTable("new_feature", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").references(() => users.id),
  isActive: boolean("is_active").default(true),
  metadata: json("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// 2. Create validation schemas
export const insertNewFeatureSchema = createInsertSchema(newFeature).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertNewFeature = z.infer<typeof insertNewFeatureSchema>;
export type NewFeature = typeof newFeature.$inferSelect;

// 3. Create a migration script
// scripts/add-new-feature-table.ts
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(migrationClient);

const main = async () => {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS new_feature (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      user_id INTEGER REFERENCES users(id),
      is_active BOOLEAN DEFAULT TRUE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  
  console.log("New feature table created successfully");
};

main()
  .catch(e => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await migrationClient.end();
  });
```

### VirtFusion Integration

When working with VirtFusion API, follow these patterns:

```typescript
// Adding a new VirtFusion API integration
import { virtFusionApiService } from "./virtfusion-api";

// In virtfusion-service.ts
export const virtFusionService = {
  // Existing methods...
  
  async getServerStats(serverId: number) {
    try {
      const response = await virtFusionApiService.get(
        `/servers/${serverId}/stats`
      );
      
      if (!response.success) {
        throw new Error(response.message || "Failed to get server stats");
      }
      
      return response.data;
    } catch (error) {
      console.error("Error fetching server stats:", error);
      throw error;
    }
  },
  
  // Additional methods...
};
```

### Discord Integration

When working with Discord integration:

```typescript
// Adding a new Discord notification type
import { discordBotService } from "./discord-bot-service";

// Send a notification to Discord
await discordBotService.sendNotification({
  type: "server_event", // Notification type
  title: "Server Status Change",
  description: `Server ${serverName} (ID: ${serverId}) is now ${status}`,
  fields: [
    { name: "User", value: userName },
    { name: "Action", value: action },
    { name: "Timestamp", value: new Date().toISOString() }
  ],
  color: status === "online" ? 0x00FF00 : 0xFF0000
});
```

### AI Features

When working with AI features using Google Gemini:

```typescript
// Using the Gemini service for AI-powered responses
import { geminiService } from "./gemini-service";

const generateResponse = async (ticketContent: string) => {
  try {
    const response = await geminiService.generateResponse({
      prompt: `Help me respond to this support ticket: ${ticketContent}`,
      maxTokens: 500,
      temperature: 0.7
    });
    
    return response;
  } catch (error) {
    console.error("Error generating AI response:", error);
    return "I couldn't generate a response at this time. Please try again later.";
  }
};
```

## Testing

For testing new features, follow these guidelines:

1. **Backend Testing**: Test API endpoints with Postman or using the built-in test utilities
2. **Frontend Testing**: Test UI components with various edge cases and error states
3. **Integration Testing**: Test the full flow from UI to database and back

## Deployment

The deployment process involves:

1. Building the application with `npm run build`
2. Running migrations with the appropriate script
3. Starting the production server with `npm start` or using PM2

## Troubleshooting

When encountering issues:

1. Check the server logs for detailed error information
2. Verify database connections and schema migrations
3. Check VirtFusion API status and connection
4. Verify environment variables are correctly set
5. For frontend issues, check the browser console for errors
