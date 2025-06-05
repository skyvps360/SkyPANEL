---
applyTo: '**'
---
# SkyPANEL - GitHub Copilot Instructions

## Project Overview

SkyPANEL is used for SkyVPS360.xyz which is an enterprise-grade VirtFusion management platform for VPS hosting. The application provides a comprehensive solution with features including user management, server control, billing systems, support ticketing, AI-powered assistance, and integration with external services like Discord and BetterStack.


## Architecture

- **Frontend**: React 18 with TypeScript, Vite, TailwindCSS, Shadcn/UI components

- **Backend**: Node.js/Express with TypeScript, PostgreSQL database with Drizzle ORM

- **Authentication**: Passport.js with local strategy and JWT for API authentication

- **Key Integrations**: VirtFusion API, Google Gemini AI, Discord, PayPal, BetterStack



## Code Patterns & Conventions

- Use TypeScript for type safety throughout the codebase

- Follow React functional component patterns with hooks

- Implement API calls using React Query (TanStack Query)

- Validate data with Zod schemas

- Use Drizzle ORM for database operations



## API Structure

- RESTful API with consistent response format

- Authentication via Bearer token in Authorization header

- Rate limiting (100 requests/minute per API key)

- Error responses follow standard format with HTTP status codes

- API endpoints organized by resource type and access level



## Code Organization Guidelines

- Keep components small and focused on a single responsibility

- Place shared utilities in dedicated utility modules

- Follow consistent naming: PascalCase for components, camelCase for functions

- Group related functionality in feature-focused directories

- Use TypeScript interfaces to define data models



## Documentation Standards

- Document complex functions with JSDoc comments

- Include parameter types and return types in TypeScript definitions

- Keep the API documentation in readme.md updated when endpoints change

- Document environment variables and their purpose



## Testing Approach

- Write unit tests for utility functions

- Create integration tests for API endpoints

- Use mock data for external service dependencies

- Test both success and error cases



## Security Considerations

- Implement proper input validation on all user inputs

- Use parameterized queries to prevent SQL injection

- Follow OWASP security best practices

- Keep sensitive credentials in environment variables

- Implement rate limiting and proper authentication checks



## Performance Optimization

- Optimize React components using memoization where appropriate

- Use pagination for large data sets

- Implement proper database indexes for frequent queries

- Consider caching strategies for frequently accessed data

## Commenting Guidelines
- Use inline comments sparingly, only for complex logic
- Use descriptive variable and function names to reduce the need for comments
- Always comment on additional context or changes that may not be immediately obvious from the code itself