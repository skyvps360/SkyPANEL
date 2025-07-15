# SkyPANEL Development Guide

This guide provides essential information for developers working on the SkyPANEL project, including setup instructions, coding standards, and best practices.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Local Development Setup](#local-development-setup)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Coding Standards](#coding-standards)
- [Git Workflow](#git-workflow)
- [Testing](#testing)
- [Debugging](#debugging)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm 9+
- PostgreSQL 14+
- Git
- WSL 2 (for Windows development)
- Docker (optional, for local development)

## Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   
   # Install server dependencies
   cd server
   npm install
   cd ..
   ```

3. **Set up environment variables**
   ```bash
   # Copy example environment files
   cp .env.example .env
   cp client/.env.example client/.env.local
   cp server/.env.example server/.env
   ```

4. **Start the development servers**
   ```bash
   # Start both client and server in development mode
   npm run dev
   ```
   - Frontend will be available at: http://localhost:3000
   - Backend API will be available at: http://localhost:4000

## Database Setup

1. **Set up PostgreSQL**
   - Install PostgreSQL 14+ if not already installed
   - Create a new database for the application

2. **Run migrations**
   ```bash
   # Apply database migrations
   npx drizzle-kit push:pg
   
   # Or to generate and run migrations
   npx drizzle-kit generate:pg
   npx drizzle-kit push:pg
   ```

3. **Seed the database** (if needed)
   ```bash
   npm run db:seed
   ```

## Environment Variables

### Required Variables

#### Root `.env`
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/skypanel
JWT_SECRET=your_jwt_secret_here
```

#### Client `.env.local`
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

#### Server `.env`
```env
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://user:password@localhost:5432/skypanel
JWT_SECRET=your_jwt_secret_here
VIRT_FUSION_API_KEY=your_virtfusion_api_key
VIRT_FUSION_API_URL=https://api.virtfusion.example.com
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Enable strict mode in `tsconfig.json`
- Define interfaces for all data structures
- Use `type` for type aliases and `interface` for object types
- Avoid using `any` - use `unknown` or proper types instead

### React/Next.js
- Use functional components with hooks
- Follow the React Hooks rules
- Use `useCallback` and `useMemo` for performance optimization
- Keep components small and focused
- Use TypeScript interfaces for component props

### Styling
- Use Tailwind CSS for styling
- Follow the utility-first approach
- Use `@apply` for repeated utility patterns
- Keep custom CSS to a minimum
- Follow the design system in `client/src/styles/theme.ts`

### Backend
- Use async/await for asynchronous operations
- Follow RESTful API design principles
- Validate all user input
- Use proper error handling with custom error classes
- Document all API endpoints with JSDoc

## Git Workflow

### Branch Naming
- `feature/` - New features
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `chore/` - Maintenance tasks
- `docs/` - Documentation updates

### Commit Messages
Follow the Conventional Commits specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Pull Requests
- Keep PRs small and focused
- Include a clear description of changes
- Reference related issues
- Ensure all tests pass
- Request code reviews from at least one team member

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run client tests
cd client
npm test

# Run server tests
cd server
npm test
```

### Writing Tests
- Write unit tests for utility functions and components
- Write integration tests for API endpoints
- Use Jest as the test runner
- Use React Testing Library for component tests
- Aim for at least 80% test coverage

## Debugging

### Client-Side
- Use React DevTools for component inspection
- Use Redux DevTools for state management
- Use the browser's network tab for API request inspection

### Server-Side
- Use `console.log` for quick debugging
- Use `debug` package for more structured logging
- Use VS Code's debugger for step-through debugging

## Deployment

### Staging
1. Push to the `staging` branch
2. CI/CD pipeline will automatically deploy to staging
3. Verify the deployment at https://staging.skypanel.example.com

### Production
1. Create a release branch from `main`
2. Update the version in `package.json`
3. Create a pull request to `main`
4. After approval, merge the PR
5. CI/CD pipeline will deploy to production

## Troubleshooting

### Common Issues

#### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Check if the database user has the correct permissions

#### API Connection Issues
- Verify the API URL in client configuration
- Check if the server is running
- Look for CORS errors in the browser console

#### Build Failures
- Ensure all dependencies are installed
- Check for version conflicts
- Clear the build cache: `npm run clean`

## Getting Help

- Check the project's GitHub issues
- Ask in the project's Discord channel
- Consult the documentation in `/md-docs`
- Reach out to the core development team
