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

- **React Application**: Single-page application (SPA) built with React
- **State Management**: React Query for server state, React Context for application state
- **UI Components**: Custom components built on top of Radix UI primitives
- **Routing**: Client-side routing using Wouter
- **API Client**: Axios for API communication with the backend
- **Authentication**: JWT-based authentication with secure token storage

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
- **PayPal API**: Payment processing
- **SMTP Services**: Email delivery
- **Discord API**: Notifications and bot integration
- **Google Gemini AI**: AI-powered features
- **BetterStack**: Monitoring and alerting

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

1. User initiates payment for an invoice
2. Frontend redirects to PayPal checkout or processes payment via PayPal SDK
3. User completes payment on PayPal
4. PayPal redirects back to SkyPANEL with payment information
5. Frontend sends payment verification request to backend
6. Backend verifies payment with PayPal API
7. Backend updates invoice and transaction records in the database
8. Backend returns updated invoice status to frontend
9. Frontend displays payment confirmation to the user

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

**Implementation:**
- RESTful API communication using API tokens
- Webhook support for status updates
- SSO integration for seamless user experience

### PayPal Integration

PayPal provides payment processing capabilities for invoices and service purchases.

**Integration Points:**
- Payment processing for invoices
- Subscription management
- Refund processing
- Payment verification

**Implementation:**
- PayPal JavaScript SDK for frontend integration
- PayPal Server SDK for backend verification
- IPN (Instant Payment Notification) for asynchronous updates

### Email Service Integration

Email services are used for sending notifications, verification emails, and other communications.

**Integration Points:**
- User registration and verification
- Password reset
- Invoice notifications
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
- Support ticket updates
- Server status alerts
- User-to-admin communication

**Implementation:**
- Discord Bot API
- Webhook integration for notifications
- Role-based access control

### Google Gemini AI Integration

Google Gemini AI provides artificial intelligence capabilities for various features.

**Integration Points:**
- AI-assisted support responses
- Content generation
- Anomaly detection in server metrics
- Predictive analytics

**Implementation:**
- Google Generative AI API
- Prompt engineering for specific use cases
- Response filtering and validation

### BetterStack Integration

BetterStack provides monitoring and alerting capabilities for system health.

**Integration Points:**
- Uptime monitoring
- Performance tracking
- Error logging
- Alert notifications

**Implementation:**
- API integration for status updates
- Webhook integration for alerts
- Custom metrics reporting

## Authentication Flow

SkyPANEL implements a comprehensive authentication system with multiple authentication methods.

### Standard Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Login Form │────▶│  Auth API   │────▶│  Database   │
│         │     │             │     │             │     │             │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ▲                                     │
     │                                     │
     │                                     ▼
     │                             ┌─────────────┐
     │                             │             │
     │                             │  Session    │
     │                             │  Store      │
     │                             │             │
     └─────────────────────────────└─────────────┘
```

1. User enters credentials in the login form
2. Frontend sends credentials to the authentication API
3. Backend validates credentials against the database
4. If valid, backend creates a session in the session store
5. Backend returns a session cookie or token to the frontend
6. Frontend stores the authentication token
7. Frontend includes the token in subsequent API requests
8. Backend validates the token on each protected request

### SSO Authentication Flow

```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│         │     │             │     │             │     │             │
│  User   │────▶│  Frontend   │────▶│  Backend    │────▶│ VirtFusion  │
│         │     │             │     │             │     │    SSO      │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     ▲                 ▲                   ▲                   │
     │                 │                   │                   │
     └─────────────────┴───────────────────┘                   │
                       ▲                                       │
                       │                                       │
                       └───────────────────────────────────────┘
```

1. User initiates SSO login
2. Backend redirects to VirtFusion SSO endpoint
3. User authenticates with VirtFusion
4. VirtFusion redirects back to SkyPANEL with authentication token
5. Backend validates the token with VirtFusion
6. Backend creates a local session for the user
7. Backend returns session information to the frontend
8. Frontend stores the session and proceeds with authenticated access

## Deployment Architecture

SkyPANEL can be deployed in various configurations depending on scale and requirements.

### Single-Server Deployment

```
┌─────────────────────────────────────────────┐
│                                             │
│                  Server                     │
│                                             │
│  ┌─────────────┐     ┌─────────────┐        │
│  │             │     │             │        │
│  │  Node.js    │     │  PostgreSQL │        │
│  │  Express    │     │  Database   │        │
│  │             │     │             │        │
│  └─────────────┘     └─────────────┘        │
│                                             │
└─────────────────────────────────────────────┘
```

Suitable for development and small-scale deployments.

### Multi-Server Deployment

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │             │     │             │
│  Load       │────▶│  App Server │     │  Database   │
│  Balancer   │     │  Cluster    │────▶│  Server     │
│             │────▶│  (PM2)      │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │             │
                                        │  Redis      │
                                        │  Cache      │
                                        │             │
                                        └─────────────┘
```

Suitable for production deployments with higher traffic and availability requirements.

### Containerized Deployment

```
┌─────────────┐     ┌─────────────────────────────┐
│             │     │                             │
│  Load       │     │  Kubernetes Cluster         │
│  Balancer   │     │                             │
│             │     │  ┌─────────┐   ┌─────────┐  │
└─────────────┘     │  │         │   │         │  │
      │             │  │ App Pods│   │ DB Pods │  │
      └─────────────┼─▶│         │──▶│         │  │
                    │  └─────────┘   └─────────┘  │
                    │                             │
                    └─────────────────────────────┘
```

Suitable for cloud-native deployments with auto-scaling and high availability requirements.

## Security Architecture

SkyPANEL implements a comprehensive security architecture to protect user data and system integrity.

### Authentication and Authorization

- **Multi-factor Authentication**: Optional second factor for user accounts
- **Role-Based Access Control**: Granular permissions based on user roles
- **Session Management**: Secure session handling with proper expiration
- **Password Policies**: Strong password requirements and secure storage

### Data Protection

- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: HTTPS for all communications
- **Data Minimization**: Collection of only necessary user data
- **Secure Deletion**: Proper data removal procedures

### API Security

- **Input Validation**: Thorough validation of all user inputs
- **Rate Limiting**: Protection against brute force and DoS attacks
- **CORS Policies**: Strict cross-origin resource sharing policies
- **API Authentication**: Token-based authentication for all API requests

### Infrastructure Security

- **Firewall Configuration**: Restricted network access
- **Regular Updates**: Timely application of security patches
- **Vulnerability Scanning**: Regular security assessments
- **Secure Configuration**: Hardened server configurations

## Scalability Considerations

SkyPANEL is designed with scalability in mind to accommodate growing user bases and increasing demands.

### Horizontal Scaling

- **Stateless Design**: Enables adding more application servers
- **Load Balancing**: Distribution of traffic across multiple servers
- **Database Replication**: Read replicas for scaling read operations
- **Sharding**: Potential for database sharding for very large deployments

### Vertical Scaling

- **Resource Optimization**: Efficient use of server resources
- **Database Indexing**: Strategic indexes for query performance
- **Caching Strategies**: Multi-level caching to reduce database load
- **Query Optimization**: Performance tuning of database queries

### Operational Scaling

- **Monitoring**: Comprehensive monitoring for identifying bottlenecks
- **Automation**: Automated deployment and scaling procedures
- **Performance Testing**: Regular load testing to identify scaling needs
- **Capacity Planning**: Proactive resource allocation based on growth projections

---

This architecture documentation provides a high-level overview of the SkyPANEL system. For more detailed information about specific components, refer to the corresponding documentation files.