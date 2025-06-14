---
applyTo: '**'
---
# GitHub Copilot Instructions for SkyPANEL

This document provides instructions for GitHub Copilot to better understand and generate code for the SkyPANEL project.

## Project Overview

SkyPANEL is an enterprise-grade VirtFusion client portal built with TypeScript, React, Node.js/Express, and PostgreSQL. It provides a comprehensive solution for VPS hosting management with features including:

- VirtFusion integration for VPS management
- AI-powered support using Google Gemini
- Real-time monitoring with BetterStack
- Discord integration for notifications and support
- Dynamic brand theming system
- Comprehensive billing and user management

## Project Structure

- **client**: Frontend React application
  - **src**: Source code for the frontend
    - **components**: Reusable UI components
    - **pages**: Page components
    - **lib**: Utility functions and hooks
- **server**: Backend Express application
  - **routes**: API route handlers
  - **services**: Business logic
  - **middleware**: Express middleware
- **shared**: Code shared between frontend and backend
- **scripts**: Utility scripts for development and deployment
- **migrations**: Database migration scripts
- **tests**: Test files

## Coding Conventions

### General Conventions

- Use TypeScript for all code
- Use functional components with hooks for React
- Follow a RESTful API design pattern
- Use Zod for schema validation
- Use Drizzle ORM for database operations
- Use React Query for data fetching and caching

### Naming Conventions

- **Files**: Use kebab-case for filenames (e.g., `user-service.ts`)
- **Components**: Use PascalCase for component names (e.g., `UserProfile.tsx`)
- **Functions**: Use camelCase for function names (e.g., `getUserData`)
- **Variables**: Use camelCase for variable names (e.g., `userData`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_RETRY_COUNT`)
- **Types/Interfaces**: Use PascalCase for types and interfaces (e.g., `UserData`)
- **Database Tables**: Use snake_case for database table names (e.g., `user_profiles`)

### Import Order

1. External libraries
2. Internal modules (using path aliases)
3. Local modules (relative paths)
4. CSS/SCSS imports

Example:
```typescript
// External libraries
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

// Internal modules (using path aliases)
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Local modules (relative paths)
import { formatDate } from './utils';

// CSS imports
import './styles.css';
```

## Backend Patterns

### API Endpoint Creation

When creating a new API endpoint, follow this pattern:

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

### Service Creation

When creating a new service, follow this pattern:

```typescript
// server/your-service.ts
import { db } from "./db";
import { yourTable } from "../shared/schema";
import { eq } from "drizzle-orm";

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

### Error Handling

Use consistent error handling:

```typescript
try {
  // Operation that might fail
} catch (error) {
  console.error("Descriptive error message:", error);
  throw new Error("User-friendly error message");
}
```

## Frontend Patterns

### React Component Creation

When creating a new React component, follow this pattern:

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

### React Query Usage

When using React Query for data fetching, follow this pattern:

```typescript
// client/src/hooks/use-data.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useData() {
  const queryClient = useQueryClient();
  
  const dataQuery = useQuery({
    queryKey: ["data"],
    queryFn: async () => {
      const response = await api.get("/api/data");
      return response.data;
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: (newData: any) => 
      api.post("/api/data", newData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["data"] });
    }
  });
  
  return {
    data: dataQuery.data,
    isLoading: dataQuery.isLoading,
    error: dataQuery.error,
    update: updateMutation.mutate
  };
}
```

## Database Patterns

### Table Definition

When defining a new database table, follow this pattern:

```typescript
// shared/schema.ts
import { pgTable, serial, text, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export const insertNewFeatureSchema = createInsertSchema(newFeature).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export type InsertNewFeature = z.infer<typeof insertNewFeatureSchema>;
export type NewFeature = typeof newFeature.$inferSelect;
```

## Testing Patterns

When writing tests, follow this pattern:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { functionToTest } from '../path/to/function';

describe('Component or Function Name', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'some input';
    
    // Act
    const result = functionToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
  
  it('should handle errors correctly', () => {
    // Arrange
    const mockFn = vi.fn().mockRejectedValue(new Error('Test error'));
    
    // Act & Assert
    expect(async () => {
      await functionToTest(mockFn);
    }).rejects.toThrow('Test error');
  });
});
```

## Integration Patterns

### VirtFusion Integration

When working with VirtFusion API, follow this pattern:

```typescript
import { virtFusionApiService } from "./virtfusion-api";

export const virtFusionService = {
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
  }
};
```

### Discord Integration

When working with Discord integration, follow this pattern:

```typescript
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

When working with AI features using Google Gemini, follow this pattern:

```typescript
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

## Routing Patterns

When adding new routes to the application, follow this pattern:

```typescript
// In AppRouter.tsx
import { Route } from "wouter";
import { ProtectedRoute, AdminProtectedRoute } from "@/lib/protected-route-new";
import YourComponent from "@/pages/your-component";

// Public route
<Route path="/your-public-path" component={YourComponent} />

// Protected route (requires authentication)
<ProtectedRoute path="/your-protected-path" component={YourComponent} />

