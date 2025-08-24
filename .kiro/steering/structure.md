# SkyPANEL Project Structure

## Root Directory Organization

```
SkyPANEL/
├── client/                 # Frontend React application
├── server/                 # Backend Express API server
├── shared/                 # Shared TypeScript schemas and utilities
├── scripts/                # Database migration and utility scripts
├── migrations/             # Drizzle ORM migration files
├── md-docs/                # Comprehensive project documentation
├── icons/                  # Brand assets and logos
├── dist/                   # Production build output
└── node_modules/           # Dependencies
```

## Frontend Structure (`client/`)

### Core Application
```
client/
├── src/
│   ├── App.tsx             # Main application component
│   ├── main.tsx            # Application entry point
│   ├── index.css           # Global styles and Tailwind imports
│   └── vite-env.d.ts       # Vite type definitions
├── index.html              # HTML template
└── public/                 # Static assets
```

### Component Organization
```
client/src/components/
├── ui/                     # Shadcn/UI base components (Button, Input, etc.)
├── layout/                 # Layout components (Header, Sidebar, Footer)
├── auth/                   # Authentication forms and flows
├── dashboard/              # Dashboard-specific components
├── server/                 # Server management components
├── billing/                # Payment and transaction components
├── tickets/                # Support ticket system components
├── admin/                  # Admin panel components
├── blog/                   # Blog and content components
└── [feature]/              # Feature-specific component groups
```

### Pages Structure
```
client/src/pages/
├── auth/                   # Authentication pages (login, register)
├── dashboard/              # User dashboard pages
├── admin/                  # Admin panel pages
├── billing/                # Billing and transaction pages
├── docs/                   # Documentation pages
├── status/                 # Service status pages
└── [feature]-page.tsx      # Individual feature pages
```

### Utilities and Hooks
```
client/src/
├── hooks/                  # Custom React hooks
│   ├── use-auth.tsx        # Authentication state management
│   ├── use-settings.ts     # Application settings
│   └── use-theme.ts        # Theme management
├── lib/                    # Utility libraries
│   ├── api.ts              # API client configuration
│   ├── utils.ts            # General utilities
│   └── queryClient.ts      # React Query configuration
└── types/                  # TypeScript type definitions
```

## Backend Structure (`server/`)

### Core Server Files
```
server/
├── index.ts                # Main server entry point
├── routes_new.ts           # Route registration and middleware setup
├── auth.ts                 # Authentication configuration
├── db.ts                   # Database connection and configuration
└── middleware.ts           # Custom middleware functions
```

### Route Organization
```
server/routes/
├── user-routes.ts          # User management endpoints
├── server-routes.ts        # VirtFusion server management
├── transaction-routes.ts   # Billing and payment endpoints
├── admin-*.ts              # Admin-specific route groups
├── oauth-routes.ts         # OAuth authentication flows
└── api-*.ts                # API versioning and key management
```

### Service Layer
```
server/services/
├── auth/                   # Authentication services
├── communication/          # Email and notification services
├── infrastructure/         # External API integrations
├── cron-service.ts         # Scheduled task management
└── [feature]-service.ts    # Feature-specific business logic
```

### Middleware Organization
```
server/middleware/
├── auth-middleware.ts      # Authentication validation
├── admin-middleware.ts     # Admin role verification
└── validate-request.ts     # Request validation utilities
```

### External Integrations
```
server/
├── virtfusion-api.ts       # VirtFusion API client
├── discord-bot-service.ts  # Discord bot integration
├── gemini-service.ts       # Google AI integration
├── email.ts                # Email service configuration
└── betterstack-service.ts  # Monitoring integration
```

## Shared Code (`shared/`)

### Schema Organization
```
shared/schemas/
├── index.ts                # Schema exports
├── user-schema.ts          # User-related schemas
├── server-schema.ts        # Server management schemas
├── transaction-schema.ts   # Billing schemas
├── support-schema.ts       # Ticket system schemas
└── [feature]-schema.ts     # Feature-specific schemas
```

### Utilities
```
shared/
├── dns-record-types.ts     # DNS management utilities
└── dns-record-utils.ts     # DNS helper functions
```

## Database Scripts (`scripts/`)

### Migration Scripts
```
scripts/
├── add-*.ts                # Schema addition scripts
├── fix-*.ts                # Schema correction scripts
├── migrate-*.ts            # Data migration scripts
├── test-*.ts               # Feature testing scripts
└── create-admin-user.ts    # Initial setup scripts
```

### Script Categories
- **Schema Management**: Adding tables, columns, and constraints
- **Data Migration**: Moving data between schema versions
- **Testing**: Validating functionality and integrations
- **Maintenance**: Database cleanup and optimization

## Documentation (`md-docs/`)

### Comprehensive Documentation
```
md-docs/
├── api-documentation.md    # Complete API reference
├── deployment-guide.md     # Deployment instructions
├── development-guide.md    # Development setup
├── database-schema.md      # Database documentation
├── [feature]-system.md     # Feature-specific guides
└── VirtFusion-API-Calls/   # VirtFusion integration docs
```

## Configuration Files

### Build and Development
- `package.json`: Dependencies and scripts
- `tsconfig.json`: TypeScript configuration
- `vite.config.ts`: Frontend build configuration
- `tailwind.config.ts`: Styling configuration
- `drizzle.config.ts`: Database ORM configuration

### Deployment
- `Dockerfile`: Container build instructions
- `docker-compose.yml`: Multi-container orchestration
- `pm2.config.cjs`: Process manager configuration
- `.env`: Environment variables (not tracked)

## Naming Conventions

### Files and Directories
- **kebab-case**: For file names (`user-routes.ts`, `server-detail-page.tsx`)
- **PascalCase**: For React components (`UserProfile.tsx`, `ServerCard.tsx`)
- **camelCase**: For functions and variables
- **SCREAMING_SNAKE_CASE**: For constants and environment variables

### Component Organization
- **Feature-based**: Group related components by domain
- **Atomic Design**: UI components follow atomic design principles
- **Co-location**: Keep related files close together

### API Structure
- **RESTful**: Follow REST conventions for endpoints
- **Versioning**: Use `/api/v1/` for versioned endpoints
- **Grouping**: Organize by resource type (`/api/users/`, `/api/servers/`)

## Import Patterns

### Path Aliases
```typescript
// Client imports
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

// Shared imports
import { userSchema } from "@shared/schemas/user-schema"
import type { User } from "@shared/schemas"
```

### Import Organization
1. External libraries (React, Express, etc.)
2. Internal utilities and services
3. Type imports (using `type` keyword)
4. Relative imports (./components, ../utils)

## Development Workflow

### Feature Development
1. Create schema in `shared/schemas/` if needed
2. Implement backend routes in `server/routes/`
3. Add service logic in `server/services/`
4. Build frontend components in `client/src/components/`
5. Create pages in `client/src/pages/`
6. Add documentation in `md-docs/`

### Database Changes
1. Update schema in `shared/schemas/`
2. Create migration script in `scripts/`
3. Test migration with `npm run db:push`
4. Document changes in `md-docs/database-schema.md`