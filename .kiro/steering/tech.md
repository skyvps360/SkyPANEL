# SkyPANEL Technology Stack

## Architecture

Full-stack TypeScript application with clear separation between client and server layers:

- **Frontend**: React 18 SPA with TypeScript
- **Backend**: Node.js/Express API server
- **Database**: PostgreSQL with Drizzle ORM
- **Build System**: Vite for frontend, ESBuild for backend

## Frontend Stack

### Core Technologies
- **React 18**: Modern UI library with hooks and concurrent features
- **TypeScript**: Type-safe development with strict configuration
- **Vite**: Fast development server with HMR and optimized builds
- **Wouter**: Lightweight client-side routing

### UI & Styling
- **TailwindCSS**: Utility-first CSS framework with custom theming
- **Shadcn/UI**: High-quality components built on Radix UI primitives
- **Radix UI**: Unstyled, accessible component library
- **Framer Motion**: Animation library for smooth interactions

### State Management
- **TanStack Query (React Query)**: Server state management and caching
- **React Hook Form**: Form handling with Zod validation
- **React Context**: Application state for auth and settings

### Specialized Libraries
- **NoVNC**: Web-based VNC client for server console access
- **React Leaflet**: Interactive maps for datacenter visualization
- **Recharts**: Data visualization and analytics charts
- **React Markdown**: Markdown rendering with syntax highlighting

## Backend Stack

### Core Technologies
- **Node.js**: JavaScript runtime with ES modules
- **Express**: Web framework with middleware architecture
- **TypeScript**: Type-safe server development
- **Drizzle ORM**: Type-safe SQL ORM with PostgreSQL

### Authentication & Security
- **Passport.js**: Authentication middleware with local strategy
- **Bcrypt**: Password hashing and security
- **Express Session**: Session management with PostgreSQL store
- **CORS**: Cross-origin resource sharing configuration

### Validation & API
- **Zod**: TypeScript-first schema validation
- **Express Rate Limiting**: API protection against abuse
- **JWT**: Token-based authentication for API access

## Database

### PostgreSQL Setup
- **Drizzle ORM**: Type-safe database access with migrations
- **Connection Pooling**: Efficient resource management
- **Schema Migrations**: Version-controlled database changes via `drizzle-kit`

### Key Commands
```bash
# Database operations
npm run db:push          # Push schema changes to database
npx drizzle-kit generate # Generate migration files
npx drizzle-kit migrate  # Run pending migrations
```

## External Integrations

### Core Services
- **VirtFusion API**: Server provisioning and management
- **PayPal SDK**: Payment processing (@paypal/react-paypal-js)
- **Google Gemini AI**: AI-powered support responses
- **Discord.js**: Bot integration and webhook notifications

### Communication
- **SMTP2GO**: Email delivery service
- **SendGrid**: Alternative email provider
- **BetterStack**: Infrastructure monitoring and alerting

## Development Commands

### Development
```bash
npm run dev              # Start development server (port 3333)
npm run dev:clean        # Clean cache and start dev server
npm run clean            # Clear Vite cache
npm run check            # TypeScript type checking
```

### Building & Production
```bash
npm run build            # Build for production (client + server)
npm run start            # Start production server
npm run build:start      # Build and start production
```

### Process Management (PM2)
```bash
npm run start:pm2:linux    # Start with PM2 on Linux
npm run start:pm2:windows  # Start with PM2 on Windows
npm run stop:pm2           # Stop PM2 processes
npm run restart:pm2        # Restart PM2 processes
npm run logs:pm2           # View PM2 logs
```

### Testing & Quality
```bash
npm run test             # Run test suite with Vitest
npm run test:watch       # Run tests in watch mode
npm run health-check     # Check application health
npm run verify-env       # Validate environment variables
```

### Deployment
```bash
# Docker deployment
docker-compose build     # Build Docker image
docker-compose up -d     # Start containers in background

# Production deployment with PM2
npm run pull:pm2:restart:linux  # Git pull, build, and restart
```

## Configuration Files

### Build Configuration
- `vite.config.ts`: Frontend build configuration with proxy setup
- `tsconfig.json`: TypeScript configuration for all packages
- `tailwind.config.ts`: TailwindCSS theming and utilities
- `drizzle.config.ts`: Database ORM configuration

### Deployment
- `Dockerfile`: Multi-stage Docker build for production
- `docker-compose.yml`: Container orchestration
- `pm2.config.cjs`: Process manager configuration
- `.env`: Environment variables (not in repo)

## Environment Setup

Required environment variables for development:
```bash
DATABASE_URL=postgres://user:pass@host:port/db
SESSION_SECRET=secure_random_string
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_api_key
GOOGLE_AI_API_KEY=your_gemini_key
# See .env.example for complete list
```

## Code Quality

### TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Path aliases: `@/*` for client, `@shared/*` for shared code
- ESNext modules with bundler resolution

### Linting & Formatting
- ESLint configuration for TypeScript and React
- Husky git hooks for pre-commit validation
- Consistent code style across frontend and backend