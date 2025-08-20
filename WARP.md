# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SkyPANEL is a comprehensive VirtFusion client portal built as a modern full-stack TypeScript application. It provides VPS hosting management with AI-powered support, real-time monitoring, Discord integration, and advanced billing systems.

**Core Technologies:**
- **Frontend:** React 18, TypeScript, Vite, TailwindCSS, Shadcn/UI
- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Drizzle ORM
- **Key Integrations:** VirtFusion API, Discord Bot, Google Gemini AI, PayPal, BetterStack

## Common Development Commands

### Database Operations
```bash
# Push schema changes to database
npm run db:push

# Create admin user (interactive)
npx tsx scripts/create-admin-user.ts

# Check database connectivity
npm run check-db
```

### Development & Building
```bash
# Start development server with hot reload
npm run dev

# Clean development cache and restart
npm run dev:clean

# Build for production
npm run build

# Type checking
npm run check
```

### Production & Deployment
```bash
# Build and restart with PM2
npm run build:restart

# Start with PM2 (Linux)
npm run start:pm2:linux

# Start with PM2 (Windows)
npm run start:pm2:windows

# PM2 management
npm run stop:pm2
npm run restart:pm2
npm run logs:pm2
```

### Testing
```bash
# Run tests
npm run test

# Watch mode
npm run test:watch

# Health check
npm run health-check
```

### Docker Deployment
```bash
# Build Docker image
docker build -t skyvps360/skypanel-app .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f skypanel-app
```

## Architecture Overview

### Project Structure
- **`client/`** - React frontend application with Vite build system
- **`server/`** - Express.js backend with TypeScript
- **`shared/`** - Shared TypeScript schemas and types
- **`scripts/`** - Database migrations and utility scripts
- **`migrations/`** - Drizzle database migration files

### Frontend Architecture
The frontend uses a modern React setup with:
- **React Query** for server state management
- **Wouter** for lightweight routing  
- **Shadcn/UI + Radix UI** for accessible component library
- **React Hook Form + Zod** for type-safe form validation
- **PayPal React SDK** for payment processing

Key frontend patterns:
- Components organized by feature domains (`admin/`, `auth/`, `billing/`, etc.)
- Custom hooks for business logic (e.g., `useAuth`, `useSessionTimeout`)
- Provider pattern for global state (Auth, Theme, Loading)
- Query keys organized by domain for cache management

### Backend Architecture
The backend follows a layered service architecture:
- **Route handlers** in `/routes/` organized by domain
- **Service layer** in `/services/` with business logic
- **Database layer** using Drizzle ORM with PostgreSQL
- **Middleware** for authentication, rate limiting, maintenance mode

Key backend patterns:
- **Service injection** - Services initialized at startup and injected into routes
- **Authentication middleware** with session-based auth and API key support
- **VirtFusion API integration** as primary data source for server management
- **Event-driven notifications** via Discord webhooks and email service

### Database Schema Organization
Schemas are modularized by domain in `shared/schemas/`:
- **User & Auth:** `user-schema.ts`, `auth-schema.ts`, `oauth-schema.ts`
- **VirtFusion Integration:** `server-schema.ts`, `virtfusion-billing-schema.ts`
- **Support System:** `support-schema.ts`, `discord-ai-schema.ts`
- **Billing:** `transaction-schema.ts`, `coupon-schema.ts`
- **Content:** `blog-schema.ts`, `documentation-schema.ts`, `faq-schema.ts`
- **Infrastructure:** `dns-schema.ts`, `sla-schema.ts`, `monitoring-schema.ts`

### Key Integration Points

#### VirtFusion API Integration
- **User Mapping:** Local `user.id` used as VirtFusion `extRelationId`
- **Real-time Sync:** Server status, resource usage, billing data
- **Password Management:** VirtFusion API generates secure passwords
- **Credit System:** Automatic deduction based on hourly usage tracking

#### Discord Bot Integration
- **Two-way Ticket Sync:** Discord threads mirror support tickets
- **AI Commands:** `/ask` command uses Google Gemini for intelligent responses
- **Status Monitoring:** `/status` command shows real-time platform health
- **Permission System:** Role-based access control for Discord commands

#### AI-Powered Support
- **Google Gemini 2.5 Flash** for customer support automation
- **Context-aware responses** with company branding integration
- **Rate limiting and content moderation** for safe AI interactions
- **Fallback mechanisms** when AI cannot provide assistance

