# SkyPANEL Project Rules & Guidelines

This document outlines the project-specific rules, guidelines, and standards for the SkyPANEL VirtFusion management platform.

## Project Overview

SkyPANEL is an enterprise-grade VirtFusion client portal built with modern web technologies. It provides comprehensive VPS hosting management with AI-powered support, real-time monitoring, Discord integration, and advanced billing systems.

### Core Technologies
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI, Radix UI
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM
- **Integrations**: VirtFusion API, PayPal, Discord, Google Gemini AI, BetterStack
- **Build Tools**: Vite, ESBuild, Drizzle Kit, PM2
- **Deployment**: Docker, Cloudflare Wrangler, PM2

## File Structure & Organization

### Frontend Structure (`client/src/`)
```
client/src/
├── components/          # Reusable UI components organized by feature
│   ├── admin/          # Admin-specific components
│   ├── ui/             # Base UI components (Shadcn/UI)
│   ├── layout/         # Layout components
│   ├── auth/           # Authentication components
│   ├── billing/        # Billing and payment components
│   ├── servers/        # Server management components
│   ├── tickets/        # Support ticket components
│   └── dns/            # DNS management components
├── pages/              # Page components organized by route
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and configurations
├── types/              # TypeScript type definitions
└── styles/             # Global styles and CSS modules
```

### Backend Structure (`server/`)
```
server/
├── routes/             # Express route handlers organized by feature
├── services/           # Business logic services
├── middleware/         # Express middleware
├── schemas/            # Database schemas (Drizzle)
└── utils/              # Utility functions
```

## Coding Standards

### TypeScript Guidelines
1. **Strict Mode**: Always use TypeScript strict mode
2. **Type Definitions**: Define explicit types for all function parameters and return values
3. **Interface Naming**: Use PascalCase for interfaces (e.g., `UserProfile`, `ServerConfig`)
4. **Enum Usage**: Use const assertions or enums for fixed value sets
5. **Generic Types**: Use descriptive generic type names (e.g., `<TData>` instead of `<T>`)

### React Component Guidelines
1. **Functional Components**: Use functional components with hooks
2. **Component Naming**: Use PascalCase for component names
3. **Props Interface**: Define props interface for each component
4. **Default Exports**: Use default exports for page components, named exports for utilities
5. **Hook Dependencies**: Always include all dependencies in useEffect dependency arrays

### CSS & Styling
1. **TailwindCSS**: Primary styling framework
2. **Shadcn/UI**: Use for base UI components
3. **Responsive Design**: Mobile-first approach with responsive utilities
4. **Color Scheme**: Follow brand theming system with CSS custom properties
5. **Component Variants**: Use cva (class-variance-authority) for component variants

## Database & Schema Management

### Drizzle ORM Guidelines
1. **Schema Definition**: Define schemas in `shared/schemas/` directory
2. **Migration Scripts**: Use `npm run db:push` for schema changes
3. **Type Safety**: Leverage Drizzle's type-safe query building
4. **Relationships**: Define foreign key relationships explicitly
5. **Indexing**: Add appropriate indexes for performance

### Database Naming Conventions
1. **Tables**: Use snake_case (e.g., `user_profiles`, `server_logs`)
2. **Columns**: Use snake_case (e.g., `created_at`, `user_id`)
3. **Primary Keys**: Use `id` as primary key column name
4. **Foreign Keys**: Use `{table}_id` format (e.g., `user_id`, `server_id`)
5. **Timestamps**: Include `created_at` and `updated_at` for audit trails

## API Design Standards

### REST API Guidelines
1. **Endpoint Naming**: Use kebab-case for URLs (e.g., `/api/user-profiles`)
2. **HTTP Methods**: Follow RESTful conventions (GET, POST, PUT, DELETE, PATCH)
3. **Status Codes**: Use appropriate HTTP status codes
4. **Error Handling**: Consistent error response format
5. **Validation**: Use Zod schemas for request validation

