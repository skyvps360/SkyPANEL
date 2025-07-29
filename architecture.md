# SkyPANEL System Architecture

This document provides a comprehensive overview of the SkyPANEL system architecture, including component interactions, data flow, and integration points.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Data Flow](#data-flow)
4. [Integration Points](#integration-points)
5. [Authentication Flow](#authentication-flow)
6. [Deployment Architecture](#deployment-architecture)
7. [Security Architecture](#security-architecture)
8. [Scalability Considerations](#scalability-considerations)
9. [Known Limitations](#known-limitations)

## Architecture Overview

SkyPANEL follows a modern web application architecture with a clear separation between frontend and backend components. The system is built using a Node.js/Express backend with a React frontend, communicating via RESTful APIs.

### High-Level Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Client Layer   │────▶│  Server Layer   │────▶│  Data Layer     │
│  (React)        │     │  (Express)      │     │  (PostgreSQL)   │
│                 │◀────│                 │◀────│                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │  ▲
                               │  │
                               ▼  │
                        ┌─────────────────┐
                        │                 │
                        │  External APIs  │
                        │  & Services     │
                        │                 │
                        └─────────────────┘
```

The architecture follows these key principles:

1. **Separation of Concerns**: Clear separation between UI, business logic, and data access
2. **API-First Design**: All functionality exposed through well-defined APIs
3. **Stateless Backend**: Server maintains minimal state, with client sessions stored in the database
4. **Responsive Design**: Frontend adapts to different device sizes and orientations
5. **Security by Design**: Security considerations built into all layers of the application

## System Components

### Client Layer

The client layer is built with React and TypeScript, providing a responsive and interactive user interface.

#### Key Components:

- **React Application**: Single-page application (SPA) built with React 18
- **State Management**: TanStack Query (React Query) for server state, React Context for application state
- **UI Components**: Shadcn/UI components built on top of Radix UI primitives
- **Routing**: Client-side routing using Wouter
- **API Client**: Axios for API communication with the backend
- **Authentication**: JWT-based authentication with secure token storage
- **Styling**: TailwindCSS for utility-first styling with custom theming support

### Server Layer

The server layer is built with Node.js and Express, providing RESTful APIs and business logic.

#### Key Components:

- **Express Server**: Handles HTTP requests and routing
- **Authentication Middleware**: Passport.js for authentication strategies
- **API Routes**: Organized by domain (users, servers, billing, etc.)
- **Service Layer**: Business logic separated from route handlers
- **Error Handling**: Centralized error handling and logging
- **Validation**: Input validation using Zod schemas
- **Caching**: Response caching for performance optimization
- **Rate Limiting**: Protection against abuse and DoS attacks

### Data Layer

The data layer is built with PostgreSQL and Drizzle ORM, providing persistent storage for application data.

#### Key Components:

- **PostgreSQL Database**: Primary data store
- **Drizzle ORM**: Type-safe database access layer
- **Migration System**: Database schema versioning and migrations
- **Connection Pooling**: Efficient database connection management
- **Query Building**: Type-safe query construction
- **Transactions**: ACID-compliant transaction support

### External Services

SkyPANEL integrates with several external services to provide additional functionality.

#### Key Integrations:

- **VirtFusion API**: Virtual server provisioning and management
- **PayPal API**: Payment processing for token purchases using the @paypal/react-paypal-js library
- **SMTP Services**: Email delivery
- **Discord API**: Notifications and bot integration with two-way ticket synchronization
- **Google Gemini AI**: AI-powered support features with rate limiting (15 RPM, 1,500 RPD)
- **BetterStack**: Monitoring and alerting
- **InterServer API**: DNS management (currently disabled due to API reliability issues)
- **Cloudflare Workers**: Edge computing deployment platform for global distribution

## Data Flow

This section describes the flow of data through the SkyPANEL system for key operations.

### User Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Frontend   │────▶│  Backend    │────▶│  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ▲                 ▲                   │                   │
     │                 │                   │                   │
     └─────────────────┴───────────────────┘                   │
                       ▲                                       │
                       │                                       │
                       └───────────────────────────────────────┘
```

1. User submits login credentials via the login form
2. Frontend sends credentials to the backend API
3. Backend validates credentials against the database
4. If valid, backend creates a session and returns a token
5. Frontend stores the token and includes it in subsequent requests
6. Backend validates the token on each protected request

### Server Provisioning Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Frontend   │────▶│  Backend    │────▶│  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │             │
                                    │ VirtFusion  │
                                    │    API      │
                                    │             │
                                    └─────────────┘
```

1. User selects server specifications and submits order
2. Frontend sends server creation request to backend API
3. Backend validates the request and creates billing records
4. Backend calls VirtFusion API to provision the server
5. Backend stores server details in the database
6. Backend returns server information to the frontend
7. Frontend displays server status and details to the user

### Payment Processing Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Frontend   │────▶│  Backend    │────▶│  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ▲                 ▲                   │
     │                 │                   │
     │                 │                   ▼
     │                 │           ┌─────────────┐
     │                 │           │             │
     │                 └───────────│   PayPal    │
     │                             │    API      │
     └─────────────────────────────│             │
                                   └─────────────┘
```

1. User initiates payment for credits/tokens
2. Frontend redirects to PayPal checkout or processes payment via PayPal SDK
3. User completes payment on PayPal
4. PayPal redirects back to SkyPANEL with payment information
5. Frontend sends payment verification request to backend
6. Backend verifies payment with PayPal API
7. Backend updates transaction records in the database
8. Backend returns updated status to frontend
9. Frontend displays payment confirmation to the user

### AI-Powered Support Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Frontend   │────▶│  Backend    │────▶│  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │             │
                                    │Google Gemini│
                                    │    API      │
                                    │             │
                                    └─────────────┘
```

1. User submits a support question in chat or ticket system
2. Frontend sends the question to the backend API
3. Backend forwards the query to Google Gemini AI with context including knowledge base info
4. Gemini AI generates a response with custom brand identity as "SkyAI"
5. Backend processes and filters the response to maintain consistent identity
6. Backend returns the response to the frontend
7. Frontend displays the AI response to the user

### VirtFusion User Synchronization Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  SkyPANEL   │────▶│ VirtFusion  │────▶│ VirtFusion  │
│ Account │     │  Backend    │     │     API     │     │  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ▲                 │                                       │
     │                 │                                       │
     │                 ▼                                       │
     │           ┌─────────────┐                              │
     │           │             │                              │
     │           │  SkyPANEL   │◀─────────────────────────────┘
     └───────────│  Database   │
                 │             │
                 └─────────────┘
```

1. User creates or updates their account in SkyPANEL
2. SkyPANEL backend checks if user has a VirtFusion ID
3. If not, SkyPANEL creates a new user in VirtFusion via API
4. VirtFusion API creates the user and returns the VirtFusion user ID
5. SkyPANEL stores the VirtFusion ID in the local database
6. User can now manage VirtFusion servers through SkyPANEL

### Discord Ticket Synchronization Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  User   │────▶│  SkyPANEL   │────▶│  Database   │
│         │     │  Ticket UI  │     │             │
└─────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐     ┌─────────────┐
                                    │             │     │             │
                                    │  Discord    │────▶│  Discord    │
                                    │  Bot        │     │  Server     │
                                    │             │     │             │
                                    └─────────────┘     └─────────────┘
                                          ▲
                                          │
┌─────────┐     ┌─────────────┐          │
│         │     │             │          │
│  Staff  │────▶│  Discord    │──────────┘
│  User   │     │  Thread     │
│         │     │             │
└─────────┘     └─────────────┘
```

1. User creates a support ticket in SkyPANEL
2. Ticket is stored in the database
3. Discord bot creates a new thread in the Discord server
4. Discord thread is linked to the ticket in the database
5. Staff can respond via Discord or SkyPANEL
6. Responses are synchronized between both platforms
7. When ticket is closed, thread is archived

### Unified Department Management Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  Admin  │────▶│  Unified    │────▶│  Database   │
│         │     │  Department │     │             │
│         │     │  Manager    │     │             │
└─────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │             │
                                    │  Chat &     │
                                    │  Support    │
                                    │  Systems    │
                                    │             │
                                    └─────────────┘
```

1. Admin creates or updates department via unified interface
2. Department configuration is stored in database
3. Department is available for both chat and support ticket systems
4. Users can select department when creating tickets or starting chats
5. Department settings control routing and permissions
6. Real-time updates sync across all systems

### Email Verification Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Register   │────▶│  Backend    │────▶│  Database   │
│         │     │  Form       │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     │                                     │
     │                                     ▼
     │                              ┌─────────────┐
     │                              │             │
     │                              │  Email      │
     │                              │  Service    │
     │                              │             │
     │                              └─────────────┘
     │                                     │
     ▼                                     │
┌─────────┐                                │
│         │                                │
│  Email  │◀───────────────────────────────┘
│  Inbox  │
│         │
└─────────┘
     │
     ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  Verify │────▶│  Backend    │────▶│  Database   │
│  Link   │     │  Verification│    │  (Update)   │
│         │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘
```

1. User submits registration form with email address
2. Backend validates input and creates unverified user account
3. Backend generates verification token and stores in database
4. Email service sends verification email with link/code
5. User receives email and clicks verification link
6. Backend validates token and updates user status to verified
7. User can now log in with full account privileges

### VNC Console Access Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  User   │────▶│  Server     │────▶│  Backend    │
│         │     │  Detail UI  │     │             │
└─────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │             │
                                    │ VirtFusion  │
                                    │    API      │
                                    │             │
                                    └─────────────┘
                                          │
                                          ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  User   │◀────│  NoVNC      │◀────│  VirtFusion │
│ Browser │     │  Client     │     │  VNC Server │
│         │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘
```

1. User requests VNC console access from server detail page
2. Backend validates user permission for the server
3. Backend requests VNC access from VirtFusion API
4. VirtFusion enables VNC and returns connection details
5. Backend returns VNC connection details to frontend
6. NoVNC client establishes connection to VirtFusion VNC server
7. User interacts with server console through browser

### Maintenance Mode Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  Admin  │────▶│  Admin      │────▶│  Backend    │
│         │     │  UI         │     │             │
└─────────┘     └─────────────┘     └─────────────┘
                                          │
                                          ▼
                                    ┌─────────────┐
                                    │             │
                                    │  Database   │
                                    │  Settings   │
                                    │             │
                                    └─────────────┘
                                          │
                                          ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │
│  User   │────▶│  Middleware │────▶│ Maintenance │
│         │     │  Check      │     │    Page     │
│         │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘
```

1. Admin enables maintenance mode with message and estimated time
2. Backend stores maintenance status in database
3. Backend sends notification to staff via Discord
4. When users access the site, maintenance middleware checks status
5. If maintenance mode is active, users are redirected to maintenance page
6. Admins can bypass maintenance mode with special token
7. When maintenance is complete, admin disables maintenance mode

## Integration Points

SkyPANEL integrates with several external services through well-defined integration points.

### VirtFusion Integration

VirtFusion provides the underlying virtualization platform for server provisioning and management.

**Integration Points:**
- Server creation and provisioning
- Server power management (start, stop, restart)
- Server resource monitoring
- Server OS reinstallation
- VNC console access
- Backup management
- User synchronization between SkyPANEL and VirtFusion

**Implementation:**
- RESTful API communication using API tokens
- Webhook support for status updates
- SSO integration for seamless user experience

### PayPal Integration

PayPal provides payment processing capabilities for token purchases.

**Integration Points:**
- Payment processing for VirtFusion token purchases (100 tokens = $1.00 USD)
- Server-side payment verification for security
- Transaction recording and receipt generation

**Implementation:**
- PayPal React component using @paypal/react-paypal-js
- Digital goods configuration (no shipping required)
- Amount validation (minimum $1, maximum $1000)
- Support for both production and sandbox environments
- Error handling for payment failures

### Email Service Integration

Email services are used for sending notifications, verification emails, and other communications.

**Integration Points:**
- User registration and verification
- Password reset
- Transaction notifications
- Service status updates
- Support ticket notifications

**Implementation:**
- SMTP integration with configurable providers
- Email templating system
- Email queue for reliable delivery
- Delivery status tracking

### Discord Integration

Discord integration provides notification capabilities and support chat functionality.

**Integration Points:**
- System notifications to Discord channels
- Support ticket updates and two-way synchronization
- Server status alerts
- User-to-admin communication
- AI-powered responses to Discord messages

**Implementation:**
- Discord Bot API with comprehensive permissions
- Thread synchronization with support tickets
- Status monitoring and reporting
- Slash commands for admin operations
- Integration with Google Gemini AI for responses

### Google Gemini AI Integration

Google Gemini AI provides intelligent responses for support and chat functionality.

**Integration Points:**
- Chat interface responses
- Support ticket suggestions
- Knowledge base searching
- Discord bot assistance

**Implementation:**
- Google Generative AI API integration
- Rate limiting (15 requests per minute, 1,500 per day)
- Brand-consistent response filtering to present as "SkyAI"
- Context-aware responses with documentation references
- Conversation history tracking for continuity
- Automatic signature with "- SkyAI" for brand consistency

### BetterStack Integration

BetterStack provides monitoring and alerting for system health and performance.

**Integration Points:**
- Service monitoring
- Uptime tracking
- Performance metrics
- Incident management

**Implementation:**
- API integration for status reporting
- Webhook notifications for incidents
- Status page integration
- Availability metrics

### InterServer API Integration (Currently Disabled)

InterServer API integration for DNS management is currently disabled due to reliability issues.

**Integration Points:**
- Domain management
- DNS record management
- Nameserver configuration

**Implementation:**
- RESTful API communication (disabled)
- Record synchronization (disabled)
- Billing integration for domain services (disabled)

## Authentication Flow

SkyPANEL uses a secure authentication system with multiple layers of protection.

### Registration and Login

1. User registers with email, password, and basic profile information
2. System validates email uniqueness and password strength
3. System hashes password using bcrypt before storage
4. System sends verification email to confirm email address
5. User verifies email by clicking link or entering code
6. User can now log in with verified credentials
7. Login creates a secure session and returns authentication token
8. Frontend stores token securely for subsequent requests

### API Authentication

1. Frontend includes authentication token in API requests
2. Backend validates token for each protected endpoint
3. Invalid or expired tokens result in 401 Unauthorized responses
4. Successful validation allows request processing
5. Role-based permissions control access to specific endpoints

### API Key Authentication

1. Users can generate API keys with specific scopes
2. API keys are used for programmatic access to the API
3. Keys are validated on each request and checked against required scopes
4. Rate limiting is applied to API key usage
5. Users can revoke keys at any time

## Deployment Architecture

SkyPANEL supports multiple deployment options for different environments.

### Development Environment

- Local Node.js server with hot reloading
- Local PostgreSQL database
- Environment variables for configuration
- Development-specific logging and debugging

### Production Environment

**Docker Deployment:**
- Docker containers for application components
- Docker Compose for orchestration
- PostgreSQL database container or external database
- Nginx reverse proxy for SSL termination
- Environment variables for configuration

**PM2 Deployment:**
- PM2 process manager for Node.js application
- Cluster mode for multiple workers
- Load balancing across CPU cores
- Process monitoring and auto-restart
- External PostgreSQL database

**Cloudflare Wrangler Deployment:**
- Cloudflare Workers for edge computing
- Global deployment to 200+ locations
- Automatic scaling and DDoS protection
- Low-latency global distribution
- Pay-per-use pricing model
- Built-in SSL and security features

### Continuous Integration/Deployment

- Automated testing before deployment
- Database migration scripts
- Rolling updates for zero-downtime deployment
- Backup procedures for database and user data

## Security Architecture

SkyPANEL implements comprehensive security measures across all system layers.

### Authentication Security

- Bcrypt password hashing with appropriate work factor
- Secure session management
- CSRF protection for form submissions
- Rate limiting for login attempts
- Account lockout after multiple failed attempts
- Email verification for new accounts
- Secure password reset workflow

### API Security

- JWT validation for authenticated requests
- API key validation with scope checking
- Rate limiting to prevent abuse
- Input validation for all endpoints
- Output sanitization to prevent XSS
- Content Security Policy implementation
- CORS configuration for API access

### Data Security

- Encrypted database connections
- Sensitive data encryption at rest
- PCI compliance for payment processing
- Secure handling of API keys and secrets
- Regular security updates and patches

## Scalability Considerations

SkyPANEL is designed with scalability in mind to handle growing user bases and increased load.

### Horizontal Scaling

- Stateless application design allows multiple instances
- Database connection pooling for efficient resource usage
- Caching strategies to reduce database load
- Load balancing across multiple application instances

### Vertical Scaling

- Optimized database queries for performance
- Efficient resource usage in application code
- Memory and CPU profiling for bottleneck identification
- Database indexing for query performance

### Caching Strategies

- Response caching for frequently accessed data
- Memory caching for database query results
- Static asset caching with appropriate headers
- Distributed caching options for multi-instance deployments

## Known Limitations

### InterServer DNS System

The InterServer DNS system is currently disabled due to API reliability issues when deployed on DigitalOcean. This affects:

- Domain management features
- DNS record management
- Nameserver configuration

The DNS-related routes and components are commented out in both frontend and backend code. In the frontend, these files are disabled:
- `DnsDomainsPage`
- `DnsRecordsPage`
- `DnsPlansPage`
- `AdminDnsPage`

In the backend, these route imports are commented out:
- `dnsRoutes`
- `adminDnsRoutes`

This feature will remain disabled until the InterServer API reliability issues are resolved.

### Other Limitations

- VirtFusion API rate limits may affect operations during high load
- Google Gemini AI has usage limits (15 requests per minute, 1,500 per day)
- PayPal integration requires proper environment variable configuration
- Discord bot requires proper permissions and token configuration

---

This architecture documentation provides a high-level overview of the SkyPANEL system. For more detailed information about specific components, refer to the corresponding documentation files.