## Key Development Patterns

### Authentication & Authorization
- **Session-based auth** with PostgreSQL session store (1-hour timeout)
- **API key authentication** with scoped permissions
- **Role-based access control** (admin/user roles)
- **Maintenance mode** with bypass token system

### Error Handling
- **Zod validation** for all API inputs with consistent error responses
- **Global error middleware** with proper HTTP status codes
- **Database connection pooling** with retry logic and error recovery
- **Rate limiting** across all endpoints (100 req/min for API keys)

### Real-time Features
- **WebSocket support** for VNC console access
- **Live server monitoring** with BetterStack integration
- **Real-time notifications** via Discord webhooks
- **Session timeout handling** with automatic logout

### Billing & Transactions
- **Credit-based billing system** with PayPal integration
- **Automatic VirtFusion usage tracking** via hourly cron jobs  
- **PDF transaction exports** with dynamic company branding
- **Webhook validation** for secure payment processing

### Content Management
- **Dynamic theming system** with multi-color brand customization
- **Markdown-based documentation** with search functionality
- **Blog system** with SEO optimization and rich content editor
- **FAQ system** with categorization and search

## Environment Configuration

### Required Environment Variables
```bash
# Database
DATABASE_URL=postgres://user:pass@host:port/db

# VirtFusion Integration  
VIRTFUSION_API_URL=https://virtfusion-instance.com/api/v1
VIRTFUSION_API_KEY=your_api_key

# Authentication
SESSION_SECRET=secure_random_string

# Email Service
SMTP2GO_API_KEY=smtp2go_key
SMTP_FROM=noreply@domain.com

# AI & Discord
GOOGLE_AI_API_KEY=gemini_api_key
DISCORD_BOT_TOKEN=bot_token
DISCORD_GUILD_ID=server_id

# PayPal
VITE_PAYPAL_CLIENT_ID=paypal_client_id
VITE_PAYPAL_SECRET=paypal_secret
VITE_PAYPAL_SANDBOX=true/false

# Optional Monitoring
BETTERSTACK_API_KEY=monitoring_api_key
```

### Development Setup
1. Clone repository and install dependencies: `npm install`
2. Set up PostgreSQL database and configure `DATABASE_URL`
3. Push database schema: `npm run db:push`
4. Create admin user: `npx tsx scripts/create-admin-user.ts`
5. Start development server: `npm run dev`

## Testing & Quality Assurance

### Running Single Tests
```bash
# Test specific functionality
npx tsx scripts/test-virtfusion-uuid-crosscheck.ts
npx tsx scripts/test-oauth-login.ts
npx tsx scripts/test-session-timeout.ts
```

### Database Testing Scripts
```bash
# Test specific schemas
npx tsx scripts/check-oauth-tables.ts  
npx tsx scripts/check-discord-tables.ts
npx tsx scripts/check-awards-schema.ts
```

## Deployment Considerations

### Production Checklist
- Ensure all environment variables are configured
- Database migrations applied (`npm run db:push`)
- Admin user created for initial access
- PM2 configured for process management
- SSL/TLS certificates configured for HTTPS
- Discord bot permissions configured if using Discord integration

### Docker Deployment
The project includes a multi-stage Dockerfile optimized for production:
- Uses Node.js 22.16-alpine for minimal footprint
- Non-root user for security
- Proper caching layers for faster builds
- Health checks on port 3333

### Common Troubleshooting
- **VirtFusion API errors:** Verify API credentials and network connectivity
- **Database connection issues:** Check connection string and database accessibility
- **Discord bot not responding:** Verify bot token and guild permissions
- **Email delivery problems:** Confirm SMTP2GO configuration and API limits
- **PayPal integration issues:** Check sandbox vs production settings

## Security Considerations

- **API keys** are scoped with granular permissions
- **Passwords** are hashed with bcrypt (10 rounds)
- **Session management** with automatic timeout and secure cookies
- **Input validation** using Zod schemas throughout
- **Rate limiting** on all API endpoints
- **CORS configuration** for cross-origin requests
- **Maintenance mode** with secure bypass token system

## Performance Optimization

- **Connection pooling** for database with configurable limits
- **Query optimization** using Drizzle ORM with proper indexing
- **Caching strategies** via Redis (configurable)
- **CDN integration** for static assets
- **Lazy loading** and code splitting in React frontend
- **WebSocket optimization** for VNC console performance
