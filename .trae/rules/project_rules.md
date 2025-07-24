# SkyPANEL Project Rules for Trae IDE

## 1. Framework Versions and Core Dependencies
   - **Node.js**: v18.x or higher
   - **React**: v18.3.1
   - **TypeScript**: v5.6.3
   - **Vite**: v6.3.5 (build tool)
   - **Express**: v4.21.2 (backend server)
   - **Tailwind CSS**: v3.4.17
   - **Drizzle ORM**: v0.39.1 (database)
   - **PostgreSQL**: v8.15.6 (database driver)
   - **Wouter**: v3.3.5 (routing)
   - **Zod**: v3.24.2 (validation)
   - **PM2**: v6.0.8 (process management)

## 2. Project Architecture
   - **Monorepo Structure**: Full-stack application with shared types
   - **Frontend**: React + Vite + TypeScript
   - **Backend**: Express + TypeScript + Drizzle ORM
   - **Database**: PostgreSQL with Drizzle migrations
   - **Styling**: Tailwind CSS + Radix UI components
   - **State Management**: React Query + React hooks
   - **Authentication**: Passport.js with session management

## 3. Directory Structure
   ```
   /client/                 # Frontend React application
     /src/
       /components/         # Reusable UI components
       /pages/             # Page components
       /hooks/             # Custom React hooks
       /lib/               # Utility libraries
       /types/             # TypeScript type definitions
       /styles/            # CSS and styling files
   /server/                # Backend Express application
     /routes/            # API route handlers
     /services/          # Business logic services
     /middleware/        # Express middleware
     /discord/           # Discord bot integration
   /shared/                # Shared types and utilities
     /schemas/           # Zod validation schemas
   /migrations/            # Database migration files
   /scripts/              # Utility and migration scripts
   ```

## 4. Code Style Guidelines
   - **TypeScript**: Mandatory for all new code
   - **ESM Modules**: Use ES modules throughout
   - **Component Style**: Functional components with hooks
   - **Naming Conventions**:
     - Components: PascalCase (e.g., `UserProfile.tsx`)
     - Files: kebab-case for pages, PascalCase for components
     - Variables/Functions: camelCase
     - Constants: UPPER_SNAKE_CASE
   - **Import Aliases**:
     - `@/*` for client source files
     - `@shared/*` for shared utilities

## 5. Database and API Guidelines
   - **ORM**: Use Drizzle ORM for all database operations
   - **Migrations**: Store in `/migrations/` directory
   - **Schema**: Define in `/shared/schema.ts`
   - **Validation**: Use Zod schemas for API validation
   - **API Routes**: Organize in `/server/routes/`
   - **Services**: Business logic in `/server/services/`

## 6. UI/UX Standards
   - **Component Library**: Radix UI + shadcn/ui components
   - **Styling**: Tailwind CSS with custom design system
   - **Icons**: Lucide React icons
   - **Responsive Design**: Mobile-first approach
   - **Dark Mode**: Support via next-themes
   - **Animations**: Framer Motion for complex animations

## 7. Testing Requirements
   - **Testing Framework**: Vitest
   - **Coverage**: Maintain minimum 70% test coverage
   - **Component Testing**: Focus on critical user flows
   - **API Testing**: Test all endpoints
   - **Commands**: `npm test` and `npm run test:watch`

## 8. Development Workflow
   - **Environment**: Use `.env` files for configuration
   - **Development Server**: `npm run dev` (port 3333)
   - **Build Process**: Vite for frontend, esbuild for backend
   - **Process Management**: PM2 for production
   - **Hot Reload**: Enabled in development mode

## 9. Security and Authentication
   - **Session Management**: Express sessions with PostgreSQL store
   - **Password Hashing**: bcrypt for password security
   - **Input Validation**: Zod schemas for all inputs
   - **CORS**: Configured for cross-origin requests
   - **Environment Variables**: Never commit secrets
   - **API Keys**: Secure storage and rotation

## 10. Performance and Optimization
   - **Bundle Analysis**: Monitor build sizes
   - **Code Splitting**: Implement route-based splitting
   - **Caching**: Redis for session and data caching
   - **Database**: Optimize queries and use indexes
   - **Assets**: Optimize images and static files
   - **Monitoring**: BetterStack integration for uptime

## 11. Third-Party Integrations
   - **Payment**: PayPal SDK integration
   - **Email**: SendGrid and Nodemailer
   - **VPS Management**: VirtFusion API
   - **Discord**: Bot integration for notifications
   - **AI**: Google Gemini for chat features
   - **Maps**: Leaflet for location services

## 12. Deployment and DevOps
   - **Production Build**: `npm run build`
   - **Process Manager**: PM2 with ecosystem files
   - **Environment**: Support for development/production
   - **Health Checks**: `/api/health` endpoint
   - **Logging**: Structured logging with rotation
   - **Docker**: Containerization support available
   - **Port**: Found in the `.env`
   - **NEVER**: Use `npm run db:push` as this applicaiton is attached to a live postgres neon.tech database