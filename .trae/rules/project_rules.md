# SkyPANEL Project Rules

## Overview

SkyPANEL is a comprehensive server and infrastructure management platform built with React, TypeScript, Express.js, and PostgreSQL. These rules ensure code quality, consistency, and maintainability across the entire codebase.

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Style & Formatting](#code-style--formatting)
3. [TypeScript Guidelines](#typescript-guidelines)
4. [React & Frontend Rules](#react--frontend-rules)
5. [Backend & API Rules](#backend--api-rules)
6. [Database Guidelines](#database-guidelines)
7. [File Organization](#file-organization)
8. [Security Requirements](#security-requirements)
9. [Performance Standards](#performance-standards)
10. [Testing Requirements](#testing-requirements)
11. [Documentation Standards](#documentation-standards)
12. [Git Workflow](#git-workflow)
13. [Environment & Configuration](#environment--configuration)
14. [Third-Party Integrations](#third-party-integrations)

## General Principles

### Code Quality
- **Readability First**: Code should be self-documenting and easy to understand
- **Consistency**: Follow established patterns throughout the codebase
- **Maintainability**: Write code that can be easily modified and extended
- **Performance**: Optimize for both development and production performance
- **Security**: Security considerations must be built into every feature

### Development Philosophy
- **Feature-First**: Organize code by features, not by file types
- **Component Reusability**: Create reusable components and utilities
- **Progressive Enhancement**: Build features that work without JavaScript first
- **Accessibility**: Ensure all features are accessible to users with disabilities

## Code Style & Formatting

### General Formatting
- **Indentation**: Use 2 spaces for indentation (no tabs)
- **Line Length**: Maximum 100 characters per line
- **Semicolons**: Always use semicolons
- **Quotes**: Use double quotes for strings, single quotes for JSX attributes
- **Trailing Commas**: Use trailing commas in multiline objects and arrays
- **Brand Theme**: all development must abide by (`brand-theme.md`)

### Naming Conventions
- **Files**: Use kebab-case for file names (`user-profile.tsx`)
- **Components**: Use PascalCase for React components (`UserProfile`)
- **Variables/Functions**: Use camelCase (`getUserData`)
- **Constants**: Use SCREAMING_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: Use PascalCase with descriptive names (`UserProfileData`)

### Comments
- Use JSDoc comments for functions and classes
- Explain "why" not "what" in comments
- Keep comments up-to-date with code changes
- Remove commented-out code before committing

## TypeScript Guidelines

### Type Safety
- **Strict Mode**: Always use TypeScript strict mode
- **No Any**: Avoid `any` type - use `unknown` or proper types
- **Explicit Types**: Define explicit return types for functions
- **Interface vs Type**: Use `interface` for object shapes, `type` for unions/aliases

### Type Definitions
```typescript
// ✅ Good
interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
}

// ✅ Good
type UserRole = 'admin' | 'user' | 'moderator';

// ❌ Bad
const userData: any = getUserData();
```

### Generic Types
- Use descriptive generic type names (`TUser` instead of `T`)
- Constrain generics when possible
- Provide default types for optional generics

## React & Frontend Rules

### Component Structure
- **Functional Components**: Use functional components with hooks
- **Component Size**: Keep components under 200 lines
- **Single Responsibility**: Each component should have one clear purpose
- **Props Interface**: Always define props interface

```typescript
// ✅ Good Component Structure
interface UserCardProps {
  user: UserProfile;
  onEdit: (userId: string) => void;
  className?: string;
}

export function UserCard({ user, onEdit, className }: UserCardProps) {
  const handleEdit = useCallback(() => {
    onEdit(user.id);
  }, [user.id, onEdit]);

  return (
    <div className={cn("user-card", className)}>
      {/* Component content */}
    </div>
  );
}
```

### Hooks Usage
- **Custom Hooks**: Extract complex logic into custom hooks
- **Dependencies**: Always include all dependencies in useEffect
- **Cleanup**: Clean up subscriptions and timers in useEffect
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations

### State Management
- **React Query**: Use React Query for server state management
- **Local State**: Use useState for component-local state
- **Form State**: Use React Hook Form for form management
- **Global State**: Minimize global state, prefer prop drilling for simple cases

### Styling
- **Tailwind CSS**: Use Tailwind utility classes for styling
- **CSS Variables**: Use CSS custom properties for theme values
- **Responsive Design**: Mobile-first responsive design approach
- **Dark Mode**: Support both light and dark themes

```typescript
// ✅ Good Tailwind Usage
<div className="flex items-center justify-between p-4 bg-card rounded-lg border">
  <h2 className="text-lg font-semibold text-foreground">Title</h2>
  <Button variant="outline" size="sm">Action</Button>
</div>
```

## Backend & API Rules

### API Design
- **RESTful**: Follow REST principles for API endpoints
- **HTTP Methods**: Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- **Status Codes**: Return appropriate HTTP status codes
- **Error Handling**: Consistent error response format

```typescript
// ✅ Good API Response Format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
```

### Route Organization
- **Feature-based**: Group routes by feature/domain
- **Middleware**: Use middleware for common functionality (auth, validation)
- **Validation**: Validate all input using Zod schemas
- **Rate Limiting**: Implement rate limiting for public endpoints

### Database Operations
- **Transactions**: Use database transactions for multi-step operations
- **Connection Pooling**: Use connection pooling for database connections
- **Query Optimization**: Optimize database queries for performance
- **Migration Scripts**: Use migration scripts for schema changes

## Database Guidelines

### Schema Design
- **Normalization**: Follow database normalization principles
- **Foreign Keys**: Use foreign key constraints for data integrity
- **Indexes**: Add indexes for frequently queried columns
- **Timestamps**: Include created_at and updated_at for all tables

### Drizzle ORM Usage
```typescript
// ✅ Good Schema Definition
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Query Patterns
- **Type Safety**: Use Drizzle's type-safe query builder
- **Prepared Statements**: Use prepared statements for repeated queries
- **Batch Operations**: Use batch operations for multiple inserts/updates
- **Error Handling**: Handle database errors gracefully

## File Organization

### Directory Structure
```
SkyPANEL/
├── client/src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI components (shadcn/ui)
│   │   ├── forms/          # Form components
│   │   └── layout/         # Layout components
│   ├── pages/              # Page components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utility functions
│   ├── services/           # API service functions
│   └── types/              # TypeScript type definitions
├── server/
│   ├── routes/             # API route handlers
│   ├── middleware/         # Express middleware
│   ├── services/           # Business logic services
│   └── types/              # Backend type definitions
└── shared/                 # Shared types and utilities
```

### Import Organization
```typescript
// ✅ Good Import Order
// 1. Node modules
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal modules (absolute imports)
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

// 3. Relative imports
import './component.css';
```

## Security Requirements

### Authentication & Authorization
- **JWT Tokens**: Use JWT for stateless authentication
- **Session Management**: Implement secure session management
- **Role-based Access**: Implement role-based access control (RBAC)
- **Password Security**: Hash passwords using bcrypt with salt

### Input Validation
- **Server-side Validation**: Always validate input on the server
- **Sanitization**: Sanitize user input to prevent XSS
- **SQL Injection**: Use parameterized queries to prevent SQL injection
- **CSRF Protection**: Implement CSRF protection for state-changing operations

### Data Protection
- **Environment Variables**: Store secrets in environment variables
- **HTTPS**: Use HTTPS in production
- **Data Encryption**: Encrypt sensitive data at rest
- **Audit Logging**: Log security-relevant events

## Performance Standards

### Frontend Performance
- **Code Splitting**: Implement route-based code splitting
- **Lazy Loading**: Lazy load components and images
- **Bundle Size**: Monitor and optimize bundle size
- **Caching**: Implement appropriate caching strategies

### Backend Performance
- **Database Indexing**: Add indexes for frequently queried columns
- **Query Optimization**: Optimize database queries
- **Caching**: Implement Redis caching for expensive operations
- **Rate Limiting**: Implement rate limiting to prevent abuse

### Monitoring
- **Performance Metrics**: Monitor application performance metrics
- **Error Tracking**: Implement error tracking and alerting
- **Logging**: Implement structured logging
- **Health Checks**: Implement health check endpoints

## Testing Requirements

### Unit Testing
- **Coverage**: Maintain minimum 80% test coverage
- **Test Structure**: Use Arrange-Act-Assert pattern
- **Mocking**: Mock external dependencies in unit tests
- **Test Naming**: Use descriptive test names

### Integration Testing
- **API Testing**: Test API endpoints with real database
- **Component Testing**: Test React components with user interactions
- **End-to-End**: Implement critical path E2E tests

### Test Organization
```typescript
// ✅ Good Test Structure
describe('UserService', () => {
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = { email: 'test@example.com', name: 'Test User' };
      
      // Act
      const result = await userService.createUser(userData);
      
      // Assert
      expect(result.success).toBe(true);
      expect(result.data.email).toBe(userData.email);
    });
  });
});
```

## Documentation Standards

### Code Documentation
- **JSDoc**: Use JSDoc for function and class documentation
- **README**: Maintain up-to-date README files
- **API Documentation**: Document all API endpoints
- **Architecture Docs**: Maintain architecture documentation

### Comments
- **Purpose**: Explain the purpose and reasoning behind complex code
- **Examples**: Provide examples for complex functions
- **TODOs**: Use TODO comments for future improvements
- **Warnings**: Document known limitations or gotchas

## Git Workflow

### Branch Naming
- `feature/feature-name` - New features
- `bugfix/bug-description` - Bug fixes
- `hotfix/critical-fix` - Critical production fixes
- `chore/task-description` - Maintenance tasks

### Commit Messages
Follow Conventional Commits specification:
```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

### Pull Requests
- **Small PRs**: Keep pull requests small and focused
- **Description**: Provide clear description of changes
- **Testing**: Include testing instructions
- **Review**: Require at least one code review

## Environment & Configuration

### Environment Variables
- **Validation**: Validate environment variables on startup
- **Documentation**: Document all required environment variables
- **Defaults**: Provide sensible defaults where possible
- **Security**: Never commit secrets to version control

### Configuration Management
- **Environment-specific**: Use different configs for different environments
- **Type Safety**: Use TypeScript for configuration objects
- **Validation**: Validate configuration at runtime

## Third-Party Integrations

### API Integrations
- **Error Handling**: Implement robust error handling for external APIs
- **Rate Limiting**: Respect rate limits of external services
- **Timeouts**: Set appropriate timeouts for external requests
- **Fallbacks**: Implement fallback mechanisms for critical integrations

### Service Dependencies
- **VirtFusion**: Server management and provisioning
- **PayPal**: Payment processing
- **Discord**: User verification and notifications
- **SendGrid**: Email delivery
- **Cloudflare**: DNS management

### Integration Patterns
- **Circuit Breaker**: Implement circuit breaker pattern for unreliable services
- **Retry Logic**: Implement exponential backoff for retries
- **Monitoring**: Monitor integration health and performance
- **Documentation**: Document integration requirements and limitations

---

## Enforcement

These rules are enforced through:
- **Code Reviews**: All code changes require peer review
- **Automated Testing**: CI/CD pipeline runs tests on all changes
- **Linting**: ESLint and TypeScript compiler enforce code standards
- **Documentation**: Regular documentation reviews and updates

## Updates

This document is a living standard and should be updated as the project evolves. All team members are responsible for suggesting improvements and keeping these rules current.
