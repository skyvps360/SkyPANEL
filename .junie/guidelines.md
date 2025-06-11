# SkyPANEL Development Guidelines

This document provides essential information for developing and maintaining the SkyPANEL project.

## Project Structure

SkyPANEL is a full-stack TypeScript application with the following structure:

- `/client`: Frontend React application
- `/server`: Backend Express server
- `/shared`: Shared code between client and server
- `/tests`: Test files
- `/migrations`: Database migration files
- `/scripts`: Utility scripts
- `/docs`: Documentation files

## Build/Configuration Instructions

### Environment Setup

1. Create a `.env` file in the project root with the required environment variables:
   ```
   # Database Configuration
   DATABASE_URL=postgres://username:password@hostname:port/database

   # Session Management
   SESSION_SECRET=your_secure_random_string_here

   # VirtFusion API Integration
   VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
   VIRTFUSION_API_KEY=your_virtfusion_api_key

   # Application Settings
   PORT=3000
   NODE_ENV=development
   ```

   See the README.md for a complete list of environment variables.

2. Install dependencies:
   ```bash
   npm install
   ```

3. Initialize the database:
   ```bash
   npm run db:push
   ```

4. Create an admin user:
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```

### Development

- Start the development server:
  ```bash
  npm run dev
  ```

### Production

- Build for production:
  ```bash
  npm run build
  ```

- Start the production server:
  ```bash
  npm start
  ```

- Alternatively, use PM2 for production:
  ```bash
  npm run start:pm2
  ```

## Testing Information

### Testing Framework

SkyPANEL uses Vitest for testing. The configuration is in `vitest.config.ts`.

### Running Tests

To run tests:
```bash
npm run test
```

To run tests in watch mode:
```bash
npm run test:watch
```

Note: Before running tests, ensure that Vitest is properly installed. If you encounter the error "'vitest' is not recognized as an internal or external command", try reinstalling dependencies with `npm install`.

### Writing Tests

Tests are located in the `/tests` directory and follow the naming convention `*.test.ts`.

Example test structure:
```typescript
import { describe, it, expect } from 'vitest';

describe('Feature Name', () => {
  describe('Specific Functionality', () => {
    it('should behave in a certain way', () => {
      // Arrange
      const input = 'some input';

      // Act
      const result = someFunction(input);

      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

## Additional Development Information

### TypeScript Configuration

The project uses TypeScript with the configuration in `tsconfig.json`. Path aliases are configured for easier imports:
- `@` points to `client/src`
- `@shared` points to `shared`

### Database Management

The project uses Drizzle ORM with PostgreSQL. Database schema changes should be managed using Drizzle Kit:

```bash
npm run db:push
```

### API Integration

SkyPANEL integrates with VirtFusion API. All VirtFusion API calls use the local `user.id` as the `extRelationId` parameter to ensure proper mapping between SkyPANEL users and VirtFusion accounts.

### Frontend Architecture

The frontend is built with React 18, TypeScript, and Vite. It uses:
- TailwindCSS for styling
- Shadcn/UI and Radix UI for components
- React Query for data fetching
- Wouter for routing

### Code Style

While there are no explicit ESLint or Prettier configurations, the codebase follows consistent patterns:
- Use TypeScript for type safety
- Follow the existing code structure and naming conventions
- Use functional components with hooks for React
- Use async/await for asynchronous operations