### Authentication & Authorization
1. **Session-Based Auth**: Primary authentication method
2. **API Keys**: For programmatic access with scoped permissions
3. **Rate Limiting**: 100 requests per minute per API key
4. **CSRF Protection**: Implement CSRF tokens for state-changing operations
5. **Role-Based Access**: Admin and user role distinctions

## Integration Standards

### VirtFusion API Integration
1. **Error Handling**: Comprehensive error handling for API failures
2. **Rate Limiting**: Respect VirtFusion API rate limits
3. **Data Synchronization**: Maintain consistency between SkyPANEL and VirtFusion
4. **User Mapping**: Use local user.id as extRelationId parameter
5. **Credential Security**: Secure storage of API credentials

### Discord Integration
1. **Two-Way Sync**: Bidirectional ticket synchronization
2. **Thread Management**: Automatic thread creation and archiving
3. **Webhook Security**: Validate Discord webhook signatures
4. **Rate Limiting**: Respect Discord API rate limits
5. **Error Recovery**: Graceful handling of Discord API failures

### Payment Processing (PayPal)
1. **Sandbox Testing**: Use sandbox for development
2. **Webhook Validation**: Verify PayPal webhook signatures
3. **Transaction Logging**: Log all payment transactions
4. **Error Handling**: Graceful payment failure handling
5. **Currency Support**: Multi-currency support (USD default)

## Security Guidelines

### Authentication Security
1. **Password Hashing**: Use bcrypt with appropriate work factor
2. **Session Management**: Secure session storage with PostgreSQL
3. **Two-Factor Auth**: Support for 2FA with authenticator apps
4. **Account Lockout**: Protection against brute force attacks
5. **Password Policies**: Configurable password strength requirements

### Data Protection
1. **Input Validation**: Validate and sanitize all user inputs
2. **SQL Injection**: Use parameterized queries and ORM protection
3. **XSS Prevention**: Output sanitization and CSP headers
4. **HTTPS Only**: Enforce HTTPS in production
5. **Sensitive Data**: Encrypt sensitive data at rest

### API Security
1. **Rate Limiting**: Implement rate limiting on all endpoints
2. **CORS Configuration**: Proper CORS setup for API access
3. **API Key Scoping**: Granular permission scopes for API keys
4. **Audit Logging**: Log all API access and administrative actions
5. **Error Messages**: Avoid information leakage in error responses

## Development Workflow

### Git Workflow
1. **Branch Naming**: Use feature/fix/hotfix prefixes (e.g., `feature/user-management`)
2. **Commit Messages**: Use conventional commit format
3. **Pull Requests**: Require code review for all changes
4. **Main Branch**: Keep main branch stable and deployable
5. **Release Tags**: Use semantic versioning for releases

### Testing Standards
1. **Unit Tests**: Test individual functions and components
2. **Integration Tests**: Test API endpoints and database operations
3. **E2E Tests**: Test critical user workflows
4. **Test Coverage**: Maintain minimum 80% test coverage
5. **Test Data**: Use factories for test data generation

### Code Quality
1. **ESLint**: Use ESLint for code linting
2. **Prettier**: Use Prettier for code formatting
3. **Type Checking**: Run TypeScript compiler checks
4. **Pre-commit Hooks**: Run linting and tests before commits
5. **Code Reviews**: Mandatory code reviews for all changes

## Deployment & Operations

### Environment Management
1. **Environment Variables**: Use .env files for configuration
2. **Secrets Management**: Secure storage of API keys and credentials
3. **Configuration Validation**: Validate environment variables on startup
4. **Environment Separation**: Separate dev, staging, and production environments
5. **Backup Procedures**: Regular database and file backups

### Monitoring & Logging
1. **Application Logs**: Structured logging with appropriate levels
2. **Error Tracking**: Comprehensive error monitoring and alerting
3. **Performance Monitoring**: Track response times and resource usage
4. **Health Checks**: Implement health check endpoints
5. **Uptime Monitoring**: Use BetterStack for uptime monitoring

