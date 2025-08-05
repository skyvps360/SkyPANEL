# SkyPANEL - GitHub Copilot Instructions

## Project Overview
SkyPANEL is a full-stack VPS hosting management platform built with TypeScript, React, Node.js, and PostgreSQL. It integrates with VirtFusion API for server management, PayPal for billing, Discord for support, and Google Gemini AI for intelligent assistance.

## Architecture & Tech Stack

### Frontend (client/)
- **Framework**: React 18 with TypeScript, built with Vite
- **UI**: Shadcn/UI components (Radix UI + TailwindCSS)
- **State Management**: TanStack Query for server state, React Context for app state
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation
- **Styling**: TailwindCSS with dynamic theming system

### Backend (server/)
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **External APIs**: VirtFusion, PayPal, Discord, Google Gemini
- **Build**: ESBuild for production, tsx for development

### Database Patterns
- **ORM**: Drizzle ORM with type-safe schema definitions in `shared/schemas/`
- **Migrations**: Manual scripts in `scripts/` directory using Drizzle raw SQL
- **Storage**: Centralized storage layer in `server/storage.ts` implementing `IStorage` interface
- **Connection**: PostgreSQL connection pool with proper error handling

## Key Integration Points

### VirtFusion API (`server/virtfusion-api.ts`)
- Singleton pattern: `virtFusionApi` instance
- All API calls use local `user.id` as `extRelationId` for security
- Error handling with retry logic and fallback endpoints
- Rate limiting and request queuing for high-volume operations
- **Critical**: Server filtering by owner ID to prevent data leaks

### Discord Integration
- **Bot Service**: `server/discord-bot-service.ts` - main coordinator
- **Core Service**: `server/discord/discord-bot-core.ts` - handles Discord client
- **Ticket Service**: Two-way sync between Discord threads and support tickets
- **Webhook Service**: `server/discord-service.ts` for notifications
- **Commands**: Slash commands for status, tickets, AI chat, moderation

### Database Schema Organization
- **Schema Files**: Domain-specific schemas in `shared/schemas/` (user-schema.ts, server-schema.ts, etc.)
- **Migration Scripts**: `scripts/` directory with standalone migration files
- **Storage Layer**: `server/storage.ts` implements all database operations
- **Type Safety**: Drizzle generates types from schema definitions

## Development Patterns

### Component Architecture
```typescript
// Standard component pattern with proper imports
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
```

### API Route Patterns
```typescript
// Express route with proper error handling
import { Router } from "express";
import { storage } from "../storage";
import { requireAuth } from "../middleware";

const router = Router();

router.post("/endpoint", requireAuth, async (req, res) => {
  try {
    // Validate input with Zod
    const validatedData = schema.parse(req.body);
    
    // Business logic
    const result = await storage.operation(validatedData);
    
    res.json(result);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Operation failed" });
  }
});
```

### Database Operations
```typescript
// Use storage layer, not direct DB calls
await storage.createUser(userData);
await storage.getServersByUserId(userId);

// For new operations, add to storage.ts interface first
interface IStorage {
  newOperation(params: Type): Promise<ReturnType>;
}
```

## Critical Development Guidelines

### VirtFusion Security
- **Always** filter API responses by user ownership
- Use `getUserServers()` method, never generic server endpoints
- Include `extRelationId` validation in all user operations

### Database Best Practices
- **Schema Changes**: Create migration scripts in `scripts/`
- **New Tables**: Add schema to appropriate file in `shared/schemas/`
- **Operations**: Use storage layer, not direct Drizzle calls
- **Types**: Import from `@shared/schema`, not individual files

### Frontend Conventions
- **Components**: Use Shadcn/UI components consistently
- **State**: TanStack Query for server state, React hooks for local state
- **Forms**: React Hook Form + Zod validation pattern
- **Routing**: Wouter with `ProtectedRoute` and `AdminProtectedRoute` wrappers
- **Theming**: Use `getBrandColors()` for dynamic theming

### Error Handling
- **Frontend**: Use `useToast()` hook for user feedback
- **Backend**: Log errors with context, return generic messages to client
- **Discord**: Graceful degradation when Discord services unavailable
- **VirtFusion**: Fallback handling for API failures

## Environment & Configuration
- **Database**: `DATABASE_URL` for PostgreSQL connection
- **VirtFusion**: `VIRTFUSION_API_URL`, `VIRTFUSION_API_TOKEN`
- **Discord**: `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_WEBHOOK_URL`
- **PayPal**: PayPal SDK configuration for billing
- **AI**: Google Gemini API for intelligent support

## Common Development Tasks

### Adding New Features
1. Define schema in `shared/schemas/` if database changes needed
2. Create migration script if new tables/columns required
3. Add storage methods to `server/storage.ts`
4. Implement API routes in `server/routes/`
5. Create frontend components using established patterns
6. Add proper TypeScript types throughout

### Database Changes
```bash
# 1. Add schema definition
# 2. Create migration script
npm run ts scripts/add-new-table.ts

# 3. Update storage layer with new operations
# 4. Test migration thoroughly
```

### VirtFusion Integration
- Always use `virtFusionApi` singleton instance
- Test with `dryRun=true` for server creation operations
- Implement proper error handling and user feedback
- Filter all responses by user ownership

This codebase prioritizes type safety, proper error handling, and secure API integration. Follow established patterns for consistency and maintainability.
