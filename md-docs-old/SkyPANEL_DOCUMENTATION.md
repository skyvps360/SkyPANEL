# SkyPANEL Documentation

## Overview

SkyPANEL is a comprehensive server and infrastructure management platform that provides hosting services, DNS management, server administration, and billing capabilities. This document covers the key features, architecture, deployment options, and configuration parameters for the SkyPANEL application.

## Features

### Server Management

- Server provisioning and configuration
- Resource monitoring and allocation
- Start, stop, reboot operations
- VNC console access through web browser
- Server status monitoring

### DNS Management

- DNS zone and record management
- DNS plan subscription options
- Domain registration and configuration
- DNS checkout workflow for service purchase
- Multi-zone management capabilities

### Billing and Plans

- Plan and pricing management
- PayPal payment integration
- Transaction history and reporting
- Subscription management
- Administrative billing dashboard

### User Support

- Support ticket system
- Real-time chat functionality
- Email notifications via SendGrid
- Knowledge base and documentation
- System status page

### Administrative Features

- User management
- Datacenter configuration
- Service monitoring
- Plan and pricing configuration
- Transaction monitoring and reporting

### System Tools

- Network speed testing
- Status monitoring
- Resource usage reporting
- User account management
- Blog/news publication

## Technical Architecture

### Frontend Architecture

SkyPANEL uses a React-based frontend with the following key components:

- **React**: Core UI library
- **React Query**: Server state management and data fetching
- **React Hook Form**: Form handling and validation
- **Radix UI**: Accessible UI component primitives
- **Tailwind CSS**: Utility-first styling framework

The frontend is organized into feature-based components:

```
client/src/
  components/          # Reusable UI components
    admin/             # Admin dashboard components
    billing/           # Billing management components
    chat/              # Chat interface components
    dashboard/         # User dashboard components
    datacenter/        # Datacenter management components
    dns/               # DNS management components
    layout/            # Layout components
    loading/           # Loading states and indicators
    server/            # Server management components
    servers/           # Multi-server components
    tickets/           # Support ticket components
    ui/                # Generic UI components
  hooks/               # Custom React hooks
  lib/                 # Utility libraries
    novnc/             # VNC console integration
  pages/               # Page components and routes
  styles/              # Global styles
  types/               # TypeScript type definitions
```

### Backend Architecture

The backend uses a Node.js/Express.js architecture:

- **Express.js**: Web server framework
- **Drizzle ORM**: Database access and management
- **Authentication**: Session-based or JWT authentication
- **SendGrid**: Email communication services
- **WebSockets**: Real-time communications

The backend is organized into:

```
server/
  billing/           # Billing and payment services
  db/                # Database configuration
  middleware/        # Express middleware
  migrations/        # Database migrations
  routes/            # API endpoints
  services/          # Business logic services
  webhooks/          # External service webhooks
```

### Database

SkyPANEL uses a relational database managed through Drizzle ORM with schemas for:

- Users and authentication
- Servers and resources
- DNS zones and records
- Billing and transactions
- Support tickets and chat logs
- System configuration

## Deployment

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Production Deployment

SkyPANEL is optimized for DigitalOcean App Platform deployment:

```bash
# Build for production
npm run build

# Start production server
npm start
```

### DigitalOcean App Platform Configuration

SkyPANEL includes specific optimizations for DigitalOcean App Platform:

- **Instance Size**: Basic XXS (upgradeable)
- **Build Command**: `npm run build`
- **Run Command**: `npm start`
- **Environment**: Node.js 18+

Configuration is provided in `.do/app.yaml`.

### Environment Variables

Required environment variables:

```
NODE_ENV=production
PORT=8080
DATABASE_URL=your_database_connection_string
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_SECRET=your_paypal_secret
# Other environment variables as needed
```

## Build Optimizations

SkyPANEL implements several build optimizations:

- **Bundle Splitting**: Reduces main bundle size by 22% (3.1MB to 2.4MB)
- **Vendor Chunking**:
  - `react-vendor`: React core libraries
  - `ui-vendor`: Radix UI components
  - `chart-vendor`: Chart libraries
  - `form-vendor`: Form handling libraries
  - `query-vendor`: React Query
- **Modern Features**: Targets ESNext for modern browsers
- **Performance**: Disables development plugins in production

## Payment Processing

SkyPANEL uses PayPal for payment processing, having migrated away from Stripe. Integration requires PayPal Client ID and Secret, configured through environment variables.

## Process Management

The application uses PM2 for process management in production, configured via `pm2.config.cjs`. For platforms that use Procfile (like Heroku or DigitalOcean App Platform), configuration is provided in the `Procfile`.

## Troubleshooting

### Build Issues

- Ensure all environment variables are set
- Verify Node.js version (18+)
- Check dependencies are correctly categorized

### Runtime Issues

- Check application logs
- Verify database connectivity
- Ensure required environment variables are set

### Performance Issues

- Consider upgrading instance size
- Monitor memory usage
- Review bundle size optimizations

## Security Considerations

SkyPANEL implements security best practices:

- Secure authentication with password hashing
- Role-based access control
- Input validation and sanitization
- Secure environment configuration
- HTTPS enforcement
- Database connection security

## Additional Resources

For more information, refer to:

- DigitalOcean App Platform documentation
- Application documentation in the `/docs` directory
- API documentation available at `/api-docs` endpoint