### Deployment Options
1. **Docker**: Containerized deployment with Docker Compose
2. **PM2**: Process management for Node.js applications
3. **Cloudflare Workers**: Edge deployment for global distribution
4. **Database Migrations**: Automated database schema migrations
5. **Zero-Downtime**: Rolling updates for production deployments

## Performance Guidelines

### Frontend Performance
1. **Code Splitting**: Implement route-based code splitting
2. **Lazy Loading**: Lazy load components and images
3. **Bundle Optimization**: Minimize bundle size with tree shaking
4. **Caching**: Implement appropriate caching strategies
5. **Image Optimization**: Use optimized image formats and sizes

### Backend Performance
1. **Database Optimization**: Optimize queries and add indexes
2. **Connection Pooling**: Use database connection pooling
3. **Caching**: Implement Redis caching for frequently accessed data
4. **Rate Limiting**: Prevent abuse with rate limiting
5. **Resource Monitoring**: Monitor CPU, memory, and disk usage

## Documentation Standards

### Code Documentation
1. **JSDoc Comments**: Document all public functions and classes
2. **README Files**: Maintain comprehensive README files
3. **API Documentation**: Auto-generate API documentation
4. **Architecture Docs**: Document system architecture and design decisions
5. **Changelog**: Maintain detailed changelog for releases

### User Documentation
1. **User Guides**: Comprehensive user documentation
2. **API Reference**: Complete API reference with examples
3. **Troubleshooting**: Common issues and solutions
4. **Getting Started**: Step-by-step setup guides
5. **FAQ**: Frequently asked questions and answers

## Compliance & Legal

### Data Protection (GDPR/CCPA)
1. **Privacy Policy**: Comprehensive privacy policy implementation
2. **Data Minimization**: Collect only necessary data
3. **User Consent**: Explicit consent for data collection
4. **Data Export**: User data export functionality
5. **Data Deletion**: Right to be forgotten implementation

### Security Compliance
1. **Audit Logging**: Comprehensive audit trails
2. **Access Controls**: Role-based access control
3. **Data Encryption**: Encrypt sensitive data
4. **Incident Response**: Security incident response procedures
5. **Regular Updates**: Keep dependencies and systems updated

## Maintenance & Support

### Maintenance Mode
1. **Graceful Degradation**: Maintain core functionality during maintenance
2. **User Communication**: Clear communication about maintenance windows
3. **Bypass Tokens**: Admin access during maintenance
4. **Rollback Procedures**: Quick rollback for failed deployments
5. **Status Page**: Real-time status updates

### Support System
1. **Ticket Management**: Comprehensive support ticket system
2. **Knowledge Base**: Self-service documentation
3. **Live Chat**: Real-time support chat
4. **Discord Integration**: Support via Discord channels
5. **AI Assistance**: Google Gemini AI for automated support

## Version Control & Releases

### Versioning
1. **Semantic Versioning**: Follow semver (MAJOR.MINOR.PATCH)
2. **Release Notes**: Detailed release notes for each version
3. **Breaking Changes**: Clear documentation of breaking changes
4. **Migration Guides**: Step-by-step migration instructions
5. **Deprecation Policy**: Clear deprecation timeline and alternatives

### Release Process
1. **Feature Freeze**: Code freeze before releases
2. **Testing Phase**: Comprehensive testing before release
3. **Staging Deployment**: Deploy to staging for final testing
4. **Production Deployment**: Coordinated production deployment
5. **Post-Release Monitoring**: Monitor system health after releases

---

## Quick Reference Commands

### Development
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run check            # TypeScript type checking
npm run db:push          # Push database schema changes
```

### Database
```bash
npx tsx scripts/create-admin-user.ts    # Create admin user
npm run db:push                         # Apply schema changes
```

### Production
```bash
npm run build:restart    # Build and restart with PM2
npm run start           # Start production server
docker-compose up -d    # Start with Docker
```

### Testing
```bash
npm test                # Run tests
npm run health-check    # Health check endpoint
```

---

*This document should be updated as the project evolves. All team members are responsible for following these guidelines and suggesting improvements.*