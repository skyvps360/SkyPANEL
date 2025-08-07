# 🚀 SkyPANEL - Enterprise VPS Hosting Management Platform

<div align="center">
  <h3>🌟 Next-Generation VirtFusion Client Portal 🌟</h3>
  <p><strong>Complete VPS hosting management with AI-powered support, Discord integration, and enterprise-grade features</strong></p>
  <p><em>Current Version: v14.0.0</em></p>

  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![VirtFusion](https://img.shields.io/badge/VirtFusion-FF6B35?style=for-the-badge&logo=server&logoColor=white)
  ![Discord](https://img.shields.io/badge/Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white)

  <p>
    <a href="#-quick-start">Quick Start</a> •
    <a href="#-features">Features</a> •
    <a href="#-api-reference">API Reference</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="./ARCHITECTURE.md">Architecture</a> •
    <a href="./CHANGELOG.md">Changelog</a>
  </p>
</div>

---

## 📋 Table of Contents

- [🔍 Overview](#-overview)
- [✨ Key Features](#-key-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Quick Start](#-quick-start)
- [🔧 Configuration](#-configuration)
- [🌐 API Reference](#-api-reference)
- [📦 Deployment](#-deployment)
- [🔌 Integrations](#-integrations)
- [📚 Documentation](#-documentation)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🙏 Support](#-support)

---

## 🔍 Overview

**SkyPANEL** is a cutting-edge, enterprise-grade VirtFusion client portal that revolutionizes VPS hosting management. Built with modern technologies and designed for scalability, it provides a comprehensive solution for hosting providers and their customers.

### 🎯 What Makes SkyPANEL Special

- **🤖 AI-Powered Support**: Integrated Google Gemini 2.5 Flash for intelligent customer support
- **🔄 Real-Time Integration**: Complete VirtFusion API integration with live server management
- **💬 Discord Integration**: Two-way ticket synchronization with Discord bot support
- **🎨 Dynamic Branding**: Advanced multi-color theming system with real-time customization
- **🔐 Enterprise Security**: OAuth SSO, API key management, and role-based access control
- **📊 Comprehensive Analytics**: Built-in monitoring, reporting, and BetterStack integration
- **🌐 VNC Console**: Browser-based server console access with NoVNC
- **💳 Flexible Billing**: PayPal integration with credit-based billing system

### 🏢 Perfect For

- **Hosting Providers**: Complete client management solution with billing and support
- **VPS Resellers**: White-label ready platform with custom branding
- **Service Providers**: Integrated support system with AI assistance
- **Enterprise Teams**: Advanced user management and monitoring tools

---

## ✨ Key Features

### 👥 User Management
- **Secure Authentication**: Email verification, password reset, OAuth SSO support
- **VirtFusion Sync**: Automatic user synchronization with VirtFusion platform
- **Profile Management**: Real-time profile updates across all systems
- **Role-Based Access**: Admin and user roles with granular permissions
- **API Key Management**: Personal API keys with scoped permissions

### 💻 Server Management
- **VirtFusion Integration**: Complete server lifecycle management
- **Real-Time Monitoring**: Live server status, resources, and performance metrics
- **Power Management**: Start, stop, restart, and rebuild servers
- **VNC Console**: Browser-based console access with NoVNC client
- **OS Templates**: Support for multiple operating system templates
- **Resource Tracking**: CPU, memory, disk, and network usage monitoring

### 💳 Billing & Payments
- **Credit System**: Flexible credit-based billing with real-time balance tracking
- **PayPal Integration**: Secure payment processing with webhook validation
- **Transaction History**: Detailed transaction records with PDF export
- **Usage Billing**: Automatic credit deduction based on VirtFusion usage
- **Admin Controls**: Manual credit adjustments and transaction management

### 🎫 Support System
- **Ticket Management**: Full-featured support ticket system with departments
- **Discord Integration**: Two-way synchronization with Discord threads
- **AI Assistance**: Google Gemini AI for intelligent response suggestions
- **File Attachments**: Support for file uploads in tickets
- **Department Routing**: Organized support departments with staff assignment

### 🤖 AI-Powered Support
- **Intelligent Responses**: Context-aware AI responses using Google Gemini 2.5 Flash
- **Brand Identity**: Custom "SkyAI" branding for consistent user experience
- **Rate Limiting**: Built-in rate limiting (15 RPM, 1,500 RPD) for cost control
- **Discord Bot**: AI-powered responses in Discord chat and threads
- **Fallback Handling**: Graceful degradation when AI services are unavailable

### 📊 Admin Dashboard
- **User Administration**: Comprehensive user management with VirtFusion sync
- **Server Control**: Direct VirtFusion server management and monitoring
- **Financial Reporting**: Transaction analytics and revenue tracking
- **Content Management**: Blog posts, FAQs, and documentation management
- **System Configuration**: Dynamic settings and branding customization
- **Monitoring Tools**: Real-time system health and performance metrics

### 🔐 Security Features
- **OAuth SSO**: Social authentication with Discord, GitHub, Google, LinkedIn
- **Session Management**: Secure sessions with automatic timeout (1 hour default)
- **API Security**: Rate limiting, input validation, and CORS configuration
- **Data Protection**: Encrypted connections, password hashing, audit logging
- **Maintenance Mode**: Planned downtime management with bypass tokens

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - Modern UI library with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript for robust development
- **Vite** - Next-generation frontend build tool with HMR
- **TailwindCSS** - Utility-first CSS framework
- **Shadcn/UI** - High-quality UI components built on Radix UI
- **TanStack Query** - Powerful data fetching and state management
- **React Hook Form** - Performant forms with validation
- **Wouter** - Lightweight routing for SPAs
- **Framer Motion** - Production-ready animations
- **NoVNC** - Web-based VNC client for server console access

### Backend
- **Node.js** - JavaScript runtime for server-side development
- **Express.js** - Fast, minimal web framework
- **TypeScript** - Type-safe server development
- **PostgreSQL** - Advanced relational database
- **Drizzle ORM** - Type-safe SQL ORM with excellent TypeScript integration
- **Passport.js** - Authentication middleware with multiple strategies
- **Zod** - TypeScript-first schema validation
- **Bcrypt** - Secure password hashing
- **Express Session** - Session management with PostgreSQL store

### Integrations & Services
- **VirtFusion API** - Complete VPS management integration
- **Google Gemini 2.5 Flash** - AI-powered support and responses
- **Discord.js** - Bot integration and webhook support
- **PayPal SDK** - Payment processing and billing
- **BetterStack** - Infrastructure monitoring and alerting
- **SMTP2GO** - Reliable email delivery service

### DevOps & Tooling
- **ESBuild** - Fast JavaScript bundler for production
- **PM2** - Process manager for production deployments
- **Docker** - Containerization for easy deployment
- **Cloudflare Workers** - Edge computing deployment option
- **Drizzle Kit** - Database schema migration management

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 13+ database
- VirtFusion API access (URL and API key)
- Google AI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/skyvps360/SkyPANEL.git
   cd SkyPANEL
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration (see .env.example for all options)
   ```

4. **Initialize database**
   ```bash
   npm run db:push
   ```

5. **Create admin user**
   ```bash
   npx tsx scripts/create-admin-user.ts
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

7. **Access the application**
   - Open http://localhost:3333 in your browser
   - Login with your admin credentials

### Production Deployment

For production deployment, see our [Deployment Guide](./ARCHITECTURE.md#deployment-architecture) for Docker, PM2, and Cloudflare Workers options.

---

## 🔧 Configuration

### Required Environment Variables

See the comprehensive [`.env.example`](./.env.example) file for all configuration options. Key required variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@hostname:port/database

# Session Security
SESSION_SECRET=your_secure_random_string

# VirtFusion Integration (Required)
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_api_key

# AI Integration (Required for AI features)
GOOGLE_AI_API_KEY=your_google_gemini_api_key
GEMINI_API_KEY=your_google_gemini_api_key

# Email Service (Required)
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP_FROM=noreply@your-domain.com
```

### Optional Integrations

Configure these for additional features:

```bash
# PayPal Payments
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_PAYPAL_SECRET=your_paypal_secret
VITE_PAYPAL_SANDBOX=true_or_false

# Discord Integration
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_WEBHOOK_URL=your_webhook_url

# Monitoring
BETTERSTACK_API_KEY=your_betterstack_key

# OAuth SSO
OAUTH_DISCORD_CLIENT_ID=your_discord_oauth_client_id
OAUTH_GITHUB_CLIENT_ID=your_github_oauth_client_id
# ... (see .env.example for all OAuth options)
```

### Optional Features Configuration

- **OAuth SSO**: Configure Discord, GitHub, Google, LinkedIn authentication
- **Brand Theming**: Customize colors and branding through admin panel
- **Email Templates**: Configure email templates and SMTP settings
- **Discord Bot**: Set up Discord bot for ticket management and AI responses
- **Monitoring**: Configure BetterStack for uptime monitoring

---

## 🌐 API Reference

SkyPANEL provides a comprehensive REST API with 100+ endpoints for complete platform integration.

### Authentication

```bash
# Session-based authentication (web)
POST /api/auth/login
POST /api/auth/logout

# API key authentication (programmatic)
Authorization: Bearer your_api_key_here
```

### Core Endpoints

#### User Management
```bash
GET    /api/user                    # Get current user profile
PATCH  /api/user                    # Update user profile
GET    /api/user/servers            # List user's servers
POST   /api/user/servers/:id/power/:action  # Server power control
```

#### Server Management
```bash
GET    /api/user/servers/:id        # Get server details
POST   /api/user/servers/:id/reset-password  # Reset server password
GET    /api/user/servers/:id/vnc    # Get VNC console access
GET    /api/user/servers/:id/traffic # Get traffic statistics
```

#### Billing & Transactions
```bash
GET    /api/billing/balance         # Get account balance
GET    /api/transactions            # List transactions
POST   /api/billing/add-credits     # Add credits via PayPal
GET    /api/transactions/export     # Export transactions as PDF
```

#### Support System
```bash
GET    /api/tickets                 # List support tickets
POST   /api/tickets                 # Create new ticket
POST   /api/tickets/:id/messages    # Add message to ticket
POST   /api/tickets/:id/close       # Close ticket
```

#### Admin Endpoints (Admin role required)
```bash
GET    /api/admin/users             # List all users
POST   /api/admin/servers           # Create server
GET    /api/admin/transactions      # List all transactions
GET    /api/admin/settings          # Get system settings
POST   /api/admin/maintenance/enable # Enable maintenance mode
```

### API Features

- **Rate Limiting**: 100 requests per minute per API key
- **Scoped Permissions**: Granular access control with defined scopes
- **Comprehensive Error Handling**: Consistent error responses with proper HTTP codes
- **Pagination**: Support for paginated results with metadata
- **Input Validation**: Zod schema validation for all inputs

For complete API documentation, see [API Reference](./docs/api-reference.md).

---

## 📦 Deployment

SkyPANEL supports multiple deployment options for different environments and requirements.

### 🐳 Docker Deployment

1. **Using Docker Compose (Recommended)**
   ```bash
   # Configure environment
   cp .env.example .env
   # Edit .env with your settings
   
   # Start services
   docker-compose up -d
   ```

2. **Manual Docker Build**
   ```bash
   # Build image
   docker build -t skypanel:latest .
   
   # Run container
   docker run -d \
     --name skypanel \
     -p 3333:3333 \
     --env-file .env \
     skypanel:latest
   ```

### ⚡ PM2 Deployment

```bash
# Build for production
npm run build

# Start with PM2
npm run build:restart

# Monitor processes
npm run logs:pm2
```

### ☁️ Cloudflare Workers

```bash
# Deploy to Cloudflare edge
npm run wrangler

# Deploy to production
wrangler deploy
```

### 🔧 Manual Deployment

```bash
# Build application
npm run build

# Start production server
npm start
```

For detailed deployment instructions, see [ARCHITECTURE.md](./ARCHITECTURE.md#deployment-architecture).

---

## 🔌 Integrations

### VirtFusion Integration
- **Complete API Coverage**: Full VirtFusion API integration for server management
- **User Synchronization**: Automatic user account sync between systems
- **Real-time Updates**: Live server status and resource monitoring
- **Billing Integration**: Automatic credit deduction based on usage

### Payment Processing
- **PayPal Integration**: Secure payment processing with webhook validation
- **Credit System**: Flexible credit-based billing with real-time tracking
- **Transaction Management**: Complete transaction history and PDF exports

### AI-Powered Support
- **Google Gemini**: Advanced AI responses with brand customization
- **Context Awareness**: AI understands ticket context and company information
- **Rate Limiting**: Built-in usage controls and cost management
- **Fallback Handling**: Graceful degradation when AI is unavailable

### Discord Integration
- **Two-way Sync**: Ticket synchronization with Discord threads
- **Bot Commands**: Slash commands for status, tickets, and AI chat
- **Webhook Notifications**: Real-time notifications for system events
- **Permission Management**: Role-based access control for Discord features

### OAuth SSO
- **Multiple Providers**: Support for Discord, GitHub, Google, LinkedIn
- **Account Linking**: Link existing accounts to social providers
- **Secure Flow**: CSRF protection and state validation
- **Admin Management**: Configure providers through admin panel

---

## 📚 Documentation

### Core Documentation
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and design patterns
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes
- **[.env.example](./.env.example)** - Complete environment configuration guide

### Feature Documentation
- **[VirtFusion Integration](./docs/virtfusion-integration.md)** - VPS management setup
- **[AI Support System](./docs/ai-support.md)** - Google Gemini AI configuration
- **[Discord Integration](./docs/discord-integration.md)** - Bot setup and management
- **[Brand Theming](./brand-theme.md)** - Customization and branding system
- **[Billing System](./docs/billing.md)** - Payment processing and credits
- **[Security Guide](./docs/security.md)** - Authentication and security features

### Legacy Documentation
The `md-docs-old/` directory contains detailed documentation for specific features and systems. This documentation provides in-depth technical details and is maintained for reference.

---

## 🤝 Contributing

We welcome contributions to SkyPANEL! Please follow these guidelines:

### Development Setup

1. **Fork the repository** and clone your fork
2. **Install dependencies**: `npm install`
3. **Set up environment**: Copy `.env.example` to `.env`
4. **Initialize database**: `npm run db:push`
5. **Start development**: `npm run dev`

### Contribution Process

1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make your changes** with proper TypeScript types
3. **Test your changes**: Ensure all features work as expected
4. **Commit with clear messages**: Follow conventional commit format
5. **Submit a pull request** with detailed description

### Code Standards

- **TypeScript**: All code must be properly typed
- **ESLint**: Follow existing linting rules
- **Components**: Use Shadcn/UI components when possible
- **API**: Follow RESTful API patterns
- **Security**: Validate all inputs and sanitize outputs
- **Documentation**: Update documentation for new features

### Areas for Contribution

- **Feature Development**: New VirtFusion integrations, UI improvements
- **Bug Fixes**: Issues reported in GitHub issues
- **Documentation**: Improve guides and API documentation
- **Testing**: Add comprehensive test coverage
- **Security**: Security audits and improvements
- **Performance**: Optimization and caching improvements

---

## 📄 License

SkyPANEL is released under the **Apache License 2.0**. See the [LICENSE](./LICENSE) file for details.

### Commercial Use
- ✅ **Free for Commercial Use** - Use SkyPANEL for commercial hosting businesses
- ✅ **White-Label Ready** - Remove branding and customize for your business  
- ✅ **No Licensing Fees** - No ongoing licensing or usage fees
- ✅ **Professional Support** - Enterprise support and customization available

### Attribution
While not required, attribution is appreciated:
- ⭐ **GitHub Star** - Star the repository if you find it useful
- 🐦 **Social Media** - Share your SkyPANEL deployment
- 🤝 **Community** - Contribute back with improvements and feedback

---

## 🙏 Support

### Getting Help

#### Community Support
- **GitHub Issues** - Report bugs and request features
- **Discord Community** - Join our Discord for real-time support
- **Documentation** - Check our comprehensive documentation
- **Stack Overflow** - Tag questions with `skypanel`

#### Professional Support
- **Enterprise Support** - Priority support for businesses
- **Custom Development** - Tailored features and integrations
- **Training & Consulting** - Implementation guidance and best practices
- **White-Label Services** - Complete customization and branding

#### Contact Information
- **Email**: support@skyvps360.xyz
- **Discord**: [Join our Discord server](https://discord.gg/your-invite)
- **GitHub**: [Open an issue](https://github.com/skyvps360/SkyPANEL/issues)
- **Website**: [SkyVPS360.xyz](https://skyvps360.xyz)

## 🛠️ Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Test database connection
npm run db:check

# Reset database schema
npm run db:push

# Verify DATABASE_URL format
echo $DATABASE_URL
```

#### VirtFusion API Issues
- Verify `VIRTFUSION_API_URL` and `VIRTFUSION_API_KEY` are correct
- Check VirtFusion API status and connectivity
- Test API access through admin panel under Settings → VirtFusion

#### Email Delivery Problems
- Verify `SMTP2GO_API_KEY` is valid
- Check email templates in admin panel
- Ensure proper SPF/DKIM DNS records are configured

#### AI Features Not Working
- Verify both `GOOGLE_AI_API_KEY` and `GEMINI_API_KEY` are set
- Check Google AI API quotas and billing
- Monitor rate limits (15 RPM, 1,500 RPD)

#### PayPal Payment Issues
- Ensure correct sandbox/production configuration
- Verify webhook endpoints are accessible
- Check PayPal developer console for errors

#### Discord Bot Issues
- Verify bot has proper permissions in Discord server
- Check `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are correct
- Ensure bot is added to the Discord server

### Performance Issues
- Monitor database query performance
- Check server resource usage (CPU, memory, disk)
- Review application logs for errors
- Verify external API response times

### Getting Additional Help
- **Documentation**: Check [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed technical information
- **GitHub Issues**: [Report bugs and issues](https://github.com/skyvps360/SkyPANEL/issues)
- **Community Support**: Join our Discord community for assistance
- **Enterprise Support**: Contact us for professional support and customization

### Contributing to Support
- 💖 **Financial Support** - [PayPal Donations](https://paypal.me/your-paypal)
- 🌟 **GitHub Sponsors** - Support ongoing development
- 📢 **Spread the Word** - Share SkyPANEL with others
- 🐛 **Report Issues** - Help improve the platform
- 💻 **Code Contributions** - Submit pull requests

---

<div align="center">
  <h3>🌟 Thank you for choosing SkyPANEL! 🌟</h3>
  <p><strong>Built with ❤️ for the hosting community</strong></p>
  
  <p>
    <a href="https://github.com/skyvps360/SkyPANEL">⭐ Star on GitHub</a> •
    <a href="#-quick-start">🚀 Get Started</a> •
    <a href="./ARCHITECTURE.md">📖 Architecture</a> •
    <a href="https://discord.gg/your-invite">💬 Join Discord</a>
  </p>
</div>