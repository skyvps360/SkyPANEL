# SkyPANEL Project Structure

This document outlines the directory structure of the SkyPANEL application to help developers understand the codebase organization.

## Root Directory

```
SkyPANEL/
├── .github/                 # GitHub workflows and configurations
├── .windsurf/               # Windsurf IDE configurations
├── admin/                   # Backend admin interface
│   ├── controllers/         # Request handlers
│   ├── middleware/          # Express middleware
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   └── services/            # Business logic
├── client/                  # Frontend application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Next.js pages
│   │   ├── styles/         # Global styles
│   │   └── utils/          # Utility functions
├── docs-by-augment/         # Auto-generated documentation
├── md-docs/                 # Project documentation
├── migrations/              # Database migrations
├── scripts/                 # Utility scripts
└── tests/                   # Test files
```

## Key Directories

### `/admin` - Backend Server
- **controllers/**: Handle HTTP requests and responses
- **middleware/**: Express middleware for auth, validation, etc.
- **models/**: Database models and schemas
- **routes/**: API endpoint definitions
- **services/**: Business logic and external service integrations

### `/client` - Frontend Application
- **public/**: Static assets (images, fonts, etc.)
- **src/components/**: Reusable UI components
- **src/pages/**: Next.js page components
- **src/styles/**: Global styles and theme configurations
- **src/utils/**: Helper functions and utilities

### `/md-docs` - Documentation
Contains all project documentation in Markdown format.

## Environment Variables

The application uses environment variables for configuration. A `.env` file is required with the following variables:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/dbname

# VirtFusion
VIRT_FUSION_API_URL=https://api.virtfusion.example.com
VIRT_FUSION_API_KEY=your_api_key

# Authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Other configurations
NODE_ENV=development
```

## Development Workflow

1. **Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Database**:
   - Ensure PostgreSQL is running
   - Run migrations: `npm run db:migrate`

3. **Development**:
   - Start backend: `npm run dev:server`
   - Start frontend: `npm run dev:client`

4. **Testing**:
   - Run tests: `npm test`
   - Run linter: `npm run lint`

## Deployment

1. **Build**: `npm run build`
2. **Start**: `npm start`

## Contributing

1. Create a new branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Commit with a descriptive message
4. Push to the branch: `git push origin feature/your-feature`
5. Create a Pull Request

## Code Style

- Follow the existing code style
- Use TypeScript types where possible
- Add JSDoc comments for complex functions
- Keep components small and focused
- Write tests for new features
