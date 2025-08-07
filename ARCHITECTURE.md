# SkyPANEL System Architecture

This document provides a comprehensive overview of the SkyPANEL system architecture, including component interactions, data flow, integration points, and deployment strategies.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Components](#system-components)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Integration Architecture](#integration-architecture)
5. [Authentication & Security](#authentication--security)
6. [Database Design](#database-design)
7. [API Architecture](#api-architecture)
8. [Deployment Architecture](#deployment-architecture)
9. [Scalability & Performance](#scalability--performance)
10. [Security Architecture](#security-architecture)
11. [Monitoring & Observability](#monitoring--observability)
12. [Known Limitations](#known-limitations)

---

## Architecture Overview

SkyPANEL follows a modern **3-tier web application architecture** with clear separation of concerns between presentation, business logic, and data layers. The system is built with **microservice-oriented patterns** that enable independent scaling and maintainability.

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │   React     │ │ TailwindCSS │ │  Shadcn/UI  │ │    Vite     ││
│  │   App       │ │   Styling   │ │ Components  │ │   Bundler   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ HTTPS/WSS
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │  Express    │ │ Passport.js │ │   Route     │ │ Middleware  ││
│  │   Server    │ │    Auth     │ │  Handlers   │ │   Layer     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ SQL/Pool
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ PostgreSQL  │ │ Drizzle ORM │ │   Session   │ │  Migration  ││
│  │  Database   │ │   Schema    │ │   Store     │ │   Scripts   ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ APIs/Webhooks
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐│
│  │ VirtFusion  │ │ Google AI   │ │   Discord   │ │   PayPal    ││
│  │     API     │ │   Gemini    │ │     Bot     │ │     SDK     ││
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

### Core Architectural Principles

1. **Separation of Concerns**: Clear boundaries between UI, business logic, and data access
2. **API-First Design**: All functionality exposed through well-defined RESTful APIs
3. **Stateless Backend**: Server maintains minimal state with sessions stored in database
4. **Type Safety**: End-to-end TypeScript for compile-time error detection
5. **Security by Design**: Security considerations built into all layers
6. **Scalable Architecture**: Designed for horizontal and vertical scaling

---

## System Components

### Frontend Layer (Client)

The client layer is a modern React application built with TypeScript, providing a responsive and interactive user interface.

#### Core Technologies
- **React 18**: Component-based UI with hooks, concurrent features, and Suspense
- **TypeScript**: Type-safe JavaScript for robust frontend development
- **Vite**: Next-generation build tool with Hot Module Replacement (HMR)
- **TailwindCSS**: Utility-first CSS framework with custom theming
- **Shadcn/UI**: High-quality components built on Radix UI primitives

#### State Management
- **TanStack Query (React Query)**: Server state management and caching
- **React Context**: Application state and user authentication
- **React Hook Form**: Form state management with validation
- **Zod**: Client-side schema validation and type inference

#### Routing & Navigation
- **Wouter**: Lightweight client-side routing with pattern matching
- **Protected Routes**: Authentication-based route protection
- **Admin Routes**: Role-based access control for administrative features

#### Key Components
```
client/src/
├── components/
│   ├── ui/                 # Reusable UI components (Shadcn/UI)
│   ├── auth/               # Authentication components
│   ├── admin/              # Administrative interface components
│   ├── user/               # User dashboard components
│   └── forms/              # Form components with validation
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions and configurations
├── pages/                  # Page components organized by feature
└── styles/                 # Global styles and Tailwind configuration
```

### Backend Layer (Server)

The server layer is built with Node.js and Express, providing RESTful APIs and business logic processing.

#### Core Technologies
- **Node.js**: JavaScript runtime with ES modules support
- **Express.js**: Fast, minimal web framework with middleware support
- **TypeScript**: Type-safe server-side development
- **Passport.js**: Authentication middleware with local and OAuth strategies
- **Express Session**: Session management with PostgreSQL store

#### Service Architecture
```
server/
├── routes/                 # API route definitions organized by domain
├── middleware/             # Express middleware for auth, validation, etc.
├── services/               # Business logic services
├── discord/                # Discord bot and integration services
├── auth.ts                 # Authentication setup and strategies
├── storage.ts              # Database abstraction layer
└── index.ts                # Application entry point
```

#### Key Services
- **Authentication Service**: User login, registration, password management
- **VirtFusion Service**: VPS server management and API integration
- **Discord Bot Service**: Two-way ticket synchronization and AI chat
- **Email Service**: SMTP integration for notifications and verification
- **Billing Service**: Payment processing and transaction management
- **AI Service**: Google Gemini integration for intelligent support

### Database Layer

PostgreSQL database with Drizzle ORM provides reliable, type-safe data persistence.

#### Database Technologies
- **PostgreSQL 13+**: Advanced relational database with JSON support
- **Drizzle ORM**: Type-safe SQL ORM with excellent TypeScript integration
- **Connection Pooling**: Efficient database connection management
- **Migration System**: Version-controlled schema changes

#### Schema Organization
```
shared/schemas/
├── user-schema.ts          # User accounts and authentication
├── server-schema.ts        # VirtFusion server data
├── ticket-schema.ts        # Support ticket system
├── billing-schema.ts       # Transactions and credits
├── settings-schema.ts      # System configuration
└── index.ts                # Schema exports and relationships
```

---

## Data Flow Diagrams

### User Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant VirtFusion

    User->>Frontend: Submit login credentials
    Frontend->>Backend: POST /api/auth/login
    Backend->>Database: Validate credentials
    Database-->>Backend: User data
    Backend->>VirtFusion: Sync user if needed
    VirtFusion-->>Backend: User sync confirmation
    Backend-->>Frontend: Authentication token
    Frontend-->>User: Redirect to dashboard
```

### Server Management Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant VirtFusion

    User->>Frontend: Request server action (power on/off)
    Frontend->>Backend: POST /api/user/servers/:id/power/:action
    Backend->>Database: Verify user owns server
    Database-->>Backend: Ownership confirmed
    Backend->>VirtFusion: Execute power action
    VirtFusion-->>Backend: Action result
    Backend->>Database: Log action
    Backend-->>Frontend: Success response
    Frontend-->>User: Update UI with new status
```

### AI Support Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant Gemini
    participant Discord

    User->>Frontend: Ask support question
    Frontend->>Backend: POST /api/chat/message
    Backend->>Database: Store user message
    Backend->>Gemini: Generate AI response
    Gemini-->>Backend: AI response
    Backend->>Database: Store AI response
    Backend-->>Frontend: Formatted response
    Frontend-->>User: Display AI answer
    
    opt Discord Integration
        Backend->>Discord: Send message to thread
    end
```

### Payment Processing Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Database
    participant PayPal
    participant VirtFusion

    User->>Frontend: Request credit purchase
    Frontend->>PayPal: Initiate payment
    PayPal-->>User: Complete payment
    PayPal->>Backend: Payment webhook
    Backend->>Database: Record transaction
    Backend->>VirtFusion: Add credits to user
    VirtFusion-->>Backend: Credit confirmation
    Backend-->>Frontend: Update balance
    Frontend-->>User: Show new balance
```

---

## Integration Architecture

### VirtFusion Integration

SkyPANEL provides complete integration with VirtFusion for VPS management.

#### Integration Points
- **User Synchronization**: Automatic user account sync between systems
- **Server Management**: Full server lifecycle (create, modify, delete)
- **Resource Monitoring**: Real-time server statistics and performance
- **Billing Integration**: Credit-based billing with usage tracking
- **Console Access**: VNC console through VirtFusion API

#### API Implementation
```typescript
// VirtFusion API wrapper with error handling and retry logic
class VirtFusionAPI {
  async getUserServers(userId: number): Promise<Server[]> {
    const response = await this.apiCall(`/selfService/servers/byUserExtRelationId/${userId}`);
    return response.data.filter(server => server.ownerId === userId);
  }

  async powerControl(serverId: number, action: PowerAction): Promise<void> {
    await this.apiCall(`/servers/${serverId}/power`, {
      method: 'POST',
      data: { action }
    });
  }
}
```

#### Security Considerations
- **External Relation ID Mapping**: Local user IDs used as VirtFusion extRelationId
- **Server Filtering**: All API responses filtered by user ownership
- **Rate Limiting**: Built-in rate limiting to prevent API abuse
- **Error Handling**: Comprehensive error handling with fallback mechanisms

### Google Gemini AI Integration

Advanced AI support powered by Google's Gemini 2.5 Flash model.

#### Features
- **Context-Aware Responses**: AI understands hosting domain and company context
- **Brand Identity**: Responses branded as "SkyAI" for consistent user experience
- **Rate Limiting**: Built-in limits (15 RPM, 1,500 RPD) for cost control
- **Conversation Memory**: Context preservation across chat sessions

#### Implementation
```typescript
// AI service with rate limiting and brand customization
class GeminiService {
  async generateResponse(query: string, context: ChatContext): Promise<string> {
    const prompt = this.buildPrompt(query, context);
    const response = await this.geminiClient.generateContent(prompt);
    return this.formatResponse(response.text());
  }

  private buildPrompt(query: string, context: ChatContext): string {
    return `
      You are SkyAI, an intelligent assistant for SkyPANEL hosting platform.
      Context: ${context.companyName}, hosting provider
      Knowledge: VPS management, billing, technical support
      Question: ${query}
      
      Provide helpful, accurate response as SkyAI.
    `;
  }
}
```

### Discord Integration

Comprehensive Discord integration for notifications and support management.

#### Features
- **Two-Way Ticket Sync**: Discord threads synchronized with support tickets
- **Bot Commands**: Slash commands for status, tickets, and AI chat
- **Webhook Notifications**: Real-time system notifications
- **Permission Management**: Role-based access control

#### Architecture
```typescript
// Discord bot service with command handling
class DiscordBotService {
  private commands = [
    new StatusCommand(),
    new TicketCommand(),
    new AskCommand() // AI-powered responses
  ];

  async handleInteraction(interaction: ChatInputCommandInteraction) {
    const command = this.commands.find(cmd => cmd.name === interaction.commandName);
    if (command) {
      await command.execute(interaction);
    }
  }
}
```

### PayPal Integration

Secure payment processing with comprehensive webhook handling.

#### Features
- **Payment Processing**: Credit purchases through PayPal SDK
- **Webhook Validation**: Secure payment verification
- **Sandbox Support**: Development and testing environment
- **Transaction Tracking**: Complete transaction history and receipts

#### Implementation
```typescript
// PayPal service with webhook validation
class PayPalService {
  async verifyWebhook(headers: any, body: any): Promise<boolean> {
    return await this.paypalClient.webhook.verify(headers, body);
  }

  async processPayment(paymentData: PaymentData): Promise<Transaction> {
    // Validate payment and add credits to user account
    const transaction = await this.createTransaction(paymentData);
    await this.addCreditsToUser(paymentData.userId, paymentData.amount);
    return transaction;
  }
}
```

---

## Authentication & Security

### Authentication System

SkyPANEL implements multiple authentication methods for flexibility and security.

#### Authentication Methods
1. **Local Authentication**: Email/password with bcrypt hashing
2. **OAuth SSO**: Social login (Discord, GitHub, Google, LinkedIn)
3. **API Key Authentication**: Programmatic access with scoped permissions
4. **Session Management**: Secure sessions with automatic timeout

#### Session Management
```typescript
// Session configuration with PostgreSQL store
app.use(session({
  store: new (connectPgSimple(session))({
    pool: db.pool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 60 * 60 * 1000 // 1 hour
  }
}));
```

#### Password Security
- **Bcrypt Hashing**: Industry-standard password hashing with salt
- **VirtFusion Sync**: Secure password synchronization with VirtFusion
- **Strength Requirements**: Configurable password policies
- **Reset Flow**: Secure password reset with time-limited tokens

### API Security

Comprehensive security measures for API protection.

#### Security Features
- **Rate Limiting**: 100 requests per minute per API key
- **Input Validation**: Zod schema validation for all inputs
- **CORS Configuration**: Proper cross-origin resource sharing setup
- **Error Handling**: Secure error responses without information leakage

#### API Key Management
```typescript
// Scoped API keys with granular permissions
interface ApiKey {
  id: string;
  userId: number;
  name: string;
  scopes: ApiKeyScope[];
  createdAt: Date;
  lastUsed?: Date;
}

enum ApiKeyScope {
  READ_USER = 'read:user',
  READ_SERVERS = 'read:servers',
  WRITE_SERVERS = 'write:servers',
  READ_BILLING = 'read:billing',
  ADMIN_USERS = 'admin:users'
}
```

---

## Database Design

### Schema Architecture

The database is organized into domain-specific schemas with clear relationships and constraints.

#### Core Tables

**Users Table**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  virtfusion_id INTEGER,
  is_verified BOOLEAN DEFAULT FALSE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Servers Table**
```sql
CREATE TABLE servers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  virtfusion_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Transactions Table**
```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) DEFAULT 'pending',
  paypal_transaction_id VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Support Tickets Table**
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium',
  department_id INTEGER,
  discord_thread_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Relationships and Constraints

- **Foreign Key Constraints**: Maintain referential integrity
- **Cascade Deletes**: Proper cleanup when parent records are deleted
- **Indexes**: Performance optimization for frequent queries
- **Check Constraints**: Data validation at database level

### Migration System

Database schema changes are managed through version-controlled migrations.

```typescript
// Example migration script
export async function up(db: Database) {
  await db.execute(sql`
    ALTER TABLE users 
    ADD COLUMN oauth_provider VARCHAR(50),
    ADD COLUMN oauth_id VARCHAR(255);
  `);
}

export async function down(db: Database) {
  await db.execute(sql`
    ALTER TABLE users 
    DROP COLUMN oauth_provider,
    DROP COLUMN oauth_id;
  `);
}
```

---

## API Architecture

### RESTful API Design

SkyPANEL follows RESTful principles for consistent and intuitive API design.

#### URL Structure
```
/api/v1/{resource}/{id?}/{action?}
```

#### HTTP Methods
- **GET**: Retrieve resources (idempotent)
- **POST**: Create new resources or trigger actions
- **PATCH**: Partial updates to existing resources
- **DELETE**: Remove resources

#### Response Format
```typescript
// Success Response
{
  data: T,
  message?: string,
  pagination?: {
    currentPage: number,
    totalPages: number,
    totalItems: number,
    itemsPerPage: number
  }
}

// Error Response
{
  error: {
    code: string,
    message: string,
    details?: any
  }
}
```

### Middleware Architecture

Express middleware provides cross-cutting concerns.

#### Middleware Stack
1. **CORS Middleware**: Cross-origin request handling
2. **Body Parser**: JSON and URL-encoded request parsing
3. **Session Middleware**: Session management and authentication
4. **Rate Limiting**: API abuse prevention
5. **Validation Middleware**: Input validation with Zod schemas
6. **Auth Middleware**: Authentication and authorization
7. **Error Handler**: Centralized error handling and logging

```typescript
// Authentication middleware with role checking
export const requireAuth = (allowedRoles?: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (allowedRoles && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### Input Validation

Comprehensive input validation using Zod schemas.

```typescript
// Validation schema example
const createServerSchema = z.object({
  name: z.string().min(3).max(50),
  packageId: z.number().positive(),
  osTemplate: z.string().min(1),
  sshKeys: z.array(z.string()).optional()
});

// Route with validation
router.post('/servers', 
  requireAuth(),
  validateInput(createServerSchema),
  async (req: Request, res: Response) => {
    const serverData = req.body;
    // Server creation logic
  }
);
```

---

## Deployment Architecture

### Deployment Options

SkyPANEL supports multiple deployment strategies for different environments and requirements.

#### 1. Docker Deployment (Recommended)

```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3333
CMD ["npm", "start"]
```

**Docker Compose Configuration**
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3333:3333"
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    depends_on:
      - db
      
  db:
    image: postgres:13
    environment:
      POSTGRES_DB: skypanel
      POSTGRES_USER: skypanel
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

#### 2. PM2 Deployment

Process management for production Node.js applications.

```javascript
// pm2.config.cjs
module.exports = {
  apps: [{
    name: 'skypanel',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '2G',
    env: {
      NODE_ENV: 'production',
      PORT: 3333
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
};
```

#### 3. Cloudflare Workers (Edge Deployment)

Global edge deployment for low-latency access.

```typescript
// wrangler.toml
name = "skypanel"
main = "dist/worker.js"
compatibility_date = "2023-05-18"

[vars]
NODE_ENV = "production"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

### Infrastructure Requirements

#### Minimum Requirements
- **CPU**: 2 vCPU cores
- **RAM**: 4GB memory
- **Storage**: 20GB SSD
- **Network**: 100Mbps bandwidth

#### Recommended Production
- **CPU**: 4+ vCPU cores
- **RAM**: 8GB+ memory
- **Storage**: 50GB+ SSD with backups
- **Network**: 1Gbps bandwidth
- **Load Balancer**: For high availability

#### Database Requirements
- **PostgreSQL 13+**
- **Connection Limit**: 100+ concurrent connections
- **Memory**: 2GB+ dedicated RAM
- **Backup**: Automated daily backups

### High Availability Setup

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   (Nginx/HAP)   │
                    └─────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ SkyPANEL    │ │ SkyPANEL    │ │ SkyPANEL    │
    │ Instance 1  │ │ Instance 2  │ │ Instance 3  │
    └─────────────┘ └─────────────┘ └─────────────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                  ┌─────────────────┐
                  │  PostgreSQL     │
                  │  Primary/Replica│
                  └─────────────────┘
```

### Environment Configuration

**Production Environment Variables**
```bash
# Application
NODE_ENV=production
PORT=3333
SESSION_SECRET=your_production_session_secret

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/skypanel

# VirtFusion
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_production_api_key

# AI Services
GOOGLE_AI_API_KEY=your_production_gemini_key

# Payment Processing
VITE_PAYPAL_CLIENT_ID=your_production_paypal_client
VITE_PAYPAL_SECRET=your_production_paypal_secret
VITE_PAYPAL_SANDBOX=false

# Email Services
SMTP2GO_API_KEY=your_production_smtp_key
SMTP_FROM=noreply@your-domain.com

# Discord Integration
DISCORD_BOT_TOKEN=your_production_bot_token
DISCORD_GUILD_ID=your_discord_server_id

# Monitoring
BETTERSTACK_API_KEY=your_betterstack_key
```

---

## Scalability & Performance

### Horizontal Scaling

SkyPANEL is designed for horizontal scaling across multiple instances.

#### Stateless Design
- **Session Storage**: Sessions stored in PostgreSQL, not memory
- **File Storage**: Static assets served via CDN or shared storage
- **Cache Strategy**: Distributed caching with Redis (optional)

#### Load Balancing
```nginx
upstream skypanel_backend {
    least_conn;
    server app1:3333;
    server app2:3333;
    server app3:3333;
}

server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://skypanel_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Performance Optimization

#### Database Optimization
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: Indexed queries and prepared statements
- **Read Replicas**: Separate read and write operations

#### Caching Strategy
```typescript
// Response caching for frequently accessed data
const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes

export const cacheMiddleware = (duration: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached) {
      return res.json(cached);
    }
    
    res.sendResponse = res.json;
    res.json = (data) => {
      cache.set(key, data, duration);
      res.sendResponse(data);
    };
    
    next();
  };
};
```

#### Frontend Optimization
- **Code Splitting**: Dynamic imports for route-based splitting
- **Lazy Loading**: Component lazy loading with Suspense
- **Asset Optimization**: Image optimization and compression
- **CDN Integration**: Static asset delivery via CDN

### Monitoring and Metrics

#### Application Metrics
- **Response Time**: API endpoint performance tracking
- **Error Rate**: Application error monitoring and alerting
- **Throughput**: Request volume and capacity planning
- **Resource Usage**: CPU, memory, and disk utilization

#### Business Metrics
- **User Activity**: Registration, login, and engagement metrics
- **Revenue Tracking**: Transaction volume and billing analytics
- **Support Metrics**: Ticket volume and resolution time
- **System Health**: Uptime, availability, and performance SLAs

---

## Security Architecture

### Security Layers

SkyPANEL implements defense-in-depth security across all layers.

#### Network Security
- **HTTPS Encryption**: TLS 1.3 for all client communications
- **Firewall Rules**: Restrictive firewall configuration
- **DDoS Protection**: Rate limiting and traffic filtering
- **VPN Access**: Administrative access through VPN

#### Application Security
- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control (RBAC)
- **Input Validation**: Comprehensive input sanitization
- **Output Encoding**: XSS prevention through output encoding

#### Data Security
- **Encryption at Rest**: Database encryption for sensitive data
- **Encryption in Transit**: TLS for all API communications
- **Key Management**: Secure storage of API keys and secrets
- **Data Backup**: Encrypted backup storage and retention

### Security Compliance

#### GDPR Compliance
- **Data Minimization**: Collect only necessary user data
- **Right to Deletion**: User data deletion workflows
- **Data Portability**: User data export functionality
- **Consent Management**: Clear privacy policy and consent flows

#### SOC 2 Preparation
- **Access Controls**: Comprehensive user access management
- **Audit Logging**: Complete audit trail for all actions
- **Change Management**: Version-controlled deployments
- **Incident Response**: Security incident response procedures

---

## Monitoring & Observability

### Monitoring Stack

Comprehensive monitoring and observability for production systems.

#### Application Monitoring
- **BetterStack Integration**: Uptime monitoring and alerting
- **Custom Metrics**: Business and technical metric collection
- **Log Aggregation**: Centralized logging with structured logs
- **Performance Monitoring**: Response time and throughput tracking

#### Error Tracking
```typescript
// Error handling and reporting
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Application error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id
  });

  if (process.env.NODE_ENV === 'production') {
    res.status(500).json({ error: 'Internal server error' });
  } else {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};
```

#### Health Checks
```typescript
// Health check endpoint for monitoring
app.get('/health', (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    database: 'connected', // Database connectivity check
    virtfusion: 'connected', // VirtFusion API check
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };
  
  res.status(200).json(healthCheck);
});
```

### Alerting and Notifications

#### Alert Configuration
- **Uptime Alerts**: Service availability monitoring
- **Performance Alerts**: Response time degradation
- **Error Rate Alerts**: Application error rate thresholds
- **Resource Alerts**: CPU, memory, and disk space warnings

#### Notification Channels
- **Email Alerts**: Critical issue notifications to administrators
- **Discord Webhooks**: Real-time alerts to operations channel
- **SMS Alerts**: High-priority incident notifications
- **PagerDuty Integration**: On-call escalation for critical issues

---

## Known Limitations

### Current System Limitations

#### InterServer DNS Integration (Disabled)
The InterServer DNS system is currently disabled due to API reliability issues on certain hosting providers. This affects:
- Domain management features
- DNS record management functionality
- Nameserver configuration options

**Status**: Disabled pending InterServer API improvements
**Workaround**: External DNS management required for domain services

#### VirtFusion API Rate Limits
VirtFusion API has inherent rate limits that may impact high-volume operations:
- **Request Limits**: API calls per minute restrictions
- **Bulk Operations**: Limited batch processing capabilities
- **Real-time Updates**: Polling limitations for live data

**Mitigation**: Implemented caching and request queuing

#### Google Gemini AI Quotas
AI features are subject to Google's usage quotas:
- **Rate Limits**: 15 requests per minute, 1,500 per day
- **Token Limits**: Maximum tokens per request
- **Cost Implications**: Usage-based pricing structure

**Mitigation**: Built-in rate limiting and fallback responses

### Architectural Limitations

#### Single Database Instance
Current architecture uses single PostgreSQL instance:
- **Single Point of Failure**: No automatic failover
- **Scaling Limitations**: Vertical scaling only
- **Backup Dependency**: Manual backup and recovery

**Future Enhancement**: Primary/replica configuration planned

#### Session Storage
Sessions stored in database may impact performance:
- **Database Load**: Additional queries for session management
- **Scaling Impact**: Session storage affects database performance
- **Memory Usage**: No in-memory session caching

**Future Enhancement**: Redis session store consideration

### Planned Improvements

#### Short-term (3-6 months)
- **Redis Integration**: Session and response caching
- **Database Replication**: Primary/replica setup for high availability
- **Enhanced Monitoring**: Additional metrics and alerting
- **API Versioning**: Formal API versioning implementation

#### Long-term (6-12 months)
- **Microservices**: Service decomposition for better scalability
- **Message Queue**: Asynchronous processing with Redis/RabbitMQ
- **CDN Integration**: Global content delivery network
- **Advanced Analytics**: Machine learning for usage patterns

---

## Conclusion

SkyPANEL's architecture is designed for modern hosting providers who need a reliable, scalable, and feature-rich client portal. The system's modular design, comprehensive security measures, and extensive integration capabilities make it suitable for both small hosting companies and large enterprise deployments.

The architecture supports multiple deployment options, from simple single-server setups to highly available multi-region deployments. With built-in monitoring, security controls, and performance optimization, SkyPANEL provides a solid foundation for VPS hosting management.

For specific implementation details, deployment procedures, or troubleshooting information, refer to the relevant documentation sections or contact the development team.

---

*This architecture document is maintained alongside the SkyPANEL codebase and is updated with each major release. For the most current information, please refer to the repository documentation.*