// Admin route (requires admin privileges)
<AdminProtectedRoute path="/admin/your-admin-path" component={YourComponent} />
```

## Best Practices

1. **Type Safety**: Always use proper TypeScript types and avoid using `any`
2. **Error Handling**: Always handle errors properly and provide meaningful error messages
3. **Validation**: Always validate user input using Zod schemas
4. **Testing**: Write tests for critical functionality
5. **Documentation**: Document complex functions and components
6. **Performance**: Be mindful of performance implications, especially for database queries
7. **Security**: Follow security best practices, especially for user authentication and data validation
8. **Accessibility**: Ensure UI components are accessible
9. **Responsive Design**: Ensure UI components work well on different screen sizes
10. **Code Reuse**: Extract reusable logic into hooks or utility functions


# GitHub Copilot Usage Guidelines for SkyPANEL

This document provides guidance for using GitHub Copilot effectively with the SkyPANEL codebase. Copilot can significantly improve your productivity by suggesting code completions, helping with boilerplate, and generating comments.

## Setting Up Copilot

1. Make sure you have GitHub Copilot installed in your editor (VS Code, JetBrains, etc.)
2. Ensure you have proper access to use Copilot (either through personal subscription or organization)
3. Configure Copilot settings for TypeScript/JavaScript development

## Effective Usage Patterns

### Backend Development (Node.js/Express)

When working with the backend codebase, Copilot can help with:

- **API Routes**: Copilot can suggest route handlers based on existing patterns
  ```typescript
  // Example: Start typing a new route handler and Copilot will suggest completions
  router.post("/tickets", isAuthenticated, checkSchema(createTicketSchema), async (req, res) => {
    // Copilot will suggest implementation based on similar routes
  });
  ```

- **Service Functions**: Creating service methods following established patterns
  ```typescript
  // Example: Creating new service methods
  async createTicket(userId: number, data: InsertTicket) {
    // Copilot will suggest proper error handling and database operations
  }
  ```

- **Validation Schemas**: Creating Zod validation schemas
  ```typescript
  // Example: Creating validation schemas
  const updateServerSchema = z.object({
    // Copilot will suggest fields based on your database schema
  });
  ```

### Frontend Development (React/TypeScript)

For frontend code, Copilot excels at:

- **React Components**: Creating components following project patterns
  ```tsx
  // Example: Creating a new component
  export function ServerCard({ server, onAction }: ServerCardProps) {
    // Copilot will suggest component structure based on existing components
  }
  ```

- **React Query Hooks**: Setting up data fetching with React Query
  ```typescript
  // Example: Creating data fetching hooks
  export function useServerDetails(serverId: number) {
    // Copilot will suggest proper query setup with loading/error states
  }
  ```

- **Form Handling**: Setting up React Hook Form with validation
  ```tsx
  // Example: Setting up a form
  const { register, handleSubmit, formState: { errors } } = useForm<CreateTicketFormData>({
    // Copilot will suggest resolver and default values
  });
  ```

### Database Operations

When working with database code:

- **Schema Definitions**: Creating table schemas in Drizzle
  ```typescript
  // Example: Creating a new table schema
  export const notifications = pgTable("notifications", {
    // Copilot will suggest columns based on naming patterns
  });
  ```

- **Query Building**: Creating complex database queries
  ```typescript
  // Example: Building a query
  const results = await db.query.users.findMany({
    // Copilot will suggest where clauses, joins, etc.
  });
  ```

### VirtFusion Integration

For VirtFusion API integration:

- **API Calls**: Making calls to the VirtFusion API
  ```typescript
  // Example: Creating a new API method
  async getServerBackups(serverId: number) {
    // Copilot will suggest proper error handling and response parsing
  }
  ```

## Best Practices

1. **Review Suggestions**: Always review Copilot's suggestions before accepting them
2. **Provide Context**: Add comments to guide Copilot toward better suggestions
3. **Use TypeScript**: Proper type definitions help Copilot generate better code
4. **Follow Patterns**: Consistent coding patterns help Copilot understand your codebase

## Common Pitfalls to Avoid

1. **Security Considerations**: Always review authentication and authorization code
2. **Error Handling**: Ensure proper error handling in generated code
3. **Performance**: Review database queries and API calls for efficiency
4. **Completeness**: Check that all edge cases are handled in generated code

## Example Usage Scenarios

### Adding a New API Endpoint

When adding a new API endpoint, you can guide Copilot with comments:

```typescript
// Create a new endpoint to fetch server backup status
// Should be authenticated and validate the serverId parameter
// Return the backup status and last backup time
router.get("/servers/:serverId/backups", 
  // Copilot will suggest authentication middleware and validation
);
```

### Creating a New Component

When creating a new UI component:

```tsx
// Create a responsive card component for displaying DNS records
// Should show record type, name, content, and TTL
// Include edit and delete actions
export function DNSRecordCard() {
  // Copilot will suggest component structure with proper styling
}
```

## Specific Features to Leverage

1. **Code Generation**: Let Copilot generate boilerplate code
2. **Documentation**: Have Copilot help write documentation comments
3. **Test Cases**: Generate test cases based on function signatures
4. **Refactoring**: Get suggestions for code improvements

By following these guidelines, you can maximize the benefits of GitHub Copilot while working on the SkyPANEL codebase.
