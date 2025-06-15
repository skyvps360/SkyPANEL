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
