# 🚀 SkyPANEL - Enterprise VirtFusion Management Platform

<div align="center">
  <h3>🌟 Next-Generation VPS Hosting Control Panel 🌟</h3>
  <p><strong>Complete VirtFusion integration with AI-powered support, real-time monitoring, and advanced automation</strong></p>

  [![Discord](https://img.shields.io/discord/1310474963865833483?style=social&logo=discord)](https://skyvps360.xyz/discord)
  [![Codacy Badge](https://app.codacy.com/project/badge/Grade/ea361b63c5ad4bf5b2e7d534c72ef799)](https://app.codacy.com/gh/skyvps360/SkyPANEL/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Configuration](#-environment-configuration)
- [API Documentation](#-api-documentation)
- [Database Schema](#-database-schema)
- [External Integrations](#-external-integrations)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

## 🔍 Overview

**SkyPANEL** is a cutting-edge, enterprise-grade VirtFusion client portal that revolutionizes VPS hosting management. Built with modern technologies and designed for scalability, it provides a comprehensive solution for hosting providers and their customers.

### 🎯 What Makes SkyPANEL Special

- **🤖 AI-Powered Support**: Integrated Google Gemini 2.5 Flash for intelligent customer support
- **🔄 Real-Time Monitoring**: BetterStack integration for live infrastructure monitoring
- **💬 Discord Integration**: Full two-way communication with Discord bot for ticket management
- **🎨 Dynamic Theming**: Advanced brand customization with multi-color theming system
- **🔐 Enterprise Security**: API key management, role-based access control, and secure authentication
- **📊 Advanced Analytics**: Comprehensive reporting, transaction tracking, and usage monitoring
- **🌐 VNC Console**: Built-in VNC client for direct server access and management
- **⚡ Modern Architecture**: React/TypeScript frontend with Node.js/Express backend
- **🔌 Complete VirtFusion Integration**: Direct API integration for seamless VPS management
- **🌐 DNS Management**: InterServer API integration for white-labeled DNS services

## ✨ Key Features

### 👥 User Management
- **Secure Authentication**: Email verification, password reset, and account recovery
- **VirtFusion Sync**: Automatic synchronization with VirtFusion user accounts
- **Profile Management**: Real-time updates synced across platforms
- **Role-Based Access**: Admin and user roles with granular permissions
- **API Key Management**: Personal API keys with scoped permissions

### 💳 Billing System
- **Credit-Based Billing**: Flexible credit system with real-time balance tracking
- **Transaction Management**: Detailed transaction history with PDF exports
- **PayPal Integration**: Secure payment processing with webhook validation
- **Usage Monitoring**: Real-time VirtFusion resource usage tracking
- **Admin Controls**: Manual credit adjustments and transaction management

### 🤝 VirtFusion Integration
- **Direct API Integration**: Complete VirtFusion API integration for all operations
- **Real-Time Sync**: Live server status, resource usage, and billing data
- **User Management**: Automatic user creation and synchronization
- **Server Control**: Power management, password resets, and console access
- **Resource Monitoring**: Live CPU, memory, disk, and network statistics

### 🎫 Support System
- **Ticket Management**: Full-featured support ticket system with departments
- **Threaded Conversations**: Message threading with file attachments
- **Status Tracking**: Open, closed, and priority level management
- **Discord Integration**: Two-way sync with Discord threads
- **AI Assistance**: Google Gemini AI for intelligent response suggestions
- **Live Chat**: Real-time chat system with admin support

### 🌐 DNS Management
- **InterServer Integration**: White-labeled DNS services via InterServer API
- **Complete Record Management**: Support for all DNS record types (A, AAAA, CNAME, MX, TXT, etc.)
- **Domain Management**: Add, edit, and delete DNS domains
- **White-labeled Nameservers**: Custom SkyPANEL branded nameservers
- **User-Friendly Interface**: @ symbol notation support for easy record management

### 📊 Admin Dashboard
- **User Management**: Comprehensive user administration with VirtFusion sync
- **Server Management**: Direct VirtFusion server control and monitoring
- **Financial Reporting**: Transaction tracking and revenue analytics
- **System Configuration**: Dynamic settings and branding management
- **Content Management**: Blog, documentation, and FAQ administration
- **Monitoring Tools**: Real-time system health and performance metrics

## 🛠️ Tech Stack

### Frontend
- **React 18**: Modern UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript for robust development
- **Vite**: Next-generation frontend build tool with HMR
- **TailwindCSS**: Utility-first CSS framework for rapid styling
- **Shadcn/UI**: High-quality UI components built on Radix UI
- **React Query (TanStack Query)**: Powerful data fetching and state management
- **React Hook Form**: Performant forms with easy validation
- **Wouter**: Lightweight routing solution for SPAs
- **Framer Motion**: Production-ready motion library for React
- **Recharts**: Composable charting library built on D3
- **React Markdown**: Markdown rendering with syntax highlighting
- **React Leaflet**: Interactive maps for datacenter visualization
- **NoVNC**: Web-based VNC client for server console access

### Backend
- **Node.js**: JavaScript runtime for server-side development
- **Express**: Fast, unopinionated web framework
- **TypeScript**: Type-safe server-side development
- **PostgreSQL**: Advanced relational database with JSON support
- **Drizzle ORM**: Type-safe SQL ORM with excellent TypeScript integration
- **Zod**: TypeScript-first schema validation
- **Passport.js**: Authentication middleware with local strategy
- **Express Session**: Session management with PostgreSQL store
- **Bcrypt**: Password hashing and security
- **SMTP2GO**: Reliable email delivery service
- **Discord.js**: Discord bot integration and webhook support
- **PDFKit**: PDF generation for transaction exports and reports

### AI & Integrations
- **Google Gemini 2.5 Flash**: Advanced AI for customer support
- **VirtFusion API**: Complete VPS management integration
- **InterServer API**: DNS management and white-labeled nameservers
- **BetterStack**: Infrastructure monitoring and alerting
- **PayPal SDK**: Payment processing and billing
- **SendGrid**: Email delivery and templates

### DevOps & Tooling
- **ESBuild**: Fast JavaScript bundler for production
- **Drizzle Kit**: Database schema migration and management
- **Cross-env**: Cross-platform environment variables
- **TSX**: TypeScript execution for development
- **Husky**: Git hooks for code quality

## 📁 Project Structure

```
SkyPANEL/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/             # Application pages and routes
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # Utility functions and configurations
│   │   └── App.tsx            # Main application component
│   ├── public/                # Static assets
│   └── index.html             # HTML entry point
├── server/                     # Node.js backend application
│   ├── routes/                # API route handlers
│   ├── middleware/            # Express middleware
│   ├── services/              # Business logic services
│   ├── auth.ts                # Authentication configuration
│   ├── db.ts                  # Database connection and configuration
│   └── index.ts               # Server entry point
├── shared/                     # Shared code between client and server
│   ├── schema.ts              # Database schema definitions
│   └── dns-record-types.ts    # DNS record type definitions
├── migrations/                 # Database migration files
├── scripts/                   # Utility scripts for development and deployment
├── md-docs/                   # Documentation files
│   ├── brand-theme.md         # Brand theming documentation
│   └── interserver.yaml       # InterServer API documentation
├── package.json               # Project dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── vite.config.ts             # Vite build configuration
└── drizzle.config.ts          # Drizzle ORM configuration
```

## 💻 Installation & Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- npm or yarn package manager

### Quick Start

```bash
# Clone the repository
git clone https://github.com/skyvps360/SkyPANEL.git
cd SkyPANEL

# Install dependencies
npm install

# Set up environment variables (see Environment Configuration section)
cp .env.example .env
# Edit .env with your configuration

# Initialize the database
npm run db:push

# Create an admin user (interactive prompt)
npx tsx scripts/create-admin-user.ts

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development Commands

```bash
# Development
npm run dev              # Start development server with hot reload
npm run check            # Type check TypeScript files

# Database
npm run db:push          # Push schema changes to database
npm run db:add-todos     # Add todos table (example migration)

# Production
npm run build            # Build for production
npm start                # Start production server

# Utilities
npm run update-packages  # Check for package updates
npm run verify-env       # Verify environment configuration
```

## 🔧 Environment Configuration

Create a `.env` file in the root directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgres://username:password@hostname:port/database

# Session Management
SESSION_SECRET=your_secure_random_string_here

# VirtFusion API Integration
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_virtfusion_api_key

# InterServer DNS API Integration
INTERSERVER_API_KEY=your_interserver_api_key

# Email Configuration (SMTP2GO)
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP_FROM=noreply@your-domain.com
SMTP_FROM_NAME=Your Company Support

# Discord Integration (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
DISCORD_ROLE_ID=your_discord_role_id
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_CHANNEL_ID=your_discord_channel_id
DISCORD_ALLOWED_ROLE_IDS=role_id_1,role_id_2
DISCORD_ALLOWED_USER_IDS=user_id_1,user_id_2

# Google AI Integration
GOOGLE_AI_API_KEY=your_google_gemini_api_key

# BetterStack Monitoring (Optional)
BETTERSTACK_API_KEY=your_betterstack_api_key

# PayPal Configuration
VITE_PAYPAL_SANDBOX=true_or_false
VITE_PAYPAL_SANDBOX_CLIENT_ID=your_paypal_sandbox_client_id
VITE_PAYPAL_SANDBOX_SECRET=your_paypal_sandbox_secret
VITE_PAYPAL_CLIENT_ID=your_paypal_live_client_id
VITE_PAYPAL_SECRET=your_paypal_live_secret
VITE_PAYPAL_CURRENCY=USD

# Application Settings
PORT=3000
NODE_ENV=development
```

## 📚 API Documentation

SkyPANEL provides a comprehensive REST API with over 100 endpoints for complete platform integration. All endpoints support JSON request/response format with proper error handling and validation.

### 🔐 Authentication

#### Session-Based Authentication
Most web endpoints use session-based authentication with cookies.

#### API Key Authentication
API endpoints support Bearer token authentication:
```bash
Authorization: Bearer your_api_key_here
```

#### Available Scopes
- `read:user` - Read user profile information
- `read:servers` - Read server information and status
- `write:servers` - Create, update, or delete servers
- `read:billing` - View billing information and transactions
- `read:tickets` - View support tickets
- `write:tickets` - Create and update support tickets
- `admin:users` - Administrative access to user accounts
- `admin:billing` - Administrative access to billing functions
- `admin:system` - Administrative access to system settings

### 📊 Rate Limiting
- **100 requests per minute** per API key
- **429 Too Many Requests** response when exceeded
- Rate limit headers included in all responses

### 👤 Authentication & User Endpoints

#### Authentication
```bash
POST   /api/auth/login                     # Authenticate user
POST   /api/auth/register                  # Create new account
POST   /api/auth/logout                    # End session
POST   /api/auth/request-password-reset    # Request password reset
POST   /api/auth/verify-reset-code         # Verify password reset code
POST   /api/auth/reset-password            # Reset password with token
POST   /api/auth/change-password           # Change password (authenticated)
POST   /api/auth/request-username          # Request username reminder
POST   /api/auth/request-username-reminder # Request username reminder (alt)
GET    /api/verification-status            # Check email verification
POST   /api/verification/verify-email      # Verify email with code
POST   /api/verification/resend            # Resend verification email
```

#### User Management
```bash
GET    /api/user                           # Get current user profile
GET    /api/user/me                        # Get current user info (API key only)
PATCH  /api/user/profile                   # Update user profile
```

#### Notification Management
```bash
GET    /api/notifications                  # Get user notifications
GET    /api/notifications/unread/count     # Get unread notification count
POST   /api/notifications/mark-read/:id    # Mark notification as read
POST   /api/notifications/mark-all-read    # Mark all notifications as read
DELETE /api/notifications/:id              # Delete notification
```

### 🖥️ Server Management Endpoints

#### User Server Operations
```bash
GET    /api/user/servers                   # List user's servers (paginated)
GET    /api/user/servers/:id               # Get server details
POST   /api/user/servers/:id/reset-password # Reset server password
POST   /api/user/servers/:id/power/:action # Power control (boot/shutdown/restart/poweroff)
GET    /api/user/servers/:id/vnc           # Get VNC status (toggles state)
GET    /api/user/servers/:id/traffic       # Get traffic statistics
GET    /api/user/servers/:id/logs          # Get server action logs
```

#### Server Packages & Plans
```bash
GET    /api/server-packages                # Get available server packages
GET    /api/plan-features                  # Get plan features for public display
GET    /api/datacenter-locations           # Get datacenter locations
```

### 💰 Billing & Transaction Endpoints

#### User Billing
```bash
GET    /api/billing/balance                # Get account balance
GET    /api/billing/usage/last30days       # Get 30-day usage statistics
POST   /api/billing/add-credits            # Add credits to account
GET    /api/transactions                   # List user transactions
GET    /api/transactions/:id               # Get transaction details
GET    /api/transactions/export            # Export transactions as PDF
```

#### PayPal Integration
```bash
POST   /api/billing/capture-paypal-payment # Process PayPal payment
```

### 🎫 Support System Endpoints

#### Ticket Management
```bash
GET    /api/tickets                        # List tickets (paginated)
POST   /api/tickets                        # Create new ticket
GET    /api/tickets/:id                    # Get ticket details
POST   /api/tickets/:id/messages           # Add message to ticket
POST   /api/tickets/:id/close              # Close ticket
POST   /api/tickets/:id/reopen             # Reopen ticket
GET    /api/tickets/:id/download           # Download ticket as PDF
GET    /api/ticket-departments             # Get available departments
```

### 💬 Live Chat Endpoints

#### Chat Management
```bash
POST   /api/chat/session                   # Start new chat session
GET    /api/chat/session                   # Get current active session
POST   /api/chat/messages                  # Send chat message
GET    /api/chat/messages                  # Get messages for current session
GET    /api/chat/history                   # Get chat session history
GET    /api/chat/history/:sessionId        # Get specific session with messages
POST   /api/chat/end                       # End current chat session
```

### 🌐 DNS Management Endpoints

#### Domain Management
```bash
GET    /api/dns/domains                    # List user's DNS domains
POST   /api/dns/domains                    # Add new DNS domain
DELETE /api/dns/domains/:id                # Delete DNS domain
```

#### DNS Records Management
```bash
GET    /api/dns/domains/:id/records        # List DNS records for domain
POST   /api/dns/domains/:id/records        # Add new DNS record
PUT    /api/dns/domains/:domainId/records/:recordId # Update DNS record
DELETE /api/dns/domains/:domainId/records/:recordId # Delete DNS record
```

### 🔧 Server Package & Resource Management

#### Server Packages
```bash
GET    /api/packages                       # Get available server packages (authenticated)
GET    /api/packages/:id                   # Get specific package details
GET    /api/public/packages                # Get packages for public display
GET    /api/public/package-pricing         # Get package pricing information
GET    /api/packages/:packageId/templates  # Get OS templates for package
```

#### Resource Management
```bash
GET    /api/resource-packs                 # Get available resource packs
GET    /api/resource-packs/:id             # Get specific resource pack
POST   /api/resource-packs                 # Create new resource pack (admin)
DELETE /api/resource-packs/:id             # Delete resource pack (admin)
POST   /api/resource-packs/:id/servers     # Add server to resource pack (admin)
GET    /api/ip-addresses                   # Get available IP addresses
GET    /api/storage-volumes                # Get storage volumes
```

#### Hypervisor Management
```bash
GET    /api/hypervisors                    # Get hypervisors for client server creation
GET    /api/admin/hypervisors              # Get all hypervisor groups (admin)
POST   /api/admin/hypervisors/sync         # Sync hypervisors from VirtFusion (admin)
```

#### OS Templates & Cloud Pricing
```bash
GET    /api/os-templates                   # Get OS templates
GET    /api/cloud-pricing                  # Get cloud pricing settings
GET    /api/admin/all-templates            # Get all OS templates from packages (admin)
GET    /api/admin/templates/:templateId    # Get specific OS template by ID
GET    /api/admin/packages/:packageId/templates # Get templates for package (admin)
```

### 🔑 API Key Management Endpoints

#### Personal API Keys
```bash
GET    /api/user/api-keys                  # List user's API keys
POST   /api/user/api-keys                  # Create new API key
DELETE /api/user/api-keys/:id              # Delete API key
```

### 🤖 AI & Assistant Endpoints

#### AI Status & Usage
```bash
GET    /api/ai/status                      # Check Gemini AI status
GET    /api/ai/usage                       # Get current AI usage limits
POST   /api/ai/docs-chat                   # AI documentation assistant (deprecated)
```

### 🖥️ VNC & Remote Access Endpoints

#### User VNC Access
```bash
POST   /api/servers/:serverId/vnc/enable   # Enable VNC for server
GET    /api/servers/:serverId/vnc          # Get VNC status for server
```

### 🔐 SSO & Authentication Tokens

#### VirtFusion SSO
```bash
POST   /api/sso/virtfusion/token           # Generate VirtFusion panel access token
POST   /api/sso/virtfusion/server/:serverId/token # Generate server-specific token
```

### 🛠️ Admin Endpoints (Admin Access Required)

#### User Administration
```bash
GET    /api/admin/users                    # List all users
GET    /api/admin/users/:id                # Get user details
PATCH  /api/admin/users/:id                # Update user
DELETE /api/admin/users/:id                # Delete user
POST   /api/admin/users/:id/reset-password # Reset user password
PATCH  /api/admin/users/:id/status         # Enable/disable account
```

#### Server Administration
```bash
GET    /api/admin/servers                  # List all servers (paginated)
GET    /api/admin/servers/:id              # Get server details
POST   /api/admin/servers                  # Create server
DELETE /api/admin/servers/:id              # Delete server
POST   /api/admin/servers/:id/build        # Build server (install OS)
GET    /api/admin/servers/:id/traffic      # Get server traffic statistics
POST   /api/admin/servers/:id/boot         # Boot server
POST   /api/admin/servers/:id/shutdown     # Shutdown server
POST   /api/admin/servers/:id/restart      # Restart server
POST   /api/admin/servers/:id/power-off    # Power off server
POST   /api/admin/servers/:id/suspend      # Suspend server
POST   /api/admin/servers/:id/unsuspend    # Unsuspend server
POST   /api/admin/servers/:id/reset-password # Reset server password
POST   /api/admin/servers/:id/throttle-cpu # Throttle CPU for server
```

#### VNC Management (Admin)
```bash
GET    /api/admin/servers/:id/vnc          # Get VNC status for server
GET    /api/admin/servers/:id/vnc/test     # Test VNC connectivity
POST   /api/admin/servers/:id/vnc/enable   # Enable VNC for server
POST   /api/admin/servers/:id/vnc/disable  # Disable VNC for server
```

#### Package Management (Admin)
```bash
GET    /api/admin/packages                 # Get all packages for admin pricing
POST   /api/admin/packages/:id/pricing     # Create/update package pricing
DELETE /api/admin/packages/:id/pricing     # Delete package pricing
```

#### Billing Administration
```bash
GET    /api/admin/transactions             # List all transactions
POST   /api/credits                        # Add credits to user
DELETE /api/credits/:id                    # Cancel credit transaction
```

#### Support Administration
```bash
GET    /api/admin/tickets                  # List all tickets (paginated)
DELETE /api/admin/tickets/:id              # Delete ticket
```

#### System Administration
```bash
GET    /api/admin/settings                 # Get system settings
POST   /api/admin/settings                 # Update system settings
GET    /api/admin/platform-stats           # Get platform statistics
GET    /api/admin/services/status          # Get service status
POST   /api/admin/maintenance/enable       # Enable maintenance mode
POST   /api/admin/maintenance/disable      # Disable maintenance mode
GET    /api/admin/maintenance/generate-token # Generate bypass token
```

#### Content Management
```bash
# Blog Management
GET    /api/admin/blog                     # List blog posts
GET    /api/admin/blog/:id                 # Get specific blog post
POST   /api/admin/blog                     # Create blog post
PATCH  /api/admin/blog/:id                 # Update blog post
DELETE /api/admin/blog/:id                 # Delete blog post

# Blog Categories
GET    /api/admin/blog-categories          # List blog categories
GET    /api/admin/blog-categories/:id      # Get specific blog category
POST   /api/admin/blog-categories          # Create blog category
PATCH  /api/admin/blog-categories/:id      # Update blog category
DELETE /api/admin/blog-categories/:id      # Delete blog category

# Documentation Management
GET    /api/admin/docs                     # List documentation
GET    /api/admin/docs/:id                 # Get specific documentation
POST   /api/admin/docs                     # Create documentation
PATCH  /api/admin/docs/:id                 # Update documentation
DELETE /api/admin/docs/:id                 # Delete documentation

# Documentation Categories
GET    /api/admin/doc-categories           # List doc categories
POST   /api/admin/doc-categories           # Create doc category
PATCH  /api/admin/doc-categories/:id       # Update doc category
DELETE /api/admin/doc-categories/:id       # Delete doc category

# FAQ Management
GET    /api/admin/faqs                     # List FAQs
POST   /api/admin/faqs                     # Create FAQ
PATCH  /api/admin/faqs/:id                 # Update FAQ
DELETE /api/admin/faqs/:id                 # Delete FAQ

# Plan Features Management
GET    /api/admin/plan-features            # List plan features
POST   /api/admin/plan-features            # Create plan feature
PUT    /api/admin/plan-features/:id        # Update plan feature
DELETE /api/admin/plan-features/:id        # Delete plan feature

# Legal Content Management
GET    /api/admin/legal                    # List legal content
POST   /api/admin/legal                    # Create legal content

# Team Management
GET    /api/admin/team                     # List team members
POST   /api/admin/team                     # Create team member
PUT    /api/admin/team/:id                 # Update team member
DELETE /api/admin/team/:id                 # Delete team member

# Package Categories
GET    /api/admin/package-categories       # List package categories
POST   /api/admin/package-categories       # Create package category
PUT    /api/admin/package-categories/:id   # Update package category
DELETE /api/admin/package-categories/:id   # Delete package category
```

#### Datacenter Management
```bash
GET    /api/admin/datacenter-locations     # List all datacenter locations
POST   /api/admin/datacenter-locations     # Create datacenter location
PUT    /api/admin/datacenter-locations/:id # Update datacenter location
DELETE /api/admin/datacenter-locations/:id # Delete datacenter location
```

#### Email & Communication Management
```bash
GET    /api/admin/email-logs               # List email logs
GET    /api/admin/email-logs/:id           # Get specific email log
GET    /api/admin/discord/users            # Search Discord users
GET    /api/admin/discord/users/:id        # Get specific Discord user
```

#### Department Management
```bash
# Legacy Ticket Departments
GET    /api/admin/ticket-departments       # List ticket departments
POST   /api/admin/ticket-departments       # Create ticket department
PATCH  /api/admin/ticket-departments/:id   # Update ticket department
PUT    /api/admin/ticket-departments/:id   # Update ticket department (alt)
DELETE /api/admin/ticket-departments/:id   # Delete ticket department

# Unified Department System
GET    /api/admin/unified-departments      # List unified departments
POST   /api/admin/unified-departments      # Create unified department
PUT    /api/admin/unified-departments/:id  # Update unified department
DELETE /api/admin/unified-departments/:id  # Delete unified department

# Department Migration
GET    /api/admin/department-migration/status # Check migration status
POST   /api/admin/department-migration/migrate # Perform migration
POST   /api/admin/department-migration/sync # Sync departments
POST   /api/admin/department-migration/finalize-columns # Finalize migration
GET    /api/admin/department-counts        # Debug department counts
```

#### AI & Testing Endpoints
```bash
POST   /api/admin/ai/ticket-response       # Generate AI ticket response
POST   /api/admin/virtfusion/test-connection # Test VirtFusion API connection
POST   /api/test-virtfusion-user           # Test VirtFusion user creation (admin)
POST   /api/test-virtfusion-credit         # Test VirtFusion credit addition (admin)
POST   /api/test-paypal-verification       # Test PayPal verification (admin)
```

### 🌐 Public Endpoints (No Authentication Required)

#### Public Information
```bash
GET    /api/public/service-status          # Get service status
GET    /api/public/service-incidents       # Get recent incidents
GET    /api/public/platform-stats          # Get platform statistics
GET    /api/public/packages                # Get available server packages
GET    /api/public/package-pricing         # Get package pricing
GET    /api/public/package-categories      # Get package categories
GET    /api/settings/public                # Get public settings
GET    /api/settings/branding              # Get branding information
```

#### Public Content
```bash
# Blog
GET    /api/public/blog                    # Get published blog posts
GET    /api/public/blog/:slug              # Get blog post by slug
GET    /api/public/blog/category/:categoryId # Get blog posts by category
GET    /api/public/blog-categories         # Get blog categories

# Documentation
GET    /api/public/docs                    # Get published documentation
GET    /api/public/docs/:slug              # Get documentation by slug
GET    /api/public/doc-categories          # Get documentation categories

# Other Public Data
GET    /api/datacenter-locations           # Get active datacenter locations
GET    /api/plan-features                  # Get plan features
GET    /api/faqs                           # Get active FAQs
GET    /api/team                           # Get active team members
GET    /api/legal/:type                    # Get legal content (terms, privacy, etc.)
```

### 🔧 Settings & Configuration Endpoints

#### Public Settings
```bash
GET    /api/settings/public                # Get public settings
GET    /api/settings/branding              # Get branding information
GET    /api/settings/cloud-pricing         # Get cloud pricing settings (authenticated)
```

#### Admin Settings
```bash
GET    /api/admin/settings                 # Get all admin settings
GET    /api/admin/settings/:key            # Get specific setting
POST   /api/admin/settings                 # Update setting
POST   /api/admin/settings/:key            # Update specific setting
PUT    /api/admin/settings/:key            # Update specific setting (alt)
```

### 🔧 Maintenance Mode Endpoints

#### Maintenance Management
```bash
GET    /api/maintenance/status             # Get maintenance status
POST   /api/maintenance/toggle             # Enable/disable maintenance mode (admin only)
GET    /api/maintenance/token              # Get maintenance bypass token (admin only)
POST   /api/maintenance/token/regenerate   # Regenerate bypass token (admin only)
POST   /api/maintenance/token/validate     # Validate bypass token
```

### 📁 Special Download Endpoints

#### Protected Downloads
```bash
GET    /special-download/transactions/:id/pdf # Download transaction PDF (special route)
```

### 🏢 Department Management Endpoints

#### Unified Departments (Public Access)
```bash
GET    /api/unified-departments            # Get active unified departments
GET    /api/ticket-departments             # Get active support departments (legacy)
```

### 🔌 API-Only Routes (API Key Authentication Only)

These routes are exclusively for API key authentication:

```bash
GET    /api/me                             # Get current user info (API key only)
GET    /api/servers                        # Get user servers (API key only)
GET    /api/balance                        # Get user credit balance (API key only)
```

### 🔌 V1 API Routes (Versioned API)

Enhanced versioned endpoints:

```bash
GET    /api/v1/me                          # Get current user information (enhanced)
GET    /api/v1/balance                     # Get user credit balance (enhanced)
```

### ⚠️ Error Handling

All API endpoints return consistent error responses:

#### HTTP Status Codes
- `200` - Success
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

#### Error Response Format
```json
{
  "error": {
    "code": "invalid_scope",
    "message": "The API key does not have the required scope",
    "required_scope": "write:servers"
  }
}
```

## 🗄️ Database Schema

SkyPANEL uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema is defined in `shared/schema.ts`.

### Core Tables

#### Users
```typescript
users {
  id: serial (primary key)
  email: text (unique, not null)
  username: text (unique, not null)
  password: text (not null)
  fullName: text (not null)
  role: text (default: "client")
  virtFusionId: integer
  isVerified: boolean (default: false)
  isActive: boolean (default: true)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Transactions
```typescript
transactions {
  id: serial (primary key)
  userId: integer (foreign key)
  type: text (credit_purchase, credit_usage, etc.)
  amount: real
  description: text
  status: text (pending, completed, failed)
  paypalTransactionId: text
  virtfusionCreditId: integer
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Support Tickets
```typescript
tickets {
  id: serial (primary key)
  userId: integer (foreign key)
  subject: text (not null)
  status: text (default: "open")
  priority: text (default: "medium")
  departmentId: integer (foreign key)
  assignedTo: integer (foreign key)
  createdAt: timestamp
  updatedAt: timestamp
  lastMessageAt: timestamp
}
```

#### DNS Management
```typescript
dnsDomains {
  id: serial (primary key)
  userId: integer (foreign key)
  name: text (not null)
  status: text (default: "active")
  interserverId: integer
  createdAt: timestamp
  updatedAt: timestamp
}

dnsRecords {
  id: serial (primary key)
  domainId: integer (foreign key)
  name: text (not null)
  type: text (not null)
  content: text (not null)
  ttl: integer (default: 3600)
  priority: integer (default: 0)
  disabled: boolean (default: false)
  createdAt: timestamp
  updatedAt: timestamp
}
```

#### Live Chat
```typescript
chatSessions {
  id: serial (primary key)
  userId: integer (foreign key)
  subject: text
  status: text (default: "active")
  departmentId: integer (foreign key)
  assignedTo: integer (foreign key)
  createdAt: timestamp
  endedAt: timestamp
}

chatMessages {
  id: serial (primary key)
  sessionId: integer (foreign key)
  userId: integer (foreign key)
  message: text (not null)
  messageType: text (default: "text")
  isFromAdmin: boolean (default: false)
  readAt: timestamp
  metadata: json
  createdAt: timestamp
}
```

#### API Keys
```typescript
apiKeys {
  id: serial (primary key)
  userId: integer (foreign key)
  name: text (not null)
  keyHash: text (not null, unique)
  scopes: text (not null)
  lastUsedAt: timestamp
  expiresAt: timestamp
  isActive: boolean (default: true)
  createdAt: timestamp
}
```

#### Content Management
```typescript
blogPosts {
  id: serial (primary key)
  title: text (not null)
  slug: text (unique, not null)
  snippet: text (not null)
  content: text (not null)
  author: text
  featuredImageUrl: text
  published: boolean (default: true)
  categoryId: integer (foreign key)
  createdAt: timestamp
}

faqs {
  id: serial (primary key)
  question: text (not null)
  answer: text (not null)
  category: text
  priority: integer (default: 0)
  isActive: boolean (default: true)
  createdAt: timestamp
}
```

### Database Migrations

Database schema changes are managed through Drizzle migrations:

```bash
# Generate migration
npx drizzle-kit generate

# Push changes to database
npm run db:push

# Run specific migration script
npx tsx scripts/migrate-database.ts
```

## 🔗 External Integrations

### VirtFusion API Integration

SkyPANEL integrates directly with VirtFusion for complete VPS management:

#### Key Features
- **User Synchronization**: Automatic user creation and profile sync
- **Server Management**: Power control, password resets, VNC access
- **Resource Monitoring**: Real-time usage statistics and billing
- **External Relation ID Mapping**: Uses local user.id as extRelationId

#### Configuration
```bash
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_virtfusion_api_key
```

#### Example Usage
```typescript
// Reset user password via VirtFusion API
const response = await virtFusionApi.resetUserPassword(user.id);
const temporaryPassword = response.data.password;

// Get server statistics
const stats = await virtFusionApi.getServerStats(serverId);
```

### InterServer DNS API Integration

White-labeled DNS management through InterServer:

#### Key Features
- **Domain Management**: Add, edit, delete DNS domains
- **Record Management**: Support for all DNS record types
- **White-labeled Nameservers**: Custom SkyPANEL branded nameservers
- **@ Symbol Notation**: User-friendly record name input

#### Configuration
```bash
INTERSERVER_API_KEY=your_interserver_api_key
```

#### Supported Record Types
A, AAAA, CNAME, MX, TXT, NS, SRV, CAA, PTR, SPF, and more

### Google Gemini AI Integration

AI-powered customer support and assistance:

#### Key Features
- **Context-Aware Responses**: Intelligent support ticket assistance
- **Discord Bot Integration**: AI-powered /ask command
- **Content Safety**: Built-in moderation and filtering
- **Rate Limiting**: Cost management and abuse prevention

#### Configuration
```bash
GOOGLE_AI_API_KEY=your_google_gemini_api_key
```

### Discord Integration

Comprehensive Discord integration for notifications and support:

#### Webhook Notifications
- **Ticket Events**: Creation, replies, status changes
- **System Alerts**: Maintenance mode and service updates
- **Billing Events**: Payment confirmations and transactions
- **User Events**: Registration and account changes

#### Discord Bot Features
- **AI Support**: `/ask` command with Gemini integration
- **Status Monitoring**: `/status` command with BetterStack data
- **Ticket Management**: `/ticket` commands for support operations
- **Two-Way Sync**: Discord threads sync with ticket system

#### Configuration
```bash
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_CHANNEL_ID=your_discord_channel_id
```

### PayPal Integration

Secure payment processing for credit purchases:

#### Key Features
- **Sandbox Support**: Development and testing environment
- **Webhook Validation**: Automatic payment verification
- **Multi-Currency**: Configurable currency support
- **Transaction Tracking**: Complete audit trail

#### Configuration
```bash
VITE_PAYPAL_SANDBOX=true_or_false
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_SECRET=your_paypal_secret
VITE_PAYPAL_CURRENCY=USD
```

### BetterStack Monitoring

Real-time infrastructure monitoring and alerting:

#### Key Features
- **Uptime Monitoring**: Service availability tracking
- **Incident Management**: Automatic detection and reporting
- **Performance Metrics**: Response time analytics
- **Status Page Integration**: Public service status

#### Configuration
```bash
BETTERSTACK_API_KEY=your_betterstack_api_key
```

### Email Services (SMTP2GO)

Reliable email delivery for notifications and communications:

#### Key Features
- **Transactional Emails**: Account verification, password resets
- **Notification Emails**: Ticket updates, billing confirmations
- **Template Support**: Branded email templates
- **Delivery Tracking**: Email delivery status monitoring

#### Configuration
```bash
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP_FROM=noreply@your-domain.com
SMTP_FROM_NAME=Your Company Support
```

## 🚀 Development

### Development Workflow

1. **Fork and Clone**: Fork the repository and clone your fork
2. **Install Dependencies**: Run `npm install` to install all dependencies
3. **Environment Setup**: Copy `.env.example` to `.env` and configure
4. **Database Setup**: Run `npm run db:push` to initialize the database
5. **Start Development**: Run `npm run dev` to start the development server

### Code Structure Guidelines

#### Frontend (React/TypeScript)
- **Components**: Reusable UI components in `client/src/components/`
- **Pages**: Route components in `client/src/pages/`
- **Hooks**: Custom React hooks in `client/src/hooks/`
- **Utils**: Utility functions in `client/src/lib/`
- **Styling**: Tailwind CSS with Shadcn/UI components

#### Backend (Node.js/Express)
- **Routes**: API endpoints in `server/routes/`
- **Middleware**: Express middleware in `server/middleware/`
- **Services**: Business logic in `server/services/`
- **Database**: Schema and queries using Drizzle ORM

### Testing

```bash
# Run type checking
npm run check

# Verify environment configuration
npm run verify-env

# Test database connection
npx tsx scripts/test-database-connection.ts

# Test external API integrations
npx tsx scripts/test-virtfusion-api.ts
npx tsx scripts/test-interserver-api.cjs
```

### Code Quality

- **TypeScript**: Strict type checking enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Husky**: Git hooks for pre-commit checks

### Performance Optimization

- **Vite**: Fast development builds with HMR
- **ESBuild**: Production builds for optimal performance
- **React Query**: Efficient data fetching and caching
- **Code Splitting**: Lazy loading for optimal bundle sizes

### Security Best Practices

- **Authentication**: Secure session management with Passport.js
- **Authorization**: Role-based access control
- **API Security**: Rate limiting and input validation
- **Password Security**: Bcrypt hashing with salt
- **CSRF Protection**: Cross-site request forgery prevention
- **SQL Injection Prevention**: Parameterized queries with Drizzle ORM

### Deployment

#### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

#### Environment Variables
Ensure all required environment variables are set in production:
- Database connection string
- API keys for external services
- Session secrets
- Email configuration

#### Database Migrations
```bash
# Run migrations in production
npm run db:push
```

#### Process Management
Consider using PM2 for production process management:
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start pm2.config.cjs

# Monitor processes
pm2 status
pm2 logs
```

## 🤝 Contributing

We welcome contributions to SkyPANEL! Please follow these guidelines:

### Getting Started

1. **Fork the Repository**: Create a fork of the SkyPANEL repository
2. **Create a Branch**: Create a feature branch for your changes
3. **Make Changes**: Implement your feature or bug fix
4. **Test Changes**: Ensure all tests pass and functionality works
5. **Submit PR**: Create a pull request with a clear description

### Contribution Guidelines

#### Code Standards
- Follow TypeScript best practices
- Use meaningful variable and function names
- Add comments for complex logic
- Maintain consistent code formatting

#### Commit Messages
Use conventional commit format:
```
feat: add DNS record management
fix: resolve VirtFusion API timeout issue
docs: update API documentation
style: improve button component styling
```

#### Pull Request Process
1. **Description**: Provide clear description of changes
2. **Testing**: Include test results and screenshots if applicable
3. **Documentation**: Update documentation if needed
4. **Review**: Address feedback from code review

### Areas for Contribution

- **Bug Fixes**: Report and fix bugs
- **Feature Development**: Implement new features
- **Documentation**: Improve documentation and examples
- **Testing**: Add unit and integration tests
- **Performance**: Optimize performance and scalability
- **Security**: Enhance security measures
- **UI/UX**: Improve user interface and experience

### Development Setup for Contributors

```bash
# Clone your fork
git clone https://github.com/your-username/SkyPANEL.git
cd SkyPANEL

# Add upstream remote
git remote add upstream https://github.com/skyvps360/SkyPANEL.git

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Configure your .env file

# Initialize database
npm run db:push

# Start development
npm run dev
```

### Reporting Issues

When reporting issues, please include:
- **Environment**: OS, Node.js version, browser
- **Steps to Reproduce**: Clear steps to reproduce the issue
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Error Messages**: Full error messages and stack traces

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### MIT License Summary

- ✅ **Commercial Use**: Use for commercial purposes
- ✅ **Modification**: Modify the source code
- ✅ **Distribution**: Distribute the software
- ✅ **Private Use**: Use for private purposes
- ❌ **Liability**: No liability for damages
- ❌ **Warranty**: No warranty provided

### Third-Party Licenses

This project uses various open-source libraries and services. Please review their respective licenses:

- **React**: MIT License
- **Express**: MIT License
- **PostgreSQL**: PostgreSQL License
- **Tailwind CSS**: MIT License
- **Drizzle ORM**: Apache 2.0 License

## 🙏 Acknowledgments

- **VirtFusion**: For providing the VPS management platform
- **InterServer**: For DNS services and API access
- **Google**: For Gemini AI integration
- **PayPal**: For payment processing services
- **Discord**: For community and bot integration
- **BetterStack**: For monitoring and alerting services
- **Open Source Community**: For the amazing libraries and tools

## 📞 Support

- **Documentation**: Check the documentation in `/md-docs/`
- **Discord**: Join our [Discord server](https://skyvps360.xyz/discord)
- **Issues**: Report bugs on [GitHub Issues](https://github.com/skyvps360/SkyPANEL/issues)
- **Email**: Contact support at support@skyvps360.xyz

---

<div align="center">
  <p><strong>Built with ❤️ by the SkyVPS360 team</strong></p>
  <p>⭐ Star this repository if you find it helpful!</p>
</div>
