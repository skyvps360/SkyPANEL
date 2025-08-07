# SkyPANEL Frontend Architecture

This document provides a comprehensive overview of the SkyPANEL frontend architecture, components, and development practices.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Styling System](#styling-system)
- [Routing](#routing)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [Internationalization](#internationalization)
- [Performance Optimization](#performance-optimization)
- [Testing Strategy](#testing-strategy)
- [Accessibility](#accessibility)

## Technology Stack

- **Framework**: Next.js 13+ (App Router)
- **Language**: TypeScript 5+
- **Styling**: TailwindCSS with custom theming
- **UI Components**: shadcn/ui (Radix UI + TailwindCSS)
- **State Management**: React Query, Zustand
- **Forms**: React Hook Form with Zod validation
- **Authentication**: NextAuth.js
- **Data Fetching**: React Query
- **Internationalization**: next-intl
- **Testing**: Jest, React Testing Library, Cypress
- **Linting/Formatting**: ESLint, Prettier
- **Build Tool**: Vite

## Project Structure

```
client/
├── public/                 # Static assets
│   ├── images/             # Image assets
│   └── locales/            # Translation files
└── src/
    ├── components/         # Reusable UI components
    │   ├── ui/             # Base UI components (shadcn/ui)
    │   ├── dashboard/       # Dashboard-specific components
    │   ├── forms/          # Form components
    │   └── layout/         # Layout components
    │
    ├── hooks/             # Custom React hooks
    ├── lib/                # Utility functions and configurations
    │   ├── api/           # API client and request handlers
    │   ├── auth/          # Authentication utilities
    │   ├── hooks/         # Custom hooks
    │   └── utils/         # Utility functions
    │
    ├── pages/             # Next.js page components
    │   ├── api/           # API routes
    │   ├── dashboard/     # Dashboard pages
    │   ├── auth/         # Authentication pages
    │   └── _app.tsx      # Custom App component
    │
    ├── styles/            # Global styles
    │   ├── globals.css   # Global CSS
    │   └── theme.ts      # Theme configuration
    │
    └── types/             # TypeScript type definitions
```

## Component Architecture

### Component Categories

1. **UI Components** (`/components/ui`)
   - Base building blocks (buttons, inputs, dialogs, etc.)
   - Built on top of Radix UI primitives
   - Styled with TailwindCSS
   - Fully typed with TypeScript

2. **Layout Components** (`/components/layout`)
   - Page layouts
   - Navigation components
   - Sidebar and header components
   - Responsive containers

3. **Form Components** (`/components/forms`)
   - Form controls
   - Form validation
   - Form builders
   - Custom form fields

4. **Dashboard Components** (`/components/dashboard`)
   - Dashboard cards
   - Data tables
   - Charts and graphs
   - Status indicators

### Component Patterns

- **Composition**: Components are built using composition patterns
- **Props**: Strictly typed with TypeScript interfaces
- **State**: Local state with React hooks, global state with Zustand
- **Styling**: Utility-first with TailwindCSS, custom themes supported
- **Accessibility**: Built with a11y in mind (ARIA attributes, keyboard navigation)

## State Management

### Local State
- React `useState` for component-level state
- React `useReducer` for complex state logic
- React `useContext` for component tree state sharing

### Global State
- **React Query**: Server state management
- **Zustand**: Client-side global state
- **URL State**: For filter and search states

### Data Fetching
- **React Query** for all data fetching
- Automatic caching and background updates
- Optimistic updates
- Request deduplication

## Styling System

### TailwindCSS
- Utility-first CSS framework
- Custom theme configuration
- Responsive design utilities
- Dark mode support

### Custom Themes
- Defined in `src/styles/theme.ts`
- Supports light/dark mode
- Brand colors and design tokens
- Consistent spacing and typography scales

### CSS Modules
- Used for component-specific styles
- Scoped CSS classes
- Composes with Tailwind utilities

## Routing

### File-system based routing
- Pages are created in the `pages` directory
- Dynamic routes with `[param]` syntax
- Nested routes with directories

### Navigation
- `next/link` for client-side navigation
- `next/router` for programmatic navigation
- Route transitions and loading states

## API Integration

### API Client
- Centralized API client in `src/lib/api`
- Axios for HTTP requests
- Request/response interceptors
- Error handling middleware

### API Routes
- Serverless API routes in `pages/api`
- RESTful endpoints
- Type-safe request/response types

## Authentication

### NextAuth.js
- Email/password authentication
- OAuth providers (Google, GitHub, etc.)
- JWT-based sessions
- Role-based access control

### Protected Routes
- Higher-order components for auth protection
- Server-side auth checks
- Role-based route guards

## Internationalization

### next-intl
- Multi-language support
- RTL language support
- Dynamic message loading
- Formatting utilities

## Performance Optimization

### Code Splitting
- Dynamic imports for components
- Route-based code splitting
- Lazy loading of non-critical components

### Image Optimization
- Next.js Image component
- Automatic image optimization
- Lazy loading
- Responsive images

### Bundle Analysis
- Webpack bundle analyzer
- Code splitting strategy
- Tree shaking

## Testing Strategy

### Unit Testing
- Jest test runner
- React Testing Library
- Component testing
- Utility function testing

### Integration Testing
- Component integration tests
- API integration tests
- End-to-end tests with Cypress

### Testing Library
- `@testing-library/react` for component testing
- `@testing-library/user-event` for user interactions
- `msw` for API mocking

## Accessibility

### ARIA Attributes
- Proper ARIA roles and attributes
- Keyboard navigation
- Screen reader support

### Testing
- Axe-core for accessibility testing
- Manual keyboard testing
- Screen reader testing

## Development Workflow

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm run start
```

### Code Quality
- ESLint for code linting
- Prettier for code formatting
- Husky for git hooks
- Lint-staged for pre-commit checks

## Deployment

### Build Process
- Next.js static export
- Optimized production build
- Environment-specific configurations

### Deployment Platforms
- Vercel (recommended)
- Netlify
- Self-hosted Node.js server

## Best Practices

### Code Organization
- Feature-based file structure
- Co-located tests
- Clear separation of concerns

### Performance
- Code splitting
- Image optimization
- Lazy loading
- Bundle size monitoring

### Security
- Input validation
- XSS protection
- CSRF protection
- Secure headers

## Troubleshooting

### Common Issues
- **Module not found**: Ensure all dependencies are installed
- **Type errors**: Check TypeScript configurations
- **Styling issues**: Verify Tailwind class names and custom configurations
- **API errors**: Check network requests and CORS settings

### Getting Help
- Check the project's GitHub issues
- Consult the documentation
- Reach out to the development team
