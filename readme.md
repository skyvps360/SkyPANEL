# 🚀 SkyPANEL Virtfusion Client Portal - By SkyVPS360.xyz 

<div align="center">
  <h3>A comprehensive user and billing management platform for VirtFusion</h3>
  <p>Secure authentication, advanced financial reporting, and seamless VirtFusion API integration</p>
  
  ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
  ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
  ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
  ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwind-css&logoColor=white)
</div>

## 💝 Support My Work
If you find my work helpful, consider supporting me:

[![PayPal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://www.paypal.com/donate/?hosted_button_id=TEY7YEJC8X5HW)
---

## 📋 Table of Contents

- [Overview](#-overview)
- [Tech Stack](#-tech-stack)
- [Key Features](#-key-features)
- [API Endpoints](#-api-endpoints)
- [Environment Setup](#-environment-setup)
- [Installation & Development](#-installation--development)
- [VirtFusion Integration Guide](#-virtfusion-integration-guide)
- [Brand Theming System](#-brand-theming-system)
- [Discord Integration](#-discord-integration)
- [Billing & Transaction System](#-billing--transaction-system)
- [User Management](#-user-management)
- [Troubleshooting](#-troubleshooting)
- [Recent Updates](#-recent-updates)
- [Security Features](#-security-features)
- [Email System](#-email-system)
- [Maintenance Mode](#-maintenance-mode)
---

## 🔍 Overview

SkyVPS360 Client Portal provides a seamless interface for managing virtual private servers through VirtFusion API integration. This full-stack application enables comprehensive user account management, advanced billing with credit-based purchasing, PDF invoice generation, and complete transaction tracking.
---

## 🛠️ Tech Stack

### Frontend
- **React**: UI library for building the user interface
- **TypeScript**: Type-safe JavaScript for robust code
- **TailwindCSS**: Utility-first CSS framework for styling
- **Shadcn/UI**: High-quality UI components built on Radix UI
- **Radix UI**: Unstyled, accessible component primitives
- **React Query**: Data fetching and state management
- **React Hook Form**: Form validation and handling
- **Wouter**: Lightweight routing solution
- **Vite**: Next-generation frontend build tool
- **Framer Motion**: Animation library
- **Recharts**: Composable charting library
- **React Day Picker**: Date picker component
- **React Markdown**: Markdown rendering

### Backend
- **Node.js**: JavaScript runtime for server-side code
- **Express**: Web framework for Node.js
- **TypeScript**: Type-safe JavaScript for robust code
- **PostgreSQL**: Relational database for data storage
- **Drizzle ORM**: TypeScript ORM for database operations
- **Zod**: Schema validation and type inference
- **Passport.js**: Authentication middleware
- **SMTP2GO**: Email delivery service integration
- **Discord.js**: Discord bot integration
- **PDFKit**: PDF generation for invoices

### Authentication & Payments
- **Passport.js**: Authentication framework with local strategy
- **Express Session**: Session management with PostgreSQL store
- **Bcrypt**: Password hashing and security
- **PayPal JavaScript SDK**: Payment processing

### DevOps & Tooling
- **ESBuild**: JavaScript bundler for production builds
- **TypeScript**: Type checking and code quality
- **Drizzle Kit**: Database schema migration tool

---

## ✨ Key Features

### 👥 User Management
- Secure authentication with email verification
- Profile management with VirtFusion sync
- Password reset and account recovery
- Role-based access control (Admin/User)

### 💳 Billing System
- Credit-based billing system
- Detailed transaction tracking and exports
- Professional PDF invoice generation
- Real-time resource usage monitoring
- PayPal payment integration

### 🤝 VirtFusion Integration
- Direct API integration for user management
- Real-time resource monitoring
- Automated sync for user profile changes
- Intelligent extRelationId mapping

### 🎫 Support System
- Full ticket management
- Threaded message conversations
- Status tracking and priority levels
- Admin assignment and bulk actions

### 📊 Admin Dashboard
- Comprehensive user management
- Financial reporting and transaction tracking
- System configuration and settings
- VirtFusion API testing tools

### 🔔 Notifications
- Email notifications for account events
- Discord webhook integration
- Transaction confirmations
- Support ticket updates

---

## 🔌 API Endpoints

### 🔐 Authentication & Users
```
POST /api/auth/register               # Create new user account
POST /api/auth/login                  # Authenticate and create session
GET  /api/auth/logout                 # End current user session
GET  /api/user                        # Get current user profile
PATCH /api/user/profile               # Update user profile information
POST /api/auth/request-password-reset # Request password reset email
POST /api/auth/verify-reset-code      # Verify password reset code
POST /api/auth/reset-password         # Complete password reset
POST /api/auth/request-username       # Request username reminder email
POST /api/auth/change-password        # Change password (authenticated users)
GET  /api/verification-status         # Check email verification status
POST /api/verification/verify-email   # Verify email with code
POST /api/verification/resend         # Resend verification email
```

### 💰 Billing & Transactions
```
GET  /api/transactions                      # List user transactions
GET  /api/transactions/:id                  # Get transaction details
GET  /api/transactions/export               # Generate transaction PDF export
GET  /api/invoices                          # List user invoices 
GET  /api/invoices/:id                      # Get invoice details
GET  /api/invoices/:id/download             # Download invoice PDF
POST /api/billing/capture-paypal-payment    # Process PayPal payment
GET  /api/billing/usage                     # Get user resource usage
GET  /api/billing/balance                   # Get user credit balance
```

### 🌐 VirtFusion Integration
```
POST /api/virtfusion/sync-user              # Sync user with VirtFusion 
GET  /api/virtfusion/usage-stats            # Get VirtFusion usage stats
POST /api/test-virtfusion-user              # Test VirtFusion API connectivity (admin)
POST /api/test-virtfusion-credit            # Test credit addition (admin)
```

### 🎫 Support System
```
GET  /api/tickets                      # List user tickets with pagination (page, limit params)
POST /api/tickets                      # Create new support ticket with department selection
GET  /api/tickets/:id                  # Get ticket details with VPS server info (when applicable)
POST /api/tickets/:id/messages         # Add message to ticket
POST /api/tickets/:id/close            # Close a ticket
POST /api/tickets/:id/reopen           # Reopen a previously closed ticket
GET  /api/tickets/:id/download         # Download ticket conversation as PDF
GET  /api/tickets/:id/messages         # Get all messages for a ticket
GET  /api/ticket-departments           # Get all available ticket departments
DELETE /api/tickets/:id                # Delete ticket (admin only)
```

### 📋 Pagination
The tickets listing endpoints now support pagination:
```
GET /api/tickets?page=1&limit=10       # Get first page with 10 items per page
GET /api/admin/tickets?page=2&limit=25 # Get second page with 25 items per page
```

Response format for paginated endpoints:
```json
{
  "data": [
    { "id": 1, "subject": "Ticket Subject", ... },
    { "id": 2, "subject": "Another Ticket", ... },
    ...
  ],
  "pagination": {
    "total": 45,       // Total number of items
    "pages": 5,        // Total number of pages
    "current": 1,      // Current page number
    "perPage": 10      // Items per page
  }
}
```

### ⚙️ Admin Routes
```
GET  /api/admin/users                      # List all users
GET  /api/admin/users/:id                  # Get user details
PATCH /api/admin/users/:id                 # Update user
DELETE /api/admin/users/:id                # Delete user
GET  /api/admin/transactions               # List all transactions
POST /api/admin/settings                   # Update system settings
GET  /api/admin/settings                   # Get all system settings
GET  /api/admin/email-logs                 # List all email logs with optional filters
GET  /api/admin/email-logs/:id             # Get detailed information about a specific email log
GET  /api/admin/plan-features              # List all plan features
POST /api/admin/plan-features              # Create new plan feature
PUT  /api/admin/plan-features/:id          # Update plan feature
DELETE /api/admin/plan-features/:id        # Delete plan feature
GET  /api/admin/blog                       # List all blog posts
GET  /api/admin/blog/:id                   # Get blog post details
POST /api/admin/blog                       # Create new blog post
PATCH /api/admin/blog/:id                  # Update blog post
DELETE /api/admin/blog/:id                 # Delete blog post
GET  /api/admin/faqs                       # List all FAQs
POST /api/admin/faqs                       # Create new FAQ
PUT  /api/admin/faqs/:id                   # Update FAQ
DELETE /api/admin/faqs/:id                 # Delete FAQ
GET  /api/admin/datacenter-locations       # List all datacenter locations
POST /api/admin/datacenter-locations       # Create new datacenter location
PUT  /api/admin/datacenter-locations/:id   # Update datacenter location
DELETE /api/admin/datacenter-locations/:id # Delete datacenter location
```

### 🎨 Branding and Content
```
GET  /api/settings/branding               # Get company branding information (name, domain)
GET  /api/settings/public                 # Get all public settings
GET  /api/plan-features                   # Get active plan features for public display
GET  /api/packages                        # Get all VirtFusion packages with availability status
GET  /api/package-pricing                 # Get pricing information for all packages
GET  /api/datacenter-locations            # Get all datacenter locations for the map
GET  /api/public/platform-stats           # Get platform-wide statistics (servers, users, etc.)
GET  /api/faqs                            # Get all public FAQ items
GET  /api/public/blog                     # Get all published blog posts
GET  /api/public/blog/:slug               # Get a specific blog post by slug
GET  /api/public/docs                     # Get all public documentation pages
```

### 🛠️ Maintenance Mode
```
GET  /api/maintenance/status               # Get maintenance mode status
POST /api/maintenance/toggle               # Toggle maintenance mode on/off (admin only)
GET  /api/maintenance/token                # Get current maintenance bypass token (admin only)
POST /api/maintenance/token/regenerate     # Generate new maintenance bypass token (admin only)
POST /api/maintenance/validate-token       # Validate maintenance bypass token from form submission
```

#### Maintenance Mode Bypass Methods

The system supports several methods for bypassing maintenance mode:

1. **Admin User Session**: Administrators remain logged in during maintenance mode
2. **Maintenance Token**: Use a special token in the URL (`?maintenance_token=xxx`)
3. **Cookie-Based Bypass**: Browser cookie that persists across sessions
4. **Form Submission**: Enter token on maintenance page for temporary bypass

JavaScript resources like share-modal.js are properly loaded during maintenance mode to ensure the page functions correctly. The middleware checks for bypass conditions before blocking access to resources.

---

## 🔧 Environment Setup

Create a `.env` file with the following variables:

```bash
# Database Configuration
DATABASE_URL=postgres://username:password@hostname:port/database

# Session Management
SESSION_SECRET=your_secure_random_string

# VirtFusion API Integration
VIRTFUSION_API_URL=https://your-virtfusion.com/api/v1
VIRTFUSION_API_KEY=your_virtfusion_api_key

# Email Configuration (SMTP2GO)
SMTP2GO_API_KEY=your_smtp2go_api_key
SMTP_FROM=noreply@your-domain.com
SMTP_FROM_NAME=SkyVPS360 Support

# Discord Integration (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
DISCORD_ROLE_ID=your_discord_role_id

# Discord Bot Integration (Optional)
DISCORD_BOT_TOKEN=your_discord_bot_token
DISCORD_GUILD_ID=your_discord_server_id
DISCORD_CHANNEL_ID=your_discord_channel_id
DISCORD_ALLOWED_ROLE_IDS=role_id_1,role_id_2
DISCORD_ALLOWED_USER_IDS=user_id_1,user_id_2

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

---

## 💻 Installation & Development

```bash
# Clone the repository
git clone https://github.com/skyvps360/SkyPANEL.git
cd skyvps360-portal

# Install dependencies
npm install

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

### Updating Packages

To keep your packages up to date and ensure your application is secure, you can use the `npm-check-updates` tool. This tool will check for any outdated packages and update them to the latest versions.

1. Install `npm-check-updates` globally if you haven't already:
   ```bash
   npm install -g npm-check-updates
   ```

2. To check for outdated packages and update them, run the following command:
   ```bash
   npm run update-packages
   ```

This will update your `package.json` with the latest versions of your dependencies. After updating, make sure to run `npm install` to install the updated packages.

---

## 🎨 Brand Theming System

SkyVPS360 implements a comprehensive brand theming system that allows dynamic customization of the application's appearance through an advanced color management system.

### Color System Overview

The brand theming system uses three main colors:

- **Primary Color**: Used for primary buttons, navigation links, and important UI elements
- **Secondary Color**: Used for secondary actions, accents, and supporting elements
- **Accent Color**: Used for highlights, callouts, badges, and attention-grabbing elements

### Color Management Features

- **Interactive Color Pickers**: Visual color selection tools in admin settings
- **Hex Code Input**: Direct hex code entry for precise color control
- **Color Presets**: Quick-selection options for harmonious color combinations
- **Real-time Preview**: Live preview of color choices on UI components
- **Color Transformations**: Automatic generation of light/dark/opacity variations
- **Shadcn UI Integration**: Seamless integration with component library via CSS variables

### Implementation Details

- Colors are stored in the database as hex values (without # prefix)
- CSS variables are generated at runtime and applied to the document root
- Integration with Shadcn UI's theming system enables consistent styling
- Backward compatibility with legacy `companyColor` setting is maintained
- Comprehensive color variations (light, extraLight, dark, border, etc.) for each brand color

### Admin Configuration

To customize brand colors:

1. Navigate to **Admin → Settings → General**
2. In the **Brand Colors** section:
   - Use color pickers by clicking on color swatches
   - Enter hex codes directly in the input fields
   - Select from preset colors for quick styling
3. See real-time previews of how colors will appear in UI elements
4. Click **Save Changes** to apply the new color scheme globally

### Technical Implementation

The brand theming system is implemented in `client/src/lib/brand-theme.ts` with these key functions:

- `getBrandColors()`: Generates color variations for each brand color
- `hexToHSL()`: Converts hex colors to HSL format for Shadcn UI integration
- `applyBrandColorVars()`: Applies color variables to the document root
- `applyToShadcnTheme()`: Updates Shadcn UI theme variables

For more details on the technical implementation, see the [brand-theme.md](./brand-theme.md) documentation file.

---

## 🔄 VirtFusion Integration Guide

### Setting Up VirtFusion API Access

1. Obtain API credentials from your VirtFusion admin panel
2. Configure the `VIRTFUSION_API_URL` and `VIRTFUSION_API_KEY` environment variables
3. Test connectivity using the admin test endpoints

### User Integration

When integrating with VirtFusion, the application handles user mapping through:

1. **External Relation ID Mapping**: For API endpoints requiring `extRelationId`, we use the local `user.id` as the parameter, not `user.virtFusionId`
   - **IMPORTANT**: All VirtFusion API calls use our local user ID as the extRelationId parameter in URLs and requests
   - Example: `/users/{extRelationId}/byExtRelation/resetPassword` uses our local user.id value
2. **User Profile Sync**: When users update their profiles, we sync:
   - Username/name changes (VirtFusion API supports this)
   - Email changes (VirtFusion API supports this)
   - Password resets (Using VirtFusion's API-generated passwords)
   
### Password Integration with VirtFusion

The password reset process now fully integrates with VirtFusion:

1. Admin or user initiates a password reset
2. System makes a POST request to VirtFusion API: `/users/{extRelationId}/byExtRelation/resetPassword`
3. VirtFusion returns a secure temporary password in the response
4. System updates local database with the hashed VirtFusion-generated password
5. Both systems maintain password synchronization

```javascript
// Example of a VirtFusion password reset API call
const response = await virtFusionApi.resetUserPassword(user.id);
// Response format: {"data": {"email": "user@example.com", "password": "secureGeneratedPassword"}}
const temporaryPassword = response.data.password;
```

### Hourly Statistics Integration

For resource usage tracking:
```javascript
// Example: Fetching hourly statistics
const response = await axios.get(
  `${apiBaseUrl}/selfService/hourlyStats/byUserExtRelationId/${userId}`,
  { headers: { Authorization: `Bearer ${apiToken}` } }
);

// Parse the monthly total (handling both number and string formats)
const monthlyTotal = parseFloat(response.data.monthlyTotal.value);
```

---

## 📝 Blog System

The application includes a comprehensive blog system with both admin and public-facing interfaces.

### Blog Features

- **Admin Management Interface**: Complete CRUD operations for blog posts
- **Rich Text Editing**: Format posts with headings, lists, code blocks, and more
- **Featured Images**: Upload and manage images for blog posts
- **SEO-Friendly URLs**: Automatic slug generation from post titles
- **Publishing Control**: Schedule posts or save as drafts
- **Author Attribution**: Associate posts with specific admin authors
- **Categories and Tags**: Organize posts for better discoverability
- **Featured Posts**: Highlight important articles on the homepage
- **Date Formatting**: Proper localized date display for posts
- **ZOD Validation**: Comprehensive server-side validation using Zod schemas with proper date coercion

### Blog Data Model

Each blog post contains:
- **Title**: The post headline
- **Slug**: URL-friendly identifier generated from the title
- **Content**: Rich text body content
- **Author**: Admin who created the post
- **Published Date**: When the post was published
- **Status**: Draft, published, or scheduled
- **Featured Image**: Optional header image URL
- **Meta Description**: SEO-friendly summary for search engines

## ❓ FAQ System

The application includes a FAQ system for common questions and support information.

### FAQ Features

- **Categorized Questions**: Group related questions for better organization
- **Accordion Interface**: Expandable/collapsible answers for better readability
- **Admin Management**: Full CRUD operations for FAQ items in admin panel
- **Search Functionality**: Find answers quickly with integrated search
- **Priority Ordering**: Arrange FAQs by importance or frequency
- **Rich Text Answers**: Format answers with lists, links, and formatting
- **Public API**: Access FAQs programmatically for third-party integration

### FAQ Data Model

Each FAQ item contains:
- **Question**: The question text
- **Answer**: Detailed response with optional formatting
- **Category**: Grouping classification (e.g., "Billing", "Technical")
- **Priority**: Numeric ordering value for display sequence
- **Status**: Active or inactive state

## 🗺️ Datacenter Map

The application features an interactive world map displaying datacenter locations with real-time visualization.

### Map Features

- **Stylized World Map**: Modern design with continental outlines and grid patterns
- **Location-list Interface**: Sidebar with regions and locations for easy selection
- **Non-interactive Map Markers**: Visual indicators that don't have cursor interaction issues
- **Region-Based Coloring**: Different colors for markers based on geographic region
- **Responsive Design**: Map adapts seamlessly to different screen sizes
- **Admin Management**: Full CRUD operations for datacenter locations in admin panel
- **Dynamic Updates**: Map automatically reflects changes from admin interface

### Datacenter Location Management

Administrators can manage datacenter locations through the admin interface:

1. **Adding Locations**: Create new datacenter entries with name, code, and coordinates
2. **Editing Locations**: Update existing datacenter information and positioning
3. **Removing Locations**: Delete unused or deprecated datacenter locations
4. **Status Management**: Mark datacenter locations as active or inactive

### Location Data Structure

Each datacenter location contains:
- **Code**: Short identifier (e.g., "ASH", "DFW", "LON")
- **Name**: Full name (e.g., "Ashburn", "Dallas-Fort Worth", "London")
- **Coordinates**: Latitude and longitude for map positioning
- **Status**: Active or inactive state
- **Region**: Geographic region for grouping and color-coding

### Implementation Details

The datacenter map is implemented using:
- **SVG-Based Rendering**: For crisp visuals at any resolution
- **React Components**: Modular approach for maintainability
- **CSS Animations**: For marker pulsing effects and transitions
- **Dynamic Styling**: Automatically applies appropriate colors based on region
- **Optimized Performance**: Minimal re-renders even with many location markers

---

## 🔊 Discord Integration

The portal offers comprehensive Discord integration with both webhook notifications and a two-way communication system through a Discord bot.

### Webhook Notifications

#### Setup Process

1. Create a Discord webhook in your server settings
2. Configure the webhook URL in the admin panel or environment variables
3. Optionally add a role ID for mentions in notifications

#### Notification Types

- **Ticket Created**: When a new support ticket is submitted
- **Ticket Replied**: When users or admins add replies to tickets
- **Ticket Status Changed**: When tickets are opened, closed, or status changes
- **Ticket Deleted**: When an admin deletes a ticket

#### Example Webhook Payload

```javascript
const payload = {
  content: roleId ? `<@&${roleId}>` : '',
  embeds: [{
    title: `New Support Ticket: ${ticket.subject}`,
    description: `A new support ticket has been created.`,
    color: 3447003, // Blue color
    fields: [
      { name: 'Ticket ID', value: `#${ticket.id}`, inline: true },
      { name: 'User', value: userName, inline: true },
      { name: 'Priority', value: ticket.priority || 'Medium', inline: true },
    ],
    footer: { text: `SkyVPS360 - ${companyName}` },
    timestamp: new Date().toISOString()
  }]
};
```

### Discord Bot Integration

The system includes a powerful Discord bot for two-way ticket management directly from Discord.

#### Key Bot Features

- **Two-way Communication**: Support staff can respond to tickets directly in Discord threads
- **Thread Creation**: Automatically creates a Discord thread for each new ticket
- **Status Commands**: Close, reopen, or change ticket status directly from Discord
- **Message Sync**: All messages from Discord are synced back to the ticket system
- **Permission System**: Role-based and user-based permission controls for ticket commands
- **Interactive Buttons**: Clickable buttons for ticket actions like reopening closed tickets

#### Permission System

Administrators can control who can interact with tickets through Discord by setting:

1. **Allowed Role IDs**: Specific Discord role IDs that can use ticket commands
2. **Allowed User IDs**: Specific Discord user IDs that can use ticket commands

This granular permission system allows for proper support team management and access control.

#### Example Command Handling

```javascript
// Check if the user is allowed to use ticket commands
const isAllowed = await this.isUserAllowed(interaction.user.id, member);

if (!isAllowed) {
  await interaction.reply({
    content: 'You do not have permission to use this command. Only authorized roles or users can manage tickets.',
    ephemeral: true
  });
  return;
}
```

---

## 💵 Billing & Transaction System

### Transaction Types

- **Credit Purchase**: Adding credits via PayPal
- **Credit Usage**: Deductions for VirtFusion resource usage
- **Credit Refund**: Refunds to user accounts
- **Credit Addition**: Manual additions by admins

### Invoice Generation

The system automatically generates PDF invoices for all transactions with:

1. Professional formatting and branding
2. Complete transaction details including IDs
3. Tax calculations based on system settings
4. Proper date formatting and due dates when applicable

### Customizing PDF Invoices

The invoice PDF generation now uses the dynamic company name from settings instead of hardcoded values:

```javascript
// Company information - Using dynamic company name from settings
const companyName = await db.query.settings.findFirst({
  where: eq(schema.settings.key, 'company_name')
});
const displayName = companyName?.value || 'SkyVPS360';

doc.fontSize(20).font('Helvetica-Bold').text(displayName, { align: 'center' });
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica').text('your-domain.com', { align: 'center' });
doc.text('Email: support@your-domain.com', { align: 'center' });

// Footer information
const footerY = doc.page.height - 100;
doc.fontSize(10).font('Helvetica');
doc.text('Thank you for your business!', 50, footerY, { align: 'center' });
doc.text(`Questions? Contact support@${domain}`, 50, footerY + 15, { align: 'center' });
```

---

## 👥 User Management

### User Registration Flow

1. User submits registration form
2. Account is created with email verification required
3. Verification email is sent with unique code
4. User confirms email by entering verification code
5. Account is marked as verified and gains full access

### Password Reset Process

#### For Forgotten Passwords
1. User requests password reset via email
2. Secure reset token is generated and emailed
3. User verifies identity with token
4. New password is set and secured with bcrypt hashing
5. User is notified of successful password reset

#### Admin-Triggered Reset
1. Admin initiates password reset from user management page
2. System calls VirtFusion API to generate secure temporary password
3. Password is synchronized between dashboard and VirtFusion
4. Admin can view and copy the temporary password
5. User receives email notification with temporary password

#### User-Initiated Reset (Profile Page)
1. User enters current password on profile page
2. System calls VirtFusion API to generate secure temporary password
3. Password is synchronized between dashboard and VirtFusion
4. User sees temporary password in modal dialog with copy functionality
5. Confirmation email is sent with the new temporary password

### Profile Management

Users can update:
- Full name/username (synced with VirtFusion)
- Email address (synced with VirtFusion)
- Password (synced with VirtFusion using API-generated secure passwords)

---

## 🔍 Troubleshooting

### API Architecture Issues

- **Circular Dependencies**: 
  - Check import statements in routes.ts and routes_new.ts to avoid circular references
  - Make sure VirtFusionApi, AuthService, and EmailService are imported from the same module in all files
  - If API endpoints return success but don't actually modify data, check for duplicate route definitions

- **API Route Conflicts**: 
  - Ensure that the same endpoint (e.g., `/api/admin/plan-features`) is not defined in multiple files
  - Check server/index.ts for proper route imports (should use routes_new.ts for all routes)
  - Look for inconsistent field names between frontend forms and backend validation (e.g., title vs name)

- **Form Validation Errors**:
  - Verify error messages match field names used in the frontend forms
  - Check console logs for validation errors that might be hidden in the UI
  - Ensure required fields are properly marked in both frontend and backend code

### VirtFusion API Issues

- **Connection Problems**: Verify API URL and key in environment variables
- **Synchronization Issues**: Ensure correct parameter mapping in API calls
- **User Updates Failing**: Confirm VirtFusion user exists and extRelationId is correct
- **Debugging API Calls**: Enable detailed logging by setting `DEBUG=api:*` environment variable

### Transaction & Invoice Issues

- **Missing Transactions**: Check database connectivity and record creation
- **PDF Generation Fails**: Ensure pdfkit library is properly installed
- **Transaction Export Errors**: Verify transaction data completeness
- **Invoice Numbering**: Check invoice number generation sequence

### Authentication Problems

- **Login Failures**: Verify credentials storage and hash comparison
- **Session Expiration**: Check session configuration and timeout settings
- **Password Reset Issues**: 
  - Confirm email delivery and token validation
  - Verify VirtFusion API connectivity for password resets
  - Check proper error handling for VirtFusion API failures
- **Account Verification**: Test email delivery and code validation

---

## 🆕 Recent Updates

### AI-Powered Support Enhancement (May 2025)
- ✅ Integrated Google's Gemini AI for intelligent ticket response suggestions
- ✅ Implemented AI response generation based on ticket context and history
- ✅ Added rate limiting for AI services to comply with API usage limits
- ✅ Implemented proper error handling and fallback mechanisms for AI responses
- ✅ Created support agent interface for reviewing and editing AI-generated responses
- ✅ Added company branding integration into AI responses
- ✅ Ensured content safety with moderation filters for AI-generated content

### Global Infrastructure Monitoring (May 2025)
- ✅ Integrated BetterStack API for real-time infrastructure monitoring
- ✅ Created status page with live service availability indicators
- ✅ Implemented incident reporting and history tracking
- ✅ Added SLA (Service Level Agreement) monitoring and display
- ✅ Developed monitoring dashboard with uptime statistics
- ✅ Added automated incident notifications through Discord and email
- ✅ Implemented maintenance mode scheduling and announcements

### API Key Management System (May 2025)
- ✅ Built comprehensive API key generation and management system
- ✅ Implemented secure token generation with proper encryption
- ✅ Added API key scopes for granular access control
- ✅ Created admin interface for managing and revoking API keys
- ✅ Added user interface for personal API key management
- ✅ Implemented expiration dates for temporary API access
- ✅ Added audit logging for API key usage and security events

### Brand Color System Upgrade (May 2025)
- ✅ Implemented comprehensive brand color system with primary, secondary, and accent colors
- ✅ Replaced the single companyColor field with the new multi-color system
- ✅ Added backward compatibility with existing companyColor database field
- ✅ Enhanced styling consistency throughout admin and client areas
- ✅ Updated UI components to use the new brand color system for dynamic theming
- ✅ Improved support ticket interface with branded message styling
- ✅ Updated API endpoints to support the new color properties
- ✅ Added color transformations for various opacity and shade variants
- ✅ Implemented proper color validation and fallback mechanisms
- ✅ Added interactive color pickers for all brand colors in admin settings
- ✅ Fixed styling inconsistencies in admin interface buttons and dialogs
- ✅ Improved hover states for sidebar icons with proper color transitions
- ✅ Created color preview system in settings to visualize theme changes
- ✅ Added preset color options for quick brand theme selection

### Maintenance Mode & Pagination Improvements (May 2025)
- ✅ Fixed maintenance mode middleware to properly allow JavaScript resource loading
- ✅ Enhanced authentication flow in maintenance middleware using Passport.js
- ✅ Improved admin access during maintenance mode by updating API routes allowlist
- ✅ Fixed maintenance token regeneration feature in admin interface
- ✅ Fixed UI issues in API docs page by resolving React Fragment errors
- ✅ Implemented pagination for tickets pages with server-side support
- ✅ Added pagination controls (page navigation and items per page selector) to user and admin ticket pages
- ✅ Added pagination metadata (total, pages, current, perPage) to tickets endpoints
- ✅ Updated dashboard components to work with the new paginated response format

### Ticket System Enhancements (May 2025)
- ✅ Enhanced ticket creation with department selection functionality
- ✅ Improved VirtFusion API integration for VPS-related tickets
- ✅ Added VPS server information retrieval and display on ticket detail pages
- ✅ Added network details card with IP addresses, DNS, and gateway information
- ✅ Fixed React hooks order in ticket detail page for proper rendering
- ✅ Added ticket reopening functionality with Discord thread management
- ✅ Enhanced API endpoints to support the updated ticket creation flow

### Discord Integration Improvements (May 2025)
- ✅ Implemented role-based permission system for Discord bot commands
- ✅ Added user ID-based restriction capability for more granular access control
- ✅ Created admin UI for configuring allowed Discord roles and users
- ✅ Added permission checking system to enforce role/user restrictions
- ✅ Improved ticket reopening functionality with interactive buttons
- ✅ Enhanced Discord webhook notifications with consistent branding
- ✅ Reorganized admin settings tabs with dedicated Discord integration section
- ✅ Fixed ticket status synchronization between platform and Discord threads

### Bug Fixes and Improvements (May 2025)
- ✅ Fixed VirtFusion API integration issues in ticket creation workflow
- ✅ Fixed circular dependency issue between routes.ts and routes_new.ts that caused API conflicts
- ✅ Improved VirtFusion token display in billing pages (100 tokens = $1.00 USD)
- ✅ Resolved plan feature management issues (create/edit/delete operations failing despite success messages)
- ✅ Corrected API error messages to match frontend field names (title vs name) for better error reporting
- ✅ Added defensive error handling in plan feature API endpoints with detailed logging
- ✅ Added validation and proper type checking throughout API routes
- ✅ Fixed share-modal.js with defensive coding to prevent "Cannot read properties of null" TypeError errors
- ✅ Enhanced logging for all admin operations for better troubleshooting

### API System Upgrade (May 2025)
- ✅ Unified API system - migrated from dual API architecture to a single consolidated API system
- ✅ Completed full migration of all endpoints from routes.ts to routes_new.ts maintaining backward compatibility
- ✅ Fixed VirtFusionApi import path to eliminate circular dependencies
- ✅ Added comprehensive admin endpoints (packages, blog, docs, plan-features, FAQs, email logs)
- ✅ Added missing maintenance mode API endpoints with email notification integration
- ✅ Added public API endpoints for blog, docs, and FAQs with proper content handling
- ✅ Fixed platform-stats endpoint to combine real API values with manual settings values
- ✅ Added email logs endpoints with proper filtering and detail views
- ✅ Added authentication endpoints (password reset, verification) with proper error handling
- ✅ Fixed datacenter location API endpoints to properly preserve status values (active, coming soon, inactive)
- ✅ Improved datacenter location management with proper status handling (active, coming soon, inactive)
- ✅ Enhanced map marker functionality to properly reflect location status
- ✅ Implemented interactive world map view with Leaflet.js for better visualization of datacenter locations
- ✅ Created comprehensive API documentation page with interactive testing functionality
- ✅ Fixed API documentation page integration with dashboard layout
- ✅ Improved API response consistency and error handling
- ✅ Added proper SQL-based sorting for datacenter locations by display order

### UI Improvements (May 2025)
- ✅ Fixed z-index issues in the datacenter maps - legend is now properly hidden behind the modal overlay when viewing datacenter information
- ✅ Improved map legend visuals with consistent styling for all status types (active, coming soon, inactive)
- ✅ Enhanced datacenter detail popups with better display of provider, tier, address, and description information
- ✅ Fixed status badge display in both main and simplified datacenter map components

### Datacenter Map Redesign (May 2025)
- ✅ Completely redesigned datacenter map component with non-interactive visual map and location list-based interaction model
- ✅ Fixed the "jumping markers" issue in datacenter map for better UX by separating visuals from interaction points
- ✅ Enhanced user experience with clearer visual indicators for datacenter locations
- ✅ Optimized map rendering for better performance and reduced layout shifts
- ✅ Added proper region-based color coding for better location identification
- ✅ Implemented responsive design that works well on all screen sizes
- ✅ Added dynamic region grouping in the location selector list for better organization
- ✅ Created clear visual feedback for active/selected locations

### Admin Dashboard and Plan Features Management
- ✅ Created centralized admin dashboard with improved navigation and search functionality
- ✅ Relocated admin features from the main dashboard to dedicated admin section
- ✅ Added search bar to admin dashboard (with Ctrl+K/Cmd+K keyboard shortcut)
- ✅ Implemented plan feature management system for dynamic service offerings
- ✅ Built admin interface for creating, editing, and managing plan features
- ✅ Added support for Lucide icons in plan features with visual icon picker
- ✅ Updated plans page to display dynamic features from database instead of hardcoded cards
- ✅ Changed plan features display from card layout to clean row-based format with blue header
- ✅ Implemented auto-refresh for plan features to ensure latest data is always displayed
- ✅ Added category field to plan features schema for better organization and filtering
- ✅ Fixed field naming conventions between frontend and backend (title vs name)
- ✅ Fixed validation logic in plan feature creation/update to properly handle required fields
- ✅ Optimized API mutations to use "body" parameter instead of "data" for consistency
- ✅ Enhanced UI with loading states and proper empty state handling
- ✅ Added transaction history and view functionality for server billing

### API Documentation & Key Management System
- ✅ Implemented comprehensive API documentation explorer with interactive testing
- ✅ Improved error handling and validation for all API routes
- ✅ Added API key generation system with secure key creation and storage
- ✅ Developed API key management interface for creating, revoking, and deleting keys
- ✅ Implemented scoped permissions system for API keys (read, write, admin)
- ✅ Added key expiration options (7 days, 30 days, 90 days, 1 year, no expiration)
- ✅ Created secure API key display UI with copy-to-clipboard functionality
- ✅ Fixed inconsistent hashing between API key generation and validation
- ✅ Standardized property naming conventions between client and server
- ✅ Improved CSS for API key creation dialog with better formatting
- ✅ Enhanced security with one-time display of generated API keys
- ✅ Added usage examples with curl commands for API endpoints

### API Request System Improvements
- ✅ Completely rewrote the API request utility function for better error handling
- ✅ Updated apiRequest signature from `apiRequest("METHOD", "/url", data)` to `apiRequest("/url", { method: "METHOD", body: data })`
- ✅ Fixed response handling for binary content (PDF downloads) and HTML responses
- ✅ Corrected "res.json is not a function" errors throughout the application
- ✅ Updated all components to use the new apiRequest format (VirtFusionSsoHandler, ticket system, PayPalCheckout, etc.)
- ✅ Improved error display with more descriptive messages
- ✅ Added automatic content-type detection for API responses
- ✅ Enhanced error handling to prevent "body stream already read" errors
- ✅ Fixed HTTP header management for binary content responses
- ✅ Fixed JSON circular reference errors in VirtFusion API error handling
- ✅ Standardized API response formats across all endpoints

### API Example - Old Format vs New Format
```javascript
// OLD FORMAT: apiRequest(method, url, data)
// Example of old API call:
const response = await apiRequest("POST", "/api/auth/login", { 
  username: "user", 
  password: "pass" 
});

// NEW FORMAT: apiRequest(url, { method, body })
// Example of new API call:
const response = await apiRequest("/api/auth/login", {
  method: "POST",
  body: { username: "user", password: "pass" }
});
```

### Password Reset System Improvements
- ✅ Fixed password reset on profile page to use same VirtFusion API integration as admin page
- ✅ Implemented exact same workflow for both admin and user-initiated resets
- ✅ Fixed VirtFusion password synchronization to ensure passwords stay in sync
- ✅ Added verbose error logging to help diagnose VirtFusion integration issues
- ✅ Enhanced error handling for VirtFusion API failures with proper fallbacks

### Maintenance Mode Implementation
- ✅ Added complete maintenance mode system with admin bypass capability
- ✅ Created dedicated maintenance page with Discord link and status info
- ✅ Implemented maintenance bypass using secure token validation mechanism
- ✅ Added maintenance mode banner to the landing page with real-time status updates
- ✅ Added admin controls for toggling maintenance and regenerating secret tokens
- ✅ Improved code organization by using middleware functions for maintenance operations
- ✅ Fixed maintenance page URL routing and redirection 
- ✅ Enhanced maintenance mode with static HTML page to prevent module loading errors
- ✅ Standardized on the correct maintenance page URL ('/maintenance')
- ✅ Added form-based token validation for easier admin access during maintenance
- ✅ Updated maintenance page to handle token validation and redirect to the dashboard
- ✅ Enhanced security by validating tokens server-side
- ✅ Improved UX by showing the actual domain in token usage instructions

### Brand Color System Implementation
- ✅ Created a comprehensive brand theming system with primary, secondary, and accent colors
- ✅ Implemented color variant generation for light/dark/opacity variations
- ✅ Added proper HSL color transformations for consistent styling
- ✅ Created helper functions to generate standardized component styles
- ✅ Implemented backward compatibility with existing companyColor field
- ✅ Updated all UI components to use the new color system
- ✅ Improved support ticket interface with branded message styling
- ✅ Added consistent color application throughout admin and client areas
- ✅ Enhanced CSS variable generation for theme consistency

#### Old Single-Color System vs New Multi-Color System

**Old System (Before May 2025):**
```typescript
// Old approach: Single color field in database
const companyColor = "33be00"; // Single hex color without #

// Old styling approach
style={{ 
  backgroundColor: `#${companyColor}`,
  color: 'white'
}}

// Old rgba approach (manual conversion)
style={{ 
  backgroundColor: `rgba(${parseInt(companyColor.slice(0,2), 16)}, ${parseInt(companyColor.slice(2,4), 16)}, ${parseInt(companyColor.slice(4,6), 16)}, 0.1)`
}}
```

**New System (May 2025 and later):**
```typescript
// New approach: Multiple color properties
const colors = {
  primaryColor: "33be00",   // Primary brand color
  secondaryColor: "10b981", // Secondary color for accents
  accentColor: "f59e0b"     // Accent color for highlights
};

// Generate brand colors with variants
const brandColors = getBrandColors(colors);

// New styling approach with helper functions
style={getContainerStyle()} // Returns consistent container styling

// Direct color usage
style={{ color: brandColors.primary.full }}

// Light/dark variants
style={{ 
  backgroundColor: brandColors.primary.light,
  color: brandColors.primary.dark
}}

// Badge styling helper
style={getBadgeStyle(accentColor, 0.1)}
```

### Enhanced Password Reset System
- ✅ Implemented VirtFusion API integration for password resets
- ✅ Added secure temporary password generation through VirtFusion API
- ✅ Created UI for displaying temporary passwords with copy-to-clipboard functionality
- ✅ Implemented admin-triggered password reset with temporary password access
- ✅ Added user-initiated password reset on profile page
- ✅ Improved email notifications with temporary password information
- ✅ Enhanced security with proper password synchronization between platforms
- ✅ Added fallback mechanisms for VirtFusion API failures

### User Profile Improvements
- ✅ Fixed username/email synchronization with VirtFusion API
- ✅ Added clear messaging about password limitations
- ✅ Simplified password management UI with clearer instructions
- ✅ Improved error handling for profile updates

### Transaction Display Enhancements
- ✅ Fixed transaction details page to properly display all transaction data
- ✅ Corrected "transaction-undefined.pdf" filename issues in downloads
- ✅ Added improved debugging for transaction data processing
- ✅ Enhanced transaction list with better sorting and filtering

### Email System Improvements
- ✅ Implemented SMTP2GO for all email communications (replacing SendGrid)
- ✅ Created robust email queue system for background processing of all notifications
- ✅ Enhanced maintenance mode to automatically notify all administrators when activated
- ✅ Added maintenance bypass token in admin notification emails for immediate system access
- ✅ Implemented comprehensive email logging for all system-generated emails
- ✅ Added centralized email logs page at /admin/mail with filtering and search capabilities
- ✅ Standardized email logging across all email types (password reset, username reminders, etc.)
- ✅ Added SkyVPS360.xyz branding to dashboard footer with "Powerful VirtFusion Portal" text

### VirtFusion Integration Fixes
- ✅ Updated user profile API to correctly sync only supported fields with VirtFusion

### Branding System Improvements
- ✅ Implemented dynamic company name across the entire platform from database settings
- ✅ Fixed issues with ToS and Privacy Policy pages showing raw HTML instead of properly rendered content

### Blog System Improvements
- ✅ Fixed ZodError in blog post creation by adding proper date coercion in server validation
- ✅ Enhanced content management with better error handling for dates and text fields
- ✅ Improved admin interface for creating and editing blog content
- ✅ Added comprehensive API documentation for blog endpoints
- ✅ Fixed slug generation and validation for better URL creation

### Bug Fixes and UX Improvements
- ✅ Removed "Add User" button from admin users page as requested
- ✅ Updated documentation to reflect recent changes and completed tasks
- ✅ Enhanced data validation across the application to prevent type mismatches
- ✅ Improved error handling for form submissions across the application
- ✅ Replaced data-branding attribute approach with direct JavaScript implementation for better reliability
- ✅ Added support for domain name customization in all static pages
- ✅ Maintained hardcoded "SkyVPS360.xyz" branding in dashboard footer as required
- ✅ Added proper error handling for branding information fetching
- ✅ Implemented consistent branding API endpoint at `/api/settings/branding`
- ✅ Added dashboard footer links to ToS, Privacy Policy, Discord and Status page
- ✅ Ensured all branding elements load properly with appropriate fallbacks

### Dashboard Footer Updates
- ✅ Hardcoded "SkyVPS360.xyz" branding in footer (as specifically requested)
- ✅ Added "Powerful VirtFusion Portal" tagline in the footer
- ✅ Implemented required links in the footer:
  - Terms of Service (`/tos`)
  - Privacy Policy (`/privacy`)
  - Discord (`https://skyvps360.xyz/discord`)
  - Status Page (`/#status`)
- ✅ Kept footer styling consistent with the overall dashboard design
- ✅ Fixed critical parameter mapping for extRelationId in API calls
- ✅ Enhanced error handling for VirtFusion API connectivity issues
- ✅ Added detailed logging for troubleshooting integration problems

### Code Quality Improvements
- ✅ Enhanced error handling throughout the application
- ✅ Added more robust data validation with Zod schemas
- ✅ Improved TypeScript type safety across components

### UI and Plan Display Improvements (May 2025)
- ✅ Fixed network speed display to consistently show port speeds in GB/MB format across the entire application
- ✅ Added automatic bandwidth conversion from GB to TB for large packages (1000+ GB shown as TB)
- ✅ Simplified order buttons to just "Order Now" instead of plan-specific text
- ✅ Enhanced button styling with gradient background and shadow effects for improved visual appeal
- ✅ Modified plan features to only reload on page refresh rather than auto-reloading to prevent unnecessary API calls
- ✅ Updated "Sold Out" styles to use amber color palette with better visibility in both light and dark modes
- ✅ Improved error handling for VirtFusion API connectivity issues on the plans page
- ✅ Better API response parsing and error reporting
- ✅ Refactored maintenance endpoints to use middleware functions for better organization

---

## 🔒 Security Features

- **Secure Password Storage**: bcrypt hashing with appropriate salt rounds
- **Input Validation**: Comprehensive Zod schema validation
- **Session Security**: Secure cookie-based sessions with proper expiration
- **CSRF Protection**: Token validation for state-changing requests
- **Role-Based Permissions**: Access control for protected resources
- **API Security**: JWT authentication for API endpoints
- **Rate Limiting**: Protection against brute force attacks
- **Error Handling**: Secure error responses without sensitive details
- **Data Validation**: Proper sanitation of all user inputs

---

## 📧 Email System

The application uses SMTP2GO for reliable email delivery with comprehensive logging and monitoring capabilities.

### Email Features

- **SMTP2GO Integration**: All emails are sent through SMTP2GO's reliable API
- **Background Processing**: Emails are processed in a background queue system
- **Email Types**:
  - **Password Reset**: Secure token-based password reset emails
  - **Email Verification**: Account verification codes
  - **Username Reminder**: Username recovery emails
  - **Admin Notifications**: Maintenance mode alerts with bypass tokens
  - **Password Change**: Notifications when passwords are changed
  - **Admin Password Reset**: Alerts when an admin resets a user's password

### Queue System

The email queue system ensures:
1. **Reliable Delivery**: Emails are queued and sent even if SMTP2GO temporarily fails
2. **Error Handling**: Failed emails are logged with detailed error information
3. **Background Processing**: Email sending doesn't block the main application thread
4. **Retry Mechanism**: Failed emails can be retried automatically
5. **Efficient Batching**: Multiple emails can be processed in batches for better performance

### Admin Monitoring

Administrators can monitor all email activity through:
1. **Email Logs Dashboard**: Located at `/admin/mail` in the admin panel
2. **Filtering Capabilities**: Filter by email type, status, recipient, or date range
3. **Detailed View**: View complete email details including metadata
4. **Search Functionality**: Search across all email fields
5. **Status Tracking**: Monitor pending, sent, and failed emails

### SMTP2GO Configuration

To configure SMTP2GO:
1. Create an SMTP2GO account at https://smtp2go.com/
2. Obtain an API key from your SMTP2GO dashboard
3. Add the API key to your environment variables as `SMTP2GO_API_KEY`
4. Configure sender information using `SMTP_FROM` and `SMTP_FROM_NAME` variables

---

## 🛠️ Maintenance Mode

The application includes a comprehensive maintenance mode system that allows administrators to temporarily restrict access to the platform while performing updates or maintenance.

### How Maintenance Mode Works

1. **Activation Process**: Administrators can enable maintenance mode through the admin settings interface
2. **Access Control**: When enabled, all non-admin users are redirected to a dedicated maintenance page
3. **Bypass Mechanisms**: Two methods for admin access:
   - **Form Entry**: Enter the maintenance token in the provided form on the maintenance page
   - **URL Entry**: Append the token to the site URL (e.g., `/{secret_token}`)
4. **Authentication Flow**: After token validation, admins can access the dashboard and login
5. **Session Persistence**: Session maintains maintenance bypass permission after login
6. **Dynamic Domain Display**: Admin panel shows the actual current domain in token usage instructions
7. **Landing Page Banner**: A notification banner appears at the top of the landing page showing maintenance status

### Maintenance Page Features

During maintenance mode, users are presented with:
- **Status Message**: Customizable maintenance notification
- **Expected Completion**: Estimated timeframe when service will resume
- **Discord Link**: Direct link to the Discord community (https://skyvps360.xyz/discord)
- **Status Page**: Link to external service status dashboard
- **Admin Access Form**: Secure token entry form for administrators
- **Error Feedback**: Clear feedback on invalid token attempts
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **Static HTML**: High reliability with no JavaScript dependencies

### Landing Page Banner

When maintenance mode is enabled, the landing page displays a notification banner with:
- **Alert Icon**: Visual indicator of maintenance status
- **Custom Message**: Shows the admin-defined maintenance message
- **Estimated Time**: Displays the estimated completion time if set
- **More Info Button**: Links to the full maintenance page
- **Responsive Design**: Properly adapts to different screen sizes
- **Real-time Status**: Fetches current maintenance status from the API
- **Automatic Display**: Shows/hides based on current maintenance status

### Admin Controls

Administrators have several maintenance-related controls:
- **Toggle Maintenance**: Enable/disable maintenance mode
- **Custom Message**: Set a custom maintenance message
- **Completion Time**: Specify an estimated completion time
- **Secret Token**: View and regenerate the maintenance bypass token

### Implementation Details

- **Middleware Approach**: Implemented as Express middleware for consistent application
- **Database Storage**: Maintenance settings stored in the settings table
- **Token Generation**: Secure random token generation with UUID-based implementation
- **Static HTML Page**: Robust maintenance page served directly from Express for maximum reliability
- **Redirect Handling**: URL standardization with proper redirects from misspelled paths 
- **Landing Page Banner**: Maintenance mode banner automatically appears on the landing page when enabled
- **Landing Page Access**: Special handling to keep landing page accessible during maintenance
- **API Endpoints**: RESTful endpoints for managing maintenance state and status
- **Form-Based Validation**: Server-side token validation using form submission
- **Dynamic Configuration**: All maintenance settings configurable through admin UI
- **Real-time Domain Detection**: Dynamic domain name display in admin instructions
- **Error Handling**: Graceful error handling for token validation attempts

---

<div align="center">
  <p>Built with ❤️ by the SkyVPS360 team</p>
  <p>© 2025 SkyVPS360. All rights reserved.</p>
</div>
