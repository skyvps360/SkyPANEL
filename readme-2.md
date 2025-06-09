# 🚀 SkyPANEL - Enterprise VirtFusion Management Platform

<div align="center">
  <h3>🌟 Next-Generation VPS Hosting Control Panel 🌟</h3>
  <p><strong>Complete VirtFusion integration with AI-powered support, real-time monitoring, and advanced automation</strong></p>

  <div align="center">

  [![Discord](https://img.shields.io/discord/1310474963865833483?style=social&logo=discord)](https://skyvps360.xyz/discord)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/ea361b63c5ad4bf5b2e7d534c72ef799)](https://app.codacy.com/gh/skyvps360/SkyPANEL/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
  </div>

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
  ![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)
  ![Google AI](https://img.shields.io/badge/Google_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)
  ![VirtFusion](https://img.shields.io/badge/VirtFusion-FF6B35?style=for-the-badge&logo=server&logoColor=white)
</div>

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Technical Architecture](#-technical-architecture)
  - [Frontend Architecture](#frontend-architecture)
  - [Backend Architecture](#backend-architecture)
  - [Database](#database)
- [Installation & Development](#-installation--development)
- [Deployment](#-deployment)
- [Core Modules](#-core-modules)
  - [VirtFusion Integration](#virtfusion-integration)
  - [DNS Management System](#dns-management-system)
  - [Billing & Transaction System](#billing--transaction-system)
  - [User Management](#user-management)
  - [AI-Powered Support](#ai-powered-support)
  - [Discord Integration](#discord-integration)
  - [VNC Console](#vnc-console)
  - [Brand Theming System](#brand-theming-system)
- [Security Features](#-security-features)
- [Monitoring & Analytics](#-monitoring--analytics)
- [API Documentation](#-api-documentation)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🔍 Overview

**SkyPANEL** is a cutting-edge, enterprise-grade VirtFusion client portal that revolutionizes VPS hosting management. Built with modern technologies and designed for scalability, it provides a comprehensive solution for hosting providers and their customers.

SkyPANEL integrates seamlessly with VirtFusion to offer a complete server management experience, enhanced with AI-powered support, real-time monitoring, and advanced automation features. The platform is designed to be highly customizable, secure, and user-friendly, making it the ideal solution for hosting providers, VPS resellers, enterprise teams, and service providers.

### 🎯 What Makes SkyPANEL Special

- **🤖 AI-Powered Support**: Integrated Google Gemini 2.5 Flash for intelligent customer support and automated responses
- **🔄 Real-Time Monitoring**: BetterStack integration for live infrastructure monitoring and status reporting
- **💬 Discord Integration**: Full two-way communication with Discord bot for ticket management and platform status
- **🎨 Dynamic Theming**: Advanced brand customization with multi-color theming system
- **🔐 Enterprise Security**: API key management, role-based access control, and secure authentication
- **📊 Advanced Analytics**: Comprehensive reporting, transaction tracking, and usage monitoring
- **🌐 VNC Console**: Built-in VNC client for direct server access and management
- **⚡ Modern Architecture**: React/TypeScript frontend with Node.js/Express backend and PostgreSQL database
- **🔌 Complete VirtFusion Integration**: Direct API integration for seamless VPS management

### 🏢 Perfect For

- **Hosting Providers**: Complete client management solution with billing and support
- **VPS Resellers**: White-label ready platform with custom branding capabilities
- **Enterprise Teams**: Advanced user management and monitoring tools
- **Service Providers**: Integrated support system with AI assistance and Discord integration

## 🚀 Key Features

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

## 🛠️ Technical Architecture

SkyPANEL is built using modern technologies and follows best practices for scalability, maintainability, and performance.

### Frontend Architecture

The frontend is built with:

- **React 18**: Modern UI library with hooks and concurrent features
- **TypeScript**: Type-safe JavaScript for robust development
- **Vite**: Next-generation frontend build tool with HMR
- **TailwindCSS**: Utility-first CSS framework for rapid styling
- **Shadcn/UI**: High-quality UI components built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **React Query (TanStack Query)**: Powerful data fetching and state management
- **React Hook Form**: Performant forms with easy validation
- **Wouter**: Lightweight routing solution for SPAs
- **Framer Motion**: Production-ready motion library for React
- **Recharts**: Composable charting library built on D3
- **React Markdown**: Markdown rendering with syntax highlighting
- **React Leaflet**: Interactive maps for datacenter visualization
- **NoVNC**: Web-based VNC client for server console access

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

The backend uses:

- **Node.js**: JavaScript runtime for server-side development
- **Express**: Fast, unopinionated web framework
- **PostgreSQL**: Powerful, open-source relational database
- **Drizzle ORM**: TypeScript-first ORM for database operations
- **Zod**: TypeScript-first schema validation
- **Passport.js**: Authentication middleware for Node.js
- **JWT**: JSON Web Tokens for secure authentication
- **Socket.IO**: Real-time bidirectional event-based communication
- **SendGrid**: Email delivery service
- **Google Gemini API**: AI capabilities for support and automation
- **Discord.js**: Discord bot integration
- **BetterStack**: Monitoring and observability

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

## 💻 Installation & Development

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- VirtFusion API access
- (Optional) Discord bot token
- (Optional) Google Gemini API key
- (Optional) SendGrid API key

### Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/SkyPANEL.git
   cd SkyPANEL
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgres://username:password@localhost:5432/skypanel
   VITE_API_URL=http://localhost:3000
   # Add other required environment variables
   ```

4. Run database migrations:
   ```bash
   npm run migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the application at `http://localhost:3000`

## 🚢 Deployment

### Production Build

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

### Process Management

The application uses PM2 for process management in production, configured via `pm2.config.cjs`. For platforms that use Procfile (like Heroku or DigitalOcean App Platform), configuration is provided in the `Procfile`.

## 📦 Core Modules

### VirtFusion Integration

SkyPANEL provides complete integration with VirtFusion API, allowing for:

- Server provisioning and management
- Resource allocation and monitoring
- User account synchronization
- Automated server operations
- Custom server templates and configurations

The integration is handled through a dedicated service layer that abstracts the VirtFusion API and provides a consistent interface for the rest of the application.

### DNS Management System

The DNS management system allows users to:

- Create and manage DNS zones
- Add, edit, and delete DNS records
- Purchase DNS plans with different features
- Manage multiple domains and subdomains
- Configure advanced DNS settings

The system integrates with popular DNS providers and offers a user-friendly interface for managing DNS records.

### Billing & Transaction System

SkyPANEL includes a comprehensive billing system with:

- PayPal integration for payment processing
- Subscription management
- Invoice generation and tracking
- Transaction history and reporting
- Credit system for account balance
- Automatic renewal and payment reminders

The billing system is designed to be flexible and can be customized to support different pricing models and payment methods.

### User Management

The user management system provides:

- User registration and authentication
- Role-based access control
- User profile management
- Activity logging and auditing
- Password reset and account recovery
- Two-factor authentication (2FA)

Administrators can manage users, assign roles, and monitor user activity through a dedicated admin interface.

### AI-Powered Support

SkyPANEL integrates with Google Gemini 2.5 Flash to provide:

- Intelligent customer support
- Automated responses to common questions
- Ticket categorization and prioritization
- Knowledge base article suggestions
- Support agent assistance

The AI system is designed to enhance the support experience for both users and support agents, reducing response times and improving resolution rates.

### Discord Integration

The Discord integration provides:

- Two-way communication between SkyPANEL and Discord
- Ticket management through Discord
- Server status notifications
- User authentication and verification
- Command-based server management

Users can interact with SkyPANEL through Discord, making it easier to manage servers and get support without leaving Discord.

### VNC Console

The built-in VNC console allows users to:

- Access server consoles directly from the browser
- Perform server maintenance and troubleshooting
- Install and configure software
- Monitor server performance
- Restart and manage servers remotely

The VNC console is built using NoVNC and provides a secure, browser-based interface for server management.

### Brand Theming System

SkyPANEL includes a powerful theming system that allows for:

- Custom branding with logo and colors
- Theme customization with multiple color schemes
- Light and dark mode support
- Custom CSS for advanced styling
- White-label capabilities for resellers

The theming system is designed to be flexible and can be customized to match any brand identity.

## 🔒 Security Features

SkyPANEL implements security best practices:

- Secure authentication with password hashing
- Role-based access control
- Input validation and sanitization
- Secure environment configuration
- HTTPS enforcement
- Database connection security
- API key management
- Rate limiting and brute force protection
- Session management and timeout
- Security headers and CSP

## 📊 Monitoring & Analytics

SkyPANEL includes comprehensive monitoring and analytics:

- Server performance monitoring
- User activity tracking
- Transaction and billing analytics
- Support ticket metrics
- System health monitoring
- Real-time alerts and notifications
- Custom reports and dashboards
- Usage statistics and trends

The monitoring system integrates with BetterStack for enhanced observability and alerting.

## 📚 API Documentation

SkyPANEL provides comprehensive API documentation:

- RESTful API endpoints
- Authentication and authorization
- Request and response formats
- Error handling
- Rate limiting
- Webhooks
- Integration examples

The API documentation is available at the `/api-docs` endpoint and follows OpenAPI standards.

## 🔧 Troubleshooting

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

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

Please follow the code style guidelines and write tests for new features.

## 📄 License

SkyPANEL is licensed under the [MIT License](LICENSE).

---

## 💝 Support

If you find SkyPANEL helpful, consider supporting the project:

[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=TEY7YEJC8X5HW)

---

Built with ❤️ by the SkyPANEL team